import {
  Prisma,
  PublicProfileRevisionStatus,
  PublicProfileState,
  UserRole,
} from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AppError,
  ConflictError,
  NotFoundError,
  toErrorResponse,
} from '../../shared/errors';
import {
  getOperationalProfileState,
  normalizeOpeningSchedule,
  type OpeningScheduleEntry,
} from '../profiles/profile-shared';

const adminProfilesQuerySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(PublicProfileState).optional(),
  revisionStatus: z.nativeEnum(PublicProfileRevisionStatus).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

const profileStatusUpdateSchema = z.object({
  status: z.nativeEnum(PublicProfileState),
});

const profileRevisionDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reviewNotes: z.string().trim().max(600).optional(),
});

const adminProfileSelect = {
  id: true,
  role: true,
  name: true,
  email: true,
  phone: true,
  organizationName: true,
  description: true,
  purpose: true,
  city: true,
  state: true,
  latitude: true,
  longitude: true,
  address: true,
  addressNumber: true,
  addressComplement: true,
  neighborhood: true,
  zipCode: true,
  acceptedCategories: true,
  donationInterestCategories: true,
  estimatedCapacity: true,
  serviceRegions: true,
  nonAcceptedItems: true,
  publicProfileState: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
  avatarUrl: true,
  coverImageUrl: true,
  galleryImageUrls: true,
  openingHours: true,
  openingSchedule: true,
  openingHoursExceptions: true,
  rules: true,
  publicNotes: true,
  accessibilityDetails: true,
  accessibilityFeatures: true,
  pendingPublicRevision: true,
  pendingPublicRevisionStatus: true,
  pendingPublicRevisionFields: true,
  pendingPublicRevisionSubmittedAt: true,
  pendingPublicRevisionReviewedAt: true,
  pendingPublicRevisionReviewNotes: true,
} satisfies Prisma.UserSelect;

type AdminProfileRecord = Prisma.UserGetPayload<{ select: typeof adminProfileSelect }>;

type PendingPublicRevisionPayload = {
  organizationName?: string | null;
  description?: string | null;
  purpose?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  galleryImageUrls?: string[];
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  neighborhood?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: string | null;
  openingSchedule?: unknown;
  openingHoursExceptions?: string | null;
  publicNotes?: string | null;
  accessibilityDetails?: string | null;
  accessibilityFeatures?: string[];
  estimatedCapacity?: string | null;
  acceptedCategories?: string[];
  nonAcceptedItems?: string[];
  rules?: string[];
  serviceRegions?: string[];
};

function parsePendingRevisionPayload(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as PendingPublicRevisionPayload;
}

function getPendingField<K extends keyof PendingPublicRevisionPayload>(
  payload: PendingPublicRevisionPayload,
  field: K,
  fallback: Exclude<PendingPublicRevisionPayload[K], undefined>,
) {
  const value = Object.prototype.hasOwnProperty.call(payload, field) ? payload[field] : undefined;

  return (value === undefined ? fallback : value) as Exclude<
    PendingPublicRevisionPayload[K],
    undefined
  >;
}

