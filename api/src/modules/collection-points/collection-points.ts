// api/src/modules/collection-points/collection-points.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole, ItemCategory } from '@prisma/client';
import { AppError, NotFoundError, toErrorResponse } from '../../shared/errors';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).default(10), // km
  category: z.nativeEnum(ItemCategory).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(), // id do último item para paginação
});

// ─── Type para resultado do query raw ────────────────────────────────────────

type CollectionPointRow = {
  id: string;
  name: string;
  organizationName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  avatarUrl: string | null;
  phone: string | null;
  acceptedCategories: ItemCategory[];
  distanceKm: number;
};

// ─── Helper: Haversine distance em SQL puro ───────────────────────────────────
// Funciona sem PostGIS. Para produção com PostGIS, trocar por ST_DWithin.

function haversineSQL(lat: number, lng: number) {
  return `
    (
      6371 * acos(
        cos(radians(${lat})) *
        cos(radians(latitude)) *
        cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) *
        sin(radians(latitude))
      )
    )
  `;
}

// ─── Rotas ───────────────────────────────────────────────────────────────────

export default async function collectionPointRoutes(fastify: FastifyInstance) {

  // ── GET /collection-points ───────────────────────────────────────────────
  // Busca pontos próximos por lat/lng/radius. Paginação por cursor.
  fastify.get('/', async (request, reply) => {
    try {
      const query = nearbyQuerySchema.parse(request.query);
      const distanceExpr = haversineSQL(query.lat, query.lng);

      // Filtro de categoria (aplicado via WHERE no JS pois $queryRaw não aceita arrays facilmente)
      const points = await fastify.prisma.$queryRawUnsafe<CollectionPointRow[]>(`
        SELECT
          id,
          name,
          "organizationName",
          address,
          city,
          state,
          latitude,
          longitude,
          "avatarUrl",
          phone,
          "acceptedCategories",
          ${distanceExpr} AS "distanceKm"
        FROM users
        WHERE
          role IN ('COLLECTION_POINT', 'NGO')
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND ${distanceExpr} <= ${query.radius}
          ${query.cursor ? `AND id > '${query.cursor}'` : ''}
        ORDER BY "distanceKm" ASC
        LIMIT ${query.limit}
      `);

      // Filtro de categoria em memória (seguro pois já limitamos no banco)
      const filtered = query.category
        ? points.filter((p) => p.acceptedCategories?.includes(query.category!))
        : points;

      const nextCursor = filtered.length === query.limit
        ? filtered[filtered.length - 1].id
        : null;

      return reply.send({
        data: filtered.map((p) => ({
          ...p,
          distanceKm: Math.round(p.distanceKm * 10) / 10, // 1 casa decimal
        })),
        meta: {
          count: filtered.length,
          nextCursor,
          radiusKm: query.radius,
          center: { lat: query.lat, lng: query.lng },
        },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros inválidos',
          issues: err.errors,
        });
      }
      throw err;
    }
  });

  // ── GET /collection-points/:id ───────────────────────────────────────────
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const point = await fastify.prisma.user.findFirst({
        where: {
          id,
          role: { in: [UserRole.COLLECTION_POINT, UserRole.NGO] },
        },
        select: {
          id: true,
          name: true,
          organizationName: true,
          address: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
          avatarUrl: true,
          phone: true,
          acceptedCategories: true,
          createdAt: true,
          // estatísticas derivadas
          collectedAt: {
            select: { id: true },
          },
        },
      });

      if (!point) throw new NotFoundError('Ponto de coleta');

      return reply.send({
        ...point,
        totalDonations: point.collectedAt.length,
        collectedAt: undefined, // não expor a lista bruta
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      throw err;
    }
  });
}
