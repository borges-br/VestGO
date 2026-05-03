import type { DonationRecord, DonationStatus } from '@/lib/api';
import { calculateDonationPointsBreakdown } from '@/lib/donation-points';

export type ImpactBadgeTone = 'primary' | 'indigo' | 'emerald' | 'amber';

export type ImpactBadge = {
  id: string;
  label: string;
  description: string;
  tone: ImpactBadgeTone;
  earned: boolean;
  progressLabel?: string;
};

export type DonorLevel = {
  name: string;
  color: 'gray' | 'primary' | 'emerald' | 'amber' | 'indigo' | 'violet' | 'rose';
  minPoints: number;
  nextThreshold?: number;
};

// Espelho da curva oficial em api/src/modules/gamification/gamification.ts.
// Niveis 20-30 confirmados pelo produto (10 pts/item, +500 pts por nivel).
// Niveis 1-19 sao uma estimativa razoavel, sujeita a confirmacao do produto.
const donorLevelBase = [
  { name: 'Primeiro Gesto', color: 'gray', minPoints: 0 },
  { name: 'Doador Iniciante', color: 'primary', minPoints: 60 },
  { name: 'Semeador Solidário', color: 'emerald', minPoints: 140 },
  { name: 'Aliado do Bem', color: 'amber', minPoints: 240 },
  { name: 'Guardião Local', color: 'indigo', minPoints: 360 },
  { name: 'Guardião da Generosidade', color: 'violet', minPoints: 500 },
  { name: 'Ponte Solidária', color: 'rose', minPoints: 660 },
  { name: 'Mobilizador da Rede', color: 'primary', minPoints: 840 },
  { name: 'Multiplicador Solidário', color: 'emerald', minPoints: 1040 },
  { name: 'Referência Comunitária', color: 'amber', minPoints: 1260 },
  { name: 'Cuidador Frequente', color: 'indigo', minPoints: 1500 },
  { name: 'Parceiro da Esperança', color: 'violet', minPoints: 1760 },
  { name: 'Força Coletiva', color: 'rose', minPoints: 2040 },
  { name: 'Líder de Impacto', color: 'primary', minPoints: 2340 },
  { name: 'Farol Solidário', color: 'emerald', minPoints: 2660 },
  { name: 'Construtor de Pontes', color: 'amber', minPoints: 3000 },
  { name: 'Guardião da Rede', color: 'indigo', minPoints: 3360 },
  { name: 'Mestre da Constância', color: 'violet', minPoints: 3740 },
  { name: 'Voz da Comunidade', color: 'rose', minPoints: 4140 },
  { name: 'Embaixador do Impacto', color: 'primary', minPoints: 4500 },
  { name: 'Benfeitor Regional', color: 'emerald', minPoints: 5000 },
  { name: 'Elo Transformador', color: 'amber', minPoints: 5500 },
  { name: 'Guardião Supremo', color: 'indigo', minPoints: 6000 },
  { name: 'Arquiteto do Bem', color: 'violet', minPoints: 6500 },
  { name: 'Legado Solidário', color: 'rose', minPoints: 7000 },
  { name: 'Referência Nacional', color: 'primary', minPoints: 7500 },
  { name: 'Inspirador da Rede', color: 'emerald', minPoints: 8000 },
  { name: 'Grande Embaixador', color: 'amber', minPoints: 8500 },
  { name: 'Lenda Solidária', color: 'indigo', minPoints: 9000 },
  { name: 'Herói Solidário Supremo', color: 'violet', minPoints: 10000 },
] satisfies Array<Omit<DonorLevel, 'nextThreshold'>>;

export const DONOR_LEVELS: DonorLevel[] = donorLevelBase.map((level, index) => ({
  ...level,
  nextThreshold: donorLevelBase[index + 1]?.minPoints,
}));

export function getDonorLevel(points: number): DonorLevel {
  const level = [...DONOR_LEVELS].reverse().find((item) => points >= item.minPoints);
  return level ?? DONOR_LEVELS[0];
}

export type ImpactSnapshot = {
  points: number;
  pointsLabel: string;
  levelTitle: string;
  levelName: string;
  levelColor: DonorLevel['color'];
  levelProgress: number;
  pointsToNextLevel: number;
  nextMilestone: {
    label: string;
    current: number;
    target: number;
    note: string;
  };
  monthlyGoal: {
    label: string;
    current: number;
    target: number;
    note: string;
  };
  streak: {
    value: number;
    label: string;
    note: string;
  };
  ranking: {
    position: number | null;
    scope: string;
    note: string;
  };
  stats: {
    value: string;
    label: string;
  }[];
  badges: ImpactBadge[];
  history: {
    title: string;
    detail: string;
    date: string;
    points: string;
  }[];
};

