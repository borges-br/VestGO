import { randomBytes } from 'node:crypto';
import {
  DonationStatus,
  ItemCategory,
  OperationalBatchStatus,
  OperationalPartnershipStatus,
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
import {
  donationSelect,
  getAllowedNextStatuses,
  mapDonation,
  type Viewer,
} from '../donations/donations';

const batchPartnerSelect = {
  id: true,
  name: true,
  organizationName: true,
  role: true,
  city: true,
  state: true,
} satisfies Prisma.UserSelect;

const operationalBatchSelect = {
  id: true,
  code: true,
  name: true,
  collectionPointId: true,
  ngoId: true,
  primaryCategory: true,
  status: true,
  notes: true,
  createdById: true,
  dispatchedById: true,
  deliveredById: true,
  dispatchedAt: true,
  deliveredAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  collectionPoint: { select: batchPartnerSelect },
  ngo: { select: batchPartnerSelect },
  items: {
    orderBy: { addedAt: 'asc' },
    select: {
      id: true,
      addedById: true,
      addedAt: true,
      donation: { select: donationSelect },
    },
  },
} satisfies Prisma.OperationalBatchSelect;

type OperationalBatchRecord = Prisma.OperationalBatchGetPayload<{
  select: typeof operationalBatchSelect;
}>;

type BatchOperationSummary = {
  total: number;
  updated: number;
  skipped: number;
  skippedItems: Array<{
    donationId: string;
    donationCode: string;
    reason: string;
  }>;
};

const ITEM_MUTABLE_BATCH_STATUSES: OperationalBatchStatus[] = [
  OperationalBatchStatus.OPEN,
  OperationalBatchStatus.READY_TO_SHIP,
];

const listBatchesQuerySchema = z.object({
  status: z.nativeEnum(OperationalBatchStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const createBatchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  ngoId: z.string().trim().min(1),
  collectionPointId: z.string().trim().min(1).optional(),
  primaryCategory: z.nativeEnum(ItemCategory).optional(),
  notes: z.string().trim().max(500).optional(),
});

const addBatchItemSchema = z.object({
  donationId: z.string().trim().min(1),
});

function ensureOperationalAccess(user: Viewer) {
  if (user.role === UserRole.DONOR) {
    throw new ForbiddenError('A area operacional nao esta disponivel para doadores');
  }
}

function ensureCollectionPointBatchAccess(user: Viewer) {
  ensureOperationalAccess(user);

  if (user.role !== UserRole.COLLECTION_POINT && user.role !== UserRole.ADMIN) {
    throw new ForbiddenError('Somente pontos de coleta podem gerenciar cargas nesta etapa');
  }
}

function buildBatchCode() {
  return `LOT-${randomBytes(3).toString('hex').toUpperCase()}`;
}

async function generateUniqueBatchCode(fastify: FastifyInstance) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = buildBatchCode();
    const existing = await fastify.prisma.operationalBatch.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  return `LOT-${Date.now().toString().slice(-6)}`;
}

function mapPartner(partner: OperationalBatchRecord['collectionPoint']) {
  return {
    id: partner.id,
    name: partner.name,
    organizationName: partner.organizationName,
    role: partner.role,
    city: partner.city,
    state: partner.state,
  };
}

function canManageBatchAsCollectionPoint(batch: OperationalBatchRecord, user: Viewer) {
  return user.role === UserRole.ADMIN ||
    (user.role === UserRole.COLLECTION_POINT && batch.collectionPointId === user.id);
}

function canManageBatchAsNgo(batch: OperationalBatchRecord, user: Viewer) {
  return user.role === UserRole.ADMIN || (user.role === UserRole.NGO && batch.ngoId === user.id);
}

function getAllowedBatchActions(batch: OperationalBatchRecord, user: Viewer) {
  const canCollectionPointManage = canManageBatchAsCollectionPoint(batch, user);
  const canNgoManage = canManageBatchAsNgo(batch, user);
  const hasItems = batch.items.length > 0;

  return {
    canAddItems:
      canCollectionPointManage &&
      ITEM_MUTABLE_BATCH_STATUSES.includes(batch.status),
    canRemoveItems:
      canCollectionPointManage &&
      ITEM_MUTABLE_BATCH_STATUSES.includes(batch.status),
    canMarkReady: canCollectionPointManage && batch.status === OperationalBatchStatus.OPEN && hasItems,
    canDispatch:
      canCollectionPointManage &&
      ITEM_MUTABLE_BATCH_STATUSES.includes(batch.status) &&
      hasItems,
    canConfirmDelivery: canNgoManage && batch.status === OperationalBatchStatus.IN_TRANSIT && hasItems,
    canClose:
      (canCollectionPointManage || canNgoManage) && batch.status === OperationalBatchStatus.DELIVERED,
    canCancel:
      canCollectionPointManage &&
      ITEM_MUTABLE_BATCH_STATUSES.includes(batch.status),
  };
}

function mapBatch(
  batch: OperationalBatchRecord,
  user: Viewer,
  operationSummary?: BatchOperationSummary,
) {
  const totalItemQuantity = batch.items.reduce(
    (sum, item) => sum + item.donation.items.reduce((itemSum, donationItem) => itemSum + donationItem.quantity, 0),
    0,
  );

  return {
    id: batch.id,
    code: batch.code,
    name: batch.name,
    status: batch.status,
    primaryCategory: batch.primaryCategory,
    notes: batch.notes,
    collectionPointId: batch.collectionPointId,
    ngoId: batch.ngoId,
    createdById: batch.createdById,
    dispatchedById: batch.dispatchedById,
    deliveredById: batch.deliveredById,
    dispatchedAt: batch.dispatchedAt?.toISOString() ?? null,
    deliveredAt: batch.deliveredAt?.toISOString() ?? null,
    closedAt: batch.closedAt?.toISOString() ?? null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    collectionPoint: mapPartner(batch.collectionPoint),
    ngo: mapPartner(batch.ngo),
    itemCount: batch.items.length,
    donationCount: batch.items.length,
    totalItemQuantity,
    allowedActions: getAllowedBatchActions(batch, user),
    operationSummary: operationSummary ?? null,
    items: batch.items.map((item) => ({
      id: item.id,
      addedById: item.addedById,
      addedAt: item.addedAt.toISOString(),
      donation: mapDonation(item.donation, user),
    })),
  };
}

function buildBatchWhere(user: Viewer, status?: OperationalBatchStatus) {
  return {
    ...(status ? { status } : {}),
    ...(user.role === UserRole.ADMIN
      ? {}
      : user.role === UserRole.COLLECTION_POINT
        ? { collectionPointId: user.id }
        : { ngoId: user.id }),
  } satisfies Prisma.OperationalBatchWhereInput;
}

async function findAccessibleBatch(fastify: FastifyInstance, id: string, user: Viewer) {
  const batch = await fastify.prisma.operationalBatch.findFirst({
    where: {
      id,
      ...buildBatchWhere(user),
    },
    select: operationalBatchSelect,
  });

  if (!batch) {
    throw new NotFoundError('Carga');
  }

  return batch;
}

function assertCanMutateItems(batch: OperationalBatchRecord, user: Viewer) {
  if (!getAllowedBatchActions(batch, user).canAddItems) {
    throw new ConflictError('Esta carga nao aceita alteracao de itens neste status');
  }
}

function getBatchMovePlan(
  batch: OperationalBatchRecord,
  user: Viewer,
  targetStatus: DonationStatus,
) {
  const blockedItems = batch.items
    .filter((item) => !getAllowedNextStatuses(item.donation, user).includes(targetStatus))
    .map((item) => ({
      donationId: item.donation.id,
      donationCode: item.donation.code,
      reason: `Status atual ${item.donation.status} nao permite avancar para ${targetStatus}`,
    }));

  return {
    total: batch.items.length,
    updated: blockedItems.length === 0 ? batch.items.length : 0,
    skipped: blockedItems.length,
    skippedItems: blockedItems,
  };
}

function assertDonationsCanMove(
  batch: OperationalBatchRecord,
  user: Viewer,
  targetStatus: DonationStatus,
) {
  const plan = getBatchMovePlan(batch, user, targetStatus);

  if (plan.skippedItems.length > 0) {
    throw new ConflictError(
      `Existem doacoes sem permissao ou transicao valida para ${targetStatus}: ${plan.skippedItems
        .map((item) => item.donationCode)
        .join(', ')}`,
    );
  }

  return plan;
}

function getBatchTimelineLocation(batch: OperationalBatchRecord, targetStatus: DonationStatus) {
  if (targetStatus === DonationStatus.IN_TRANSIT) {
    return batch.collectionPoint.organizationName ?? batch.collectionPoint.name;
  }

  if (targetStatus === DonationStatus.DELIVERED) {
    return batch.ngo.organizationName ?? batch.ngo.name;
  }

  return undefined;
}

function getBatchDonationNotification(status: DonationStatus, donationCode: string, batchCode: string) {
  if (status === DonationStatus.IN_TRANSIT) {
    return {
      title: 'Sua doacao saiu para a ONG',
      body: `A doacao ${donationCode} foi despachada na carga ${batchCode}.`,
    };
  }

  return {
    title: 'Sua doacao chegou a ONG',
    body: `A doacao ${donationCode} foi confirmada na carga ${batchCode}.`,
  };
}

async function moveBatchDonations(
  fastify: FastifyInstance,
  batch: OperationalBatchRecord,
  user: Viewer,
  targetStatus: DonationStatus,
  batchData: Prisma.OperationalBatchUpdateInput,
) {
  const operationSummary = assertDonationsCanMove(batch, user, targetStatus);
  const location = getBatchTimelineLocation(batch, targetStatus);

  const updatedBatch = await fastify.prisma.$transaction(async (tx) => {
    await tx.operationalBatch.update({
      where: { id: batch.id },
      data: batchData,
    });

    for (const item of batch.items) {
      await tx.donation.update({
        where: { id: item.donation.id },
        data: {
          status: targetStatus,
          timeline: {
            create: {
              status: targetStatus,
              description: `Atualizacao operacional pela carga ${batch.code}.`,
              location,
              createdBy: user.id,
            },
          },
        },
      });
    }

    return tx.operationalBatch.findUnique({
      where: { id: batch.id },
      select: operationalBatchSelect,
    });
  });

  if (!updatedBatch) {
    throw new NotFoundError('Carga');
  }

  await createNotifications(
    fastify,
    batch.items.map((item) => {
      const content = getBatchDonationNotification(targetStatus, item.donation.code, batch.code);

      return {
        userId: item.donation.donorId,
        type: 'DONATION_STATUS' as const,
        title: content.title,
        body: content.body,
        href: `/rastreio/${item.donation.id}`,
        payload: {
          donationId: item.donation.id,
          donationCode: item.donation.code,
          batchId: batch.id,
          batchCode: batch.code,
          status: targetStatus,
        },
      };
    }),
  );

  return { batch: updatedBatch, operationSummary };
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export default async function operationalBatchRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureOperationalAccess(request.user);
      const query = listBatchesQuerySchema.parse(request.query);
      const batches = await fastify.prisma.operationalBatch.findMany({
        where: buildBatchWhere(request.user, query.status),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: query.limit,
        select: operationalBatchSelect,
      });

      return reply.send({
        data: batches.map((batch) => mapBatch(batch, request.user)),
        meta: {
          count: batches.length,
          statusCounts: batches.reduce<Record<OperationalBatchStatus, number>>(
            (acc, batch) => {
              acc[batch.status] += 1;
              return acc;
            },
            {
              OPEN: 0,
              READY_TO_SHIP: 0,
              IN_TRANSIT: 0,
              DELIVERED: 0,
              CLOSED: 0,
              CANCELLED: 0,
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
          message: 'Parametros invalidos para cargas operacionais',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureCollectionPointBatchAccess(request.user);
      const body = createBatchSchema.parse(request.body);
      const collectionPointId =
        request.user.role === UserRole.ADMIN ? body.collectionPointId : request.user.id;

      if (!collectionPointId) {
        throw new ConflictError('Informe o ponto de coleta para criar a carga como administrador');
      }

      const partnership = await fastify.prisma.operationalPartnership.findFirst({
        where: {
          collectionPointId,
          ngoId: body.ngoId,
          status: OperationalPartnershipStatus.ACTIVE,
          isActive: true,
        },
        select: {
          id: true,
          collectionPointId: true,
          ngoId: true,
        },
      });

      if (!partnership) {
        throw new ConflictError('A carga exige uma parceria ativa entre ponto e ONG');
      }

      const code = await generateUniqueBatchCode(fastify);
      const batch = await fastify.prisma.operationalBatch.create({
        data: {
          code,
          name: body.name,
          collectionPointId,
          ngoId: body.ngoId,
          primaryCategory: body.primaryCategory,
          notes: body.notes,
          createdById: request.user.id,
        },
        select: operationalBatchSelect,
      });

      return reply.code(201).send(mapBatch(batch, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos para criar carga operacional',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureOperationalAccess(request.user);
      const { id } = request.params as { id: string };
      const batch = await findAccessibleBatch(fastify, id, request.user);

      return reply.send(mapBatch(batch, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.post('/:id/items', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureCollectionPointBatchAccess(request.user);
      const { id } = request.params as { id: string };
      const body = addBatchItemSchema.parse(request.body);
      const batch = await findAccessibleBatch(fastify, id, request.user);
      assertCanMutateItems(batch, request.user);

      const donation = await fastify.prisma.donation.findUnique({
        where: { id: body.donationId },
        select: {
          id: true,
          status: true,
          collectionPointId: true,
          ngoId: true,
          operationalBatchItem: {
            select: {
              id: true,
              batch: { select: { code: true, status: true } },
            },
          },
        },
      });

      if (!donation) {
        throw new NotFoundError('Doacao');
      }

      if (donation.collectionPointId !== batch.collectionPointId || donation.ngoId !== batch.ngoId) {
        throw new ForbiddenError('Esta doacao nao pertence ao fluxo desta carga');
      }

      if (donation.operationalBatchItem) {
        throw new ConflictError(
          `Esta doacao ja esta vinculada a carga ${donation.operationalBatchItem.batch.code}`,
        );
      }

      if (donation.status !== DonationStatus.AT_POINT) {
        throw new ConflictError('Confirme o recebimento no ponto antes de adicionar a doacao a carga');
      }

      await fastify.prisma.operationalBatchItem.create({
        data: {
          batchId: batch.id,
          donationId: donation.id,
          addedById: request.user.id,
        },
      });

      const updatedBatch = await findAccessibleBatch(fastify, id, request.user);
      return reply.code(201).send(mapBatch(updatedBatch, request.user));
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return reply.code(409).send({
          error: 'CONFLICT',
          message: 'Esta doacao ja esta vinculada a uma carga',
        });
      }

      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos para adicionar item a carga',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.delete('/:id/items/:itemId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureCollectionPointBatchAccess(request.user);
      const { id, itemId } = request.params as { id: string; itemId: string };
      const batch = await findAccessibleBatch(fastify, id, request.user);
      assertCanMutateItems(batch, request.user);
      const item = batch.items.find((candidate) => candidate.id === itemId);

      if (!item) {
        throw new NotFoundError('Item da carga');
      }

      await fastify.prisma.operationalBatchItem.delete({
        where: { id: itemId },
      });

      const updatedBatch = await findAccessibleBatch(fastify, id, request.user);
      return reply.send(mapBatch(updatedBatch, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.post('/:id/mark-ready', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureCollectionPointBatchAccess(request.user);
      const { id } = request.params as { id: string };
      const batch = await findAccessibleBatch(fastify, id, request.user);

      if (!getAllowedBatchActions(batch, request.user).canMarkReady) {
        throw new ConflictError('A carga precisa estar aberta e conter doacoes para ficar pronta');
      }

      const updatedBatch = await fastify.prisma.operationalBatch.update({
        where: { id: batch.id },
        data: { status: OperationalBatchStatus.READY_TO_SHIP },
        select: operationalBatchSelect,
      });

      return reply.send(mapBatch(updatedBatch, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.post('/:id/dispatch', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureCollectionPointBatchAccess(request.user);
      const { id } = request.params as { id: string };
      const batch = await findAccessibleBatch(fastify, id, request.user);

      if (!getAllowedBatchActions(batch, request.user).canDispatch) {
        throw new ConflictError('A carga precisa estar aberta/pronta e conter doacoes para despacho');
      }

      const result = await moveBatchDonations(
        fastify,
        batch,
        request.user,
        DonationStatus.IN_TRANSIT,
        {
          status: OperationalBatchStatus.IN_TRANSIT,
          dispatchedAt: new Date(),
          dispatchedBy: { connect: { id: request.user.id } },
        },
      );

      return reply.send(mapBatch(result.batch, request.user, result.operationSummary));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.post('/:id/confirm-delivery', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureOperationalAccess(request.user);
      const { id } = request.params as { id: string };
      const batch = await findAccessibleBatch(fastify, id, request.user);

      if (!getAllowedBatchActions(batch, request.user).canConfirmDelivery) {
        throw new ConflictError('Esta carga nao esta disponivel para confirmacao de entrega');
      }

      const result = await moveBatchDonations(
        fastify,
        batch,
        request.user,
        DonationStatus.DELIVERED,
        {
          status: OperationalBatchStatus.DELIVERED,
          deliveredAt: new Date(),
          deliveredBy: { connect: { id: request.user.id } },
        },
      );

      return reply.send(mapBatch(result.batch, request.user, result.operationSummary));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.post('/:id/close', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureOperationalAccess(request.user);
      const { id } = request.params as { id: string };
      const batch = await findAccessibleBatch(fastify, id, request.user);

      if (!getAllowedBatchActions(batch, request.user).canClose) {
        throw new ConflictError('Somente cargas entregues podem ser fechadas');
      }

      const updatedBatch = await fastify.prisma.operationalBatch.update({
        where: { id: batch.id },
        data: {
          status: OperationalBatchStatus.CLOSED,
          closedAt: new Date(),
        },
        select: operationalBatchSelect,
      });

      return reply.send(mapBatch(updatedBatch, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.post('/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureCollectionPointBatchAccess(request.user);
      const { id } = request.params as { id: string };
      const batch = await findAccessibleBatch(fastify, id, request.user);

      if (!getAllowedBatchActions(batch, request.user).canCancel) {
        throw new ConflictError('Apenas cargas abertas ou prontas podem ser canceladas');
      }

      const updatedBatch = await fastify.prisma.operationalBatch.update({
        where: { id: batch.id },
        data: { status: OperationalBatchStatus.CANCELLED },
        select: operationalBatchSelect,
      });

      return reply.send(mapBatch(updatedBatch, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });
}
