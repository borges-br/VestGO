// api/src/plugins/redis.ts
import fp from 'fastify-plugin';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClient;
  }
}

export default fp(async (fastify) => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const redis = createClient({ url: redisUrl });

  redis.on('error', (err) => {
    fastify.log.error({ err }, 'Redis client error');
  });

  await redis.connect();
  fastify.log.info('Redis connected');

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
    fastify.log.info('Redis disconnected');
  });
});