import {
  OperationalPartnershipStatus,
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
import { geocodeAddress } from '../../shared/geocoding';
import { createAdminNotifications } from '../../shared/notifications';
import {
  buildOpeningHoursSummary,
  getOperationalProfileChecklist,
  getOperationalProfileState,
  normalizeOpeningSchedule,
  profileWriteSchema,
  sanitizeProfileWriteInput,
  type OpeningScheduleEntry,
  type ProfileWriteInput,
} from './profile-shared';

const editableProfileSelect = {
  id: true,
  role: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  emailNotificationsEnabled: true,
  birthDate: true,
  phone: true,
  avatarUrl: true,
  coverImageUrl: true,
  galleryImageUrls: true,
  organizationName: true,
  description: true,
  purpose: true,
  address: true,
  addressNumber: true,
  addressComplement: true,
  neighborhood: true,
  zipCode: true,
  city: true,
  state: true,
  latitude: true,
  longitude: true,
  openingHours: true,
  openingSchedule: true,
  openingHoursExceptions: true,
  publicNotes: true,
  operationalNotes: true,
  accessibilityDetails: true,
  accessibilityFeatures: true,
  verificationNotes: true,
  estimatedCapacity: true,
  serviceRegions: true,
  rules: true,
  nonAcceptedItems: true,
  acceptedCategories: true,
  donationInterestCategories: true,
  publicProfileState: true,
  verifiedAt: true,
  pendingPublicRevision: true,
  pendingPublicRevisionStatus: true,
  pendingPublicRevisionFields: true,
  pendingPublicRevisionSubmittedAt: true,
  pendingPublicRevisionReviewedAt: true,
  pendingPublicRevisionReviewNotes: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      donations: true,
      collectedAt: true,
      receivedAt: true,
    },
  },
  outgoingOperationalPartnerships: {
    where: {
      status: OperationalPartnershipStatus.ACTIVE,
      isActive: true,
    },
    select: {
      id: true,
    },
  },
  incomingOperationalPartnerships: {
    where: {
      status: OperationalPartnershipStatus.ACTIVE,
      isActive: true,
    },
    select: {
      id: true,
    },
  },
} satisfies Prisma.UserSelect;

const emailPreferencesSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
});

type EditableProfileRecord = Prisma.UserGetPayload<{ select: typeof editableProfileSelect }>;

type PendingPublicRevisionPayload = {
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
  openingSchedule?: OpeningScheduleEntry[];
  openingHoursExceptions?: string | null;
  publicNotes?: string | null;
  accessibilityDetails?: string | null;
  accessibilityFeatures?: string[];
  rules?: string[];
};

type EditableProfileView = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  emailNotificationsEnabled: boolean;
  birthDate: Date | null;
  phone: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  galleryImageUrls: string[];
  organizationName: string | null;
  description: string | null;
  purpose: string | null;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  zipCode: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  openingSchedule: OpeningScheduleEntry[];
  openingHoursExceptions: string | null;
  publicNotes: string | null;
  operationalNotes: string | null;
  accessibilityDetails: string | null;
  accessibilityFeatures: string[];
  verificationNotes: string | null;
  estimatedCapacity: string | null;
  serviceRegions: string[];
  rules: string[];
  nonAcceptedItems: string[];
  acceptedCategories: EditableProfileRecord['acceptedCategories'];
  donationInterestCategories: EditableProfileRecord['donationInterestCategories'];
  publicProfileState: PublicProfileState;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: EditableProfileRecord['_count'];
  outgoingOperationalPartnerships: EditableProfileRecord['outgoingOperationalPartnerships'];
  incomingOperationalPartnerships: EditableProfileRecord['incomingOperationalPartnerships'];
  pendingPublicRevision: {
    status: PublicProfileRevisionStatus;
    fields: string[];
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    payload: PendingPublicRevisionPayload | null;
  } | null;
};

