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
import type { AchievementTier, DonorAchievement } from '@/lib/api';
import { cn } from '@/lib/utils';

const tierStyles: Record<
  AchievementTier,
  { disk: string; border: string; ribbon: string; text: string; glow: string; label: string }
> = {
  BRONZE: {
    disk: 'from-[#f5d8b7] via-[#c98a55] to-[#6f3f22]',
    border: 'border-[#9f6339]',
    ribbon: 'from-[#8f5631] via-[#c98a55] to-[#f5d8b7]',
    text: 'text-[#35200f]',
    glow: 'group-hover:shadow-[0_18px_35px_rgba(159,99,57,0.24)] group-focus-visible:shadow-[0_18px_35px_rgba(159,99,57,0.24)]',
    label: 'Bronze',
  },
  PRATA: {
    disk: 'from-[#f8fafc] via-[#b8c2cc] to-[#5d6a75]',
    border: 'border-[#7e8994]',
    ribbon: 'from-[#687480] via-[#b8c2cc] to-[#f8fafc]',
    text: 'text-[#17212b]',
    glow: 'group-hover:shadow-[0_18px_35px_rgba(104,116,128,0.22)] group-focus-visible:shadow-[0_18px_35px_rgba(104,116,128,0.22)]',
    label: 'Prata',
  },
  OURO: {
    disk: 'from-[#fff0b8] via-[#d6aa37] to-[#775017]',
    border: 'border-[#aa8128]',
    ribbon: 'from-[#8f651d] via-[#d6aa37] to-[#fff0b8]',
    text: 'text-[#2f2108]',
    glow: 'group-hover:shadow-[0_18px_35px_rgba(170,129,40,0.25)] group-focus-visible:shadow-[0_18px_35px_rgba(170,129,40,0.25)]',
    label: 'Ouro',
  },
  DIAMANTE: {
    disk: 'from-[#ecfeff] via-[#7dd3fc] to-[#0f5f78]',
    border: 'border-[#2d91ad]',
    ribbon: 'from-[#0f5f78] via-[#7dd3fc] to-[#ecfeff]',
    text: 'text-[#072f3c]',
    glow: 'group-hover:shadow-[0_18px_35px_rgba(45,145,173,0.25)] group-focus-visible:shadow-[0_18px_35px_rgba(45,145,173,0.25)]',
    label: 'Diamante',
  },
  RUBY: {
    disk: 'from-[#ffe4ec] via-[#cc2f61] to-[#5d0825]',
    border: 'border-[#9f1844]',
    ribbon: 'from-[#7a1234] via-[#cc2f61] to-[#ffe4ec]',
    text: 'text-[#fff4f7]',
    glow: 'group-hover:shadow-[0_18px_35px_rgba(159,24,68,0.28)] group-focus-visible:shadow-[0_18px_35px_rgba(159,24,68,0.28)]',
    label: 'Ruby',
  },
};

const achievementIcons: Record<string, LucideIcon> = {
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
  'medal-hunter': Sparkles,
  'community-ambassador': Star,
  unstoppable: ShieldCheck,
  'supreme-donor': Medal,
  'supreme-solidarity-hero': Star,
};

type AchievementMedalProps = {
  achievement: DonorAchievement;
  onSelect: (achievement: DonorAchievement) => void;
};

export function AchievementMedal({ achievement, onSelect }: AchievementMedalProps) {
  const tier = achievement.tier ?? achievement.nextTier ?? 'BRONZE';
  const styles = tierStyles[tier];
  const Icon = achievement.unavailable ? Lock : achievementIcons[achievement.key] ?? Sparkles;
  const muted = !achievement.unlocked || achievement.unavailable;

  return (
    <button
      type="button"
      onClick={() => onSelect(achievement)}
      className="group flex w-[136px] flex-shrink-0 scroll-ml-8 flex-col items-center gap-2 rounded-2xl px-2 py-2 text-center outline-none transition-transform motion-safe:hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={`Abrir conquista ${achievement.title}`}
    >
      <span
        className={cn(
          'relative block h-[96px] w-[82px] transition duration-200 motion-safe:[transform-style:preserve-3d] motion-safe:group-hover:[transform:perspective(700px)_rotateX(5deg)_rotateY(-5deg)] motion-safe:group-focus-visible:[transform:perspective(700px)_rotateX(5deg)_rotateY(-5deg)]',
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
            'absolute left-1/2 top-1 flex h-16 w-16 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-[3px] bg-gradient-to-br shadow-inner transition-shadow duration-300',
            styles.disk,
            styles.border,
            styles.text,
            !muted && styles.glow,
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-35%] -translate-x-10 rotate-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.68),transparent)] opacity-0 transition duration-700 motion-safe:group-hover:translate-x-10 motion-safe:group-hover:opacity-80 motion-safe:group-focus-visible:translate-x-10 motion-safe:group-focus-visible:opacity-80"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.75),transparent_32%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.22),transparent_38%)] mix-blend-overlay"
          />
          <Icon size={27} strokeWidth={1.8} />
        </span>
      </span>
      <span className="vg-text-primary line-clamp-2 min-h-[34px] text-[13px] font-extrabold leading-tight tracking-tight">
        {achievement.title}
      </span>
      <span className="vg-text-secondary text-[11px] leading-tight">
        {achievement.unavailable
          ? 'Indisponível'
          : achievement.tier
            ? styles.label
            : achievement.progressLabel}
      </span>
    </button>
  );
}
