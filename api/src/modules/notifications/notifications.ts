import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, NotFoundError, toErrorResponse } from '../../shared/errors';
import { mapNotification, notificationSelect } from '../../shared/notifications';

const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const query = notificationsQuerySchema.parse(request.query);

      const [notifications, unreadCount] = await Promise.all([
        fastify.prisma.notification.findMany({
          where: { userId: request.user.id },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          select: notificationSelect,
        }),
        fastify.prisma.notification.count({
          where: {
            userId: request.user.id,
            readAt: null,
          },
        }),
      ]);

      return reply.send({
        data: notifications.map(mapNotification),
        meta: {
          count: notifications.length,
          unreadCount,
        },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Parametros invalidos para listar notificacoes',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.patch('/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const notification = await fastify.prisma.notification.findFirst({
        where: {
          id,
          userId: request.user.id,
        },
        select: {
          id: true,
          readAt: true,
        },
      });

      if (!notification) {
        throw new NotFoundError('Notificacao');
      }

      const updated = await fastify.prisma.notification.update({
        where: { id: notification.id },
        data: {
          readAt: notification.readAt ?? new Date(),
        },
        select: notificationSelect,
      });

      return reply.send(mapNotification(updated));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.patch('/read-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await fastify.prisma.notification.updateMany({
        where: {
          userId: request.user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      return reply.send({
        updatedCount: result.count,
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });
}
