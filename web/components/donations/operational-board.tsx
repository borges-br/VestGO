'use client';

import Link from 'next/link';
import { startTransition, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Loader2,
  MapPin,
  Package,
  Route,
  Search,
  Truck,
  X,
} from 'lucide-react';
import {
  DONATION_STATUS_ACTIONS,
  DONATION_STATUS_CONFIG,
  DONATION_STATUS_ORDER,
  formatDonationDateLabel,
} from '@/components/donations/donation-status';
import {
  CategoryGlyph,
  CATEGORY_META,
} from '@/components/operations/category-glyph';
import {
  updateDonationStatus,
  type DonationEvent,
  type DonationItem,
  type DonationPoint,
  type DonationRecord,
  type DonationStatus,
  type ItemCategory,
  type PublicProfileState,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const DONATION_STATUSES: DonationStatus[] = [
  'PENDING',
  'AT_POINT',
  'IN_TRANSIT',
  'DELIVERED',
  'DISTRIBUTED',
  'CANCELLED',
];

const ROLE_LABELS: Record<string, string> = {
  COLLECTION_POINT: 'Ponto de coleta',
  NGO: 'ONG parceira',
  ADMIN: 'Administração operacional',
};

const PROFILE_STATE_LABELS: Partial<Record<PublicProfileState, string>> = {
  ACTIVE: 'Perfil ativo',
  VERIFIED: 'Verificada',
  PENDING: 'Em revisão',
};

const STATUS_OPTIONS: Array<{ value: 'ALL' | DonationStatus; label: string }> = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'AT_POINT', label: 'No ponto' },
  { value: 'IN_TRANSIT', label: 'Em trânsito' },
  { value: 'DELIVERED', label: 'Entregues' },
  { value: 'DISTRIBUTED', label: 'Distribuídas' },
  { value: 'CANCELLED', label: 'Canceladas' },
];

const CONDITION_LABELS: Record<DonationItem['condition'], string> = {
  EXCELLENT: 'Excelente',
  GOOD: 'Bom estado',
};

const TONE_CLASSES = {
  amber: {
    dot: 'bg-amber-500',
    icon: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
    active: 'border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-100',
  },
  blue: {
    dot: 'bg-blue-500',
    icon: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
    active: 'border-blue-500/40 bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-100',
  },
  indigo: {
    dot: 'bg-indigo-500',
    icon: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200',
    active: 'border-indigo-500/40 bg-indigo-50 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-100',
  },
  primary: {
    dot: 'bg-primary',
    icon: 'bg-primary-light text-primary-deeper dark:bg-primary/20 dark:text-primary-muted',
    active: 'border-primary/40 bg-primary-light text-primary-deeper dark:bg-primary/20 dark:text-primary-muted',
  },
  emerald: {
    dot: 'bg-emerald-500',
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    active: 'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100',
  },
  red: {
    dot: 'bg-red-500',
    icon: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200',
    active: 'border-red-500/40 bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-100',
  },
} as const;

type Tone = keyof typeof TONE_CLASSES;

type KpiSpec = {
  key: string;
  label: string;
  statuses: DonationStatus[];
  tone: Tone;
};

type GroupSpec = KpiSpec & {
  hint: string;
  defaultOpen?: boolean;
  emptyMessage: string;
};

interface OperationalBoardProps {
  initialDonations: DonationRecord[];
  role: string;
  availableCollectionPoints: DonationPoint[];
  availableNgos: DonationPoint[];
  initialFilters: {
    status: DonationStatus | null;
    collectionPointId: string | null;
    ngoId: string | null;
    actionableOnly: boolean;
    sortBy: 'updatedAt' | 'createdAt';
    direction: 'asc' | 'desc';
  };
  actionableCount: number;
  organizationName?: string | null;
  operatorName?: string | null;
  publicProfileState?: PublicProfileState | null;
  verifiedAt?: string | null;
  children?: ReactNode;
}

