'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { AppNotification } from '@/hooks/use-notifications';
import { VestgoMark } from '@/components/branding/vestgo-mark';
import {
  ROLE_LABELS,
  getPrimaryNavItems,
  isNavigationItemActive,
} from '@/components/layout/navigation';

interface TopBarProps {
  onMenuOpen: () => void;
  unreadCount: number;
  notifPreview: AppNotification[];
  onNotifRead: (id: string) => Promise<void>;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `ha ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

export function TopBar({ onMenuOpen, unreadCount, notifPreview, onNotifRead }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userName = session?.user?.name ?? 'VestGO';
  const userRole = session?.user?.role ?? 'DONOR';
  const userImage = session?.user?.image ?? null;
  const primaryNavItems = getPrimaryNavItems(userRole);
  const firstName = userName.split(' ')[0];
  const initials = userName
    .split(' ')
    .map((name) => name[0])
    .slice(0, 2)
    .join('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/70 bg-white/95 shadow-nav backdrop-blur-xl">
      <div className="mx-auto flex h-topbar max-w-shell items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-[1.1]">
          <Link href="/inicio" className="flex min-w-0 items-center gap-3">
            <VestgoMark className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-tight text-primary-deeper">
                VestGO
              </p>
              <p className="hidden text-[11px] uppercase tracking-[0.28em] text-gray-400 lg:block">
                Doacoes rastreaveis
              </p>
            </div>
          </Link>
        </div>

        <nav className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white/85 p-1 shadow-sm">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavigationItemActive(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors lg:px-5 ${
                    isActive
                      ? 'bg-primary-deeper text-white'
                      : 'text-gray-500 hover:bg-surface hover:text-primary-deeper'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 lg:flex-[1.1]">
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen((value) => !value)}
              aria-label="Abrir notificacoes"
              aria-expanded={dropdownOpen}
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-[19rem] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-panel">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-bold text-on-surface">Notificacoes</p>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {unreadCount} novas
                    </span>
                  )}
                </div>

                <div className="divide-y divide-gray-50">
                  {notifPreview.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">Nenhuma notificacao</p>
                  ) : (
                    notifPreview.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={async () => {
                          await onNotifRead(notification.id);
                          setDropdownOpen(false);
                          if (notification.href) {
                            router.push(notification.href);
                          }
                        }}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-surface ${
                          !notification.read ? 'bg-primary-light/30' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!notification.read && (
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                          )}
                          <div className={`min-w-0 flex-1 ${notification.read ? 'pl-3.5' : ''}`}>
                            <p className="truncate text-xs font-semibold leading-snug text-on-surface">
                              {notification.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-400">
                              {notification.body}
                            </p>
                            <p className="mt-1 text-[10px] text-gray-300">
                              {timeAgo(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-gray-100">
                  <Link
                    href="/notificacoes"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
                  >
                    Ver todas as notificacoes
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onMenuOpen}
            aria-label="Abrir menu de conta e configuracoes"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Settings2 size={18} />
          </button>

          <Link
            href="/perfil"
            className="hidden items-center gap-3 rounded-2xl border border-gray-200 bg-white py-1.5 pl-2 pr-3 shadow-sm transition-colors hover:border-primary/30 sm:flex"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-primary-light text-sm font-semibold text-primary">
              {userImage ? (
                <img src={userImage} alt={userName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="hidden leading-tight lg:block">
              <p className="text-sm font-semibold text-on-surface">{firstName}</p>
              <p className="text-[11px] text-gray-400">
                {ROLE_LABELS[userRole] ?? userRole}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
