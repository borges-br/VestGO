import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  STATUS_META,
  STATUS_TONE_CLASS,
} from '@/components/donor-dashboard/data';
import type { DonationStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

export const donorCardClass =
  'rounded-3xl border border-[rgba(0,51,60,0.06)] bg-white shadow-[0_12px_32px_-20px_rgba(0,51,60,0.2)] dark:border-[rgba(178,232,227,0.12)] dark:bg-[rgba(0,51,60,0.55)]';

export function SectionHeader({
  kicker,
  title,
  action,
  href,
}: {
  kicker: string;
  title: string;
  action?: string | null;
  href?: string;
}) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {kicker}
        </p>
        <h2 className="text-[clamp(1.4rem,2vw,1.75rem)] font-extrabold leading-tight tracking-tight text-[var(--primary-deeper)] dark:text-white">
          {title}
        </h2>
      </div>
      {action && href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
        >
          {action}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: DonationStatus }) {
  const meta = STATUS_META[status];

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
        STATUS_TONE_CLASS[meta.tone],
      )}
    >
      {meta.label}
    </span>
  );
}

export function LoadingPanel({ label = 'Carregando dados reais...' }: { label?: string }) {
  return (
    <div className={cn(donorCardClass, 'p-7')}>
      <div className="h-3 w-28 rounded-full bg-[rgba(0,51,60,0.08)] dark:bg-white/10" />
      <div className="mt-5 h-6 w-3/4 rounded-full bg-[rgba(0,51,60,0.08)] dark:bg-white/10" />
      <div className="mt-3 h-4 w-1/2 rounded-full bg-[rgba(0,51,60,0.08)] dark:bg-white/10" />
      <p className="mt-6 text-sm font-semibold text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
        {label}
      </p>
    </div>
  );
}

export function ErrorPanel({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className={cn(donorCardClass, 'border-dashed p-7')}>
      <p className="text-sm font-bold text-[var(--primary-deeper)] dark:text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.72)]">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center rounded-full bg-[var(--primary-deeper)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
