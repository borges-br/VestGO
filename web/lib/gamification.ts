import type { DonationRecord, DonationStatus } from '@/lib/api';

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
  /** Tailwind color token suffix used for chip bg/text (e.g. 'primary', 'amber', 'emerald') */
  color: 'gray' | 'primary' | 'emerald' | 'amber' | 'indigo' | 'violet' | 'rose';
  minPoints: number;
  /** Threshold of the next level (undefined = max level reached) */
  nextThreshold?: number;
};

export const DONOR_LEVELS: DonorLevel[] = [
  { name: 'Futuro Doador',           color: 'gray',    minPoints: 0,    nextThreshold: 50 },
  { name: 'Doador Iniciante',        color: 'primary',  minPoints: 50,   nextThreshold: 150 },
  { name: 'Semeador Solidário',      color: 'emerald', minPoints: 150,  nextThreshold: 350 },
  { name: 'Agente do Bem',           color: 'amber',   minPoints: 350,  nextThreshold: 700 },
  { name: 'Multiplicador Solidário', color: 'indigo',  minPoints: 700,  nextThreshold: 1200 },
  { name: 'Guardião da Generosidade',color: 'violet',  minPoints: 1200, nextThreshold: 2000 },
  { name: 'Embaixador do Impacto',   color: 'rose',    minPoints: 2000 },
];

export function getDonorLevel(points: number): DonorLevel {
  const level = [...DONOR_LEVELS].reverse().find((l) => points >= l.minPoints);
  return level ?? DONOR_LEVELS[0];
}

export type ImpactSnapshot = {
  points: number;
  pointsLabel: string;
  levelTitle: string;
  /** Short, human-readable level name (e.g. "Semeador Solidário") */
  levelName: string;
  /** Tailwind color key for the level chip */
  levelColor: DonorLevel['color'];
  /** Progress within the current level (0–1) */
  levelProgress: number;
  /** Points needed to reach the next level (0 if already at max) */
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
  points: number;
  label: string;
  note: string;
  milestone: {
    label: string;
    current: number;
    target: number;
  };
  monthlyGoal: {
    current: number;
    target: number;
  };
};

const MONTHLY_GOAL_TARGET = 4;
const POINT_MILESTONES = [
  { label: 'Primeiro marco solidário', target: 120 },
  { label: 'Constância em evolução', target: 300 },
  { label: 'Guardião da recorrência', target: 500 },
  { label: 'Solidariedade recorrente', target: 800 },
  { label: 'Referência comunitária', target: 1200 },
];

const STATUS_POINTS: Record<DonationStatus, number> = {
  PENDING: 60,
  AT_POINT: 90,
  IN_TRANSIT: 110,
  DELIVERED: 150,
  DISTRIBUTED: 180,
  CANCELLED: 0,
};

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
  if (donations.length === 0) {
    return 0;
  }

  const monthSet = new Set(donations.map((donation) => getMonthKey(donation.createdAt)));
  const mostRecent = new Date(donations[0].createdAt);
  let streak = 0;

  const cursor = new Date(Date.UTC(mostRecent.getUTCFullYear(), mostRecent.getUTCMonth(), 1));

  while (monthSet.has(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`)) {
    streak += 1;
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }

  return streak;
}

/** Legacy descriptive title — kept for backward compat with any existing usage */
function getLevelTitle(points: number) {
  const level = getDonorLevel(points);
  return level.name;
}

function computeLevelProgress(points: number, level: DonorLevel): { progress: number; pointsToNext: number } {
  if (!level.nextThreshold) {
    return { progress: 1, pointsToNext: 0 };
  }
  const range = level.nextThreshold - level.minPoints;
  const gained = points - level.minPoints;
  return {
    progress: Math.min(1, gained / range),
    pointsToNext: Math.max(0, level.nextThreshold - points),
  };
}

function getNextMilestone(points: number) {
  const next = POINT_MILESTONES.find((milestone) => milestone.target > points);

  if (!next) {
    return {
      label: 'Referência comunitária',
      current: points,
      target: points,
      note: 'Você já ultrapassou os marcos iniciais desta fase.',
    };
  }

  return {
    label: next.label,
    current: points,
    target: next.target,
    note: `Faltam ${next.target - points} pontos para o próximo marco.`,
  };
}

export function getPredictedDonationPoints(status: DonationStatus = 'PENDING') {
  return STATUS_POINTS[status];
}

export function buildImpactSnapshot(donations: DonationRecord[]): ImpactSnapshot {
  const ordered = [...donations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const totalPoints = ordered.reduce((sum, donation) => sum + donation.pointsAwarded, 0);
  const completed = ordered.filter((donation) => COMPLETED_STATUSES.includes(donation.status));
  const tracked = ordered.filter((donation) => TRACKED_STATUSES.includes(donation.status));
  const active = ordered.filter((donation) => ACTIVE_STATUSES.includes(donation.status));
  const itemCount = ordered.reduce((sum, donation) => sum + donation.itemCount, 0);
  const monthlyDonations = ordered.filter(
    (donation) => getMonthKey(donation.createdAt) === getCurrentMonthKey(),
  ).length;
  const usedDropOffPoints = new Set(
    ordered.map((donation) => donation.dropOffPoint?.id).filter(Boolean),
  ).size;
  const streakMonths = getMonthlyStreak(ordered);
  const nextMilestone = getNextMilestone(totalPoints);
  const level = getDonorLevel(totalPoints);
  const { progress: levelProgress, pointsToNext: pointsToNextLevel } = computeLevelProgress(totalPoints, level);

  return {
    points: totalPoints,
    pointsLabel: 'Pontos solidários',
    levelTitle: getLevelTitle(totalPoints),
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
      note: 'Ranking opt-in segue preparado para uma integração futura com dados de comunidade.',
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
        'Doação registrada e pronta para acompanhar.',
      date: formatDateLabel(donation.createdAt),
      points: `+${donation.pointsAwarded} pts`,
    })),
  };
}

export function buildPostDonationReward(donations: DonationRecord[]): PostDonationReward {
  const snapshot = buildImpactSnapshot(donations);
  const predictedPoints = getPredictedDonationPoints('PENDING');
  const currentPointsAfterCreate = snapshot.points + predictedPoints;
  const nextMilestone = getNextMilestone(currentPointsAfterCreate);

  return {
    points: predictedPoints,
    label: 'Pontuação prevista desta entrega',
    note: 'Ao registrar a doação, seu progresso passa a refletir esta nova jornada no sistema.',
    milestone: {
      label: nextMilestone.label,
      current: currentPointsAfterCreate,
      target: nextMilestone.target,
    },
    monthlyGoal: {
      current: Math.min(snapshot.monthlyGoal.current + 1, MONTHLY_GOAL_TARGET),
      target: MONTHLY_GOAL_TARGET,
    },
  };
}

export const donorImpactSnapshot = buildImpactSnapshot([]);
export const postDonationReward = buildPostDonationReward([]);
