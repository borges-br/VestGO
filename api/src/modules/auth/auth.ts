import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PublicProfileState, UserRole } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  toErrorResponse,
} from '../../shared/errors';
import { getInitialProfileState } from '../profiles/profile-shared';
import {
  assertTwoFactorEncryptionReady,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRefreshToken,
  normalizeRecoveryCode,
} from './auth-crypto';
import { buildOtpAuthUri, generateTotpSecret, verifyTotp } from './auth-totp';
import {
  createSessionAndIssueTokens,
  describeRequest,
  rotateSessionTokens,
  revokeAllUserSessions,
  revokeOtherSessions,
  verifyRefreshToken,
} from './auth-sessions';

const SALT_ROUNDS = 12;
const RECOVERY_CODE_HASH_ROUNDS = 10;
const TWO_FACTOR_SETUP_TTL_SECONDS = 10 * 60;
const TWO_FACTOR_CHALLENGE_TTL_SECONDS = 5 * 60;

const PUBLIC_REGISTERABLE_ROLES = [
  UserRole.DONOR,
  UserRole.COLLECTION_POINT,
  UserRole.NGO,
] as const;

const TWO_FACTOR_SETUP_PREFIX = '2fa-setup:';
const TWO_FACTOR_CHALLENGE_PREFIX = '2fa-challenge:';

type AuthSafeUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  phone: string | null;
  organizationName: string | null;
  publicProfileState: PublicProfileState;
  createdAt: Date;
};

function safeUser(user: AuthSafeUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    organizationName: user.organizationName,
    publicProfileState: user.publicProfileState,
    createdAt: user.createdAt,
  };
}

function handleErrors(reply: FastifyReply, err: unknown) {
  if (err instanceof AppError) {
    return reply.code(err.statusCode).send(toErrorResponse(err));
  }
  if (err instanceof z.ZodError) {
    return reply.code(422).send({
      error: 'VALIDATION_ERROR',
      message: 'Dados invalidos',
      issues: err.errors,
    });
  }
  if (
    err instanceof Error &&
    (err.message === 'TWO_FACTOR_UNAVAILABLE' ||
      err.message.startsWith('TWO_FACTOR_ENCRYPTION_KEY'))
  ) {
    return reply.code(503).send({
      error: 'TWO_FACTOR_UNAVAILABLE',
      message: 'Autenticacao em dois fatores indisponivel no momento.',
      statusCode: 503,
    });
  }
  throw err;
}

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail invalido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  role: z.enum(PUBLIC_REGISTERABLE_ROLES).optional().default(UserRole.DONOR),
  phone: z.string().optional(),
  organizationName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const verify2FALoginSchema = z
  .object({
    challengeId: z.string().min(1),
    code: z.string().optional(),
    recoveryCode: z.string().optional(),
  })
  .refine((data) => Boolean(data.code) || Boolean(data.recoveryCode), {
    message: 'Informe um codigo TOTP ou recovery code',
  });

const confirm2FASchema = z.object({
  code: z.string().min(6).max(6),
});

const disable2FASchema = z
  .object({
    password: z.string().min(1),
    code: z.string().optional(),
    recoveryCode: z.string().optional(),
  })
  .refine((data) => Boolean(data.code) || Boolean(data.recoveryCode), {
    message: 'Informe codigo TOTP ou recovery code',
  });

const regenerateRecoverySchema = z
  .object({
    password: z.string().min(1),
    code: z.string().optional(),
    recoveryCode: z.string().optional(),
  })
  .refine((data) => Boolean(data.code) || Boolean(data.recoveryCode), {
    message: 'Informe codigo TOTP ou recovery code',
  });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

