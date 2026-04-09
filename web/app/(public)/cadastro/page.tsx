'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  MapPin,
  User,
  Users,
} from 'lucide-react';

type Perfil = 'DONOR' | 'COLLECTION_POINT' | 'NGO';
type Step = 'perfil' | 'form' | 'success';

const perfis = [
  {
    id: 'DONOR' as Perfil,
    icon: User,
    title: 'Doador',
    desc: 'Quero doar roupas e acompanhar meu impacto.',
    color: 'bg-sky-100 text-sky-600',
  },
  {
    id: 'COLLECTION_POINT' as Perfil,
    icon: MapPin,
    title: 'Ponto de Coleta',
    desc: 'Minha empresa quer ser um ponto logistico parceiro.',
    color: 'bg-teal-100 text-teal-600',
  },
  {
    id: 'NGO' as Perfil,
    icon: Users,
    title: 'ONG Parceira',
    desc: 'Instituicao que recebe e distribui doacoes.',
    color: 'bg-indigo-100 text-indigo-600',
  },
];

function sanitizeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith('/')) {
    return '/inicio';
  }

  return value;
}

function navigateTo(url: string) {
  window.location.assign(url);
}

function CadastroForm() {
  const searchParams = useSearchParams();
  const perfilParam = searchParams.get('perfil')?.toUpperCase() as Perfil | null;
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'));
  const validPerfis: Perfil[] = ['DONOR', 'COLLECTION_POINT', 'NGO'];

  const initialPerfil: Perfil = validPerfis.includes(perfilParam as Perfil)
    ? (perfilParam as Perfil)
    : 'DONOR';
  const initialStep: Step =
    perfilParam && validPerfis.includes(perfilParam as Perfil) ? 'form' : 'perfil';

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

      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setStep('form');
        setError('Conta criada, mas nao foi possivel entrar automaticamente.');
        return;
      }

      navigateTo(result?.url ?? callbackUrl);
    } catch {
      setError('Nao foi possivel conectar ao servidor. Verifique sua conexao.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-5 font-sans">
        <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mb-6">
          <CheckCircle size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-primary-deeper mb-2">Conta criada!</h1>
        <p className="text-sm text-gray-400 text-center">Entrando na sua conta...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f4f5] font-sans">
      <div className="max-w-sm mx-auto px-5 py-8">
        <div className="flex items-center gap-3 mb-8">
          {step === 'form' ? (
            <button
              onClick={() => setStep('perfil')}
              className="p-2 -ml-2 rounded-xl hover:bg-white transition-colors"
            >
              <ArrowLeft size={20} className="text-on-surface" />
            </button>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="p-2 -ml-2 rounded-xl hover:bg-white transition-colors"
            >
              <ArrowLeft size={20} className="text-on-surface" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-primary-deeper">Criar conta</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'perfil'
                ? 'Como voce quer participar?'
                : `Cadastro - ${perfis.find((item) => item.id === perfil)?.title}`}
            </p>
          </div>
        </div>

        {step === 'perfil' && (
          <div className="space-y-3">
            {perfis.map(({ id, icon: Icon, title, desc, color }) => (
              <button
                key={id}
                onClick={() => {
                  setPerfil(id);
                  setStep('form');
                }}
                className={`w-full text-left flex items-center gap-4 bg-white rounded-2xl p-4 shadow-card border-2 transition-all hover:border-primary active:scale-[0.98] ${
                  perfil === id ? 'border-primary' : 'border-transparent'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="font-bold text-sm text-on-surface">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
                </div>
              </button>
            ))}

            <p className="text-center text-xs text-gray-400 pt-4">
              Ja tem conta?{' '}
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-primary font-semibold"
              >
                Entrar
              </Link>
            </p>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                {isOrg ? 'Nome do responsavel' : 'Seu nome completo'}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={handleChange('name')}
                placeholder={isOrg ? 'Joao Responsavel' : 'Maria Silva'}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            {isOrg && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  {perfil === 'NGO' ? 'Nome da ONG' : 'Nome da empresa / ponto'}
                </label>
                <input
                  type="text"
                  value={form.organizationName}
                  onChange={handleChange('organizationName')}
                  placeholder={perfil === 'NGO' ? 'ONG Caminho da Luz' : 'Eco Store Pinheiros'}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">E-mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={handleChange('email')}
                placeholder="nome@exemplo.com"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Telefone <span className="text-gray-300 font-normal">(opcional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="(11) 99999-9999"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="Minimo 8 caracteres"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 pr-12 text-sm outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-deeper text-white font-bold py-4 rounded-2xl hover:bg-primary-dark transition-all active:scale-[0.97] disabled:opacity-60 mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar minha conta'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Ao criar, voce aceita os{' '}
              <a href="#" className="text-primary">Termos de Uso</a>
              {' '}e a{' '}
              <a href="#" className="text-primary">Politica de Privacidade</a>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f2f4f5] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CadastroForm />
    </Suspense>
  );
}
