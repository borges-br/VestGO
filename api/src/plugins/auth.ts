// api/src/plugins/auth.ts
import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; role: string; sessionId?: string };
    user: { id: string; email: string; role: string; sessionId?: string };
  }
}

export default fp(async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const sessionId = request.user.sessionId;
      if (!sessionId) {
        return;
      }

      const session = await fastify.prisma.userSession.findUnique({
        where: { id: sessionId },
        select: {
          revokedAt: true,
          expiresAt: true,
          user: {
            select: {
              anonymizedAt: true,
            },
          },
        },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return reply.code(401).send({ error: 'SESSION_REVOKED' });
      }

      if (session.user.anonymizedAt) {
        return reply.code(401).send({
          error: 'ACCOUNT_CLOSED',
          message: 'Esta conta foi encerrada.',
        });
      }
    },
  );
});
