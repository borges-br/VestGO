'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import type { AchievementTier, DonorAchievement } from '@/lib/achievements';
import { cn } from '@/lib/utils';

const tierLabels: Record<Exclude<AchievementTier, 'RUBY'>, string> = {
  BRONZE: 'Bronze',
  PRATA: 'Prata',
  OURO: 'Ouro',
  DIAMANTE: 'Diamante',
};

type AchievementDialogProps = {
  achievement: DonorAchievement | null;
  onClose: () => void;
};

export function AchievementDialog({ achievement, onClose }: AchievementDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!achievement) return undefined;

    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-primary-deeper/45 px-4 py-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="Fechar descrição da conquista"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-white p-6 shadow-panel outline-none"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-primary-deeper transition-colors hover:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={17} />
        </button>

        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Conquista
        </p>
        <h3 id={titleId} className="mt-2 pr-10 text-2xl font-extrabold tracking-tight text-primary-deeper">
          {achievement.name}
        </h3>
        <p id={descriptionId} className="mt-3 text-sm leading-7 text-primary-deeper/65">
          {achievement.description}
        </p>

        <div className="mt-5 rounded-2xl bg-surface-cream p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-deeper/50">
            Como conseguir
          </p>
          <p className="mt-2 text-sm leading-7 text-primary-deeper/70">{achievement.howToEarn}</p>
          {achievement.unavailableReason && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
              {achievement.unavailableReason}
            </p>
          )}
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-primary-deeper/10 p-4">
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-deeper/45">
              Progresso
            </dt>
            <dd className="mt-2 text-sm font-bold text-primary-deeper">{achievement.progressLabel}</dd>
          </div>
          <div className="rounded-2xl border border-primary-deeper/10 p-4">
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-deeper/45">
              Nível atual
            </dt>
            <dd className="mt-2 text-sm font-bold text-primary-deeper">
              {achievement.currentTier ? tierLabels[achievement.currentTier] : 'Bloqueada'}
            </dd>
          </div>
          <div className="rounded-2xl border border-primary-deeper/10 p-4">
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-deeper/45">
              Pontos
            </dt>
            <dd className="mt-2 text-sm font-bold text-primary-deeper">
              {achievement.achievementPoints.toLocaleString('pt-BR')}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-deeper/50">
            Critérios por nível
          </p>
          <ul className="mt-3 space-y-2">
            {achievement.levels.map((level) => {
              const reached =
                achievement.currentTier != null &&
                ['BRONZE', 'PRATA', 'OURO', 'DIAMANTE'].indexOf(level.tier) <=
                  ['BRONZE', 'PRATA', 'OURO', 'DIAMANTE'].indexOf(achievement.currentTier);

              return (
                <li
                  key={`${achievement.id}-${level.tier}`}
                  className={cn(
                    'flex items-start justify-between gap-4 rounded-2xl px-4 py-3 text-sm',
                    reached ? 'bg-primary-light text-primary-deeper' : 'bg-surface text-primary-deeper/65',
                  )}
                >
                  <span className="font-semibold">{tierLabels[level.tier]}</span>
                  <span className="text-right">{level.targetLabel}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-5 text-xs leading-6 text-primary-deeper/45">
          Nesta fase, os pontos de conquista são exibidos pela regra de produto e não são somados
          ao total oficial sem o ledger/backend da Fase 2.
        </p>
      </section>
    </div>
  );
}
