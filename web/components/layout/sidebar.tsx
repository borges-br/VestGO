'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ChevronRight, LogOut, X } from 'lucide-react';
import {
  getUtilityNavItems,
  ROLE_LABELS,
  isNavigationItemActive,
} from '@/components/layout/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name ?? 'Usuário';
  const userRole = session?.user?.role ?? 'DONOR';
  const userEmail = session?.user?.email ?? '';
  const utilityNavItems = getUtilityNavItems(userRole);
  const firstName = userName.split(' ')[0];
  const initials = userName
    .split(' ')
    .map((name) => name[0])
    .slice(0, 2)
    .join('');

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[22rem] flex-col bg-white shadow-panel transition-transform duration-300 ease-in-out dark:bg-surface-inkSoft ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="border-b border-gray-100 px-5 py-4 dark:border-white/10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-primary-deeper dark:text-primary-muted">Conta e ajustes</h2>
            <button
              onClick={onClose}
              aria-label="Fechar menu"
              className="rounded-xl p-1.5 transition-colors hover:bg-surface dark:hover:bg-white/10"
            >
              <X size={20} className="text-gray-400 dark:text-gray-400" />
            </button>
          </div>

          <Link
            href="/perfil"
            onClick={onClose}
            className="group flex items-center gap-4 rounded-3xl bg-primary-deeper p-4 text-white transition-colors hover:bg-primary-dark"
          >
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-light/10">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={userName}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-white">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold">Olá, {firstName}</p>
              <p className="mt-0.5 text-sm font-semibold text-primary-muted">
                {ROLE_LABELS[userRole] ?? userRole}
              </p>
              <p className="mt-1 truncate text-xs text-white/70">{userEmail}</p>
            </div>
            <ChevronRight
              size={18}
              className="flex-shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="rounded-3xl bg-surface p-2 dark:bg-surface-ink">
            {utilityNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavigationItemActive(pathname, item);

              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`mb-1 flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all ${
                    isActive
                      ? 'bg-white text-primary-deeper shadow-sm dark:bg-surface-inkSoft dark:text-primary-muted dark:shadow-none'
                      : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-white/5'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      isActive
                        ? 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted'
                        : 'bg-white text-gray-500 dark:bg-white/5 dark:text-gray-400'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {item.label === 'Operações'
                        ? 'Fila dedicada para pontos, ONGs e administração'
                        : item.label === 'Governança'
                          ? 'Aprovações iniciais e revisões públicas pendentes'
                        : item.label === 'Campanhas Sazonais'
                          ? 'Eventos sazonais e multiplicadores futuros'
                        : item.label === 'Perfil'
                          ? 'Acesse seu histórico e dados principais'
                          : item.label === 'Configurações'
                            ? 'Preferências, notificações e ajustes'
                            : item.label === 'Privacidade'
                              ? 'Segurança da conta e dados pessoais'
                              : 'Ajuda, FAQ e canais de suporte'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

        </div>

        <div className="border-t border-gray-100 p-4 dark:border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut size={20} />
            <span className="text-sm font-semibold">Sair da conta</span>
          </button>
          <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-gray-300 dark:text-gray-600">
            VestGO v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
