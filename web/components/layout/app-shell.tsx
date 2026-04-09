'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { useNotifications } from '@/hooks/use-notifications';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { unreadCount, preview, markAsRead } = useNotifications();

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar
        onMenuOpen={() => setSidebarOpen(true)}
        unreadCount={unreadCount}
        notifPreview={preview}
        onNotifRead={markAsRead}
      />
      <main className="mx-auto w-full max-w-shell pb-[calc(var(--mobile-nav-height)+0.75rem)] pt-[calc(var(--topbar-height)+0.75rem)] md:pb-8">
        <div className="min-h-[calc(100vh-var(--topbar-height)-1rem)]">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
