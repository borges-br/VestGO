'use client';
import { useRef, useCallback } from 'react';
import { X, Home, Map, MapPin, Package, Truck, User, HelpCircle, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: '/inicio', icon: Home, label: 'Início' },
  { href: '/mapa', icon: Map, label: 'Mapa' },
  { href: '/pontos', icon: MapPin, label: 'Pontos de coleta' },
  { href: '/doacoes', icon: Package, label: 'Minhas doações', badge: 2 },
  { href: '/rastreio', icon: Truck, label: 'Rastreio' },
  { href: '/perfil', icon: User, label: 'Perfil' },
  { href: '/suporte', icon: HelpCircle, label: 'Suporte / FAQ' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navRef = useRef<HTMLElement>(null);

  const userName = session?.user?.name ?? 'Usuário';
  const firstName = userName.split(' ')[0];
  const initials = userName.split(' ').map((n) => n[0]).slice(0, 2).join('');

  // Bounce leve quando o usuário tenta rolar além dos limites
  const handleNavWheel = useCallback((e: React.WheelEvent<HTMLElement>) => {
    const el = navRef.current;
    if (!el) return;
    const atTop = el.scrollTop === 0 && e.deltaY < 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight && e.deltaY > 0;
    if (atTop || atBottom) {
      el.style.transition = 'transform 0.15s ease';
      el.style.transform = `translateY(${atTop ? '4px' : '-4px'})`;
      setTimeout(() => {
        if (el) {
          el.style.transform = 'translateY(0)';
        }
      }, 150);
    }
  }, []);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Painel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white flex flex-col shadow-card-lg transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header do perfil */}
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

          {/* Avatar com iniciais */}
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

          <h2 className="text-xl font-bold text-primary-deeper">Olá, {firstName}</h2>
          <p className="text-sm font-semibold text-primary mt-0.5">Doador Nível Ouro</p>
          <p className="text-sm text-gray-500 mt-0.5">Impacto: 12kg doados</p>
        </div>

        <div className="h-px bg-gray-100 mx-6" />

        {/* Navegação */}
        <nav
          ref={navRef as React.RefObject<HTMLElement>}
          onWheel={handleNavWheel}
          className="flex-1 py-3 px-3 overflow-y-auto"
        >
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
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
                {badge && (
                  <span className="bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé */}
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
