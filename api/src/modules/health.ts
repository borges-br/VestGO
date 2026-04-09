// api/src/modules/health.ts
import { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}