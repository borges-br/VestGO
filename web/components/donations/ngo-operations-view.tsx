'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  startTransition,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  Route,
  Search,
  Truck,
  X,
  XCircle,
} from 'lucide-react';

import { StatusBadge } from '@/components/ui/status-badge';
import {
  DONATION_STATUS_ACTIONS,
  DONATION_STATUS_CONFIG,
  DONATION_STATUS_ORDER,
} from '@/components/donations/donation-status';
import {
  updateDonationStatus,
  type DonationEvent,
  type DonationItem,
  type DonationPoint,
  type DonationRecord,
  type DonationStatus,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDateTimeLabel, formatDayMonthLabel } from '@/lib/date-time';

// ─── Domain constants ─────────────────────────────────────────────────────────

/** Ordered status groups shown in the NGO work queue. */
const NGO_STATUS_GROUPS: Array<{
  key: string;
  label: string;
  description: string;
  statuses: DonationStatus[];
  defaultOpen: boolean;
  emptyMessage: string;
}> = [
  {
    key: 'in_transit',
    label: 'A caminho',
    description: 'Doações em deslocamento rumo à sua ONG',
    statuses: ['IN_TRANSIT'],
    defaultOpen: true,
    emptyMessage: 'Nenhuma doação em trânsito no momento.',
  },
  {
    key: 'delivered',
    label: 'Para distribuir',
    description: 'Recebidas e aguardando a ação social',
    statuses: ['DELIVERED'],
    defaultOpen: true,
    emptyMessage: 'Nenhuma doação aguardando distribuição.',
  },
  {
    key: 'distributed',
    label: 'Distribuídas',
    description: 'Ciclo completo de solidariedade',
    statuses: ['DISTRIBUTED'],
    defaultOpen: false,
    emptyMessage: 'Nenhuma distribuição registrada neste período.',
  },
  {
    key: 'waiting',
    label: 'Aguardando coleta',
    description: 'No ponto de coleta ou pendentes de confirmação',
    statuses: ['AT_POINT', 'PENDING'],
    defaultOpen: false,
    emptyMessage: 'Nenhuma doação aguardando coleta.',
  },
  {
    key: 'cancelled',
    label: 'Canceladas',
    description: '',
    statuses: ['CANCELLED'],
    defaultOpen: false,
    emptyMessage: 'Nenhuma doação cancelada.',
  },
];

const GROUP_ICON: Record<string, React.ElementType> = {
  in_transit: Truck,
  delivered: Package,
  distributed: CheckCircle2,
  waiting: Clock,
  cancelled: XCircle,
};

const GROUP_DOT_COLOR: Record<string, string> = {
  in_transit: 'bg-indigo-500',
  delivered: 'bg-primary',
  distributed: 'bg-emerald-500',
  waiting: 'bg-amber-500',
  cancelled: 'bg-red-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pointLabel(point: DonationPoint | null | undefined) {
  return point?.organizationName ?? point?.name ?? 'Não informado';
}

