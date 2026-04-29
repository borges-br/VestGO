'use client';

import { startTransition, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDotDashed,
  Loader2,
  PackageCheck,
  Send,
  Truck,
} from 'lucide-react';
import {
  DONATION_STATUS_CONFIG,
  formatDonationDateLabel,
} from '@/components/donations/donation-status';
import { CodeQrCard } from '@/components/operations/code-qr-card';
import {
  closeOperationalBatch,
  confirmOperationalBatchDelivery,
  dispatchOperationalBatch,
  type OperationalBatchRecord,
  type OperationalBatchStatus,
} from '@/lib/api';

const BATCH_STATUS_LABELS: Record<OperationalBatchStatus, string> = {
  OPEN: 'Aberta',
  READY_TO_SHIP: 'Pronta para envio',
  IN_TRANSIT: 'Em trânsito',
  DELIVERED: 'Recebida pela ONG',
  CLOSED: 'Fechada',
  CANCELLED: 'Cancelada',
};

const BATCH_STATUS_STYLES: Record<OperationalBatchStatus, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  READY_TO_SHIP: 'bg-amber-50 text-amber-700',
  IN_TRANSIT: 'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-primary-light text-primary-deeper',
  CANCELLED: 'bg-red-50 text-red-600',
};

const BATCH_PROGRESS: OperationalBatchStatus[] = [
  'OPEN',
  'READY_TO_SHIP',
  'IN_TRANSIT',
  'DELIVERED',
  'CLOSED',
];

interface OperationalBatchTraceCardProps {
  initialBatch: OperationalBatchRecord;
  viewerRole: string;
  defaultExpanded?: boolean;
  compact?: boolean;
  showQr?: boolean;
  onBatchUpdated?: (batch: OperationalBatchRecord) => void;
}

function partnerLabel(partner: OperationalBatchRecord['ngo']) {
  return partner.organizationName ?? partner.name;
}

function getBatchProgressIcon(status: OperationalBatchStatus, currentStatus: OperationalBatchStatus) {
  const currentIndex = BATCH_PROGRESS.indexOf(currentStatus);
  const stepIndex = BATCH_PROGRESS.indexOf(status);

  if (currentStatus === 'CANCELLED') {
    return Circle;
  }

  if (stepIndex < currentIndex) {
    return CheckCircle2;
  }

  if (stepIndex === currentIndex) {
    return CircleDotDashed;
  }

  return Circle;
}

