'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationRecord,
  type NotificationType,
} from '@/lib/api';

export type { NotificationType };

export interface AppNotification extends Omit<NotificationRecord, 'createdAt' | 'href'> {
  href?: string;
  createdAt: Date;
}

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  preview: AppNotification[];
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function mapApiNotification(notification: NotificationRecord): AppNotification {
  return {
    ...notification,
    href: notification.href ?? undefined,
    createdAt: new Date(notification.createdAt),
  };
}

export function NotificationsProvider({
  accessToken,
  children,
}: {
  accessToken?: string;
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const refreshRequestIdRef = useRef(0);
  const mutationVersionRef = useRef(0);
  const pendingMutationsRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      if (mountedRef.current) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
      }
      return;
    }

    if (pendingMutationsRef.current > 0) {
      return;
    }

    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;
    const mutationVersionAtStart = mutationVersionRef.current;

    setLoading(true);

    try {
      const response = await getNotifications(accessToken, { limit: 50 });

      if (
        !mountedRef.current ||
        requestId !== refreshRequestIdRef.current ||
        mutationVersionAtStart !== mutationVersionRef.current
      ) {
        return;
      }

      setNotifications(response.data.map(mapApiNotification));
      setUnreadCount(response.meta.unreadCount);
    } catch {
      if (
        mountedRef.current &&
        requestId === refreshRequestIdRef.current &&
        pendingMutationsRef.current === 0
      ) {
        setNotifications((current) => current);
      }
    } finally {
      if (mountedRef.current && requestId === refreshRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [accessToken]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const handleFocus = () => {
      void refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    const interval = window.setInterval(() => {
      void refresh();
    }, 60000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, refresh]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!accessToken) {
        return;
      }

      mutationVersionRef.current += 1;
      pendingMutationsRef.current += 1;
      let shouldRequest = false;
      let shouldRefreshOnFailure = false;
      const optimisticReadAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => {
          if (notification.id !== id || notification.read) {
            return notification;
          }

          shouldRequest = true;
          return {
            ...notification,
            read: true,
            readAt: optimisticReadAt,
          };
        }),
      );

      if (!shouldRequest) {
        pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
        return;
      }

      setUnreadCount((current) => Math.max(0, current - 1));

      try {
        const updated = mapApiNotification(await markNotificationAsRead(id, accessToken));

        if (!mountedRef.current) {
          return;
        }

        setNotifications((current) =>
          current.map((notification) => (notification.id === id ? updated : notification)),
        );
      } catch {
        shouldRefreshOnFailure = true;
      } finally {
        pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);

        if (shouldRefreshOnFailure) {
          await refresh();
        }
      }
    },
    [accessToken, refresh],
  );

  const markAllAsRead = useCallback(async () => {
    if (!accessToken || unreadCount === 0) {
      return;
    }

    mutationVersionRef.current += 1;
    pendingMutationsRef.current += 1;
    let shouldRefreshOnFailure = false;
    const now = new Date().toISOString();

    setNotifications((current) =>
      current.map((notification) =>
        notification.read
          ? notification
          : {
              ...notification,
              read: true,
              readAt: now,
            },
      ),
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead(accessToken);
    } catch {
      shouldRefreshOnFailure = true;
    } finally {
      pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);

      if (shouldRefreshOnFailure) {
        await refresh();
      }
    }
  }, [accessToken, refresh, unreadCount]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      preview: notifications.slice(0, 5),
      loading,
      refresh,
      markAsRead,
      markAllAsRead,
    }),
    [loading, markAllAsRead, markAsRead, notifications, refresh, unreadCount],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications precisa ser usado dentro de NotificationsProvider.');
  }

  return context;
}
