import { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError } from './errors';

type RateLimitInput = {
  fastify: FastifyInstance;
  request: FastifyRequest;
  key: string;
  limit: number;
  windowSeconds: number;
};

export async function enforceRateLimit(input: RateLimitInput) {
  const ip = input.request.ip || 'unknown';
  const key = `rate-limit:${input.key}:${ip}`;
  const count = await input.fastify.redis.incr(key);

  if (count === 1) {
    await input.fastify.redis.expire(key, input.windowSeconds);
  }

  if (count > input.limit) {
    throw new AppError(
      'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
      429,
      'RATE_LIMITED',
    );
  }
}
