import { DonationStatus, Prisma, UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { AppError, ForbiddenError, NotFoundError, toErrorResponse } from '../../shared/errors';
import {
  CONFIRMED_DONATION_STATUSES,
  getDonationPointsValue,
  isConfirmedDonationStatus,
} from '../../shared/donation-points';
import { getOperationalProfileChecklist } from '../profiles/profile-shared';

type AchievementTier = 'BRONZE' | 'PRATA' | 'OURO' | 'DIAMANTE' | 'RUBY';

type AchievementLevel = {
  tier: AchievementTier;
  targetValue?: number;
  targetLabel: string;
};

type AchievementResponse = {
  key: string;
  title: string;
  description: string;
  howToEarn: string;
  metricLabel: string;
  tier: AchievementTier | null;
  nextTier: AchievementTier | null;
  hidden: boolean;
  unlocked: boolean;
  points: number;
  progressValue: number | null;
  progressTarget: number | null;
  progressLabel: string;
  unavailable: boolean;
  unavailableReason?: string;
  unlockedAt?: string | null;
  levels: AchievementLevel[];
};

const ORDERED_TIERS: Array<Exclude<AchievementTier, 'RUBY'>> = [
  'BRONZE',
  'PRATA',
  'OURO',
  'DIAMANTE',
];

const ACHIEVEMENT_TIER_POINTS: Record<AchievementTier, number> = {
  BRONZE: 20,
  PRATA: 40,
  OURO: 80,
  DIAMANTE: 160,
  RUBY: 400,
};

// Curva oficial de 30 niveis exposta pelo endpoint de gamificacao.
// Mantem os niveis 1-10 definidos pelo produto e os niveis 11-30
// alinhados com web/lib/gamification.ts ate existir um contrato compartilhado.
const donorLevelBase = [
  { name: 'Primeiro Gesto', color: 'gray', minPoints: 0 },
  { name: 'Doador Iniciante', color: 'primary', minPoints: 80 },
  { name: 'Semeador Solidario', color: 'emerald', minPoints: 240 },
  { name: 'Aliado do Bem', color: 'amber', minPoints: 500 },
  { name: 'Guardiao Local', color: 'indigo', minPoints: 850 },
  { name: 'Guardiao da Generosidade', color: 'violet', minPoints: 1250 },
  { name: 'Ponte Solidaria', color: 'rose', minPoints: 2000 },
  { name: 'Mobilizador da Rede', color: 'primary', minPoints: 2900 },
  { name: 'Multiplicador Solidario', color: 'emerald', minPoints: 4000 },
  { name: 'Referencia Comunitaria', color: 'amber', minPoints: 5000 },
  { name: 'Cuidador Frequente', color: 'indigo', minPoints: 6500 },
  { name: 'Parceiro da Esperanca', color: 'violet', minPoints: 8300 },
  { name: 'Forca Coletiva', color: 'rose', minPoints: 10400 },
  { name: 'Lider de Impacto', color: 'primary', minPoints: 12800 },
  { name: 'Farol Solidario', color: 'emerald', minPoints: 15500 },
  { name: 'Construtor de Pontes', color: 'amber', minPoints: 18500 },
  { name: 'Guardiao da Rede', color: 'indigo', minPoints: 21800 },
  { name: 'Mestre da Constancia', color: 'violet', minPoints: 25400 },
  { name: 'Voz da Comunidade', color: 'rose', minPoints: 29300 },
  { name: 'Embaixador do Impacto', color: 'primary', minPoints: 33500 },
  { name: 'Benfeitor Regional', color: 'emerald', minPoints: 38100 },
  { name: 'Elo Transformador', color: 'amber', minPoints: 43100 },
  { name: 'Guardiao Supremo', color: 'indigo', minPoints: 48500 },
  { name: 'Arquiteto do Bem', color: 'violet', minPoints: 54300 },
  { name: 'Legado Solidario', color: 'rose', minPoints: 60500 },
  { name: 'Referencia Nacional', color: 'primary', minPoints: 67200 },
  { name: 'Inspirador da Rede', color: 'emerald', minPoints: 74400 },
  { name: 'Grande Embaixador', color: 'amber', minPoints: 82100 },
  { name: 'Lenda Solidaria', color: 'indigo', minPoints: 90300 },
  { name: 'Heroi Solidario Supremo', color: 'violet', minPoints: 99000 },
] satisfies Array<{ name: string; color: string; minPoints: number }>;

const DONOR_LEVELS = donorLevelBase.map((level, index) => ({
  ...level,
  nextThreshold: donorLevelBase[index + 1]?.minPoints ?? null,
}));

const gamificationDonationSelect = {
  id: true,
  status: true,
  donorId: true,
  collectionPointId: true,
  seasonalCampaignId: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      category: true,
      quantity: true,
    },
  },
  timeline: {
    select: {
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.DonationSelect;

type GamificationDonation = Prisma.DonationGetPayload<{
  select: typeof gamificationDonationSelect;
}>;

const donorProfileSelect = {
  id: true,
  role: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  birthDate: true,
  cpf: true,
  city: true,
  state: true,
  avatarUrl: true,
  donationInterestCategories: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type DonorProfile = Prisma.UserGetPayload<{ select: typeof donorProfileSelect }>;

function getAchievementPoints(tier: AchievementTier | null) {
  if (!tier) return 0;
  if (tier === 'RUBY') return ACHIEVEMENT_TIER_POINTS.RUBY;

  const index = ORDERED_TIERS.indexOf(tier);
  return ORDERED_TIERS.slice(0, index + 1).reduce(
    (sum, currentTier) => sum + ACHIEVEMENT_TIER_POINTS[currentTier],
    0,
  );
}

function getLevel(points: number) {
  const levelIndex = [...DONOR_LEVELS].reverse().findIndex((level) => points >= level.minPoints);
  const currentIndex =
    levelIndex >= 0 ? DONOR_LEVELS.length - 1 - levelIndex : 0;
  const current = DONOR_LEVELS[currentIndex];
  const nextThreshold = current.nextThreshold;
  const range = nextThreshold ? Math.max(nextThreshold - current.minPoints, 1) : 1;
  const progress = nextThreshold
    ? Math.min(Math.max((points - current.minPoints) / range, 0), 1)
    : 1;

  return {
    currentLevel: currentIndex + 1,
    totalLevels: DONOR_LEVELS.length,
    name: current.name,
    minPoints: current.minPoints,
    nextThreshold,
    pointsToNextLevel: nextThreshold ? Math.max(nextThreshold - points, 0) : 0,
    progress,
  };
}

function getMonthKey(input: Date) {
  return `${input.getUTCFullYear()}-${String(input.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getTotalQuantity(donations: GamificationDonation[]) {
  return donations.reduce(
    (sum, donation) =>
      sum + donation.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
}

function getUniqueCategoryCount(donations: GamificationDonation[]) {
  return new Set(
    donations
      .flatMap((donation) => donation.items.map((item) => item.category))
      .filter(Boolean),
  ).size;
}

function getUsedCollectionPointCount(donations: GamificationDonation[]) {
  return new Set(donations.map((donation) => donation.collectionPointId).filter(Boolean)).size;
}

function getDistributedCount(donations: GamificationDonation[]) {
  return donations.filter(
    (donation) =>
      donation.status === DonationStatus.DISTRIBUTED ||
      donation.timeline.some((event) => event.status === DonationStatus.DISTRIBUTED),
  ).length;
}

function getConsecutiveActiveMonths(donations: GamificationDonation[]) {
  if (donations.length === 0) return 0;

  const monthSet = new Set(donations.map((donation) => getMonthKey(donation.createdAt)));
  const ordered = [...donations].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const mostRecent = ordered[0].createdAt;
  const cursor = new Date(Date.UTC(mostRecent.getUTCFullYear(), mostRecent.getUTCMonth(), 1));
  let streak = 0;

  while (monthSet.has(getMonthKey(cursor))) {
    streak += 1;
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }

  return streak;
}

function getMonthsSince(input: Date) {
  const now = new Date();
  return Math.max(
    0,
    (now.getUTCFullYear() - input.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - input.getUTCMonth()),
  );
}

function getTierFromLevels(value: number | null, levels: AchievementLevel[]) {
  if (value == null) return null;

  return levels.reduce<Exclude<AchievementTier, 'RUBY'> | null>((current, level) => {
    if (level.tier === 'RUBY') return current;
    if (typeof level.targetValue === 'number' && value >= level.targetValue) {
      return level.tier;
    }

    return current;
  }, null);
}

function getNextTier(tier: AchievementTier | null, levels: AchievementLevel[]) {
  if (tier === 'RUBY') return null;

  const currentIndex = tier ? ORDERED_TIERS.indexOf(tier) : -1;
  return (
    levels.find(
      (level) => level.tier !== 'RUBY' && ORDERED_TIERS.indexOf(level.tier) > currentIndex,
    )?.tier ?? null
  );
}

function getProgressTarget(nextTier: AchievementTier | null, levels: AchievementLevel[]) {
  if (!nextTier) return null;
  return levels.find((level) => level.tier === nextTier)?.targetValue ?? null;
}

function buildNumericAchievement(input: {
  key: string;
  title: string;
  description: string;
  howToEarn: string;
  metricLabel: string;
  progressValue: number | null;
  progressLabel: string;
  levels: AchievementLevel[];
  unavailable?: boolean;
  unavailableReason?: string;
}): AchievementResponse {
  const tier = input.unavailable ? null : getTierFromLevels(input.progressValue, input.levels);
  const nextTier = input.unavailable ? null : getNextTier(tier, input.levels);

  return {
    ...input,
    tier,
    nextTier,
    hidden: false,
    unlocked: Boolean(tier),
    points: getAchievementPoints(tier),
    progressTarget: getProgressTarget(nextTier, input.levels),
    unavailable: input.unavailable ?? false,
    unlockedAt: null,
  };
}

function getProfileChecklist(profile: DonorProfile) {
  return getOperationalProfileChecklist(profile.role, {
    birthDate: profile.birthDate?.toISOString().slice(0, 10),
    cpf: profile.cpf ?? undefined,
    city: profile.city ?? undefined,
    state: profile.state ?? undefined,
    donationInterestCategories: profile.donationInterestCategories,
    openingSchedule: [],
    serviceRegions: [],
    acceptedCategories: [],
  });
}

function buildProfileAchievement(profile: DonorProfile): AchievementResponse {
  const checklist = getProfileChecklist(profile);
  const registrationComplete = checklist.every((entry) => entry.complete);
  const emailVerified = Boolean(profile.emailVerifiedAt);
  const hasAvatar = Boolean(profile.avatarUrl);

  const checks = {
    BRONZE: Boolean(profile.createdAt && profile.name && profile.email),
    PRATA: emailVerified || registrationComplete,
    OURO: emailVerified && registrationComplete,
    DIAMANTE: emailVerified && registrationComplete && hasAvatar,
  } satisfies Record<Exclude<AchievementTier, 'RUBY'>, boolean>;
  const tier = ORDERED_TIERS.reduce<Exclude<AchievementTier, 'RUBY'> | null>(
    (current, candidate) => (checks[candidate] ? candidate : current),
    null,
  );
  const levels: AchievementLevel[] = [
    { tier: 'BRONZE', targetLabel: 'Conta criada com nome e e-mail reais.' },
    { tier: 'PRATA', targetLabel: 'E-mail verificado ou cadastro complementar preenchido.' },
    { tier: 'OURO', targetLabel: 'E-mail verificado e cadastro complementar preenchido.' },
    { tier: 'DIAMANTE', targetLabel: 'E-mail verificado, cadastro complementar preenchido e avatar no perfil.' },
  ];
  const nextTier = getNextTier(tier, levels);

  return {
    key: 'complete-profile',
    title: 'Perfil Completo',
    description: 'Reconhece um cadastro confiavel, verificado e bem apresentado.',
    howToEarn: 'Complete os dados complementares do cadastro, verifique seu e-mail e adicione um avatar ao perfil.',
    metricLabel: 'cadastro',
    progressValue: null,
    progressTarget: null,
    progressLabel: registrationComplete
      ? 'Cadastro preenchido'
      : `${checklist.filter((entry) => entry.complete).length}/${checklist.length} itens`,
    tier,
    nextTier,
    hidden: false,
    unlocked: Boolean(tier),
    points: getAchievementPoints(tier),
    unavailable: false,
    unlockedAt: null,
    levels,
  };
}

function getConfirmationDate(donation: GamificationDonation) {
  const firstAtPoint = donation.timeline.find((event) => event.status === DonationStatus.AT_POINT);

  // Limitation until a PointLedger/DonationPointEvent exists: legacy rows without
  // an AT_POINT event fall back to updatedAt so confirmed donations remain rankable.
  return firstAtPoint?.createdAt ?? donation.updatedAt;
}

function getHighlightedMonthsCount(allConfirmedDonations: GamificationDonation[], donorId: string) {
  const monthDonorScores = new Map<
    string,
    Map<string, { donorId: string; points: number; itemQuantity: number; firstConfirmedAt: Date }>
  >();

  for (const donation of allConfirmedDonations) {
    const confirmedAt = getConfirmationDate(donation);
    const monthKey = getMonthKey(confirmedAt);
    const monthScores = monthDonorScores.get(monthKey) ?? new Map();
    const current = monthScores.get(donation.donorId);
    const quantity = donation.items.reduce((sum, item) => sum + item.quantity, 0);

    monthScores.set(donation.donorId, {
      donorId: donation.donorId,
      points: (current?.points ?? 0) + getDonationPointsValue(donation.status),
      itemQuantity: (current?.itemQuantity ?? 0) + quantity,
      firstConfirmedAt:
        current && current.firstConfirmedAt.getTime() < confirmedAt.getTime()
          ? current.firstConfirmedAt
          : confirmedAt,
    });
    monthDonorScores.set(monthKey, monthScores);
  }

  let highlightedMonths = 0;

  for (const monthScores of monthDonorScores.values()) {
    const ranking = [...monthScores.values()].sort((left, right) => {
      if (left.points !== right.points) return right.points - left.points;
      if (left.itemQuantity !== right.itemQuantity) return right.itemQuantity - left.itemQuantity;
      if (left.firstConfirmedAt.getTime() !== right.firstConfirmedAt.getTime()) {
        return left.firstConfirmedAt.getTime() - right.firstConfirmedAt.getTime();
      }
      return left.donorId.localeCompare(right.donorId);
    });

    if (ranking.slice(0, 5).some((entry) => entry.donorId === donorId)) {
      highlightedMonths += 1;
    }
  }

  return highlightedMonths;
}

function buildRubyAchievement(input: {
  key: string;
  title: string;
  description: string;
  howToEarn: string;
  unlocked: boolean;
}): AchievementResponse {
  return {
    key: input.key,
    title: input.unlocked ? input.title : 'Conquista secreta',
    description: input.unlocked
      ? input.description
      : 'Uma conquista especial da rede VestGO ainda esta oculta.',
    howToEarn: input.unlocked ? input.howToEarn : 'Continue doando e evoluindo para revelar esta conquista.',
    metricLabel: 'secreta',
    tier: input.unlocked ? 'RUBY' : null,
    nextTier: input.unlocked ? null : 'RUBY',
    hidden: !input.unlocked,
    unlocked: input.unlocked,
    points: input.unlocked ? getAchievementPoints('RUBY') : 0,
    progressValue: input.unlocked ? 1 : null,
    progressTarget: input.unlocked ? 1 : null,
    progressLabel: input.unlocked ? 'Desbloqueada' : 'Secreta',
    unavailable: false,
    unlockedAt: null,
    levels: [
      {
        tier: 'RUBY',
        targetLabel: input.unlocked ? input.howToEarn : 'Criterio secreto.',
      },
    ],
  };
}

function buildAchievements(params: {
  profile: DonorProfile;
  donations: GamificationDonation[];
  confirmedDonations: GamificationDonation[];
  highlightedMonthsCount: number;
  seasonalCampaignsCount: number;
  level: ReturnType<typeof getLevel>;
}) {
  const nonCancelledDonations = params.donations.filter(
    (donation) => donation.status !== DonationStatus.CANCELLED,
  );
  const donationCount = nonCancelledDonations.length;
  const consecutiveMonths = getConsecutiveActiveMonths(nonCancelledDonations);
  const distributedCount = getDistributedCount(params.confirmedDonations);
  const usedCollectionPointsCount = getUsedCollectionPointCount(params.confirmedDonations);
  const usedCategoriesCount = getUniqueCategoryCount(params.confirmedDonations);
  const donatedItemsQuantity = getTotalQuantity(params.confirmedDonations);
  const tenureMonths = getMonthsSince(params.profile.createdAt);

  const publicAchievements: AchievementResponse[] = [
    buildNumericAchievement({
      key: 'recurring-donation',
      title: 'Doacao Recorrente',
      description: 'Valoriza a recorrencia de doacoes registradas na plataforma.',
      howToEarn: 'Registre novas doacoes no VestGO.',
      metricLabel: 'doacoes registradas',
      progressValue: donationCount,
      progressLabel: `${donationCount} ${donationCount === 1 ? 'doacao' : 'doacoes'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 doacao' },
        { tier: 'PRATA', targetValue: 3, targetLabel: '3 doacoes' },
        { tier: 'OURO', targetValue: 6, targetLabel: '6 doacoes' },
        { tier: 'DIAMANTE', targetValue: 12, targetLabel: '12+ doacoes' },
      ],
    }),
    buildNumericAchievement({
      key: 'streak',
      title: 'Constancia',
      description: 'Reconhece meses ativos consecutivos doando na plataforma.',
      howToEarn: 'Mantenha pelo menos uma doacao registrada em meses seguidos.',
      metricLabel: 'meses consecutivos',
      progressValue: consecutiveMonths,
      progressLabel: `${consecutiveMonths} ${consecutiveMonths === 1 ? 'mes seguido' : 'meses seguidos'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 mes consecutivo' },
        { tier: 'PRATA', targetValue: 3, targetLabel: '3 meses consecutivos' },
        { tier: 'OURO', targetValue: 6, targetLabel: '6 meses consecutivos' },
        { tier: 'DIAMANTE', targetValue: 12, targetLabel: '12+ meses consecutivos' },
      ],
    }),
    buildNumericAchievement({
      key: 'solidarity-delivery',
      title: 'Entrega Solidaria',
      description: 'Conta doacoes que chegaram ao status de distribuicao pela ONG.',
      howToEarn: 'Acompanhe suas doacoes ate a distribuicao final pela ONG parceira.',
      metricLabel: 'distribuicoes confirmadas',
      progressValue: distributedCount,
      progressLabel: `${distributedCount} ${distributedCount === 1 ? 'distribuicao' : 'distribuicoes'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 distribuicao' },
        { tier: 'PRATA', targetValue: 6, targetLabel: '6 distribuicoes' },
        { tier: 'OURO', targetValue: 12, targetLabel: '12 distribuicoes' },
        { tier: 'DIAMANTE', targetValue: 24, targetLabel: '24+ distribuicoes' },
      ],
    }),
    buildNumericAchievement({
      key: 'active-network',
      title: 'Rede Ativa',
      description: 'Mostra em quantos pontos parceiros diferentes voce ja teve doacoes confirmadas.',
      howToEarn: 'Confirme entregas em pontos parceiros diferentes da rede VestGO.',
      metricLabel: 'pontos parceiros usados',
      progressValue: usedCollectionPointsCount,
      progressLabel: `${usedCollectionPointsCount} ${usedCollectionPointsCount === 1 ? 'ponto' : 'pontos'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 ponto parceiro' },
        { tier: 'PRATA', targetValue: 2, targetLabel: '2 pontos parceiros' },
        { tier: 'OURO', targetValue: 3, targetLabel: '3 pontos parceiros' },
        { tier: 'DIAMANTE', targetValue: 4, targetLabel: '4+ pontos parceiros' },
      ],
    }),
    buildNumericAchievement({
      key: 'monthly-hero',
      title: 'Heroi Solidario',
      description: 'Destaque entre os top 5 doadores do mes.',
      howToEarn: 'Fique entre os 5 doadores com mais pontos confirmados em um mes.',
      metricLabel: 'meses em destaque',
      progressValue: params.highlightedMonthsCount,
      progressLabel: `${params.highlightedMonthsCount} ${params.highlightedMonthsCount === 1 ? 'mes' : 'meses'} em destaque`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 mes em destaque' },
        { tier: 'PRATA', targetValue: 2, targetLabel: '2 meses em destaque' },
        { tier: 'OURO', targetValue: 3, targetLabel: '3 meses em destaque' },
        { tier: 'DIAMANTE', targetValue: 4, targetLabel: '4+ meses em destaque' },
      ],
    }),
    buildProfileAchievement(params.profile),
    buildNumericAchievement({
      key: 'diversity',
      title: 'Diversidade',
      description: 'Reconhece variedade de categorias usadas em doacoes confirmadas.',
      howToEarn: 'Doe itens registrados em categorias diferentes e confirme a entrega no ponto.',
      metricLabel: 'categorias usadas',
      progressValue: usedCategoriesCount,
      progressLabel: `${usedCategoriesCount} ${usedCategoriesCount === 1 ? 'categoria' : 'categorias'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 categoria' },
        { tier: 'PRATA', targetValue: 2, targetLabel: '2 categorias' },
        { tier: 'OURO', targetValue: 3, targetLabel: '3 categorias' },
        { tier: 'DIAMANTE', targetValue: 4, targetLabel: '4+ categorias' },
      ],
    }),
    buildNumericAchievement({
      key: 'seasonal-spirit',
      title: 'Espirito Sazonal',
      description: 'Participacao em eventos sazonais de doacao.',
      howToEarn: 'Doe durante campanhas sazonais ativas e confirme a entrega no ponto.',
      metricLabel: 'campanhas sazonais',
      progressValue: params.seasonalCampaignsCount,
      progressLabel: `${params.seasonalCampaignsCount} ${params.seasonalCampaignsCount === 1 ? 'campanha' : 'campanhas'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 1, targetLabel: '1 campanha sazonal' },
        { tier: 'PRATA', targetValue: 2, targetLabel: '2 campanhas sazonais' },
        { tier: 'OURO', targetValue: 3, targetLabel: '3 campanhas sazonais' },
        { tier: 'DIAMANTE', targetValue: 4, targetLabel: '4+ campanhas sazonais' },
      ],
    }),
    buildNumericAchievement({
      key: 'abundance',
      title: 'Abundancia',
      description: 'Conta a quantidade real de pecas ou itens doados e confirmados.',
      howToEarn: 'Doe mais itens e confirme a entrega no ponto parceiro.',
      metricLabel: 'itens doados',
      progressValue: donatedItemsQuantity,
      progressLabel: `${donatedItemsQuantity} ${donatedItemsQuantity === 1 ? 'item' : 'itens'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 5, targetLabel: '5 itens' },
        { tier: 'PRATA', targetValue: 50, targetLabel: '50 itens' },
        { tier: 'OURO', targetValue: 100, targetLabel: '100 itens' },
        { tier: 'DIAMANTE', targetValue: 200, targetLabel: '200 itens' },
      ],
    }),
    buildNumericAchievement({
      key: 'network-veteran',
      title: 'Veterano da Rede',
      description: 'Reconhece o tempo desde o cadastro no VestGO.',
      howToEarn: 'Mantenha sua conta ativa ao longo do tempo.',
      metricLabel: 'meses desde o cadastro',
      progressValue: tenureMonths,
      progressLabel: `${tenureMonths} ${tenureMonths === 1 ? 'mes' : 'meses'}`,
      levels: [
        { tier: 'BRONZE', targetValue: 3, targetLabel: '3 meses' },
        { tier: 'PRATA', targetValue: 9, targetLabel: '9 meses' },
        { tier: 'OURO', targetValue: 18, targetLabel: '18 meses' },
        { tier: 'DIAMANTE', targetValue: 24, targetLabel: '24 meses' },
      ],
    }),
  ];

  const hasAllPublicBronze = publicAchievements.every(
    (achievement) => achievement.tier != null && !achievement.unavailable,
  );
  const hasConfirmedDonation = params.confirmedDonations.length > 0;
  const createdIn2026 = params.profile.createdAt.getUTCFullYear() === 2026;

  return [
    ...publicAchievements,
    buildRubyAchievement({
      key: 'medal-hunter',
      title: 'Cacador de Medalhas',
      description: 'Todas as conquistas publicas no nivel Bronze ou superior.',
      howToEarn: 'Alcance pelo menos Bronze em todas as conquistas publicas.',
      unlocked: hasAllPublicBronze,
    }),
    buildRubyAchievement({
      key: 'community-ambassador',
      title: 'Embaixador da Comunidade',
      description: 'Perfil criado em 2026, com pelo menos uma doacao confirmada.',
      howToEarn: 'Tenha criado o perfil em 2026 e confirme ao menos uma doacao.',
      unlocked: createdIn2026 && hasConfirmedDonation,
    }),
    buildRubyAchievement({
      key: 'unstoppable',
      title: 'Implacavel',
      description: 'Alcancou o nivel 15 do doador.',
      howToEarn: 'Alcance o nivel 15.',
      unlocked: params.level.currentLevel >= 15,
    }),
    buildRubyAchievement({
      key: 'supreme-donor',
      title: 'O Doador Supremo',
      description: 'Alcancou o nivel 20 do doador.',
      howToEarn: 'Alcance o nivel 20.',
      unlocked: params.level.currentLevel >= 20,
    }),
    buildRubyAchievement({
      key: 'supreme-solidarity-hero',
      title: 'Heroi Solidario Supremo',
      description: 'Alcancou o nivel 30 do doador.',
      howToEarn: 'Alcance o nivel 30.',
      unlocked: params.level.currentLevel >= 30,
    }),
  ];
}

