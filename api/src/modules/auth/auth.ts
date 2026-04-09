// api/src/modules/auth/auth.ts
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  toErrorResponse,
} from '../../shared/errors';

// ─── Constantes ──────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias
const REFRESH_TOKEN_PREFIX = 'refresh:';

// ─── Schemas de validação (Zod) ───────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.DONOR),
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Gera o par access token + refresh token e salva o refresh no Redis. */
async function generateTokenPair(
  fastify: FastifyInstance,
  payload: { id: string; email: string; role: string },
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = fastify.jwt.sign(payload);

  // Refresh token = JWT separado de longa duração
  const refreshToken = fastify.jwt.sign(payload, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    // Usamos o refresh secret se disponível (boa prática)
    ...(process.env.JWT_REFRESH_SECRET
      ? { key: process.env.JWT_REFRESH_SECRET }
      : {}),
  });

  // Persiste no Redis com TTL para possibilitar revogação
  await fastify.redis.set(
    `${REFRESH_TOKEN_PREFIX}${payload.id}`,
    refreshToken,
    { EX: REFRESH_TOKEN_TTL_SECONDS },
  );

  return { accessToken, refreshToken };
}

/** Perfil seguro (sem passwordHash) para retornar nas respostas. */
function safeUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  phone: string | null;
  organizationName: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    organizationName: user.organizationName,
    createdAt: user.createdAt,
  };
}

// ─── Plugin de rotas ─────────────────────────────────────────────────────────

export default async function authRoutes(fastify: FastifyInstance) {
  // ── POST /auth/register ──────────────────────────────────────────────────
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Verifica e-mail duplicado
      const existing = await fastify.prisma.user.findUnique({
        where: { email: body.email },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictError('E-mail já cadastrado');
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
        },
      });

      const tokens = await generateTokenPair(fastify, {
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.code(201).send({
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
          message: 'Dados inválidos',
          issues: err.errors,
        });
      }
      throw err;
    }
  });

  // ── POST /auth/login ─────────────────────────────────────────────────────
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
          message: 'Dados inválidos',
          issues: err.errors,
        });
      }
      throw err;
    }
  });

  // ── POST /auth/refresh ───────────────────────────────────────────────────
  fastify.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken } = refreshSchema.parse(request.body);

      // Decodifica o refresh token (sem verificar a assinatura ainda)
      let payload: { id: string; email: string; role: string };
      try {
        payload = fastify.jwt.verify(refreshToken, {
          ...(process.env.JWT_REFRESH_SECRET
            ? { key: process.env.JWT_REFRESH_SECRET }
            : {}),
        }) as typeof payload;
      } catch {
        throw new UnauthorizedError('Refresh token inválido ou expirado');
      }

      // Confirma que o token armazenado no Redis bate com o enviado
      const stored = await fastify.redis.get(`${REFRESH_TOKEN_PREFIX}${payload.id}`);
      if (!stored || stored !== refreshToken) {
        throw new UnauthorizedError('Refresh token revogado');
      }

      // Busca usuário atualizado (garante que a conta ainda existe)
      const user = await fastify.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, role: true },
      });
      if (!user) {
        throw new NotFoundError('Usuário');
      }

      // Gera novo par de tokens (rotação de refresh token)
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
          message: 'Dados inválidos',
          issues: err.errors,
        });
      }
      throw err;
    }
  });

  // ── POST /auth/logout ────────────────────────────────────────────────────
  fastify.post(
    '/logout',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      try {
        // Remove o refresh token do Redis, invalidando-o
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
