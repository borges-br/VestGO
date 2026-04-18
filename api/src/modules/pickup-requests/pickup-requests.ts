import {
  OperationalPartnershipStatus,
  PickupRequestStatus,
  Prisma,
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

const pickupPartnerSelect = {
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

const pickupPartnershipSelect = {
  id: true,
  status: true,
  isActive: true,
  priority: true,
  notes: true,
} satisfies Prisma.OperationalPartnershipSelect;

const pickupRequestSelect = {
  id: true,
  status: true,
  requestedDate: true,
  timeWindowStart: true,
  timeWindowEnd: true,
  notes: true,
  responseNotes: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
  operationalPartnershipId: true,
  collectionPointId: true,
  ngoId: true,
  operationalPartnership: { select: pickupPartnershipSelect },
  collectionPoint: { select: pickupPartnerSelect },
  ngo: { select: pickupPartnerSelect },
} satisfies Prisma.PickupRequestSelect;

const listPickupRequestsQuerySchema = z.object({
  status: z.nativeEnum(PickupRequestStatus).optional(),
});

const createPickupRequestSchema = z.object({
  operationalPartnershipId: z.string().trim().min(1),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeWindowStart: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  timeWindowEnd: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  notes: z.string().trim().max(280).optional(),
}).superRefine((value, ctx) => {
  if ((value.timeWindowStart && !value.timeWindowEnd) || (!value.timeWindowStart && value.timeWindowEnd)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe inicio e fim da faixa de horario.',
      path: ['timeWindowEnd'],
    });
  }

  if (
    value.timeWindowStart &&
    value.timeWindowEnd &&
    value.timeWindowStart >= value.timeWindowEnd
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O horario final precisa ser posterior ao horario inicial.',
      path: ['timeWindowEnd'],
    });
  }
});

const updatePickupRequestStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  responseNotes: z.string().trim().max(280).optional(),
});

type PickupRequestRecord = Prisma.PickupRequestGetPayload<{
  select: typeof pickupRequestSelect;
}>;

type AuthenticatedUser = {
  id: string;
  role: string;
};

function ensurePickupAccess(user: AuthenticatedUser) {
  if (
    user.role !== UserRole.COLLECTION_POINT &&
    user.role !== UserRole.NGO &&
    user.role !== UserRole.ADMIN
  ) {
    throw new ForbiddenError('Este perfil nao possui acesso a solicitacoes de retirada');
  }
}

function mapPartner(
  partner: PickupRequestRecord['collectionPoint'] | PickupRequestRecord['ngo'],
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

function mapPickupRequest(record: PickupRequestRecord) {
  return {
    id: record.id,
    status: record.status,
    requestedDate: record.requestedDate?.toISOString() ?? null,
    timeWindowStart: record.timeWindowStart,
    timeWindowEnd: record.timeWindowEnd,
    notes: record.notes,
    responseNotes: record.responseNotes,
    respondedAt: record.respondedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    operationalPartnershipId: record.operationalPartnershipId,
    operationalPartnership: {
      id: record.operationalPartnership.id,
      status: record.operationalPartnership.status,
      isActive: record.operationalPartnership.isActive,
      priority: record.operationalPartnership.priority,
      notes: record.operationalPartnership.notes,
    },
    collectionPoint: mapPartner(record.collectionPoint),
    ngo: mapPartner(record.ngo),
  };
}

function buildPickupWhere(
  user: AuthenticatedUser,
  query: z.infer<typeof listPickupRequestsQuerySchema>,
) {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(user.role === UserRole.ADMIN
      ? {}
      : user.role === UserRole.COLLECTION_POINT
        ? { collectionPointId: user.id }
        : { ngoId: user.id }),
  } satisfies Prisma.PickupRequestWhereInput;
}

