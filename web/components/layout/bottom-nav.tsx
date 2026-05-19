'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getMobileNavItems, isNavigationItemActive } from '@/components/layout/navigation';

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navItems = getMobileNavItems(session?.user?.role ?? 'DONOR');
  const [hiddenOnMobile, setHiddenOnMobile] = useState(false);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setHiddenOnMobile(false);
      return;
    }

    const SCROLL_THRESHOLD = 10;
    const REVEAL_AT_TOP = 40;
    let ticking = false;

    function handleScroll() {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollRef.current;

        if (currentY <= REVEAL_AT_TOP) {
          setHiddenOnMobile(false);
        } else if (delta > SCROLL_THRESHOLD) {
          setHiddenOnMobile(true);
        } else if (delta < -SCROLL_THRESHOLD) {
          setHiddenOnMobile(false);
        }

        lastScrollRef.current = currentY;
        ticking = false;
      });
    }

    lastScrollRef.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setHiddenOnMobile(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.style.setProperty(
      '--mobile-bottom-nav-offset',
      hiddenOnMobile ? '0rem' : 'var(--mobile-bottom-nav-height)',
    );

    return () => {
      document.documentElement.style.setProperty(
        '--mobile-bottom-nav-offset',
        'var(--mobile-bottom-nav-height)',
      );
    };
  }, [hiddenOnMobile]);

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-white/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-transform duration-300 ease-out dark:border-white/10 dark:bg-surface-inkSoft/95 md:hidden motion-reduce:transition-none ${
        hiddenOnMobile ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="mx-auto flex h-mobilebar max-w-[40rem] items-center justify-between px-1">
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
