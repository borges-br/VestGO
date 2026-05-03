'use client';

import {
  CalendarDays,
  CheckCircle2,
  Gift,
  HeartHandshake,
  Layers3,
  Lock,
  Medal,
  Network,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';
import type { AchievementId, AchievementTier, DonorAchievement } from '@/lib/achievements';
import { cn } from '@/lib/utils';

const tierStyles: Record<
  Exclude<AchievementTier, 'RUBY'>,
  { disk: string; border: string; ribbon: string; text: string; label: string }
> = {
  BRONZE: {
    disk: 'from-[#f6d8b6] via-[#e7b174] to-[#bc7440]',
    border: 'border-[#bf7a44]',
    ribbon: 'from-[#bc7440] to-[#f6d8b6]',
    text: 'text-[#4b2e13]',
    label: 'Bronze',
  },
  PRATA: {
    disk: 'from-[#f4f6f8] via-[#cfd6dd] to-[#8e9aa5]',
    border: 'border-[#9aa2ab]',
    ribbon: 'from-[#8e9aa5] to-[#f4f6f8]',
    text: 'text-[#1f2a34]',
    label: 'Prata',
  },
  OURO: {
    disk: 'from-[#fff2ba] via-[#e9c95d] to-[#b8871f]',
    border: 'border-[#c9a54a]',
    ribbon: 'from-[#b8871f] to-[#fff2ba]',
    text: 'text-[#3d2b00]',
    label: 'Ouro',
  },
  DIAMANTE: {
    disk: 'from-[#dffcff] via-[#75d9e4] to-[#008c9b]',
    border: 'border-[#21a7b8]',
    ribbon: 'from-[#008c9b] to-[#dffcff]',
    text: 'text-[#00333c]',
    label: 'Diamante',
  },
};

const achievementIcons: Record<AchievementId, LucideIcon> = {
  'recurring-donation': CheckCircle2,
  streak: CalendarDays,
  'solidarity-delivery': PackageCheck,
  'active-network': Network,
  'monthly-hero': Star,
  'complete-profile': ShieldCheck,
  diversity: Layers3,
  'seasonal-spirit': Gift,
  abundance: HeartHandshake,
  'network-veteran': Medal,
};

type AchievementMedalProps = {
  achievement: DonorAchievement;
  onSelect: (achievement: DonorAchievement) => void;
};

export function AchievementMedal({ achievement, onSelect }: AchievementMedalProps) {
  const tier = achievement.currentTier ?? 'BRONZE';
  const styles = tierStyles[tier];
  const Icon = achievement.unavailable ? Lock : achievementIcons[achievement.id] ?? Sparkles;
  const muted = !achievement.unlocked || achievement.unavailable;

  return (
    <button
      type="button"
      onClick={() => onSelect(achievement)}
      className="group flex w-[136px] flex-shrink-0 scroll-ml-8 flex-col items-center gap-2 rounded-2xl px-2 py-2 text-center outline-none transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={`Abrir conquista ${achievement.name}`}
    >
      <span
        className={cn(
          'relative block h-[96px] w-[82px] transition duration-200',
          muted && 'opacity-45 grayscale',
          !muted && 'drop-shadow-[0_12px_20px_rgba(0,51,60,0.18)]',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 left-[19px] h-12 w-5 -skew-x-6 bg-gradient-to-b',
            styles.ribbon,
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 right-[19px] h-12 w-5 skew-x-6 bg-gradient-to-b',
            styles.ribbon,
          )}
        />
        <span
          className={cn(
            'absolute left-1/2 top-1 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-[3px] bg-gradient-to-br shadow-inner',
            styles.disk,
            styles.border,
            styles.text,
          )}
        >
          <Icon size={27} strokeWidth={1.8} />
        </span>
      </span>
      <span className="line-clamp-2 min-h-[34px] text-[13px] font-extrabold leading-tight tracking-tight text-primary-deeper">
        {achievement.name}
      </span>
      <span className="text-[11px] leading-tight text-primary-deeper/55">
        {achievement.unavailable
          ? 'Indisponível'
          : achievement.currentTier
            ? styles.label
            : achievement.progressLabel}
      </span>
    </button>
  );
}
