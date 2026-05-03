import type { DonationRecord, MyProfile, TwoFactorStatus } from '@/lib/api';

export type AchievementTier = 'BRONZE' | 'PRATA' | 'OURO' | 'DIAMANTE' | 'RUBY';

export type AchievementId =
  | 'recurring-donation'
  | 'streak'
  | 'solidarity-delivery'
  | 'active-network'
  | 'monthly-hero'
  | 'complete-profile'
  | 'diversity'
  | 'seasonal-spirit'
  | 'abundance'
  | 'network-veteran';

export type AchievementLevel = {
  tier: Exclude<AchievementTier, 'RUBY'>;
  targetLabel: string;
  targetValue?: number;
};

export type DonorAchievement = {
  id: AchievementId;
  name: string;
  description: string;
  howToEarn: string;
  metricLabel: string;
  progressValue: number | null;
  progressLabel: string;
  currentTier: Exclude<AchievementTier, 'RUBY'> | null;
  nextTier: Exclude<AchievementTier, 'RUBY'> | null;
  achievementPoints: number;
  unlocked: boolean;
  unavailable: boolean;
  unavailableReason?: string;
  levels: AchievementLevel[];
  hidden: boolean;
};

export const ACHIEVEMENT_TIER_POINTS: Record<AchievementTier, number> = {
  BRONZE: 20,
  PRATA: 40,
  OURO: 80,
  DIAMANTE: 160,
  RUBY: 400,
};

const CUMULATIVE_POINTS: Record<Exclude<AchievementTier, 'RUBY'>, number> = {
  BRONZE: ACHIEVEMENT_TIER_POINTS.BRONZE,
  PRATA: ACHIEVEMENT_TIER_POINTS.BRONZE + ACHIEVEMENT_TIER_POINTS.PRATA,
  OURO:
    ACHIEVEMENT_TIER_POINTS.BRONZE +
    ACHIEVEMENT_TIER_POINTS.PRATA +
    ACHIEVEMENT_TIER_POINTS.OURO,
  DIAMANTE:
    ACHIEVEMENT_TIER_POINTS.BRONZE +
    ACHIEVEMENT_TIER_POINTS.PRATA +
    ACHIEVEMENT_TIER_POINTS.OURO +
    ACHIEVEMENT_TIER_POINTS.DIAMANTE,
};

const ORDERED_TIERS: Array<Exclude<AchievementTier, 'RUBY'>> = [
  'BRONZE',
  'PRATA',
  'OURO',
  'DIAMANTE',
];

type BuildAchievementInput = {
  id: AchievementId;
  name: string;
  description: string;
  howToEarn: string;
  metricLabel: string;
  progressValue: number | null;
  progressLabel: string;
  levels: AchievementLevel[];
  unavailable?: boolean;
  unavailableReason?: string;
  hidden?: boolean;
};

export type BuildDonorAchievementsParams = {
  donations: DonationRecord[];
  profile: MyProfile | null;
  twoFactorStatus?: TwoFactorStatus | null;
};

