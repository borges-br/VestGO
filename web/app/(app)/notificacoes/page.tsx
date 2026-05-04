'use client';
import {
  Bell,
  Package,
  MapPin,
  Trophy,
  Settings,
  CheckCheck,
  ChevronRight,
  HeartHandshake,
  Truck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications, type AppNotification, type NotificationType } from '@/hooks/use-notifications';

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Bell; bg: string; color: string }> = {
  DONATION_STATUS: { icon: Package, bg: 'bg-primary-light', color: 'text-primary' },
  DONATION_POINTS: { icon: Trophy, bg: 'bg-amber-50', color: 'text-amber-600' },
  BADGE_EARNED: { icon: Trophy, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  DONATION_CREATED_FOR_POINT: { icon: MapPin, bg: 'bg-blue-50', color: 'text-blue-500' },
  PARTNERSHIP_REQUEST_RECEIVED: {
    icon: HeartHandshake,
    bg: 'bg-indigo-50',
    color: 'text-indigo-600',
  },
  PARTNERSHIP_STATUS_CHANGED: {
    icon: Settings,
    bg: 'bg-gray-100',
    color: 'text-gray-500',
  },
  PICKUP_REQUEST_CREATED: {
    icon: Truck,
    bg: 'bg-sky-50',
    color: 'text-sky-600',
  },
  PICKUP_REQUEST_RECEIVED: {
    icon: Truck,
    bg: 'bg-cyan-50',
    color: 'text-cyan-600',
  },
  PICKUP_REQUEST_STATUS_CHANGED: {
    icon: Truck,
    bg: 'bg-teal-50',
    color: 'text-teal-600',
  },
  PROFILE_APPROVAL_REQUIRED: {
    icon: Settings,
    bg: 'bg-amber-50',
    color: 'text-amber-700',
  },
  PROFILE_REVISION_PENDING: {
    icon: Settings,
    bg: 'bg-purple-50',
    color: 'text-purple-700',
  },
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

function groupNotifications(notifs: AppNotification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { label: string; items: AppNotification[] }[] = [
    { label: 'Hoje', items: [] },
    { label: 'Esta semana', items: [] },
    { label: 'Mais antigas', items: [] },
  ];

  for (const n of notifs) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d >= today) groups[0].items.push(n);
    else if (d >= weekAgo) groups[1].items.push(n);
    else groups[2].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}

function NotifCard({
  notif,
  onRead,
}: {
  notif: AppNotification;
  onRead: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const cfg = TYPE_CONFIG[notif.type];
  const Icon = cfg.icon;
  const handleOpen = async () => {
    await onRead(notif.id);

    if (notif.href) {
      router.push(notif.href);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleOpen()}
      className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors cursor-pointer ${
        !notif.read ? 'bg-primary-light/20' : 'hover:bg-surface'
      }`}
    >
      {/* Ícone */}
      <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon size={18} className={cfg.color} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!notif.read ? 'font-bold text-on-surface' : 'font-semibold text-gray-600'}`}>
            {notif.title}
          </p>
          {!notif.read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{notif.body}</p>
        <p className="text-[10px] text-gray-300 mt-1.5">{timeAgo(notif.createdAt)}</p>
      </div>

      {notif.href && <ChevronRight size={15} className="text-gray-300 flex-shrink-0 mt-3" />}
    </button>
  );
}

export default function NotificacoesPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const groups = groupNotifications(notifications);

  return (
    <div className="pb-2">
      {/* ── Header ── */}
      <section className="px-5 pt-6 pb-4 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
            Central
          </p>
          <h1 className="text-3xl font-bold text-primary-deeper">Notificações</h1>
          <p className="text-sm text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia ✓'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-light px-3 py-2 rounded-xl mt-1 hover:bg-primary/10 transition-colors active:scale-95"
          >
            <CheckCheck size={14} />
            Marcar todas
          </button>
        )}
      </section>

      {/* ── Lista agrupada ── */}
      {groups.length === 0 ? (
        <section className="px-5 py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Bell size={28} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-400">Nenhuma notificação ainda</p>
          <p className="text-sm text-gray-300 mt-1">Você será avisado sobre o status das suas doações aqui.</p>
        </section>
      ) : (
        <div className="space-y-4 mt-1">
          {groups.map((group) => (
            <section key={group.label}>
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase px-5 mb-1">
                {group.label}
              </p>
              <div className="bg-white shadow-card divide-y divide-gray-50">
                {group.items.map((n) => (
                  <NotifCard key={n.id} notif={n} onRead={markAsRead} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
