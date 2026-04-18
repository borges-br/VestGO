'use client';

import { startTransition, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  DONATION_STATUS_ACTIONS,
  DONATION_STATUS_CONFIG,
} from '@/components/donations/donation-status';
import {
  updateDonationStatus,
  type DonationRecord,
  type DonationStatus,
} from '@/lib/api';

function getStatusLocation(donation: DonationRecord, nextStatus: DonationStatus) {
  if (nextStatus === 'AT_POINT' || nextStatus === 'IN_TRANSIT') {
    return (
      donation.collectionPoint?.organizationName ??
      donation.collectionPoint?.name ??
      donation.dropOffPoint?.organizationName ??
      donation.dropOffPoint?.name ??
      undefined
    );
  }

  if (nextStatus === 'DELIVERED' || nextStatus === 'DISTRIBUTED') {
    return donation.ngo?.organizationName ?? donation.ngo?.name ?? undefined;
  }

  return undefined;
}

interface StatusActionPanelProps {
  donation: DonationRecord;
  onUpdated?: (donation: DonationRecord) => void;
  compact?: boolean;
}

export function StatusActionPanel({
  donation,
  onUpdated,
  compact = false,
}: StatusActionPanelProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [pendingStatus, setPendingStatus] = useState<DonationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableActions = donation.allowedNextStatuses.filter(
    (status) => DONATION_STATUS_ACTIONS[status],
  );

  if (availableActions.length === 0) {
    return null;
  }

  async function handleStatusUpdate(nextStatus: DonationStatus) {
    if (!session?.user?.accessToken) {
      setError('Sua sessao expirou. Entre novamente para continuar.');
      return;
    }

    setPendingStatus(nextStatus);
    setError(null);

    try {
      const updatedDonation = await updateDonationStatus(
        donation.id,
        {
          status: nextStatus,
          description: DONATION_STATUS_ACTIONS[nextStatus].description,
          location: getStatusLocation(donation, nextStatus),
        },
        session.user.accessToken,
      );

      onUpdated?.(updatedDonation);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel atualizar o status agora.');
    } finally {
      setPendingStatus(null);
    }
  }

  return (
    <div className={`rounded-[2rem] bg-white p-5 shadow-card ${compact ? '' : 'lg:p-6'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Atualizacao operacional
          </p>
          <h3 className="mt-2 text-xl font-bold text-primary-deeper">
            Proximo passo disponivel
          </h3>
        </div>
        <Sparkles size={18} className="text-primary" />
      </div>

      <div className="mt-4 space-y-3">
        {availableActions.map((status) => {
          const action = DONATION_STATUS_ACTIONS[status];
          const config = DONATION_STATUS_CONFIG[status];
          const isPending = pendingStatus === status;

          return (
            <button
              key={status}
              onClick={() => handleStatusUpdate(status)}
              disabled={Boolean(pendingStatus)}
              className="flex w-full items-start justify-between gap-4 rounded-[1.5rem] border border-gray-100 bg-surface px-4 py-4 text-left transition-colors hover:border-primary/20 hover:bg-primary-light/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div>
                <p className="text-sm font-semibold text-on-surface">{action.label}</p>
                <p className="mt-1 text-xs leading-6 text-gray-400">{action.description}</p>
              </div>
              <span
                className={`inline-flex flex-shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold ${config.bg} ${config.color}`}
              >
                {isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    Salvando
                  </span>
                ) : (
                  config.label
                )}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
