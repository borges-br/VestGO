'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import {
  NotificationsProvider,
  useNotifications,
} from '@/hooks/use-notifications';

function AppShellChrome({
  children,
  sidebarOpen,
  setSidebarOpen,
}: {
  children: React.ReactNode;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { unreadCount, preview, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-ink">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar
        onMenuOpen={() => setSidebarOpen(true)}
        unreadCount={unreadCount}
        notifPreview={preview}
        onNotifRead={markAsRead}
        onMarkAllRead={markAllAsRead}
      />
      <main className="mx-auto w-full max-w-shell pb-[calc(var(--mobile-nav-height)+0.75rem)] pt-[calc(var(--topbar-height)+0.75rem)] md:pb-8">
        <div className="min-h-[calc(100vh-var(--topbar-height)-1rem)]">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showBareLayout = !session?.user && pathname === '/mapa';

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

  useEffect(() => {
    if (session?.error !== 'RefreshAccessTokenError') {
      return;
    }

    const callbackUrl = `/login?sessionExpired=1&callbackUrl=${encodeURIComponent(pathname)}`;
    void signOut({ callbackUrl });
  }, [pathname, session?.error]);

  if (showBareLayout) {
    return <div className="min-h-screen bg-surface">{children}</div>;
  }

  return (
    <NotificationsProvider accessToken={session?.user?.accessToken}>
      <AppShellChrome
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      >
        {children}
      </AppShellChrome>
    </NotificationsProvider>
  );
}