async function consumeRecoveryCode(
  fastify: FastifyInstance,
  twoFactorId: string,
  inputCode: string,
): Promise<boolean> {
  const normalized = normalizeRecoveryCode(inputCode);
  const codes = await fastify.prisma.userTwoFactorRecoveryCode.findMany({
    where: { twoFactorId, usedAt: null },
  });

  for (const entry of codes) {
    const matches = await bcrypt.compare(normalized, entry.codeHash);
    if (matches) {
      await fastify.prisma.userTwoFactorRecoveryCode.update({
        where: { id: entry.id },
        data: { usedAt: new Date() },
      });
      return true;
    }
  }

  return false;
}

async function buildRecoveryCodesEntries(
  twoFactorId: string,
  codes: string[],
): Promise<{ twoFactorId: string; codeHash: string }[]> {
  return Promise.all(
    codes.map(async (code) => ({
      twoFactorId,
      codeHash: await bcrypt.hash(normalizeRecoveryCode(code), RECOVERY_CODE_HASH_ROUNDS),
    })),
  );
}

function challengeKey(challengeId: string): string {
  return `${TWO_FACTOR_CHALLENGE_PREFIX}${challengeId}`;
}

function setupKey(userId: string): string {
  return `${TWO_FACTOR_SETUP_PREFIX}${userId}`;
}

async function issueTwoFactorChallenge(
  fastify: FastifyInstance,
  userId: string,
): Promise<{ challengeId: string; expiresAt: Date }> {
  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TWO_FACTOR_CHALLENGE_TTL_SECONDS * 1000);
  await fastify.redis.set(challengeKey(challengeId), userId, {
    EX: TWO_FACTOR_CHALLENGE_TTL_SECONDS,
  });
  return { challengeId, expiresAt };
}

async function loadActiveSessionsForUser(fastify: FastifyInstance, userId: string) {
  return fastify.prisma.userSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      deviceLabel: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });
}

function tooManyAttempts(reply: FastifyReply) {
  return reply.code(429).send({
    error: 'TOO_MANY_ATTEMPTS',
    message: 'Muitas tentativas. Tente novamente em alguns minutos.',
    statusCode: 429,
  });
}

async function rateLimit(
  fastify: FastifyInstance,
  request: FastifyRequest,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const ip = (request.ip || 'unknown').replace(/[^a-zA-Z0-9.:_-]/g, '_');
  const key = `rl:${bucket}:${ip}`;
  const current = await fastify.redis.incr(key);
  if (current === 1) {
    await fastify.redis.expire(key, windowSeconds);
  }
  return current <= limit;
}

/**
 * Rate limit by an arbitrary identifier (e.g. lowercase email). Used in
 * combination with rateLimit() to defend against credential stuffing where a
 * single email is hammered from many IPs.
 */
