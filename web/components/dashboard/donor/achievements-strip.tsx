import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImpactBadge } from '@/lib/gamification';

type AchievementsStripProps = {
  items: ImpactBadge[];
};

function MiniMedal({ earned }: { earned: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2',
        earned
          ? 'border-amber-400 bg-gradient-to-br from-amber-100 to-amber-300 text-amber-900 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.08)]'
          : 'border-primary-deeper/15 bg-surface text-primary-deeper/40',
      )}
    >
      <Award size={18} strokeWidth={1.6} />
    </div>
  );
}

export function AchievementsStrip({ items }: AchievementsStripProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-primary-deeper/12 bg-surface-cream/40 px-5 py-5">
        <MiniMedal earned={false} />
        <div>
          <p className="text-[13px] font-bold text-primary-deeper">
            Suas conquistas começam na primeira doação.
          </p>
          <p className="mt-1 text-xs text-primary-deeper/55">
            Cada marco vira uma medalha permanente no perfil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {items.slice(0, 4).map((badge) => (
        <li
          key={badge.id}
          className={cn(
            'flex items-center gap-3 rounded-2xl px-4 py-3',
            badge.earned
              ? 'border border-primary-deeper/[0.06] bg-white'
              : 'border border-dashed border-primary-deeper/12 bg-surface-cream/40',
          )}
        >
          <MiniMedal earned={badge.earned} />
          <div className="min-w-0">
            <p
              className={cn(
                'text-[13px] font-bold leading-tight',
                badge.earned ? 'text-primary-deeper' : 'text-primary-deeper/55',
              )}
            >
              {badge.label}
            </p>
            <p className="mt-1 text-[11px] text-primary-deeper/50">
              {badge.earned
                ? 'Desbloqueada'
                : (badge.progressLabel ?? 'Em progresso')}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
