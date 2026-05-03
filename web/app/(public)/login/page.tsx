'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { ArrowRight, ArrowLeft, Eye, EyeOff, KeyRound, MapPin, ShieldCheck, Sparkles, User, Users } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { VestgoLogo } from '@/components/branding/vestgo-logo';
import { AuthSplitScene } from '@/components/ui/auth-split-scene';
import { cn } from '@/lib/utils';
import { loginWithCredentials, verifyTwoFactorLogin } from '@/lib/api';

type Tab = 'login' | 'register';

const profiles = [
  {
    icon: User,
    title: 'Doador',
    desc: 'Quero doar roupas e acompanhar minha solidariedade.',
    profile: 'DONOR',
    tone: 'bg-primary-light text-primary',
  },
  {
    icon: MapPin,
    title: 'Ponto de Coleta',
    desc: 'Minha empresa deseja ser um ponto logístico.',
    profile: 'COLLECTION_POINT',
    tone: 'bg-accent-amberSoft text-accent-amber',
  },
  {
    icon: Users,
    title: 'ONG Parceira',
    desc: 'Instituições que recebem e distribuem doações.',
    profile: 'NGO',
    tone: 'bg-accent-oliveSoft text-accent-olive',
  },
];

function sanitizeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith('/')) return '/inicio';
  return value;
}

