import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, UnauthorizedError, toErrorResponse } from '../../shared/errors';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const uploadBodySchema = z.object({
  filename: z.string().trim().min(1).max(180),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  target: z.enum(['avatar', 'cover', 'gallery']),
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

function sniffImageContentType(buffer: Buffer): (typeof ALLOWED_CONTENT_TYPES)[number] | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
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

        if (
          body.target === 'gallery' &&
          user.role !== 'COLLECTION_POINT' &&
          user.role !== 'NGO'
        ) {
          throw new AppError(
            'Galerias adicionais estao disponiveis apenas para perfis operacionais.',
            403,
            'FORBIDDEN',
          );
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

        const detectedContentType = sniffImageContentType(buffer);

        if (!detectedContentType) {
          throw new AppError(
            'Formato de imagem invalido. Use JPG, PNG ou WEBP.',
            422,
            'VALIDATION_ERROR',
          );
        }

        if (detectedContentType !== body.contentType) {
          throw new AppError(
            'O tipo do arquivo nao corresponde ao conteudo enviado. Reenvie a imagem original.',
            422,
            'VALIDATION_ERROR',
          );
        }

        const stored = await fastify.storage.putImage({
          userId: user.id,
          target: body.target,
          filename: body.filename,
          contentType: detectedContentType,
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
