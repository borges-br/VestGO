import { ItemCategory, Prisma, PublicProfileState, UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, NotFoundError, toErrorResponse } from '../../shared/errors';

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).max(100).default(10),
  category: z.nativeEnum(ItemCategory).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  search: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

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
      const hasCenter = query.lat != null || query.lng != null;

      if ((query.lat == null) !== (query.lng == null)) {
        throw new AppError(
          'Informe latitude e longitude juntas para buscar por proximidade.',
          422,
          'VALIDATION_ERROR',
        );
      }

      const points = await fastify.prisma.user.findMany({
        where: {
          role: { in: [UserRole.COLLECTION_POINT, UserRole.NGO] },
          publicProfileState: {
            in: [PublicProfileState.ACTIVE, PublicProfileState.VERIFIED],
          },
          latitude: { not: null },
          longitude: { not: null },
          ...(query.category ? { acceptedCategories: { has: query.category } } : {}),
          ...(query.search
            ? {
                OR: [
                  { organizationName: { contains: query.search, mode: 'insensitive' } },
                  { name: { contains: query.search, mode: 'insensitive' } },
                  { address: { contains: query.search, mode: 'insensitive' } },
                  { neighborhood: { contains: query.search, mode: 'insensitive' } },
                  { city: { contains: query.search, mode: 'insensitive' } },
                  { state: { contains: query.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: [
          { verifiedAt: 'desc' },
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        select: publicProfileSelect,
        take: Math.max(query.limit * 4, 80),
      });

      const withDistance = points
        .map((point) => {
          const mapped = mapPublicProfile(point);

          if (!hasCenter) {
            return {
              ...mapped,
              distanceKm: undefined,
            };
          }

          const latitude = Number(point.latitude);
          const longitude = Number(point.longitude);
          const earthRadiusKm = 6371;
          const dLat = ((query.lat! - latitude) * Math.PI) / 180;
          const dLng = ((query.lng! - longitude) * Math.PI) / 180;
          const startLat = (latitude * Math.PI) / 180;
          const endLat = (query.lat! * Math.PI) / 180;
          const haversine =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(startLat) *
              Math.cos(endLat) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const distanceKm = earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

          return {
            ...mapped,
            distanceKm,
          };
        })
        .filter((point) => !hasCenter || (point.distanceKm != null && point.distanceKm <= query.radius))
        .sort((left, right) => {
          if (!hasCenter) {
            return 0;
          }

          return (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY);
        });

      const cursor = query.cursor ?? null;
      const filtered = cursor
        ? withDistance.filter((point) => point.id > cursor)
        : withDistance;
      const paginated = filtered.slice(0, query.limit);
      const nextCursor = filtered.length > query.limit ? paginated[paginated.length - 1]?.id ?? null : null;

      return reply.send({
        data: paginated.map((point) => ({
          ...point,
          distanceKm:
            typeof point.distanceKm === 'number'
              ? Math.round(point.distanceKm * 10) / 10
              : undefined,
        })),
        meta: {
          count: paginated.length,
          nextCursor,
          radiusKm: query.radius,
          center: hasCenter ? { lat: query.lat!, lng: query.lng! } : null,
          search: query.search ?? null,
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
