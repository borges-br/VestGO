'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { MapPin, User, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { VestgoLogo } from '@/components/branding/vestgo-logo';
import { Input } from '@/components/ui/input';

type Tab = 'login' | 'register';

const profiles = [
  {
    icon: User,
    title: 'Doador',
    desc: 'Quero doar roupas e rastrear meu impacto.',
    profile: 'DONOR',
    color: 'bg-sky-100 text-sky-600',
  },
  {
    icon: MapPin,
    title: 'Ponto de Coleta',
    desc: 'Minha empresa deseja ser um ponto logistico.',
    profile: 'COLLECTION_POINT',
    color: 'bg-teal-100 text-teal-600',
  },
  {
    icon: Users,
    title: 'ONG Parceira',
    desc: 'Instituicoes que recebem e distribuem doacoes.',
    profile: 'NGO',
    color: 'bg-indigo-100 text-indigo-600',
  },
];

function sanitizeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith('/')) {
    return '/inicio';
  }

  return value;
}

function sanitizeRedirectTarget(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (value.startsWith('/')) {
    return value;
  }

  if (typeof window === 'undefined') {
    return fallback;
  }

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'));
  const authError = searchParams.get('error');
  const sessionExpired = searchParams.get('sessionExpired') === '1';

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorMessage = useMemo(() => {
    if (error) {
      return error;
    }

    if (sessionExpired) {
      return 'Sua sessao expirou. Entre novamente para continuar.';
    }

    if (authError) {
      return 'E-mail ou senha incorretos.';
    }

    return null;
  }, [authError, error, sessionExpired]);

  useEffect(() => {
    if (authError) {
      setLoading(false);
    }
  }, [authError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError('E-mail ou senha incorretos.');
        setLoading(false);
        return;
      }

      await getSession();
      const destination = sanitizeRedirectTarget(result?.url, callbackUrl);
      router.replace(destination);
      router.refresh();
    } catch {
      setError('Nao foi possivel entrar agora. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f4f5] flex flex-col">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col px-5 py-10">
        <div className="text-center mb-8">
          <div className="mx-auto flex justify-center">
            <VestgoLogo className="h-14 w-[210px]" fallbackTextClassName="text-left" />
          </div>
          <p className="text-sm text-gray-400 mt-3">
            Organizacao e transparencia nas suas doacoes.
          </p>
        </div>

        <div className="flex bg-white rounded-2xl p-1 mb-8 shadow-card">
          <button
            id="tab-login"
            onClick={() => setTab('login')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              tab === 'login'
                ? 'bg-primary-deeper text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            ENTRAR
          </button>
          <button
            id="tab-register"
            onClick={() => setTab('register')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              tab === 'register'
                ? 'bg-primary-deeper text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            COMECAR A DOAR
          </button>
        </div>

        {tab === 'login' ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
              <Input
                id="email"
                label="E-mail"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                required
              />
              <Input
                id="senha"
                label="Senha"
                hint="Esqueci minha senha"
                type="password"
                placeholder="********"
                value={password}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                required
              />

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setRemember(!remember)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    remember ? 'bg-primary border-primary' : 'border-gray-300 bg-white'
                  }`}
                >
                  {remember && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-600">Lembrar de mim</span>
              </label>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  {errorMessage}
                </div>
              )}

              <button
                id="btn-entrar"
                type="submit"
                disabled={loading}
                className="w-full bg-primary-deeper text-white font-semibold py-4 rounded-2xl hover:bg-primary-dark transition-all active:scale-[0.97] disabled:opacity-60 mt-2"
              >
                {loading ? 'Entrando...' : 'Entrar na conta'}
              </button>
            </form>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-200" />
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap">
                Ou escolha seu perfil para comecar
              </p>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center mb-6">
            Escolha como voce quer participar do VestGO:
          </p>
        )}

        <div className="space-y-3 mb-8">
          {profiles.map(({ icon: Icon, title, desc, profile, color }) => (
            <Link
              key={title}
              href={`/cadastro?perfil=${profile}&callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-card hover:shadow-card-lg transition-all active:scale-[0.98]"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="font-semibold text-sm text-on-surface">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full border border-gray-200 bg-white text-sm text-gray-500 font-medium py-4 rounded-2xl hover:bg-surface transition-colors"
        >
          Voltar para a pagina inicial
          <span className="text-gray-400">-&gt;</span>
        </Link>
      </div>
    </div>
  );
}
