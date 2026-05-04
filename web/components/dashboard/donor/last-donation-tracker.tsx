import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import type { DonationRecord } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DONOR_STATUS_META, formatDonorDate } from './status-meta';

const STEPS: { key: string; label: string }[] = [
  { key: 'REGISTERED', label: 'Registrada' },
  { key: 'AT_POINT', label: 'No ponto' },
  { key: 'IN_TRANSIT', label: 'Em trânsito' },
  { key: 'DELIVERED', label: 'Entregue' },
];

type LastDonationTrackerProps = {
  donation: DonationRecord;
};

export function LastDonationTracker({ donation }: LastDonationTrackerProps) {
  const meta = DONOR_STATUS_META[donation.status];
  const stepIdx = Math.max(0, Math.min(meta.step, STEPS.length - 1));
  const dropOff =
    donation.dropOffPoint?.organizationName ??
    donation.dropOffPoint?.name ??
    'Em definição';

  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-primary-deeper/[0.06] bg-white p-7 shadow-[0_12px_32px_-16px_rgba(0,51,60,0.18)]">
      <header className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Última doação
        </span>
        <Link
          href={`/rastreio/${donation.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-deeper"
        >
          Detalhes
          <ArrowRight size={14} />
        </Link>
      </header>

      <div>
        <h3 className="text-xl font-extrabold leading-tight tracking-tight text-primary-deeper">
          {donation.itemLabel}
        </h3>
        <p className="mt-1 text-[13px] text-primary-deeper/55">
          {donation.itemCount} {donation.itemCount === 1 ? 'item' : 'itens'} · destino{' '}
          <strong className="font-semibold text-primary-deeper/80">{dropOff}</strong>
        </p>
      </div>

      <div className="relative px-1 pb-1 pt-2">
        <div className="absolute left-4 right-4 top-[14px] h-[2px] bg-primary-deeper/[0.08]" />
        <div
          className="absolute left-4 top-[14px] h-[2px] bg-gradient-to-r from-primary to-primary-glow transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{
            width: `calc((100% - 2rem) * ${stepIdx / (STEPS.length - 1)})`,
          }}
        />
        <ol className="relative grid grid-cols-4 gap-2">
          {STEPS.map((step, i) => {
            const done = i <= stepIdx;
            const active = i === stepIdx;
            return (
              <li key={step.key} className="flex flex-col items-center gap-2">
                <span
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'relative z-[1] flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 transition-all duration-300 motion-reduce:transition-none',
                    done
                      ? 'border-primary bg-primary text-white'
                      : 'border-primary-deeper/15 bg-white text-primary-deeper/40',
                    active && 'shadow-[0_0_0_6px_rgba(0,106,98,0.12)]',
                  )}
                >
                  {done ? (
                    <Check size={14} strokeWidth={2.4} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={cn(
                    'text-center text-[11px] font-medium',
                    done
                      ? 'font-bold text-primary-deeper'
                      : 'text-primary-deeper/50',
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-primary-deeper/[0.06] pt-4">
        <span
          className={cn(
            'rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]',
            meta.pill,
          )}
        >
          {meta.label}
        </span>
        <span className="text-[13px] text-primary-deeper/55">
          atualizado {formatDonorDate(donation.updatedAt)}
        </span>
      </footer>
    </article>
  );
}
