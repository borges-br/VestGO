import Link from 'next/link';
import type { DonationRecord } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DONOR_STATUS_META, formatDonorDate } from './status-meta';

type RecentActivityProps = {
  donations: DonationRecord[];
};

export function RecentActivity({ donations }: RecentActivityProps) {
  if (donations.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-primary-deeper/12 bg-surface-cream/40 px-7 py-9 text-center">
        <p className="text-[15px] font-bold text-primary-deeper">
          Sua linha solidária aparece aqui.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-primary-deeper/55">
          Cada doação registrada vira um marco com pontos, status e destino real.
        </p>
      </div>
    );
  }

  const items = donations.slice(0, 5);

  return (
    <ol className="relative m-0 list-none p-0">
      <span
        aria-hidden
        className="absolute bottom-3 left-[17px] top-3 w-px bg-gradient-to-b from-primary/30 via-primary/10 to-transparent"
      />
      {items.map((donation, i) => {
        const meta = DONOR_STATUS_META[donation.status];
        const dropOff =
          donation.dropOffPoint?.organizationName ??
          donation.dropOffPoint?.name ??
          'Destino em definição';
        return (
          <li
            key={donation.id}
            className={cn(
              'relative pl-12 pr-3 py-4',
              i < items.length - 1 && 'border-b border-primary-deeper/5',
            )}
          >
            <span
              aria-hidden
              className="absolute left-[11px] top-[22px] h-3.5 w-3.5 rounded-full border-2 border-primary bg-white shadow-[0_0_0_4px_rgba(0,106,98,0.08)]"
            />
            <Link
              href={`/rastreio/${donation.id}`}
              className="flex flex-col gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-bold text-primary-deeper">
                  {donation.itemLabel}
                </p>
                <span className="flex-shrink-0 text-[11px] text-primary-deeper/45">
                  {formatDonorDate(donation.createdAt)}
                </span>
              </div>
              <p className="truncate text-xs text-primary-deeper/55">{dropOff}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]',
                    meta.pill,
                  )}
                >
                  {meta.label}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                  +{donation.pointsAwarded} pts
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
