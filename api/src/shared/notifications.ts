import {
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
