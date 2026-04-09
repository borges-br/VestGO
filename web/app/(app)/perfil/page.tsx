'use client';
import { useSession, signOut } from 'next-auth/react';
import {
  User, Package, LogOut, ChevronRight,
  Edit3, Shield, Bell, HelpCircle, Star,
} from 'lucide-react';
import Link from 'next/link';

const ROLE_LABELS: Record<string, string> = {
  DONOR: 'Doador',
  COLLECTION_POINT: 'Ponto de Coleta',
  NGO: 'ONG Parceira',
  ADMIN: 'Administrador',
};

const menuItems = [
  { icon: Edit3, label: 'Editar perfil', href: '/perfil/editar' },
  { icon: Package, label: 'Minhas doações', href: '/doacoes' },
  { icon: Bell, label: 'Notificações', href: '/notificacoes' },
  { icon: Shield, label: 'Privacidade e segurança', href: '/perfil/privacidade' },
  { icon: HelpCircle, label: 'Suporte / FAQ', href: '/suporte' },
];

export default function PerfilPage() {
  const { data: session } = useSession();

  const userName = session?.user?.name ?? 'Usuário';
  const userEmail = session?.user?.email ?? '';
  const userRole = (session?.user as any)?.role ?? 'DONOR';
  const initials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('');

  return (
    <div className="pb-2">
      {/* ── Header ── */}
      <section className="px-5 pt-6 pb-5">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-4">
          Meu Perfil
        </p>

        {/* Card de perfil */}
        <div className="bg-primary-deeper rounded-3xl p-6 text-white mb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={userName}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <span className="text-2xl font-bold text-white">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{userName}</h1>
              <p className="text-xs text-primary-muted mt-0.5 truncate">{userEmail}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-semibold text-primary-muted">
                  {ROLE_LABELS[userRole] ?? userRole} Nível Ouro
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-5 pt-4 border-t border-white/10">
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-primary-muted mt-0.5">Doações</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold">0kg</p>
              <p className="text-xs text-primary-muted mt-0.5">Impacto</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-primary-muted mt-0.5">Famílias</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Menu de opções ── */}
      <section className="px-5 mb-5">
        <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-100 overflow-hidden">
          {menuItems.map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-5 py-4 hover:bg-surface transition-colors"
            >
              <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-gray-500" />
              </div>
              <span className="flex-1 text-sm text-on-surface">{label}</span>
              <ChevronRight size={15} className="text-gray-300" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Logout ── */}
      <section className="px-5 mb-8">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-3 bg-red-50 text-red-500 font-semibold py-4 rounded-2xl hover:bg-red-100 transition-colors"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </section>
    </div>
  );
}
