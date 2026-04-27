import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarHeart,
  ChevronRight,
  Flame,
  HeartHandshake,
  MapPin,
  Package,
  Plus,
  Sparkles,
  Target,
  Truck,
  TrendingUp,
} from 'lucide-react';
import type { CollectionPoint, DonationRecord, DonationStatus } from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';
import { buildImpactSnapshot, type DonorLevel } from '@/lib/gamification';
import { cn } from '@/lib/utils';

/** Map DonorLevel color token → Tailwind utility classes for the chip and progress bar */
const LEVEL_CHIP_STYLES: Record<DonorLevel['color'], { bg: string; text: string; ring: string; bar: string }> = {
  gray:    { bg: 'bg-gray-100',       text: 'text-gray-600',       ring: 'ring-gray-200',    bar: 'bg-gray-300' },
  primary: { bg: 'bg-primary-light',  text: 'text-primary-deeper', ring: 'ring-primary/20',  bar: 'bg-primary-muted' },
  emerald: { bg: 'bg-emerald-50',     text: 'text-emerald-700',    ring: 'ring-emerald-200', bar: 'bg-emerald-300' },
  amber:   { bg: 'bg-amber-50',       text: 'text-amber-700',      ring: 'ring-amber-200',   bar: 'bg-amber-300' },
  indigo:  { bg: 'bg-indigo-50',      text: 'text-indigo-700',     ring: 'ring-indigo-200',  bar: 'bg-indigo-300' },
  violet:  { bg: 'bg-violet-50',      text: 'text-violet-700',     ring: 'ring-violet-200',  bar: 'bg-violet-300' },
  rose:    { bg: 'bg-rose-50',        text: 'text-rose-700',       ring: 'ring-rose-200',    bar: 'bg-rose-300' },
};

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

const STATUS_META: Record<
  DonationStatus,
  { label: string; tone: string; stepIndex: number; accent: string }
> = {
  PENDING: {
    label: 'Pendente',
    tone: 'bg-amber-50 text-amber-700',
    stepIndex: 0,
    accent: 'from-amber-400/60 to-amber-500/0',
  },
  AT_POINT: {
    label: 'No ponto',
    tone: 'bg-blue-50 text-blue-700',
    stepIndex: 1,
    accent: 'from-blue-400/60 to-blue-500/0',
  },
  IN_TRANSIT: {
    label: 'Em trânsito',
    tone: 'bg-indigo-50 text-indigo-700',
    stepIndex: 2,
    accent: 'from-indigo-400/60 to-indigo-500/0',
  },
  DELIVERED: {
    label: 'Entregue',
    tone: 'bg-primary-light text-primary-deeper',
    stepIndex: 3,
    accent: 'from-primary/70 to-primary/0',
  },
  DISTRIBUTED: {
    label: 'Distribuída',
    tone: 'bg-emerald-50 text-emerald-700',
    stepIndex: 3,
    accent: 'from-emerald-400/70 to-emerald-500/0',
  },
  CANCELLED: {
    label: 'Cancelada',
    tone: 'bg-red-50 text-red-500',
    stepIndex: 0,
    accent: 'from-red-400/30 to-red-500/0',
  },
};

function formatShortDate(input: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(input));
}

function countParticipatingMonths(donations: DonationRecord[]) {
  const months = new Set(
    donations.map((d) => {
      const date = new Date(d.createdAt);
      return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    }),
  );
  return months.size;
}

function computeRingGeometry(current: number, target: number) {
  const safeTarget = Math.max(target, 1);
  const pct = Math.max(0, Math.min(1, current / safeTarget));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  return {
    pct,
    radius,
    circumference,
    dashOffset: circumference * (1 - pct),
  };
}

type DonorHomeProps = {
  firstName: string;
  donations: DonationRecord[];
  nearbyPoints: CollectionPoint[];
};

