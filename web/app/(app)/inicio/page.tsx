import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  HeartHandshake,
  Map,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  BadgeCollectionCard,
  ImpactProgressCard,
  ImpactSummaryCard,
  RankingPreviewCard,
} from '@/components/gamification/impact-widgets';
import { PickupRequestsPanel } from '@/components/operations/pickup-requests-panel';
import { auth } from '@/lib/auth';
import {
  getAdminProfiles,
  getMyProfile,
  getMyPartnerships,
  getNearbyPoints,
  getNotifications,
  getPickupRequests,
  getUserDonations,
  type AdminProfileRecord,
  type CollectionPoint,
  type DonationRecord,
  type DonationStatus,
  type MyProfile,
  type NotificationRecord,
  type PartnershipRecord,
  type PickupRequestRecord,
} from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';
import { buildImpactSnapshot } from '@/lib/gamification';

const quickActions = [
  {
    href: '/doar',
    label: 'Nova doacao',
    description: 'Registrar pecas',
    icon: Plus,
    tone: 'bg-primary-deeper text-white',
  },
  {
    href: '/mapa',
    label: 'Explorar pontos',
    description: 'Encontrar parceiros',
    icon: Map,
    tone: 'bg-primary-light text-primary',
  },
  {
    href: '/rastreio',
    label: 'Acompanhar status',
    description: 'Ver andamento',
    icon: Truck,
    tone: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/perfil',
    label: 'Minha solidariedade',
    description: 'Resumo pessoal',
    icon: HeartHandshake,
    tone: 'bg-amber-50 text-amber-600',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calcados',
  ACCESSORIES: 'Acessorios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

const PROFILE_STATE_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  VERIFIED: 'Verificado',
};

const ROLE_LABELS: Record<string, string> = {
  DONOR: 'Doador',
  COLLECTION_POINT: 'Ponto de Coleta',
  NGO: 'ONG Parceira',
  ADMIN: 'Administrador',
};

const GOVERNANCE_NOTIFICATION_TYPES = new Set([
  'PROFILE_APPROVAL_REQUIRED',
  'PROFILE_REVISION_PENDING',
]);

const operationalActionMap: Record<
  string,
  { href: string; label: string; description: string; icon: LucideIcon; tone: string }[]
> = {
  COLLECTION_POINT: [
    {
      href: '/operacoes',
      label: 'Fila operacional',
      description: 'Receber e atualizar doacoes',
      icon: ClipboardList,
      tone: 'bg-primary-deeper text-white',
    },
    {
      href: '/perfil/operacional',
      label: 'Perfil publico',
      description: 'Endereco, status e checklist',
      icon: Store,
      tone: 'bg-primary-light text-primary',
    },
    {
      href: '/mapa',
      label: 'Explorar pontos',
      description: 'Validar descoberta publica',
      icon: Map,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      href: '/rastreio',
      label: 'Rastreio',
      description: 'Acompanhar jornadas',
      icon: Truck,
      tone: 'bg-amber-50 text-amber-600',
    },
  ],
  NGO: [
    {
      href: '/operacoes',
      label: 'Fila operacional',
      description: 'Receber e concluir etapas',
      icon: ClipboardList,
      tone: 'bg-primary-deeper text-white',
    },
    {
      href: '/perfil/operacional',
      label: 'Perfil publico',
      description: 'Base, cobertura e status',
      icon: Users,
      tone: 'bg-primary-light text-primary',
    },
    {
      href: '/mapa',
      label: 'Explorar parceiros',
      description: 'Ver pontos e ONGs ativas',
      icon: Map,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      href: '/rastreio',
      label: 'Rastreio',
      description: 'Acompanhar distribuicoes',
      icon: Truck,
      tone: 'bg-amber-50 text-amber-600',
    },
  ],
  ADMIN: [
    {
      href: '/admin/perfis',
      label: 'Governanca',
      description: 'Revisar perfis operacionais',
      icon: ShieldCheck,
      tone: 'bg-primary-deeper text-white',
    },
    {
      href: '/operacoes',
      label: 'Operacoes',
      description: 'Visao ampla da operacao',
      icon: ClipboardList,
      tone: 'bg-primary-light text-primary',
    },
    {
      href: '/mapa',
      label: 'Descoberta publica',
      description: 'Validar mapa e busca',
      icon: Map,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      href: '/perfil',
      label: 'Minha conta',
      description: 'Dados da sessao atual',
      icon: User,
      tone: 'bg-amber-50 text-amber-600',
    },
  ],
};

const STATUS_META: Record<
  DonationStatus,
  { label: string; tone: string; stepIndex: number }
> = {
  PENDING: { label: 'Pendente', tone: 'bg-amber-50 text-amber-600', stepIndex: 0 },
  AT_POINT: { label: 'No ponto', tone: 'bg-blue-50 text-blue-600', stepIndex: 1 },
  IN_TRANSIT: { label: 'Em transito', tone: 'bg-indigo-50 text-indigo-600', stepIndex: 2 },
  DELIVERED: { label: 'Entregue', tone: 'bg-primary-light text-primary', stepIndex: 3 },
  DISTRIBUTED: { label: 'Distribuida', tone: 'bg-emerald-50 text-emerald-600', stepIndex: 3 },
  CANCELLED: { label: 'Cancelada', tone: 'bg-red-50 text-red-500', stepIndex: 0 },
};

function formatDateLabel(input: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(input));
}

