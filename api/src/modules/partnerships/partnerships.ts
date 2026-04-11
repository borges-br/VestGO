import {
  OperationalPartnershipStatus,
  Prisma,
  PublicProfileState,
  UserRole,
} from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  toErrorResponse,
} from '../../shared/errors';
import { createNotifications } from '../../shared/notifications';

const partnershipPartnerSelect = {
  id: true,
  name: true,
  organizationName: true,
  address: true,
  addressNumber: true,
  addressComplement: true,
  city: true,
  state: true,
  role: true,
  publicProfileState: true,
} satisfies Prisma.UserSelect;

const partnershipSelect = {
  id: true,
  status: true,
  isActive: true,
  priority: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  collectionPointId: true,
  ngoId: true,
  collectionPoint: { select: partnershipPartnerSelect },
  ngo: { select: partnershipPartnerSelect },
} satisfies Prisma.OperationalPartnershipSelect;

const listPartnershipsQuerySchema = z.object({
  status: z.nativeEnum(OperationalPartnershipStatus).optional(),
});

const createPartnershipSchema = z.object({
  ngoId: z.string().trim().min(1),
  notes: z.string().trim().max(280).optional(),
});

const updatePartnershipStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED']),
  notes: z.string().trim().max(280).optional(),
});

type PartnershipRecord = Prisma.OperationalPartnershipGetPayload<{
  select: typeof partnershipSelect;
}>;

type AuthenticatedUser = {
  id: string;
  role: string;
};

function ensurePartnershipAccess(user: AuthenticatedUser) {
  if (
    user.role !== UserRole.COLLECTION_POINT &&
    user.role !== UserRole.NGO &&
    user.role !== UserRole.ADMIN
  ) {
    throw new ForbiddenError('Este perfil nao possui acesso a parcerias operacionais');
  }
}

function mapPartner(
  partner: PartnershipRecord['collectionPoint'] | PartnershipRecord['ngo'],
) {
  return {
    id: partner.id,
    name: partner.name,
    organizationName: partner.organizationName,
    address: partner.address,
    addressNumber: partner.addressNumber,
    addressComplement: partner.addressComplement,
    city: partner.city,
    state: partner.state,
    role: partner.role,
    publicProfileState: partner.publicProfileState,
  };
}

function mapPartnership(partnership: PartnershipRecord) {
  return {
    id: partnership.id,
    status: partnership.status,
    isActive: partnership.isActive,
    priority: partnership.priority,
    notes: partnership.notes,
    createdAt: partnership.createdAt.toISOString(),
    updatedAt: partnership.updatedAt.toISOString(),
    collectionPoint: mapPartner(partnership.collectionPoint),
    ngo: mapPartner(partnership.ngo),
  };
}

function buildPartnershipWhere(
  user: AuthenticatedUser,
  query: z.infer<typeof listPartnershipsQuerySchema>,
) {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(user.role === UserRole.ADMIN
      ? {}
      : user.role === UserRole.COLLECTION_POINT
        ? { collectionPointId: user.id }
        : { ngoId: user.id }),
  } satisfies Prisma.OperationalPartnershipWhereInput;
}

async function findActivePartnershipForCollectionPoint(
  fastify: FastifyInstance,
  collectionPointId: string,
  excludeId?: string,
) {
  return fastify.prisma.operationalPartnership.findFirst({
    where: {
      collectionPointId,
      status: OperationalPartnershipStatus.ACTIVE,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      ngoId: true,
    },
  });
}