function isDonationStatus(value: string | null): value is DonationStatus {
  return DONATION_STATUSES.includes(value as DonationStatus);
}

function pointLabel(point: DonationPoint | null | undefined) {
  return point?.organizationName ?? point?.name ?? 'Não informado';
}

function partnerLine(role: string, donation: DonationRecord) {
  if (role === 'NGO') {
    return pointLabel(donation.collectionPoint ?? donation.dropOffPoint);
  }

  if (role === 'COLLECTION_POINT') {
    return pointLabel(donation.ngo);
  }

  return `${pointLabel(donation.collectionPoint ?? donation.dropOffPoint)} -> ${pointLabel(donation.ngo)}`;
}

function getGroupsForRole(role: string): GroupSpec[] {
  if (role === 'NGO') {
    return [
      {
        key: 'ngo-inbound',
        label: 'A caminho da ONG',
        hint: 'Confirme o recebimento',
        statuses: ['IN_TRANSIT'],
        tone: 'indigo',
        defaultOpen: true,
        emptyMessage: 'Nenhuma doação em trânsito agora.',
      },
      {
        key: 'ngo-delivered',
        label: 'Recebidas (a distribuir)',
        hint: 'Próximo passo: distribuição',
        statuses: ['DELIVERED'],
        tone: 'primary',
        defaultOpen: true,
        emptyMessage: 'Nada aguardando distribuição neste recorte.',
      },
      {
        key: 'ngo-collecting',
        label: 'Em coleta',
        hint: 'Acompanhamento da origem',
        statuses: ['AT_POINT', 'PENDING'],
        tone: 'blue',
        emptyMessage: 'Nenhuma doação em coleta.',
      },
      {
        key: 'ngo-distributed',
        label: 'Distribuídas',
        hint: 'Ciclo concluído',
        statuses: ['DISTRIBUTED'],
        tone: 'emerald',
        defaultOpen: false,
        emptyMessage: 'Nenhuma distribuição registrada.',
      },
      {
        key: 'ngo-cancelled',
        label: 'Canceladas',
        hint: 'Histórico operacional',
        statuses: ['CANCELLED'],
        tone: 'red',
        defaultOpen: false,
        emptyMessage: 'Nenhuma doação cancelada.',
      },
    ];
  }

  return [
    {
      key: 'cp-pending',
      label: 'Pendentes (a receber no ponto)',
      hint: 'Doador trará as peças',
      statuses: ['PENDING'],
      tone: 'amber',
      defaultOpen: true,
      emptyMessage: 'Nenhuma doação pendente para receber.',
    },
    {
      key: 'cp-at-point',
      label: 'No ponto (a despachar)',
      hint: 'Agrupar em carga (Lote)',
      statuses: ['AT_POINT'],
      tone: 'blue',
      defaultOpen: true,
      emptyMessage: 'Nenhuma doação aguardando despacho.',
    },
    {
      key: 'cp-transit',
      label: 'Em trânsito',
      hint: 'Carga em rota',
      statuses: ['IN_TRANSIT'],
      tone: 'indigo',
      defaultOpen: false,
      emptyMessage: 'Nenhuma carga em rota neste recorte.',
    },
    {
      key: 'cp-complete',
      label: 'Concluídas',
      hint: 'Recebidas pela ONG',
      statuses: ['DELIVERED', 'DISTRIBUTED'],
      tone: 'emerald',
      defaultOpen: false,
      emptyMessage: 'Nenhuma doação concluída.',
    },
    {
      key: 'cp-cancelled',
      label: 'Canceladas',
      hint: 'Histórico operacional',
      statuses: ['CANCELLED'],
      tone: 'red',
      defaultOpen: false,
      emptyMessage: 'Nenhuma doação cancelada.',
    },
  ];
}