const GOVERNED_PUBLIC_FIELDS = [
  'address',
  'addressNumber',
  'addressComplement',
  'neighborhood',
  'zipCode',
  'city',
  'state',
  'latitude',
  'longitude',
  'phone',
  'avatarUrl',
  'coverImageUrl',
  'galleryImageUrls',
  'openingHours',
  'openingSchedule',
  'openingHoursExceptions',
  'rules',
  'publicNotes',
  'accessibilityDetails',
  'accessibilityFeatures',
] as const;

type GovernedField = (typeof GOVERNED_PUBLIC_FIELDS)[number];

function buildProfileStats(user: EditableProfileView) {
  if (user.role === UserRole.DONOR) {
    return {
      handledDonations: user._count.donations,
      activePartnerships: 0,
    };
  }

  if (user.role === UserRole.COLLECTION_POINT) {
    return {
      handledDonations: user._count.collectedAt,
      activePartnerships: user.outgoingOperationalPartnerships.length,
    };
  }

  if (user.role === UserRole.NGO) {
    return {
      handledDonations: user._count.receivedAt,
      activePartnerships: user.incomingOperationalPartnerships.length,
    };
  }

  return {
    handledDonations: 0,
    activePartnerships: 0,
  };
}

function normalizeAddressField(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeStringArray(value: string[] | null | undefined) {
  return [...(value ?? [])].map((entry) => entry.trim()).filter(Boolean).sort();
}

function normalizeOrderedStringArray(value: string[] | null | undefined) {
  return [...(value ?? [])].map((entry) => entry.trim()).filter(Boolean);
}

function normalizeOpeningHoursValue(value: string | null | undefined) {
  return normalizeAddressField(value);
}

function parsePendingPublicRevision(
  value: Prisma.JsonValue | null,
): PendingPublicRevisionPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as PendingPublicRevisionPayload;
}

function normalizeScheduleForComparison(
  value: OpeningScheduleEntry[] | Prisma.JsonValue | null | undefined,
) {
  if (!Array.isArray(value)) {
    return normalizeOpeningSchedule([]);
  }

  const entries: OpeningScheduleEntry[] = [];

  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return;
    }

    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.day !== 'string') {
      return;
    }

    entries.push({
      day: candidate.day as OpeningScheduleEntry['day'],
      isOpen: candidate.isOpen === true,
      open: typeof candidate.open === 'string' ? candidate.open : undefined,
      close: typeof candidate.close === 'string' ? candidate.close : undefined,
    });
  });

  return normalizeOpeningSchedule(entries);
}

function governedValuesDiffer(
  field: GovernedField,
  left: PendingPublicRevisionPayload,
  right: PendingPublicRevisionPayload,
) {
  if (field === 'rules' || field === 'accessibilityFeatures') {
    return (
      JSON.stringify(normalizeStringArray(left[field])) !==
      JSON.stringify(normalizeStringArray(right[field]))
    );
  }

  if (field === 'galleryImageUrls') {
    return (
      JSON.stringify(normalizeOrderedStringArray(left.galleryImageUrls)) !==
      JSON.stringify(normalizeOrderedStringArray(right.galleryImageUrls))
    );
  }

  if (field === 'openingSchedule') {
    return (
      JSON.stringify(normalizeScheduleForComparison(left.openingSchedule)) !==
      JSON.stringify(normalizeScheduleForComparison(right.openingSchedule))
    );
  }

  if (field === 'latitude' || field === 'longitude') {
    return (left[field] ?? null) !== (right[field] ?? null);
  }

  return normalizeAddressField(left[field] as string | null | undefined) !== normalizeAddressField(
    right[field] as string | null | undefined,
  );
}

