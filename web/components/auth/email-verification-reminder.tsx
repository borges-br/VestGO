'use client';

import { useEffect, useState } from 'react';
import { MailCheck, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { requestEmailVerification } from '@/lib/api';

const REMINDER_SESSION_KEY = 'vestgo-email-verification-reminder-seen';

type ReminderStatus = 'idle' | 'sending' | 'sent' | 'skipped' | 'error';

export function EmailVerificationReminder() {
  const { data: session, update } = useSession();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ReminderStatus>('idle');

  useEffect(() => {
    if (!session?.user?.accessToken || session.user.emailVerifiedAt) {
      setOpen(false);
      return;
    }

    if (sessionStorage.getItem(REMINDER_SESSION_KEY) === '1') {
      return;
    }

    sessionStorage.setItem(REMINDER_SESSION_KEY, '1');
    setOpen(true);

    const timeout = window.setTimeout(() => setOpen(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, [session?.user?.accessToken, session?.user?.emailVerifiedAt]);

  if (!open || !session?.user?.accessToken || session.user.emailVerifiedAt) {
    return null;
  }

  const handleClose = () => setOpen(false);

  const handleResend = async () => {
    setStatus('sending');
    try {
      const response = await requestEmailVerification(session.user.accessToken);

      if (response.alreadyVerified) {
        await update({ user: { emailVerifiedAt: new Date().toISOString() } });
        setOpen(false);
        return;
      }

      setStatus(response.emailVerificationSent ? 'sent' : 'skipped');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-x-4 bottom-[calc(var(--mobile-nav-height)+1rem)] z-50 mx-auto max-w-md md:bottom-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-reminder-title"
        className="rounded-3xl border border-primary/15 bg-white p-5 shadow-panel dark:border-white/10 dark:bg-surface-inkSoft"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
            <MailCheck size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="email-reminder-title" className="text-base font-bold text-primary-deeper dark:text-white">
              Confirme seu e-mail
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-300">
              Enviamos um link de confirmação para seu e-mail. Confirme para manter sua conta segura e acessar todos os recursos do app.
            </p>

            <div aria-live="polite" className="mt-2 min-h-5 text-xs font-semibold">
              {status === 'sent' && (
                <span className="text-primary-deeper dark:text-primary-muted">Enviamos um novo link de confirmação.</span>
              )}
              {status === 'skipped' && (
                <span className="text-primary-deeper dark:text-primary-muted">Não foi possível enviar agora. Tente novamente em instantes.</span>
              )}
              {status === 'error' && (
                <span className="text-red-600 dark:text-red-300">Não foi possível enviar agora. Tente novamente em instantes.</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10"
              >
                Entendi
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={status === 'sending'}
                aria-busy={status === 'sending'}
                className="rounded-2xl bg-primary-deeper px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'sending' ? 'Enviando...' : 'Reenviar e-mail'}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar lembrete"
            className="rounded-xl p-1 text-gray-400 transition-colors hover:bg-surface hover:text-primary-deeper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
