import { Prisma, UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AppError,
  ConflictError,
  NotFoundError,
  toErrorResponse,
} from '../../shared/errors';
import {
  geocodeAddress,
} from '../../shared/geocoding';
import {
  getOperationalProfileChecklist,
  getOperationalProfileState,
  profileWriteSchema,
  sanitizeProfileWriteInput,
} from './profile-shared';

const editableProfileSelect = {
  id: true,
  role: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  coverImageUrl: true,
  organizationName: true,
  description: true,
  purpose: true,
  address: true,
  neighborhood: true,
  zipCode: true,
  city: true,
  state: true,
  latitude: true,
  longitude: true,
  openingHours: true,
  publicNotes: true,
  operationalNotes: true,
  accessibilityDetails: true,
  verificationNotes: true,
  estimatedCapacity: true,
  serviceRegions: true,
  rules: true,
  nonAcceptedItems: true,
  acceptedCategories: true,
  publicProfileState: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      donations: true,
      collectedAt: true,
      receivedAt: true,
      outgoingOperationalPartnerships: true,
      incomingOperationalPartnerships: true,
    },
  },
} satisfies Prisma.UserSelect;

type EditableProfileRecord = Prisma.UserGetPayload<{ select: typeof editableProfileSelect }>;

function buildProfileStats(user: EditableProfileRecord) {
  if (user.role === UserRole.DONOR) {
    return {
      handledDonations: user._count.donations,
      activePartnerships: 0,
    };
  }

  if (user.role === UserRole.COLLECTION_POINT) {
    return {
      handledDonations: user._count.collectedAt,
      activePartnerships: user._count.outgoingOperationalPartnerships,
    };
  }

  if (user.role === UserRole.NGO) {
    return {
      handledDonations: user._count.receivedAt,
      activePartnerships: user._count.incomingOperationalPartnerships,
    };
  }

  return {
    handledDonations: 0,
    activePartnerships: 0,
  };
}

function mapEditableProfile(user: EditableProfileRecord) {
  const checklist = getOperationalProfileChecklist(user.role, {
    organizationName: user.organizationName ?? undefined,
    description: user.description ?? undefined,
    purpose: user.purpose ?? undefined,
    address: user.address ?? undefined,
    city: user.city ?? undefined,
    state: user.state ?? undefined,
    zipCode: user.zipCode ?? undefined,
    neighborhood: user.neighborhood ?? undefined,
    openingHours: user.openingHours ?? undefined,
    phone: user.phone ?? undefined,
    acceptedCategories: user.acceptedCategories,
    serviceRegions: user.serviceRegions,
    latitude: user.latitude ?? undefined,
    longitude: user.longitude ?? undefined,
  });

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    coverImageUrl: user.coverImageUrl,
    organizationName: user.organizationName,
    description: user.description,
    purpose: user.purpose,
    address: user.address,
    neighborhood: user.neighborhood,
    zipCode: user.zipCode,
    city: user.city,
    state: user.state,
    latitude: user.latitude,
    longitude: user.longitude,
    openingHours: user.openingHours,
    publicNotes: user.publicNotes,
    operationalNotes: user.operationalNotes,
    accessibilityDetails: user.accessibilityDetails,
    verificationNotes: user.verificationNotes,
    estimatedCapacity: user.estimatedCapacity,
    serviceRegions: user.serviceRegions,
    rules: user.rules,
    nonAcceptedItems: user.nonAcceptedItems,
    acceptedCategories: user.acceptedCategories,
    publicProfileState: user.publicProfileState,
    verifiedAt: user.verifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    profileCompletion: {
      completedItems: checklist.filter((entry) => entry.complete).length,
      totalItems: checklist.length,
      missingFields: checklist.filter((entry) => !entry.complete).map((entry) => entry.label),
    },
    stats: buildProfileStats(user),
  };
}

function normalizeAddressField(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
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

  fastify.patch('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const body = sanitizeProfileWriteInput(profileWriteSchema.parse(request.body));
      const existingUser = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          email: true,
          role: true,
          publicProfileState: true,
          address: true,
          neighborhood: true,
          zipCode: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
        },
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

      const addressChanged =
        normalizeAddressField(existingUser.address) !== normalizeAddressField(body.address) ||
        normalizeAddressField(existingUser.neighborhood) !==
          normalizeAddressField(body.neighborhood) ||
        normalizeAddressField(existingUser.zipCode) !== normalizeAddressField(body.zipCode) ||
        normalizeAddressField(existingUser.city) !== normalizeAddressField(body.city) ||
        normalizeAddressField(existingUser.state) !== normalizeAddressField(body.state);

      let resolvedLatitude = existingUser.latitude;
      let resolvedLongitude = existingUser.longitude;

      if (
        (existingUser.role === UserRole.COLLECTION_POINT || existingUser.role === UserRole.NGO) &&
        (addressChanged || existingUser.latitude == null || existingUser.longitude == null)
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
            'Geocoding nao encontrou resultado para o endereco informado.',
          );

          throw new AppError(
            'Nao foi possivel localizar o endereco informado. Confira rua, numero, cidade e CEP antes de tentar novamente.',
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

          throw new AppError(
            geocoding.message,
            503,
            'GEOCODING_UNAVAILABLE',
          );
        } else if (addressChanged) {
          resolvedLatitude = null;
          resolvedLongitude = null;
        }
      }

      const nextProfileState = getOperationalProfileState(existingUser.role, {
        ...body,
        latitude: resolvedLatitude ?? undefined,
        longitude: resolvedLongitude ?? undefined,
      }, existingUser.publicProfileState);

      const updatedUser = await fastify.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          organizationName: body.organizationName,
          description: body.description,
          purpose: body.purpose,
          address: body.address,
          neighborhood: body.neighborhood,
          zipCode: body.zipCode,
          city: body.city,
          state: body.state,
          latitude: resolvedLatitude,
          longitude: resolvedLongitude,
          openingHours: body.openingHours,
          publicNotes: body.publicNotes,
          operationalNotes: body.operationalNotes,
          accessibilityDetails: body.accessibilityDetails,
          estimatedCapacity: body.estimatedCapacity,
          avatarUrl: body.avatarUrl,
          coverImageUrl: body.coverImageUrl,
          acceptedCategories: body.acceptedCategories,
          nonAcceptedItems: body.nonAcceptedItems,
          rules: body.rules,
          serviceRegions: body.serviceRegions,
          publicProfileState: nextProfileState,
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
          message: 'Dados invalidos para atualizar o perfil',
          issues: err.errors,
        });
      }

      throw err;
    }
  });
}
