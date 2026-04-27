'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2, Mail, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { VestgoLogo } from '@/components/branding/vestgo-logo';
import { AuthSplitScene } from '@/components/ui/auth-split-scene';
import { requestPasswordReset } from '@/lib/api';
import { cn } from '@/lib/utils';

const genericSuccessMessage =
  'Se o e-mail estiver cadastrado, enviaremos as instrucoes de redefinicao.';

const inputClass =
  'w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15 focus-visible:outline-none dark:bg-surface-ink dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary-muted dark:focus:ring-primary-muted/20';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailInvalid = useMemo(() => touched && email.length > 0 && !isValidEmail(email), [email, touched]);
  const emailErrorId = emailInvalid ? 'email-error' : undefined;
  const emailHelpId = sent ? 'reset-status' : emailErrorId;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (!isValidEmail(email) || loading) {
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError('Nao foi possivel enviar a solicitacao agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

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
                <Sparkles size={13} /> Acesso seguro
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight lg:text-[2.5rem] lg:leading-[1.05]">
                Recupere o acesso sem interromper sua jornada.
              </h2>
              <p className="mt-4 text-sm leading-7 text-primary-muted lg:text-base">
                Enviaremos um link de uso unico para criar uma nova senha, se o e-mail estiver cadastrado.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/10 px-4 py-3 text-xs text-white backdrop-blur-sm">
              Nao informamos se uma conta existe para proteger sua privacidade.
            </div>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-md"
          >
            <div className="mb-8 flex items-center justify-between md:hidden">
              <VestgoLogo className="h-10 w-auto" fallbackTextClassName="text-left dark:text-white" />
              <Link href="/login" className="text-xs font-semibold text-gray-500 hover:text-primary dark:text-gray-300 dark:hover:text-primary-muted">
                Login
              </Link>
            </div>

            <Link
              href="/login"
              className="mb-6 hidden items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-cream md:inline-flex dark:text-gray-300 dark:hover:text-primary-muted dark:focus-visible:ring-offset-surface-ink"
            >
              <ArrowLeft size={14} />
              Voltar ao login
            </Link>

            <div className="rounded-3xl border border-gray-100 bg-white p-7 shadow-card dark:border-white/10 dark:bg-surface-inkSoft">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
                <Mail size={26} />
              </div>
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-primary-deeper dark:text-white">
                Redefinir senha
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-300">
                Informe seu e-mail para receber instrucoes de redefinicao.
              </p>

              {sent ? (
                <div
                  id="reset-status"
                  aria-live="polite"
                  className="mt-7 rounded-2xl border border-primary/15 bg-primary-light px-4 py-4 text-sm leading-relaxed text-primary-deeper dark:border-primary/30 dark:bg-primary/15 dark:text-primary-muted"
                >
                  {genericSuccessMessage}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-200">
                      E-mail
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onBlur={() => setTouched(true)}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nome@exemplo.com"
                      aria-invalid={emailInvalid}
                      aria-describedby={emailHelpId}
                      className={cn(
                        inputClass,
                        emailInvalid
                          ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500/15 dark:border-red-800 dark:text-red-100 dark:focus:border-red-400 dark:focus:ring-red-400/20'
                          : 'border-gray-200 dark:border-white/10',
                      )}
                    />
                    {emailInvalid && (
                      <p id="email-error" role="alert" className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-300">
                        Informe um e-mail valido.
                      </p>
                    )}
                  </div>

                  {error && (
                    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-surface-inkSoft"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Enviar link
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}
