'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Trophy, X } from 'lucide-react';
import type { GamificationSyncResponse } from '@/lib/api';

type GamificationSyncToastProps = {
  sync: GamificationSyncResponse | null;
  onDismiss: () => void;
};

export function GamificationSyncToast({ sync, onDismiss }: GamificationSyncToastProps) {
  const [displayPoints, setDisplayPoints] = useState(0);
  const totalPoints = sync?.pointsAwarded ?? 0;
  const visible = Boolean(sync && (sync.pointsAwarded > 0 || sync.achievementsChanged > 0));
  const singleChange = sync?.changes.length === 1 ? sync.changes[0] : null;
  const title = useMemo(() => {
    if (!sync) return '';
    if (singleChange) return 'Conquista desbloqueada';

    return `${sync.achievementsChanged} conquistas desbloqueadas/atualizadas`;
  }, [singleChange, sync]);

  useEffect(() => {
    if (!visible) {
      setDisplayPoints(0);
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayPoints(totalPoints);
      return undefined;
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 900;

    function animate(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;

      setDisplayPoints(Math.round(totalPoints * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [totalPoints, visible]);

  if (!sync || !visible) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="vg-card fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-[440px] overflow-hidden rounded-3xl p-4 text-primary-deeper shadow-[0_24px_70px_rgba(0,51,60,0.22)] backdrop-blur md:left-auto md:mx-0"
    >
      <style>
        {`@keyframes vestgo-sync-flow {
          from { background-position: 0% 50%; }
          to { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vestgo-sync-flow { animation: none !important; }
        }`}
      </style>
      <div
        aria-hidden="true"
        className="vestgo-sync-flow pointer-events-none absolute inset-0 opacity-35 motion-safe:animate-[vestgo-sync-flow_14s_linear_infinite]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(110deg, rgba(0,106,98,0.22) 0%, rgba(33,211,196,0.2) 18%, rgba(232,163,61,0.2) 36%, rgba(204,47,97,0.16) 54%, rgba(0,106,98,0.22) 72%)',
          backgroundSize: '220% 100%',
          maskImage:
            'linear-gradient(to bottom, white, transparent), radial-gradient(circle at top left, white, transparent 62%)',
          maskComposite: 'intersect',
        }}
      />

      <div className="relative flex items-start gap-3">
        <div className="mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_12px_28px_rgba(0,106,98,0.25)]">
          {singleChange ? <Trophy size={20} /> : <Sparkles size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            {title}
          </p>
          <p className="mt-1 text-sm font-extrabold leading-6">
            {singleChange ? singleChange.title : 'Sua coleção solidária evoluiu'}
          </p>
          {singleChange && (
            <p className="vg-text-secondary text-xs font-semibold uppercase tracking-[0.14em]">
              Novo nível: {singleChange.toTier}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary-light px-3 py-1 text-sm font-extrabold text-primary tabular-nums">
              +{displayPoints.toLocaleString('pt-BR')} pontos
            </span>
            <Link
              href="/perfil#conquistas"
              className="vg-card rounded-full px-3 py-1 text-xs font-bold text-primary transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
            >
              Ver conquistas
            </Link>
          </div>
        </div>

        <button
          type="button"
          aria-label="Fechar notificacao de conquista"
          onClick={onDismiss}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[var(--vg-text-muted)] transition-colors hover:bg-primary-light hover:text-primary-deeper focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={17} />
        </button>
      </div>
    </aside>
  );
}
