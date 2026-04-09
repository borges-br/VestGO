'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { User, MapPin, Users } from 'lucide-react';
import Link from 'next/link';

type Tab = 'login' | 'register';

const profiles = [
  {
    icon: User,
    title: 'Doador',
    desc: 'Quero doar roupas e rastrear meu impacto.',
    href: '/cadastro?perfil=doador',
    color: 'bg-sky-100 text-sky-600',
  },
  {
    icon: MapPin,
    title: 'Ponto de Coleta',
    desc: 'Minha empresa deseja ser um ponto logístico.',
    href: '/cadastro?perfil=ponto',
    color: 'bg-teal-100 text-teal-600',
  },
  {
    icon: Users,
    title: 'ONG Parceira',
    desc: 'Instituições que recebem e distribuem doações.',
    href: '/cadastro?perfil=ong',
    color: 'bg-indigo-100 text-indigo-600',
  },
];

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn('credentials', {
      email,
      password,
      redirect: true,
      callbackUrl: '/inicio',
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f2f4f5] flex flex-col">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col px-5 py-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-deeper tracking-tight">VestGO</h1>
          <p className="text-sm text-gray-400 mt-1">Organização e transparência nas suas doações.</p>
        </div>

        {/* Tabs */}
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
            COMEÇAR A DOAR
          </button>
        </div>

        {tab === 'login' ? (
          <>
            {/* Formulário de login */}
            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
              <Input
                id="email"
                label="E-mail"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
              <Input
                id="senha"
                label="Senha"
                hint="Esqueci minha senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
              />

              {/* Lembrar de mim */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setRemember(!remember)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    remember ? 'bg-primary border-primary' : 'border-gray-300 bg-white'
                  }`}
                >
                  {remember && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-600">Lembrar de mim</span>
              </label>

              <button
                id="btn-entrar"
                type="submit"
                disabled={loading}
                className="w-full bg-primary-deeper text-white font-semibold py-4 rounded-2xl hover:bg-primary-dark transition-all active:scale-[0.97] disabled:opacity-60 mt-2"
              >
                {loading ? 'Entrando...' : 'Entrar na conta'}
              </button>
            </form>

            {/* Separador */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-200" />
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase whitespace-nowrap">
                Ou escolha seu perfil para começar
              </p>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center mb-6">
            Escolha como você quer participar do VestGO:
          </p>
        )}

        {/* Cards de perfil */}
        <div className="space-y-3 mb-8">
          {profiles.map(({ icon: Icon, title, desc, href, color }) => (
            <Link
              key={title}
              href={href}
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

        {/* Link explorar mapa */}
        <Link
          href="/mapa"
          className="flex items-center justify-center gap-2 w-full border border-gray-200 bg-white text-sm text-gray-500 font-medium py-4 rounded-2xl hover:bg-surface transition-colors"
        >
          Continuar sem login para explorar mapa
          <span className="text-gray-400">→</span>
        </Link>
      </div>
    </div>
  );
}