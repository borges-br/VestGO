'use client';

import { DONOR_LEVELS, getDonorLevel } from '@/lib/gamification';

type LevelRingProps = {
  points: number;
  className?: string;
};

export function LevelRing({ points, className }: LevelRingProps) {
  const level = getDonorLevel(points);
  const currentIndex = DONOR_LEVELS.findIndex((item) => item.minPoints === level.minPoints);
  const totalLevels = DONOR_LEVELS.length;
  const nextThreshold = level.nextThreshold ?? level.minPoints;
  const range = Math.max(nextThreshold - level.minPoints, 1);
  const progress = level.nextThreshold
    ? Math.min(Math.max((points - level.minPoints) / range, 0), 1)
    : 1;
  const pointsToNext = level.nextThreshold ? Math.max(level.nextThreshold - points, 0) : 0;
  const size = 244;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      className={className}
      aria-label={`Nivel ${currentIndex + 1} de ${totalLevels}. ${points} pontos. ${pointsToNext} pontos para o proximo nivel.`}
    >
      <div className="relative mx-auto h-[244px] w-[244px]">
        <svg
          aria-hidden="true"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <defs>
            <linearGradient id="vestgo-donor-level-ring" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#006a62" />
              <stop offset="58%" stopColor="#21d3c4" />
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
            stroke="url(#vestgo-donor-level-ring)"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeWidth={stroke}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
          {DONOR_LEVELS.map((item, index) => {
            const angle = (index / totalLevels) * Math.PI * 2 - Math.PI / 2;
            const cx = size / 2 + Math.cos(angle) * radius;
            const cy = size / 2 + Math.sin(angle) * radius;
            const reached = index <= currentIndex;

            return (
              <circle
                key={`${item.name}-${item.minPoints}`}
                cx={cx}
                cy={cy}
                r={index === currentIndex ? 4.8 : 2.8}
                fill={reached ? '#006a62' : '#ffffff'}
                stroke={index === currentIndex ? '#ffffff' : 'rgba(0,51,60,0.16)'}
                strokeWidth={index === currentIndex ? 3 : 2}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-deeper/55">
            Nivel {currentIndex + 1} de {totalLevels}
          </span>
          <span className="mt-2 text-4xl font-extrabold leading-none tracking-tight text-primary-deeper tabular-nums">
            {points.toLocaleString('pt-BR')}
          </span>
          <span className="mt-1 text-xs text-primary-deeper/55">pontos</span>
          <span className="mt-3 max-w-[145px] text-[11px] leading-snug text-primary-deeper/55">
            {pointsToNext > 0
              ? `+${pointsToNext.toLocaleString('pt-BR')} para o proximo nivel`
              : 'Nivel maximo alcancado'}
          </span>
        </div>
      </div>
    </div>
  );
}