function getMonthKey(input: string) {
  const date = new Date(input);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getConsecutiveDonationMonths(donations: DonationRecord[]) {
  if (donations.length === 0) return 0;

  const monthSet = new Set(donations.map((donation) => getMonthKey(donation.createdAt)));
  const ordered = [...donations].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const mostRecent = new Date(ordered[0].createdAt);
  const cursor = new Date(Date.UTC(mostRecent.getUTCFullYear(), mostRecent.getUTCMonth(), 1));
  let streak = 0;

  while (monthSet.has(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`)) {
    streak += 1;
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }

  return streak;
}

function getTotalQuantity(donations: DonationRecord[]) {
  return donations.reduce((sum, donation) => {
    const itemQuantity = donation.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    return sum + (itemQuantity > 0 ? itemQuantity : donation.itemCount);
  }, 0);
}

function getUniqueCategoryCount(donations: DonationRecord[]) {
  return new Set(
    donations.flatMap((donation) => donation.items.map((item) => item.category)).filter(Boolean),
  ).size;
}

function getDistributedCount(donations: DonationRecord[]) {
  return donations.filter(
    (donation) =>
      donation.status === 'DISTRIBUTED' ||
      donation.timeline.some((event) => event.status === 'DISTRIBUTED'),
  ).length;
}

function getUsedDropOffPointCount(donations: DonationRecord[]) {
  return new Set(donations.map((donation) => donation.dropOffPoint?.id).filter(Boolean)).size;
}

function getMonthsSince(input: string | null | undefined) {
  if (!input) return 0;

  const start = new Date(input);
  const now = new Date();
  const monthDiff =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth());

  return Math.max(0, monthDiff);
}

function getTierFromThresholds(
  value: number | null,
  levels: AchievementLevel[],
): Exclude<AchievementTier, 'RUBY'> | null {
  if (value == null) return null;

  return levels.reduce<Exclude<AchievementTier, 'RUBY'> | null>((current, level) => {
    if (typeof level.targetValue === 'number' && value >= level.targetValue) {
      return level.tier;
    }

    return current;
  }, null);
}

function getNextTier(
  currentTier: Exclude<AchievementTier, 'RUBY'> | null,
  levels: AchievementLevel[],
) {
  const unlockedIndex = currentTier ? ORDERED_TIERS.indexOf(currentTier) : -1;

  return levels.find((level) => ORDERED_TIERS.indexOf(level.tier) > unlockedIndex)?.tier ?? null;
}

function buildNumericAchievement(input: BuildAchievementInput): DonorAchievement {
  const currentTier = input.unavailable
    ? null
    : getTierFromThresholds(input.progressValue, input.levels);
  const nextTier = input.unavailable ? null : getNextTier(currentTier, input.levels);

  return {
    ...input,
    currentTier,
    nextTier,
    achievementPoints: currentTier ? CUMULATIVE_POINTS[currentTier] : 0,
    unlocked: Boolean(currentTier),
    unavailable: input.unavailable ?? false,
    hidden: input.hidden ?? false,
  };
}

function buildProfileAchievement(
  profile: MyProfile | null,
  twoFactorStatus: TwoFactorStatus | null | undefined,
): DonorAchievement {
  const hasAccountBasics = Boolean(profile?.createdAt && profile.name && profile.email);
  const registrationComplete = Boolean(
    profile?.profileCompletion && profile.profileCompletion.missingFields.length === 0,
  );
  const emailVerified = Boolean(profile?.emailVerifiedAt);
  const hasAvatar = Boolean(profile?.avatarUrl);
  const twoFactorEnabled = twoFactorStatus?.enabled === true;
  const checks = {
    BRONZE: hasAccountBasics,
    PRATA: emailVerified || registrationComplete,
    OURO: emailVerified && registrationComplete,
    DIAMANTE: emailVerified && registrationComplete && hasAvatar && twoFactorEnabled,
  } satisfies Record<Exclude<AchievementTier, 'RUBY'>, boolean>;
  const currentTier = ORDERED_TIERS.reduce<Exclude<AchievementTier, 'RUBY'> | null>(
    (current, tier) => (checks[tier] ? tier : current),
    null,
  );

  return {
    id: 'complete-profile',
    name: 'Perfil Completo',
    description: 'Reconhece um cadastro confiável, verificado e protegido.',
    howToEarn:
      'Complete os dados obrigatórios do cadastro, verifique seu e-mail, adicione avatar e ative a segurança em dois fatores.',
    metricLabel: 'cadastro',
    progressValue: null,
    progressLabel: registrationComplete
      ? 'Cadastro preenchido'
      : `${profile?.profileCompletion.completedItems ?? 0}/${profile?.profileCompletion.totalItems ?? 0} itens`,
    currentTier,
    nextTier: getNextTier(currentTier, [
      { tier: 'BRONZE', targetLabel: 'Conta criada com dados mínimos reais.' },
      { tier: 'PRATA', targetLabel: 'E-mail verificado ou cadastro preenchido.' },
      { tier: 'OURO', targetLabel: 'E-mail verificado e cadastro preenchido.' },
      {
        tier: 'DIAMANTE',
        targetLabel: 'E-mail verificado, cadastro preenchido, avatar e 2FA ativo.',
      },
    ]),
    achievementPoints: currentTier ? CUMULATIVE_POINTS[currentTier] : 0,
    unlocked: Boolean(currentTier),
    unavailable: false,
    levels: [
      { tier: 'BRONZE', targetLabel: 'Conta criada com dados mínimos reais.' },
      { tier: 'PRATA', targetLabel: 'E-mail verificado ou cadastro preenchido.' },
      { tier: 'OURO', targetLabel: 'E-mail verificado e cadastro preenchido.' },
      {
        tier: 'DIAMANTE',
        targetLabel: 'E-mail verificado, cadastro preenchido, avatar e 2FA ativo.',
      },
    ],
    hidden: false,
  };
}

export function buildDonorAchievements({
  donations,
  profile,
  twoFactorStatus,
}: BuildDonorAchievementsParams): DonorAchievement[] {
  const donationCount = donations.length;
  const consecutiveMonths = getConsecutiveDonationMonths(donations);
  const distributedCount = getDistributedCount(donations);
  const usedDropOffPoints = getUsedDropOffPointCount(donations);
  const categoryCount = getUniqueCategoryCount(donations);
  const totalQuantity = getTotalQuantity(donations);
  const tenureMonths = getMonthsSince(profile?.createdAt);

  return [
    buildNumericAchievement({
      id: 'recurring-donation',
      name: 'Doação Recorrente',
      description: 'Valoriza a recorrência de doações registradas na plataforma.',
      howToEarn: 'Registre novas doações no VestGO.',
      metricLabel: 'doações registradas',
      progressValue: donationCount,
      progressLabel: `${donationCount} ${donationCount === 1 ? 'doação' : 'doações'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 doação' },
        { tier: 'PRATA', targetValue: 3, targetLabel: '3 doações' },
        { tier: 'OURO', targetValue: 6, targetLabel: '6 doações' },
        { tier: 'DIAMANTE', targetValue: 12, targetLabel: '12+ doações' },
      ],
    }),
    buildNumericAchievement({
      id: 'streak',
      name: 'Constância',
      description: 'Reconhece meses ativos consecutivos doando na plataforma.',
      howToEarn: 'Mantenha pelo menos uma doação registrada em meses seguidos.',
      metricLabel: 'meses consecutivos',
      progressValue: consecutiveMonths,
      progressLabel: `${consecutiveMonths} ${consecutiveMonths === 1 ? 'mês seguido' : 'meses seguidos'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 mês consecutivo' },
        { tier: 'PRATA', targetValue: 3, targetLabel: '3 meses consecutivos' },
        { tier: 'OURO', targetValue: 6, targetLabel: '6 meses consecutivos' },
        { tier: 'DIAMANTE', targetValue: 12, targetLabel: '12+ meses consecutivos' },
      ],
    }),
    buildNumericAchievement({
      id: 'solidarity-delivery',
      name: 'Entrega Solidária',
      description: 'Conta doações que chegaram ao status de distribuição pela ONG.',
      howToEarn: 'Acompanhe suas doações até a distribuição final pela ONG parceira.',
      metricLabel: 'distribuições confirmadas',
      progressValue: distributedCount,
      progressLabel: `${distributedCount} ${distributedCount === 1 ? 'distribuição' : 'distribuições'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 distribuição' },
        { tier: 'PRATA', targetValue: 6, targetLabel: '6 distribuições' },
        { tier: 'OURO', targetValue: 12, targetLabel: '12 distribuições' },
        { tier: 'DIAMANTE', targetValue: 24, targetLabel: '24+ distribuições' },
      ],
    }),
    buildNumericAchievement({
      id: 'active-network',
      name: 'Rede Ativa',
      description: 'Mostra em quantos pontos parceiros diferentes você já doou.',
      howToEarn: 'Doe em pontos parceiros diferentes da rede VestGO.',
      metricLabel: 'pontos parceiros usados',
      progressValue: usedDropOffPoints,
      progressLabel: `${usedDropOffPoints} ${usedDropOffPoints === 1 ? 'ponto' : 'pontos'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 ponto parceiro' },
        { tier: 'PRATA', targetValue: 2, targetLabel: '2 pontos parceiros' },
        { tier: 'OURO', targetValue: 3, targetLabel: '3 pontos parceiros' },
        { tier: 'DIAMANTE', targetValue: 4, targetLabel: '4+ pontos parceiros' },
      ],
    }),
    buildNumericAchievement({
      id: 'monthly-hero',
      name: 'Herói Solidário',
      description: 'Destaque entre os top 5 doadores do mês.',
      howToEarn: 'Depende de ranking mensal real calculado pelo backend.',
      metricLabel: 'meses em destaque',
      progressValue: null,
      progressLabel: 'Indisponível',
      unavailable: true,
      unavailableReason: 'Ranking mensal real ainda não existe no backend.',
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 mês em destaque' },
        { tier: 'PRATA', targetValue: 2, targetLabel: '2 meses em destaque' },
        { tier: 'OURO', targetValue: 3, targetLabel: '3 meses em destaque' },
        { tier: 'DIAMANTE', targetValue: 4, targetLabel: '4+ meses em destaque' },
      ],
    }),
    buildProfileAchievement(profile, twoFactorStatus),
    buildNumericAchievement({
      id: 'diversity',
      name: 'Diversidade',
      description: 'Reconhece variedade de categorias usadas em doações reais.',
      howToEarn: 'Doe itens registrados em categorias diferentes.',
      metricLabel: 'categorias usadas',
      progressValue: categoryCount,
      progressLabel: `${categoryCount} ${categoryCount === 1 ? 'categoria' : 'categorias'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 categoria' },
        { tier: 'PRATA', targetValue: 2, targetLabel: '2 categorias' },
        { tier: 'OURO', targetValue: 3, targetLabel: '3 categorias' },
        { tier: 'DIAMANTE', targetValue: 4, targetLabel: '4+ categorias' },
      ],
    }),
    buildNumericAchievement({
      id: 'seasonal-spirit',
      name: 'Espírito Sazonal',
      description: 'Participação em eventos sazonais de doação.',
      howToEarn: 'Depende de campanhas ou eventos sazonais registrados no backend.',
      metricLabel: 'eventos sazonais',
      progressValue: null,
      progressLabel: 'Indisponível',
      unavailable: true,
      unavailableReason: 'Campanhas sazonais ainda não existem como entidade confiável no backend.',
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 evento sazonal' },
        { tier: 'OURO', targetValue: 2, targetLabel: '2 eventos sazonais' },
        { tier: 'DIAMANTE', targetValue: 3, targetLabel: '3+ eventos sazonais' },
      ],
    }),
    buildNumericAchievement({
      id: 'abundance',
      name: 'Abundância',
      description: 'Conta a quantidade real de peças ou itens doados.',
      howToEarn: 'Doe mais itens em doações registradas no VestGO.',
      metricLabel: 'itens doados',
      progressValue: totalQuantity,
      progressLabel: `${totalQuantity} ${totalQuantity === 1 ? 'item' : 'itens'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 5, targetLabel: '5 itens' },
        { tier: 'PRATA', targetValue: 50, targetLabel: '50 itens' },
        { tier: 'OURO', targetValue: 100, targetLabel: '100 itens' },
        { tier: 'DIAMANTE', targetValue: 200, targetLabel: '200 itens' },
      ],
    }),
    buildNumericAchievement({
      id: 'network-veteran',
      name: 'Veterano da Rede',
      description: 'Reconhece o tempo desde o cadastro no VestGO.',
      howToEarn: 'Mantenha sua conta ativa ao longo do tempo.',
      metricLabel: 'meses desde o cadastro',
      progressValue: tenureMonths,
      progressLabel: `${tenureMonths} ${tenureMonths === 1 ? 'mês' : 'meses'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 3, targetLabel: '3 meses' },
        { tier: 'PRATA', targetValue: 9, targetLabel: '9 meses' },
        { tier: 'OURO', targetValue: 18, targetLabel: '18 meses' },
        { tier: 'DIAMANTE', targetValue: 24, targetLabel: '24 meses' },
      ],
    }),
  ];
}

export function getUnlockedAchievementCount(achievements: DonorAchievement[]) {
  return achievements.filter((achievement) => achievement.unlocked && !achievement.hidden).length;
}
