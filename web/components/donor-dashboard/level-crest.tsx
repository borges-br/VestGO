export function LevelCrest({
  levelIdx,
  levelName,
  progressPct,
  size = 132,
}: {
  levelIdx: number;
  levelName: string;
  progressPct: number;
  size?: number;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progressPct)));

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Nivel ${levelIdx} de 30: ${levelName}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="donorCrestGrad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#006a62" />
            <stop offset="55%" stopColor="#00a89a" />
            <stop offset="100%" stopColor="#e8a33d" />
          </linearGradient>
          <radialGradient id="donorCrestFill" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#005c54" />
            <stop offset="100%" stopColor="#00333c" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="url(#donorCrestFill)" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#donorCrestGrad)"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={stroke}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-[1400ms] motion-safe:ease-[var(--ease-out)] motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center text-white">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(178,232,227,0.75)]">
          Nivel
        </span>
        <span className="mt-0.5 text-[44px] font-extrabold leading-none tracking-tight">
          {levelIdx}
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber">
          de 30
        </span>
      </div>
    </div>
  );
}
