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
  serviceRegions: true,
  publicProfileState: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
  avatarUrl: true,
  coverImageUrl: true,
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
  phone?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
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
  rules?: string[];
};

function parsePendingRevisionPayload(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as PendingPublicRevisionPayload;
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
    city: profile.city,
    state: profile.state,
    address: profile.address,
    addressNumber: profile.addressNumber,
    addressComplement: profile.addressComplement,
    neighborhood: profile.neighborhood,
    zipCode: profile.zipCode,
    acceptedCategories: profile.acceptedCategories,
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
        {
          organizationName: profile.organizationName ?? undefined,
          description: profile.description ?? undefined,
          purpose: profile.purpose ?? undefined,
          address: pendingPayload.address ?? profile.address ?? undefined,
          addressNumber: pendingPayload.addressNumber ?? profile.addressNumber ?? undefined,
          addressComplement:
            pendingPayload.addressComplement ?? profile.addressComplement ?? undefined,
          city: pendingPayload.city ?? profile.city ?? undefined,
          state: pendingPayload.state ?? profile.state ?? undefined,
          zipCode: pendingPayload.zipCode ?? profile.zipCode ?? undefined,
          neighborhood: pendingPayload.neighborhood ?? profile.neighborhood ?? undefined,
          openingHours: pendingPayload.openingHours ?? profile.openingHours ?? undefined,
          openingSchedule: normalizeOpeningSchedule(
            Array.isArray(pendingPayload.openingSchedule)
              ? (pendingPayload.openingSchedule as OpeningScheduleEntry[])
              : Array.isArray(profile.openingSchedule)
                ? (profile.openingSchedule as OpeningScheduleEntry[])
                : [],
          ),
          phone: pendingPayload.phone ?? profile.phone ?? undefined,
          acceptedCategories: profile.acceptedCategories,
          serviceRegions: profile.serviceRegions,
          latitude: pendingPayload.latitude ?? profile.latitude ?? undefined,
          longitude: pendingPayload.longitude ?? profile.longitude ?? undefined,
        },
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
          phone: pendingPayload.phone ?? null,
          avatarUrl: pendingPayload.avatarUrl ?? null,
          coverImageUrl: pendingPayload.coverImageUrl ?? null,
          address: pendingPayload.address ?? null,
          addressNumber: pendingPayload.addressNumber ?? null,
          addressComplement: pendingPayload.addressComplement ?? null,
          neighborhood: pendingPayload.neighborhood ?? null,
          zipCode: pendingPayload.zipCode ?? null,
          city: pendingPayload.city ?? null,
          state: pendingPayload.state ?? null,
          latitude: pendingPayload.latitude ?? null,
          longitude: pendingPayload.longitude ?? null,
          openingHours: pendingPayload.openingHours ?? null,
          openingSchedule:
            normalizeOpeningSchedule(
              Array.isArray(pendingPayload.openingSchedule)
                ? (pendingPayload.openingSchedule as OpeningScheduleEntry[])
                : [],
            ) as unknown as Prisma.InputJsonValue,
          openingHoursExceptions: pendingPayload.openingHoursExceptions ?? null,
          publicNotes: pendingPayload.publicNotes ?? null,
          accessibilityDetails: pendingPayload.accessibilityDetails ?? null,
          accessibilityFeatures: pendingPayload.accessibilityFeatures ?? [],
          rules: pendingPayload.rules ?? [],
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
