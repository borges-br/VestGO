import Link from 'next/link';
import {
  ArrowRight,
  Award,
  Flame,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import {
  donorImpactSnapshot,
  postDonationReward,
  type ImpactBadge,
  type ImpactSnapshot,
  type PostDonationReward,
} from '@/lib/gamification';
import { cn } from '@/lib/utils';

const toneStyles: Record<
  ImpactBadge['tone'],
  { card: string; icon: string; text: string }
> = {
  primary: {
    card: 'bg-primary-light/45',
    icon: 'bg-white text-primary',
    text: 'text-primary-deeper',
  },
  indigo: {
    card: 'bg-indigo-50',
    icon: 'bg-white text-indigo-600',
    text: 'text-indigo-700',
  },
  emerald: {
    card: 'bg-emerald-50',
    icon: 'bg-white text-emerald-600',
    text: 'text-emerald-700',
  },
  amber: {
    card: 'bg-amber-50',
    icon: 'bg-white text-amber-600',
    text: 'text-amber-700',
  },
};

const badgeIcons = {
  primary: ShieldCheck,
  indigo: Sparkles,
  emerald: HeartHandshake,
  amber: Target,
};

function ProgressBar({
  current,
  target,
  tone = 'primary',
}: {
  current: number;
  target: number;
  tone?: 'primary' | 'dark';
}) {
  const width = `${Math.min((current / target) * 100, 100)}%`;

  return (
    <div className="h-2 rounded-full bg-white/80">
      <div
        className={cn('h-full rounded-full transition-all duration-300', tone === 'primary' ? 'bg-primary' : 'bg-primary-deeper')}
        style={{ width }}
      />
    </div>
  );
}

export function ImpactSummaryCard({
  snapshot = donorImpactSnapshot,
  className,
}: {
  snapshot?: ImpactSnapshot;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[2rem] bg-white p-6 shadow-card lg:p-7', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Meu progresso
          </p>
          <h2 className="mt-2 text-2xl font-bold text-primary-deeper">{snapshot.levelTitle}</h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <Award size={20} />
        </div>
      </div>

      <div className="mt-5 rounded-[1.75rem] bg-primary-deeper p-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
          {snapshot.pointsLabel}
        </p>
        <p className="mt-3 text-4xl font-bold tracking-tight">{snapshot.points}</p>
        <p className="mt-2 text-sm leading-7 text-primary-muted">
          Reconhecimento acumulado por entregas registradas, avancos da jornada e constancia.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] bg-surface p-4">
          <div className="flex items-center gap-2 text-primary">
            <Flame size={16} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Constancia</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-primary-deeper">{snapshot.streak.value}</p>
          <p className="mt-1 text-sm text-gray-500">{snapshot.streak.label}</p>
        </div>

        <div className="rounded-[1.5rem] bg-surface p-4">
          <div className="flex items-center gap-2 text-primary">
            <Trophy size={16} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Ranking local</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-primary-deeper">
            {snapshot.ranking.position ? `#${snapshot.ranking.position}` : 'Em breve'}
          </p>
          <p className="mt-1 text-sm text-gray-500">{snapshot.ranking.scope}</p>
        </div>
      </div>
    </div>
  );
}

