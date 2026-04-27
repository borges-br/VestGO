import bcrypt from 'bcrypt';
import { PublicProfileState, UserRole, UserTokenType } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  toErrorResponse,
} from '../../shared/errors';
import { getWebPublicUrl, sendEmail } from '../../shared/email';
import {
  emailVerificationTemplate,
  passwordChangedTemplate,
  passwordResetTemplate,
} from '../../shared/email-templates';
import { enforceRateLimit } from '../../shared/rate-limit';
import {
  consumeUserToken,
  consumeUserTokenWithDiagnostics,
  createUserToken,
  getTokenHashPrefix,
} from '../../shared/user-tokens';
import { getInitialProfileState } from '../profiles/profile-shared';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const REFRESH_TOKEN_PREFIX = 'refresh:';
const PUBLIC_REGISTERABLE_ROLES = [
  UserRole.DONOR,
  UserRole.COLLECTION_POINT,
  UserRole.NGO,
] as const;

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

const tokenSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(24),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

type AuthSafeUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  phone: string | null;
  organizationName: string | null;
  publicProfileState: PublicProfileState;
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

async function generateTokenPair(
  fastify: FastifyInstance,
  payload: { id: string; email: string; role: string },
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = fastify.jwt.sign(payload);
  const refreshToken = fastify.jwt.sign(payload, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    ...(process.env.JWT_REFRESH_SECRET
      ? { key: process.env.JWT_REFRESH_SECRET }
      : {}),
  });

  await fastify.redis.set(`${REFRESH_TOKEN_PREFIX}${payload.id}`, refreshToken, {
    EX: REFRESH_TOKEN_TTL_SECONDS,
  });

  return { accessToken, refreshToken };
}

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
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt,
  };
}

function buildEmailVerificationUrl(token: string) {
  const url = new URL('/confirmar-email', getWebPublicUrl());
  url.searchParams.set('token', token);
  return url.toString();
}

function buildPasswordResetUrl(token: string) {
  const url = new URL('/redefinir-senha', getWebPublicUrl());
  url.searchParams.set('token', token);
  return url.toString();
}

function getEmailVerificationExpiresMinutes() {
  return Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES ?? 24 * 60);
}

function getPasswordResetExpiresMinutes() {
  return Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES ?? 60);
}

async function sendEmailVerification(
  fastify: FastifyInstance,
  user: { id: string; name: string; email: string },
) {
  const { token } = await createUserToken({
    prisma: fastify.prisma,
    userId: user.id,
    type: UserTokenType.EMAIL_VERIFICATION,
    expiresInMinutes: getEmailVerificationExpiresMinutes(),
  });
  const template = emailVerificationTemplate({
    name: user.name,
    actionUrl: buildEmailVerificationUrl(token),
  });

  return sendEmail({
    to: user.email,
    ...template,
  });
}

async function sendPasswordResetEmail(
  fastify: FastifyInstance,
  user: { id: string; name: string; email: string },
) {
  const { token } = await createUserToken({
    prisma: fastify.prisma,
    userId: user.id,
    type: UserTokenType.PASSWORD_RESET,
    expiresInMinutes: getPasswordResetExpiresMinutes(),
  });
  const template = passwordResetTemplate({
    name: user.name,
    actionUrl: buildPasswordResetUrl(token),
  });

  return sendEmail({
    to: user.email,
    ...template,
  });
}

