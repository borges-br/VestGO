'use client';

import { DonorLevelIcon } from '@/components/dashboard/donor/donor-level-icon';
import { DONOR_LEVELS, getDonorLevel } from '@/lib/gamification';
import type { DonorGamificationResponse } from '@/lib/api';

type LevelRingProps = {
  points: number;
  level?: DonorGamificationResponse['level'] | null;
  levelName?: string;
  className?: string;
};

export function LevelRing({ points, level, levelName, className }: LevelRingProps) {
  const fallbackLevel = getDonorLevel(points);
  const totalLevels = level?.totalLevels ?? DONOR_LEVELS.length;
  const currentIndex = level
    ? Math.max(0, level.currentLevel - 1)
    : DONOR_LEVELS.findIndex((item) => item.minPoints === fallbackLevel.minPoints);
  const currentLevel = currentIndex + 1;
  const currentLevelName = level?.name ?? levelName ?? fallbackLevel.name;
  const fallbackNextThreshold = fallbackLevel.nextThreshold ?? fallbackLevel.minPoints;
  const fallbackRange = Math.max(fallbackNextThreshold - fallbackLevel.minPoints, 1);
  const fallbackProgress = fallbackLevel.nextThreshold
    ? Math.min(Math.max((points - fallbackLevel.minPoints) / fallbackRange, 0), 1)
    : 1;
  const progress = level?.progress ?? fallbackProgress;
  const pointsToNext =
    level?.pointsToNextLevel ??
    (fallbackLevel.nextThreshold ? Math.max(fallbackLevel.nextThreshold - points, 0) : 0);
  const size = 244;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      className={className}
      role="img"
      aria-label={`Nível ${currentLevel} de ${totalLevels}. ${points} pontos acumulados.${
        level?.lockedUntilFirstDonation && level.unlockMessage
          ? ` ${level.unlockMessage}`
          : pointsToNext > 0
            ? ` Faltam ${pointsToNext} pontos para o próximo nível.`
            : ' Nível máximo alcançado.'
      }`}
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
                fill={reached ? '#006a62' : 'var(--vg-bg-elevated)'}
                stroke={index === currentIndex ? 'var(--vg-bg-elevated)' : 'var(--vg-border-strong)'}
                strokeWidth={index === currentIndex ? 3 : 2}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <DonorLevelIcon
            level={currentLevel}
            levelName={currentLevelName}
            progressPct={progress}
            totalLevels={totalLevels}
            size={132}
            showRing={false}
          />
        </div>
      </div>
    </div>
  );
}