export function ImpactProgressCard({
  snapshot = donorImpactSnapshot,
  className,
}: {
  snapshot?: ImpactSnapshot;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[2rem] bg-primary-light/45 p-6 shadow-card lg:p-7', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Progresso pessoal
          </p>
          <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Metas com impacto real</h2>
        </div>
        <Target size={20} className="text-primary" />
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary-deeper">{snapshot.nextMilestone.label}</p>
              <p className="mt-1 text-sm leading-7 text-gray-500">{snapshot.nextMilestone.note}</p>
            </div>
            <span className="rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {snapshot.nextMilestone.current}/{snapshot.nextMilestone.target}
            </span>
          </div>
          <div className="mt-4">
            <ProgressBar current={snapshot.nextMilestone.current} target={snapshot.nextMilestone.target} />
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary-deeper">{snapshot.monthlyGoal.label}</p>
              <p className="mt-1 text-sm leading-7 text-gray-500">{snapshot.monthlyGoal.note}</p>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              {snapshot.monthlyGoal.current}/{snapshot.monthlyGoal.target}
            </span>
          </div>
          <div className="mt-4">
            <ProgressBar current={snapshot.monthlyGoal.current} target={snapshot.monthlyGoal.target} tone="dark" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BadgeCollectionCard({
  badges = donorImpactSnapshot.badges,
  className,
  compact = false,
}: {
  badges?: ImpactBadge[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('rounded-[2rem] bg-white p-6 shadow-card lg:p-7', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Conquistas
          </p>
          <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Badges da sua solidariedade</h2>
        </div>
        <Sparkles size={20} className="text-primary" />
      </div>

      <div className={cn('mt-5 grid gap-3', compact ? 'sm:grid-cols-2' : 'lg:grid-cols-2')}>
        {badges.map((badge) => {
          const tone = toneStyles[badge.tone];
          const Icon = badgeIcons[badge.tone];

          return (
            <div
              key={badge.id}
              className={cn(
                'rounded-[1.75rem] border p-4 transition-colors',
                badge.earned ? 'border-transparent bg-white shadow-sm' : 'border-dashed border-gray-200 bg-surface',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl', tone.card, tone.text)}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-on-surface">{badge.label}</p>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                        badge.earned ? tone.card : 'bg-white text-gray-400',
                        badge.earned ? tone.text : '',
                      )}
                    >
                      {badge.earned ? 'Liberada' : 'Em andamento'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-gray-500">{badge.description}</p>
                  {!badge.earned && badge.progressLabel && (
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                      {badge.progressLabel}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RankingPreviewCard({
  snapshot = donorImpactSnapshot,
  className,
}: {
  snapshot?: ImpactSnapshot;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[2rem] bg-white p-6 shadow-card lg:p-7', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Comparativo local
          </p>
          <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Ranking leve e opt-in</h2>
        </div>
        <Trophy size={20} className="text-primary" />
      </div>

      <div className="mt-5 rounded-[1.75rem] bg-surface p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-4xl font-bold tracking-tight text-primary-deeper">
              {snapshot.ranking.position ? `#${snapshot.ranking.position}` : 'Preparado'}
            </p>
            <p className="mt-1 text-sm text-gray-500">entre doadores em {snapshot.ranking.scope}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-sm">
            opcional
          </span>
        </div>
        <p className="mt-3 text-sm leading-7 text-gray-500">{snapshot.ranking.note}</p>
      </div>
    </div>
  );
}

export function ImpactHistoryCard({
  snapshot = donorImpactSnapshot,
  className,
}: {
  snapshot?: ImpactSnapshot;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[2rem] bg-white p-6 shadow-card lg:p-7', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Historico de contribuicao
          </p>
          <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Como seu impacto evoluiu</h2>
        </div>
        <HeartHandshake size={20} className="text-primary" />
      </div>

      <div className="mt-5 space-y-3">
        {snapshot.history.length > 0 ? (
          snapshot.history.map((item) => (
            <div key={`${item.title}-${item.date}`} className="rounded-[1.75rem] border border-gray-100 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">{item.detail}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">
                    {item.date}
                  </p>
                </div>
                <span className="rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {item.points}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.75rem] bg-surface p-5">
            <p className="text-sm font-semibold text-primary-deeper">Seu historico ainda vai comecar.</p>
            <p className="mt-2 text-sm leading-7 text-gray-500">
              As próximas doações registradas vão aparecer aqui, com pontos ganhos e o contexto solidário.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PostDonationRewardCard({
  className,
  href = '/perfil',
  reward = postDonationReward,
}: {
  className?: string;
  href?: string;
  reward?: PostDonationReward;
}) {
  return (
    <div className={cn('rounded-[1.75rem] bg-primary-light/45 p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Reconhecimento desta entrega
          </p>
          <p className="mt-2 text-xl font-bold text-primary-deeper">+{reward.points} pontos previstos</p>
          <p className="mt-2 text-sm leading-7 text-gray-500">{reward.note}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
          <Award size={18} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Proxima conquista</p>
          <p className="mt-2 text-sm font-semibold text-primary-deeper">{reward.milestone.label}</p>
          <p className="mt-1 text-sm text-gray-500">
            {reward.milestone.current}/{reward.milestone.target} pontos neste marco
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Meta do mes</p>
          <p className="mt-2 text-sm font-semibold text-primary-deeper">
            {reward.monthlyGoal.current}/{reward.monthlyGoal.target} entregas
          </p>
          <p className="mt-1 text-sm text-gray-500">Seu proximo registro fecha o ciclo do mes.</p>
        </div>
      </div>

      <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        Ver minha solidariedade
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
