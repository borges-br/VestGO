'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { requestEmailVerification } from '@/lib/api';
import {
  NotificationsProvider,
  useNotifications,
} from '@/hooks/use-notifications';

function EmailVerificationBanner() {
  const { data: session, update } = useSession();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'verified' | 'skipped' | 'error'>('idle');

  if (!session?.user?.accessToken || session.user.emailVerifiedAt) {
    return null;
  }

  const handleResend = async () => {
    setStatus('sending');
    try {
      const response = await requestEmailVerification(session.user.accessToken);
      if (response.alreadyVerified) {
        setStatus('verified');
        await update({ user: { emailVerifiedAt: new Date().toISOString() } });
        return;
      }

      setStatus(response.emailVerificationSent ? 'sent' : 'skipped');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mx-5 mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm sm:mx-6 lg:mx-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">E-mail nao confirmado</p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
            Confirme seu e-mail para manter sua conta segura e receber avisos importantes.
          </p>
          {status === 'sent' && (
            <p className="mt-1 text-xs font-semibold text-primary-deeper">
              Enviamos um novo link de confirmacao.
            </p>
          )}
          {status === 'skipped' && (
            <p className="mt-1 text-xs font-semibold text-primary-deeper">
              Envio de e-mail desativado neste ambiente.
            </p>
          )}
          {status === 'verified' && (
            <p className="mt-1 text-xs font-semibold text-primary-deeper">
              Este e-mail ja esta confirmado.
            </p>
          )}
          {status === 'error' && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              Nao foi possivel enviar agora. Tente novamente em instantes.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleResend}
          disabled={status === 'sending'}
          className="rounded-xl bg-primary-deeper px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === 'sending' ? 'Enviando...' : 'Reenviar confirmacao'}
        </button>
      </div>
    </div>
  );
}

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
        <div className="min-h-[calc(100vh-var(--topbar-height)-1rem)]">
          <EmailVerificationBanner />
          {children}
        </div>
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