function buildGovernedPayload(
  body: ProfileWriteInput,
  latitude: number | null,
  longitude: number | null,
  openingHours: string | undefined,
): PendingPublicRevisionPayload {
  return {
    phone: body.phone ?? null,
    avatarUrl: body.avatarUrl ?? null,
    coverImageUrl: body.coverImageUrl ?? null,
    galleryImageUrls: body.galleryImageUrls ?? [],
    address: body.address ?? null,
    addressNumber: body.addressNumber ?? null,
    addressComplement: body.addressComplement ?? null,
    neighborhood: body.neighborhood ?? null,
    zipCode: body.zipCode ?? null,
    city: body.city ?? null,
    state: body.state ?? null,
    latitude,
    longitude,
    openingHours: openingHours ?? null,
    openingSchedule: normalizeOpeningSchedule(body.openingSchedule),
    openingHoursExceptions: body.openingHoursExceptions ?? null,
    publicNotes: body.publicNotes ?? null,
    accessibilityDetails: body.accessibilityDetails ?? null,
    accessibilityFeatures: body.accessibilityFeatures ?? [],
    rules: body.rules ?? [],
  };
}

function buildPublishedGovernedPayload(user: EditableProfileRecord): PendingPublicRevisionPayload {
  return {
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    coverImageUrl: user.coverImageUrl ?? null,
    galleryImageUrls: user.galleryImageUrls ?? [],
    address: user.address ?? null,
    addressNumber: user.addressNumber ?? null,
    addressComplement: user.addressComplement ?? null,
    neighborhood: user.neighborhood ?? null,
    zipCode: user.zipCode ?? null,
    city: user.city ?? null,
    state: user.state ?? null,
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    openingHours: user.openingHours ?? null,
    openingSchedule: normalizeScheduleForComparison(user.openingSchedule),
    openingHoursExceptions: user.openingHoursExceptions ?? null,
    publicNotes: user.publicNotes ?? null,
    accessibilityDetails: user.accessibilityDetails ?? null,
    accessibilityFeatures: user.accessibilityFeatures ?? [],
    rules: user.rules ?? [],
  };
}

function buildEffectiveGovernedPayload(user: EditableProfileRecord): PendingPublicRevisionPayload {
  const published = buildPublishedGovernedPayload(user);
  const pendingPayload =
    user.pendingPublicRevisionStatus === PublicProfileRevisionStatus.PENDING
      ? parsePendingPublicRevision(user.pendingPublicRevision)
      : null;

  if (!pendingPayload) {
    return published;
  }

  return {
    ...published,
    ...pendingPayload,
  };
}

function addressValuesDiffer(
  left: PendingPublicRevisionPayload,
  right: PendingPublicRevisionPayload,
) {
  return (
    normalizeAddressField(left.address) !== normalizeAddressField(right.address) ||
    normalizeAddressField(left.addressNumber) !== normalizeAddressField(right.addressNumber) ||
    normalizeAddressField(left.addressComplement) !==
      normalizeAddressField(right.addressComplement) ||
    normalizeAddressField(left.neighborhood) !== normalizeAddressField(right.neighborhood) ||
    normalizeAddressField(left.zipCode) !== normalizeAddressField(right.zipCode) ||
    normalizeAddressField(left.city) !== normalizeAddressField(right.city) ||
    normalizeAddressField(left.state) !== normalizeAddressField(right.state)
  );
}

function getChangedGovernedFields(
  published: PendingPublicRevisionPayload,
  next: PendingPublicRevisionPayload,
) {
  return GOVERNED_PUBLIC_FIELDS.filter((field) => governedValuesDiffer(field, published, next));
}