export default async function partnershipRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensurePartnershipAccess(request.user);
      const query = listPartnershipsQuerySchema.parse(request.query);

      const partnerships = await fastify.prisma.operationalPartnership.findMany({
        where: buildPartnershipWhere(request.user, query),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: partnershipSelect,
      });

      return reply.send({
        data: partnerships.map(mapPartnership),
        meta: {
          count: partnerships.length,
          statusCounts: partnerships.reduce<Record<OperationalPartnershipStatus, number>>(
            (acc, partnership) => {
              acc[partnership.status] += 1;
              return acc;
            },
            {
              PENDING: 0,
              ACTIVE: 0,
              REJECTED: 0,
            },
          ),
        },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Parametros invalidos para parcerias operacionais',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensurePartnershipAccess(request.user);

      if (request.user.role !== UserRole.COLLECTION_POINT) {
        throw new ForbiddenError(
          'Somente pontos de coleta podem solicitar novas parcerias operacionais',
        );
      }

      const body = createPartnershipSchema.parse(request.body);
      const requester = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          role: true,
          publicProfileState: true,
        },
      });

      if (!requester || requester.role !== UserRole.COLLECTION_POINT) {
        throw new ForbiddenError('O usuario autenticado nao e um ponto de coleta valido');
      }

      if (
        requester.publicProfileState !== PublicProfileState.ACTIVE &&
        requester.publicProfileState !== PublicProfileState.VERIFIED
      ) {
        throw new ConflictError(
          'Ative o perfil publico do ponto antes de solicitar parceria a uma ONG',
        );
      }

      const ngo = await fastify.prisma.user.findFirst({
        where: {
          id: body.ngoId,
          role: UserRole.NGO,
          publicProfileState: {
            in: [PublicProfileState.ACTIVE, PublicProfileState.VERIFIED],
          },
        },
        select: { id: true },
      });

      if (!ngo) {
        throw new NotFoundError('ONG parceira');
      }

      const activePartnership = await findActivePartnershipForCollectionPoint(
        fastify,
        requester.id,
      );

      if (activePartnership && activePartnership.ngoId !== ngo.id) {
        throw new ConflictError(
          'Este ponto de coleta ja possui uma ONG parceira ativa. Encerre a parceria atual antes de solicitar outra.',
        );
      }

      const existing = await fastify.prisma.operationalPartnership.findUnique({
        where: {
          collectionPointId_ngoId: {
            collectionPointId: requester.id,
            ngoId: ngo.id,
          },
        },
        select: {
          id: true,
          status: true,
          notes: true,
        },
      });

      if (existing?.status === OperationalPartnershipStatus.ACTIVE) {
        throw new ConflictError('Esta parceria operacional ja esta ativa');
      }

      if (existing?.status === OperationalPartnershipStatus.PENDING) {
        throw new ConflictError('Ja existe uma solicitacao pendente para esta ONG');
      }

      const partnership = existing
        ? await fastify.prisma.operationalPartnership.update({
            where: { id: existing.id },
            data: {
              status: OperationalPartnershipStatus.PENDING,
              isActive: false,
              priority: 0,
              notes: body.notes ?? existing.notes,
            },
            select: partnershipSelect,
          })
        : await fastify.prisma.operationalPartnership.create({
            data: {
              collectionPointId: requester.id,
              ngoId: ngo.id,
              status: OperationalPartnershipStatus.PENDING,
              isActive: false,
              priority: 0,
              notes: body.notes,
            },
            select: partnershipSelect,
          });

      await createNotifications(fastify, [
        {
          userId: partnership.ngo.id,
          type: 'PARTNERSHIP_REQUEST_RECEIVED' as const,
          title: 'Nova solicitacao de parceria',
          body: `${partnership.collectionPoint.organizationName ?? partnership.collectionPoint.name} solicitou parceria operacional com a sua ONG.`,
          href: '/perfil',
          payload: {
            partnershipId: partnership.id,
            collectionPointId: partnership.collectionPoint.id,
            ngoId: partnership.ngo.id,
            status: partnership.status,
          },
        },
      ]);

      return reply.code(existing ? 200 : 201).send(mapPartnership(partnership));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos para solicitar parceria operacional',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.patch('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensurePartnershipAccess(request.user);

      if (request.user.role !== UserRole.NGO && request.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError(
          'Somente ONGs parceiras podem aprovar ou rejeitar solicitacoes de parceria',
        );
      }

      const { id } = request.params as { id: string };
      const body = updatePartnershipStatusSchema.parse(request.body);
      const partnership = await fastify.prisma.operationalPartnership.findUnique({
        where: { id },
        select: partnershipSelect,
      });

      if (!partnership) {
        throw new NotFoundError('Parceria operacional');
      }

      if (request.user.role === UserRole.NGO && partnership.ngoId !== request.user.id) {
        throw new ForbiddenError('Esta solicitacao nao pertence a ONG autenticada');
      }

      if (partnership.status !== OperationalPartnershipStatus.PENDING) {
        throw new ConflictError('Apenas solicitacoes pendentes podem ser aprovadas ou rejeitadas');
      }

      if (body.status === OperationalPartnershipStatus.ACTIVE) {
        const conflictingActive = await findActivePartnershipForCollectionPoint(
          fastify,
          partnership.collectionPointId,
          partnership.id,
        );

        if (conflictingActive) {
          throw new ConflictError(
            'Este ponto de coleta ja possui outra ONG parceira ativa configurada',
          );
        }
      }

      const updated = await fastify.prisma.operationalPartnership.update({
        where: { id: partnership.id },
        data: {
          status: body.status,
          isActive: body.status === OperationalPartnershipStatus.ACTIVE,
          notes: body.notes ?? partnership.notes,
          priority: body.status === OperationalPartnershipStatus.ACTIVE ? partnership.priority : 0,
        },
        select: partnershipSelect,
      });

      const statusLabel =
        body.status === OperationalPartnershipStatus.ACTIVE ? 'aprovada' : 'rejeitada';

      await createNotifications(fastify, [
        {
          userId: updated.collectionPoint.id,
          type: 'PARTNERSHIP_STATUS_CHANGED' as const,
          title:
            body.status === OperationalPartnershipStatus.ACTIVE
              ? 'Parceria aprovada'
              : 'Parceria rejeitada',
          body: `A ONG ${updated.ngo.organizationName ?? updated.ngo.name} ${statusLabel} a solicitacao de parceria do ponto.`,
          href: '/perfil',
          payload: {
            partnershipId: updated.id,
            collectionPointId: updated.collectionPoint.id,
            ngoId: updated.ngo.id,
            status: updated.status,
          },
        },
        {
          userId: updated.ngo.id,
          type: 'PARTNERSHIP_STATUS_CHANGED' as const,
          title:
            body.status === OperationalPartnershipStatus.ACTIVE
              ? 'Solicitacao aprovada'
              : 'Solicitacao rejeitada',
          body: `A solicitacao envolvendo ${updated.collectionPoint.organizationName ?? updated.collectionPoint.name} foi ${statusLabel}.`,
          href: '/perfil',
          payload: {
            partnershipId: updated.id,
            collectionPointId: updated.collectionPoint.id,
            ngoId: updated.ngo.id,
            status: updated.status,
          },
        },
      ]);

      return reply.send(mapPartnership(updated));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos para responder a parceria operacional',
          issues: err.errors,
        });
      }

      throw err;
    }
  });
}
