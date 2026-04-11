import bcrypt from 'bcrypt';
import { PublicProfileState, UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  toErrorResponse,
} from '../../shared/errors';
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
    createdAt: user.createdAt,
  };
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