function overlayPendingRevision(user: EditableProfileRecord): EditableProfileView {
  const pendingPayload = parsePendingPublicRevision(user.pendingPublicRevision);
  const activePendingRevision =
    pendingPayload && user.pendingPublicRevisionStatus
      ? {
          status: user.pendingPublicRevisionStatus,
          fields: user.pendingPublicRevisionFields,
          submittedAt: user.pendingPublicRevisionSubmittedAt?.toISOString() ?? null,
          reviewedAt: user.pendingPublicRevisionReviewedAt?.toISOString() ?? null,
          reviewNotes: user.pendingPublicRevisionReviewNotes ?? null,
          payload: pendingPayload,
        }
      : null;

  const effective =
    activePendingRevision &&
    activePendingRevision.status === PublicProfileRevisionStatus.PENDING
      ? activePendingRevision.payload
      : null;

  return {
    ...user,
    phone: effective?.phone ?? user.phone,
    avatarUrl: effective?.avatarUrl ?? user.avatarUrl,
    coverImageUrl: effective?.coverImageUrl ?? user.coverImageUrl,
    galleryImageUrls: effective?.galleryImageUrls ?? user.galleryImageUrls ?? [],
    address: effective?.address ?? user.address,
    addressNumber: effective?.addressNumber ?? user.addressNumber,
    addressComplement: effective?.addressComplement ?? user.addressComplement,
    neighborhood: effective?.neighborhood ?? user.neighborhood,
    zipCode: effective?.zipCode ?? user.zipCode,
    city: effective?.city ?? user.city,
    state: effective?.state ?? user.state,
    latitude: effective?.latitude ?? user.latitude,
    longitude: effective?.longitude ?? user.longitude,
    openingHours: effective?.openingHours ?? user.openingHours,
    openingSchedule: normalizeScheduleForComparison(
      effective?.openingSchedule ?? user.openingSchedule,
    ),
    openingHoursExceptions:
      effective?.openingHoursExceptions ?? user.openingHoursExceptions ?? null,
    publicNotes: effective?.publicNotes ?? user.publicNotes,
    accessibilityDetails:
      effective?.accessibilityDetails ?? user.accessibilityDetails,
    accessibilityFeatures:
      effective?.accessibilityFeatures ?? user.accessibilityFeatures ?? [],
    rules: effective?.rules ?? user.rules ?? [],
    pendingPublicRevision: activePendingRevision,
  };
}

function mapEditableProfile(user: EditableProfileRecord) {
  const view = overlayPendingRevision(user);
  const checklist = getOperationalProfileChecklist(view.role, {
    birthDate: view.birthDate?.toISOString().slice(0, 10) ?? undefined,
    organizationName: view.organizationName ?? undefined,
    description: view.description ?? undefined,
    purpose: view.purpose ?? undefined,
    address: view.address ?? undefined,
    addressNumber: view.addressNumber ?? undefined,
    addressComplement: view.addressComplement ?? undefined,
    city: view.city ?? undefined,
    state: view.state ?? undefined,
    zipCode: view.zipCode ?? undefined,
    neighborhood: view.neighborhood ?? undefined,
    openingHours: view.openingHours ?? undefined,
    openingSchedule: view.openingSchedule,
    phone: view.phone ?? undefined,
    acceptedCategories: view.acceptedCategories,
    donationInterestCategories: view.donationInterestCategories,
    serviceRegions: view.serviceRegions,
    latitude: view.latitude ?? undefined,
    longitude: view.longitude ?? undefined,
  });

  return {
    id: view.id,
    role: view.role,
    name: view.name,
    email: view.email,
    emailVerifiedAt: view.emailVerifiedAt?.toISOString() ?? null,
    emailNotificationsEnabled: view.emailNotificationsEnabled,
    birthDate: view.birthDate?.toISOString().slice(0, 10) ?? null,
    phone: view.phone,
    avatarUrl: view.avatarUrl,
    coverImageUrl: view.coverImageUrl,
    galleryImageUrls: view.galleryImageUrls,
    publishedPublicProfile: {
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      galleryImageUrls: user.galleryImageUrls ?? [],
    },
    organizationName: view.organizationName,
    description: view.description,
    purpose: view.purpose,
    address: view.address,
    addressNumber: view.addressNumber,
    addressComplement: view.addressComplement,
    neighborhood: view.neighborhood,
    zipCode: view.zipCode,
    city: view.city,
    state: view.state,
    latitude: view.latitude,
    longitude: view.longitude,
    openingHours: view.openingHours,
    openingSchedule: view.openingSchedule,
    openingHoursExceptions: view.openingHoursExceptions,
    publicNotes: view.publicNotes,
    operationalNotes: view.operationalNotes,
    accessibilityDetails: view.accessibilityDetails,
    accessibilityFeatures: view.accessibilityFeatures,
    verificationNotes: view.verificationNotes,
    estimatedCapacity: view.estimatedCapacity,
    serviceRegions: view.serviceRegions,
    rules: view.rules,
    nonAcceptedItems: view.nonAcceptedItems,
    acceptedCategories: view.acceptedCategories,
    donationInterestCategories: view.donationInterestCategories,
    publicProfileState: view.publicProfileState,
    verifiedAt: view.verifiedAt?.toISOString() ?? null,
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
    pendingPublicRevision: view.pendingPublicRevision,
    profileCompletion: {
      completedItems: checklist.filter((entry) => entry.complete).length,
      totalItems: checklist.length,
      missingFields: checklist.filter((entry) => !entry.complete).map((entry) => entry.label),
    },
    stats: buildProfileStats(view),
  };
}