function getKpisForRole(role: string): KpiSpec[] {
  if (role === 'NGO') {
    return [
      { key: 'IN_TRANSIT', label: 'A caminho', statuses: ['IN_TRANSIT'], tone: 'indigo' },
      { key: 'DELIVERED', label: 'Para distribuir', statuses: ['DELIVERED'], tone: 'primary' },
      { key: 'DISTRIBUTED', label: 'Distribuídas', statuses: ['DISTRIBUTED'], tone: 'emerald' },
      { key: 'ngo-collecting', label: 'Em coleta', statuses: ['AT_POINT', 'PENDING'], tone: 'blue' },
    ];
  }

  return [
    { key: 'PENDING', label: 'Pendentes', statuses: ['PENDING'], tone: 'amber' },
    { key: 'AT_POINT', label: 'No ponto', statuses: ['AT_POINT'], tone: 'blue' },
    { key: 'IN_TRANSIT', label: 'Em trânsito', statuses: ['IN_TRANSIT'], tone: 'indigo' },
    { key: 'cp-complete', label: 'Concluídas', statuses: ['DELIVERED', 'DISTRIBUTED'], tone: 'emerald' },
  ];
}

function getExpectedNextStatus(status: DonationStatus): DonationStatus | null {
  if (status === 'PENDING') return 'AT_POINT';
  if (status === 'AT_POINT') return 'IN_TRANSIT';
  if (status === 'IN_TRANSIT') return 'DELIVERED';
  if (status === 'DELIVERED') return 'DISTRIBUTED';
  return null;
}

function getActionLabel(donation: DonationRecord) {
  if (donation.status === 'PENDING') return 'Receber no ponto';
  if (donation.status === 'AT_POINT') return 'Vincular a carga & despachar';
  if (donation.status === 'IN_TRANSIT') return 'Confirmar recebimento';
  if (donation.status === 'DELIVERED') return 'Marcar como distribuída';
  return null;
}

function getStatusLocation(donation: DonationRecord, nextStatus: DonationStatus) {
  if (nextStatus === 'AT_POINT' || nextStatus === 'IN_TRANSIT') {
    return pointLabel(donation.collectionPoint ?? donation.dropOffPoint);
  }

  if (nextStatus === 'DELIVERED' || nextStatus === 'DISTRIBUTED') {
    return pointLabel(donation.ngo);
  }

  return undefined;
}