function buildOperationalStateInput(profile: AdminProfileRecord, overrides?: PendingPublicRevisionPayload) {
  const openingSchedule = Array.isArray(overrides?.openingSchedule)
    ? (overrides?.openingSchedule as OpeningScheduleEntry[])
    : Array.isArray(profile.openingSchedule)
      ? (profile.openingSchedule as OpeningScheduleEntry[])
      : [];

  return {
    organizationName:
      (overrides ? getPendingField(overrides, 'organizationName', profile.organizationName) : profile.organizationName) ??
      undefined,
    description:
      (overrides ? getPendingField(overrides, 'description', profile.description) : profile.description) ??
      undefined,
    purpose:
      (overrides ? getPendingField(overrides, 'purpose', profile.purpose) : profile.purpose) ??
      undefined,
    address:
      (overrides ? getPendingField(overrides, 'address', profile.address) : profile.address) ??
      undefined,
    addressNumber:
      (overrides ? getPendingField(overrides, 'addressNumber', profile.addressNumber) : profile.addressNumber) ??
      undefined,
    addressComplement:
      (overrides
        ? getPendingField(overrides, 'addressComplement', profile.addressComplement)
        : profile.addressComplement) ?? undefined,
    city: (overrides ? getPendingField(overrides, 'city', profile.city) : profile.city) ?? undefined,
    state: (overrides ? getPendingField(overrides, 'state', profile.state) : profile.state) ?? undefined,
    zipCode:
      (overrides ? getPendingField(overrides, 'zipCode', profile.zipCode) : profile.zipCode) ??
      undefined,
    neighborhood:
      (overrides ? getPendingField(overrides, 'neighborhood', profile.neighborhood) : profile.neighborhood) ??
      undefined,
    openingHours:
      (overrides ? getPendingField(overrides, 'openingHours', profile.openingHours) : profile.openingHours) ??
      undefined,
    openingSchedule: normalizeOpeningSchedule(openingSchedule),
    phone: (overrides ? getPendingField(overrides, 'phone', profile.phone) : profile.phone) ?? undefined,
    acceptedCategories:
      ((overrides
        ? getPendingField(overrides, 'acceptedCategories', profile.acceptedCategories)
        : profile.acceptedCategories) as AdminProfileRecord['acceptedCategories']) ?? [],
    donationInterestCategories: profile.donationInterestCategories ?? [],
    serviceRegions:
      (overrides ? getPendingField(overrides, 'serviceRegions', profile.serviceRegions) : profile.serviceRegions) ??
      [],
    latitude:
      (overrides ? getPendingField(overrides, 'latitude', profile.latitude) : profile.latitude) ??
      undefined,
    longitude:
      (overrides ? getPendingField(overrides, 'longitude', profile.longitude) : profile.longitude) ??
      undefined,
  };
}

function ensureProfileCanBePublished(
  profile: AdminProfileRecord,
  targetStatus: PublicProfileState,
) {
  if (targetStatus !== PublicProfileState.ACTIVE && targetStatus !== PublicProfileState.VERIFIED) {
    return;
  }

  const derivedState = getOperationalProfileState(
    profile.role,
    buildOperationalStateInput(profile),
    profile.publicProfileState,
  );

  if (derivedState === PublicProfileState.DRAFT || derivedState === PublicProfileState.PENDING) {
    throw new ConflictError(
      'O perfil ainda nao cumpre o checklist minimo para publicacao. Revise endereco, categorias e geolocalizacao antes de ativar ou verificar.',
    );
  }
}

function mapAdminProfile(profile: AdminProfileRecord) {
  return {
    id: profile.id,
    role: profile.role,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    organizationName: profile.organizationName,
    description: profile.description,
    avatarUrl: profile.avatarUrl,
    coverImageUrl: profile.coverImageUrl,
    galleryImageUrls: profile.galleryImageUrls,
    city: profile.city,
    state: profile.state,
    address: profile.address,
    addressNumber: profile.addressNumber,
    addressComplement: profile.addressComplement,
    neighborhood: profile.neighborhood,
    zipCode: profile.zipCode,
    acceptedCategories: profile.acceptedCategories,
    estimatedCapacity: profile.estimatedCapacity,
    nonAcceptedItems: profile.nonAcceptedItems,
    serviceRegions: profile.serviceRegions,
    publicProfileState: profile.publicProfileState,
    verifiedAt: profile.verifiedAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    pendingPublicRevision: profile.pendingPublicRevisionStatus
      ? {
          status: profile.pendingPublicRevisionStatus,
          fields: profile.pendingPublicRevisionFields,
          submittedAt: profile.pendingPublicRevisionSubmittedAt?.toISOString() ?? null,
          reviewedAt: profile.pendingPublicRevisionReviewedAt?.toISOString() ?? null,
          reviewNotes: profile.pendingPublicRevisionReviewNotes ?? null,
          payload: parsePendingRevisionPayload(profile.pendingPublicRevision),
        }
      : null,
  };
}

