import { Prisma, PublicProfileState, UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, NotFoundError, toErrorResponse } from '../../shared/errors';

const adminProfilesQuerySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(PublicProfileState).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

const profileStatusUpdateSchema = z.object({
  status: z.nativeEnum(PublicProfileState),
});

const adminProfileSelect = {
  id: true,
  role: true,
  name: true,
  email: true,
  phone: true,
  organizationName: true,
  description: true,
  city: true,
  state: true,
  address: true,
  neighborhood: true,
  zipCode: true,
  acceptedCategories: true,
  publicProfileState: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export default async function adminProfileRoutes(fastify: FastifyInstance) {
  // Ensure all routes require ADMIN role
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await fastify.authenticate(request, reply);
      if (request.user.role !== UserRole.ADMIN) {
        return reply.code(403).send({ error: 'FORBIDDEN', message: 'Acesso negado: Requer perfil de administrador.' });
      }
    } catch (err) {
      if (!reply.sent) {
        reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Nao autenticado.' });
      }
    }
  });

  fastify.get('/', async (request, reply) => {
    try {
      const query = adminProfilesQuerySchema.parse(request.query);

      const where: Prisma.UserWhereInput = {
        role: query.role ? query.role : { in: [UserRole.COLLECTION_POINT, UserRole.NGO] },
        publicProfileState: query.status,
      };

      const profiles = await fastify.prisma.user.findMany({
        where,
        take: query.limit,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        select: adminProfileSelect,
      });

      const nextCursor = profiles.length === query.limit ? profiles[profiles.length - 1].id : null;
      const count = await fastify.prisma.user.count({ where });

      return reply.send({
        data: profiles,
        meta: {
          count,
          nextCursor,
        },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Parametros invalidos',
          issues: err.errors,
        });
      }
      throw err;
    }
  });

  fastify.patch('/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = profileStatusUpdateSchema.parse(request.body);

      const profile = await fastify.prisma.user.findFirst({
        where: { id, role: { in: [UserRole.COLLECTION_POINT, UserRole.NGO] } },
      });

      if (!profile) {
        throw new NotFoundError('Perfil operacional');
      }

      const verifiedAt = status === PublicProfileState.VERIFIED 
        ? new Date() 
        : (status === PublicProfileState.DRAFT || status === PublicProfileState.PENDING ? null : profile.verifiedAt);

      const updated = await fastify.prisma.user.update({
        where: { id },
        data: {
          publicProfileState: status,
          verifiedAt,
        },
        select: adminProfileSelect,
      });

      return reply.send(updated);
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
}
