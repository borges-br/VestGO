'use client';
import { useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { User, MapPin, Users, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Link from 'next/link';

type Perfil = 'DONOR' | 'COLLECTION_POINT' | 'NGO';
type Step = 'perfil' | 'form' | 'success';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const perfis = [
  {
    id: 'DONOR' as Perfil,
    icon: User,
    title: 'Doador',
    desc: 'Quero doar roupas e acompanhar meu impacto.',
    color: 'bg-sky-100 text-sky-600',
    border: 'border-sky-200',
  },
  {
    id: 'COLLECTION_POINT' as Perfil,
    icon: MapPin,
    title: 'Ponto de Coleta',
    desc: 'Minha empresa quer ser um ponto logístico parceiro.',
    color: 'bg-teal-100 text-teal-600',
    border: 'border-teal-200',
  },
  {
    id: 'NGO' as Perfil,
    icon: Users,
    title: 'ONG Parceira',
    desc: 'Instituição que recebe e distribui doações.',
    color: 'bg-indigo-100 text-indigo-600',
    border: 'border-indigo-200',
  },
];

function CadastroForm() {
  const searchParams = useSearchParams();
  const perfilParam = searchParams.get('perfil')?.toUpperCase() as Perfil | null;
  const validPerfis: Perfil[] = ['DONOR', 'COLLECTION_POINT', 'NGO'];

  // Se veio um perfil válido pela URL, pula direto para o form
  const initialPerfil: Perfil = validPerfis.includes(perfilParam as Perfil) ? (perfilParam as Perfil) : 'DONOR';
  const initialStep: Step = perfilParam && validPerfis.includes(perfilParam as Perfil) ? 'form' : 'perfil';

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

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
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

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Erro ao criar conta. Tente novamente.');
        return;
      }

      // Conta criada — faz login automático via NextAuth
      setStep('success');
      setTimeout(async () => {
        await signIn('credentials', {
          email: form.email,
          password: form.password,
          callbackUrl: '/inicio',
        });
      }, 1500);
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // ── Tela de sucesso ────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-5 font-sans">
        <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mb-6">
          <CheckCircle size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-primary-deeper mb-2">Conta criada!</h1>
        <p className="text-sm text-gray-400 text-center">Entrando na sua conta…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f4f5] font-sans">
      <div className="max-w-sm mx-auto px-5 py-8">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-8">
          {step === 'form' ? (
            <button onClick={() => setStep('perfil')} className="p-2 -ml-2 rounded-xl hover:bg-white transition-colors">
              <ArrowLeft size={20} className="text-on-surface" />
            </button>
          ) : (
            <Link href="/login" className="p-2 -ml-2 rounded-xl hover:bg-white transition-colors">
              <ArrowLeft size={20} className="text-on-surface" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-primary-deeper">Criar conta</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'perfil' ? 'Como você quer participar?' : `Cadastro — ${perfis.find(p => p.id === perfil)?.title}`}
            </p>
          </div>
        </div>

        {/* ── Passo 1: escolha de perfil ── */}
        {step === 'perfil' && (
          <div className="space-y-3">
            {perfis.map(({ id, icon: Icon, title, desc, color, border }) => (
              <button
                key={id}
                onClick={() => { setPerfil(id); setStep('form'); }}
                className={`w-full text-left flex items-center gap-4 bg-white rounded-2xl p-4 shadow-card border-2 transition-all hover:border-primary active:scale-[0.98] ${
                  perfil === id ? `border-primary` : `border-transparent`
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
              Já tem conta?{' '}
              <Link href="/login" className="text-primary font-semibold">
                Entrar
              </Link>
            </p>
          </div>
        )}

        {/* ── Passo 2: formulário ── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                {isOrg ? 'Nome do responsável' : 'Seu nome completo'}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={handleChange('name')}
                placeholder={isOrg ? 'João Responsável' : 'Maria Silva'}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Nome da organização (apenas ONG/Ponto) */}
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

            {/* E-mail */}
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

            {/* Telefone */}
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

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="Mínimo 8 caracteres"
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

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-deeper text-white font-bold py-4 rounded-2xl hover:bg-primary-dark transition-all active:scale-[0.97] disabled:opacity-60 mt-2"
            >
              {loading ? 'Criando conta…' : 'Criar minha conta'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Ao criar, você aceita os{' '}
              <a href="#" className="text-primary">Termos de Uso</a>
              {' '}e a{' '}
              <a href="#" className="text-primary">Política de Privacidade</a>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f2f4f5] flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <CadastroForm />
    </Suspense>
  );
}
