import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ClipboardList,
  Flame,
  MapPin,
  Package,
  Plus,
} from 'lucide-react';
import { getImpactLevelProgress } from '@/lib/gamification';
import {
  STATUS_META,
  formatDateShort,
} from '@/components/donor-dashboard/data';
import { LevelCrest } from '@/components/donor-dashboard/level-crest';
import { ProgressBar } from '@/components/donor-dashboard/progress-bar';
import {
  ErrorPanel,
  LoadingPanel,
  donorCardClass,
} from '@/components/donor-dashboard/shared';
import type {
  DashboardDonation,
  DonorDashboardData,
  DonorUserStats,
} from '@/components/donor-dashboard/types';
import { cn } from '@/lib/utils';

function ImpactPills({ stats }: { stats: DonorUserStats }) {
  const pills = [
    {
      value: stats.totalDonations,
      label: stats.totalDonations === 1 ? 'doacao registrada' : 'doacoes registradas',
      icon: ClipboardList,
    },
    {
      value: stats.itemsDonated,
      label: stats.itemsDonated === 1 ? 'peca doada' : 'pecas doadas',
      icon: Package,
    },
    {
      value: stats.partnersUsed,
      label: stats.partnersUsed === 1 ? 'ponto parceiro' : 'pontos parceiros',
      icon: MapPin,
    },
    {
      value: stats.streakMonths,
      label: stats.streakMonths === 1 ? 'mes consecutivo' : 'meses consecutivos',
      icon: Flame,
    },
  ];

  return (
    <div className="grid overflow-hidden border-y border-[rgba(0,51,60,0.08)] sm:grid-cols-2 min-[1180px]:grid-cols-4 dark:border-[rgba(178,232,227,0.12)]">
      {pills.map(({ value, label, icon: Icon }, index) => (
        <div
          key={label}
          className={cn(
            'flex min-h-32 flex-col gap-2 px-5 py-5 min-[1180px]:px-6',
            index < pills.length - 1 &&
              'border-b border-[rgba(0,51,60,0.08)] sm:[&:nth-child(odd)]:border-r min-[1180px]:border-b-0 min-[1180px]:border-r dark:border-[rgba(178,232,227,0.12)]',
          )}
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(0,51,60,0.5)] dark:text-[rgba(178,232,227,0.7)]">
            <Icon size={14} className="text-primary" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </span>
          <span className="text-3xl font-extrabold leading-none tracking-tight text-[var(--primary-deeper)] tabular-nums dark:text-white">
            {value.toLocaleString('pt-BR')}
          </span>
          <span className="text-[13px] text-[rgba(0,51,60,0.6)] dark:text-[rgba(178,232,227,0.72)]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function LastDonationTracker({ donation }: { donation: DashboardDonation }) {
  const meta = STATUS_META[donation.status];
  const steps = [
    { key: 'REGISTERED', label: 'Registrada' },
    { key: 'AT_POINT', label: 'No ponto' },
    { key: 'IN_TRANSIT', label: 'Em transito' },
    { key: 'DELIVERED', label: 'Entregue' },
  ];
  const stepIdx = meta.step;
  const progress = Math.max(0, Math.min(stepIdx, steps.length - 1)) / (steps.length - 1);

  return (
    <div className={cn(donorCardClass, 'flex flex-col gap-5 p-7')}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Ultima doacao
        </span>
        <Link
          href={donation.href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          Detalhes
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div>
        <p className="text-xl font-extrabold leading-tight tracking-tight text-[var(--primary-deeper)] dark:text-white">
          {donation.itemLabel}
        </p>
        <p className="mt-1 text-[13px] text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.72)]">
          {donation.itemCount} {donation.itemCount === 1 ? 'item' : 'itens'} em {donation.point}
        </p>
      </div>

      <div className="relative px-1 pb-1 pt-2">
        <div
          className="absolute left-4 right-4 top-3.5 h-px bg-[rgba(0,51,60,0.08)] dark:bg-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute left-4 top-3.5 h-px bg-[linear-gradient(90deg,#006a62,#00a89a)] motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-[var(--ease-out)] motion-reduce:transition-none"
          style={{ width: `calc((100% - 32px) * ${progress})` }}
          aria-hidden="true"
        />
        <ol
          className="grid list-none grid-cols-4 gap-0"
          aria-label={`Status da ultima doacao: ${meta.label}`}
        >
          {steps.map((step, index) => {
            const done = index <= stepIdx;
            const active = index === stepIdx;

            return (
              <li key={step.key} className="flex flex-col items-center gap-2">
                <span
                  className={cn(
                    'relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2 motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-[var(--ease-out)] motion-reduce:transition-none',
                    done
                      ? 'border-primary bg-primary text-white'
                      : 'border-[rgba(0,51,60,0.15)] bg-white text-[rgba(0,51,60,0.4)] dark:border-white/20 dark:bg-[var(--primary-deeper)] dark:text-white/50',
                    active && 'shadow-[0_0_0_6px_rgba(0,106,98,0.12)]',
                  )}
                  aria-hidden="true"
                >
                  {done ? <Check size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span
                  className={cn(
                    'text-center text-[11px]',
                    done
                      ? 'font-bold text-[var(--primary-deeper)] dark:text-white'
                      : 'font-medium text-[rgba(0,51,60,0.5)] dark:text-[rgba(178,232,227,0.62)]',
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[rgba(0,51,60,0.06)] pt-4 dark:border-[rgba(178,232,227,0.12)]">
        <span className="rounded-full bg-primary-light px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          {meta.label}
        </span>
        <span className="text-[13px] text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.72)]">
          atualizado {formatDateShort(donation.date)}
        </span>
      </div>
    </div>
  );
}

function OnboardingCard({ firstName }: { firstName: string }) {
  const steps = [
    {
      number: 1,
      label: 'Encontrar ponto',
      description: 'Veja parceiros proximos no mapa.',
      icon: MapPin,
    },
    {
      number: 2,
      label: 'Separar pecas',
      description: 'Roupas em bom estado, limpas e dobradas.',
      icon: Package,
    },
    {
      number: 3,
      label: 'Registrar doacao',
      description: 'Cadastre na plataforma para rastrear.',
      icon: Plus,
    },
  ];

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-[linear-gradient(155deg,#00333c_0%,#005c54_100%)] p-8 text-white shadow-[0_18px_40px_-20px_rgba(0,51,60,0.45)]">
      <svg
        aria-hidden="true"
        className="absolute -right-5 -top-3 h-52 w-52 opacity-20"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="80" stroke="#b2e8e3" strokeWidth="1" fill="none" strokeDasharray="3 4" />
        <circle cx="100" cy="100" r="50" stroke="#e8a33d" strokeWidth="1" fill="none" strokeDasharray="2 3" />
      </svg>

      <div className="relative">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber">
          Comece por aqui
        </span>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight">
          Sua primeira doacao em 3 passos
        </h2>
        <p className="mt-2 text-sm leading-6 text-[rgba(178,232,227,0.82)]">
          Ola, {firstName}. A jornada comeca com uma peca registrada e um ponto parceiro real.
        </p>
      </div>

      <ol className="relative flex list-none flex-col gap-3">
        {steps.map(({ number, label, description, icon: Icon }) => (
          <li
            key={number}
            className="flex items-start gap-3 rounded-2xl border border-[rgba(178,232,227,0.1)] bg-white/5 px-4 py-3"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber text-sm font-extrabold text-[#3d2b00]"
              aria-hidden="true"
            >
              {number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Icon size={15} aria-hidden="true" />
                {label}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-[rgba(178,232,227,0.72)]">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <Link
        href="/mapa"
        className="relative inline-flex items-center justify-center gap-2 rounded-full bg-amber px-5 py-3 text-sm font-bold text-[#3d2b00]"
      >
        Ver pontos proximos
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function DonorDashboardHero({
  data,
  donationsLoading,
  donationsError,
  onRetryDonations,
}: {
  data: DonorDashboardData;
  donationsLoading: boolean;
  donationsError: string | null;
  onRetryDonations: () => void;
}) {
  const levelProgress = getImpactLevelProgress(data.userStats.points);
  const isNew = data.userStats.totalDonations === 0;

  return (
    <header className="relative overflow-hidden bg-[linear-gradient(180deg,var(--cream-soft)_0%,var(--cream-soft)_70%,#fff_100%)] px-5 py-10 sm:px-8 sm:py-12 min-[1025px]:px-12 dark:bg-[linear-gradient(180deg,var(--cream-soft)_0%,var(--cream-soft)_70%,var(--surface)_100%)]">
      <svg
        aria-hidden="true"
        className="absolute right-[-40px] top-20 h-80 w-80 opacity-50"
        viewBox="0 0 320 320"
      >
        <defs>
          <pattern id="donorDashDots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(0,106,98,0.15)" />
          </pattern>
        </defs>
        <rect width="320" height="320" fill="url(#donorDashDots)" />
      </svg>

      <div className="relative mx-auto grid max-w-shell grid-cols-1 items-stretch gap-8 min-[1025px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] min-[1025px]:gap-14">
        <div className="flex min-w-0 flex-col gap-8">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Painel do doador
            </p>
            <h1 className="text-[clamp(2.25rem,4vw,3.25rem)] font-extrabold leading-none tracking-tight text-[var(--primary-deeper)] dark:text-white">
              Ola, {data.firstName}.
            </h1>
            <p className="mt-3 max-w-xl text-[17px] leading-7 text-[rgba(0,51,60,0.65)] dark:text-[rgba(178,232,227,0.72)]">
              {isNew
                ? 'Sua jornada solidaria comeca com a primeira peca registrada. Veja por onde comecar ao lado.'
                : 'Voce esta construindo impacto continuo. Proximo passo: registrar mais uma doacao ou explorar parceiros proximos.'}
            </p>
          </div>

          <div className={cn(donorCardClass, 'flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-7')}>
            <LevelCrest
              levelIdx={levelProgress.current.idx}
              levelName={levelProgress.current.name}
              progressPct={levelProgress.pct}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgba(0,51,60,0.5)] dark:text-[rgba(178,232,227,0.7)]">
                Seu nivel atual
              </p>
              <p className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-[var(--primary-deeper)] dark:text-white">
                {levelProgress.current.name}
              </p>
              <p className="mt-1 text-[13px] text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
                <strong className="font-bold text-[var(--primary-deeper)] tabular-nums dark:text-white">
                  {data.userStats.points.toLocaleString('pt-BR')}
                </strong>{' '}
                pontos solidarios acumulados
              </p>
              {levelProgress.next ? (
                <ProgressBar
                  className="mt-4"
                  pct={levelProgress.pct}
                  label={`Proximo: ${levelProgress.next.name}`}
                  hint={`+${levelProgress.pointsToNext} pts`}
                />
              ) : (
                <p className="mt-4 text-sm font-semibold text-primary">Nivel maximo alcancado.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/doar"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-deeper)] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(0,51,60,0.4)] transition-colors hover:bg-primary-dark"
            >
              <Plus size={16} aria-hidden="true" />
              Registrar nova doacao
            </Link>
            <Link
              href="/mapa"
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-5 py-3.5 text-sm font-semibold text-[var(--primary-deeper)] transition-colors hover:border-primary/40 dark:bg-white/10 dark:text-white"
            >
              <MapPin size={16} aria-hidden="true" />
              Encontrar pontos
            </Link>
          </div>

          <ImpactPills stats={data.userStats} />
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          {donationsLoading ? (
            <LoadingPanel label="Carregando sua jornada solidaria..." />
          ) : donationsError ? (
            <ErrorPanel
              title="Doacoes indisponiveis agora"
              message={donationsError}
              onRetry={onRetryDonations}
            />
          ) : isNew ? (
            <OnboardingCard firstName={data.firstName} />
          ) : (
            <LastDonationTracker donation={data.donations[0]} />
          )}
        </div>
      </div>
    </header>
  );
}