async function sendPasswordChangedEmail(user: { name: string; email: string }) {
  const template = passwordChangedTemplate({
    name: user.name,
  });

  return sendEmail({
    to: user.email,
    ...template,
  });
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

      let emailVerificationSent = false;
      try {
        const delivery = await sendEmailVerification(fastify, user);
        emailVerificationSent = delivery.sent;
      } catch (err) {
        fastify.log.warn(
          { err, userId: user.id },
          'Email verification delivery failed after registration',
        );
      }

      const tokens = await generateTokenPair(fastify, {
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.code(201).send({
        user: safeUser(user),
        emailVerificationSent,
        ...tokens,
      });
    } catch (err) {
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

      throw err;
    }
  });

  fastify.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        throw new UnauthorizedError('E-mail ou senha incorretos');
      }

      const passwordMatch = await bcrypt.compare(body.password, user.passwordHash);
      if (!passwordMatch) {
        throw new UnauthorizedError('E-mail ou senha incorretos');
      }

      const tokens = await generateTokenPair(fastify, {
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.code(200).send({
        user: safeUser(user),
        ...tokens,
      });
    } catch (err) {
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

      throw err;
    }
  });

  fastify.post(
    '/request-email-verification',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        await enforceRateLimit({
          fastify,
          request,
          key: 'auth:request-email-verification',
          limit: 5,
          windowSeconds: 15 * 60,
        });

        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            emailVerifiedAt: true,
          },
        });

        if (!user) {
          throw new NotFoundError('Usuario');
        }

        if (user.emailVerifiedAt) {
          return reply.code(200).send({
            emailVerificationSent: false,
            alreadyVerified: true,
          });
        }

        try {
          const delivery = await sendEmailVerification(fastify, user);
          return reply.code(200).send({
            emailVerificationSent: delivery.sent,
            alreadyVerified: false,
          });
        } catch (err) {
          fastify.log.warn(
            { err, userId: user.id },
            'Email verification delivery failed on request',
          );
          throw new AppError(
            'Nao foi possivel enviar o e-mail de confirmacao agora. Tente novamente em instantes.',
            503,
            'EMAIL_DELIVERY_FAILED',
          );
        }
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.statusCode).send(toErrorResponse(err));
        }

        throw err;
      }
    },
  );

  fastify.post('/verify-email', async (request, reply) => {
    try {
      await enforceRateLimit({
        fastify,
        request,
        key: 'auth:verify-email',
        limit: 10,
        windowSeconds: 15 * 60,
      });

      const { token } = tokenSchema.parse(request.body);
      const consumed = await consumeUserTokenWithDiagnostics({
        prisma: fastify.prisma,
        type: UserTokenType.EMAIL_VERIFICATION,
        token,
      });

      if (!consumed.ok) {
        fastify.log.warn(
          {
            tokenType: UserTokenType.EMAIL_VERIFICATION,
            tokenHashPrefix: consumed.tokenHashPrefix,
            reason: consumed.reason,
          },
          'Email verification token rejected',
        );
        throw new AppError('Link de confirmacao invalido ou expirado.', 400, 'INVALID_TOKEN');
      }

      const user = await fastify.prisma.user.update({
        where: { id: consumed.userId },
        data: {
          emailVerifiedAt: new Date(),
        },
      });

      return reply.code(200).send({
        user: safeUser(user),
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        const body = request.body;
        const token = typeof body === 'object' && body !== null && 'token' in body
          ? (body as { token?: unknown }).token
          : null;

        fastify.log.warn(
          {
            tokenType: UserTokenType.EMAIL_VERIFICATION,
            tokenHashPrefix: typeof token === 'string' ? getTokenHashPrefix(token) : null,
            reason: 'VALIDATION_FAILED',
          },
          'Email verification token rejected',
        );

        return reply.code(400).send({
          error: 'INVALID_TOKEN',
          message: 'Link de confirmacao invalido ou expirado.',
          statusCode: 400,
        });
      }

      throw err;
    }
  });

  fastify.post('/request-password-reset', async (request, reply) => {
    const genericResponse = {
      message:
        'Se o e-mail estiver cadastrado, enviaremos instrucoes para redefinir sua senha.',
    };

    try {
      await enforceRateLimit({
        fastify,
        request,
        key: 'auth:request-password-reset',
        limit: 5,
        windowSeconds: 15 * 60,
      });

      const { email } = requestPasswordResetSchema.parse(request.body);
      const user = await fastify.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (user) {
        try {
          await sendPasswordResetEmail(fastify, user);
        } catch (err) {
          fastify.log.warn(
            { err, userId: user.id },
            'Password reset delivery failed',
          );
        }
      }

      return reply.code(200).send(genericResponse);
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(200).send(genericResponse);
      }

      throw err;
    }
  });

  fastify.post('/reset-password', async (request, reply) => {
    try {
      await enforceRateLimit({
        fastify,
        request,
        key: 'auth:reset-password',
        limit: 8,
        windowSeconds: 15 * 60,
      });

      const { token, password } = resetPasswordSchema.parse(request.body);
      const consumed = await consumeUserToken({
        prisma: fastify.prisma,
        type: UserTokenType.PASSWORD_RESET,
        token,
      });

      if (!consumed) {
        throw new AppError('Link de redefinicao invalido ou expirado.', 400, 'INVALID_TOKEN');
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await fastify.prisma.user.update({
        where: { id: consumed.userId },
        data: {
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      await fastify.redis.del(`${REFRESH_TOKEN_PREFIX}${user.id}`);

      try {
        await sendPasswordChangedEmail(user);
      } catch (err) {
        fastify.log.warn(
          { err, userId: user.id },
          'Password changed email delivery failed',
        );
      }

      return reply.code(200).send({
        message: 'Senha redefinida com sucesso.',
      });
    } catch (err) {
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

      throw err;
    }
  });

  fastify.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken } = refreshSchema.parse(request.body);

      let payload: { id: string; email: string; role: string };
      try {
        payload = fastify.jwt.verify(refreshToken, {
          ...(process.env.JWT_REFRESH_SECRET
            ? { key: process.env.JWT_REFRESH_SECRET }
            : {}),
        }) as typeof payload;
      } catch {
        throw new UnauthorizedError('Refresh token invalido ou expirado');
      }

      const stored = await fastify.redis.get(`${REFRESH_TOKEN_PREFIX}${payload.id}`);
      if (!stored || stored !== refreshToken) {
        throw new UnauthorizedError('Refresh token revogado');
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new NotFoundError('Usuario');
      }

      const tokens = await generateTokenPair(fastify, {
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.code(200).send(tokens);
    } catch (err) {
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

      throw err;
    }
  });

  fastify.post(
    '/logout',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        await fastify.redis.del(`${REFRESH_TOKEN_PREFIX}${request.user.id}`);
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.statusCode).send(toErrorResponse(err));
        }

        throw err;
      }
    },
  );
}
