'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useCallback, useRef } from 'react';
import {
  HelpCircle,
  Home,
  LogOut,
  Map,
  MapPin,
  Package,
  Truck,
  User,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  DONOR: 'Doador',
  COLLECTION_POINT: 'Ponto de Coleta',
  NGO: 'ONG Parceira',
  ADMIN: 'Administrador',
};

const navItems = [
  { href: '/inicio', icon: Home, label: 'Inicio' },
  { href: '/mapa', icon: Map, label: 'Mapa' },
  { href: '/pontos', icon: MapPin, label: 'Pontos de coleta' },
  { href: '/doar', icon: Package, label: 'Nova doacao' },
  { href: '/rastreio', icon: Truck, label: 'Rastreio' },
  { href: '/perfil', icon: User, label: 'Perfil' },
  { href: '/suporte', icon: HelpCircle, label: 'Suporte / FAQ' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navRef = useRef<HTMLElement>(null);

  const userName = session?.user?.name ?? 'Usuario';
  const userRole = session?.user?.role ?? 'DONOR';
  const userEmail = session?.user?.email ?? '';
  const firstName = userName.split(' ')[0];
  const initials = userName
    .split(' ')
    .map((name) => name[0])
    .slice(0, 2)
    .join('');

  const handleNavWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
    const element = navRef.current;

    if (!element) {
      return;
    }

    const atTop = element.scrollTop === 0 && event.deltaY < 0;
    const atBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight && event.deltaY > 0;

    if (atTop || atBottom) {
      element.style.transition = 'transform 0.15s ease';
      element.style.transform = `translateY(${atTop ? '4px' : '-4px'})`;

      setTimeout(() => {
        if (element) {
          element.style.transform = 'translateY(0)';
        }
      }, 150);
    }
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white flex flex-col shadow-card-lg transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 pb-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              aria-label="Fechar menu"
              className="p-1.5 rounded-xl hover:bg-surface transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-3">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={userName}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <span className="text-xl font-bold text-primary">{initials}</span>
            )}
          </div>

          <h2 className="text-xl font-bold text-primary-deeper">Ola, {firstName}</h2>
          <p className="text-sm font-semibold text-primary mt-0.5">
            {ROLE_LABELS[userRole] ?? userRole}
          </p>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{userEmail}</p>
        </div>

        <div className="h-px bg-gray-100 mx-6" />

        <nav
          ref={navRef as React.RefObject<HTMLElement>}
          onWheel={handleNavWheel}
          className="flex-1 py-3 px-3 overflow-y-auto"
        >
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;

            return (
              <Link
                key={href + label}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl mb-0.5 transition-all ${
                  isActive
                    ? 'bg-primary-light text-primary font-semibold'
                    : 'text-gray-600 hover:bg-surface'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-primary' : 'text-gray-500'} />
                <span className="flex-1 text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="h-px bg-gray-100 mb-4" />
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm font-semibold">Sair da conta</span>
          </button>
          <p className="text-center text-[11px] text-gray-300 mt-3 tracking-widest uppercase">
            VestGO v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
