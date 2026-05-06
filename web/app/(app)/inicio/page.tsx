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
  getMyGamification,
  getMyProfile,
  getOperationalDonations,
  getMyPartnerships,
  getNearbyPoints,
  getNotifications,
  getPickupRequests,
  getUserDonations,
  type AdminProfileRecord,
  type CollectionPoint,
  type DonationRecord,
  type DonationStatus,
  type DonorGamificationResponse,
  type MyProfile,
  type NotificationRecord,
  type OperationalDonationListResponse,
  type PartnershipRecord,
  type PickupRequestRecord,
} from '@/lib/api';
import { DonorHome } from '@/components/dashboard/donor-home';
import { formatAddressSummary } from '@/lib/address';
import { formatDayMonthLabel } from '@/lib/date-time';

const quickActions = [
  {
    href: '/doar',
    label: 'Nova doação',
    description: 'Registrar peças',
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
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
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
      description: 'Receber e atualizar doações',
      icon: ClipboardList,
      tone: 'bg-primary-deeper text-white',
    },
    {
      href: '/perfil/operacional',
      label: 'Perfil público',
      description: 'Endereço, status e checklist',
      icon: Store,
      tone: 'bg-primary-light text-primary',
    },
    {
      href: '/mapa',
      label: 'Explorar pontos',
      description: 'Validar descoberta pública',
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
      label: 'Perfil público',
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
      description: 'Acompanhar distribuições',
      icon: Truck,
      tone: 'bg-amber-50 text-amber-600',
    },
  ],
  ADMIN: [
    {
      href: '/admin/perfis',
      label: 'Governança',
      description: 'Revisar perfis operacionais',
      icon: ShieldCheck,
      tone: 'bg-primary-deeper text-white',
    },
    {
      href: '/operacoes',
      label: 'Operações',
      description: 'Visão ampla da operação',
      icon: ClipboardList,
      tone: 'bg-primary-light text-primary',
    },
    {
      href: '/mapa',
      label: 'Descoberta pública',
      description: 'Validar mapa e busca',
      icon: Map,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      href: '/perfil',
      label: 'Minha conta',
      description: 'Dados da sessão atual',
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
  IN_TRANSIT: { label: 'Em trânsito', tone: 'bg-indigo-50 text-indigo-600', stepIndex: 2 },
  DELIVERED: { label: 'Entregue', tone: 'bg-primary-light text-primary', stepIndex: 3 },
  DISTRIBUTED: { label: 'Distribuída', tone: 'bg-emerald-50 text-emerald-600', stepIndex: 3 },
  CANCELLED: { label: 'Cancelada', tone: 'bg-red-50 text-red-500', stepIndex: 0 },
};

const NEXT_ACTION_LABELS: Partial<Record<DonationStatus, string>> = {
  AT_POINT: 'Confirmar recebimento',
  IN_TRANSIT: 'Enviar para ONG',
  DELIVERED: 'Confirmar entrega',
  DISTRIBUTED: 'Marcar distribuição',
};

function formatDateLabel(input: string) {
  return formatDayMonthLabel(input);
}

function getOperationPartnerLabel(role: string, donation: DonationRecord) {
  if (role === 'COLLECTION_POINT') {
    return donation.ngo?.organizationName ?? donation.ngo?.name ?? 'ONG destino pendente';
  }

  if (role === 'NGO') {
    return (
      donation.collectionPoint?.organizationName ??
      donation.collectionPoint?.name ??
      'Ponto de origem pendente'
    );
  }

  return `${donation.collectionPoint?.organizationName ?? donation.collectionPoint?.name ?? 'Origem'} -> ${
    donation.ngo?.organizationName ?? donation.ngo?.name ?? 'Destino'
  }`;
}

function getNextActionLabel(donation: DonationRecord) {
  const nextStatus = donation.allowedNextStatuses[0];
  return nextStatus ? NEXT_ACTION_LABELS[nextStatus] ?? STATUS_META[nextStatus].label : null;
}

function OperationalDonationMiniCard({
  donation,
  role,
}: {
  donation: DonationRecord;
  role: string;
}) {
  const status = STATUS_META[donation.status];
  const actionLabel = getNextActionLabel(donation);

  return (
    <Link
      href={`/operacoes?actionableOnly=true&status=${donation.status}`}
      className="block rounded-[1.35rem] border border-gray-100 bg-white px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary-light/20"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-bold text-primary-deeper">{donation.code}</span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.tone}`}>
          {status.label}
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-on-surface">{donation.itemLabel}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{donation.itemCount} item(ns)</span>
        <span>{formatDateLabel(donation.updatedAt)}</span>
      </div>
      <p className="mt-2 truncate text-xs text-gray-400">{getOperationPartnerLabel(role, donation)}</p>
      {actionLabel && (
        <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary">
          {actionLabel}
          <ArrowRight size={13} />
        </span>
      )}
    </Link>
  );
}

function OperationalHome({
  firstName,
  role,
  profile,
  nearbyPoints,
  partnerships,
  pickupRequests,
  operationQueue,
  operationMeta,
  accessToken,
}: {
  firstName: string;
  role: string;
  profile: MyProfile | null;
  nearbyPoints: CollectionPoint[];
  partnerships: PartnershipRecord[];
  pickupRequests: PickupRequestRecord[];
  operationQueue: DonationRecord[];
  operationMeta: OperationalDonationListResponse['meta'] | null;
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
  const actionableOperations = operationQueue.filter(
    (donation) => donation.allowedNextStatuses.length > 0,
  );
  const recentOperations = operationQueue.slice(0, 4);
  const nextAction = actionableOperations[0] ?? null;
  const statusCounts = operationMeta?.statusCounts ?? {};
  const operationalStageCards = [
    { status: 'PENDING' as DonationStatus, label: 'Pendentes' },
    { status: 'AT_POINT' as DonationStatus, label: 'No ponto' },
    { status: 'IN_TRANSIT' as DonationStatus, label: 'Em trânsito' },
    { status: 'DELIVERED' as DonationStatus, label: 'Entregues' },
  ];

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
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">Olá, {firstName}.</p>
                <p className="mt-3 max-w-2xl text-base leading-8 text-primary-muted">
                  Acompanhe pendências reais, próximos passos e atalhos do seu papel sem sair da rotina operacional.
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
                    `${operationMeta?.actionableCount ?? actionableOperations.length} pendência(s) de ação`,
                    `${operationMeta?.count ?? operationQueue.length} coleta(s) no recorte recente`,
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
                  Próxima ação
                </p>
                {nextAction ? (
                  <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-on-surface">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-sm font-bold text-primary-deeper">
                        {nextAction.code}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          STATUS_META[nextAction.status].tone
                        }`}
                      >
                        {STATUS_META[nextAction.status].label}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">{nextAction.itemLabel}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {getOperationPartnerLabel(role, nextAction)}
                    </p>
                    <Link
                      href="/operacoes?actionableOnly=true"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                    >
                      {getNextActionLabel(nextAction) ?? 'Abrir operação'}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl bg-white/10 px-4 py-4">
                    <p className="text-sm font-semibold text-white">Sem ação imediata</p>
                    <p className="mt-2 text-sm leading-6 text-primary-muted">
                      Quando uma coleta exigir seu próximo passo, ela aparece aqui.
                    </p>
                  </div>
                )}
                <p className="mt-4 text-xs leading-6 text-primary-muted">
                  Perfil: {profileStateLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Fila agora
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {operationalStageCards.map(({ status, label }) => (
                <Link
                  key={status}
                  href={`/operacoes?status=${status}`}
                  className="rounded-[1.25rem] bg-surface p-4 transition-colors hover:bg-primary-light/50"
                >
                  <p className="text-2xl font-bold text-primary-deeper">
                    {statusCounts[status] ?? 0}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">{label}</p>
                </Link>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {role === 'ADMIN' ? (
                <>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      Governança e operação continuam centralizadas entre `/admin/perfis` e `/operacoes`
                    </p>
                  </div>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      O dashboard dedicado desta fase foca COLLECTION_POINT e NGO
                    </p>
                  </div>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      A administração segue acompanhando a descoberta pública e a fila completa
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
                      {pendingPickupRequests.length} solicitação(ões) de retirada pendente(s)
                    </p>
                  </div>
                  <div className="rounded-3xl bg-surface p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      {role === 'COLLECTION_POINT'
                        ? 'Aprovações de retirada ficam neste dashboard'
                        : 'Novas retiradas podem ser solicitadas neste dashboard'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Pendências de ação
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                  Coletas para resolver agora
                </h2>
              </div>
              <Link href="/operacoes?actionableOnly=true" className="text-sm font-semibold text-primary">
                Ver fila
              </Link>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {actionableOperations.length > 0 ? (
                actionableOperations
                  .slice(0, 4)
                  .map((donation) => (
                    <OperationalDonationMiniCard key={donation.id} donation={donation} role={role} />
                  ))
              ) : (
                <div className="rounded-[1.75rem] bg-surface px-5 py-8 text-sm text-gray-500 lg:col-span-2">
                  Nenhuma coleta exige ação deste perfil no momento.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Atualizações recentes
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Últimas coletas</h2>
              </div>
              <Package size={18} className="text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              {recentOperations.length > 0 ? (
                recentOperations.map((donation) => (
                  <OperationalDonationMiniCard key={donation.id} donation={donation} role={role} />
                ))
              ) : (
                <div className="rounded-[1.75rem] bg-surface px-5 py-8 text-sm text-gray-500">
                  A fila operacional ainda não tem coletas neste recorte.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Ações rápidas
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
                <p className="mt-1 text-sm text-gray-500">Doações ligadas ao perfil</p>
              </div>
              <div className="rounded-[1.5rem] bg-surface p-4">
                <p className="text-3xl font-bold text-primary-deeper">{stats.activePartnerships}</p>
                <p className="mt-1 text-sm text-gray-500">Parcerias ativas</p>
              </div>
            </div>

            {role !== 'ADMIN' && completion && completion.missingFields.length > 0 && (
              <div className="mt-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Campos que ainda afetam a publicação</p>
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
                  Descoberta pública
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
                          {formatAddressSummary(point) ?? 'Endereço não informado'}
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
                    Ainda não há parceiros públicos nessa busca.
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
                'retiradas com data prevista, faixa de horário e resposta do parceiro',
                'distinção entre rastreio operacional e fila de operações',
                'parcerias ativas que tornam o ponto elegível para doações',
                'perfil público, checklist e status acompanhados no mesmo fluxo',
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
      label: 'Governança',
      description: 'Aprovar novos perfis e revisar mudanças públicas',
      icon: ShieldCheck,
      tone: 'bg-primary-deeper text-white',
    },
    {
      href: '/operacoes',
      label: 'Operações',
      description: 'Abrir a fila operacional compartilhada',
      icon: ClipboardList,
      tone: 'bg-primary-light text-primary',
    },
    {
      href: '/mapa',
      label: 'Mapa público',
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
                Governança ativa
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                Administrador
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">Olá, {firstName}.</p>
                <p className="mt-3 max-w-2xl text-base leading-8 text-primary-muted">
                  Este painel centraliza aprovações iniciais, revisões públicas pendentes e alertas recentes de governança, sem misturar a administração com o fluxo doador.
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
                    `${pendingApprovals.length} perfis aguardando aprovação`,
                    `${pendingRevisions.length} revisões públicas pendentes`,
                    `${notifications.length} alertas recentes de governança`,
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
                <p className="mt-3 text-xl font-semibold">Governança, mapa e fila</p>
                <p className="mt-3 text-sm leading-7 text-primary-muted">
                  O admin não recebe CTA de doação nem rastreio operacional como papel principal. Aqui, a prioridade é aprovar perfis, revisar alterações públicas e acompanhar a saúde da operação.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Resumo rápido
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-3xl bg-surface p-4">
                <p className="text-sm font-semibold text-primary-deeper">
                  {pendingApprovals.length} perfis novos aguardando aprovação
                </p>
              </div>
              <div className="rounded-3xl bg-surface p-4">
                <p className="text-sm font-semibold text-primary-deeper">
                  {pendingRevisions.length} revisões públicas aguardando avaliação
                </p>
              </div>
              <div className="rounded-3xl bg-surface p-4">
                <p className="text-sm font-semibold text-primary-deeper">
                  {notifications.length > 0
                    ? 'Há alertas recentes prontos para abrir'
                    : 'Nenhum alerta novo de governança no momento'}
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
                  Aprovação inicial
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Perfis aguardando aprovação</h2>
              </div>
              <Link href="/admin/perfis" className="text-sm font-semibold text-primary">
                Abrir governança
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
                    Nenhum perfil novo aguardando aprovação.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Revisões públicas
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Alterações pendentes</h2>
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
                        : 'Alterações públicas aguardando avaliação'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">
                    Nenhuma revisão pública pendente no momento.
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
                  Ações rápidas
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
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Notificações de governança</h2>
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
                    Nenhum alerta de governança no momento.
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
  const firstName = session?.user?.name?.split(' ')[0] ?? 'você';
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
    let operationQueue: DonationRecord[] = [];
    let operationMeta: OperationalDonationListResponse['meta'] | null = null;

    if (accessToken) {
      try {
        const [
          profileResponse,
          partnershipsResponse,
          pickupRequestsResponse,
          operationResponse,
        ] = await Promise.all([
          getMyProfile(accessToken),
          role === 'ADMIN' ? Promise.resolve(null) : getMyPartnerships(accessToken),
          role === 'ADMIN' ? Promise.resolve(null) : getPickupRequests(accessToken),
          getOperationalDonations(accessToken, {
            limit: 8,
            sortBy: 'updatedAt',
            direction: 'desc',
          }),
        ]);

        profile = profileResponse;
        partnerships = partnershipsResponse?.data ?? [];
        pickupRequests = pickupRequestsResponse?.data ?? [];
        operationQueue = operationResponse.data;
        operationMeta = operationResponse.meta;

        const pointsResponse =
          profile.latitude != null && profile.longitude != null
            ? await getNearbyPoints({
                lat: profile.latitude,
                lng: profile.longitude,
                radius: 20,
                limit: 4,
                accessToken,
              })
            : await getNearbyPoints({
                search:
                  [profile.city, profile.state].filter(Boolean).join(' ').trim() || undefined,
                limit: 4,
                accessToken,
              });

        nearbyPoints = pointsResponse.data;
      } catch {
        profile = null;
        nearbyPoints = [];
        partnerships = [];
        pickupRequests = [];
        operationQueue = [];
        operationMeta = null;
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
        operationQueue={operationQueue}
        operationMeta={operationMeta}
      />
    );
  }

  let donations: DonationRecord[] = [];
  let nearbyPoints: Awaited<ReturnType<typeof getNearbyPoints>>['data'] = [];
  let gamification: DonorGamificationResponse | null = null;

  if (accessToken) {
    const [donationsResult, pointsResult, gamificationResult] = await Promise.allSettled([
      getUserDonations(accessToken, { limit: 20 }),
      getNearbyPoints({ lat: -23.50153, lng: -47.45256, radius: 15, limit: 3 }),
      getMyGamification(accessToken),
    ]);

    if (donationsResult.status === 'fulfilled') {
      donations = donationsResult.value.data;
    }
    if (pointsResult.status === 'fulfilled') {
      nearbyPoints = pointsResult.value.data;
    }
    if (gamificationResult.status === 'fulfilled') {
      gamification = gamificationResult.value;
    }
  }

  return (
    <DonorHome
      firstName={firstName}
      donations={donations}
      nearbyPoints={nearbyPoints}
      gamification={gamification}
    />
  );
}
