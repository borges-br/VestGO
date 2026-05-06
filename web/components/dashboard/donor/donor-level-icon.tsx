'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type DonorLevelIconProps = {
  level: number;
  levelName: string;
  progressPct: number;
  totalLevels?: number;
  size?: number;
  iconBasePath?: string;
  showRing?: boolean;
};

export function DonorLevelIcon({
  level,
  levelName,
  progressPct,
  totalLevels = 30,
  size = 156,
  iconBasePath = '/images/levels',
  showRing = true,
}: DonorLevelIconProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(1, progressPct));
  const offset = circumference * (1 - safePct);
  const iconUrl = `${iconBasePath}/${level}.png`;
  const iconSize = Math.round(size * (showRing ? 0.74 : 0.9));

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      role={showRing ? 'img' : undefined}
      aria-label={showRing ? `Ícone do nível ${level} — ${levelName}` : undefined}
      aria-hidden={showRing ? undefined : true}
    >
      {showRing && (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <defs>
            <linearGradient id={`donor-level-ring-${level}`} x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#006a62" />
              <stop offset="55%" stopColor="#21d3c4" />
              <stop offset="100%" stopColor="#e8a33d" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(0,51,60,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#donor-level-ring-${level})`}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeWidth={stroke}
            className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        {imageFailed ? (
          <DonorLevelIconFallback level={level} totalLevels={totalLevels} size={iconSize} />
        ) : (
          <img
            src={iconUrl}
            alt={`Ícone do nível ${level} — ${levelName}`}
            width={iconSize}
            height={iconSize}
            loading="eager"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="object-contain drop-shadow-[0_6px_18px_rgba(0,51,60,0.18)] motion-safe:transition-transform motion-safe:duration-500"
            style={{ width: iconSize, height: iconSize }}
          />
        )}
      </div>
    </div>
  );
}

function DonorLevelIconFallback({
  level,
  totalLevels,
  size,
}: {
  level: number;
  totalLevels: number;
  size: number;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-full text-white',
        'bg-gradient-to-br from-primary-deeper via-primary to-accent-amber',
        'shadow-[inset_0_-3px_10px_rgba(0,0,0,0.18),0_8px_18px_rgba(0,51,60,0.22)]',
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-muted/85">
        Nível
      </span>
      <span
        className="font-extrabold leading-none tabular-nums tracking-tight"
        style={{ fontSize: Math.round(size * 0.42) }}
      >
        {level}
      </span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-accent-amber">
        de {totalLevels}
      </span>
    </div>
  );
}
