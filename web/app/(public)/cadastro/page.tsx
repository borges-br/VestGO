'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  MapPin,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { VestgoLogo } from '@/components/branding/vestgo-logo';
import { AuthSplitScene } from '@/components/ui/auth-split-scene';
import { cn } from '@/lib/utils';

type Perfil = 'DONOR' | 'COLLECTION_POINT' | 'NGO';
type Step = 'perfil' | 'form' | 'success';

const perfis = [
  {
    id: 'DONOR' as Perfil,
    icon: User,
    title: 'Doador',
    desc: 'Quero doar roupas e acompanhar minha solidariedade.',
    tone: 'bg-primary-light text-primary',
  },
  {
    id: 'COLLECTION_POINT' as Perfil,
    icon: MapPin,
    title: 'Ponto de Coleta',
    desc: 'Minha empresa quer ser um ponto logístico parceiro.',
    tone: 'bg-accent-amberSoft text-accent-amber',
  },
  {
    id: 'NGO' as Perfil,
    icon: Users,
    title: 'ONG Parceira',
    desc: 'Instituição que recebe e distribui doações.',
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

function normalizePerfil(value: string | null): Perfil | null {
  if (!value) return null;
  const normalized = value.trim().replace(/-/g, '_').toUpperCase();
  const map: Record<string, Perfil> = {
    DONOR: 'DONOR',
    DOADOR: 'DONOR',
    COLLECTION_POINT: 'COLLECTION_POINT',
    PONTO: 'COLLECTION_POINT',
    NGO: 'NGO',
    ONG: 'NGO',
  };
  return map[normalized] ?? null;
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15';

function CadastroInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perfilParam = normalizePerfil(searchParams.get('perfil'));
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'));
  const initialPerfil: Perfil = perfilParam ?? 'DONOR';
  const initialStep: Step = perfilParam ? 'form' : 'perfil';

  const [step, setStep] = useState<Step>(initialStep);
  const [perfil, setPerfil] = useState<Perfil>(initialPerfil);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    organizationName: '',
  });

  const isOrg = perfil !== 'DONOR';

  const handleChange =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/backend/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: perfil,
          phone: form.phone || undefined,
          organizationName: isOrg ? form.organizationName || undefined : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message ?? 'Erro ao criar conta. Tente novamente.');
        return;
      }

      setStep('success');

      const orgCallbackUrl = callbackUrl === '/inicio' ? '/operacoes' : callbackUrl;
      const destination = isOrg
        ? `/perfil/operacional?setup=1&callbackUrl=${encodeURIComponent(orgCallbackUrl)}`
        : callbackUrl;

      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
        callbackUrl: destination,
      });

      if (result?.error) {
        setStep('form');
        setError('Conta criada, mas não foi possível entrar automaticamente.');
        return;
      }

      await getSession();
      const nextUrl = sanitizeRedirectTarget(result?.url, destination);
      router.replace(nextUrl);
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (step === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-cream px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-primary-light">
            <CheckCircle size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-primary-deeper">Conta criada!</h1>
          <p className="mt-2 text-sm text-gray-500">Entrando na sua conta...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-cream">
      <div className="mx-auto grid min-h-screen max-w-[1280px] grid-cols-1 md:grid-cols-[1fr_1fr]">
        {/* LEFT scene */}
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-deeper via-primary-dark to-primary md:block">
          <AuthSplitScene dotColor="rgba(255,255,255,0.28)" accentColor="#21d3c4" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(33,211,196,0.22),transparent_60%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 lg:p-14">
            <VestgoLogo className="h-10 w-40" imageClassName="brightness-0 invert" fallbackTextClassName="text-white" />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-sm text-white"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <Sparkles size={13} /> Começa aqui
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight lg:text-[2.5rem] lg:leading-[1.05]">
                Três papéis, uma rede. A sua solidariedade entra em fluxo.
              </h2>
              <p className="mt-4 text-sm leading-7 text-primary-muted lg:text-base">
                Doadores registram peças e acompanham o destino. Pontos operam a triagem.
                ONGs recebem e distribuem. Todos falando a mesma língua — a do cuidado.
              </p>
            </motion.div>

            <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/10 px-4 py-3 text-xs text-primary-muted backdrop-blur-sm">
              <span className="flex h-2.5 w-2.5 animate-pulse-ring rounded-full bg-primary-glow" />
              <p className="text-white">
                <span className="font-semibold">890</span> pontos parceiros ativos na rede
              </p>
            </div>
          </div>
        </aside>

        {/* RIGHT form */}
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

            {/* Header */}
            <div className="flex items-start gap-3">
              {step === 'form' ? (
                <button
                  onClick={() => setStep('perfil')}
                  aria-label="Voltar"
                  className="-ml-2 mt-1 rounded-xl p-2 text-gray-500 transition-colors hover:bg-white hover:text-primary-deeper"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  aria-label="Voltar para login"
                  className="-ml-2 mt-1 rounded-xl p-2 text-gray-500 transition-colors hover:bg-white hover:text-primary-deeper"
                >
                  <ArrowLeft size={18} />
                </Link>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  {step === 'perfil' ? 'Criar conta' : 'Cadastro'}
                </span>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-deeper sm:text-[2.25rem]">
                  {step === 'perfil'
                    ? 'Como você quer participar?'
                    : `Cadastro · ${perfis.find((p) => p.id === perfil)?.title}`}
                </h1>
                <p className="mt-2 text-sm text-gray-500 sm:text-base">
                  {step === 'perfil'
                    ? 'Escolha o papel que faz sentido pra você. Depois, ajustamos o formulário.'
                    : 'Só alguns campos pra liberar seu acesso à rede.'}
                </p>
              </div>
            </div>

            {step === 'perfil' ? (
              <>
                <div className="mt-7 space-y-3">
                  {perfis.map(({ id, icon: Icon, title, desc, tone }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setPerfil(id);
                        setStep('form');
                      }}
                      className={cn(
                        'group flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card-lg',
                        perfil === id ? 'border-primary/40' : 'border-gray-100',
                      )}
                    >
                      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tone)}>
                        <Icon size={20} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary-deeper">{title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{desc}</p>
                      </div>
                      <ArrowRight size={16} className="text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  ))}
                </div>

                <p className="mt-8 text-center text-sm text-gray-500">
                  Já tem conta?{' '}
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    className="font-semibold text-primary hover:text-primary-deeper"
                  >
                    Entrar
                  </Link>
                </p>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <Field label={isOrg ? 'Nome do responsável' : 'Seu nome completo'} htmlFor="name">
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder={isOrg ? 'João Responsável' : 'Maria Silva'}
                    className={inputClass}
                  />
                </Field>

                {isOrg && (
                  <Field
                    label={perfil === 'NGO' ? 'Nome da ONG' : 'Nome da empresa / ponto'}
                    htmlFor="orgName"
                  >
                    <input
                      id="orgName"
                      type="text"
                      value={form.organizationName}
                      onChange={handleChange('organizationName')}
                      placeholder={perfil === 'NGO' ? 'ONG Caminho da Luz' : 'Eco Store Pinheiros'}
                      className={inputClass}
                    />
                  </Field>
                )}

                <Field label="E-mail" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="nome@exemplo.com"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Telefone"
                  htmlFor="phone"
                  hint={<span className="text-xs text-gray-400">opcional</span>}
                >
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="(11) 99999-9999"
                    className={inputClass}
                  />
                </Field>

                <Field label="Senha" htmlFor="password">
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={handleChange('password')}
                      placeholder="Mínimo 8 caracteres"
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

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-4 text-sm font-bold text-white shadow-card transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Criando conta...' : 'Criar minha conta'}
                  {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                </motion.button>

                {isOrg && (
                  <div className="rounded-2xl bg-primary-light px-4 py-3 text-xs leading-relaxed text-primary-deeper">
                    Depois do cadastro, você completa o perfil público com endereço, horário,
                    itens aceitos e demais informações úteis para os doadores.
                  </div>
                )}

                <p className="text-center text-[11px] leading-relaxed text-gray-400">
                  Ao criar, você aceita os{' '}
                  <a href="#" className="text-primary hover:underline">Termos de Uso</a> e a{' '}
                  <a href="#" className="text-primary hover:underline">Política de Privacidade</a>.
                </p>
              </form>
            )}
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

export default function CadastroPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-cream">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CadastroInner />
    </Suspense>
  );
}
