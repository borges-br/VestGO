'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, CheckCircle, Loader2, MailCheck, Sparkles, XCircle } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { VestgoLogo } from '@/components/branding/vestgo-logo';
import { AuthSplitScene } from '@/components/ui/auth-split-scene';
import { verifyEmail } from '@/lib/api';
import { cn } from '@/lib/utils';

type Status = 'loading' | 'success' | 'missing-token' | 'invalid-token' | 'error';

const statusContent: Record<Status, { title: string; message: string }> = {
  loading: {
    title: 'Confirmando e-mail',
    message: 'Estamos validando seu link de confirmacao.',
  },
  success: {
    title: 'E-mail confirmado',
    message: 'Tudo certo. Sua conta VestGO ja esta com o e-mail confirmado.',
  },
  'missing-token': {
    title: 'Link incompleto',
    message: 'Nao encontramos um token de confirmacao neste link.',
  },
  'invalid-token': {
    title: 'Link invalido ou expirado',
    message: 'Solicite um novo link de confirmacao para continuar.',
  },
  error: {
    title: 'Nao foi possivel confirmar',
    message: 'Tente novamente em instantes ou solicite um novo link.',
  },
};

function getSupportMailto() {
  const now = new Date().toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'indefinido';
  const userAgent = navigator.userAgent.slice(0, 140);
  const appUrl = `${window.location.origin}/confirmar-email`;
  const subject = 'Suporte VestGO - confirmacao de e-mail';
  const body = [
    'Olá, suporte.',
    '',
    'Estou com problema para confirmar meu e-mail no VestGO.',
    '',
    'Tipo: email_confirmation_failed',
    'Página: /confirmar-email',
    'Código: LINK_INVALID_OR_EXPIRED',
    `Domínio: ${window.location.origin}`,
    `URL pública: ${appUrl}`,
    `Data/hora local: ${now}`,
    `Timezone: ${timezone}`,
    `Navegador: ${userAgent}`,
    '',
    'Não incluí token ou dados sensíveis nesta mensagem.',
  ].join('\n');

  return `mailto:suporte@mosfet.com.br?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function ConfirmarEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { update } = useSession();
  const [status, setStatus] = useState<Status>('loading');
  const [supportHref, setSupportHref] = useState('mailto:suporte@mosfet.com.br');
  const verificationStartedRef = useRef(false);

  useEffect(() => {
    setSupportHref(getSupportMailto());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setStatus('missing-token');
        return;
      }

      if (verificationStartedRef.current) {
        return;
      }

      verificationStartedRef.current = true;

      try {
        const response = await verifyEmail(token);
        if (cancelled) return;

        setStatus('success');

        if (response.user.emailVerifiedAt) {
          await update({ user: { emailVerifiedAt: response.user.emailVerifiedAt } });
          window.localStorage.setItem('vestgo-email-verified-at', response.user.emailVerifiedAt);
          router.refresh();
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message.toLowerCase() : '';
        setStatus(message.includes('invalido') || message.includes('expirado') ? 'invalid-token' : 'error');
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [token, update]);

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const Icon = isLoading ? Loader2 : isSuccess ? CheckCircle : XCircle;
  const content = statusContent[status];

  return (
    <div className="min-h-screen bg-surface-cream dark:bg-surface-ink">
      <div className="mx-auto grid min-h-screen max-w-[1280px] grid-cols-1 md:grid-cols-[1fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-deeper via-primary-dark to-primary md:block">
          <AuthSplitScene dotColor="rgba(255,255,255,0.28)" accentColor="#21d3c4" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(33,211,196,0.22),transparent_60%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-14">
            <VestgoLogo className="h-10 w-40" fallbackTextClassName="text-white" imageClassName="brightness-0 invert" />
            <div className="max-w-sm text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <Sparkles size={13} /> Conta segura
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight lg:text-[2.5rem] lg:leading-[1.05]">
                A confirmacao protege sua jornada de doacao.
              </h2>
              <p className="mt-4 text-sm leading-7 text-primary-muted lg:text-base">
                Com o e-mail validado, avisos importantes da sua conta chegam com mais confianca.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/10 px-4 py-3 text-xs text-white backdrop-blur-sm">
              Links de seguranca expiram e so podem ser usados uma vez.
            </div>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-md"
            aria-live="polite"
          >
            <div className="mb-8 flex items-center justify-between md:hidden">
              <VestgoLogo className="h-10 w-auto" fallbackTextClassName="text-left dark:text-white" />
              <Link href="/login" className="text-xs font-semibold text-gray-500 hover:text-primary dark:text-gray-300 dark:hover:text-primary-muted">
                Login
              </Link>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-card dark:border-white/10 dark:bg-surface-inkSoft">
              <div
                className={cn(
                  'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl',
                  isSuccess
                    ? 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted'
                    : isLoading
                      ? 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted'
                      : 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-300',
                )}
                aria-hidden="true"
              >
                <Icon size={32} className={isLoading ? 'animate-spin' : undefined} />
              </div>

              <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-primary-deeper dark:text-white">
                {content.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-300">
                {content.message}
              </p>

              {!isSuccess && !isLoading && (
                <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
                  Por seguranca, nenhum dado do link foi exibido nesta tela.
                </div>
              )}

              <div className="mt-7 flex flex-col gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-inkSoft"
                >
                  Entrar
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/inicio"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10 dark:focus-visible:ring-offset-surface-inkSoft"
                >
                  <MailCheck size={16} />
                  Ir para o inicio
                </Link>
                {!isSuccess && !isLoading && (
                  <a
                    href={supportHref}
                    className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-red-900/70 dark:text-red-200 dark:hover:bg-red-950/40 dark:focus-visible:ring-offset-surface-inkSoft"
                  >
                    Entrar em contato com suporte
                  </a>
                )}
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-surface-cream dark:bg-surface-ink" aria-live="polite">
          <Loader2 className="animate-spin text-primary dark:text-primary-muted" size={28} />
        </main>
      }
    >
      <ConfirmarEmailInner />
    </Suspense>
  );
}