function CategoryCluster({ items }: { items: DonationItem[] }) {
  const categories = useMemo(() => {
    const totals = new Map<ItemCategory, number>();

    for (const item of items) {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.quantity);
    }

    return Array.from(totals, ([category, quantity]) => ({ category, quantity }));
  }, [items]);

  if (categories.length === 0) {
    return (
      <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-gray-500">
        Itens não informados
      </span>
    );
  }

  const visible = categories.slice(0, 4);
  const overflow = categories.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map(({ category, quantity }) => (
        <span
          key={category}
          title={`${CATEGORY_META[category].label}: ${quantity}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-primary-deeper"
        >
          <CategoryGlyph category={category} size={14} className="text-gray-500" />
          <span className="tabular-nums">{quantity}</span>
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-gray-500">
          +{overflow}
        </span>
      )}
    </div>
  );
}
function StatusPill({ status }: { status: DonationStatus }) {
  const cfg = DONATION_STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        cfg.bg,
        cfg.color,
      )}
    >
      <StatusIcon size={12} aria-hidden />
      {cfg.label}
    </span>
  );
}

function PipelineProgress({ status }: { status: DonationStatus }) {
  const activeIndex = DONATION_STATUS_ORDER.indexOf(status);

  return (
    <div
      className="grid grid-cols-5 gap-1"
      aria-label={`Etapa atual: ${DONATION_STATUS_CONFIG[status].label}`}
    >
      {DONATION_STATUS_ORDER.map((step, index) => (
        <span
          key={step}
          className={cn(
            'h-1.5 rounded-full',
            index <= activeIndex && activeIndex >= 0 ? 'bg-primary' : 'bg-gray-200',
          )}
        />
      ))}
    </div>
  );
}

function Timeline({ events }: { events: DonationEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum evento registrado ainda.</p>;
  }

  const sorted = [...events].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return (
    <ol className="relative space-y-0 pl-5" aria-label="Histórico da doação">
      <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-gray-200" />
      {sorted.map((event, index) => {
        const cfg = DONATION_STATUS_CONFIG[event.status];
        const isLatest = index === 0;

        return (
          <li key={event.id} className="relative pb-4 last:pb-0">
            <span
              aria-hidden
              className={cn(
                'absolute left-[-18px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white',
                isLatest ? 'bg-primary' : 'bg-gray-300',
              )}
            />
            <p className={cn('text-sm font-semibold', isLatest ? 'text-primary-deeper' : 'text-gray-600')}>
              {event.description}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {formatDonationDateLabel(event.createdAt)}
              {event.location ? ` - ${event.location}` : ''}
              <span className={cn('ml-2', cfg.color)}>{cfg.label}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function ItemsSummary({ items }: { items: DonationItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Itens não especificados.</p>;
  }

  return (
    <ul className="grid gap-2" aria-label="Itens da doação">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm"
        >
          <span className="inline-flex min-w-0 items-center gap-2 font-medium text-on-surface">
            <CategoryGlyph category={item.category} size={15} className="shrink-0 text-gray-500" />
            <span className="truncate">{item.name}</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-semibold tabular-nums">{item.quantity}x</span>
            <span className="rounded-full bg-white px-2 py-0.5 font-semibold">
              {CONDITION_LABELS[item.condition]}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

interface DonationActionProps {
  donation: DonationRecord;
  compact?: boolean;
  onUpdated: (donation: DonationRecord) => void;
}

function DonationPrimaryAction({ donation, compact = false, onUpdated }: DonationActionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [pending, setPending] = useState(false);
  const nextStatus = getExpectedNextStatus(donation.status);
  const label = getActionLabel(donation);

  if (!nextStatus || !label) {
    return null;
  }

  const isAllowed = donation.allowedNextStatuses.includes(nextStatus);
  const handledByBatchFlow = donation.status === 'AT_POINT';
  const disabled = pending || !isAllowed || handledByBatchFlow;
  const helper = !isAllowed
    ? 'Sem permissão para esta etapa'
    : handledByBatchFlow
      ? 'Use a faixa de cargas (LOT) para vincular e despachar com segurança.'
      : null;

  async function execute() {
    if (!nextStatus || disabled) {
      return;
    }

    if (!session?.user?.accessToken) {
      toast.error('Sessão expirada', { description: 'Entre novamente para continuar.' });
      return;
    }

    setPending(true);

    try {
      const updated = await updateDonationStatus(
        donation.id,
        {
          status: nextStatus,
          description: DONATION_STATUS_ACTIONS[nextStatus].description,
          location: getStatusLocation(donation, nextStatus),
        },
        session.user.accessToken,
      );

      onUpdated(updated);
      toast.success(`${label} - ${donation.code}`, {
        description: 'Status atualizado com sucesso.',
      });
      startTransition(() => router.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível atualizar o status.';
      toast.error('Falha ao atualizar status', { description: message });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn('space-y-1.5', compact && 'w-full')}>
      <button
        type="button"
        onClick={execute}
        disabled={disabled}
        aria-disabled={disabled}
        title={helper ?? undefined}
        className={cn(
          'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          disabled
            ? 'cursor-not-allowed bg-surface text-gray-400'
            : 'bg-primary-deeper text-white hover:bg-primary-dark',
        )}
      >
        {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <CheckCircle2 size={15} aria-hidden />}
        {pending ? 'Salvando...' : label}
      </button>
      {helper && (
        <p className="text-xs leading-5 text-gray-500">
          {handledByBatchFlow ? <span className="font-semibold text-primary">Via cargas:</span> : null}{' '}
          {helper}
        </p>
      )}
    </div>
  );
}

interface DonationRowProps {
  donation: DonationRecord;
  role: string;
  defaultOpen?: boolean;
  onUpdated: (donation: DonationRecord) => void;
}

function DonationRow({ donation, role, defaultOpen = false, onUpdated }: DonationRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const latestDate = donation.latestEvent?.createdAt ?? donation.updatedAt;

  return (
    <article className="overflow-hidden rounded-[14px] border border-gray-100 bg-white shadow-sm transition-colors hover:border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`donation-detail-${donation.id}`}
        className="grid w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
      >
        <span
          aria-hidden
          className={cn(
            'hidden h-8 w-8 place-items-center rounded-lg bg-surface text-gray-500 transition-transform sm:grid',
            open && 'rotate-180',
          )}
        >
          <ChevronDown size={16} />
        </span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-surface px-2 py-1 font-mono text-xs font-bold tracking-wide text-primary-deeper">
              {donation.code}
            </span>
            <StatusPill status={donation.status} />
            {donation.operationalBatch && (
              <span className="rounded-md border border-dashed border-gray-300 px-2 py-1 font-mono text-[11px] font-semibold text-gray-500">
                {donation.operationalBatch.code}
              </span>
            )}
          </span>

          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <CategoryCluster items={donation.items} />
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin size={12} aria-hidden />
              {partnerLine(role, donation)}
            </span>
            <time className="text-xs text-gray-400" dateTime={latestDate}>
              {formatDonationDateLabel(latestDate)}
            </time>
          </span>

          {donation.latestEvent?.description && (
            <span className="mt-2 block truncate text-xs text-gray-400">
              {donation.latestEvent.description}
            </span>
          )}
        </span>

        <span className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-right">
            <span className="block text-lg font-bold leading-none text-primary-deeper tabular-nums">
              {donation.itemCount}
            </span>
            <span className="text-[11px] font-semibold text-gray-400">peças</span>
          </span>
          <span
            aria-hidden
            className={cn('grid h-8 w-8 place-items-center rounded-lg bg-surface text-gray-500 transition-transform sm:hidden', open && 'rotate-180')}
          >
            <ChevronDown size={16} />
          </span>
        </span>
      </button>

      <div id={`donation-detail-${donation.id}`} hidden={!open} className={cn(!open && 'hidden')}>
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <section className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Progresso
                </p>
                <PipelineProgress status={donation.status} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Origem
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {pointLabel(donation.collectionPoint ?? donation.dropOffPoint)}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Destino
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {pointLabel(donation.ngo)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Itens ({donation.itemCount})
                </p>
                <ItemsSummary items={donation.items} />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Historico
                </p>
                <Timeline events={donation.timeline} />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <DonationPrimaryAction donation={donation} compact onUpdated={onUpdated} />
                <Link
                  href={`/rastreio/${donation.id}`}
                  aria-label={`Ver rastreio completo da doação ${donation.code}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Route size={14} aria-hidden />
                  Ver rastreio
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}

interface GroupProps {
  group: GroupSpec;
  donations: DonationRecord[];
  role: string;
  onUpdated: (donation: DonationRecord) => void;
}

function Group({ group, donations, role, onUpdated }: GroupProps) {
  const [open, setOpen] = useState(group.defaultOpen ?? donations.length > 0);
  const tone = TONE_CLASSES[group.tone];
  const actionable = donations.filter((donation) => donation.allowedNextStatuses.length > 0).length;
  const contentId = `operation-group-${group.key}`;

  return (
    <section aria-labelledby={`${contentId}-heading`}>
      <button
        id={`${contentId}-heading`}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-controls={contentId}
        aria-expanded={open}
        className="flex w-full items-center gap-3 border-b border-gray-200 px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className={cn('grid h-6 w-6 place-items-center rounded-lg', tone.icon)}>
          <ChevronDown
            size={14}
            aria-hidden
            className={cn('transition-transform', !open && '-rotate-90')}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-primary-deeper">{group.label}</span>
            <span className={cn('h-2 w-2 rounded-full', tone.dot)} aria-hidden />
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums', tone.icon)}>
              {donations.length}
            </span>
            {actionable > 0 && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-white">
                {actionable} {actionable === 1 ? 'ação' : 'ações'}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-gray-500">{group.hint}</span>
        </span>
      </button>

      <div id={contentId} hidden={!open} className={cn(!open && 'hidden', 'mt-2 grid gap-2')}>
        {donations.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-500">
            {group.emptyMessage}
          </div>
        ) : (
          donations.map((donation) => (
            <DonationRow
              key={donation.id}
              donation={donation}
              role={role}
              onUpdated={onUpdated}
            />
          ))
        )}
      </div>
    </section>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
      {hasFilters ? (
        <Search size={30} className="mx-auto text-gray-300" aria-hidden />
      ) : (
        <Package size={30} className="mx-auto text-primary/50" aria-hidden />
      )}
      <p className="mt-4 text-base font-semibold text-primary-deeper">
        {hasFilters ? 'Nenhum resultado neste recorte' : 'Nenhuma doação operacional por aqui'}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {hasFilters
          ? 'Remova algum filtro ou ajuste a busca para encontrar outras doações.'
          : 'Quando a rede movimentar novas doações, elas aparecem agrupadas por etapa operacional.'}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-deeper px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={14} aria-hidden />
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[76px] animate-pulse rounded-[14px] border border-gray-100 bg-white"
        />
      ))}
    </div>
  );
}