function shouldGovernPublicChanges(user: EditableProfileRecord) {
  return (
    (user.role === UserRole.COLLECTION_POINT || user.role === UserRole.NGO) &&
    (user.publicProfileState === PublicProfileState.ACTIVE ||
      user.publicProfileState === PublicProfileState.VERIFIED)
  );
}

function parseBirthDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function publicUserSummary(user: {
  id: string;
  role: UserRole;
  name: string;
  organizationName: string | null;
}) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    organizationName: user.organizationName,
  };
}

const SAFE_NOTIFICATION_PAYLOAD_KEYS = new Set([
  'donationId',
  'donationCode',
  'donationStatus',
  'status',
  'points',
  'badgeId',
  'badgeName',
  'partnershipId',
  'pickupRequestId',
  'publicProfileState',
  'role',
]);

const SENSITIVE_NOTIFICATION_PAYLOAD_KEY_PARTS = [
  'token',
  'secret',
  'password',
  'hash',
  'authorization',
  'auth',
  'credential',
  'emailverification',
  'passwordreset',
  'accountdeletion',
  'twofactor',
  'recovery',
];

function normalizePayloadKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isSimpleObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isSafeNotificationPayloadValue(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function sanitizeNotificationPayload(payload: Prisma.JsonValue | null) {
  if (!isSimpleObject(payload)) {
    return null;
  }

  const safePayload: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(payload)) {
    const normalizedKey = normalizePayloadKey(key);
    const hasSensitiveName = SENSITIVE_NOTIFICATION_PAYLOAD_KEY_PARTS.some((part) =>
      normalizedKey.includes(part),
    );

    if (
      hasSensitiveName ||
      !SAFE_NOTIFICATION_PAYLOAD_KEYS.has(key) ||
      !isSafeNotificationPayloadValue(value)
    ) {
      continue;
    }

    safePayload[key] = value;
  }

  return Object.keys(safePayload).length > 0 ? safePayload : null;
}

