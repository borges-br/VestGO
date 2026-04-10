import {
  ItemCategory,
  Prisma,
  PublicProfileState,
  UserRole,
} from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, NotFoundError, toErrorResponse } from '../../shared/errors';

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).default(10),
  category: z.nativeEnum(ItemCategory).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

type CollectionPointRow = {
  id: string;
  name: string;
  organizationName: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  openingHours: string | null;
  publicNotes: string | null;
  phone: string | null;
  role: UserRole;
  publicProfileState: PublicProfileState;
  acceptedCategories: ItemCategory[];
  distanceKm: number;
};

const publicProfileSelect = {
  id: true,
  role: true,
  name: true,
  organizationName: true,
  address: true,
  neighborhood: true,
  zipCode: true,
  city: true,
  state: true,
  latitude: true,
  longitude: true,
  avatarUrl: true,
  coverImageUrl: true,
  phone: true,
  description: true,
  purpose: true,
  openingHours: true,
  publicNotes: true,
  accessibilityDetails: true,
  estimatedCapacity: true,
  serviceRegions: true,
  rules: true,
  nonAcceptedItems: true,
  acceptedCategories: true,
  publicProfileState: true,
  verifiedAt: true,
  createdAt: true,
  _count: {
    select: {
      collectedAt: true,
      receivedAt: true,
      outgoingOperationalPartnerships: true,
      incomingOperationalPartnerships: true,
    },
  },
} satisfies Prisma.UserSelect;

type PublicProfileRecord = Prisma.UserGetPayload<{ select: typeof publicProfileSelect }>;

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

function mapPublicProfile(point: PublicProfileRecord) {
  const handledDonations =
    point.role === UserRole.NGO ? point._count.receivedAt : point._count.collectedAt;
  const activePartnerships =
    point.role === UserRole.NGO
      ? point._count.incomingOperationalPartnerships
      : point._count.outgoingOperationalPartnerships;

  return {
    id: point.id,
    role: point.role,
    name: point.name,
    organizationName: point.organizationName,
    address: point.address,
    neighborhood: point.neighborhood,
    zipCode: point.zipCode,
    city: point.city,
    state: point.state,
    latitude: point.latitude,
    longitude: point.longitude,
    avatarUrl: point.avatarUrl,
    coverImageUrl: point.coverImageUrl,
    phone: point.phone,
    description: point.description,
    purpose: point.purpose,
    openingHours: point.openingHours,
    publicNotes: point.publicNotes,
    accessibilityDetails: point.accessibilityDetails,
    estimatedCapacity: point.estimatedCapacity,
    serviceRegions: point.serviceRegions,
    rules: point.rules,
    nonAcceptedItems: point.nonAcceptedItems,
    acceptedCategories: point.acceptedCategories,
    publicProfileState: point.publicProfileState,
    verifiedAt: point.verifiedAt?.toISOString() ?? null,
    createdAt: point.createdAt.toISOString(),
    totalDonations: handledDonations,
    activePartnerships,
  };
}

export default async function collectionPointRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    try {
      const query = nearbyQuerySchema.parse(request.query);
      const distanceExpr = haversineSQL(query.lat, query.lng);

      const points = await fastify.prisma.$queryRawUnsafe<CollectionPointRow[]>(`
        SELECT
          id,
          name,
          role,
          "organizationName",
          address,
          neighborhood,
          city,
          state,
          latitude,
          longitude,
          "avatarUrl",
          "coverImageUrl",
          description,
          "openingHours",
          "publicNotes",
          phone,
          "publicProfileState",
          "acceptedCategories",
          ${distanceExpr} AS "distanceKm"
        FROM users
        WHERE
          role IN ('COLLECTION_POINT', 'NGO')
          AND "publicProfileState" IN ('ACTIVE', 'VERIFIED')
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND ${distanceExpr} <= ${query.radius}
          ${query.cursor ? `AND id > '${query.cursor}'` : ''}
        ORDER BY "distanceKm" ASC
        LIMIT ${query.limit}
      `);

      const filtered = query.category
        ? points.filter((point) => point.acceptedCategories?.includes(query.category!))
        : points;

      const nextCursor =
        filtered.length === query.limit ? filtered[filtered.length - 1].id : null;

      return reply.send({
        data: filtered.map((point) => ({
          ...point,
          distanceKm: Math.round(point.distanceKm * 10) / 10,
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
          message: 'Parametros invalidos',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const point = await fastify.prisma.user.findFirst({
        where: {
          id,
          role: { in: [UserRole.COLLECTION_POINT, UserRole.NGO] },
          publicProfileState: {
            in: [PublicProfileState.ACTIVE, PublicProfileState.VERIFIED],
          },
        },
        select: publicProfileSelect,
      });

      if (!point) {
        throw new NotFoundError('Ponto de coleta');
      }

      return reply.send(mapPublicProfile(point));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });
}
