import {
  ItemCategory,
  OperationalPartnershipStatus,
  Prisma,
  PublicProfileState,
  UserRole,
} from '@prisma/client';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError, NotFoundError, toErrorResponse } from '../../shared/errors';

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).max(100).default(10),
  category: z.nativeEnum(ItemCategory).optional(),
  role: z.enum(['COLLECTION_POINT', 'NGO']).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  forDonation: z.coerce.boolean().default(false),
  search: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

const detailQuerySchema = z.object({
  forDonation: z.coerce.boolean().default(false),
});

const publicPartnerSelect = {
  id: true,
  name: true,
  organizationName: true,
  avatarUrl: true,
  serviceRegions: true,
  role: true,
} satisfies Prisma.UserSelect;

const publicProfileSelect = {
  id: true,
  role: true,
  name: true,
  organizationName: true,
  address: true,
  addressNumber: true,
  addressComplement: true,
  neighborhood: true,
  zipCode: true,
  city: true,
  state: true,
  latitude: true,
  longitude: true,
  avatarUrl: true,
  coverImageUrl: true,
  galleryImageUrls: true,
  phone: true,
  description: true,
  purpose: true,
  openingHours: true,
  openingSchedule: true,
  openingHoursExceptions: true,
  publicNotes: true,
  accessibilityDetails: true,
  accessibilityFeatures: true,
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
    },
  },
  outgoingOperationalPartnerships: {
    where: {
      status: OperationalPartnershipStatus.ACTIVE,
      isActive: true,
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      ngo: { select: publicPartnerSelect },
    },
  },
  incomingOperationalPartnerships: {
    where: {
      status: OperationalPartnershipStatus.ACTIVE,
      isActive: true,
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      collectionPoint: { select: publicPartnerSelect },
    },
  },
} satisfies Prisma.UserSelect;

type PublicProfileRecord = Prisma.UserGetPayload<{ select: typeof publicProfileSelect }>;
type PublicViewer = { id: string; role: string } | null;

function canViewPreciseNgoData(viewer: PublicViewer) {
  return (
    viewer?.role === UserRole.COLLECTION_POINT ||
    viewer?.role === UserRole.NGO ||
    viewer?.role === UserRole.ADMIN
  );
}

async function resolvePublicViewer(request: FastifyRequest): Promise<PublicViewer> {
  try {
    await request.jwtVerify();
    return request.user;
  } catch {
    return null;
  }
}

function mapPublicPartner(
  partner:
    | PublicProfileRecord['outgoingOperationalPartnerships'][number]['ngo']
    | PublicProfileRecord['incomingOperationalPartnerships'][number]['collectionPoint'],
) {
  return {
    id: partner.id,
    name: partner.name,
    organizationName: partner.organizationName,
    avatarUrl: partner.avatarUrl,
    serviceRegions: partner.serviceRegions,
    role: partner.role,
  };
}

function mapPublicProfile(point: PublicProfileRecord, viewer: PublicViewer) {
  const handledDonations =
    point.role === UserRole.NGO ? point._count.receivedAt : point._count.collectedAt;
  const activePartnerships =
    point.role === UserRole.NGO
      ? point.incomingOperationalPartnerships.length
      : point.outgoingOperationalPartnerships.length;
  const hideSensitiveNgoLocation =
    point.role === UserRole.NGO && !canViewPreciseNgoData(viewer);
  const activeNgo =
    point.role === UserRole.COLLECTION_POINT
      ? point.outgoingOperationalPartnerships[0]?.ngo ?? null
      : null;
  const donationEligibility =
    point.role === UserRole.COLLECTION_POINT
      ? activeNgo
        ? {
            canDonateHere: true,
            status: 'ELIGIBLE',
            label: 'Pronto para doar',
            message: `Doacoes concluidas aqui seguem para ${activeNgo.organizationName ?? activeNgo.name}.`,
            activeNgo: mapPublicPartner(activeNgo),
          }
        : {
            canDonateHere: false,
            status: 'WAITING_NGO',
            label: 'Aguardando ONG',
            message:
              'Este ponto ainda nao possui uma ONG parceira ativa. Ele aparece no mapa, mas ainda nao pode finalizar doacoes.',
            activeNgo: null,
          }
      : null;

  return {
    id: point.id,
    role: point.role,
    name: point.name,
    organizationName: point.organizationName,
    address: hideSensitiveNgoLocation ? null : point.address,
    addressNumber: hideSensitiveNgoLocation ? null : point.addressNumber,
    addressComplement: hideSensitiveNgoLocation ? null : point.addressComplement,
    neighborhood: hideSensitiveNgoLocation ? null : point.neighborhood,
    zipCode: hideSensitiveNgoLocation ? null : point.zipCode,
    city: point.city,
    state: point.state,
    latitude: hideSensitiveNgoLocation ? null : point.latitude,
    longitude: hideSensitiveNgoLocation ? null : point.longitude,
    avatarUrl: point.avatarUrl,
    coverImageUrl: point.coverImageUrl,
    galleryImageUrls: point.galleryImageUrls,
    phone: hideSensitiveNgoLocation ? null : point.phone,
    description: point.description,
    purpose: point.purpose,
    openingHours: hideSensitiveNgoLocation ? null : point.openingHours,
    openingSchedule:
      hideSensitiveNgoLocation
        ? []
        : Array.isArray(point.openingSchedule)
          ? point.openingSchedule
          : [],
    openingHoursExceptions: hideSensitiveNgoLocation ? null : point.openingHoursExceptions,
    publicNotes: point.publicNotes,
    accessibilityDetails: point.accessibilityDetails,
    accessibilityFeatures: point.accessibilityFeatures,
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
    donationEligibility,
  };
}

export default async function collectionPointRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    try {
      const query = nearbyQuerySchema.parse(request.query);
      const viewer = await resolvePublicViewer(request);
      const canSeeNgoLocations = canViewPreciseNgoData(viewer);
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
          role: query.forDonation
            ? UserRole.COLLECTION_POINT
            : query.role ?? (canSeeNgoLocations
                ? { in: [UserRole.COLLECTION_POINT, UserRole.NGO] }
                : UserRole.COLLECTION_POINT),
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
                  { addressNumber: { contains: query.search, mode: 'insensitive' } },
                  { neighborhood: { contains: query.search, mode: 'insensitive' } },
                  { zipCode: { contains: query.search, mode: 'insensitive' } },
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
          const mapped = mapPublicProfile(point, viewer);

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
      const query = detailQuerySchema.parse(request.query);
      const viewer = await resolvePublicViewer(request);
      const point = await fastify.prisma.user.findFirst({
        where: {
          id,
          role: query.forDonation
            ? UserRole.COLLECTION_POINT
            : { in: [UserRole.COLLECTION_POINT, UserRole.NGO] },
          publicProfileState: {
            in: [PublicProfileState.ACTIVE, PublicProfileState.VERIFIED],
          },
        },
        select: publicProfileSelect,
      });

      if (!point) {
        throw new NotFoundError('Ponto de coleta');
      }

      return reply.send(mapPublicProfile(point, viewer));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });
}