export default async function adminProfileRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await fastify.authenticate(request, reply);
      if (request.user.role !== UserRole.ADMIN) {
        return reply
          .code(403)
          .send({ error: 'FORBIDDEN', message: 'Acesso negado: Requer perfil de administrador.' });
      }
    } catch {
      if (!reply.sent) {
        reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Nao autenticado.' });
      }
    }
  });

  fastify.get('/', async (request, reply) => {
    try {
      const query = adminProfilesQuerySchema.parse(request.query);

      const where: Prisma.UserWhereInput = {
        role: query.role ? query.role : { in: [UserRole.COLLECTION_POINT, UserRole.NGO] },
        publicProfileState: query.status,
        pendingPublicRevisionStatus: query.revisionStatus,
      };

      const profiles = await fastify.prisma.user.findMany({
        where,
        take: query.limit,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        orderBy: [
          { pendingPublicRevisionSubmittedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        select: adminProfileSelect,
      });

      const nextCursor = profiles.length === query.limit ? profiles[profiles.length - 1].id : null;
      const count = await fastify.prisma.user.count({ where });

      return reply.send({
        data: profiles.map(mapAdminProfile),
        meta: {
          count,
          nextCursor,
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

  fastify.patch('/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = profileStatusUpdateSchema.parse(request.body);

      const profile = await fastify.prisma.user.findFirst({
        where: { id, role: { in: [UserRole.COLLECTION_POINT, UserRole.NGO] } },
        select: adminProfileSelect,
      });

      if (!profile) {
        throw new NotFoundError('Perfil operacional');
      }

      const verifiedAt =
        status === PublicProfileState.VERIFIED
          ? new Date()
          : status === PublicProfileState.DRAFT || status === PublicProfileState.PENDING
            ? null
            : profile.verifiedAt;

      const updated = await fastify.prisma.user.update({
        where: { id },
        data: {
          publicProfileState: status,
          verifiedAt,
        },
        select: adminProfileSelect,
      });

      return reply.send(mapAdminProfile(updated));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos',
          issues: err.errors,
        });
      }
      throw err;
    }
  });

  fastify.patch('/:id/revision', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = profileRevisionDecisionSchema.parse(request.body);
      const profile = await fastify.prisma.user.findFirst({
        where: {
          id,
          role: { in: [UserRole.COLLECTION_POINT, UserRole.NGO] },
        },
        select: adminProfileSelect,
      });

      if (!profile) {
        throw new NotFoundError('Perfil operacional');
      }

      if (profile.pendingPublicRevisionStatus !== PublicProfileRevisionStatus.PENDING) {
        throw new ConflictError('Este perfil nao possui revisao pendente para avaliar');
      }

      const pendingPayload = parsePendingRevisionPayload(profile.pendingPublicRevision);

      if (!pendingPayload) {
        throw new ConflictError('Os dados da revisao pendente estao invalidos');
      }

      if (body.action === 'REJECT') {
        const rejected = await fastify.prisma.user.update({
          where: { id: profile.id },
          data: {
            pendingPublicRevisionStatus: PublicProfileRevisionStatus.REJECTED,
            pendingPublicRevisionReviewedAt: new Date(),
            pendingPublicRevisionReviewNotes: body.reviewNotes ?? null,
          },
          select: adminProfileSelect,
        });

        return reply.send(mapAdminProfile(rejected));
      }

      const mergedProfileState = getOperationalProfileState(
        profile.role,
        buildOperationalStateInput(profile, pendingPayload),
        profile.publicProfileState,
      );

      const verifiedAt =
        mergedProfileState === PublicProfileState.VERIFIED
          ? profile.verifiedAt ?? new Date()
          : mergedProfileState === PublicProfileState.DRAFT ||
              mergedProfileState === PublicProfileState.PENDING
            ? null
            : profile.verifiedAt;

      const approved = await fastify.prisma.user.update({
        where: { id: profile.id },
        data: {
          organizationName: getPendingField(pendingPayload, 'organizationName', profile.organizationName),
          description: getPendingField(pendingPayload, 'description', profile.description),
          purpose: getPendingField(pendingPayload, 'purpose', profile.purpose),
          phone: getPendingField(pendingPayload, 'phone', profile.phone),
          avatarUrl: getPendingField(pendingPayload, 'avatarUrl', profile.avatarUrl),
          coverImageUrl: getPendingField(pendingPayload, 'coverImageUrl', profile.coverImageUrl),
          galleryImageUrls:
            getPendingField(pendingPayload, 'galleryImageUrls', profile.galleryImageUrls) ?? [],
          address: getPendingField(pendingPayload, 'address', profile.address),
          addressNumber: getPendingField(pendingPayload, 'addressNumber', profile.addressNumber),
          addressComplement: getPendingField(
            pendingPayload,
            'addressComplement',
            profile.addressComplement,
          ),
          neighborhood: getPendingField(pendingPayload, 'neighborhood', profile.neighborhood),
          zipCode: getPendingField(pendingPayload, 'zipCode', profile.zipCode),
          city: getPendingField(pendingPayload, 'city', profile.city),
          state: getPendingField(pendingPayload, 'state', profile.state),
          latitude: getPendingField(pendingPayload, 'latitude', profile.latitude),
          longitude: getPendingField(pendingPayload, 'longitude', profile.longitude),
          openingHours: getPendingField(pendingPayload, 'openingHours', profile.openingHours),
          openingSchedule:
            normalizeOpeningSchedule(
              Array.isArray(getPendingField(pendingPayload, 'openingSchedule', profile.openingSchedule as unknown as OpeningScheduleEntry[]))
                ? (getPendingField(
                    pendingPayload,
                    'openingSchedule',
                    profile.openingSchedule as unknown as OpeningScheduleEntry[],
                  ) as OpeningScheduleEntry[])
                : [],
            ) as unknown as Prisma.InputJsonValue,
          openingHoursExceptions: getPendingField(
            pendingPayload,
            'openingHoursExceptions',
            profile.openingHoursExceptions,
          ),
          publicNotes: getPendingField(pendingPayload, 'publicNotes', profile.publicNotes),
          accessibilityDetails: getPendingField(
            pendingPayload,
            'accessibilityDetails',
            profile.accessibilityDetails,
          ),
          accessibilityFeatures:
            getPendingField(pendingPayload, 'accessibilityFeatures', profile.accessibilityFeatures) ?? [],
          estimatedCapacity: getPendingField(
            pendingPayload,
            'estimatedCapacity',
            profile.estimatedCapacity,
          ),
          acceptedCategories:
            (getPendingField(
              pendingPayload,
              'acceptedCategories',
              profile.acceptedCategories,
            ) as AdminProfileRecord['acceptedCategories'] | undefined) ?? [],
          nonAcceptedItems:
            getPendingField(pendingPayload, 'nonAcceptedItems', profile.nonAcceptedItems) ?? [],
          rules: getPendingField(pendingPayload, 'rules', profile.rules) ?? [],
          serviceRegions:
            getPendingField(pendingPayload, 'serviceRegions', profile.serviceRegions) ?? [],
          publicProfileState: mergedProfileState,
          verifiedAt,
          pendingPublicRevision: Prisma.JsonNull,
          pendingPublicRevisionStatus: null,
          pendingPublicRevisionFields: [],
          pendingPublicRevisionSubmittedAt: null,
          pendingPublicRevisionReviewedAt: new Date(),
          pendingPublicRevisionReviewNotes: body.reviewNotes ?? null,
        },
        select: adminProfileSelect,
      });

      return reply.send(mapAdminProfile(approved));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos',
          issues: err.errors,
        });
      }
      throw err;
    }
  });
}
