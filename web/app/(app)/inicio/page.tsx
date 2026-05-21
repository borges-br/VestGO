import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  Map,
  Package,
  QrCode,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { DonorHome } from '@/components/dashboard/donor-home';
import { OperationalHomeScanButton } from '@/components/dashboard/operational-home-scan-button';
import { StatusActionPanel } from '@/components/donations/status-action-panel';
import { PickupRequestsPanel } from '@/components/operations/pickup-requests-panel';
import { auth } from '@/lib/auth';
import {
  getAdminProfiles,
  getMyGamification,
  getMyPartnerships,
  getMyProfile,
  getNearbyPoints,
  getNotifications,
  getOperationalDonations,
  getPickupRequests,
  getUserDonations,
  type AdminProfileRecord,
  type DonationRecord,
  type DonationStatus,
  type DonorGamificationResponse,
  type MyProfile,
  type NotificationRecord,
  type OperationalDonationListResponse,
  type PartnershipRecord,
  type PickupRequestRecord,
} from '@/lib/api';
import { formatDayMonthLabel } from '@/lib/date-time';

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

const STATUS_META: Record<DonationStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Pendente', tone: 'bg-amber-50 text-amber-700' },
  AT_POINT: { label: 'No ponto', tone: 'bg-blue-50 text-blue-700' },
  IN_TRANSIT: { label: 'Em trânsito', tone: 'bg-indigo-50 text-indigo-700' },
  DELIVERED: { label: 'Entregue', tone: 'bg-primary-light text-primary' },
  DISTRIBUTED: { label: 'Distribuída', tone: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Cancelada', tone: 'bg-red-50 text-red-600' },
};

const NEXT_ACTION_LABELS: Partial<Record<DonationStatus, string>> = {
  AT_POINT: 'Confirmar recebimento',
  IN_TRANSIT: 'Enviar para ONG',
  DELIVERED: 'Confirmar entrega',
  DISTRIBUTED: 'Marcar distribuição',
};

const GOVERNANCE_NOTIFICATION_TYPES = new Set([
  'PROFILE_APPROVAL_REQUIRED',
  'PROFILE_REVISION_PENDING',
]);

type OperationalPeriod = 'today' | '7d' | '30d' | 'all';

const OPERATIONAL_PERIOD_OPTIONS: Array<{
  value: OperationalPeriod;
  label: string;
  summary: string;
}> = [
  { value: 'today', label: 'Hoje', summary: 'Atualizadas hoje' },
  { value: '7d', label: '7 dias', summary: 'Últimos 7 dias' },
  { value: '30d', label: '30 dias', summary: 'Últimos 30 dias' },
  { value: 'all', label: 'Tudo', summary: 'Todo o histórico' },
];

function getOperationalPeriod(value: string | string[] | undefined): OperationalPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === 'today' ||
    candidate === '7d' ||
    candidate === '30d' ||
    candidate === 'all'
  ) {
    return candidate;
  }

  return '7d';
}

function getOperationalPeriodSummary(period: OperationalPeriod) {
  return OPERATIONAL_PERIOD_OPTIONS.find((option) => option.value === period)?.summary ?? 'Recorte atual';
}

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

function getPickupPartnerName(role: string, pickupRequest: PickupRequestRecord) {
  if (role === 'COLLECTION_POINT') {
    return pickupRequest.ngo.organizationName ?? pickupRequest.ngo.name;
  }

  return pickupRequest.collectionPoint.organizationName ?? pickupRequest.collectionPoint.name;
}