function OperationalHome({
  firstName,
  role,
  profile,
  nearbyPoints,
  partnerships,
  pickupRequests,
  accessToken,
}: {
  firstName: string;
  role: string;
  profile: MyProfile | null;
  nearbyPoints: CollectionPoint[];
  partnerships: PartnershipRecord[];
  pickupRequests: PickupRequestRecord[];
  accessToken: string;
}) {
  const actions = operationalActionMap[role] ?? operationalActionMap.ADMIN;
  const profileStateLabel =
    role === 'ADMIN'
      ? 'Painel administrativo'
      : PROFILE_STATE_LABELS[profile?.publicProfileState ?? 'DRAFT'] ?? 'Rascunho';
  const completion = profile?.profileCompletion;
  const stats = profile?.stats ?? { handledDonations: 0, activePartnerships: 0 };
  const activePartnership = partnerships.find(
    (partnership) => partnership.status === 'ACTIVE' && partnership.isActive,
  );
  const pendingPickupRequests = pickupRequests.filter(
    (pickupRequest) => pickupRequest.status === 'PENDING',
  );

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="overflow-hidden rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <ClipboardList size={14} />
                Central operacional
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">Ola, {firstName}.</p>
                <p className="mt-3 max-w-2xl text-base leading-8 text-primary-muted">
                  Seu painel agora reconhece o papel operacional da conta e prioriza status do perfil, fila de operacao e descoberta publica real.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {actions.slice(0, 2).map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    `${stats.handledDonations} doacoes ligadas ao perfil`,
                    `${stats.activePartnerships} parcerias ativas`,
                    completion?.totalItems
                      ? `${completion.completedItems}/${completion.totalItems} itens essenciais preenchidos`
                      : 'checklist operacional em monitoramento',
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white/10 p-5 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-muted">
                  Estado visivel
                </p>
                <p className="mt-3 text-xl font-semibold">{profileStateLabel}</p>
                <p className="mt-3 text-sm leading-7 text-primary-muted">
                  {role === 'ADMIN'
                    ? 'Use este painel para revisar perfis, acompanhar operacoes e validar a descoberta publica.'
                    : 'Este estado controla a prontidao publica do seu perfil e ajuda a entender por que ele aparece, ou nao, na descoberta do produto.'}
                </p>

                {profile && role !== 'ADMIN' && (
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-on-surface">
                    <p className="text-sm font-semibold">Checklist operacional</p>
                    <p className="mt-1 text-sm text-gray-400">
                      {completion?.totalItems
                        ? `${completion.completedItems} de ${completion.totalItems} itens essenciais concluidos.`
                        : 'Sem checklist operacional disponivel.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Painel do papel
            </p>
            <div className="mt-4 space-y-3">
              {role === 'ADMIN' ? (
                <>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      Governanca e operacao continuam centralizadas entre `/admin/perfis` e `/operacoes`
                    </p>
                  </div>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      O dashboard dedicado desta fase foca COLLECTION_POINT e NGO
                    </p>
                  </div>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      A administracao segue acompanhando a descoberta publica e a fila completa
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      {activePartnership
                        ? role === 'COLLECTION_POINT'
                          ? `ONG ativa: ${activePartnership.ngo.organizationName ?? activePartnership.ngo.name}`
                          : `Ponto ativo: ${activePartnership.collectionPoint.organizationName ?? activePartnership.collectionPoint.name}`
                        : 'Nenhuma parceria ativa no momento'}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      {pendingPickupRequests.length} solicitacao(oes) de retirada pendente(s)
                    </p>
                  </div>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      {role === 'COLLECTION_POINT'
                        ? 'Aprovacoes de retirada ficam neste dashboard'
                        : 'Novas retiradas podem ser solicitadas neste dashboard'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Acoes rapidas
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Atalhos do seu papel</h2>
              </div>
              <ArrowRight size={18} className="text-primary" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {actions.map(({ href, label, description, icon: Icon, tone }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-start gap-4 rounded-3xl border border-gray-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{label}</p>
                    <p className="mt-1 text-sm text-gray-400">{description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Perfil operacional
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Visibilidade do estado</h2>
              </div>
              <ShieldCheck size={18} className="text-primary" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-surface p-4">
                <p className="text-3xl font-bold text-primary-deeper">{stats.handledDonations}</p>
                <p className="mt-1 text-sm text-gray-500">Doacoes ligadas ao perfil</p>
              </div>
              <div className="rounded-[1.5rem] bg-surface p-4">
                <p className="text-3xl font-bold text-primary-deeper">{stats.activePartnerships}</p>
                <p className="mt-1 text-sm text-gray-500">Parcerias ativas</p>
              </div>
            </div>

            {role !== 'ADMIN' && completion && completion.missingFields.length > 0 && (
              <div className="mt-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Campos que ainda afetam a publicacao</p>
                <div className="mt-3 space-y-2 text-sm text-amber-700">
                  {completion.missingFields.slice(0, 5).map((field) => (
                    <div key={field}>{field}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Descoberta publica
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Mapa e busca vivos</h2>
              </div>
              <MapPin size={20} className="text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              {nearbyPoints.length > 0 ? (
                nearbyPoints.map((point) => (
                  <div key={point.id} className="rounded-3xl bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          {point.organizationName ?? point.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {point.distanceKm ? `${point.distanceKm} km - ` : ''}
                          {formatAddressSummary(point) ?? 'Endereco nao informado'}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                          {point.acceptedCategories
                            .slice(0, 3)
                            .map((item) => CATEGORY_LABELS[item] ?? item)
                            .join(' - ')}
                        </p>
                      </div>
                      <Link href={`/mapa/${point.id}`} className="mt-1 text-primary">
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">
                    Ainda nao ha parceiros publicos nessa busca.
                  </p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    Assim que um ponto ou ONG verificado surgir por aqui, ele aparece nessa lista e no mapa.
                  </p>
                </div>
              )}
            </div>

            <Link href="/mapa" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Abrir mapa e busca
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Radar operacional
            </p>
            <h2 className="mt-2 text-2xl font-bold text-primary-deeper">O que este painel coordena agora</h2>
            <div className="mt-5 space-y-3">
              {[
                'retiradas com data prevista, faixa de horario e resposta do parceiro',
                'distincao entre rastreio operacional e fila de operacoes',
                'parcerias ativas que tornam o ponto elegivel para doacoes',
                'perfil publico, checklist e status acompanhados no mesmo fluxo',
              ].map((item) => (
                <div key={item} className="rounded-3xl bg-surface p-4">
                  <p className="text-sm font-semibold text-on-surface">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {(role === 'COLLECTION_POINT' || role === 'NGO') && (
          <PickupRequestsPanel
            role={role}
            accessToken={accessToken}
            initialPickupRequests={pickupRequests}
            partnerships={partnerships}
          />
        )}
      </div>
    </div>
  );
}

function AdminHome({
  firstName,
  pendingApprovals,
  pendingRevisions,
  notifications,
}: {
  firstName: string;
  pendingApprovals: AdminProfileRecord[];
  pendingRevisions: AdminProfileRecord[];
  notifications: NotificationRecord[];
}) {
  const actionCards = [
    {
      href: '/admin/perfis',
      label: 'Governanca',
      description: 'Aprovar novos perfis e revisar mudancas publicas',
      icon: ShieldCheck,
      tone: 'bg-primary-deeper text-white',
    },
    {
      href: '/operacoes',
      label: 'Operacoes',
      description: 'Abrir a fila operacional compartilhada',
      icon: ClipboardList,
      tone: 'bg-primary-light text-primary',
    },
    {
      href: '/mapa',
      label: 'Mapa publico',
      description: 'Validar como pontos e ONGs aparecem para doadores',
      icon: Map,
      tone: 'bg-blue-50 text-blue-600',
    },
  ];

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="overflow-hidden rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <ShieldCheck size={14} />
                Governanca ativa
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                Administrador
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">Ola, {firstName}.</p>
                <p className="mt-3 max-w-2xl text-base leading-8 text-primary-muted">
                  Este painel centraliza aprovacoes iniciais, revisoes publicas pendentes e alertas recentes de governanca, sem misturar a administracao com o fluxo doador.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {actionCards.slice(0, 2).map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    `${pendingApprovals.length} perfis aguardando aprovacao`,
                    `${pendingRevisions.length} revisoes publicas pendentes`,
                    `${notifications.length} alertas recentes de governanca`,
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white/10 p-5 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-muted">
                  Painel administrativo
                </p>
                <p className="mt-3 text-xl font-semibold">Governanca, mapa e fila</p>
                <p className="mt-3 text-sm leading-7 text-primary-muted">
                  O admin nao recebe CTA de doacao nem rastreio operacional como papel principal. Aqui, a prioridade e aprovar perfis, revisar alteracoes publicas e acompanhar a saude da operacao.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Resumo rapido
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-3xl bg-surface p-4">
                <p className="text-sm font-semibold text-primary-deeper">
                  {pendingApprovals.length} perfis novos aguardando aprovacao
                </p>
              </div>
              <div className="rounded-3xl bg-surface p-4">
                <p className="text-sm font-semibold text-primary-deeper">
                  {pendingRevisions.length} revisoes publicas aguardando avaliacao
                </p>
              </div>
              <div className="rounded-3xl bg-surface p-4">
                <p className="text-sm font-semibold text-primary-deeper">
                  {notifications.length > 0
                    ? 'Ha alertas recentes prontos para abrir'
                    : 'Nenhum alerta novo de governanca no momento'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Aprovacao inicial
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Perfis aguardando aprovacao</h2>
              </div>
              <Link href="/admin/perfis" className="text-sm font-semibold text-primary">
                Abrir governanca
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((profile) => (
                  <div key={profile.id} className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-on-surface">
                      {profile.organizationName ?? profile.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      {ROLE_LABELS[profile.role] ?? profile.role}
                      {profile.city && profile.state ? ` - ${profile.city}, ${profile.state}` : ''}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">
                    Nenhum perfil novo aguardando aprovacao.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Revisoes publicas
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Alteracoes pendentes</h2>
              </div>
              <Link href="/admin/perfis" className="text-sm font-semibold text-primary">
                Revisar agora
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {pendingRevisions.length > 0 ? (
                pendingRevisions.map((profile) => (
                  <div key={profile.id} className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-on-surface">
                      {profile.organizationName ?? profile.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      {profile.pendingPublicRevision?.fields.length
                        ? profile.pendingPublicRevision.fields.join(', ')
                        : 'Alteracoes publicas aguardando avaliacao'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">
                    Nenhuma revisao publica pendente no momento.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Acoes rapidas
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Atalhos do admin</h2>
              </div>
              <ShieldCheck size={18} className="text-primary" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {actionCards.map(({ href, label, description, icon: Icon, tone }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-start gap-4 rounded-3xl border border-gray-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{label}</p>
                    <p className="mt-1 text-sm text-gray-400">{description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Alertas recentes
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Notificacoes de governanca</h2>
              </div>
              <ArrowRight size={18} className="text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href ?? '/notificacoes'}
                    className="block rounded-3xl bg-surface p-4 transition-colors hover:bg-primary-light"
                  >
                    <p className="text-sm font-semibold text-on-surface">{notification.title}</p>
                    <p className="mt-1 text-sm text-gray-400">{notification.body}</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">
                    Nenhum alerta de governanca no momento.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default async function InicioPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'voce';
  const accessToken = session?.user?.accessToken ?? '';
  const role = session?.user?.role ?? 'DONOR';

  if (role === 'ADMIN') {
    let pendingApprovals: AdminProfileRecord[] = [];
    let pendingRevisions: AdminProfileRecord[] = [];
    let notifications: NotificationRecord[] = [];

    if (accessToken) {
      try {
        const [pendingApprovalsResponse, pendingRevisionsResponse, notificationsResponse] =
          await Promise.all([
            getAdminProfiles(accessToken, {
              status: 'PENDING',
              limit: 6,
            }),
            getAdminProfiles(accessToken, {
              revisionStatus: 'PENDING',
              limit: 6,
            }),
            getNotifications(accessToken, { limit: 8 }),
          ]);

        pendingApprovals = pendingApprovalsResponse.data;
        pendingRevisions = pendingRevisionsResponse.data;
        notifications = notificationsResponse.data
          .filter((notification) => GOVERNANCE_NOTIFICATION_TYPES.has(notification.type))
          .slice(0, 5);
      } catch {
        pendingApprovals = [];
        pendingRevisions = [];
        notifications = [];
      }
    }

    return (
      <AdminHome
        firstName={firstName}
        pendingApprovals={pendingApprovals}
        pendingRevisions={pendingRevisions}
        notifications={notifications}
      />
    );
  }

  if (role !== 'DONOR') {
    let profile: MyProfile | null = null;
    let nearbyPoints: CollectionPoint[] = [];
    let partnerships: PartnershipRecord[] = [];
    let pickupRequests: PickupRequestRecord[] = [];

    if (accessToken) {
      try {
        const [profileResponse, partnershipsResponse, pickupRequestsResponse] = await Promise.all([
          getMyProfile(accessToken),
          role === 'ADMIN' ? Promise.resolve(null) : getMyPartnerships(accessToken),
          role === 'ADMIN' ? Promise.resolve(null) : getPickupRequests(accessToken),
        ]);

        profile = profileResponse;
        partnerships = partnershipsResponse?.data ?? [];
        pickupRequests = pickupRequestsResponse?.data ?? [];

        const pointsResponse =
          profile.latitude != null && profile.longitude != null
            ? await getNearbyPoints({
                lat: profile.latitude,
                lng: profile.longitude,
                radius: 20,
                limit: 4,
              })
            : await getNearbyPoints({
                search:
                  [profile.city, profile.state].filter(Boolean).join(' ').trim() || undefined,
                limit: 4,
              });

        nearbyPoints = pointsResponse.data;
      } catch {
        profile = null;
        nearbyPoints = [];
        partnerships = [];
        pickupRequests = [];
      }
    }

    return (
      <OperationalHome
        accessToken={accessToken}
        firstName={firstName}
        role={role}
        profile={profile}
        nearbyPoints={nearbyPoints}
        partnerships={partnerships}
        pickupRequests={pickupRequests}
      />
    );
  }

  let donations: DonationRecord[] = [];
  let nearbyPoints: Awaited<ReturnType<typeof getNearbyPoints>>['data'] = [];

  if (accessToken) {
    try {
        const [donationsResponse, pointsResponse] = await Promise.all([
          getUserDonations(accessToken, { limit: 20 }),
          getNearbyPoints({ lat: -23.50153, lng: -47.45256, radius: 15, limit: 2 }),
        ]);
      donations = donationsResponse.data;
      nearbyPoints = pointsResponse.data;
    } catch {
      donations = [];
      nearbyPoints = [];
    }
  }

  const snapshot = buildImpactSnapshot(donations);
  const latestDonation = donations[0] ?? null;
  const recentDonations = donations.slice(0, 3);
  const latestStatus = latestDonation ? STATUS_META[latestDonation.status] : null;
  const progressSteps = ['Registrada', 'No ponto parceiro', 'Em transito', 'Entregue ao destino'];

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="overflow-hidden rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <Sparkles size={14} />
                Central do doador
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                Rede solidária
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">Ola, {firstName}.</p>
                <p className="mt-3 max-w-2xl text-base leading-8 text-primary-muted">
                  Acompanhe a sua jornada — cada doação registrada, os pontos conquistados e o quanto
                  a sua solidariedade já cresceu na rede.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/doar"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                  >
                    <Plus size={16} />
                    Registrar nova doacao
                  </Link>
                  <Link
                    href="/rastreio"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    <Truck size={16} />
                    Ver meu rastreio
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    `${snapshot.points} pontos solidarios`,
                    `${snapshot.streak.value} meses de participacao`,
                    `${snapshot.monthlyGoal.current}/${snapshot.monthlyGoal.target} na meta do mes`,
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white/10 p-5 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-muted">
                  Ultima doacao
                </p>

                {latestDonation ? (
                  <>
                    <p className="mt-3 text-xl font-semibold">{latestDonation.itemLabel}</p>
                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-on-surface">
                      <p className="text-sm font-semibold">Status atual: {latestStatus?.label}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {latestDonation.dropOffPoint?.organizationName ?? latestDonation.dropOffPoint?.name ?? 'Destino em definicao'} - ultima atualizacao em {formatDateLabel(latestDonation.updatedAt)}
                      </p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-muted">
                        Reconhecimento ativo
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        +{latestDonation.pointsAwarded} pontos nesta jornada
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {progressSteps.map((step, index, array) => {
                        const done = index <= (latestStatus?.stepIndex ?? 0);
                        return (
                          <div key={step} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                  done ? 'bg-primary text-white' : 'bg-white/15 text-primary-muted'
                                }`}
                              >
                                <Package size={14} />
                              </div>
                              {index < array.length - 1 && (
                                <div className={`mt-1 h-5 w-px ${done ? 'bg-primary' : 'bg-white/20'}`} />
                              )}
                            </div>
                            <p className={`pt-1 text-sm ${done ? 'font-semibold text-white' : 'text-primary-muted'}`}>
                              {step}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl bg-white/5 px-4 py-5">
                    <p className="text-sm font-semibold text-white">Sua primeira doacao ainda nao foi registrada.</p>
                    <p className="mt-2 text-sm leading-7 text-primary-muted">
                      Assim que voce concluir o wizard, esta area passa a acompanhar o status real da entrega.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ImpactSummaryCard snapshot={snapshot} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.85fr)_minmax(0,0.95fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Acoes rapidas
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">O que voce pode fazer agora</h2>
              </div>
              <ArrowRight size={18} className="text-primary" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickActions.map(({ href, label, description, icon: Icon, tone }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-start gap-4 rounded-3xl border border-gray-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{label}</p>
                    <p className="mt-1 text-sm text-gray-400">{description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Pontos proximos
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Onde doar</h2>
              </div>
              <MapPin size={20} className="text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              {nearbyPoints.length > 0 ? (
                nearbyPoints.map((point) => (
                  <div key={point.id} className="rounded-3xl bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          {point.organizationName ?? point.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {point.distanceKm ? `${point.distanceKm} km - ` : ''}
                          {formatAddressSummary(point) ?? 'Endereco nao informado'}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                          {point.acceptedCategories.slice(0, 3).map((item) => CATEGORY_LABELS[item] ?? item).join(' - ')}
                        </p>
                      </div>
                      <Link href={`/mapa/${point.id}`} className="mt-1 text-primary">
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-surface p-4">
                  <p className="text-sm font-semibold text-primary-deeper">Os pontos aparecem aqui quando o backend responder.</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    A estrutura ja esta pronta para listar parceiros reais da area de exploracao.
                  </p>
                </div>
              )}
            </div>

            <Link href="/mapa" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Explorar todos os pontos
              <ArrowRight size={15} />
            </Link>
          </div>

          <ImpactProgressCard snapshot={snapshot} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Historico resumido
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Solidariedade recente</h2>
              </div>
              <Link href="/rastreio" className="text-sm font-semibold text-primary">
                Ver tudo
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {snapshot.stats.map((item) => (
                <div key={item.label} className="rounded-[1.5rem] bg-surface p-4">
                  <p className="text-3xl font-bold text-primary-deeper">{item.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {recentDonations.length > 0 ? (
                recentDonations.map((donation) => {
                  const status = STATUS_META[donation.status];
                  return (
                    <Link
                      key={donation.id}
                      href={`/rastreio/${donation.id}`}
                      className="flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-4 transition-all hover:shadow-card-lg"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                        <Package size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-on-surface">{donation.itemLabel}</p>
                        <p className="mt-1 text-sm text-gray-400">
                          {donation.dropOffPoint?.organizationName ?? donation.dropOffPoint?.name ?? 'Destino em definicao'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.tone}`}>
                          {status.label}
                        </span>
                        <span className="rounded-full bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                          +{donation.pointsAwarded} pts
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">Seu historico real comeca aqui.</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    Assim que a primeira doacao for criada pelo wizard, ela passa a aparecer neste bloco.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <BadgeCollectionCard badges={snapshot.badges} compact />
            <RankingPreviewCard snapshot={snapshot} />
          </div>
        </section>
      </div>
    </div>
  );
}