export function OperationalBatchTraceCard({
  initialBatch,
  viewerRole,
  defaultExpanded = false,
  compact = false,
  showQr = false,
  onBatchUpdated,
}: OperationalBatchTraceCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [batch, setBatch] = useState(initialBatch);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [pendingAction, setPendingAction] = useState<'dispatch' | 'deliver' | 'close' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const primaryAction = useMemo(() => {
    if (batch.allowedActions.canConfirmDelivery) {
      return {
        key: 'deliver' as const,
        label: 'Confirmar recebimento da carga',
        icon: PackageCheck,
      };
    }

    if (batch.allowedActions.canDispatch) {
      return {
        key: 'dispatch' as const,
        label: 'Despachar carga',
        icon: Send,
      };
    }

    if (batch.allowedActions.canClose) {
      return {
        key: 'close' as const,
        label: 'Fechar carga',
        icon: CheckCircle2,
      };
    }

    return null;
  }, [batch.allowedActions]);

  async function handleAction(action: 'dispatch' | 'deliver' | 'close') {
    if (!session?.user?.accessToken) {
      setError('Sua sessão expirou. Entre novamente para continuar.');
      return;
    }

    if (
      action === 'deliver' &&
      !window.confirm(
        `Confirmar recebimento da carga ${batch.code}? As ${batch.donationCount} doações vinculadas elegíveis avançarão para entregue.`,
      )
    ) {
      return;
    }

    setPendingAction(action);
    setError(null);
    setMessage(null);

    try {
      const updatedBatch =
        action === 'dispatch'
          ? await dispatchOperationalBatch(batch.id, session.user.accessToken)
          : action === 'deliver'
            ? await confirmOperationalBatchDelivery(batch.id, session.user.accessToken)
            : await closeOperationalBatch(batch.id, session.user.accessToken);

      setBatch(updatedBatch);
      onBatchUpdated?.(updatedBatch);
      setMessage(
        updatedBatch.operationSummary
          ? `${updatedBatch.operationSummary.updated}/${updatedBatch.operationSummary.total} doações atualizadas pelo lote.`
          : `Carga ${updatedBatch.code} atualizada.`,
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar a carga.');
    } finally {
      setPendingAction(null);
    }
  }

  const StatusIcon = batch.status === 'IN_TRANSIT' ? Truck : PackageCheck;
  const isOperationalViewer = viewerRole !== 'DONOR';
  const PrimaryActionIcon = primaryAction?.icon;

  return (
    <article
      className={`rounded-[2rem] border border-gray-100 bg-white shadow-card ${
        compact ? 'p-4' : 'p-5 lg:p-6'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <StatusIcon size={18} />
            </span>
            <span className="font-mono text-sm font-bold text-primary-deeper">
              {batch.code}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                BATCH_STATUS_STYLES[batch.status]
              }`}
            >
              {BATCH_STATUS_LABELS[batch.status]}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-primary-deeper">{batch.name}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            {batch.donationCount} doação(ões), {batch.totalItemQuantity} peça(s) ·{' '}
            {partnerLabel(batch.collectionPoint)} → {partnerLabel(batch.ngo)}
          </p>
        </div>

        {isOperationalViewer && primaryAction && (
          <button
            type="button"
            onClick={() => handleAction(primaryAction.key)}
            disabled={Boolean(pendingAction)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300"
          >
            {pendingAction === primaryAction.key ? (
              <Loader2 size={15} className="animate-spin" />
            ) : PrimaryActionIcon ? (
              <PrimaryActionIcon size={15} />
            ) : (
              <PackageCheck size={15} />
            )}
            {pendingAction === primaryAction.key ? 'Salvando...' : primaryAction.label}
          </button>
        )}
      </div>

      {showQr && (
        <div className="mt-4">
          <CodeQrCard
            compact
            code={batch.code}
            title="QR da carga"
            description="Escaneie ou digite este codigo para localizar a carga no fluxo operacional."
          />
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
            Saiu do ponto
          </p>
          <p className="mt-1 text-sm font-semibold text-primary-deeper">
            {batch.dispatchedAt ? formatDonationDateLabel(batch.dispatchedAt) : 'Ainda não despachada'}
          </p>
        </div>
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
            Recebida pela ONG
          </p>
          <p className="mt-1 text-sm font-semibold text-primary-deeper">
            {batch.deliveredAt ? formatDonationDateLabel(batch.deliveredAt) : 'Aguardando confirmação'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="grid grid-cols-5 gap-1" aria-label={`Status da carga: ${BATCH_STATUS_LABELS[batch.status]}`}>
          {BATCH_PROGRESS.map((status) => {
            const StepIcon = getBatchProgressIcon(status, batch.status);
            const active =
              batch.status !== 'CANCELLED' &&
              BATCH_PROGRESS.indexOf(status) <= BATCH_PROGRESS.indexOf(batch.status);

            return (
              <div key={status} className="min-w-0">
                <div
                  className={`h-1.5 rounded-full ${active ? 'bg-primary' : 'bg-gray-100'}`}
                />
                <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                  <StepIcon size={12} className={active ? 'text-primary' : 'text-gray-300'} />
                  <span className="truncate">{BATCH_STATUS_LABELS[status]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(message || error) && (
        <div
          role={error ? 'alert' : undefined}
          aria-live="polite"
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error ?? message}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="mt-4 flex w-full items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 text-left text-sm font-semibold text-primary-deeper transition-colors hover:bg-surface"
        aria-expanded={expanded}
      >
        Ver detalhes da carga
        <ChevronDown
          size={16}
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="relative mt-3 overflow-hidden rounded-[1.5rem] bg-surface p-3">
          <div className="absolute bottom-4 left-5 top-4 border-l border-dashed border-primary/25" />
          <div className="space-y-2">
            {batch.items.map((item) => {
              const statusConfig = DONATION_STATUS_CONFIG[item.donation.status];
              const DonationStatusIcon = statusConfig.icon;

              return (
                <div key={item.id} className="relative pl-8">
                  <span className="absolute left-0 top-3 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                    <DonationStatusIcon size={12} className={statusConfig.color} />
                  </span>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-primary-deeper">
                          {item.donation.code}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-on-surface">
                          {item.donation.itemLabel}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.donation.itemCount} item(ns) · última atualização{' '}
                          {formatDonationDateLabel(item.donation.updatedAt)}
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
