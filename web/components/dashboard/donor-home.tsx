import type {
  CollectionPoint,
  DonationRecord,
  DonorAchievement,
  DonorGamificationResponse,
} from '@/lib/api';
import {
  buildImpactSnapshot,
  DONOR_LEVELS,
  getDonorLevel,
} from '@/lib/gamification';
import { DonorDashboardHero, type DonorDashboardLevel } from './donor/donor-dashboard-hero';
import type { DonorImpactStats } from './donor/impact-pills';
import { QuickActions } from './donor/quick-actions';
import { SectionHeader } from './donor/section-header';
import { RecentActivity } from './donor/recent-activity';
import { AchievementsStrip } from './donor/achievements-strip';
import { NearbyPoints } from './donor/nearby-points';
import {
  MonthlyRanking,
  type MonthlyRankingData,
} from './donor/monthly-ranking';

type DonorHomeProps = {
  firstName: string;
  donations: DonationRecord[];
  nearbyPoints: CollectionPoint[];
  gamification?: DonorGamificationResponse | null;
  monthlyRanking?: MonthlyRankingData | null;
};

function pickGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function deriveLevel(
  points: number,
  gamification: DonorGamificationResponse | null | undefined,
): DonorDashboardLevel {
  const totalLevels = gamification?.level.totalLevels ?? DONOR_LEVELS.length;

  if (gamification) {
    const { level } = gamification;
    const nextIdx = level.currentLevel; // currentLevel is 1-based, next is at index `currentLevel`.
    const nextLevel = DONOR_LEVELS[nextIdx] ?? null;
    return {
      current: level.currentLevel,
      total: totalLevels,
      name: level.name,
      progressPct: level.progress,
      pointsToNext: level.pointsToNextLevel,
      isMax: level.nextThreshold == null,
      nextLevelName: nextLevel?.name ?? null,
      lockedUntilFirstDonation: level.lockedUntilFirstDonation,
      effectivePoints: level.effectivePoints,
      unlockMessage: level.unlockMessage,
    };
  }

  const fallback = getDonorLevel(points);
  const fallbackIdx = DONOR_LEVELS.findIndex(
    (item) => item.minPoints === fallback.minPoints,
  );
  const fallbackCurrent = Math.max(1, fallbackIdx + 1);
  const range = fallback.nextThreshold ? fallback.nextThreshold - fallback.minPoints : 0;
  const into = points - fallback.minPoints;
  const pct = range > 0 ? Math.min(1, Math.max(0, into / range)) : 1;
  const next = fallback.nextThreshold ? DONOR_LEVELS[fallbackCurrent] ?? null : null;
  return {
    current: fallbackCurrent,
    total: totalLevels,
    name: fallback.name,
    progressPct: pct,
    pointsToNext: fallback.nextThreshold
      ? Math.max(0, fallback.nextThreshold - points)
      : 0,
    isMax: fallback.nextThreshold == null,
    nextLevelName: next?.name ?? null,
    lockedUntilFirstDonation: false,
    effectivePoints: points,
    unlockMessage: null,
  };
}

function deriveImpactStats(
  donations: DonationRecord[],
  gamification: DonorGamificationResponse | null | undefined,
  fallbackStreak: number,
): DonorImpactStats {
  if (gamification) {
    return {
      totalDonations: gamification.summary.donationsCount,
      itemsDonated: gamification.summary.donatedItemsQuantity,
      partnersUsed: gamification.summary.usedCollectionPointsCount,
      streakMonths: gamification.summary.consecutiveActiveMonths,
    };
  }

  const totalDonations = donations.length;
  const itemsDonated = donations.reduce((sum, d) => {
    const fromItems = d.items.reduce((acc, item) => acc + item.quantity, 0);
    return sum + (fromItems > 0 ? fromItems : d.itemCount);
  }, 0);
  const partnersUsed = new Set(
    donations.map((d) => d.dropOffPoint?.id).filter((id): id is string => Boolean(id)),
  ).size;
  return {
    totalDonations,
    itemsDonated,
    partnersUsed,
    streakMonths: fallbackStreak,
  };
}

export function DonorHome({
  firstName,
  donations,
  nearbyPoints,
  gamification = null,
  monthlyRanking = null,
}: DonorHomeProps) {
  const snapshot = buildImpactSnapshot(donations);
  const points = gamification?.points ?? snapshot.points;
  const level = deriveLevel(points, gamification);
  const stats = deriveImpactStats(donations, gamification, snapshot.streak.value);
  const greeting = pickGreeting();
  const latestDonation = donations[0] ?? null;
  const achievements: DonorAchievement[] = gamification?.achievements ?? [];
  const visibleAchievements = achievements.filter(
    (achievement) => achievement.unlocked || !achievement.hidden,
  );

  return (
    <div className="vg-page-bg vg-dark-fix flex min-h-[100vh] flex-col">
      <DonorDashboardHero
        firstName={firstName}
        greeting={greeting}
        points={points}
        level={level}
        stats={stats}
        latestDonation={latestDonation}
      />

      <main className="mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-12">
        <section className="py-10" aria-labelledby="donor-quick-actions">
          <SectionHeader
            kicker="Atalhos"
            title="O que você quer fazer hoje?"
          />
          <QuickActions />
        </section>

        <section
          className="grid gap-10 pb-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
          aria-labelledby="donor-activity-and-partners"
        >
          <div className="flex min-w-0 flex-col gap-10">
            <div>
              <SectionHeader
                kicker="Sua linha solidária"
                title="Doações recentes"
                action={
                  donations.length > 0
                    ? { label: 'Ver tudo', href: '/rastreio' }
                    : null
                }
              />
              <div
                className="vg-card rounded-3xl"
                style={{
                  padding: donations.length === 0 ? 8 : '8px 8px 8px 0',
                }}
              >
                <RecentActivity donations={donations} />
              </div>
            </div>

            <div>
              <SectionHeader
                kicker="Conquistas"
                title="Marcos da sua jornada"
                action={
                  visibleAchievements.some((achievement) => achievement.unlocked)
                    ? { label: 'Ver perfil', href: '/perfil' }
                    : null
                }
              />
              <AchievementsStrip items={achievements} />
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-10">
            <div>
              <SectionHeader
                kicker="Pontos próximos"
                title="Onde doar perto de você"
                action={
                  nearbyPoints.length > 0
                    ? { label: 'Abrir mapa', href: '/mapa' }
                    : null
                }
              />
              <NearbyPoints points={nearbyPoints} />
            </div>

            {monthlyRanking && (
              <div>
                <SectionHeader
                  kicker="Comunidade"
                  title="Sua posição este mês"
                />
                <MonthlyRanking data={monthlyRanking} />
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
