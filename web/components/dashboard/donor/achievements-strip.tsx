import { Award } from 'lucide-react';
import type { AchievementTier, DonorAchievement } from '@/lib/api';
import { cn } from '@/lib/utils';

type AchievementsStripProps = {
  items: DonorAchievement[];
};

const tierLabels: Record<AchievementTier, string> = {
  BRONZE: 'Bronze',
  PRATA: 'Prata',
  OURO: 'Ouro',
  DIAMANTE: 'Diamante',
  RUBY: 'Ruby',
};

function getProgressPct(achievement: DonorAchievement) {
  if (
    typeof achievement.progressValue !== 'number' ||
    typeof achievement.progressTarget !== 'number' ||
    achievement.progressTarget <= 0
  ) {
    return 0;
  }

  return Math.min(1, Math.max(0, achievement.progressValue / achievement.progressTarget));
}

function getVisibleAchievements(items: DonorAchievement[]) {
  const visible = items.filter((achievement) => achievement.unlocked || !achievement.hidden);
  const unlocked = visible.filter((achievement) => achievement.unlocked);
  const inProgress = visible.filter((achievement) => !achievement.unlocked && !achievement.unavailable);

  if (unlocked.length > 0) {
    return visible.sort((left, right) => {
      if (left.unlocked !== right.unlocked) return left.unlocked ? -1 : 1;

      if (left.unlocked && right.unlocked) {
        const leftTime = left.unlockedAt ? new Date(left.unlockedAt).getTime() : 0;
        const rightTime = right.unlockedAt ? new Date(right.unlockedAt).getTime() : 0;

        if (leftTime !== rightTime) return rightTime - leftTime;
      }

      return getProgressPct(right) - getProgressPct(left);
    });
  }

  return inProgress.sort((left, right) => getProgressPct(right) - getProgressPct(left));
}

function MiniMedal({ earned }: { earned: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2',
        earned
          ? 'border-amber-400 bg-gradient-to-br from-amber-100 to-amber-300 text-amber-900 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.08)]'
          : 'border-[var(--vg-border-strong)] bg-[var(--vg-bg-soft)] text-[var(--vg-text-muted)]',
      )}
    >
      <Award size={18} strokeWidth={1.6} />
    </div>
  );
}

export function AchievementsStrip({ items }: AchievementsStripProps) {
  const visibleItems = getVisibleAchievements(items);

  if (visibleItems.length === 0) {
    return (
      <div className="vg-card-soft flex items-center gap-4 rounded-2xl border-dashed px-5 py-5">
        <MiniMedal earned={false} />
        <div>
          <p className="vg-text-primary text-[13px] font-bold">
            Suas conquistas aparecem aqui conforme seu progresso avança.
          </p>
          <p className="vg-text-secondary mt-1 text-xs">
            Faça sua primeira doação para começar a desbloquear novos marcos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {visibleItems.slice(0, 4).map((achievement) => (
        <li
          key={achievement.key}
          className={cn(
            'flex items-center gap-3 rounded-2xl px-4 py-3',
            achievement.unlocked ? 'vg-card' : 'vg-card-soft border-dashed',
          )}
        >
          <MiniMedal earned={achievement.unlocked} />
          <div className="min-w-0">
            <p
              className={cn(
                'text-[13px] font-bold leading-tight',
                achievement.unlocked ? 'vg-text-primary' : 'vg-text-secondary',
              )}
            >
              {achievement.title}
            </p>
            <p className="vg-text-muted mt-1 text-[11px]">
              {achievement.unlocked
                ? achievement.tier
                  ? `Desbloqueada · ${tierLabels[achievement.tier]}`
                  : 'Desbloqueada'
                : achievement.progressLabel || 'Em progresso'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