export default async function pickupRequestRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensurePickupAccess(request.user);
      const query = listPickupRequestsQuerySchema.parse(request.query);

      const pickupRequests = await fastify.prisma.pickupRequest.findMany({
        where: buildPickupWhere(request.user, query),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: pickupRequestSelect,
      });

      return reply.send({
        data: pickupRequests.map(mapPickupRequest),
        meta: {
          count: pickupRequests.length,
          statusCounts: pickupRequests.reduce<Record<PickupRequestStatus, number>>(
            (acc, pickupRequest) => {
              acc[pickupRequest.status] += 1;
              return acc;
            },
            {
              PENDING: 0,
              APPROVED: 0,
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
          message: 'Parametros invalidos para solicitacoes de retirada',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensurePickupAccess(request.user);

      if (request.user.role !== UserRole.NGO) {
        throw new ForbiddenError('Somente ONGs podem solicitar retirada');
      }

      const body = createPickupRequestSchema.parse(request.body);
      const partnership = await fastify.prisma.operationalPartnership.findUnique({
        where: { id: body.operationalPartnershipId },
        select: {
          id: true,
          status: true,
          isActive: true,
          collectionPointId: true,
          ngoId: true,
          collectionPoint: { select: pickupPartnerSelect },
          ngo: { select: pickupPartnerSelect },
        },
      });

      if (!partnership) {
        throw new NotFoundError('Parceria operacional');
      }

      if (partnership.ngoId !== request.user.id) {
        throw new ForbiddenError('Esta parceria nao pertence a ONG autenticada');
      }

      if (
        partnership.status !== OperationalPartnershipStatus.ACTIVE ||
        !partnership.isActive
      ) {
        throw new ConflictError(
          'Apenas parcerias operacionais ativas podem receber solicitacoes de retirada',
        );
      }

      const existingPending = await fastify.prisma.pickupRequest.findFirst({
        where: {
          operationalPartnershipId: partnership.id,
          status: PickupRequestStatus.PENDING,
        },
        select: { id: true },
      });

      if (existingPending) {
        throw new ConflictError(
          'Ja existe uma solicitacao de retirada pendente para esta parceria',
        );
      }

      const pickupRequest = await fastify.prisma.pickupRequest.create({
        data: {
          operationalPartnershipId: partnership.id,
          collectionPointId: partnership.collectionPointId,
          ngoId: partnership.ngoId,
          status: PickupRequestStatus.PENDING,
          requestedDate: body.requestedDate ? new Date(`${body.requestedDate}T12:00:00.000Z`) : null,
          timeWindowStart: body.timeWindowStart,
          timeWindowEnd: body.timeWindowEnd,
          notes: body.notes,
        },
        select: pickupRequestSelect,
      });

      await createNotifications(fastify, [
        {
          userId: pickupRequest.collectionPoint.id,
          type: 'PICKUP_REQUEST_RECEIVED' as const,
          title: 'Nova solicitacao de retirada',
          body: `${pickupRequest.ngo.organizationName ?? pickupRequest.ngo.name} solicitou retirada${pickupRequest.requestedDate ? ` para ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(pickupRequest.requestedDate)}` : ''}${pickupRequest.timeWindowStart && pickupRequest.timeWindowEnd ? `, entre ${pickupRequest.timeWindowStart} e ${pickupRequest.timeWindowEnd}` : ''}.`,
          href: '/inicio',
          payload: {
            pickupRequestId: pickupRequest.id,
            operationalPartnershipId: pickupRequest.operationalPartnershipId,
            status: pickupRequest.status,
          },
        },
        {
          userId: pickupRequest.ngo.id,
          type: 'PICKUP_REQUEST_CREATED' as const,
          title: 'Solicitacao de retirada enviada',
          body: `A solicitacao para ${pickupRequest.collectionPoint.organizationName ?? pickupRequest.collectionPoint.name} foi enviada${pickupRequest.requestedDate ? ` com previsao para ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(pickupRequest.requestedDate)}` : ''} e aguarda aprovacao.`,
          href: '/inicio',
          payload: {
            pickupRequestId: pickupRequest.id,
            operationalPartnershipId: pickupRequest.operationalPartnershipId,
            status: pickupRequest.status,
          },
        },
      ]);

      return reply.code(201).send(mapPickupRequest(pickupRequest));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos para solicitar retirada',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.patch('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensurePickupAccess(request.user);

      if (
        request.user.role !== UserRole.COLLECTION_POINT &&
        request.user.role !== UserRole.ADMIN
      ) {
        throw new ForbiddenError(
          'Somente pontos de coleta podem aprovar ou rejeitar solicitacoes de retirada',
        );
      }

      const { id } = request.params as { id: string };
      const body = updatePickupRequestStatusSchema.parse(request.body);
      const pickupRequest = await fastify.prisma.pickupRequest.findUnique({
        where: { id },
        select: pickupRequestSelect,
      });

      if (!pickupRequest) {
        throw new NotFoundError('Solicitacao de retirada');
      }

      if (
        request.user.role === UserRole.COLLECTION_POINT &&
        pickupRequest.collectionPointId !== request.user.id
      ) {
        throw new ForbiddenError('Esta solicitacao nao pertence ao ponto autenticado');
      }

      if (pickupRequest.status !== PickupRequestStatus.PENDING) {
        throw new ConflictError(
          'Apenas solicitacoes pendentes podem ser aprovadas ou rejeitadas',
        );
      }

      const updated = await fastify.prisma.pickupRequest.update({
        where: { id: pickupRequest.id },
        data: {
          status: body.status,
          responseNotes: body.responseNotes ?? pickupRequest.responseNotes,
          respondedAt: new Date(),
        },
        select: pickupRequestSelect,
      });

      const statusLabel =
        body.status === PickupRequestStatus.APPROVED ? 'aprovada' : 'rejeitada';

      await createNotifications(fastify, [
        {
          userId: updated.ngo.id,
          type: 'PICKUP_REQUEST_STATUS_CHANGED' as const,
          title:
            body.status === PickupRequestStatus.APPROVED
              ? 'Solicitacao de retirada aprovada'
              : 'Solicitacao de retirada rejeitada',
          body: `A solicitacao de retirada para ${updated.collectionPoint.organizationName ?? updated.collectionPoint.name} foi ${statusLabel}.`,
          href: '/inicio',
          payload: {
            pickupRequestId: updated.id,
            operationalPartnershipId: updated.operationalPartnershipId,
            status: updated.status,
          },
        },
      ]);

      return reply.send(mapPickupRequest(updated));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos para responder a solicitacao de retirada',
          issues: err.errors,
        });
      }

      throw err;
    }
  });
}
