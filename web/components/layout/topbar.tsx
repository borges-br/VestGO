'use client';
import { useState, useRef, useEffect } from 'react';
import { Bell, Menu, CheckCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { AppNotification } from '@/hooks/use-notifications';

interface TopBarProps {
  onMenuOpen: () => void;
  unreadCount: number;
  notifPreview: AppNotification[];
  onNotifRead: (id: string) => void;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function TopBar({ onMenuOpen, unreadCount, notifPreview, onNotifRead }: TopBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100 relative z-30">
      <button
        onClick={onMenuOpen}
        aria-label="Abrir menu"
        className="p-2 -ml-2 rounded-xl hover:bg-surface transition-colors"
      >
        <Menu size={22} className="text-on-surface" />
      </button>

      <span className="text-lg font-bold text-primary-deeper tracking-tight">VestGO</span>

      {/* Bell com dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          aria-label="Notificações"
          aria-expanded={dropdownOpen}
          className="p-2 -mr-2 rounded-xl hover:bg-surface transition-colors relative"
        >
          <Bell size={22} className="text-on-surface" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <span className="text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>

        {/* Dropdown de prévia */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden">
            {/* Header do dropdown */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-on-surface">Notificações</p>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                  {unreadCount} novas
                </span>
              )}
            </div>

            {/* Prévia das notificações */}
            <div className="divide-y divide-gray-50">
              {notifPreview.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhuma notificação</p>
              ) : (
                notifPreview.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      onNotifRead(n.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-surface transition-colors ${
                      !n.read ? 'bg-primary-light/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                      <div className={`flex-1 min-w-0 ${n.read ? 'pl-3.5' : ''}`}>
                        <p className="text-xs font-semibold text-on-surface leading-snug truncate">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Rodapé — "Ver tudo" */}
            <div className="border-t border-gray-100">
              <Link
                href="/notificacoes"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-primary hover:bg-primary-light transition-colors"
              >
                Ver todas as notificações
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