function sanitizeRedirectTarget(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  if (value.startsWith('/')) return value;
  if (typeof window === 'undefined') return fallback;
  try {
    const url = new URL(value);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'));
  const authError = searchParams.get('error');
  const sessionExpired = searchParams.get('sessionExpired') === '1';
  const accountClosed = searchParams.get('accountClosed') === '1';

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const errorMessage = useMemo(() => {
    if (error) return error;
    if (accountClosed) return 'Sua conta foi encerrada. Você foi desconectado com segurança.';
    if (sessionExpired) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (authError) return 'E-mail ou senha incorretos.';
    return null;
  }, [accountClosed, authError, error, sessionExpired]);

  useEffect(() => {
    if (authError) setLoading(false);
  }, [authError]);

  async function completeSignInWithTokens(accessToken: string, refreshToken: string) {
    const result = await signIn('credentials', {
      accessToken,
      refreshToken,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError('Não foi possível concluir o login. Tente novamente.');
      setLoading(false);
      return;
    }

    await getSession();
    const destination = sanitizeRedirectTarget(result?.url, callbackUrl);
    router.replace(destination);
    router.refresh();
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await loginWithCredentials({ email, password });

      if ('requiresTwoFactor' in response) {
        setTwoFactorChallengeId(response.challengeId);
        setLoading(false);
        return;
      }

      await completeSignInWithTokens(response.accessToken, response.refreshToken);
    } catch {
      setError('E-mail ou senha incorretos.');
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!twoFactorChallengeId) return;

    setError(null);
    setLoading(true);

    try {
      const response = await verifyTwoFactorLogin(
        recoveryMode
          ? { challengeId: twoFactorChallengeId, recoveryCode }
          : { challengeId: twoFactorChallengeId, code: twoFactorCode },
      );

      await completeSignInWithTokens(response.accessToken, response.refreshToken);
    } catch {
      setError(
        recoveryMode
          ? 'Código de recuperação inválido ou já utilizado.'
          : 'Código inválido. Verifique o app autenticador e tente novamente.',
      );
      setLoading(false);
    }
  };

  function cancelTwoFactor() {
    setTwoFactorChallengeId(null);
    setTwoFactorCode('');
    setRecoveryCode('');
    setRecoveryMode(false);
    setError(null);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-surface-cream">
      <div className="mx-auto grid min-h-screen max-w-[1280px] grid-cols-1 md:grid-cols-[1fr_1fr]">
        {/* LEFT — institutional scene */}
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-deeper via-primary-dark to-primary md:block">
          <AuthSplitScene dotColor="rgba(255,255,255,0.28)" accentColor="#21d3c4" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(33,211,196,0.22),transparent_60%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-14">
            <div>
              <VestgoLogo
                className="h-10 w-40"
                fallbackTextClassName="text-white"
                imageClassName="brightness-0 invert"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-sm text-white"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <Sparkles size={13} /> Solidariedade em rede
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight lg:text-[2.5rem] lg:leading-[1.05]">
                Bem-vindo de volta à rede que conecta doação, ponto e ONG.
              </h2>
              <p className="mt-4 text-sm leading-7 text-primary-muted lg:text-base">
                Cada entrada sua reativa doações rastreáveis, relatórios da sua constância e a rede
                de pontos parceiros que confiam na sua contribuição.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/10 px-4 py-3 text-xs text-primary-muted backdrop-blur-sm"
            >
              <span className="flex h-2.5 w-2.5 animate-pulse-ring rounded-full bg-primary-glow" />
              <p className="text-white">
                <span className="font-semibold">+2,3k</span> doações registradas na última semana
              </p>
            </motion.div>
          </div>
        </aside>

        {/* RIGHT — form */}
        <main className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-md"
          >
            <div className="mb-8 flex items-center justify-between md:hidden">
              <VestgoLogo className="h-10 w-auto" fallbackTextClassName="text-left" />
              <Link href="/" className="text-xs font-semibold text-gray-500">
                Início
              </Link>
            </div>

            {/* Tab toggle — hidden during 2FA challenge */}
            {!twoFactorChallengeId && (
              <div className="mb-7 inline-flex rounded-full border border-gray-200 bg-white p-1 text-sm font-semibold shadow-card">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className={cn(
                    'rounded-full px-5 py-2 transition-all',
                    tab === 'login' ? 'bg-primary-deeper text-white shadow-sm' : 'text-gray-500 hover:text-primary-deeper',
                  )}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className={cn(
                    'rounded-full px-5 py-2 transition-all',
                    tab === 'register' ? 'bg-primary-deeper text-white shadow-sm' : 'text-gray-500 hover:text-primary-deeper',
                  )}
                >
                  Criar conta
                </button>
              </div>
            )}

            {twoFactorChallengeId ? (
              <>
                <button
                  type="button"
                  onClick={cancelTwoFactor}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-primary"
                >
                  <ArrowLeft size={13} />
                  Voltar para o login
                </button>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <ShieldCheck size={13} /> Verificação em 2 etapas
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-primary-deeper sm:text-[2.25rem]">
                  {recoveryMode ? 'Use um código de recuperação' : 'Confirme com o app autenticador'}
                </h1>
                <p className="mt-2 text-sm text-gray-500 sm:text-base">
                  {recoveryMode
                    ? 'Informe um dos códigos guardados ao ativar a 2FA. Cada código pode ser usado uma única vez.'
                    : 'Abra seu app autenticador e digite o código de 6 dígitos gerado para o VestGO.'}
                </p>

                <form onSubmit={handleTwoFactorSubmit} className="mt-6 space-y-4">
                  {recoveryMode ? (
                    <Field label="Código de recuperação" htmlFor="recovery">
                      <input
                        id="recovery"
                        type="text"
                        autoComplete="one-time-code"
                        inputMode="text"
                        required
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        placeholder="xxxxx-xxxxx"
                        className={inputClass}
                      />
                    </Field>
                  ) : (
                    <Field label="Código de 6 dígitos" htmlFor="totp">
                      <input
                        id="totp"
                        type="text"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className={cn(inputClass, 'tracking-[0.5em] text-center text-lg font-semibold')}
                      />
                    </Field>
                  )}

                  {errorMessage && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {errorMessage}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary-deeper px-5 py-4 text-sm font-bold text-white shadow-card transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? 'Verificando...' : 'Confirmar e entrar'}
                    {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                  </motion.button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode((v) => !v);
                    setError(null);
                  }}
                  className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-deeper"
                >
                  <KeyRound size={12} />
                  {recoveryMode ? 'Usar código do app autenticador' : 'Usar código de recuperação'}
                </button>
              </>
            ) : tab === 'login' ? (
              <>
                <h1 className="text-3xl font-extrabold tracking-tight text-primary-deeper sm:text-[2.25rem]">
                  Entrar na sua conta
                </h1>
                <p className="mt-2 text-sm text-gray-500 sm:text-base">
                  Continue de onde parou — suas doações e a sua rede seguem firmes.
                </p>

                {/* Google button — placeholder "em breve" */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Login com Google em breve"
                  className="group mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <GoogleIcon />
                  Continuar com Google
                  <span className="ml-1 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    em breve
                  </span>
                </button>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">ou</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label="E-mail" htmlFor="email">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@exemplo.com"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Senha" htmlFor="senha" hint={
                    <Link href="/esqueci-senha" className="text-xs font-semibold text-primary hover:text-primary-deeper">
                      Esqueci minha senha
                    </Link>
                  }>
                    <div className="relative">
                      <input
                        id="senha"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(inputClass, 'pr-12')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-primary-deeper"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <label className="flex cursor-pointer select-none items-center gap-3">
                    <span
                      onClick={() => setRemember(!remember)}
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors',
                        remember ? 'border-primary bg-primary' : 'border-gray-300 bg-white',
                      )}
                    >
                      {remember && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-gray-600">Manter sessão ativa</span>
                  </label>

                  {errorMessage && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {errorMessage}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary-deeper px-5 py-4 text-sm font-bold text-white shadow-card transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? 'Entrando...' : 'Entrar na conta'}
                    {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                  </motion.button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500">
                  Primeira vez no VestGO?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('register')}
                    className="font-semibold text-primary hover:text-primary-deeper"
                  >
                    Criar conta
                  </button>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-extrabold tracking-tight text-primary-deeper sm:text-[2.25rem]">
                  Escolha como participar
                </h1>
                <p className="mt-2 text-sm text-gray-500 sm:text-base">
                  Três formas de entrar na rede. A gente adapta o cadastro pra você.
                </p>

                <div className="mt-7 space-y-3">
                  {profiles.map(({ icon: Icon, title, desc, profile, tone }) => (
                    <Link
                      key={profile}
                      href={`/cadastro?perfil=${profile}&callbackUrl=${encodeURIComponent(callbackUrl)}`}
                      className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card-lg"
                    >
                      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tone)}>
                        <Icon size={20} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary-deeper">{title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{desc}</p>
                      </div>
                      <ArrowRight size={16} className="text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>

                <p className="mt-8 text-center text-sm text-gray-500">
                  Já tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="font-semibold text-primary hover:text-primary-deeper"
                  >
                    Entrar
                  </button>
                </p>
              </>
            )}

            <p className="mt-10 text-center text-[11px] leading-relaxed text-gray-400">
              Ao continuar você concorda com os{' '}
              <a href="#" className="text-primary hover:underline">Termos de Uso</a> e a{' '}
              <a href="#" className="text-primary hover:underline">Política de Privacidade</a>.
            </p>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-600">
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15';

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-cream">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
