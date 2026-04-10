'use client';

import Link from 'next/link';
import {
  Bell,
  ChevronRight,
  HelpCircle,
  Shield,
  SlidersHorizontal,
  User,
} from 'lucide-react';

const settingsLinks = [
  {
    href: '/perfil',
    icon: User,
    label: 'Perfil',
    description: 'Dados pessoais, histórico e impacto acumulado.',
  },
  {
    href: '/notificacoes',
    icon: Bell,
    label: 'Notificações',
    description: 'Atualizações do rastreio e avisos do produto.',
  },
  {
    href: '/perfil/privacidade',
    icon: Shield,
    label: 'Privacidade',
    description: 'Segurança da conta, dados e permissões.',
  },
  {
    href: '/suporte',
    icon: HelpCircle,
    label: 'Suporte',
    description: 'FAQ, ajuda rápida e canais de contato.',
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="pb-2">
      <section className="px-5 pb-4 pt-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Ajustes
        </p>
        <h1 className="text-3xl font-bold text-primary-deeper">Configurações</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-400">
          Centralize preferências, privacidade e acessos secundários do VestGO.
        </p>
      </section>

      <section className="mb-5 px-5">
        <div className="rounded-3xl bg-primary-deeper p-5 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <p className="text-base font-bold">Menu utilitário do VestGO</p>
              <p className="mt-0.5 text-xs text-primary-muted">
                A navegação principal agora fica sempre visível. Aqui entram apenas ajustes e
                apoio.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 px-5">
        <div className="grid gap-3 md:grid-cols-2">
          {settingsLinks.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="rounded-3xl bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-on-surface">{label}</p>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-400">{description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