export type PostDonationReward = {
  potentialPoints: number;
  confirmationPoints: number;
  distributionBonus: number;
  pendingPointsLabel: string;
  confirmationLabel: string;
  distributionLabel: string;
  monthlyGoal: {
    current: number;
    target: number;
  };
};

const MONTHLY_GOAL_TARGET = 4;

const COMPLETED_STATUSES: DonationStatus[] = ['DELIVERED', 'DISTRIBUTED'];
const TRACKED_STATUSES: DonationStatus[] = ['AT_POINT', 'IN_TRANSIT', 'DELIVERED', 'DISTRIBUTED'];
const ACTIVE_STATUSES: DonationStatus[] = ['PENDING', 'AT_POINT', 'IN_TRANSIT'];

function formatDateLabel(input: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(input));
}

function getMonthKey(input: string) {
  const date = new Date(input);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getCurrentMonthKey() {
  return getMonthKey(new Date().toISOString());
}

function getMonthlyStreak(donations: DonationRecord[]) {
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

function computeLevelProgress(points: number, level: DonorLevel) {
  if (!level.nextThreshold) {
    return { progress: 1, pointsToNext: 0 };
  }

  const range = level.nextThreshold - level.minPoints;
  const gained = points - level.minPoints;

  return {
    progress: Math.min(1, Math.max(0, gained / range)),
    pointsToNext: Math.max(0, level.nextThreshold - points),
  };
}

function getNextMilestone(points: number) {
  const level = getDonorLevel(points);

  if (!level.nextThreshold) {
    return {
      label: 'Nível máximo',
      current: points,
      target: points,
      note: 'Você alcançou o último nível desta curva.',
    };
  }

  const nextIndex = DONOR_LEVELS.findIndex((item) => item.minPoints === level.nextThreshold);
  const nextLevel = nextIndex >= 0 ? DONOR_LEVELS[nextIndex] : null;

  return {
    label: nextLevel ? nextLevel.name : 'Próximo nível',
    current: points,
    target: level.nextThreshold,
    note: `Faltam ${level.nextThreshold - points} pontos para o próximo nível.`,
  };
}

function getItemQuantity(donations: DonationRecord[]) {
  return donations.reduce((sum, donation) => {
    const itemQuantity = donation.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    return sum + (itemQuantity > 0 ? itemQuantity : donation.itemCount);
  }, 0);
}

export function buildImpactSnapshot(donations: DonationRecord[]): ImpactSnapshot {
  const ordered = [...donations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const totalPoints = ordered.reduce((sum, donation) => sum + donation.pointsAwarded, 0);
  const completed = ordered.filter((donation) => COMPLETED_STATUSES.includes(donation.status));
  const tracked = ordered.filter((donation) => TRACKED_STATUSES.includes(donation.status));
  const active = ordered.filter((donation) => ACTIVE_STATUSES.includes(donation.status));
  const itemCount = getItemQuantity(ordered);
  const monthlyDonations = ordered.filter(
    (donation) => getMonthKey(donation.createdAt) === getCurrentMonthKey(),
  ).length;
  const usedDropOffPoints = new Set(
    ordered.map((donation) => donation.dropOffPoint?.id).filter(Boolean),
  ).size;
  const streakMonths = getMonthlyStreak(ordered);
  const nextMilestone = getNextMilestone(totalPoints);
  const level = getDonorLevel(totalPoints);
  const { progress: levelProgress, pointsToNext: pointsToNextLevel } = computeLevelProgress(
    totalPoints,
    level,
  );

  return {
    points: totalPoints,
    pointsLabel: 'Pontos solidários confirmados',
    levelTitle: level.name,
    levelName: level.name,
    levelColor: level.color,
    levelProgress,
    pointsToNextLevel,
    nextMilestone,
    monthlyGoal: {
      label: 'Meta do mês',
      current: monthlyDonations,
      target: MONTHLY_GOAL_TARGET,
      note:
        monthlyDonations === 0
          ? 'Sua meta mensal começa na primeira doação registrada.'
          : 'Meta calculada a partir das doações reais deste mês.',
    },
    streak: {
      value: streakMonths,
      label: 'meses consecutivos com participação',
      note: 'A constância considera meses seguidos com ao menos uma doação registrada.',
    },
    ranking: {
      position: null,
      scope: 'comunidade local',
      note: 'Ranking mensal real depende da Fase 2 de backend.',
    },
    stats: [
      { value: String(completed.length), label: 'doações concluídas' },
      { value: String(itemCount), label: 'itens registrados' },
      { value: String(usedDropOffPoints), label: 'pontos parceiros usados' },
      { value: String(active.length), label: 'jornadas em andamento' },
    ],
    badges: [
      {
        id: 'first-donation',
        label: 'Primeira entrega',
        description: 'Reconhece a primeira doação registrada na plataforma.',
        tone: 'primary',
        earned: ordered.length >= 1,
      },
      {
        id: 'tracked-impact',
        label: 'Jornada rastreada',
        description: 'Doação acompanhada até uma etapa real da jornada logística.',
        tone: 'indigo',
        earned: tracked.length >= 1,
        progressLabel: tracked.length === 0 ? 'Aguardando a primeira jornada acompanhada' : undefined,
      },
      {
        id: 'steady-donor',
        label: 'Constância solidária',
        description: 'Participação recorrente em mais de um ciclo mensal.',
        tone: 'emerald',
        earned: streakMonths >= 2,
        progressLabel: streakMonths < 2 ? `${streakMonths} de 2 meses consecutivos` : undefined,
      },
      {
        id: 'local-impact',
        label: 'Solidariedade local',
        description: 'Uso recorrente da rede parceira em mais de um ponto da comunidade.',
        tone: 'amber',
        earned: usedDropOffPoints >= 2,
        progressLabel:
          usedDropOffPoints < 2
            ? `${usedDropOffPoints} de 2 pontos parceiros utilizados`
            : undefined,
      },
    ],
    history: ordered.slice(0, 5).map((donation) => ({
      title: donation.itemLabel,
      detail:
        donation.latestEvent?.description ??
        'Doação registrada. Aguardando confirmação no ponto de coleta.',
      date: formatDateLabel(donation.createdAt),
      points:
        donation.pointsAwarded > 0
          ? `+${donation.pointsAwarded} pts`
          : `até +${donation.pointsBreakdown?.totalPotentialPoints ?? 0} pts`,
    })),
  };
}

export function buildPostDonationRewardFromBreakdown(input: {
  items: { category: DonationRecord['items'][number]['category']; quantity: number; condition: DonationRecord['items'][number]['condition'] }[];
  monthlyGoalCurrent?: number;
}): PostDonationReward {
  const breakdown = calculateDonationPointsBreakdown({
    items: input.items,
    status: 'PENDING',
  });
  const monthlyGoalCurrent = input.monthlyGoalCurrent ?? 0;

  return {
    potentialPoints: breakdown.totalPotentialPoints,
    confirmationPoints: breakdown.confirmationPoints,
    distributionBonus: breakdown.distributionBonus,
    pendingPointsLabel:
      'O cadastro inicial não credita pontos automaticamente. Os pontos entram quando o ponto de coleta confirmar o recebimento.',
    confirmationLabel:
      breakdown.confirmationPoints > 0
        ? `Você receberá ${breakdown.confirmationPoints} pontos quando o ponto confirmar o recebimento.`
        : 'Pontos serão calculados quando o ponto confirmar o recebimento.',
    distributionLabel:
      breakdown.distributionBonus > 0
        ? `Após a distribuição pela ONG, você poderá receber +${breakdown.distributionBonus} pontos adicionais.`
        : 'Após a distribuição pela ONG, você poderá receber pontos adicionais.',
    monthlyGoal: {
      current: Math.min(monthlyGoalCurrent + 1, MONTHLY_GOAL_TARGET),
      target: MONTHLY_GOAL_TARGET,
    },
  };
}

export function buildPostDonationReward(donations: DonationRecord[]): PostDonationReward {
  const snapshot = buildImpactSnapshot(donations);
  return buildPostDonationRewardFromBreakdown({
    items: [],
    monthlyGoalCurrent: snapshot.monthlyGoal.current,
  });
}

export const donorImpactSnapshot = buildImpactSnapshot([]);
export const postDonationReward = buildPostDonationReward([]);
