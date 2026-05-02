'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ArrowRight, CheckCircle, Loader2, ShieldAlert, Sparkles, XCircle } from 'lucide-react';
import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { VestgoLogo } from '@/components/branding/vestgo-logo';
import { AuthSplitScene } from '@/components/ui/auth-split-scene';
import { confirmAccountDeletion } from '@/lib/api';
import { cn } from '@/lib/utils';

type Status = 'ready' | 'submitting' | 'success' | 'missing-token' | 'invalid-token' | 'error';

const statusContent: Record<Status, { title: string; message: string }> = {
  ready: {
    title: 'Confirmar encerramento',
    message: 'Revise a ação e confirme para encerrar a conta.',
  },
  submitting: {
    title: 'Encerrando conta',
    message: 'Estamos validando o link de confirmação.',
  },
  success: {
    title: 'Conta encerrada',
    message: 'Seu acesso foi encerrado e os dados pessoais da conta foram anonimizados.',
  },
  'missing-token': {
    title: 'Link incompleto',
    message: 'Não encontramos um token de encerramento neste link.',
  },
  'invalid-token': {
    title: 'Link inválido ou expirado',
    message: 'O link pode ter expirado ou já ter sido usado.',
  },
  error: {
    title: 'Não foi possível encerrar',
    message: 'Tente novamente em instantes ou fale com o suporte.',
  },
};

function EncerrarContaInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>('ready');

  async function handleConfirmAccountDeletion() {
    if (!token) {
      setStatus('missing-token');
      return;
    }

    setStatus('submitting');

    try {
      await confirmAccountDeletion(token);
      setStatus('success');
      await signOut({ redirect: false });
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      setStatus(
        message.includes('invalido') || message.includes('expirado')
          ? 'invalid-token'
          : 'error',
      );
    }
  }

  const effectiveStatus = token ? status : 'missing-token';
  const isSubmitting = effectiveStatus === 'submitting';
  const isSuccess = effectiveStatus === 'success';
  const isReady = effectiveStatus === 'ready';
  const hasErrorState =
    effectiveStatus === 'missing-token' ||
    effectiveStatus === 'invalid-token' ||
    effectiveStatus === 'error';
  const Icon = isSubmitting ? Loader2 : isSuccess ? CheckCircle : isReady ? ShieldAlert : XCircle;
  const content = statusContent[effectiveStatus];

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
                <Sparkles size={13} /> Privacidade
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight lg:text-[2.5rem] lg:leading-[1.05]">
                Encerramento com confirmação e proteção de histórico.
              </h2>
              <p className="mt-4 text-sm leading-7 text-primary-muted lg:text-base">
                Dados pessoais são anonimizados sem apagar registros operacionais de doações e rastreios.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/10 px-4 py-3 text-xs text-white backdrop-blur-sm">
              Links de segurança expiram e só podem ser usados uma vez.
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
                    : isSubmitting || isReady
                      ? 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted'
                      : 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-300',
                )}
                aria-hidden="true"
              >
                <Icon size={32} className={isSubmitting ? 'animate-spin' : undefined} />
              </div>

              <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-primary-deeper dark:text-white">
                {content.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-300">
                {content.message}
              </p>

              {isReady && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
                  Esta ação é irreversível para o acesso da conta. A confirmação só será enviada à API após clicar no botão abaixo.
                </div>
              )}

              {hasErrorState && (
                <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
                  Por segurança, nenhum dado do link foi exibido nesta tela.
                </div>
              )}

              {isSuccess && (
                <div className="mt-5 rounded-2xl border border-primary/20 bg-primary-light px-4 py-3 text-sm text-primary-deeper dark:border-primary/40 dark:bg-primary/20 dark:text-primary-muted">
                  O histórico operacional pode continuar existindo sem dados pessoais vinculados.
                </div>
              )}

              <div className="mt-7 flex flex-col gap-2">
                {token && !isSuccess && (
                  <button
                    type="button"
                    onClick={handleConfirmAccountDeletion}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-inkSoft"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                    {isSubmitting ? 'Confirmando...' : 'Confirmar encerramento'}
                  </button>
                )}
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-inkSoft"
                >
                  Ir para login
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10 dark:focus-visible:ring-offset-surface-inkSoft"
                >
                  <ShieldAlert size={16} />
                  Voltar ao início
                </Link>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}

export default function EncerrarContaPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-surface-cream dark:bg-surface-ink" aria-live="polite">
          <Loader2 className="animate-spin text-primary dark:text-primary-muted" size={28} />
        </main>
      }
    >
      <EncerrarContaInner />
    </Suspense>
  );
}