function getUpcomingPickup(pickupRequests: PickupRequestRecord[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeRequests = pickupRequests
    .filter((pickupRequest) => pickupRequest.status !== 'REJECTED')
    .filter((pickupRequest) => {
      if (!pickupRequest.requestedDate) {
        return true;
      }

      return new Date(pickupRequest.requestedDate).getTime() >= today.getTime();
    })
    .sort((left, right) => {
      const leftDate = left.requestedDate ?? left.createdAt;
      const rightDate = right.requestedDate ?? right.createdAt;

      return new Date(leftDate).getTime() - new Date(rightDate).getTime();
    });

  return activeRequests[0] ?? null;
}

function OperationalHome({
  firstName,
  role,
  profile,
  partnerships,
  pickupRequests,
  operationQueue,
  operationMeta,
  accessToken,
  period,
  hasDataError,
}: {
  firstName: string;
  role: string;
  profile: MyProfile | null;
  partnerships: PartnershipRecord[];
  pickupRequests: PickupRequestRecord[];
  operationQueue: DonationRecord[];
  operationMeta: OperationalDonationListResponse['meta'] | null;
  accessToken: string;
  period: OperationalPeriod;
  hasDataError: boolean;
}) {
  const roleLabel = ROLE_LABELS[role] ?? role;
  const organizationName =
    profile?.organizationName ?? profile?.name ?? 'Organização não informada';
  const profileStateLabel = PROFILE_STATE_LABELS[profile?.publicProfileState ?? 'DRAFT'] ?? 'Rascunho';
  const completion = profile?.profileCompletion;
  const completionPercent =
    completion && completion.totalItems > 0
      ? Math.round((completion.completedItems / completion.totalItems) * 100)
      : null;
  const isVerified = Boolean(profile?.verifiedAt || profile?.publicProfileState === 'VERIFIED');
  const activePartnership = partnerships.find(
    (partnership) => partnership.status === 'ACTIVE' && partnership.isActive,
  );
  const activePartnerName = activePartnership
    ? role === 'COLLECTION_POINT'
      ? activePartnership.ngo.organizationName ?? activePartnership.ngo.name
      : activePartnership.collectionPoint.organizationName ?? activePartnership.collectionPoint.name
    : null;
  const pendingPickupRequests = pickupRequests.filter(
    (pickupRequest) => pickupRequest.status === 'PENDING',
  );
  const actionableOperations = operationQueue.filter(
    (donation) => donation.allowedNextStatuses.length > 0,
  );
  const nextAction = actionableOperations[0] ?? null;
  const statusCounts = operationMeta?.statusCounts ?? {};
  const countFor = (status: DonationStatus) => (operationMeta ? statusCounts[status] ?? 0 : null);
  const upcomingPickup = getUpcomingPickup(pickupRequests);
  const pickupTimeWindow =
    upcomingPickup?.timeWindowStart && upcomingPickup.timeWindowEnd
      ? `${upcomingPickup.timeWindowStart} - ${upcomingPickup.timeWindowEnd}`
      : null;
  const operationalStageCards: Array<{
    status: DonationStatus;
    label: string;
    hint: string;
    icon: LucideIcon;
    tone: string;
  }> = [
    {
      status: 'PENDING',
      label: 'Pendentes',
      hint: role === 'COLLECTION_POINT' ? 'aguardando recebimento' : 'aguardando origem',
      icon: Clock3,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      status: role === 'NGO' ? 'DELIVERED' : 'AT_POINT',
      label: role === 'NGO' ? 'Recebidas' : 'No ponto',
      hint: role === 'NGO' ? 'para conferir ou distribuir' : 'prontas para preparar',
      icon: Package,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      status: 'IN_TRANSIT',
      label: 'Em trânsito',
      hint: 'em deslocamento',
      icon: Truck,
      tone: 'bg-indigo-50 text-indigo-700',
    },
    {
      status: role === 'NGO' ? 'DISTRIBUTED' : 'DELIVERED',
      label: role === 'NGO' ? 'Distribuídas' : 'Entregues',
      hint: role === 'NGO' ? 'ciclo social concluído' : 'recebidas pela ONG',
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700',
    },
  ];
  const navLinks = [
    { href: '/inicio', label: 'Início' },
    { href: '/mapa', label: 'Explorar pontos' },
    { href: '/operacoes', label: 'Operações' },
    { href: '/rastreio', label: 'Rastreio' },
  ];

  return (
    <div className="vg-dark-fix px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        {hasDataError && (
          <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex gap-3">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <p>
                Alguns dados operacionais não puderam ser carregados agora. Os blocos abaixo usam
                somente informações disponíveis nesta leitura.
              </p>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-[2rem] bg-white p-4 shadow-card sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/inicio" className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-deeper text-sm font-black text-white">
                VG
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-black tracking-tight text-primary-deeper">
                  VestGO
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-400">
                  Doações Rastreáveis
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full border border-gray-200 bg-surface p-1 lg:flex">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-white hover:text-primary-deeper"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-[1.75rem] bg-primary-deeper p-5 text-white lg:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-muted">
                  {roleLabel}
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary-deeper">
                    <ShieldCheck size={13} />
                    Verificado
                  </span>
                )}
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-primary-muted">Olá, {firstName}</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  Painel operacional
                </h1>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-primary-muted">
                  <span className="rounded-full bg-white/10 px-3 py-2">
                    {organizationName}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-2">
                    {activePartnerName ? `Parceria ativa: ${activePartnerName}` : 'Sem parceria ativa'}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-2">
                    {operationMeta ? `${operationMeta.actionableCount} ação(ões) pendente(s)` : 'Fila indisponível'}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {OPERATIONAL_PERIOD_OPTIONS.map((option) => (
                  <Link
                    key={option.value}
                    href={option.value === '7d' ? '/inicio' : `/inicio?period=${option.value}`}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      period === option.value
                        ? 'bg-white text-primary-deeper'
                        : 'bg-white/10 text-primary-muted hover:bg-white/20'
                    }`}
                    aria-current={period === option.value ? 'page' : undefined}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>

            <aside className="rounded-[1.75rem] border border-gray-100 bg-surface p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                Perfil operacional
              </p>
              {profile ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-primary-deeper shadow-sm">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-primary-deeper">
                        {organizationName}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{roleLabel}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-semibold text-gray-400">Perfil público</p>
                      <p className="mt-1 text-sm font-bold text-primary-deeper">{profileStateLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-semibold text-gray-400">Completude</p>
                      <p className="mt-1 text-sm font-bold text-primary-deeper">
                        {completionPercent != null ? `${completionPercent}%` : 'Pendente'}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/perfil/operacional"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-primary-deeper transition-colors hover:bg-primary-light"
                  >
                    Ver perfil público
                    <ExternalLink size={14} />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-white p-4">
                  <p className="text-sm font-bold text-primary-deeper">Sem perfil operacional carregado</p>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Revise seu cadastro operacional para publicar dados, parceria e checklist.
                  </p>
                  <Link
                    href="/perfil/operacional"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary"
                  >
                    Abrir perfil
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {operationalStageCards.map(({ status, label, hint, icon: Icon, tone }) => {
            const value = countFor(status);

            return (
              <Link
                key={`${label}-${status}`}
                href={`/operacoes?status=${status}`}
                className="rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-card transition-colors hover:border-primary/20 hover:bg-primary-light/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon size={18} />
                  </div>
                  <ArrowRight size={16} className="text-gray-300" />
                </div>
                <p className="mt-4 text-3xl font-black text-primary-deeper">
                  {value == null ? '—' : value}
                </p>
                <p className="mt-1 text-sm font-bold text-on-surface">{label}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">{hint}</p>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[2rem] bg-white p-5 shadow-card lg:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-[1.75rem] bg-primary-light p-5">
                <div className="flex items-center gap-2 text-primary-deeper">
                  <QrCode size={18} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em]">
                    Entrada operacional
                  </p>
                </div>
                <h2 className="mt-3 text-2xl font-black text-primary-deeper">
                  {role === 'COLLECTION_POINT' ? 'Receber doação' : 'Localizar doação'}
                </h2>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link
                    href="/operacoes?actionableOnly=true"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <ClipboardList size={16} />
                    {role === 'COLLECTION_POINT' ? 'Receber doação' : 'Abrir fila'}
                  </Link>
                  <OperationalHomeScanButton accessToken={accessToken} />
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                      Próxima ação recomendada
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-primary-deeper">
                      {nextAction ? nextAction.code : 'Sem ação imediata'}
                    </h2>
                  </div>
                  <Link
                    href="/operacoes?actionableOnly=true"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-primary"
                  >
                    Ver fila
                    <ArrowRight size={14} />
                  </Link>
                </div>

                {nextAction ? (
                  <div className="mt-5 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          STATUS_META[nextAction.status].tone
                        }`}
                      >
                        {STATUS_META[nextAction.status].label}
                      </span>
                      <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-gray-500">
                        {formatDateLabel(nextAction.updatedAt)}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-surface p-4">
                      <p className="text-sm font-bold text-on-surface">{nextAction.itemLabel}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {nextAction.itemCount} item(ns) · {getOperationPartnerLabel(role, nextAction)}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <StatusActionPanel compact donation={nextAction} />
                      <Link
                        href={`/rastreio/${nextAction.id}`}
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-primary-deeper transition-colors hover:bg-surface"
                      >
                        Detalhes
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.5rem] bg-surface p-5">
                    <p className="text-sm font-bold text-primary-deeper">
                      Nenhuma doação exige ação deste perfil no recorte atual.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {getOperationalPeriodSummary(period)} · {operationMeta ? `${operationMeta.count} registro(s)` : 'dados indisponíveis'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] bg-white p-5 shadow-card lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Agenda
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-primary-deeper">
                    Próxima retirada
                  </h2>
                </div>
                <CalendarDays size={20} className="text-primary" />
              </div>

              {upcomingPickup ? (
                <div className="mt-5 rounded-[1.5rem] bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm">
                      <p className="text-[10px] font-bold uppercase text-gray-400">
                        {upcomingPickup.requestedDate ? formatDateLabel(upcomingPickup.requestedDate) : 'A definir'}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-on-surface">
                        {getPickupPartnerName(role, upcomingPickup)}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {pickupTimeWindow ?? 'Janela de horário não definida'}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-gray-400">
                        {pendingPickupRequests.length} solicitação(ões) para responder
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">
                        Itens: sem contagem vinculada à retirada
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[1.5rem] bg-surface p-5">
                  <p className="text-sm font-bold text-primary-deeper">
                    Nenhuma retirada agendada.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Quando uma solicitação real tiver data ou resposta, ela aparece aqui.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-card lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Saúde do perfil
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-primary-deeper">Status</h2>
                </div>
                <ShieldCheck size={20} className="text-primary" />
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-surface p-4">
                  <span className="text-sm font-semibold text-gray-500">Perfil público</span>
                  <span className="text-sm font-bold text-primary-deeper">{profileStateLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-surface p-4">
                  <span className="text-sm font-semibold text-gray-500">Parceria</span>
                  <span className="text-sm font-bold text-primary-deeper">
                    {activePartnerName ? 'Ativa' : 'Sem ativa'}
                  </span>
                </div>
                <div className="rounded-[1.25rem] bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-500">Completude</span>
                    <span className="text-sm font-bold text-primary-deeper">
                      {completionPercent != null ? `${completionPercent}%` : 'Pendente'}
                    </span>
                  </div>
                  {completion && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${completionPercent ?? 0}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
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
  return (
    <div className="vg-dark-fix px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="rounded-[2rem] bg-white p-6 shadow-card lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck size={14} />
              Governança ativa
            </span>
            <span className="rounded-full bg-surface px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Administrador
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-primary-deeper sm:text-4xl">
            Olá, {firstName}
          </h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link href="/admin/perfis" className="rounded-[1.5rem] bg-surface p-4 transition-colors hover:bg-primary-light/40">
              <p className="text-3xl font-black text-primary-deeper">{pendingApprovals.length}</p>
              <p className="mt-1 text-sm font-semibold text-gray-500">Perfis aguardando aprovação</p>
            </Link>
            <Link href="/admin/perfis" className="rounded-[1.5rem] bg-surface p-4 transition-colors hover:bg-primary-light/40">
              <p className="text-3xl font-black text-primary-deeper">{pendingRevisions.length}</p>
              <p className="mt-1 text-sm font-semibold text-gray-500">Revisões públicas pendentes</p>
            </Link>
            <Link href="/notificacoes" className="rounded-[1.5rem] bg-surface p-4 transition-colors hover:bg-primary-light/40">
              <p className="text-3xl font-black text-primary-deeper">{notifications.length}</p>
              <p className="mt-1 text-sm font-semibold text-gray-500">Alertas recentes</p>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  Aprovação inicial
                </p>
                <h2 className="mt-2 text-2xl font-black text-primary-deeper">Perfis pendentes</h2>
              </div>
              <Link href="/admin/perfis" className="text-sm font-bold text-primary">Abrir</Link>
            </div>
            <div className="mt-5 space-y-3">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((profile) => (
                  <div key={profile.id} className="rounded-[1.25rem] bg-surface p-4">
                    <p className="text-sm font-bold text-on-surface">
                      {profile.organizationName ?? profile.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {ROLE_LABELS[profile.role] ?? profile.role}
                      {profile.city && profile.state ? ` · ${profile.city}, ${profile.state}` : ''}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] bg-surface p-5 text-sm font-semibold text-primary-deeper">
                  Nenhum perfil novo aguardando aprovação.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  Revisões públicas
                </p>
                <h2 className="mt-2 text-2xl font-black text-primary-deeper">Alterações pendentes</h2>
              </div>
              <Link href="/admin/perfis" className="text-sm font-bold text-primary">Revisar</Link>
            </div>
            <div className="mt-5 space-y-3">
              {pendingRevisions.length > 0 ? (
                pendingRevisions.map((profile) => (
                  <div key={profile.id} className="rounded-[1.25rem] bg-surface p-4">
                    <p className="text-sm font-bold text-on-surface">
                      {profile.organizationName ?? profile.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {profile.pendingPublicRevision?.fields.length
                        ? profile.pendingPublicRevision.fields.join(', ')
                        : 'Alterações públicas aguardando avaliação'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] bg-surface p-5 text-sm font-semibold text-primary-deeper">
                  Nenhuma revisão pública pendente no momento.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default async function InicioPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'você';
  const accessToken = session?.user?.accessToken ?? '';
  const role = session?.user?.role ?? 'DONOR';

  if (role === 'ADMIN') {
    let pendingApprovals: AdminProfileRecord[] = [];
    let pendingRevisions: AdminProfileRecord[] = [];
    let notifications: NotificationRecord[] = [];

    if (accessToken) {
      const [pendingApprovalsResponse, pendingRevisionsResponse, notificationsResponse] =
        await Promise.allSettled([
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

      if (pendingApprovalsResponse.status === 'fulfilled') {
        pendingApprovals = pendingApprovalsResponse.value.data;
      }

      if (pendingRevisionsResponse.status === 'fulfilled') {
        pendingRevisions = pendingRevisionsResponse.value.data;
      }

      if (notificationsResponse.status === 'fulfilled') {
        notifications = notificationsResponse.value.data
          .filter((notification) => GOVERNANCE_NOTIFICATION_TYPES.has(notification.type))
          .slice(0, 5);
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
    const period = getOperationalPeriod(searchParams?.period);
    let profile: MyProfile | null = null;
    let partnerships: PartnershipRecord[] = [];
    let pickupRequests: PickupRequestRecord[] = [];
    let operationQueue: DonationRecord[] = [];
    let operationMeta: OperationalDonationListResponse['meta'] | null = null;
    let hasDataError = !accessToken;

    if (accessToken) {
      const [profileResponse, partnershipsResponse, pickupRequestsResponse, operationResponse] =
        await Promise.allSettled([
          getMyProfile(accessToken),
          getMyPartnerships(accessToken),
          getPickupRequests(accessToken),
          getOperationalDonations(accessToken, {
            limit: 8,
            sortBy: 'updatedAt',
            direction: 'desc',
            period,
          }),
        ]);

      hasDataError = [
        profileResponse,
        partnershipsResponse,
        pickupRequestsResponse,
        operationResponse,
      ].some((result) => result.status === 'rejected');

      if (profileResponse.status === 'fulfilled') {
        profile = profileResponse.value;
      }

      if (partnershipsResponse.status === 'fulfilled') {
        partnerships = partnershipsResponse.value.data;
      }

      if (pickupRequestsResponse.status === 'fulfilled') {
        pickupRequests = pickupRequestsResponse.value.data;
      }

      if (operationResponse.status === 'fulfilled') {
        operationQueue = operationResponse.value.data;
        operationMeta = operationResponse.value.meta;
      }
    }

    return (
      <OperationalHome
        accessToken={accessToken}
        firstName={firstName}
        role={role}
        profile={profile}
        partnerships={partnerships}
        pickupRequests={pickupRequests}
        operationQueue={operationQueue}
        operationMeta={operationMeta}
        period={period}
        hasDataError={hasDataError}
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
