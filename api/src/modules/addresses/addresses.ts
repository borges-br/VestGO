import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { suggestAddresses } from '../../shared/geocoding';

const addressSuggestionsQuerySchema = z.object({
  q: z.string().trim().min(3).max(120),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(8).default(5),
  scope: z.enum(['profile', 'public']).default('profile'),
});

export default async function addressRoutes(fastify: FastifyInstance) {
  fastify.get('/suggestions', async (request, reply) => {
    try {
      const query = addressSuggestionsQuerySchema.parse(request.query);

      if ((query.lat == null) !== (query.lng == null)) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Informe latitude e longitude juntas para priorizar sugestoes por proximidade.',
        });
      }

      const result = await suggestAddresses({
        query: query.q,
        latitude: query.lat,
        longitude: query.lng,
        limit: query.limit,
        scope: query.scope,
      });

      if (result.status === 'incomplete') {
        return reply.send({
          data: [],
          meta: {
            count: 0,
            bias: null,
          },
        });
      }

      if (result.status === 'unavailable') {
        return reply.code(503).send({
          error: 'GEOCODING_UNAVAILABLE',
          message: result.message,
        });
      }

      return reply.send({
        data: result.suggestions,
        meta: {
          count: result.suggestions.length,
          bias: result.bias,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Parametros invalidos para sugestoes de endereco',
          issues: err.errors,
        });
      }

      throw err;
    }
  });
}
