'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DonorAchievement } from '@/lib/api';
import { AchievementDialog } from '@/components/profile/achievement-dialog';
import { AchievementMedal } from '@/components/profile/achievement-medal';

type AchievementsScrollerProps = {
  achievements: DonorAchievement[];
};

export function AchievementsScroller({ achievements }: AchievementsScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<DonorAchievement | null>(null);
  const visibleAchievements = useMemo(
    () => achievements.filter((achievement) => !achievement.hidden),
    [achievements],
  );
  const unlocked = visibleAchievements.filter((achievement) => achievement.unlocked).length;

  const updateScrollState = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) return;

    setCanScrollLeft(element.scrollLeft > 4);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const element = scrollerRef.current;
    if (!element) return undefined;

    element.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      element.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, visibleAchievements.length]);

  function scrollByDirection(direction: -1 | 1) {
    const element = scrollerRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction * Math.min(element.clientWidth * 0.72, 520),
      behavior: 'smooth',
    });
  }

  return (
    <section className="px-5 py-16 sm:px-8 lg:px-12" aria-labelledby="achievements-heading">
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Conquistas
            </p>
            <h2
              id="achievements-heading"
              className="text-3xl font-extrabold tracking-tight text-primary-deeper sm:text-4xl"
            >
              Sua coleção solidária
            </h2>
          </div>
          <p className="text-sm text-primary-deeper/55">
            {unlocked} de {visibleAchievements.length} desbloqueadas
          </p>
        </div>

        <div className="relative">
          <div
            ref={scrollerRef}
            className="scrollbar-hide flex gap-4 overflow-x-auto rounded-[1.75rem] border border-primary-deeper/5 bg-surface-cream px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)',
              maskImage:
                'linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)',
            }}
          >
            {visibleAchievements.map((achievement) => (
              <AchievementMedal
                key={achievement.key}
                achievement={achievement}
                onSelect={setSelectedAchievement}
              />
            ))}
          </div>

          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByDirection(-1)}
              aria-label="Conquistas anteriores"
              className="absolute left-0 top-1/2 flex h-10 w-10 -translate-x-3 -translate-y-1/2 items-center justify-center rounded-full border border-primary-deeper/10 bg-white text-primary-deeper shadow-md transition-colors hover:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByDirection(1)}
              aria-label="Próximas conquistas"
              className="absolute right-0 top-1/2 flex h-10 w-10 translate-x-3 -translate-y-1/2 items-center justify-center rounded-full border border-primary-deeper/10 bg-white text-primary-deeper shadow-md transition-colors hover:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <AchievementDialog
        achievement={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />
    </section>
  );
}