export function OperationalBoard({
  initialDonations,
  role,
  availableCollectionPoints,
  availableNgos,
  initialFilters,
  actionableCount: initialActionableCount,
  organizationName,
  operatorName,
  publicProfileState,
  verifiedAt,
  children,
}: OperationalBoardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [donations, setDonations] = useState(initialDonations);
  const [search, setSearch] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setDonations(initialDonations);
    setIsNavigating(false);
  }, [initialDonations]);

  const activeStatus = isDonationStatus(searchParams.get('status'))
    ? (searchParams.get('status') as DonationStatus)
    : initialFilters.status;
  const activeStatusGroup = searchParams.get('statusGroup');
  const activeCollectionPointId =
    searchParams.get('collectionPointId') ?? initialFilters.collectionPointId ?? '';
  const activeNgoId = searchParams.get('ngoId') ?? initialFilters.ngoId ?? '';
  const activeActionableOnly =
    searchParams.get('actionableOnly') === 'true' || initialFilters.actionableOnly;
  const activeDirection =
    searchParams.get('direction') === 'asc' || searchParams.get('direction') === 'desc'
      ? (searchParams.get('direction') as 'asc' | 'desc')
      : initialFilters.direction;

  const groups = useMemo(() => getGroupsForRole(role), [role]);
  const kpis = useMemo(() => getKpisForRole(role), [role]);

  const counts = useMemo(() => {
    const byStatus: Partial<Record<DonationStatus, number>> = {};

    for (const donation of donations) {
      byStatus[donation.status] = (byStatus[donation.status] ?? 0) + 1;
    }

    return byStatus;
  }, [donations]);

  const actionableCount = useMemo(
    () => donations.filter((donation) => donation.allowedNextStatuses.length > 0).length,
    [donations],
  );

  const activeGroup = groups.find((group) => group.key === activeStatusGroup);
  const statusFilter = activeStatus
    ? [activeStatus]
    : activeGroup
      ? activeGroup.statuses
      : null;

  const filteredDonations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return donations.filter((donation) => {
      if (statusFilter && !statusFilter.includes(donation.status)) {
        return false;
      }

      if (activeActionableOnly && donation.allowedNextStatuses.length === 0) {
        return false;
      }

      if (query) {
        const haystack = [
          donation.code,
          donation.itemLabel,
          donation.collectionPoint?.organizationName,
          donation.collectionPoint?.name,
          donation.dropOffPoint?.organizationName,
          donation.dropOffPoint?.name,
          donation.ngo?.organizationName,
          donation.ngo?.name,
          donation.operationalBatch?.code,
          donation.operationalBatch?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [activeActionableOnly, donations, search, statusFilter]);

  const groupedDonations = useMemo(
    () =>
      groups.map((group) => ({
        group,
        donations: filteredDonations.filter((donation) =>
          group.statuses.includes(donation.status),
        ),
      })),
    [filteredDonations, groups],
  );

  const hasFilters = Boolean(
    search ||
      activeStatus ||
      activeStatusGroup ||
      activeCollectionPointId ||
      activeNgoId ||
      activeActionableOnly,
  );

  const organizationTitle = organizationName?.trim() || 'Painel operacional';
  const firstName = operatorName?.trim().split(' ')[0] ?? null;
  const roleLabel = ROLE_LABELS[role] ?? role;

  function updateQuery(values: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(values)) {
      if (!value || value === 'ALL' || value === 'false') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    setIsNavigating(true);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearFilters() {
    setSearch('');
    updateQuery({
      status: null,
      statusGroup: null,
      collectionPointId: null,
      ngoId: null,
      actionableOnly: null,
    });
  }

  function filterByKpi(kpi: KpiSpec) {
    const isActive =
      activeStatusGroup === kpi.key ||
      (kpi.statuses.length === 1 && activeStatus === kpi.statuses[0]);

    if (isActive) {
      updateQuery({ status: null, statusGroup: null });
      return;
    }

    if (kpi.statuses.length === 1) {
      updateQuery({ status: kpi.statuses[0], statusGroup: null });
      return;
    }

    updateQuery({ status: null, statusGroup: kpi.key });
  }

  function handleUpdated(updatedDonation: DonationRecord) {
    setDonations((current) =>
      current.map((donation) =>
        donation.id === updatedDonation.id ? updatedDonation : donation,
      ),
    );
  }

  const showCollectionPointFilter = role === 'ADMIN' || role === 'NGO';
  const showNgoFilter = role === 'ADMIN' || role === 'COLLECTION_POINT';
  const profileBadge =
    verifiedAt || publicProfileState === 'VERIFIED'
      ? 'Verificada'
      : publicProfileState
        ? PROFILE_STATE_LABELS[publicProfileState]
        : null;

  return (
    <div className="vg-dark-fix space-y-4">
      <header className="space-y-4 pt-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              {roleLabel}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary-deeper sm:text-4xl">
              {organizationTitle}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              {firstName && (
                <span>
                  Ola, <strong className="font-semibold text-primary-deeper">{firstName}</strong>
                </span>
              )}
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm">
                {filteredDonations.length} resultado{filteredDonations.length === 1 ? '' : 's'}
              </span>
              {profileBadge && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-deeper">
                  <CheckCircle2 size={12} aria-hidden />
                  {profileBadge}
                </span>
              )}
              {actionableCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  <AlertTriangle size={12} aria-hidden />
                  {actionableCount} {actionableCount === 1 ? 'ação pendente' : 'ações pendentes'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={12} aria-hidden />
                  Tudo em dia
                </span>
              )}
            </div>
          </div>
        </div>

        <section
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Indicadores operacionais"
        >
          {kpis.map((kpi) => {
            const value = kpi.statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
            const tone = TONE_CLASSES[kpi.tone];
            const active =
              activeStatusGroup === kpi.key ||
              (kpi.statuses.length === 1 && activeStatus === kpi.statuses[0]);

            return (
              <button
                key={kpi.key}
                type="button"
                onClick={() => filterByKpi(kpi)}
                aria-pressed={active}
                className={cn(
                  'flex min-h-[88px] items-center justify-between gap-3 rounded-[14px] border bg-white p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active ? tone.active : 'border-gray-100 hover:bg-surface',
                )}
              >
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                    {kpi.label}
                  </span>
                  <span className="mt-1 block text-3xl font-extrabold leading-none text-primary-deeper tabular-nums">
                    {value}
                  </span>
                </span>
                <span className={cn('h-3 w-3 rounded-full', tone.dot)} aria-hidden />
              </button>
            );
          })}
        </section>
      </header>

      <section
        className="rounded-[14px] border border-gray-100 bg-white p-3 shadow-sm"
        aria-label="Busca e filtros"
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto] xl:items-center">
          <label className="relative min-w-0">
            <span className="sr-only">Buscar doações</span>
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código, ponto ou ONG..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-surface pl-10 pr-10 text-sm text-on-surface outline-none transition-colors focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </label>

          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
            <Filter size={14} aria-hidden />
            <span className="sr-only">Status</span>
            <select
              value={activeStatus ?? 'ALL'}
              onChange={(event) =>
                updateQuery({
                  status: event.target.value === 'ALL' ? null : event.target.value,
                  statusGroup: null,
                })
              }
              className="min-w-0 bg-transparent text-sm font-semibold text-on-surface outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {showCollectionPointFilter && (
            <label className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <span className="sr-only">Ponto de coleta</span>
              <select
                value={activeCollectionPointId}
                onChange={(event) =>
                  updateQuery({ collectionPointId: event.target.value || null })
                }
                className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
              >
                <option value="">Todos os pontos</option>
                {availableCollectionPoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {pointLabel(point)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {showNgoFilter && (
            <label className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <span className="sr-only">ONG</span>
              <select
                value={activeNgoId}
                onChange={(event) => updateQuery({ ngoId: event.target.value || null })}
                className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
              >
                <option value="">Todas as ONGs</option>
                {availableNgos.map((ngo) => (
                  <option key={ngo.id} value={ngo.id}>
                    {pointLabel(ngo)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={() =>
              updateQuery({
                actionableOnly: activeActionableOnly ? null : 'true',
              })
            }
            aria-pressed={activeActionableOnly}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              activeActionableOnly
                ? 'border-primary/40 bg-primary-light text-primary-deeper'
                : 'border-gray-200 bg-white text-gray-600 hover:text-primary-deeper',
            )}
          >
            <Clock3 size={14} aria-hidden />
            Acionáveis
          </button>

          <button
            type="button"
            onClick={() =>
              updateQuery({
                direction: activeDirection === 'desc' ? 'asc' : 'desc',
              })
            }
            className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 transition-colors hover:text-primary-deeper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {activeDirection === 'desc' ? 'Recentes' : 'Antigas'}
          </button>
        </div>

        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-primary"
            >
              <X size={13} aria-hidden />
              Limpar filtros
            </button>
          </div>
        )}
      </section>

      {children}

      <section className="rounded-[14px] border border-gray-100 bg-white/70 p-3 shadow-sm">
        <div className="mb-1 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Fila operacional
            </p>
            <h2 className="mt-1 text-lg font-bold text-primary-deeper">
              Doações por etapa
            </h2>
          </div>
          <Truck size={18} className="text-primary" aria-hidden />
        </div>

        {isNavigating ? (
          <div className="mt-3">
            <LoadingRows />
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="mt-3">
            <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
          </div>
        ) : (
          <div className="grid gap-4">
            {groupedDonations
              .filter(({ donations: groupDonations }) => groupDonations.length > 0)
              .map(({ group, donations: groupDonations }) => (
                <Group
                  key={group.key}
                  group={group}
                  donations={groupDonations}
                  role={role}
                  onUpdated={handleUpdated}
                />
              ))}
          </div>
        )}
      </section>

      <p className="sr-only" aria-live="polite">
        {initialActionableCount} ações carregadas inicialmente.
      </p>
    </div>
  );
}