export function DonorHome({ firstName, donations, nearbyPoints }: DonorHomeProps) {
  const snapshot = buildImpactSnapshot(donations);
  const latest = donations[0] ?? null;
  const latestStatus = latest ? STATUS_META[latest.status] : null;
  const monthsParticipating = countParticipatingMonths(donations);
  const monthlyRing = computeRingGeometry(snapshot.monthlyGoal.current, snapshot.monthlyGoal.target);
  const milestoneRing = computeRingGeometry(
    snapshot.nextMilestone.current,
    snapshot.nextMilestone.target,
  );
  const totalItems = donations.reduce((sum, d) => sum + d.itemCount, 0);
  const completed = donations.filter(
    (d) => d.status === 'DELIVERED' || d.status === 'DISTRIBUTED',
  ).length;
  const recent = donations.slice(0, 4);
  const journeySteps = [
    { key: 'registrada', label: 'Registrada', icon: Plus },
    { key: 'ponto', label: 'No ponto', icon: MapPin },
    { key: 'transito', label: 'Em trânsito', icon: Truck },
    { key: 'entregue', label: 'Entregue', icon: HeartHandshake },
  ];
  const currentStepIndex = latestStatus?.stepIndex ?? -1;

  return (
    <div className="relative overflow-hidden">
      {/* Ambient gradient wash — fluid, bleeds across the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(ellipse_at_20%_0%,rgba(33,211,196,0.14),transparent_60%),radial-gradient(ellipse_at_85%_10%,rgba(32,116,200,0.10),transparent_55%),linear-gradient(180deg,#f4faf8_0%,#ffffff_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[420px] -z-10 h-[560px] w-[1200px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(33,211,196,0.08),transparent_70%)]"
      />

      <div className="relative px-4 pt-8 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-shell flex-col gap-10">
          {/* ────────────────────────── HERO ────────────────────────── */}
          <section className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-deeper shadow-sm backdrop-blur">
                <Sparkles size={12} />
                Sua jornada solidária
              </span>

              <div>
                <p className="text-sm font-medium text-gray-500">
                  Olá,{' '}
                  <span className="font-semibold text-primary-deeper">{firstName}</span>
                </p>
                <h1 className="mt-2 text-5xl font-bold leading-[1.04] tracking-tight text-primary-deeper sm:text-6xl">
                  {snapshot.points.toLocaleString('pt-BR')}
                  <span className="ml-3 text-2xl font-semibold text-primary/70 sm:text-3xl">
                    pontos
                  </span>
                </h1>

                {/* Level chip + progress to next level */}
                {(() => {
                  const chip = LEVEL_CHIP_STYLES[snapshot.levelColor];
                  return (
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1',
                            chip.bg, chip.text, chip.ring,
                          )}
                        >
                          <TrendingUp size={11} />
                          {snapshot.levelName}
                        </span>
                        {snapshot.pointsToNextLevel > 0 && (
                          <span className="text-xs text-gray-400">
                            +{snapshot.pointsToNextLevel} pts para o próximo nível
                          </span>
                        )}
                      </div>
                      {snapshot.levelProgress < 1 && (
                        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn('h-full rounded-full transition-all duration-700', chip.bar)}
                            style={{ width: `${Math.round(snapshot.levelProgress * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Inline metric chips — flowing, not boxed */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <span className="inline-flex items-center gap-2 text-gray-700">
                  <Flame size={16} className="text-amber-500" />
                  <span className="font-semibold text-primary-deeper">
                    {snapshot.streak.value}
                  </span>
                  {snapshot.streak.value === 1
                    ? 'mês consecutivo'
                    : 'meses consecutivos'}
                </span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="inline-flex items-center gap-2 text-gray-700">
                  <CalendarHeart size={16} className="text-primary" />
                  <span className="font-semibold text-primary-deeper">
                    {monthsParticipating}
                  </span>
                  {monthsParticipating === 1 ? 'mês ativo' : 'meses ativos'}
                </span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="inline-flex items-center gap-2 text-gray-700">
                  <Package size={16} className="text-primary" />
                  <span className="font-semibold text-primary-deeper">{totalItems}</span>
                  {totalItems === 1 ? 'item doado' : 'itens doados'}
                </span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="inline-flex items-center gap-2 text-gray-700">
                  <HeartHandshake size={16} className="text-emerald-600" />
                  <span className="font-semibold text-primary-deeper">{completed}</span>
                  concluídas
                </span>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/doar"
                  className="group inline-flex items-center gap-2 rounded-full bg-primary-deeper px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
                >
                  <Plus size={16} />
                  Registrar nova doação
                  <ArrowUpRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
                <Link
                  href="/mapa"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-5 py-3 text-sm font-semibold text-primary-deeper transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <MapPin size={16} />
                  Encontrar pontos
                </Link>
              </div>
            </div>

            {/* Goal rings — fluid radial progress */}
            <div className="relative flex-shrink-0 lg:w-[340px]">
              <div className="relative rounded-[2.5rem] border border-white/60 bg-white/60 p-6 shadow-[0_12px_40px_-12px_rgba(15,63,78,0.18)] backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Metas do mês
                </p>

                <div className="mt-4 flex items-center gap-5">
                  <RadialGauge
                    pct={monthlyRing.pct}
                    radius={monthlyRing.radius}
                    circumference={monthlyRing.circumference}
                    offset={monthlyRing.dashOffset}
                    label={`${snapshot.monthlyGoal.current}/${snapshot.monthlyGoal.target}`}
                    color="primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary-deeper">
                      Meta mensal
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {snapshot.monthlyGoal.current >= snapshot.monthlyGoal.target
                        ? 'Meta do mês alcançada. Você segue construindo a rede.'
                        : `Faltam ${snapshot.monthlyGoal.target - snapshot.monthlyGoal.current} doações para fechar o mês.`}
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

                <div className="mt-5 flex items-center gap-5">
                  <RadialGauge
                    pct={milestoneRing.pct}
                    radius={milestoneRing.radius}
                    circumference={milestoneRing.circumference}
                    offset={milestoneRing.dashOffset}
                    label={`${Math.round(milestoneRing.pct * 100)}%`}
                    color="emerald"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary-deeper">
                      {snapshot.nextMilestone.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {snapshot.nextMilestone.note}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ───────────────────── PROGRESS RIVER ───────────────────── */}
          <section aria-labelledby="journey-heading" className="relative">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Última doação
                </p>
                <h2
                  id="journey-heading"
                  className="mt-1 text-2xl font-bold text-primary-deeper"
                >
                  {latest ? latest.itemLabel : 'Sua próxima jornada começa aqui'}
                </h2>
              </div>
              {latest && (
                <Link
                  href={`/rastreio/${latest.id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-deeper"
                >
                  Detalhes
                  <ChevronRight size={14} />
                </Link>
              )}
            </div>

            <div className="mt-5 overflow-hidden rounded-[2rem] border border-primary/10 bg-white/80 p-6 backdrop-blur-sm lg:p-7">
              {latest ? (
                <>
                  {/* Flowing connector with step nodes */}
                  <div className="relative">
                    <div className="absolute left-5 right-5 top-5 h-[2px] bg-gradient-to-r from-primary/20 via-primary/10 to-transparent sm:left-7 sm:right-7" />
                    <div
                      className="absolute left-5 top-5 h-[2px] bg-primary transition-all duration-700 sm:left-7"
                      style={{
                        width: `calc((100% - 3rem) * ${
                          currentStepIndex < 0
                            ? 0
                            : Math.min(currentStepIndex, journeySteps.length - 1) /
                              (journeySteps.length - 1)
                        })`,
                      }}
                    />
                    <ol className="relative grid grid-cols-4 gap-2">
                      {journeySteps.map((step, idx) => {
                        const done = idx <= currentStepIndex;
                        const active = idx === currentStepIndex;
                        const Icon = step.icon;
                        return (
                          <li
                            key={step.key}
                            className="flex flex-col items-center text-center"
                          >
                            <div
                              className={cn(
                                'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                                done
                                  ? 'border-primary bg-primary text-white shadow-md shadow-primary/30'
                                  : 'border-primary/20 bg-white text-gray-400',
                                active && 'ring-4 ring-primary/20',
                              )}
                            >
                              <Icon size={14} />
                            </div>
                            <p
                              className={cn(
                                'mt-3 text-xs font-semibold',
                                done ? 'text-primary-deeper' : 'text-gray-400',
                              )}
                            >
                              {step.label}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-5">
                    <div>
                      <p className="text-sm text-gray-500">
                        Destino:{' '}
                        <span className="font-semibold text-primary-deeper">
                          {latest.dropOffPoint?.organizationName ??
                            latest.dropOffPoint?.name ??
                            'Em definição'}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Atualizado em {formatShortDate(latest.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          latestStatus?.tone,
                        )}
                      >
                        {latestStatus?.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-deeper">
                        <Sparkles size={11} />+{latest.pointsAwarded} pts
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
                    <HeartHandshake size={22} />
                  </div>
                  <p className="max-w-md text-sm leading-6 text-gray-600">
                    Você ainda não registrou uma doação. Assim que a primeira entrega for
                    feita, sua jornada começa a crescer aqui.
                  </p>
                  <Link
                    href="/doar"
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-deeper px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                  >
                    <Plus size={14} />
                    Começar agora
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* ─────────────────── NEARBY + RECENT ─────────────────── */}
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            {/* Nearby points */}
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                    Pontos próximos
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-primary-deeper">
                    Onde você pode doar
                  </h2>
                </div>
                <Link
                  href="/mapa"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-deeper"
                >
                  Ver mapa
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {nearbyPoints.length > 0 ? (
                  nearbyPoints.map((point) => (
                    <Link
                      key={point.id}
                      href={`/mapa/${point.id}`}
                      className="group flex items-start gap-4 rounded-2xl bg-white/70 p-4 transition-all hover:bg-white hover:shadow-md hover:shadow-primary/5"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                        <MapPin size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-primary-deeper">
                            {point.organizationName ?? point.name}
                          </p>
                          {point.distanceKm != null && (
                            <span className="flex-shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-deeper">
                              {point.distanceKm} km
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {formatAddressSummary(point) ?? 'Endereço não informado'}
                        </p>
                        {point.acceptedCategories.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {point.acceptedCategories.slice(0, 3).map((cat) => (
                              <span
                                key={cat}
                                className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600"
                              >
                                {CATEGORY_LABELS[cat] ?? cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        size={16}
                        className="mt-4 flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white/70 p-6 text-center">
                    <p className="text-sm font-semibold text-primary-deeper">
                      Nenhum ponto próximo encontrado ainda.
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Assim que um parceiro verificado publicar o perfil na sua região, ele
                      aparece aqui.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent donations — timeline */}
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                    Histórico
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-primary-deeper">
                    Solidariedade recente
                  </h2>
                </div>
                <Link
                  href="/rastreio"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-deeper"
                >
                  Ver tudo
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="relative mt-5">
                {recent.length > 0 ? (
                  <ol className="relative space-y-4">
                    <div
                      aria-hidden
                      className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/30 via-primary/15 to-transparent"
                    />
                    {recent.map((donation) => {
                      const meta = STATUS_META[donation.status];
                      return (
                        <li key={donation.id} className="relative">
                          <Link
                            href={`/rastreio/${donation.id}`}
                            className="group flex items-start gap-4 rounded-2xl p-3 transition-colors hover:bg-white/70"
                          >
                            <div
                              className={cn(
                                'relative z-[1] flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm',
                              )}
                            >
                              <Package size={13} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-primary-deeper">
                                  {donation.itemLabel}
                                </p>
                                <span className="flex-shrink-0 text-[11px] text-gray-400">
                                  {formatShortDate(donation.createdAt)}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {donation.dropOffPoint?.organizationName ??
                                  donation.dropOffPoint?.name ??
                                  'Destino em definição'}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                    meta.tone,
                                  )}
                                >
                                  {meta.label}
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                                  +{donation.pointsAwarded} pts
                                </span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="rounded-2xl bg-white/70 p-6 text-center">
                    <p className="text-sm font-semibold text-primary-deeper">
                      Seu histórico aparece aqui.
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Cada doação registrada vira um ponto na sua linha solidária.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ─────────────────────── BADGES ─────────────────────── */}
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Conquistas
                </p>
                <h2 className="mt-1 text-2xl font-bold text-primary-deeper">
                  Sua coleção solidária
                </h2>
              </div>
              <Link
                href="/perfil"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-deeper"
              >
                Abrir perfil
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {snapshot.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={cn(
                    'relative overflow-hidden rounded-2xl border p-4 transition-all',
                    badge.earned
                      ? 'border-primary/20 bg-white shadow-sm'
                      : 'border-dashed border-gray-200 bg-white/50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                        badge.earned
                          ? 'bg-primary-light text-primary-deeper'
                          : 'bg-gray-100 text-gray-400',
                      )}
                    >
                      <Target size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-sm font-semibold',
                          badge.earned ? 'text-primary-deeper' : 'text-gray-500',
                        )}
                      >
                        {badge.label}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">
                        {badge.earned
                          ? 'Conquistado'
                          : (badge.progressLabel ?? 'Em progresso')}
                      </p>
                    </div>
                  </div>
                  {badge.earned && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RadialGauge({
  pct,
  radius,
  circumference,
  offset,
  label,
  color,
}: {
  pct: number;
  radius: number;
  circumference: number;
  offset: number;
  label: string;
  color: 'primary' | 'emerald';
}) {
  const stroke = color === 'primary' ? '#0f3f4e' : '#059669';
  const track = color === 'primary' ? 'rgba(33,211,196,0.18)' : 'rgba(16,185,129,0.18)';
  const size = (radius + 8) * 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-primary-deeper">{label}</span>
      </div>
      <span className="sr-only">{Math.round(pct * 100)}%</span>
    </div>
  );
}
