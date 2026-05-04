import Link from 'next/link';
import { MapPin, Plus } from 'lucide-react';
import type { DonationRecord } from '@/lib/api';
import { DonorLevelIcon } from './donor-level-icon';
import { LevelProgressBar } from './level-progress-bar';
import { ImpactPills, type DonorImpactStats } from './impact-pills';
import { LastDonationTracker } from './last-donation-tracker';
import { OnboardingCard } from './onboarding-card';

export type DonorDashboardLevel = {
  current: number;
  total: number;
  name: string;
  progressPct: number;
  pointsToNext: number;
  isMax: boolean;
  nextLevelName: string | null;
};

type DonorDashboardHeroProps = {
  firstName: string;
  greeting: string;
  points: number;
  level: DonorDashboardLevel;
  stats: DonorImpactStats;
  latestDonation: DonationRecord | null;
};

export function DonorDashboardHero({
  firstName,
  greeting,
  points,
  level,
  stats,
  latestDonation,
}: DonorDashboardHeroProps) {
  const isNew = stats.totalDonations === 0;

  return (
    <header className="relative overflow-hidden bg-gradient-to-b from-surface-cream via-surface-cream to-white px-4 pb-12 pt-14 sm:px-6 lg:px-12">
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-10 top-20 h-80 w-80 opacity-50"
      >
        <defs>
          <pattern
            id="donor-hero-dots"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="rgba(0,106,98,0.15)" />
          </pattern>
        </defs>
        <rect width="320" height="320" fill="url(#donor-hero-dots)" />
      </svg>

      <div className="relative mx-auto grid max-w-shell items-stretch gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Painel do doador
            </p>
            <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-tight text-primary-deeper">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-3 max-w-[34rem] text-[17px] leading-relaxed text-primary-deeper/65">
              {isNew
                ? 'Sua jornada solidária começa com a primeira peça registrada. Veja por onde começar ao lado.'
                : 'Você está construindo impacto contínuo. Próximo passo: registrar mais uma doação ou explorar parceiros próximos.'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 rounded-3xl border border-primary-deeper/[0.07] bg-white p-7 shadow-[0_10px_30px_-18px_rgba(0,51,60,0.2)] sm:flex-row sm:items-center sm:gap-7">
            <DonorLevelIcon
              level={level.current}
              levelName={level.name}
              progressPct={level.progressPct}
              totalLevels={level.total}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-4 text-center sm:text-left">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-deeper/50">
                  Seu nível atual
                </p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-primary-deeper">
                  {level.name}
                </p>
                <p className="mt-1 text-[13px] text-primary-deeper/55">
                  <strong className="font-bold text-primary-deeper tabular-nums">
                    {points.toLocaleString('pt-BR')}
                  </strong>{' '}
                  pontos solidários acumulados
                </p>
              </div>
              {!level.isMax && level.nextLevelName ? (
                <LevelProgressBar
                  pct={level.progressPct}
                  label={`Próximo: ${level.nextLevelName}`}
                  hint={`+${level.pointsToNext.toLocaleString('pt-BR')} pts`}
                />
              ) : (
                <span className="text-xs font-semibold text-primary">
                  Nível máximo alcançado.
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/doar"
              className="inline-flex items-center gap-2 rounded-full bg-primary-deeper px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(0,51,60,0.4)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
            >
              <Plus size={16} strokeWidth={2.5} />
              Registrar nova doação
            </Link>
            <Link
              href="/mapa"
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-6 py-3.5 text-sm font-semibold text-primary-deeper transition-colors hover:border-primary/40"
            >
              <MapPin size={16} strokeWidth={1.8} />
              Encontrar pontos
            </Link>
          </div>

          <ImpactPills stats={stats} />
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          {isNew || !latestDonation ? (
            <OnboardingCard firstName={firstName} />
          ) : (
            <LastDonationTracker donation={latestDonation} />
          )}
        </div>
      </div>
    </header>
  );
}
