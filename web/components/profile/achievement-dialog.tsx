'use client';

import { useEffect, useId, useRef } from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';
import type { AchievementTier, DonorAchievement } from '@/lib/api';
import { cn } from '@/lib/utils';

const tierLabels: Record<AchievementTier, string> = {
  BRONZE: 'Bronze',
  PRATA: 'Prata',
  OURO: 'Ouro',
  DIAMANTE: 'Diamante',
  RUBY: 'Ruby',
};

const tierOrder: AchievementTier[] = ['BRONZE', 'PRATA', 'OURO', 'DIAMANTE', 'RUBY'];

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
        className="vg-card relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] p-6 shadow-panel outline-none"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="vg-card-soft absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-primary-deeper transition-colors hover:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={17} />
        </button>

        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Conquista
        </p>
        <h3 id={titleId} className="vg-text-primary mt-2 pr-10 text-2xl font-extrabold tracking-tight">
          {achievement.title}
        </h3>
        <p id={descriptionId} className="vg-text-secondary mt-3 text-sm leading-7">
          {achievement.description}
        </p>

        <div className="vg-card-soft mt-5 rounded-2xl p-4">
          <p className="vg-text-muted text-xs font-bold uppercase tracking-[0.16em]">
            Como conseguir
          </p>
          <p className="vg-text-secondary mt-2 text-sm leading-7">{achievement.howToEarn}</p>
          {achievement.unavailableReason && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
              {achievement.unavailableReason}
            </p>
          )}
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--vg-border)] p-4">
            <dt className="vg-text-muted text-[10px] font-bold uppercase tracking-[0.16em]">
              Progresso
            </dt>
            <dd className="vg-text-primary mt-2 text-sm font-bold">{achievement.progressLabel}</dd>
          </div>
          <div className="rounded-2xl border border-[var(--vg-border)] p-4">
            <dt className="vg-text-muted text-[10px] font-bold uppercase tracking-[0.16em]">
              Nível atual
            </dt>
            <dd className="vg-text-primary mt-2 text-sm font-bold">
              {achievement.tier ? tierLabels[achievement.tier] : 'Bloqueada'}
            </dd>
          </div>
          <div className="rounded-2xl border border-[var(--vg-border)] p-4">
            <dt className="vg-text-muted text-[10px] font-bold uppercase tracking-[0.16em]">
              Pontos
            </dt>
            <dd className="vg-text-primary mt-2 text-sm font-bold">
              {achievement.points.toLocaleString('pt-BR')}
            </dd>
          </div>
        </dl>

        {achievement.criteria && achievement.criteria.length > 0 && (
          <div className="mt-5">
            <p className="vg-text-muted text-xs font-bold uppercase tracking-[0.16em]">
              Etapas do progresso
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {achievement.criteria.map((criterion) => {
                const Icon = criterion.complete ? CheckCircle2 : Circle;

                return (
                  <li
                    key={`${achievement.key}-${criterion.key}`}
                    className={cn(
                      'flex items-center gap-2 rounded-2xl px-3 py-2 text-sm',
                      criterion.complete
                        ? 'bg-primary-light text-primary-deeper'
                        : 'vg-card-soft vg-text-secondary',
                    )}
                  >
                    <Icon
                      size={15}
                      className={criterion.complete ? 'text-primary' : 'vg-text-muted'}
                    />
                    <span>{criterion.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-5">
          <p className="vg-text-muted text-xs font-bold uppercase tracking-[0.16em]">
            Critérios por nível
          </p>
          <ul className="mt-3 space-y-2">
            {achievement.levels.map((level) => {
              const reached =
                achievement.tier != null &&
                tierOrder.indexOf(level.tier) <= tierOrder.indexOf(achievement.tier);

              return (
                <li
                  key={`${achievement.key}-${level.tier}`}
                  className={cn(
                    'flex items-start justify-between gap-4 rounded-2xl px-4 py-3 text-sm',
                    reached ? 'bg-primary-light text-primary-deeper' : 'vg-card-soft vg-text-secondary',
                  )}
                >
                  <span className="font-semibold">{tierLabels[level.tier]}</span>
                  <span className="text-right">{level.targetLabel}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="vg-text-muted mt-5 text-xs leading-6">
          Seu progresso é atualizado automaticamente conforme suas doações e ações no perfil avançam.
        </p>
      </section>
    </div>
  );
}