export default async function gamificationRoutes(fastify: FastifyInstance) {
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      if (request.user.role !== UserRole.DONOR) {
        throw new ForbiddenError('Gamificacao disponivel apenas para doadores');
      }

      const profile = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
        select: donorProfileSelect,
      });

      if (!profile) {
        throw new NotFoundError('Perfil');
      }

      const [donations, allConfirmedDonations] = await Promise.all([
        fastify.prisma.donation.findMany({
          where: { donorId: request.user.id },
          orderBy: { createdAt: 'desc' },
          select: gamificationDonationSelect,
        }),
        fastify.prisma.donation.findMany({
          where: { status: { in: CONFIRMED_DONATION_STATUSES } },
          select: gamificationDonationSelect,
        }),
      ]);

      const confirmedDonations = donations.filter((donation) =>
        isConfirmedDonationStatus(donation.status),
      );
      const points = donations.reduce(
        (sum, donation) => sum + getDonationPointsValue(donation.status),
        0,
      );
      const level = getLevel(points);
      const highlightedMonthsCount = getHighlightedMonthsCount(
        allConfirmedDonations,
        request.user.id,
      );
      const seasonalCampaignsCount = new Set(
        confirmedDonations.map((donation) => donation.seasonalCampaignId).filter(Boolean),
      ).size;
      const nonCancelledDonations = donations.filter(
        (donation) => donation.status !== DonationStatus.CANCELLED,
      );
      const achievements = buildAchievements({
        profile,
        donations,
        confirmedDonations,
        highlightedMonthsCount,
        seasonalCampaignsCount,
        level,
      });

      return reply.send({
        points,
        level,
        achievements,
        summary: {
          donationsCount: nonCancelledDonations.length,
          confirmedDonationsCount: confirmedDonations.length,
          distributedDonationsCount: getDistributedCount(confirmedDonations),
          donatedItemsQuantity: getTotalQuantity(confirmedDonations),
          usedCategoriesCount: getUniqueCategoryCount(confirmedDonations),
          usedCollectionPointsCount: getUsedCollectionPointCount(confirmedDonations),
          consecutiveActiveMonths: getConsecutiveActiveMonths(nonCancelledDonations),
          highlightedMonthsCount,
          seasonalCampaignsCount,
        },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });
}