export default async function profileRoutes(fastify: FastifyInstance) {
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
        select: editableProfileSelect,
      });

      if (!user) {
        throw new NotFoundError('Perfil');
      }

      return reply.send(mapEditableProfile(user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.get('/me/export', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const [user, donations, notifications] = await Promise.all([
        fastify.prisma.user.findUnique({
          where: { id: request.user.id },
          select: {
            id: true,
            role: true,
            name: true,
            email: true,
            emailVerifiedAt: true,
            emailNotificationsEnabled: true,
            birthDate: true,
            phone: true,
            cpf: true,
            cnpj: true,
            avatarUrl: true,
            coverImageUrl: true,
            galleryImageUrls: true,
            organizationName: true,
            description: true,
            purpose: true,
            address: true,
            addressNumber: true,
            addressComplement: true,
            neighborhood: true,
            zipCode: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
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
            donationInterestCategories: true,
            publicProfileState: true,
            verifiedAt: true,
            pendingPublicRevisionStatus: true,
            pendingPublicRevisionFields: true,
            pendingPublicRevisionSubmittedAt: true,
            createdAt: true,
            updatedAt: true,
            anonymizedAt: true,
          },
        }),
        fastify.prisma.donation.findMany({
          where: {
            OR: [
              { donorId: request.user.id },
              { collectionPointId: request.user.id },
              { ngoId: request.user.id },
            ],
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            code: true,
            status: true,
            notes: true,
            scheduledAt: true,
            createdAt: true,
            updatedAt: true,
            donorId: true,
            collectionPointId: true,
            ngoId: true,
            donor: {
              select: {
                id: true,
                role: true,
                name: true,
                organizationName: true,
              },
            },
            collectionPoint: {
              select: {
                id: true,
                role: true,
                name: true,
                organizationName: true,
              },
            },
            ngo: {
              select: {
                id: true,
                role: true,
                name: true,
                organizationName: true,
              },
            },
            items: {
              select: {
                id: true,
                name: true,
                category: true,
                quantity: true,
                description: true,
                imageUrl: true,
                weightKg: true,
              },
            },
            timeline: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                status: true,
                description: true,
                location: true,
                createdAt: true,
              },
            },
            operationalBatchItem: {
              select: {
                batch: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        }),
        fastify.prisma.notification.findMany({
          where: { userId: request.user.id },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            href: true,
            payload: true,
            readAt: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      if (!user) {
        throw new NotFoundError('Perfil');
      }

      const payload = {
        metadata: {
          app: 'VestGO',
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          userId: user.id,
        },
        profile: user,
        preferences: {
          emailNotificationsEnabled: user.emailNotificationsEnabled,
        },
        donations: donations.map((donation) => ({
          id: donation.id,
          code: donation.code,
          status: donation.status,
          notes: donation.notes,
          scheduledAt: donation.scheduledAt,
          createdAt: donation.createdAt,
          updatedAt: donation.updatedAt,
          involvement: {
            isDonor: donation.donorId === user.id,
            isCollectionPoint: donation.collectionPointId === user.id,
            isNgo: donation.ngoId === user.id,
          },
          donor: publicUserSummary(donation.donor),
          collectionPoint: donation.collectionPoint
            ? publicUserSummary(donation.collectionPoint)
            : null,
          ngo: donation.ngo ? publicUserSummary(donation.ngo) : null,
          items: donation.items,
          timeline: donation.timeline,
          operationalBatch: donation.operationalBatchItem?.batch ?? null,
        })),
        notifications: notifications.map((notification) => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          href: notification.href,
          payload: sanitizeNotificationPayload(notification.payload),
          readAt: notification.readAt,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
        })),
      };

      const filename = `vestgo-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      return reply
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .type('application/json; charset=utf-8')
        .send(payload);
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.patch('/me/email-preferences', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const body = emailPreferencesSchema.parse(request.body);
      const updatedUser = await fastify.prisma.user.update({
        where: { id: request.user.id },
        data: {
          emailNotificationsEnabled: body.emailNotificationsEnabled,
        },
        select: editableProfileSelect,
      });

      return reply.send(mapEditableProfile(updatedUser));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Preferências de e-mail inválidas',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.patch('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const body = sanitizeProfileWriteInput(profileWriteSchema.parse(request.body));
      const existingUser = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
        select: editableProfileSelect,
      });

      if (!existingUser) {
        throw new NotFoundError('Perfil');
      }

      if (body.email !== existingUser.email) {
        const duplicateEmail = await fastify.prisma.user.findUnique({
          where: { email: body.email },
          select: { id: true },
        });

        if (duplicateEmail && duplicateEmail.id !== existingUser.id) {
          throw new ConflictError('Este e-mail ja esta em uso');
        }
      }

      const nextOpeningHours =
        buildOpeningHoursSummary(body.openingSchedule, body.openingHoursExceptions) ??
        body.openingHours;

      const publishedGovernedPayload = buildPublishedGovernedPayload(existingUser);
      const effectiveGovernedPayload = buildEffectiveGovernedPayload(existingUser);
      const nextGovernedCandidate = buildGovernedPayload(
        body,
        effectiveGovernedPayload.latitude ?? null,
        effectiveGovernedPayload.longitude ?? null,
        nextOpeningHours,
      );
      const addressChanged = addressValuesDiffer(
        effectiveGovernedPayload,
        nextGovernedCandidate,
      );

      let resolvedLatitude = effectiveGovernedPayload.latitude;
      let resolvedLongitude = effectiveGovernedPayload.longitude;

      if (
        (existingUser.role === UserRole.COLLECTION_POINT || existingUser.role === UserRole.NGO) &&
        (addressChanged || resolvedLatitude == null || resolvedLongitude == null)
      ) {
        const geocoding = await geocodeAddress(body);

        if (geocoding.status === 'resolved') {
          resolvedLatitude = geocoding.result.latitude;
          resolvedLongitude = geocoding.result.longitude;
        } else if (geocoding.status === 'not_found') {
          fastify.log.warn(
            {
              userId: existingUser.id,
              role: existingUser.role,
              attempts: geocoding.attempts,
            },
            'Geocoding não encontrou resultado para o endereço informado.',
          );

          throw new AppError(
            'Não foi possível localizar o endereço informado. Confira rua, número, cidade e CEP antes de tentar novamente.',
            422,
            'GEOCODING_NOT_FOUND',
          );
        } else if (geocoding.status === 'unavailable') {
          fastify.log.warn(
            {
              userId: existingUser.id,
              role: existingUser.role,
              attempts: geocoding.attempts,
            },
            'Geocoding indisponivel ao salvar perfil operacional.',
          );

          throw new AppError(geocoding.message, 503, 'GEOCODING_UNAVAILABLE');
        } else if (addressChanged) {
          resolvedLatitude = null;
          resolvedLongitude = null;
        }
      }

      const nextGovernedPayload = buildGovernedPayload(
        body,
        resolvedLatitude ?? null,
        resolvedLongitude ?? null,
        nextOpeningHours,
      );

      const changedGovernedFields = getChangedGovernedFields(
        publishedGovernedPayload,
        nextGovernedPayload,
      );
      const storeAsPendingRevision = shouldGovernPublicChanges(existingUser);

      const directUpdateData: Prisma.UserUpdateInput = {
        name: body.name,
        email: body.email,
        birthDate: parseBirthDate(body.birthDate),
        organizationName: body.organizationName,
        description: body.description,
        purpose: body.purpose,
        operationalNotes: body.operationalNotes,
        estimatedCapacity: body.estimatedCapacity,
        acceptedCategories: body.acceptedCategories,
        donationInterestCategories: body.donationInterestCategories,
        nonAcceptedItems: body.nonAcceptedItems,
        serviceRegions: body.serviceRegions,
      };
      let nextDirectPublicProfileState: PublicProfileState | null = null;

      if (!storeAsPendingRevision) {
        Object.assign(directUpdateData, {
          phone: nextGovernedPayload.phone,
          avatarUrl: nextGovernedPayload.avatarUrl,
          coverImageUrl: nextGovernedPayload.coverImageUrl,
          galleryImageUrls: nextGovernedPayload.galleryImageUrls,
          address: nextGovernedPayload.address,
          addressNumber: nextGovernedPayload.addressNumber,
          addressComplement: nextGovernedPayload.addressComplement,
          neighborhood: nextGovernedPayload.neighborhood,
          zipCode: nextGovernedPayload.zipCode,
          city: nextGovernedPayload.city,
          state: nextGovernedPayload.state,
          latitude: nextGovernedPayload.latitude,
          longitude: nextGovernedPayload.longitude,
          openingHours: nextGovernedPayload.openingHours,
          openingSchedule: nextGovernedPayload.openingSchedule as unknown as Prisma.InputJsonValue,
          openingHoursExceptions: nextGovernedPayload.openingHoursExceptions,
          publicNotes: nextGovernedPayload.publicNotes,
          accessibilityDetails: nextGovernedPayload.accessibilityDetails,
          accessibilityFeatures: nextGovernedPayload.accessibilityFeatures,
          rules: nextGovernedPayload.rules,
        });

        if (existingUser.role === UserRole.COLLECTION_POINT || existingUser.role === UserRole.NGO) {
          nextDirectPublicProfileState = getOperationalProfileState(
            existingUser.role,
            {
              ...body,
              openingHours: nextOpeningHours,
              latitude: resolvedLatitude ?? undefined,
              longitude: resolvedLongitude ?? undefined,
            },
            existingUser.publicProfileState,
          );
          directUpdateData.publicProfileState = nextDirectPublicProfileState;
        }
      } else {
        if (changedGovernedFields.length > 0) {
          Object.assign(directUpdateData, {
            pendingPublicRevision: nextGovernedPayload as unknown as Prisma.InputJsonValue,
            pendingPublicRevisionStatus: PublicProfileRevisionStatus.PENDING,
            pendingPublicRevisionFields: changedGovernedFields,
            pendingPublicRevisionSubmittedAt: new Date(),
            pendingPublicRevisionReviewedAt: null,
            pendingPublicRevisionReviewNotes: null,
          });
        } else {
          Object.assign(directUpdateData, {
            pendingPublicRevision: Prisma.JsonNull,
            pendingPublicRevisionStatus: null,
            pendingPublicRevisionFields: [],
            pendingPublicRevisionSubmittedAt: null,
            pendingPublicRevisionReviewedAt: null,
            pendingPublicRevisionReviewNotes: null,
          });
        }
      }

      const updatedUser = await fastify.prisma.user.update({
        where: { id: existingUser.id },
        data: directUpdateData,
        select: editableProfileSelect,
      });

      if (
        !storeAsPendingRevision &&
        (existingUser.role === UserRole.COLLECTION_POINT || existingUser.role === UserRole.NGO) &&
        nextDirectPublicProfileState === PublicProfileState.PENDING &&
        existingUser.publicProfileState !== PublicProfileState.PENDING
      ) {
        await createAdminNotifications(fastify, [
          {
            type: 'PROFILE_APPROVAL_REQUIRED' as const,
            title: 'Novo perfil aguardando aprovacao',
            body: `${updatedUser.organizationName ?? updatedUser.name} concluiu o cadastro inicial e aguarda aprovacao administrativa.`,
            href: '/admin/perfis',
            payload: {
              userId: updatedUser.id,
              role: updatedUser.role,
              publicProfileState: updatedUser.publicProfileState,
            },
          },
        ]);
      }

      if (
        storeAsPendingRevision &&
        changedGovernedFields.length > 0 &&
        existingUser.pendingPublicRevisionStatus !== PublicProfileRevisionStatus.PENDING
      ) {
        await createAdminNotifications(fastify, [
          {
            type: 'PROFILE_REVISION_PENDING' as const,
            title: 'Revisão pública pendente',
            body: `${updatedUser.organizationName ?? updatedUser.name} enviou alterações públicas para revisão (${changedGovernedFields.join(', ')}).`,
            href: '/admin/perfis',
            payload: {
              userId: updatedUser.id,
              role: updatedUser.role,
              fields: changedGovernedFields,
            },
          },
        ]);
      }

      return reply.send(mapEditableProfile(updatedUser));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para atualizar o perfil',
          issues: err.errors,
        });
      }

      throw err;
    }
  });
}
