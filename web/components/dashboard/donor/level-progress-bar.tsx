type LevelProgressBarProps = {
  pct: number;
  label: string;
  hint: string;
};

export function LevelProgressBar({ pct, label, hint }: LevelProgressBarProps) {
  const safePct = Math.max(0, Math.min(1, pct));
  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="vg-text-primary text-[13px] font-semibold">{label}</span>
        <span className="vg-text-secondary text-xs tabular-nums">{hint}</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--vg-bg-soft)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-primary-glow to-accent-amber transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${Math.round(safePct * 100)}%` }}
        />
      </div>
    </div>
  );
}
