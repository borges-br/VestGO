'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getMobileNavItems, isNavigationItemActive } from '@/components/layout/navigation';

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navItems = getMobileNavItems(session?.user?.role ?? 'DONOR');

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/70 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-surface-inkSoft/95 md:hidden">
      <div className="mx-auto flex h-mobilebar max-w-[40rem] items-center justify-between px-1 pb-[max(env(safe-area-inset-bottom),0px)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavigationItemActive(pathname, item);
          const isPrimaryAction = item.href === '/doar' || item.href === '/operacoes';

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 flex-1 items-center justify-center"
            >
              <span
                className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-primary-deeper dark:text-primary-muted' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-colors ${
                    isActive
                      ? 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted'
                      : isPrimaryAction
                        ? 'bg-primary-deeper text-white dark:bg-primary dark:text-white'
                        : 'bg-transparent text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span className="truncate">{item.mobileLabel ?? item.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
