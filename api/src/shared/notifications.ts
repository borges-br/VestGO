import {
  DonationStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { FastifyInstance } from 'fastify';

type NotificationPayload = Prisma.InputJsonValue;

type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  payload?: NotificationPayload | null;
};

export const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  href: true,
  payload: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

type NotificationRecord = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

type GamificationDonation = {
  id: string;
  status: DonationStatus;
  createdAt: Date;
  collectionPointId: string | null;
};

type BadgeDefinition = {
  id: string;
  label: string;
  description: string;
};

const STATUS_POINTS: Record<DonationStatus, number> = {
  PENDING: 60,
  AT_POINT: 90,
  IN_TRANSIT: 110,
  DELIVERED: 150,
  DISTRIBUTED: 180,
  CANCELLED: 0,
};

const TRACKED_STATUSES: DonationStatus[] = [
  DonationStatus.AT_POINT,
  DonationStatus.IN_TRANSIT,
  DonationStatus.DELIVERED,
  DonationStatus.DISTRIBUTED,
];

function getMonthKey(input: Date) {
  return `${input.getUTCFullYear()}-${String(input.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getMonthlyStreak(donations: GamificationDonation[]) {
  if (donations.length === 0) {
    return 0;
  }

  const monthSet = new Set(donations.map((donation) => getMonthKey(donation.createdAt)));
  const ordered = [...donations].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const mostRecent = ordered[0].createdAt;
  const cursor = new Date(
    Date.UTC(mostRecent.getUTCFullYear(), mostRecent.getUTCMonth(), 1),
  );
  let streak = 0;

  while (monthSet.has(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`)) {
    streak += 1;
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }

  return streak;
}

function getEarnedBadges(donations: GamificationDonation[]): BadgeDefinition[] {
  const ordered = [...donations].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const trackedCount = ordered.filter((donation) => TRACKED_STATUSES.includes(donation.status)).length;
  const usedDropOffPoints = new Set(
    ordered.map((donation) => donation.collectionPointId).filter(Boolean),
  ).size;
  const streakMonths = getMonthlyStreak(ordered);

  const badges: Array<BadgeDefinition & { earned: boolean }> = [
    {
      id: 'first-donation',
      label: 'Primeira entrega',
      description: 'Reconhece a primeira doacao registrada na plataforma.',
      earned: ordered.length >= 1,
    },
    {
      id: 'tracked-impact',
      label: 'Jornada rastreada',
      description: 'Doacao acompanhada ate uma etapa real da jornada logistica.',
      earned: trackedCount >= 1,
    },
    {
      id: 'steady-donor',
      label: 'Constancia solidaria',
      description: 'Participacao recorrente em mais de um ciclo mensal.',
      earned: streakMonths >= 2,
    },
    {
      id: 'local-impact',
      label: 'Impacto local',
      description: 'Uso recorrente da rede parceira em mais de um ponto da comunidade.',
      earned: usedDropOffPoints >= 2,
    },
    // Placeholder para badges futuras:
    // - badges sazonais por campanha
    // - badges por volume de itens por categoria
    // - badges por recorrencia em janelas customizadas
    // - badges por engajamento comunitario/local ranking
  ];

  return badges.filter((badge) => badge.earned);
}

export function getNewlyUnlockedBadges(
  before: GamificationDonation[],
  after: GamificationDonation[],
) {
  const beforeIds = new Set(getEarnedBadges(before).map((badge) => badge.id));

  return getEarnedBadges(after).filter((badge) => !beforeIds.has(badge.id));
}

export function getDonationPointsValue(status: DonationStatus) {
  return STATUS_POINTS[status] ?? 0;
}

export function mapNotification(notification: NotificationRecord) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    payload: notification.payload ?? null,
    read: notification.readAt != null,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function createNotifications(
  fastify: FastifyInstance,
  notifications: NotificationInput[],
) {
  const data = notifications
    .filter((notification) => notification.userId)
    .map((notification) => ({
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      href: notification.href ?? null,
      ...(notification.payload != null ? { payload: notification.payload } : {}),
    }));

  if (data.length === 0) {
    return;
  }

  await fastify.prisma.notification.createMany({
    data,
  });
}

export async function createAdminNotifications(
  fastify: FastifyInstance,
  notifications: Omit<NotificationInput, 'userId'>[],
) {
  if (notifications.length === 0) {
    return;
  }

  const admins = await fastify.prisma.user.findMany({
    where: {
      role: UserRole.ADMIN,
    },
    select: {
      id: true,
    },
  });

  if (admins.length === 0) {
    return;
  }

  await createNotifications(
    fastify,
    admins.flatMap((admin) =>
      notifications.map((notification) => ({
        ...notification,
        userId: admin.id,
      })),
    ),
  );
}

export async function loadDonorGamificationDonations(
  fastify: FastifyInstance,
  donorId: string,
) {
  return fastify.prisma.donation.findMany({
    where: { donorId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      collectionPointId: true,
    },
  });
}
