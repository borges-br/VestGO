'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, Eye, EyeOff, KeyRound, Loader2, Sparkles, XCircle } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { VestgoLogo } from '@/components/branding/vestgo-logo';
import { AuthSplitScene } from '@/components/ui/auth-split-scene';
import { resetPassword } from '@/lib/api';
import { cn } from '@/lib/utils';

const inputBaseClass =
  'w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15 focus-visible:outline-none dark:bg-surface-ink dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary-muted dark:focus:ring-primary-muted/20';

function getTokenErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('invalido') || message.includes('expirado')) {
    return 'Link invalido ou expirado. Solicite uma nova redefinicao de senha.';
  }

  return 'Nao foi possivel redefinir a senha agora. Tente novamente em instantes.';
}

function RedefinirSenhaInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(token ? null : 'Link de redefinicao invalido.');

  const passwordInvalid = touched.password && password.length > 0 && password.length < 8;
  const confirmInvalid = touched.confirmPassword && confirmPassword.length > 0 && confirmPassword !== password;
  const hasToken = token.length > 0;
  const canSubmit = useMemo(
    () => hasToken && password.length >= 8 && password === confirmPassword && !loading,
    [confirmPassword, hasToken, loading, password],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    setFormError(null);

    if (!hasToken) {
      setFormError('Link de redefinicao invalido.');
      return;
    }

    if (password.length < 8) {
      setFormError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('As senhas nao conferem.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ token, password });
      setSuccess(true);
    } catch (err) {
      setFormError(getTokenErrorMessage(err));
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
                <Sparkles size={13} /> Nova senha
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight lg:text-[2.5rem] lg:leading-[1.05]">
                Crie uma senha nova e volte para sua conta.
              </h2>
              <p className="mt-4 text-sm leading-7 text-primary-muted lg:text-base">
                O link de redefinicao e temporario e deixa de funcionar depois do primeiro uso.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/10 px-4 py-3 text-xs text-white backdrop-blur-sm">
              Use pelo menos 8 caracteres e evite reutilizar senhas antigas.
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
              {success ? (
                <div className="text-center" aria-live="polite">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
                    <CheckCircle size={32} />
                  </div>
                  <h1 className="mt-5 text-2xl font-extrabold text-primary-deeper dark:text-white">
                    Senha alterada
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-300">
                    Sua senha foi redefinida. Entre novamente usando a nova senha.
                  </p>
                  <Link
                    href="/login"
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-inkSoft"
                  >
                    Entrar
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
                    <KeyRound size={26} />
                  </div>
                  <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-primary-deeper dark:text-white">
                    Nova senha
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-300">
                    Crie uma nova senha com pelo menos 8 caracteres.
                  </p>

                  {!hasToken && (
                    <div role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
                      <XCircle size={16} className="mt-0.5 shrink-0" />
                      <span>Link de redefinicao invalido. Solicite um novo link.</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
                    <PasswordField
                      id="password"
                      label="Nova senha"
                      value={password}
                      showPassword={showPassword}
                      invalid={passwordInvalid}
                      error="A senha precisa ter pelo menos 8 caracteres."
                      describedBy={passwordInvalid ? 'password-error' : 'password-help'}
                      onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                      onToggle={() => setShowPassword((value) => !value)}
                      onChange={setPassword}
                    />
                    <PasswordField
                      id="confirmPassword"
                      label="Confirmar nova senha"
                      value={confirmPassword}
                      showPassword={showPassword}
                      invalid={confirmInvalid}
                      error="As senhas nao conferem."
                      describedBy={confirmInvalid ? 'confirmPassword-error' : undefined}
                      onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                      onToggle={() => setShowPassword((value) => !value)}
                      onChange={setConfirmPassword}
                    />

                    {formError && (
                      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
                        {formError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !canSubmit}
                      aria-busy={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-surface-inkSoft"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          Alterar senha
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  showPassword,
  invalid,
  error,
  describedBy,
  onBlur,
  onToggle,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  showPassword: boolean;
  invalid: boolean;
  error: string;
  describedBy?: string;
  onBlur: () => void;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required
          minLength={8}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(
            inputBaseClass,
            'pr-12',
            invalid
              ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500/15 dark:border-red-800 dark:text-red-100 dark:focus:border-red-400 dark:focus:ring-red-400/20'
              : 'border-gray-200 dark:border-white/10',
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute inset-y-0 right-4 flex items-center text-gray-400 transition-colors hover:text-primary-deeper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-gray-400 dark:hover:text-primary-muted dark:focus-visible:ring-offset-surface-ink"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {id === 'password' && !invalid && (
        <p id="password-help" className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          Minimo de 8 caracteres.
        </p>
      )}
      {invalid && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-surface-cream dark:bg-surface-ink" aria-live="polite">
          <Loader2 className="animate-spin text-primary dark:text-primary-muted" size={28} />
        </main>
      }
    >
      <RedefinirSenhaInner />
    </Suspense>
  );
}
