'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, X } from 'lucide-react';
import {
  getPrimaryNavItems,
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

  const userName = session?.user?.name ?? 'Usuario';
  const userRole = session?.user?.role ?? 'DONOR';
  const userEmail = session?.user?.email ?? '';
  const utilityNavItems = getUtilityNavItems(userRole);
  const primaryNavLabels = getPrimaryNavItems(userRole).map((item) => item.label).join(', ');
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
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[22rem] flex-col bg-white shadow-panel transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Menu secundario
              </p>
              <h2 className="mt-1 text-lg font-bold text-primary-deeper">Conta e ajustes</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar menu"
              className="rounded-xl p-1.5 transition-colors hover:bg-surface"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="rounded-3xl bg-primary-deeper p-4 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light/10">
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
                <p className="text-xl font-bold">Ola, {firstName}</p>
                <p className="mt-0.5 text-sm font-semibold text-primary-muted">
                  {ROLE_LABELS[userRole] ?? userRole}
                </p>
                <p className="mt-1 truncate text-xs text-white/70">{userEmail}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="rounded-3xl bg-surface p-2">
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
                      ? 'bg-white text-primary-deeper shadow-sm'
                      : 'text-gray-600 hover:bg-white/70'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-primary-light text-primary' : 'bg-white text-gray-500'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.label === 'Operacoes'
                        ? 'Fila dedicada para pontos, ONGs e administracao'
                        : item.label === 'Governanca'
                          ? 'Aprovacoes iniciais e revisoes publicas pendentes'
                        : item.label === 'Perfil'
                          ? 'Acesse seu historico e dados principais'
                          : item.label === 'Configuracoes'
                            ? 'Preferencias, notificacoes e ajustes'
                            : item.label === 'Privacidade'
                              ? 'Seguranca da conta e dados pessoais'
                              : 'Ajuda, FAQ e canais de suporte'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Navegacao principal
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Sua navegacao principal atual fica disponivel no topo ou na barra inferior: {primaryNavLabels}.
              Este painel concentra atalhos secundarios e acesso rapido a operacoes e ajustes da conta.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 p-4">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut size={20} />
            <span className="text-sm font-semibold">Sair da conta</span>
          </button>
          <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-gray-300">
            VestGO v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
