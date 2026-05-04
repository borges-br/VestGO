import Link from 'next/link';
import {
  ArrowRight,
  Award,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  MapPin,
  Package,
  Star,
} from 'lucide-react';
import {
  ErrorPanel,
  LoadingPanel,
  SectionHeader,
  StatusPill,
  donorCardClass,
} from '@/components/donor-dashboard/shared';
import type {
  DashboardAchievement,
  DashboardDonation,
  DashboardPoint,
  DonorDashboardData,
} from '@/components/donor-dashboard/types';
import { cn } from '@/lib/utils';

function QuickActions() {
  const actions = [
    {
      label: 'Como doar',
      description: 'Passo a passo da doacao',
      href: '/doar',
      icon: ClipboardList,
    },
    {
      label: 'Explorar pontos',
      description: 'Mapa com parceiros proximos',
      href: '/mapa',
      icon: MapPin,
    },
    {
      label: 'Minhas doacoes',
      description: 'Historico e rastreio',
      href: '/rastreio',
      icon: Package,
    },
    {
      label: 'Suporte',
      description: 'Tire duvidas com a equipe',
      href: '/suporte',
      icon: CircleHelp,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 min-[1100px]:grid-cols-4">
      {actions.map(({ label, description, href, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className={cn(
            donorCardClass,
            'flex min-h-36 flex-col gap-3 p-5 motion-safe:transition-all motion-safe:duration-200 hover:border-primary/25 hover:shadow-[0_14px_30px_-18px_rgba(0,51,60,0.2)] min-[1100px]:hover:-translate-y-0.5',
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
            <Icon size={20} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight text-[var(--primary-deeper)] dark:text-white">
              {label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
              {description}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function RecentActivity({
  donations,
}: {
  donations: DashboardDonation[];
}) {
  if (donations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[rgba(0,51,60,0.12)] bg-cream-soft px-7 py-8 text-center dark:border-[rgba(178,232,227,0.16)] dark:bg-white/5">
        <p className="text-sm font-bold text-[var(--primary-deeper)] dark:text-white">
          Sua linha solidaria aparece aqui.
        </p>
        <p className="mt-2 text-[13px] leading-6 text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
          Cada doacao registrada vira um marco com pontos, status e destino real.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative list-none">
      <span
        className="absolute bottom-3 left-[17px] top-3 w-px bg-[linear-gradient(180deg,rgba(0,106,98,0.25),rgba(0,106,98,0.05))]"
        aria-hidden="true"
      />
      {donations.slice(0, 5).map((donation, index) => (
        <li
          key={donation.id}
          className={cn(
            'relative py-3 pl-12 pr-3',
            index < Math.min(donations.length, 5) - 1 &&
              'border-b border-[rgba(0,51,60,0.05)] dark:border-[rgba(178,232,227,0.08)]',
          )}
        >
          <span
            className="absolute left-[11px] top-5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-white shadow-[0_0_0_4px_rgba(0,106,98,0.08)] dark:bg-[var(--primary-deeper)]"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={donation.href}
                className="block truncate text-sm font-bold tracking-tight text-[var(--primary-deeper)] hover:text-primary dark:text-white"
              >
                {donation.itemLabel}
              </Link>
              <p className="mt-1 text-xs text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
                {donation.point} - {donation.source.createdAt ? new Date(donation.source.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill status={donation.status} />
                <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-primary">
                  +{donation.pointsAwarded} pts
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
          </div>
        </li>
      ))}
    </ol>
  );
}

function NearbyPoints({
  points,
  locationLabel,
  locationNotice,
}: {
  points: DashboardPoint[];
  locationLabel: string;
  locationNotice: string | null;
}) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[rgba(0,51,60,0.12)] bg-cream-soft p-6 dark:border-[rgba(178,232,227,0.16)] dark:bg-white/5">
        <p className="text-sm font-semibold text-[var(--primary-deeper)] dark:text-white">
          Nenhum ponto verificado por aqui ainda.
        </p>
        <p className="mt-2 text-sm leading-6 text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
          Referencia atual: {locationLabel}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {locationNotice && (
        <p className="rounded-2xl bg-amber-muted/40 px-4 py-3 text-xs font-semibold text-amber-deep dark:bg-white/5 dark:text-amber">
          {locationNotice}
        </p>
      )}
      <ul className="flex list-none flex-col gap-3">
        {points.slice(0, 3).map((point) => (
          <li key={point.id}>
            <Link
              href={point.href}
              className={cn(
                donorCardClass,
                'flex gap-3 p-4 motion-safe:transition-all motion-safe:duration-200 hover:border-primary/25 min-[1100px]:hover:-translate-y-0.5',
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <MapPin size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold tracking-tight text-[var(--primary-deeper)] dark:text-white">
                    {point.name}
                  </span>
                  {point.distanceKm != null && (
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.04em] text-primary">
                      {point.distanceKm} km
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
                  {point.address}
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {point.categories.slice(0, 3).map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[rgba(0,51,60,0.6)] dark:bg-white/10 dark:text-[rgba(178,232,227,0.76)]"
                    >
                      {category}
                    </span>
                  ))}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniMedal({ achievement }: { achievement: DashboardAchievement }) {
  return (
    <span
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2',
        achievement.earned
          ? 'border-[#c9a54a] bg-[radial-gradient(circle_at_30%_28%,#f3e3ac,#c9a54a)] text-[#3d2b00] shadow-[inset_0_-3px_6px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.08)]'
          : 'border-[#c2c8cf] bg-[radial-gradient(circle_at_30%_28%,#eef0f2,#c2c8cf)] text-[#7a8088] opacity-70',
      )}
      aria-label={`${achievement.label}: ${achievement.earned ? 'conquista liberada' : 'em progresso'}`}
    >
      <Star size={20} aria-hidden="true" />
    </span>
  );
}

function AchievementsStrip({ items }: { items: DashboardAchievement[] }) {
  if (items.length === 0) {
    return (
      <div className={cn(donorCardClass, 'flex items-center gap-4 border-dashed p-5')}>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#c2c8cf] bg-[#eef0f2] text-[#7a8088]"
          aria-label="Conquistas em progresso"
        >
          <Star size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--primary-deeper)] dark:text-white">
            Suas conquistas comecam na primeira doacao.
          </p>
          <p className="mt-1 text-xs text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
            Cada marco vira uma medalha permanente no perfil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid list-none gap-3 sm:grid-cols-2">
      {items.slice(0, 4).map((achievement) => (
        <li
          key={achievement.id}
          className={cn(
            donorCardClass,
            'flex items-center gap-3 p-4',
            !achievement.earned && 'border-dashed bg-cream-soft dark:bg-white/5',
          )}
        >
          <MiniMedal achievement={achievement} />
          <div className="min-w-0">
            <p
              className={cn(
                'text-[13px] font-bold leading-tight tracking-tight',
                achievement.earned
                  ? 'text-[var(--primary-deeper)] dark:text-white'
                  : 'text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]',
              )}
            >
              {achievement.label}
            </p>
            <p className="mt-1 text-[11px] text-[rgba(0,51,60,0.5)] dark:text-[rgba(178,232,227,0.64)]">
              {achievement.earned
                ? `Liberada - ${achievement.earnedAt ?? 'registrada'}`
                : achievement.progress ?? 'Em progresso'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MonthlyRanking({
  monthlyGoal,
}: {
  monthlyGoal: DonorDashboardData['userStats']['monthlyGoal'];
}) {
  return (
    <div className="rounded-[18px] border border-[rgba(0,51,60,0.06)] bg-cream-soft px-5 py-5 dark:border-[rgba(178,232,227,0.12)] dark:bg-white/5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.7)]">
          Ranking do mes
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-primary dark:bg-white/10">
          EM BREVE
        </span>
      </div>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-3xl font-extrabold leading-none tracking-tight text-[var(--primary-deeper)] dark:text-white">
            EM BREVE
          </p>
          <p className="mt-2 text-xs text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.72)]">
            Backend de ranking mensal ainda pendente.
          </p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-[13px] font-bold text-primary tabular-nums">
            {monthlyGoal.current}/{monthlyGoal.target}
          </p>
          <p className="mt-1 text-[11px] text-[rgba(0,51,60,0.5)] dark:text-[rgba(178,232,227,0.64)]">
            doacoes no mes
          </p>
        </div>
      </div>
    </div>
  );
}

export function DonorDashboardSections({
  data,
  donationsLoading,
  donationsError,
  pointsLoading,
  pointsError,
  locationLabel,
  locationNotice,
  onRetryDonations,
  onRetryPoints,
}: {
  data: DonorDashboardData;
  donationsLoading: boolean;
  donationsError: string | null;
  pointsLoading: boolean;
  pointsError: string | null;
  locationLabel: string;
  locationNotice: string | null;
  onRetryDonations: () => void;
  onRetryPoints: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-shell px-5 pb-12 sm:px-8 min-[1025px]:px-12">
      <section className="py-8">
        <SectionHeader kicker="Atalhos" title="O que voce quer fazer hoje?" />
        <QuickActions />
      </section>

      <section className="grid grid-cols-1 gap-8 py-8 min-[1025px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] min-[1025px]:gap-10">
        <div className="min-w-0 space-y-8">
          <div>
            <SectionHeader
              kicker="Sua linha solidaria"
              title="Doacoes recentes"
              action={data.donations.length > 0 ? 'Ver tudo' : null}
              href="/rastreio"
            />
            {donationsLoading ? (
              <LoadingPanel label="Carregando doacoes..." />
            ) : donationsError ? (
              <ErrorPanel
                title="Nao foi possivel carregar doacoes"
                message={donationsError}
                onRetry={onRetryDonations}
              />
            ) : (
              <div className={cn(donorCardClass, data.donations.length === 0 ? 'p-2' : 'py-2 pl-0 pr-2')}>
                <RecentActivity donations={data.donations} />
              </div>
            )}
          </div>

          <div>
            <SectionHeader
              kicker="Conquistas"
              title="Marcos da sua jornada"
              action={data.userStats.achievements.some((item) => item.earned) ? 'Ver perfil' : null}
              href="/perfil"
            />
            <AchievementsStrip items={data.userStats.achievements} />
          </div>
        </div>

        <aside className="min-w-0 space-y-8">
          <div>
            <SectionHeader kicker="Pontos proximos" title="Onde doar perto de voce" action="Abrir mapa" href="/mapa" />
            {pointsLoading ? (
              <LoadingPanel label="Buscando pontos proximos..." />
            ) : pointsError ? (
              <ErrorPanel
                title="Pontos proximos indisponiveis"
                message={pointsError}
                onRetry={onRetryPoints}
              />
            ) : (
              <NearbyPoints
                points={data.nearbyPoints}
                locationLabel={locationLabel}
                locationNotice={locationNotice}
              />
            )}
          </div>

          <div>
            <SectionHeader kicker="Comunidade" title="Sua posicao este mes" />
            <MonthlyRanking monthlyGoal={data.userStats.monthlyGoal} />
          </div>

          <div className={cn(donorCardClass, 'p-5')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Proximo gesto
                </p>
                <p className="mt-2 text-lg font-extrabold tracking-tight text-[var(--primary-deeper)] dark:text-white">
                  Registre uma nova doacao
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(0,51,60,0.55)] dark:text-[rgba(178,232,227,0.72)]">
                  O wizard conecta suas pecas a um ponto parceiro e atualiza pontos automaticamente.
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <Award size={18} aria-hidden="true" />
              </span>
            </div>
            <Link href="/doar" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
              Comecar agora
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
