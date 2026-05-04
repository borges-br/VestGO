import { cn } from '@/lib/utils';

export function ProgressBar({
  pct,
  label,
  hint,
  className,
}: {
  pct: number;
  label: string;
  hint: string;
  className?: string;
}) {
  const width = `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-[var(--primary-deeper)] dark:text-white">
          {label}
        </span>
        <span className="text-xs tabular-nums text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
          {hint}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-[rgba(0,51,60,0.07)] dark:bg-white/10"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#006a62_0%,#00a89a_60%,#e8a33d_100%)] motion-safe:transition-[width] motion-safe:duration-[1200ms] motion-safe:ease-[var(--ease-out)] motion-reduce:transition-none"
          style={{ width }}
        />
      </div>
    </div>
  );
}