async function rateLimitByKey(
  fastify: FastifyInstance,
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const sanitized = identifier
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, '_')
    .slice(0, 128);
  if (!sanitized) return true;
  const key = `rl:${bucket}:${sanitized}`;
  const current = await fastify.redis.incr(key);
  if (current === 1) {
    await fastify.redis.expire(key, windowSeconds);
  }
  return current <= limit;
}

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      const existing = await fastify.prisma.user.findUnique({
        where: { email: body.email },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictError('E-mail ja cadastrado');
      }

      const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
      const user = await fastify.prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          passwordHash,
          role: body.role,
          phone: body.phone,
          organizationName: body.organizationName,
          publicProfileState: getInitialProfileState(body.role),
        },
      });

      const tokens = await createSessionAndIssueTokens(
        fastify,
        { id: user.id, email: user.email, role: user.role },
        describeRequest(request),
      );

      return reply.code(201).send({
        user: safeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err) {
      return handleErrors(reply, err);
    }
  });

  fastify.post('/login', async (request, reply) => {
    try {
      // Per-IP throttle (network-level abuse).
      const ipAllowed = await rateLimit(fastify, request, 'login', 10, 60);
      if (!ipAllowed) return tooManyAttempts(reply);

      const body = loginSchema.parse(request.body);

      // Per-email throttle (credential stuffing across many IPs targeting one user).
      // Keep response identical to a wrong-password 429 so we don't leak account existence.
      const emailAllowed = await rateLimitByKey(fastify, 'login-email', body.email, 5, 60);
      if (!emailAllowed) return tooManyAttempts(reply);

      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
        include: { twoFactor: true },
      });

      if (!user) {
        throw new UnauthorizedError('E-mail ou senha incorretos');
      }

      const passwordMatch = await bcrypt.compare(body.password, user.passwordHash);
      if (!passwordMatch) {
        throw new UnauthorizedError('E-mail ou senha incorretos');
      }

      if (user.twoFactor && user.twoFactor.enabledAt) {
        const challenge = await issueTwoFactorChallenge(fastify, user.id);
        return reply.code(200).send({
          requiresTwoFactor: true,
          challengeId: challenge.challengeId,
          expiresAt: challenge.expiresAt.toISOString(),
        });
      }

      const tokens = await createSessionAndIssueTokens(
        fastify,
        { id: user.id, email: user.email, role: user.role },
        describeRequest(request),
      );

      return reply.code(200).send({
        user: safeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err) {
      return handleErrors(reply, err);
    }
  });

  fastify.post('/2fa/verify-login', async (request, reply) => {
    try {
      const allowed = await rateLimit(fastify, request, '2fa-verify', 30, 60);
      if (!allowed) return tooManyAttempts(reply);

      const body = verify2FALoginSchema.parse(request.body);
      const userId = await fastify.redis.get(challengeKey(body.challengeId));

      if (!userId) {
        throw new UnauthorizedError('Sessao de verificacao expirada. Faca login novamente.');
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: { twoFactor: true },
      });

      if (!user || !user.twoFactor || !user.twoFactor.enabledAt) {
        await fastify.redis.del(challengeKey(body.challengeId));
        throw new UnauthorizedError('2FA nao habilitado para este usuario');
      }

      let verified = false;

      if (body.code) {
        const secret = decryptSecret(user.twoFactor.secretEncrypted);
        verified = verifyTotp(secret, body.code);
      } else if (body.recoveryCode) {
        verified = await consumeRecoveryCode(fastify, user.twoFactor.id, body.recoveryCode);
      }

      if (!verified) {
        throw new UnauthorizedError('Codigo invalido');
      }

      await fastify.redis.del(challengeKey(body.challengeId));
      await fastify.prisma.userTwoFactor.update({
        where: { id: user.twoFactor.id },
        data: { lastVerifiedAt: new Date() },
      });

      const tokens = await createSessionAndIssueTokens(
        fastify,
        { id: user.id, email: user.email, role: user.role },
        describeRequest(request),
      );

      return reply.code(200).send({
        user: safeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err) {
      return handleErrors(reply, err);
    }
  });

  fastify.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken } = refreshSchema.parse(request.body);

      const payload = verifyRefreshToken(fastify, refreshToken);

      if (!payload || !payload.sessionId) {
        throw new UnauthorizedError('Refresh token invalido ou expirado');
      }

      const session = await fastify.prisma.userSession.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedError('Sessao expirada ou revogada');
      }

      if (session.refreshTokenHash !== hashRefreshToken(refreshToken)) {
        await fastify.prisma.userSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        throw new UnauthorizedError('Refresh token nao reconhecido. Sessao revogada por seguranca.');
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new NotFoundError('Usuario');
      }

      const tokens = await rotateSessionTokens(fastify, user, session.id);

      return reply.code(200).send(tokens);
    } catch (err) {
      return handleErrors(reply, err);
    }
  });

  fastify.post(
    '/logout',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const sessionId = request.user.sessionId;

        if (sessionId) {
          await fastify.prisma.userSession.updateMany({
            where: { id: sessionId, userId: request.user.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }

        return reply.code(204).send();
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
        });

        if (!user) {
          throw new NotFoundError('Usuario');
        }

        return reply.code(200).send({ user: safeUser(user) });
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.post(
    '/change-password',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const body = changePasswordSchema.parse(request.body);
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
        });

        if (!user) {
          throw new NotFoundError('Usuario');
        }

        const matches = await bcrypt.compare(body.currentPassword, user.passwordHash);
        if (!matches) {
          throw new UnauthorizedError('Senha atual incorreta');
        }

        const newHash = await bcrypt.hash(body.newPassword, SALT_ROUNDS);
        await fastify.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        });

        await revokeAllUserSessions(fastify, user.id);

        const tokens = await createSessionAndIssueTokens(
          fastify,
          { id: user.id, email: user.email, role: user.role },
          describeRequest(request),
        );

        return reply.code(200).send({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.get(
    '/sessions',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const sessions = await loadActiveSessionsForUser(fastify, request.user.id);
        const currentSessionId = request.user.sessionId ?? null;

        return reply.code(200).send({
          data: sessions.map((session) => ({
            id: session.id,
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
            deviceLabel: session.deviceLabel,
            createdAt: session.createdAt.toISOString(),
            lastUsedAt: session.lastUsedAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            isCurrent: session.id === currentSessionId,
          })),
          meta: {
            currentSessionId,
            count: sessions.length,
          },
        });
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.delete(
    '/sessions/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        if (request.user.sessionId === id) {
          return reply.code(400).send({
            error: 'CANNOT_REVOKE_CURRENT',
            message: 'Para encerrar a sessao atual use logout.',
            statusCode: 400,
          });
        }

        const session = await fastify.prisma.userSession.findFirst({
          where: { id, userId: request.user.id },
        });

        if (!session) {
          throw new NotFoundError('Sessao');
        }

        if (session.revokedAt) {
          return reply.code(204).send();
        }

        await fastify.prisma.userSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });

        return reply.code(204).send();
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.post(
    '/sessions/revoke-others',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const sessionId = request.user.sessionId;

        if (!sessionId) {
          await revokeAllUserSessions(fastify, request.user.id);
          return reply.code(200).send({ revokedCount: 0 });
        }

        const count = await revokeOtherSessions(fastify, request.user.id, sessionId);

        return reply.code(200).send({ revokedCount: count });
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.get(
    '/2fa/status',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const twoFactor = await fastify.prisma.userTwoFactor.findUnique({
          where: { userId: request.user.id },
          select: {
            enabledAt: true,
            recoveryCodes: { where: { usedAt: null }, select: { id: true } },
          },
        });

        return reply.code(200).send({
          enabled: Boolean(twoFactor?.enabledAt),
          enabledAt: twoFactor?.enabledAt ? twoFactor.enabledAt.toISOString() : null,
          remainingRecoveryCodes: twoFactor?.recoveryCodes?.length ?? 0,
        });
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.post(
    '/2fa/setup',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const allowed = await rateLimit(fastify, request, '2fa-setup', 10, 60);
        if (!allowed) return tooManyAttempts(reply);

        // Gate: refuse to start setup if encryption isn't ready. Confirm would
        // fail later anyway and the user would have wasted time scanning the QR.
        assertTwoFactorEncryptionReady(fastify.log);

        const existing = await fastify.prisma.userTwoFactor.findUnique({
          where: { userId: request.user.id },
        });

        if (existing && existing.enabledAt) {
          throw new ConflictError('2FA ja esta ativo. Desative antes de reconfigurar.');
        }

        const secret = generateTotpSecret();
        const otpauthUri = buildOtpAuthUri(secret, request.user.email);

        await fastify.redis.set(setupKey(request.user.id), secret, {
          EX: TWO_FACTOR_SETUP_TTL_SECONDS,
        });

        return reply.code(200).send({
          secret,
          otpauthUri,
          expiresInSeconds: TWO_FACTOR_SETUP_TTL_SECONDS,
        });
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.post(
    '/2fa/confirm',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const allowed = await rateLimit(fastify, request, '2fa-confirm', 10, 60);
        if (!allowed) return tooManyAttempts(reply);

        const body = confirm2FASchema.parse(request.body);
        const secret = await fastify.redis.get(setupKey(request.user.id));

        if (!secret) {
          throw new UnauthorizedError(
            'Sessao de configuracao expirada. Inicie o setup novamente.',
          );
        }

        if (!verifyTotp(secret, body.code)) {
          throw new UnauthorizedError('Codigo invalido');
        }

        const recoveryCodes = generateRecoveryCodes();
        const encryptedSecret = encryptSecret(secret);

        const twoFactor = await fastify.prisma.userTwoFactor.upsert({
          where: { userId: request.user.id },
          update: {
            secretEncrypted: encryptedSecret,
            enabledAt: new Date(),
            lastVerifiedAt: new Date(),
            recoveryCodes: { deleteMany: {} },
          },
          create: {
            userId: request.user.id,
            secretEncrypted: encryptedSecret,
            enabledAt: new Date(),
            lastVerifiedAt: new Date(),
          },
        });

        await fastify.prisma.userTwoFactorRecoveryCode.createMany({
          data: await buildRecoveryCodesEntries(twoFactor.id, recoveryCodes),
        });

        await fastify.redis.del(setupKey(request.user.id));

        return reply.code(200).send({
          enabled: true,
          recoveryCodes,
        });
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.post(
    '/2fa/disable',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const allowed = await rateLimit(fastify, request, '2fa-disable', 10, 60);
        if (!allowed) return tooManyAttempts(reply);

        const body = disable2FASchema.parse(request.body);
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
          include: { twoFactor: true },
        });

        if (!user || !user.twoFactor || !user.twoFactor.enabledAt) {
          throw new ConflictError('2FA nao esta ativo');
        }

        const passwordOk = await bcrypt.compare(body.password, user.passwordHash);
        if (!passwordOk) {
          throw new UnauthorizedError('Senha incorreta');
        }

        let codeOk = false;
        if (body.code) {
          const secret = decryptSecret(user.twoFactor.secretEncrypted);
          codeOk = verifyTotp(secret, body.code);
        } else if (body.recoveryCode) {
          codeOk = await consumeRecoveryCode(fastify, user.twoFactor.id, body.recoveryCode);
        }

        if (!codeOk) {
          throw new UnauthorizedError('Codigo invalido');
        }

        await fastify.prisma.userTwoFactor.delete({
          where: { id: user.twoFactor.id },
        });

        await fastify.redis.del(setupKey(user.id));

        return reply.code(200).send({ enabled: false });
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );

  fastify.post(
    '/2fa/recovery-codes/regenerate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const allowed = await rateLimit(fastify, request, '2fa-recovery', 10, 60);
        if (!allowed) return tooManyAttempts(reply);

        const body = regenerateRecoverySchema.parse(request.body);
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
          include: { twoFactor: true },
        });

        if (!user || !user.twoFactor || !user.twoFactor.enabledAt) {
          throw new ConflictError('2FA nao esta ativo');
        }

        const passwordOk = await bcrypt.compare(body.password, user.passwordHash);
        if (!passwordOk) {
          throw new UnauthorizedError('Senha incorreta');
        }

        let codeOk = false;
        if (body.code) {
          const secret = decryptSecret(user.twoFactor.secretEncrypted);
          codeOk = verifyTotp(secret, body.code);
        } else if (body.recoveryCode) {
          codeOk = await consumeRecoveryCode(fastify, user.twoFactor.id, body.recoveryCode);
        }

        if (!codeOk) {
          throw new UnauthorizedError('Codigo invalido');
        }

        const recoveryCodes = generateRecoveryCodes();

        await fastify.prisma.$transaction([
          fastify.prisma.userTwoFactorRecoveryCode.deleteMany({
            where: { twoFactorId: user.twoFactor.id },
          }),
          fastify.prisma.userTwoFactorRecoveryCode.createMany({
            data: await buildRecoveryCodesEntries(user.twoFactor.id, recoveryCodes),
          }),
        ]);

        return reply.code(200).send({ recoveryCodes });
      } catch (err) {
        return handleErrors(reply, err);
      }
    },
  );
}
