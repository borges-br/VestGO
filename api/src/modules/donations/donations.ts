import {
  DonationStatus,
  ItemCategory,
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
import {
  createNotifications,
  getDonationPointsValue,
  getNewlyUnlockedBadges,
  loadDonorGamificationDonations,
} from '../../shared/notifications';
import {
  sendDonationRegisteredOperationalEmail,
  sendDonationStatusOperationalEmail,
} from '../../shared/operational-emails';

const createDonationSchema = z.object({
  collectionPointId: z.string().min(1),
  notes: z.string().trim().max(600).optional(),
  scheduledAt: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(120),
        category: z.nativeEnum(ItemCategory),
        quantity: z.coerce.number().int().min(1).max(200),
        description: z.string().trim().max(600).optional(),
      }),
    )
    .min(1)
    .max(20),
});

const listDonationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.nativeEnum(DonationStatus).optional(),
});

const listOperationalDonationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.nativeEnum(DonationStatus).optional(),
  collectionPointId: z.string().trim().min(1).optional(),
  ngoId: z.string().trim().min(1).optional(),
  actionableOnly: z.coerce.boolean().default(false),
  sortBy: z.enum(['updatedAt', 'createdAt']).default('updatedAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

const updateDonationStatusSchema = z.object({
  status: z.nativeEnum(DonationStatus),
  description: z.string().trim().min(2).max(280).optional(),
  location: z.string().trim().max(180).optional(),
});

const pointSelect = {
  id: true,
  name: true,
  organizationName: true,
  address: true,
  addressNumber: true,
  addressComplement: true,
  neighborhood: true,
  zipCode: true,
  city: true,
  state: true,
  phone: true,
  openingHours: true,
  serviceRegions: true,
  role: true,
} satisfies Prisma.UserSelect;

const operationalPartnershipSelect = {
  id: true,
  status: true,
  isActive: true,
  priority: true,
  notes: true,
} satisfies Prisma.OperationalPartnershipSelect;

const donationSelect = {
  id: true,
  code: true,
  status: true,
  donorId: true,
  collectionPointId: true,
  ngoId: true,
  operationalPartnershipId: true,
  notes: true,
  scheduledAt: true,
  createdAt: true,
  updatedAt: true,
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
    orderBy: { id: 'asc' },
  },
  timeline: {
    select: {
      id: true,
      status: true,
      description: true,
      createdBy: true,
      location: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  collectionPoint: { select: pointSelect },
  ngo: { select: pointSelect },
  operationalPartnership: { select: operationalPartnershipSelect },
} satisfies Prisma.DonationSelect;

type DonationRecord = Prisma.DonationGetPayload<{ select: typeof donationSelect }>;
type DonationAccessRecord = Pick<
  DonationRecord,
  'status' | 'donorId' | 'collectionPointId' | 'ngoId'
>;
type Viewer = { id: string; role: string };

const STATUS_POINTS: Record<DonationStatus, number> = {
  PENDING: 60,
  AT_POINT: 90,
  IN_TRANSIT: 110,
  DELIVERED: 150,
  DISTRIBUTED: 180,
  CANCELLED: 0,
};

const STATUS_EVENT_DESCRIPTION: Record<DonationStatus, string> = {
  PENDING: 'Doação registrada na plataforma.',
  AT_POINT: 'Entrega confirmada no ponto de coleta.',
  IN_TRANSIT: 'Doação em deslocamento para a ONG parceira.',
  DELIVERED: 'Doação entregue para triagem da ONG.',
  DISTRIBUTED: 'Doação distribuída para atendimento social.',
  CANCELLED: 'Doação cancelada pelo usuário.',
};

const STATUS_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  PENDING: [DonationStatus.AT_POINT, DonationStatus.CANCELLED],
  AT_POINT: [DonationStatus.IN_TRANSIT],
  IN_TRANSIT: [DonationStatus.DELIVERED],
  DELIVERED: [DonationStatus.DISTRIBUTED],
  DISTRIBUTED: [],
  CANCELLED: [],
};

function buildDonationCode() {
  return `VGO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function generateUniqueDonationCode(fastify: FastifyInstance) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = buildDonationCode();
    const existing = await fastify.prisma.donation.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  return `VGO-${Date.now().toString().slice(-6)}`;
}

function getDonationPoints(status: DonationStatus) {
  return STATUS_POINTS[status] ?? 0;
}

function ensureDonationCreationAllowed(user: { role: string }) {
  if (user.role !== UserRole.DONOR) {
    throw new ForbiddenError('Apenas doadores podem registrar novas doações');
  }
}

function ensureOperationalAccess(user: { role: string }) {
  if (user.role === UserRole.DONOR) {
    throw new ForbiddenError('A área operacional não está disponível para o perfil doador');
  }
}

function getRoleScopeWhere(user: Viewer): Prisma.DonationWhereInput {
  if (user.role === UserRole.ADMIN) {
    return {};
  }

  if (user.role === UserRole.COLLECTION_POINT) {
    return { collectionPointId: user.id };
  }

  if (user.role === UserRole.NGO) {
    return { ngoId: user.id };
  }

  return { donorId: user.id };
}

function getAllowedNextStatuses(donation: DonationAccessRecord, user: Viewer) {
  if (user.role === UserRole.ADMIN) {
    return STATUS_TRANSITIONS[donation.status];
  }

  if (user.role === UserRole.DONOR) {
    if (donation.donorId === user.id && donation.status === DonationStatus.PENDING) {
      return [DonationStatus.CANCELLED];
    }

    return [];
  }

  if (user.role === UserRole.COLLECTION_POINT) {
    if (donation.collectionPointId !== user.id) {
      return [];
    }

    const allowedCollectionPointStatuses = new Set<DonationStatus>([
      DonationStatus.AT_POINT,
      DonationStatus.IN_TRANSIT,
    ]);

    return STATUS_TRANSITIONS[donation.status].filter((status) =>
      allowedCollectionPointStatuses.has(status),
    );
  }

  if (user.role === UserRole.NGO) {
    if (donation.ngoId !== user.id) {
      return [];
    }

    const allowedNgoStatuses = new Set<DonationStatus>([
      DonationStatus.DELIVERED,
      DonationStatus.DISTRIBUTED,
    ]);

    return STATUS_TRANSITIONS[donation.status].filter((status) =>
      allowedNgoStatuses.has(status),
    );
  }

  return [];
}

function mapPoint(
  point: DonationRecord['collectionPoint'] | DonationRecord['ngo'] | null,
  viewer?: Viewer,
) {
  if (!point) {
    return null;
  }

  const hideSensitiveNgoLocation = point.role === UserRole.NGO && viewer?.role === UserRole.DONOR;

  return {
    id: point.id,
    name: point.name,
    organizationName: point.organizationName,
    address: hideSensitiveNgoLocation ? null : point.address,
    addressNumber: hideSensitiveNgoLocation ? null : point.addressNumber,
    addressComplement: hideSensitiveNgoLocation ? null : point.addressComplement,
    neighborhood: hideSensitiveNgoLocation ? null : point.neighborhood,
    zipCode: hideSensitiveNgoLocation ? null : point.zipCode,
    city: point.city,
    state: point.state,
    phone: hideSensitiveNgoLocation ? null : point.phone,
    openingHours: hideSensitiveNgoLocation ? null : point.openingHours,
    serviceRegions: point.serviceRegions,
    role: point.role,
  };
}

function mapPartnership(partnership: DonationRecord['operationalPartnership'] | null) {
  if (!partnership) {
    return null;
  }

  return {
    id: partnership.id,
    status: partnership.status,
    isActive: partnership.isActive,
    priority: partnership.priority,
    notes: partnership.notes,
  };
}

function mapTimelineEvent(event: DonationRecord['timeline'][number]) {
  return {
    id: event.id,
    status: event.status,
    description: event.description,
    createdBy: event.createdBy,
    location: event.location,
    createdAt: event.createdAt.toISOString(),
  };
}

function mapDonation(donation: DonationRecord, viewer?: Viewer) {
  const totalQuantity = donation.items.reduce((sum, item) => sum + item.quantity, 0);
  const latestEvent = donation.timeline[donation.timeline.length - 1] ?? null;

  return {
    id: donation.id,
    code: donation.code,
    status: donation.status,
    notes: donation.notes,
    scheduledAt: donation.scheduledAt?.toISOString() ?? null,
    createdAt: donation.createdAt.toISOString(),
    updatedAt: donation.updatedAt.toISOString(),
    pointsAwarded: getDonationPoints(donation.status),
    itemCount: totalQuantity,
    itemLabel:
      donation.items.length === 1
        ? donation.items[0].name
        : `${donation.items[0]?.name ?? 'Doação'} e mais ${donation.items.length - 1} item(ns)`,
    canCancel: donation.status === DonationStatus.PENDING,
    allowedNextStatuses: viewer ? getAllowedNextStatuses(donation, viewer) : [],
    collectionPoint: mapPoint(donation.collectionPoint, viewer),
    ngo: mapPoint(donation.ngo, viewer),
    partnership: mapPartnership(donation.operationalPartnership),
    dropOffPoint: mapPoint(donation.collectionPoint, viewer),
    items: donation.items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      description: item.description,
      imageUrl: item.imageUrl,
      weightKg: item.weightKg,
    })),
    latestEvent: latestEvent ? mapTimelineEvent(latestEvent) : null,
    timeline: donation.timeline.map(mapTimelineEvent),
  };
}

function buildDonationStatusNotificationContent(params: {
  status: DonationStatus;
  donationCode: string;
  collectionPointName: string | null;
  ngoName: string | null;
}) {
  const collectionPointName = params.collectionPointName ?? 'o ponto parceiro';
  const ngoName = params.ngoName ?? 'a ONG parceira';

  switch (params.status) {
    case DonationStatus.AT_POINT:
      return {
        title: 'Sua doação chegou ao ponto',
        body: `A doação ${params.donationCode} foi recebida em ${collectionPointName}.`,
      };
    case DonationStatus.IN_TRANSIT:
      return {
        title: 'Sua doação saiu para a ONG',
        body: `A doação ${params.donationCode} saiu de ${collectionPointName} e está a caminho de ${ngoName}.`,
      };
    case DonationStatus.DELIVERED:
      return {
        title: 'Sua doação chegou à ONG',
        body: `A doação ${params.donationCode} foi entregue para triagem em ${ngoName}.`,
      };
    case DonationStatus.DISTRIBUTED:
      return {
        title: 'Sua doação foi distribuída',
        body: `A doação ${params.donationCode} concluiu a jornada e já foi distribuída para atendimento social.`,
      };
    case DonationStatus.CANCELLED:
      return {
        title: 'Sua doação foi cancelada',
        body: `A doação ${params.donationCode} foi cancelada e não seguirá para operação logística.`,
      };
    default:
      return {
        title: 'Status da doação atualizado',
        body: `A doação ${params.donationCode} recebeu uma nova atualização na jornada.`,
      };
  }
}

async function getAccessibleDonation(fastify: FastifyInstance, id: string, user: Viewer) {
  return fastify.prisma.donation.findFirst({
    where: {
      id,
      ...getRoleScopeWhere(user),
    },
    select: donationSelect,
  });
}

function ensureStatusUpdateAllowed(
  donation: {
    status: DonationStatus;
    donorId: string;
    collectionPointId: string | null;
    ngoId: string | null;
  },
  user: Viewer,
  nextStatus: DonationStatus,
) {
  if (user.role === UserRole.ADMIN) {
    return;
  }

  if (user.role === UserRole.DONOR) {
    if (
      donation.donorId !== user.id ||
      donation.status !== DonationStatus.PENDING ||
      nextStatus !== DonationStatus.CANCELLED
    ) {
      throw new ForbiddenError('O doador só pode cancelar doações pendentes');
    }
    return;
  }

  if (user.role === UserRole.COLLECTION_POINT) {
    if (donation.collectionPointId !== user.id) {
      throw new ForbiddenError('Esta doação não pertence ao ponto autenticado');
    }

    const allowedCollectionPointStatuses: DonationStatus[] = [
      DonationStatus.AT_POINT,
      DonationStatus.IN_TRANSIT,
    ];

    if (!allowedCollectionPointStatuses.includes(nextStatus)) {
      throw new ForbiddenError('O ponto de coleta só pode confirmar recebimento e envio');
    }
    return;
  }

  if (user.role === UserRole.NGO) {
    if (donation.ngoId !== user.id) {
      throw new ForbiddenError('Esta doação não pertence à ONG autenticada');
    }

    const allowedNgoStatuses: DonationStatus[] = [
      DonationStatus.DELIVERED,
      DonationStatus.DISTRIBUTED,
    ];

    if (!allowedNgoStatuses.includes(nextStatus)) {
      throw new ForbiddenError('A ONG só pode concluir e distribuir a doação');
    }
    return;
  }

  throw new ForbiddenError('Perfil sem permissão para atualizar a doação');
}

function ensureValidTransition(currentStatus: DonationStatus, nextStatus: DonationStatus) {
  if (currentStatus === nextStatus) {
    return;
  }

  if (!STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new ConflictError(`Transição inválida de ${currentStatus} para ${nextStatus}`);
  }
}

async function findActiveOperationalPartnership(
  fastify: FastifyInstance,
  collectionPointId: string,
) {
  return fastify.prisma.operationalPartnership.findFirst({
    where: {
      collectionPointId,
      status: OperationalPartnershipStatus.ACTIVE,
      isActive: true,
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      ngoId: true,
      ngo: { select: pointSelect },
    },
  });
}

function buildOperationalWhere(
  query: z.infer<typeof listOperationalDonationsQuerySchema>,
  user: Viewer,
) {
  return {
    ...getRoleScopeWhere(user),
    ...(query.status ? { status: query.status } : {}),
    ...(query.collectionPointId ? { collectionPointId: query.collectionPointId } : {}),
    ...(query.ngoId ? { ngoId: query.ngoId } : {}),
  } satisfies Prisma.DonationWhereInput;
}

function buildPartnerOptions(
  donations: DonationRecord[],
): {
  collectionPoints: ReturnType<typeof mapPoint>[];
  ngos: ReturnType<typeof mapPoint>[];
} {
  const collectionPoints = new Map<string, ReturnType<typeof mapPoint>>();
  const ngos = new Map<string, ReturnType<typeof mapPoint>>();

  for (const donation of donations) {
    const collectionPoint = mapPoint(donation.collectionPoint);
    const ngo = mapPoint(donation.ngo);

    if (collectionPoint) {
      collectionPoints.set(collectionPoint.id, collectionPoint);
    }

    if (ngo) {
      ngos.set(ngo.id, ngo);
    }
  }

  return {
    collectionPoints: Array.from(collectionPoints.values()),
    ngos: Array.from(ngos.values()),
  };
}

function buildStatusCounts(donations: ReturnType<typeof mapDonation>[]) {
  return donations.reduce<Partial<Record<DonationStatus, number>>>((acc, donation) => {
    acc[donation.status] = (acc[donation.status] ?? 0) + 1;
    return acc;
  }, {});
}

export default async function donationRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureDonationCreationAllowed(request.user);
      const body = createDonationSchema.parse(request.body);

      const collectionPoint = await fastify.prisma.user.findFirst({
        where: {
          id: body.collectionPointId,
          role: UserRole.COLLECTION_POINT,
          publicProfileState: {
            in: [PublicProfileState.ACTIVE, PublicProfileState.VERIFIED],
          },
        },
        select: {
          id: true,
          organizationName: true,
          name: true,
        },
      });

      if (!collectionPoint) {
        throw new NotFoundError('Ponto de coleta');
      }

      const partnership = await findActiveOperationalPartnership(fastify, collectionPoint.id);

      if (!partnership) {
        throw new ConflictError(
          'Este ponto de coleta ainda não possui uma ONG parceira ativa configurada',
        );
      }

      const code = await generateUniqueDonationCode(fastify);
      const createdDonation = await fastify.prisma.donation.create({
        data: {
          code,
          donorId: request.user.id,
          collectionPointId: collectionPoint.id,
          ngoId: partnership.ngoId,
          operationalPartnershipId: partnership.id,
          notes: body.notes,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          items: {
            create: body.items.map((item) => ({
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              description: item.description,
            })),
          },
          timeline: {
            create: {
              status: DonationStatus.PENDING,
              description: `Doação registrada para ${collectionPoint.organizationName ?? collectionPoint.name}.`,
              createdBy: request.user.id,
              location: collectionPoint.organizationName ?? collectionPoint.name,
            },
          },
        },
        select: donationSelect,
      });

      const donorDonationsAfter = await loadDonorGamificationDonations(
        fastify,
        request.user.id,
      );
      const donorDonationsBefore = donorDonationsAfter.filter(
        (donation) => donation.id !== createdDonation.id,
      );
      const newlyUnlockedBadges = getNewlyUnlockedBadges(
        donorDonationsBefore,
        donorDonationsAfter,
      );
      const creationPoints = getDonationPointsValue(createdDonation.status);

      await createNotifications(fastify, [
        {
          userId: collectionPoint.id,
          type: 'DONATION_CREATED_FOR_POINT' as const,
          title: 'Nova doação recebida no ponto',
          body: `A doação ${createdDonation.code} foi registrada e já aguarda recebimento em ${collectionPoint.organizationName ?? collectionPoint.name}.`,
          href: `/operacoes`,
          payload: {
            donationId: createdDonation.id,
            donationCode: createdDonation.code,
            collectionPointId: collectionPoint.id,
          },
        },
        {
          userId: request.user.id,
          type: 'DONATION_POINTS' as const,
          title: 'Pontuação atualizada',
          body: `Sua nova doação ${createdDonation.code} adicionou +${creationPoints} pontos ao seu impacto atual.`,
          href: `/rastreio/${createdDonation.id}`,
          payload: {
            donationId: createdDonation.id,
            donationCode: createdDonation.code,
            points: creationPoints,
            status: createdDonation.status,
          },
        },
        ...newlyUnlockedBadges.map((badge) => ({
          userId: request.user.id,
          type: 'BADGE_EARNED' as const,
          title: `Badge conquistada: ${badge.label}`,
          body: badge.description,
          href: '/inicio',
          payload: {
            badgeId: badge.id,
          },
        })),
      ]);

      await sendDonationRegisteredOperationalEmail(fastify, {
        userId: request.user.id,
        donationId: createdDonation.id,
        donationCode: createdDonation.code,
        collectionPointName: collectionPoint.organizationName ?? collectionPoint.name,
      });

      return reply.code(201).send(mapDonation(createdDonation, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para registrar a doação',
          issues: err.errors,
        });
      }
      throw err;
    }
  });

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const query = listDonationsQuerySchema.parse(request.query);
      const donations = await fastify.prisma.donation.findMany({
        where: {
          ...getRoleScopeWhere(request.user),
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        select: donationSelect,
      });

      return reply.send({
        data: donations.map((donation) => mapDonation(donation, request.user)),
        meta: {
          count: donations.length,
        },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros inválidos',
          issues: err.errors,
        });
      }
      throw err;
    }
  });

  fastify.get('/operations', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureOperationalAccess(request.user);
      const query = listOperationalDonationsQuerySchema.parse(request.query);
      const where = buildOperationalWhere(query, request.user);
      const orderBy: Prisma.DonationOrderByWithRelationInput = {
        [query.sortBy]: query.direction,
      };

      const scopedDonations = await fastify.prisma.donation.findMany({
        where,
        orderBy,
        select: donationSelect,
      });

      const mappedDonations = scopedDonations.map((donation) => mapDonation(donation, request.user));
      const filteredDonations = query.actionableOnly
        ? mappedDonations.filter((donation) => donation.allowedNextStatuses.length > 0)
        : mappedDonations;
      const limitedDonations = filteredDonations.slice(0, query.limit);
      const partnerOptions = buildPartnerOptions(scopedDonations);

      return reply.send({
        data: limitedDonations,
        meta: {
          count: limitedDonations.length,
          actionableCount: mappedDonations.filter(
            (donation) => donation.allowedNextStatuses.length > 0,
          ).length,
          statusCounts: buildStatusCounts(filteredDonations),
          availableCollectionPoints: partnerOptions.collectionPoints,
          availableNgos: partnerOptions.ngos,
          filters: {
            status: query.status ?? null,
            collectionPointId: query.collectionPointId ?? null,
            ngoId: query.ngoId ?? null,
            actionableOnly: query.actionableOnly,
            sortBy: query.sortBy,
            direction: query.direction,
          },
        },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Parâmetros inválidos para a fila operacional',
          issues: err.errors,
        });
      }
      throw err;
    }
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const donation = await getAccessibleDonation(fastify, id, request.user);

      if (!donation) {
        throw new NotFoundError('Doação');
      }

      return reply.send(mapDonation(donation, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      throw err;
    }
  });

  fastify.get('/:id/timeline', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const donation = await getAccessibleDonation(fastify, id, request.user);

      if (!donation) {
        throw new NotFoundError('Doação');
      }

      return reply.send({
        donationId: donation.id,
        code: donation.code,
        status: donation.status,
        pointsAwarded: getDonationPoints(donation.status),
        data: donation.timeline.map(mapTimelineEvent),
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      throw err;
    }
  });

  fastify.patch('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateDonationStatusSchema.parse(request.body);

      const donation = await fastify.prisma.donation.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          donorId: true,
          collectionPointId: true,
          ngoId: true,
        },
      });

      if (!donation) {
        throw new NotFoundError('Doação');
      }

      ensureStatusUpdateAllowed(donation, request.user, body.status);
      ensureValidTransition(donation.status, body.status);

      const updatedDonation = await fastify.prisma.donation.update({
        where: { id },
        data: {
          status: body.status,
          timeline: {
            create: {
              status: body.status,
              description: body.description ?? STATUS_EVENT_DESCRIPTION[body.status],
              location: body.location,
              createdBy: request.user.id,
            },
          },
        },
        select: donationSelect,
      });

      const donorDonationsAfter = await loadDonorGamificationDonations(
        fastify,
        donation.donorId,
      );
      const donorDonationsBefore = donorDonationsAfter.map((record) =>
        record.id === updatedDonation.id ? { ...record, status: donation.status } : record,
      );
      const newlyUnlockedBadges = getNewlyUnlockedBadges(
        donorDonationsBefore,
        donorDonationsAfter,
      );
      const previousPoints = getDonationPointsValue(donation.status);
      const nextPoints = getDonationPointsValue(updatedDonation.status);
      const pointsDelta = nextPoints - previousPoints;
      const statusNotification = buildDonationStatusNotificationContent({
        status: updatedDonation.status,
        donationCode: updatedDonation.code,
        collectionPointName:
          updatedDonation.collectionPoint?.organizationName ??
          updatedDonation.collectionPoint?.name ??
          null,
        ngoName:
          updatedDonation.ngo?.organizationName ?? updatedDonation.ngo?.name ?? null,
      });

      await createNotifications(fastify, [
        ...(updatedDonation.status === DonationStatus.CANCELLED && request.user.id === donation.donorId
          ? []
          : [
              {
                userId: donation.donorId,
                type: 'DONATION_STATUS' as const,
                title: statusNotification.title,
                body: statusNotification.body,
                href: `/rastreio/${updatedDonation.id}`,
                payload: {
                  donationId: updatedDonation.id,
                  donationCode: updatedDonation.code,
                  status: updatedDonation.status,
                },
              },
            ]),
        ...(pointsDelta > 0
          ? [
              {
                userId: donation.donorId,
                type: 'DONATION_POINTS' as const,
                title: 'Pontuação atualizada',
                body: `A jornada ${updatedDonation.code} acrescentou +${pointsDelta} pontos ao seu impacto.`,
                href: `/rastreio/${updatedDonation.id}`,
                payload: {
                  donationId: updatedDonation.id,
                  donationCode: updatedDonation.code,
                  pointsDelta,
                  pointsTotal: nextPoints,
                  status: updatedDonation.status,
                },
              },
            ]
          : []),
        ...newlyUnlockedBadges.map((badge) => ({
          userId: donation.donorId,
          type: 'BADGE_EARNED' as const,
          title: `Badge conquistada: ${badge.label}`,
          body: badge.description,
          href: '/inicio',
          payload: {
            badgeId: badge.id,
          },
        })),
      ]);

      if (updatedDonation.status !== DonationStatus.CANCELLED) {
        await sendDonationStatusOperationalEmail(fastify, {
          userId: donation.donorId,
          donationId: updatedDonation.id,
          donationCode: updatedDonation.code,
          status: updatedDonation.status,
          collectionPointName:
            updatedDonation.collectionPoint?.organizationName ??
            updatedDonation.collectionPoint?.name ??
            null,
          ngoName:
            updatedDonation.ngo?.organizationName ?? updatedDonation.ngo?.name ?? null,
          pointsDelta,
        });
      }

      return reply.send(mapDonation(updatedDonation, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados inválidos para atualizar o status',
          issues: err.errors,
        });
      }
      throw err;
    }
  });
}