function getActionLabel(status: DonationStatus) {
  return DONATION_STATUS_ACTIONS[status]?.label ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Skeleton for loading state */
function RowSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-4 shadow-sm" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 rounded bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded bg-gray-100" />
          <div className="h-3 w-48 rounded bg-gray-100" />
        </div>
        <div className="h-8 w-32 rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}

/** Timeline vertical list within expanded donation */
function DonationTimeline({ events }: { events: DonationEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400">Nenhum evento registrado ainda.</p>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ol aria-label="Histórico da doação" className="relative space-y-0 pl-5">
      {/* Vertical track */}
      <span
        aria-hidden
        className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200"
      />
      {sorted.map((event, idx) => {
        const isFirst = idx === 0;
        const statusCfg = DONATION_STATUS_CONFIG[event.status];
        const Icon = statusCfg.icon;

        return (
          <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
            <span
              className={cn(
                'relative z-10 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-2 border-white',
                isFirst ? 'bg-primary' : 'bg-gray-300',
              )}
            >
              <Icon size={10} className="text-white" aria-hidden />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold',
                  isFirst ? 'text-primary-deeper' : 'text-gray-600',
                )}
              >
                {event.description}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {formatDateTimeLabel(event.createdAt)}
                {event.location && (
                  <span className="ml-2 text-gray-400">· {event.location}</span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact item list within expanded donation */
function ItemsList({ items }: { items: DonationItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400">Itens não especificados.</p>
    );
  }

  return (
    <ul aria-label="Itens da doação" className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5 text-sm"
        >
          <span className="font-medium text-on-surface">{item.name}</span>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{item.quantity}×</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-semibold',
                item.condition === 'EXCELLENT'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700',
              )}
            >
              {item.condition === 'EXCELLENT' ? 'Excelente' : 'Bom estado'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Progress bar showing donation pipeline position */
function PipelineProgress({ status }: { status: DonationStatus }) {
  const activeIdx = DONATION_STATUS_ORDER.indexOf(status);

  return (
    <div
      aria-label={`Etapa atual: ${DONATION_STATUS_CONFIG[status].label}`}
      className="flex items-center gap-1"
    >
      {DONATION_STATUS_ORDER.map((step, idx) => (
        <span
          key={step}
          className={cn(
            'h-1 flex-1 rounded-full',
            idx <= activeIdx && activeIdx >= 0 ? 'bg-primary' : 'bg-gray-200',
          )}
        />
      ))}
    </div>
  );
}

// ─── Inline action button inside expanded row ─────────────────────────────────

interface InlineActionProps {
  donation: DonationRecord;
  onUpdated: (d: DonationRecord) => void;
}

function InlineActions({ donation, onUpdated }: InlineActionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [pending, setPending] = useState<DonationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<DonationStatus | null>(null);

  const actionStatuses = donation.allowedNextStatuses.filter(
    (s) => DONATION_STATUS_ACTIONS[s],
  );

  if (actionStatuses.length === 0) return null;

  async function execute(nextStatus: DonationStatus) {
    if (!session?.user?.accessToken) {
      setError('Sessão expirada. Entre novamente para continuar.');
      return;
    }

    setPending(nextStatus);
    setError(null);
    setShowConfirm(null);

    try {
      const updated = await updateDonationStatus(
        donation.id,
        {
          status: nextStatus,
          description: DONATION_STATUS_ACTIONS[nextStatus].description,
        },
        session.user.accessToken,
      );

      onUpdated(updated);
      toast.success(
        `${DONATION_STATUS_ACTIONS[nextStatus].label} — ${donation.code}`,
        { description: 'Status atualizado com sucesso.' },
      );
      startTransition(() => router.refresh());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar o status agora.';
      setError(message);
      toast.error('Falha ao atualizar status', { description: message });
    } finally {
      setPending(null);
    }
  }

  const CRITICAL_ACTIONS: DonationStatus[] = ['CANCELLED'];

  return (
    <div className="space-y-2">
      {actionStatuses.map((nextStatus) => {
        const action = DONATION_STATUS_ACTIONS[nextStatus];
        const cfg = DONATION_STATUS_CONFIG[nextStatus];
        const isPending = pending === nextStatus;
        const isCritical = CRITICAL_ACTIONS.includes(nextStatus);

        if (isCritical && showConfirm !== nextStatus) {
          return (
            <button
              key={nextStatus}
              type="button"
              onClick={() => setShowConfirm(nextStatus)}
              disabled={Boolean(pending)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
            >
              <XCircle size={15} aria-hidden />
              {action.label}
            </button>
          );
        }

        if (isCritical && showConfirm === nextStatus) {
          return (
            <div
              key={nextStatus}
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm"
            >
              <p className="font-semibold text-red-700">
                Confirmar cancelamento de {donation.code}?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-red-600">
                Esta ação não pode ser desfeita.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => execute(nextStatus)}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 size={13} className="mx-auto animate-spin" />
                  ) : (
                    'Sim, cancelar'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(null)}
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Voltar
                </button>
              </div>
            </div>
          );
        }

        return (
          <button
            key={nextStatus}
            type="button"
            onClick={() => execute(nextStatus)}
            disabled={Boolean(pending)}
            aria-label={`${action.label} para doação ${donation.code}`}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
              'bg-primary-deeper text-white hover:bg-primary-dark',
            )}
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Salvando…
              </>
            ) : (
              <>
                <cfg.icon size={14} aria-hidden />
                {action.label}
              </>
            )}
          </button>
        );
      })}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Donation Row (accordion item) ────────────────────────────────────────────

interface DonationRowProps {
  donation: DonationRecord;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onUpdated: (d: DonationRecord) => void;
  /** On mobile/tablet the detail expands inline; on desktop it opens the side panel */
  inlineDetail: boolean;
}

function DonationRow({
  donation,
  isSelected,
  onSelect,
  onUpdated,
  inlineDetail,
}: DonationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = DONATION_STATUS_CONFIG[donation.status];
  const StatusIcon = cfg.icon;
  const hasActions = donation.allowedNextStatuses.length > 0;

  const primaryActionStatus = hasActions ? donation.allowedNextStatuses[0] : null;
  const primaryActionLabel = primaryActionStatus
    ? getActionLabel(primaryActionStatus)
    : null;

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (inlineDetail) {
      onSelect(next ? donation.id : null);
    } else {
      onSelect(next ? donation.id : null);
    }
  }

  const isExpanded = inlineDetail ? expanded : isSelected && expanded;

  const originLabel = pointLabel(donation.collectionPoint ?? donation.dropOffPoint);

  return (
    <article
      aria-label={`Doação ${donation.code}`}
      className={cn(
        'rounded-2xl bg-white shadow-sm ring-1 ring-transparent transition-shadow duration-200',
        isSelected && !inlineDetail && 'ring-primary/30 shadow-card',
      )}
    >
      {/* ── Row header ──────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0">
        {/* Expand button — takes most of the row width */}
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={`donation-detail-${donation.id}`}
          className={cn(
            'flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-4 text-left transition-colors',
            'hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            primaryActionLabel && 'rounded-r-none',
          )}
        >
          {/* Chevron */}
          <ChevronRight
            size={16}
            aria-hidden
            className={cn(
              'mt-0.5 flex-shrink-0 text-gray-400 transition-transform duration-200',
              expanded && 'rotate-90',
            )}
          />

          {/* Main info */}
          <div className="min-w-0 flex-1">
            {/* Code + status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary-deeper">
                {donation.code}
              </span>
              <StatusBadge status={donation.status} showIcon />
              {donation.partnership && (
                <span className="rounded-full bg-primary-light/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-deeper">
                  parceria
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>{donation.itemCount} {donation.itemCount === 1 ? 'item' : 'itens'}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{originLabel}</span>
              <span aria-hidden>·</span>
              <time dateTime={donation.updatedAt}>
                {formatDayMonthLabel(donation.updatedAt)}
              </time>
            </div>

            {/* Latest event description */}
            {donation.latestEvent?.description && (
              <p className="mt-1.5 line-clamp-1 text-xs leading-relaxed text-gray-400">
                {donation.latestEvent.description}
              </p>
            )}
          </div>
        </button>

        {/* Quick action button — sibling of expand button, NOT nested */}
        {primaryActionLabel && primaryActionStatus && (
          <QuickActionButton
            donation={donation}
            nextStatus={primaryActionStatus}
            label={primaryActionLabel}
            onUpdated={onUpdated}
            onExpand={() => {
              setExpanded(true);
              onSelect(donation.id);
            }}
          />
        )}
      </div>

      {/* ── Expanded detail (inline, for mobile OR when selected on desktop) ── */}
      <div
        id={`donation-detail-${donation.id}`}
        hidden={!expanded}
        className={cn(!expanded && 'hidden')}
      >
        <div className="border-t border-gray-100 px-4 pb-4 pt-4">
          <ExpandedDonationDetail
            donation={donation}
            onUpdated={onUpdated}
          />
        </div>
      </div>
    </article>
  );
}

// ─── Quick action button (sibling of expand, no nesting) ─────────────────────

interface QuickActionButtonProps {
  donation: DonationRecord;
  nextStatus: DonationStatus;
  label: string;
  onUpdated: (d: DonationRecord) => void;
  onExpand: () => void;
}

function QuickActionButton({
  donation,
  nextStatus,
  label,
  onUpdated,
  onExpand,
}: QuickActionButtonProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [pending, setPending] = useState(false);
  const cfg = DONATION_STATUS_CONFIG[nextStatus];
  const Icon = cfg.icon;

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();

    if (!session?.user?.accessToken) {
      toast.error('Sessão expirada', { description: 'Entre novamente para continuar.' });
      return;
    }

    // For destructive actions, expand instead of acting immediately
    if (nextStatus === 'CANCELLED') {
      onExpand();
      return;
    }

    setPending(true);
    try {
      const updated = await updateDonationStatus(
        donation.id,
        {
          status: nextStatus,
          description: DONATION_STATUS_ACTIONS[nextStatus].description,
        },
        session.user.accessToken,
      );

      onUpdated(updated);
      toast.success(`${label} — ${donation.code}`, {
        description: 'Status atualizado com sucesso.',
      });
      startTransition(() => router.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar status.';
      toast.error('Erro', { description: message });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={`${label} para doação ${donation.code}`}
      className={cn(
        'flex-shrink-0 rounded-r-2xl border-l border-gray-100 px-4 py-3 text-center transition-colors',
        'bg-primary-deeper text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'hidden min-w-[9rem] flex-col items-center justify-center gap-1 sm:flex',
      )}
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" aria-hidden />
      ) : (
        <Icon size={16} aria-hidden />
      )}
      <span className="text-[11px] font-semibold leading-tight">
        {pending ? 'Salvando…' : label}
      </span>
    </button>
  );
}

// ─── Expanded detail content ──────────────────────────────────────────────────

function ExpandedDonationDetail({
  donation,
  onUpdated,
}: {
  donation: DonationRecord;
  onUpdated: (d: DonationRecord) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Progress pipeline */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Progresso
        </p>
        <PipelineProgress status={donation.status} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Timeline */}
        <section aria-labelledby={`tl-heading-${donation.id}`}>
          <p
            id={`tl-heading-${donation.id}`}
            className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400"
          >
            Histórico de eventos
          </p>
          <DonationTimeline events={donation.timeline} />
        </section>

        {/* Items */}
        <section aria-labelledby={`items-heading-${donation.id}`}>
          <p
            id={`items-heading-${donation.id}`}
            className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400"
          >
            Itens ({donation.itemCount})
          </p>
          <ItemsList items={donation.items} />
        </section>
      </div>

      {/* Origin + notes */}
      <div className="grid gap-4 rounded-xl bg-surface p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Ponto de origem
          </p>
          <p className="mt-1 font-medium text-on-surface">
            {pointLabel(donation.collectionPoint ?? donation.dropOffPoint)}
          </p>
          {(donation.collectionPoint?.city || donation.dropOffPoint?.city) && (
            <p className="text-xs text-gray-500">
              {donation.collectionPoint?.city ?? donation.dropOffPoint?.city}
              {(donation.collectionPoint?.state ?? donation.dropOffPoint?.state) && (
                <>, {donation.collectionPoint?.state ?? donation.dropOffPoint?.state}</>
              )}
            </p>
          )}
        </div>
        {donation.notes && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Observação
            </p>
            <p className="mt-1 italic text-gray-600">"{donation.notes}"</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <InlineActions donation={donation} onUpdated={onUpdated} />
        </div>
        <Link
          href={`/rastreio/${donation.id}`}
          aria-label={`Ver rastreio completo da doação ${donation.code}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Route size={14} aria-hidden />
          Ver rastreio
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

// ─── Accordion group ──────────────────────────────────────────────────────────

interface DonationGroupProps {
  groupKey: string;
  label: string;
  description: string;
  donations: DonationRecord[];
  defaultOpen: boolean;
  emptyMessage: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdated: (d: DonationRecord) => void;
  inlineDetail: boolean;
}

function DonationGroup({
  groupKey,
  label,
  description,
  donations,
  defaultOpen,
  emptyMessage,
  selectedId,
  onSelect,
  onUpdated,
  inlineDetail,
}: DonationGroupProps) {
  const [open, setOpen] = useState(defaultOpen || donations.length > 0);
  const headingId = `group-heading-${groupKey}`;
  const listId = `group-list-${groupKey}`;
  const GroupIcon = GROUP_ICON[groupKey] ?? Package;
  const dotColor = GROUP_DOT_COLOR[groupKey] ?? 'bg-gray-400';
  const actionableCount = donations.filter((d) => d.allowedNextStatuses.length > 0).length;

  return (
    <section aria-labelledby={headingId}>
      {/* Group toggle header */}
      <button
        type="button"
        id={headingId}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* Color dot */}
        <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', dotColor)} aria-hidden />

        {/* Icon + label */}
        <GroupIcon size={16} aria-hidden className="flex-shrink-0 text-gray-500" />
        <span className="flex-1 text-sm font-semibold text-on-surface">{label}</span>

        {/* Badges */}
        <div className="flex items-center gap-2">
          {actionableCount > 0 && (
            <span
              aria-label={`${actionableCount} aguardando ação`}
              className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white"
            >
              {actionableCount} ação
            </span>
          )}
          <span
            aria-label={`${donations.length} doações`}
            className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-gray-500"
          >
            {donations.length}
          </span>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            'flex-shrink-0 text-gray-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Group content */}
      <div
        id={listId}
        role="list"
        aria-label={`${label}: ${donations.length} doações`}
        hidden={!open}
        className={cn(!open && 'hidden', 'mt-2 space-y-2')}
      >
        {donations.length === 0 ? (
          <div
            role="listitem"
            className="flex items-center gap-3 rounded-xl bg-white/60 px-4 py-4 text-sm text-gray-400"
          >
            <GroupIcon size={16} aria-hidden className="flex-shrink-0" />
            {emptyMessage}
          </div>
        ) : (
          donations.map((donation) => (
            <div key={donation.id} role="listitem">
              <DonationRow
                donation={donation}
                isSelected={selectedId === donation.id}
                onSelect={onSelect}
                onUpdated={onUpdated}
                inlineDetail={inlineDetail}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Side Panel ───────────────────────────────────────────────────────────────

interface SidePanelProps {
  donation: DonationRecord | null;
  statusCounts: Partial<Record<DonationStatus, number>>;
  actionableCount: number;
  onClose: () => void;
  onUpdated: (d: DonationRecord) => void;
}

function SidePanel({
  donation,
  statusCounts,
  actionableCount,
  onClose,
  onUpdated,
}: SidePanelProps) {
  if (!donation) {
    return (
      <aside
        aria-label="Resumo operacional"
        className="hidden xl:block"
      >
        <div className="sticky top-[calc(var(--topbar-height)+1.5rem)] space-y-4">
          {/* Actionable alert */}
          {actionableCount > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle
                size={18}
                className="mt-0.5 flex-shrink-0 text-amber-600"
                aria-hidden
              />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {actionableCount} {actionableCount === 1 ? 'doação aguarda' : 'doações aguardam'} ação
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Selecione um item na fila para agir.
                </p>
              </div>
            </div>
          )}

          {/* Status summary */}
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Visão geral
            </p>
            <ul className="mt-3 space-y-2.5">
              {[
                { key: 'IN_TRANSIT' as DonationStatus, label: 'A caminho', dot: 'bg-indigo-500' },
                { key: 'DELIVERED' as DonationStatus, label: 'Para distribuir', dot: 'bg-primary' },
                { key: 'DISTRIBUTED' as DonationStatus, label: 'Distribuídas', dot: 'bg-emerald-500' },
                { key: 'CANCELLED' as DonationStatus, label: 'Canceladas', dot: 'bg-red-400' },
              ].map(({ key, label, dot }) => (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />
                    {label}
                  </span>
                  <span className="font-semibold text-on-surface">
                    {statusCounts[key] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Guidance */}
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-xs leading-relaxed text-gray-500">
              Selecione uma doação na fila para ver os detalhes completos, histórico
              de eventos e ações disponíveis.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const cfg = DONATION_STATUS_CONFIG[donation.status];
  const StatusIcon = cfg.icon;

  return (
    <aside
      aria-label={`Detalhes da doação ${donation.code}`}
      className="hidden xl:block"
    >
      <div className="sticky top-[calc(var(--topbar-height)+1.5rem)] max-h-[calc(100vh-var(--topbar-height)-3rem)] overflow-y-auto rounded-2xl bg-white shadow-card">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Doação selecionada
            </p>
            <p className="mt-0.5 font-mono text-base font-bold text-primary-deeper">
              {donation.code}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de detalhes"
            className="rounded-xl p-1.5 text-gray-400 transition-colors hover:bg-surface hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
          <StatusIcon size={15} className={cfg.color} aria-hidden />
          <span className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</span>
          <span className="ml-auto text-xs text-gray-400">
            {formatDayMonthLabel(donation.updatedAt)}
          </span>
        </div>

        <div className="p-5 space-y-5">
          {/* Pipeline */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Progresso
            </p>
            <PipelineProgress status={donation.status} />
          </div>

          {/* Items summary */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Itens ({donation.itemCount})
            </p>
            <ItemsList items={donation.items} />
          </div>

          {/* Timeline */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Histórico
            </p>
            <DonationTimeline events={donation.timeline} />
          </div>

          {/* Origin */}
          <div className="rounded-xl bg-surface p-3 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Origem
            </p>
            <p className="mt-1 font-medium text-on-surface">
              {pointLabel(donation.collectionPoint ?? donation.dropOffPoint)}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <InlineActions donation={donation} onUpdated={onUpdated} />
            <Link
              href={`/rastreio/${donation.id}`}
              aria-label={`Ver rastreio completo da doação ${donation.code}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Route size={14} aria-hidden />
              Ver rastreio completo
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KpiStrip({
  statusCounts,
  actionableCount,
  onFilterByStatus,
}: {
  statusCounts: Partial<Record<DonationStatus, number>>;
  actionableCount: number;
  onFilterByStatus: (status: DonationStatus | 'ALL') => void;
}) {
  const kpis: Array<{
    label: string;
    value: number;
    status?: DonationStatus;
    accent?: string;
    ariaLabel: string;
  }> = [
    {
      label: 'Aguardam ação',
      value: actionableCount,
      accent: actionableCount > 0 ? 'text-primary font-bold' : 'text-gray-600',
      ariaLabel: `${actionableCount} doações aguardam ação imediata`,
    },
    {
      label: 'A caminho',
      value: statusCounts.IN_TRANSIT ?? 0,
      status: 'IN_TRANSIT',
      ariaLabel: `${statusCounts.IN_TRANSIT ?? 0} doações em trânsito`,
    },
    {
      label: 'Para distribuir',
      value: statusCounts.DELIVERED ?? 0,
      status: 'DELIVERED',
      ariaLabel: `${statusCounts.DELIVERED ?? 0} doações para distribuir`,
    },
    {
      label: 'Distribuídas',
      value: statusCounts.DISTRIBUTED ?? 0,
      status: 'DISTRIBUTED',
      ariaLabel: `${statusCounts.DISTRIBUTED ?? 0} doações distribuídas`,
    },
  ];

  return (
    <div
      role="region"
      aria-label="Métricas operacionais"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {kpis.map(({ label, value, status, accent, ariaLabel }) => (
        <button
          key={label}
          type="button"
          aria-label={`${ariaLabel}. Clique para filtrar.`}
          onClick={() => onFilterByStatus(status ?? 'ALL')}
          className="flex flex-col items-start rounded-2xl bg-white p-4 shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span
            className={cn(
              'text-2xl font-bold leading-none',
              accent ?? 'text-primary-deeper',
            )}
          >
            {value}
          </span>
          <span className="mt-1.5 text-xs font-medium text-gray-500">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Filter toolbar ───────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: Array<{ value: 'ALL' | DonationStatus; label: string }> = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'IN_TRANSIT', label: 'A caminho' },
  { value: 'DELIVERED', label: 'Para distribuir' },
  { value: 'DISTRIBUTED', label: 'Distribuídas' },
  { value: 'CANCELLED', label: 'Canceladas' },
];

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: 'ALL' | DonationStatus;
  onStatusChange: (v: 'ALL' | DonationStatus) => void;
  collectionPointId: string;
  onCollectionPointChange: (v: string) => void;
  availableCollectionPoints: DonationPoint[];
  hasActiveFilters: boolean;
  onClear: () => void;
}

function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  collectionPointId,
  onCollectionPointChange,
  availableCollectionPoints,
  hasActiveFilters,
  onClear,
}: FilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="search"
      aria-label="Filtros da fila operacional"
      className="flex flex-wrap items-center gap-3"
    >
      {/* Search */}
      <div className="relative min-w-0 flex-1">
        <Search
          size={15}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por código, ponto de coleta…"
          aria-label="Buscar doações"
          className="h-10 w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-4 text-sm text-on-surface placeholder-gray-400 outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30 dark:bg-surface-inkSoft"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X size={13} aria-hidden />
          </button>
        )}
      </div>

      {/* Status filter */}
      <label className="sr-only" htmlFor="filter-status">
        Filtrar por status
      </label>
      <select
        id="filter-status"
        value={status}
        onChange={(e) => onStatusChange(e.target.value as 'ALL' | DonationStatus)}
        className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30 dark:bg-surface-inkSoft"
      >
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Collection point filter */}
      {availableCollectionPoints.length > 0 && (
        <>
          <label className="sr-only" htmlFor="filter-point">
            Filtrar por ponto de coleta
          </label>
          <select
            id="filter-point"
            value={collectionPointId}
            onChange={(e) => onCollectionPointChange(e.target.value)}
            className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30 dark:bg-surface-inkSoft"
          >
            <option value="">Todos os pontos</option>
            {availableCollectionPoints.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.organizationName ?? pt.name}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="flex h-10 items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={13} aria-hidden />
          Limpar filtros
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface NgoOperationsViewProps {
  initialDonations: DonationRecord[];
  availableCollectionPoints: DonationPoint[];
  statusCounts: Partial<Record<DonationStatus, number>>;
  actionableCount: number;
  organizationName: string | null;
}

export function NgoOperationsView({
  initialDonations,
  availableCollectionPoints,
  statusCounts: initialStatusCounts,
  actionableCount: initialActionableCount,
  organizationName,
}: NgoOperationsViewProps) {
  const [donations, setDonations] = useState<DonationRecord[]>(initialDonations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | DonationStatus>('ALL');
  const [filterPointId, setFilterPointId] = useState('');

  // Compute live status counts from current donations state
  const statusCounts = useMemo<Partial<Record<DonationStatus, number>>>(() => {
    const counts: Partial<Record<DonationStatus, number>> = {};
    for (const d of donations) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    }
    return counts;
  }, [donations]);

  const actionableCount = useMemo(
    () => donations.filter((d) => d.allowedNextStatuses.length > 0).length,
    [donations],
  );

  const hasActiveFilters = Boolean(search || filterStatus !== 'ALL' || filterPointId);

  // Client-side filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return donations.filter((d) => {
      if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
      if (filterPointId && d.collectionPoint?.id !== filterPointId && d.dropOffPoint?.id !== filterPointId) return false;
      if (q) {
        const haystack = [
          d.code,
          d.collectionPoint?.organizationName,
          d.collectionPoint?.name,
          d.dropOffPoint?.organizationName,
          d.dropOffPoint?.name,
          d.itemLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [donations, search, filterStatus, filterPointId]);

  // Group donations per NGO_STATUS_GROUPS definition
  const grouped = useMemo(() => {
    return NGO_STATUS_GROUPS.map((g) => ({
      ...g,
      donations: filtered.filter((d) => g.statuses.includes(d.status)),
    }));
  }, [filtered]);

  const selectedDonation = useMemo(
    () => donations.find((d) => d.id === selectedId) ?? null,
    [donations, selectedId],
  );

  const handleUpdated = useCallback((updated: DonationRecord) => {
    setDonations((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d)),
    );
  }, []);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  function clearFilters() {
    setSearch('');
    setFilterStatus('ALL');
    setFilterPointId('');
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ────────────────────────────────────────────── */}
      <header className="rounded-[2rem] bg-primary-deeper p-5 text-white shadow-card lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
              Central operacional · ONG parceira
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
              {organizationName ?? 'Painel Operacional'}
            </h1>
            <p className="mt-1 text-sm text-primary-muted">
              Gerencie coletas, confirmações e distribuições da sua ONG.
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex flex-col items-end gap-1.5">
            {actionableCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
                <AlertTriangle size={12} aria-hidden />
                {actionableCount} {actionableCount === 1 ? 'ação pendente' : 'ações pendentes'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-muted">
                <CheckCircle2 size={12} aria-hidden />
                Tudo em dia
              </span>
            )}
            <span className="text-[11px] text-primary-muted/70">
              {filtered.length} doações neste recorte
            </span>
          </div>
        </div>
      </header>

      {/* ── KPI strip ───────────────────────────────────────────────── */}
      <KpiStrip
        statusCounts={statusCounts}
        actionableCount={actionableCount}
        onFilterByStatus={setFilterStatus}
      />

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        status={filterStatus}
        onStatusChange={setFilterStatus}
        collectionPointId={filterPointId}
        onCollectionPointChange={setFilterPointId}
        availableCollectionPoints={availableCollectionPoints}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      {/* ── Main grid: queue + side panel ─────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        {/* Work queue */}
        <div className="space-y-3" role="region" aria-label="Fila operacional">
          {filtered.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center rounded-[2rem] bg-white px-6 py-14 text-center shadow-card">
              {hasActiveFilters ? (
                <>
                  <Search size={32} className="text-gray-300" aria-hidden />
                  <p className="mt-4 text-base font-semibold text-primary-deeper">
                    Sem resultados para este filtro
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Ajuste a busca ou os filtros para encontrar o que procura.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 rounded-2xl bg-primary-deeper px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Limpar filtros
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle2 size={32} className="text-primary/50" aria-hidden />
                  <p className="mt-4 text-base font-semibold text-primary-deeper">
                    Nenhuma doação encontrada
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
                    Quando pontos de coleta vinculados à sua ONG tiverem doações
                    prontas, elas aparecerão aqui automaticamente.
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Donation groups */
            grouped.map((group) => (
              <DonationGroup
                key={group.key}
                groupKey={group.key}
                label={group.label}
                description={group.description}
                donations={group.donations}
                defaultOpen={group.defaultOpen}
                emptyMessage={group.emptyMessage}
                selectedId={selectedId}
                onSelect={handleSelect}
                onUpdated={handleUpdated}
                inlineDetail={false}
              />
            ))
          )}
        </div>

        {/* Side panel (desktop only) */}
        <SidePanel
          donation={selectedDonation}
          statusCounts={statusCounts}
          actionableCount={actionableCount}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
        />
      </div>
    </div>
  );
}
