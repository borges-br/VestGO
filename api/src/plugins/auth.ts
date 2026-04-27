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
    payload: { id: string; email: string; role: string };
    user: { id: string; email: string; role: string };
  }
}

export default fp(async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();

        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
          select: { anonymizedAt: true },
        });

        if (!user || user.anonymizedAt) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    },
  );
});
