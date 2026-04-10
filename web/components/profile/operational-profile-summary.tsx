'use client';

import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';
import type { MyProfile } from '@/lib/api';

const PROFILE_STATE_LABELS = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  VERIFIED: 'Verificado',
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calcados',
  ACCESSORIES: 'Acessorios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

type Props = {
  profile: MyProfile | null;
  loading: boolean;
  error: string | null;
};

export function OperationalProfileSummary({ profile, loading, error }: Props) {
  if (loading) {
    return (
      <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm text-gray-500">Carregando perfil operacional...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm text-gray-500">Perfil operacional indisponivel no momento.</p>
        </div>
      </div>
    );
  }

  const title = profile.organizationName ?? profile.name;
  const subtitle = profile.role === 'NGO' ? 'ONG Parceira' : 'Ponto de Coleta';

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <div className="rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <Sparkles size={14} />
                Perfil publico
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                {PROFILE_STATE_LABELS[profile.publicProfileState]}
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary text-white shadow-sm">
                <Building2 size={34} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</p>
                <p className="mt-2 text-sm text-primary-muted">{subtitle}</p>
                <p className="mt-2 text-sm text-primary-muted">
                  Responsavel: {profile.name}
                  {profile.phone ? ` - ${profile.phone}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">Resumo institucional</p>
              <p className="mt-2 text-sm leading-7 text-primary-muted">
                {profile.description ??
                  'Complete a descricao do perfil para fortalecer a confianca do doador.'}
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {error}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-3xl font-bold">{profile.stats.handledDonations}</p>
                <p className="mt-1 text-sm text-primary-muted">Doacoes ligadas</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-3xl font-bold">{profile.stats.activePartnerships}</p>
                <p className="mt-1 text-sm text-primary-muted">Parcerias ativas</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-3xl font-bold">
                  {profile.profileCompletion.completedItems}/{profile.profileCompletion.totalItems}
                </p>
                <p className="mt-1 text-sm text-primary-muted">Checklist essencial</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[2rem] bg-white p-6 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Proximas acoes
              </p>
              <div className="mt-4 space-y-3">
                <Link
                  href="/perfil/operacional"
                  className="flex items-center justify-between rounded-[1.5rem] bg-surface px-4 py-4 text-sm font-semibold text-primary-deeper transition-colors hover:bg-primary-light"
                >
                  Editar perfil publico
                  <CheckCircle2 size={16} className="text-primary" />
                </Link>
                <Link
                  href="/operacoes"
                  className="flex items-center justify-between rounded-[1.5rem] bg-surface px-4 py-4 text-sm font-semibold text-primary-deeper transition-colors hover:bg-primary-light"
                >
                  Abrir painel operacional
                  <ClipboardList size={16} className="text-primary" />
                </Link>
              </div>
            </div>

            {profile.profileCompletion.missingFields.length > 0 && (
              <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
                <p className="text-sm font-semibold">Campos essenciais pendentes</p>
                <div className="mt-3 space-y-2 text-sm">
                  {profile.profileCompletion.missingFields.map((field) => (
                    <div key={field} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="mt-1 text-amber-500" />
                      <span>{field}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Informacoes publicas
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-primary-deeper">Contato e localizacao</p>
                <div className="mt-3 space-y-2 text-sm text-gray-500">
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="mt-1 text-primary" />
                    <span>
                      {profile.address ?? 'Endereco ainda nao informado'}
                      {profile.city ? ` - ${profile.city}` : ''}
                      {profile.state ? ` - ${profile.state}` : ''}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone size={15} className="mt-1 text-primary" />
                    <span>{profile.phone ?? 'Telefone ainda nao informado'}</span>
                  </div>
                </div>
              </div>

              {profile.role === 'COLLECTION_POINT' && (
                <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                  <p className="text-sm font-semibold text-primary-deeper">Atendimento no ponto</p>
                  <p className="mt-3 text-sm leading-7 text-gray-500">
                    {profile.openingHours ?? 'Horario ainda nao informado.'}
                  </p>
                  {profile.accessibilityDetails && (
                    <p className="mt-3 text-sm leading-7 text-gray-500">
                      Acessibilidade: {profile.accessibilityDetails}
                    </p>
                  )}
                </div>
              )}

              {profile.role === 'NGO' && (
                <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                  <p className="text-sm font-semibold text-primary-deeper">Cobertura da ONG</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(profile.serviceRegions ?? []).map((region) => (
                      <span
                        key={region}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {region}
                      </span>
                    ))}
                    {profile.serviceRegions.length === 0 && (
                      <span className="text-sm text-gray-500">Regioes ainda nao informadas.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Itens e regras
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-primary-deeper">Categorias aceitas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile.acceptedCategories ?? []).map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {CATEGORY_LABELS[category] ?? category}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-primary-deeper">Regras do local</p>
                <div className="mt-3 space-y-2 text-sm text-gray-500">
                  {(profile.rules ?? []).map((rule) => (
                    <p key={rule}>- {rule}</p>
                  ))}
                  {profile.rules.length === 0 && <p>Nenhuma regra publica cadastrada ainda.</p>}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-primary-deeper">Itens nao aceitos</p>
                <div className="mt-3 space-y-2 text-sm text-gray-500">
                  {(profile.nonAcceptedItems ?? []).map((rule) => (
                    <p key={rule}>- {rule}</p>
                  ))}
                  {profile.nonAcceptedItems.length === 0 && (
                    <p>Nenhuma restricao publica cadastrada ainda.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
