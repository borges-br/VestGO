import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, UnauthorizedError, toErrorResponse } from '../../shared/errors';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const uploadBodySchema = z.object({
  filename: z.string().trim().min(1).max(180),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  target: z.enum(['avatar', 'cover']),
  dataBase64: z.string().min(1),
});

const getObjectParamsSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .regex(/^[a-zA-Z0-9._%-]+$/, 'Chave de arquivo invalida'),
});

function parseBase64Image(value: string) {
  const [, base64Value = value] = value.split(',', 2);
  return Buffer.from(base64Value, 'base64');
}

export default async function uploadRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      bodyLimit: 8 * 1024 * 1024,
    },
    async (request, reply) => {
      try {
        const body = uploadBodySchema.parse(request.body);
        const user = request.user;

        if (!user?.id) {
          throw new UnauthorizedError('Sessao invalida para upload');
        }

        const buffer = parseBase64Image(body.dataBase64);

        if (buffer.length === 0) {
          throw new AppError('Arquivo invalido ou vazio.', 422, 'VALIDATION_ERROR');
        }

        if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
          throw new AppError(
            'A imagem excede o limite de 5MB. Escolha um arquivo menor.',
            422,
            'VALIDATION_ERROR',
          );
        }

        const stored = await fastify.storage.putImage({
          userId: user.id,
          target: body.target,
          filename: body.filename,
          contentType: body.contentType,
          buffer,
        });

        return reply.code(201).send({
          data: stored,
        });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.statusCode).send(toErrorResponse(err));
        }

        if (err instanceof z.ZodError) {
          return reply.code(422).send({
            error: 'VALIDATION_ERROR',
            message: 'Dados invalidos para upload.',
            issues: err.errors,
          });
        }

        throw err;
      }
    },
  );

  fastify.get('/:key', async (request, reply) => {
    try {
      const { key } = getObjectParamsSchema.parse(request.params);
      const object = await fastify.storage.getObject(key);

      reply.header('Content-Type', object.contentType);
      reply.header('Content-Length', String(object.size));
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');

      return reply.send(object.stream);
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Arquivo solicitado invalido.',
          issues: err.errors,
        });
      }

      request.log.error({ err }, 'Falha ao servir arquivo do storage');
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Arquivo nao encontrado.',
      });
    }
  });
}
