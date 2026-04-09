'use client';
import { Home, Map, Plus, Truck, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/inicio', icon: Home, label: 'Início' },
  { href: '/mapa', icon: Map, label: 'Mapa' },
  { href: '/doar', icon: Plus, label: '', isFab: true },
  { href: '/rastreio', icon: Truck, label: 'Rastreio' },
  { href: '/perfil', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-16 flex items-center px-4 z-40">
      <div className="max-w-sm mx-auto w-full flex justify-between items-end pb-1">
        {navItems.map(({ href, icon: Icon, label, isFab }) => {
          const isActive = pathname === href;

          if (isFab) {
            return (
              <Link
                key={href}
                href={href}
                aria-label="Nova doação"
                className="flex flex-col items-center -mt-7"
              >
                <div className="bg-primary w-14 h-14 rounded-2xl flex items-center justify-center shadow-fab transition-transform active:scale-95">
                  <Plus size={26} className="text-white" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}