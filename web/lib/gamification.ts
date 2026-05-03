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
  color: 'gray' | 'primary' | 'emerald' | 'amber' | 'indigo' | 'violet' | 'rose';
  minPoints: number;
  nextThreshold?: number;
};

const donorLevelBase = [
  { name: 'Primeiro Gesto', color: 'gray', minPoints: 0 },
  { name: 'Doador Iniciante', color: 'primary', minPoints: 80 },
  { name: 'Semeador Solidário', color: 'emerald', minPoints: 240 },
  { name: 'Aliado do Bem', color: 'amber', minPoints: 500 },
  { name: 'Guardião Local', color: 'indigo', minPoints: 850 },
  { name: 'Guardião da Generosidade', color: 'violet', minPoints: 1250 },
  { name: 'Ponte Solidária', color: 'rose', minPoints: 2000 },
  { name: 'Mobilizador da Rede', color: 'primary', minPoints: 2900 },
  { name: 'Multiplicador Solidário', color: 'emerald', minPoints: 4000 },
  { name: 'Referência Comunitária', color: 'amber', minPoints: 5000 },
  { name: 'Cuidador Frequente', color: 'indigo', minPoints: 6500 },
  { name: 'Parceiro da Esperança', color: 'violet', minPoints: 8300 },
  { name: 'Força Coletiva', color: 'rose', minPoints: 10400 },
  { name: 'Líder de Impacto', color: 'primary', minPoints: 12800 },
  { name: 'Farol Solidário', color: 'emerald', minPoints: 15500 },
  { name: 'Construtor de Pontes', color: 'amber', minPoints: 18500 },
  { name: 'Guardião da Rede', color: 'indigo', minPoints: 21800 },
  { name: 'Mestre da Constância', color: 'violet', minPoints: 25400 },
  { name: 'Voz da Comunidade', color: 'rose', minPoints: 29300 },
  { name: 'Embaixador do Impacto', color: 'primary', minPoints: 33500 },
  { name: 'Benfeitor Regional', color: 'emerald', minPoints: 38100 },
  { name: 'Elo Transformador', color: 'amber', minPoints: 43100 },
  { name: 'Guardião Supremo', color: 'indigo', minPoints: 48500 },
  { name: 'Arquiteto do Bem', color: 'violet', minPoints: 54300 },
  { name: 'Legado Solidário', color: 'rose', minPoints: 60500 },
  { name: 'Referência Nacional', color: 'primary', minPoints: 67200 },
  { name: 'Inspirador da Rede', color: 'emerald', minPoints: 74400 },
  { name: 'Grande Embaixador', color: 'amber', minPoints: 82100 },
  { name: 'Lenda Solidária', color: 'indigo', minPoints: 90300 },
  { name: 'Herói Solidário Supremo', color: 'violet', minPoints: 99000 },
] satisfies Array<Omit<DonorLevel, 'nextThreshold'>>;

// Curva de 30 níveis. Os níveis 1-10 seguem a base definida pelo produto:
// 0, 80, 240, 500, 850, 1250, 2000, 2900, 4000, 5000.
// Do 11 ao 30, os saltos crescem progressivamente para exigir mais esforço
// a cada faixa. A fonte oficial de pontos continua sendo o backend atual;
// o ledger definitivo e as regras por item entram na Fase 2.
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
  { label: 'Nível 2', target: 80 },
  { label: 'Nível 3', target: 240 },
  { label: 'Nível 4', target: 500 },
  { label: 'Nível 5', target: 850 },
  { label: 'Nível 6', target: 1250 },
  { label: 'Nível 7', target: 2000 },
  { label: 'Nível 8', target: 2900 },
  { label: 'Nível 9', target: 4000 },
  { label: 'Nível 10', target: 5000 },
];

// Regra oficial atual do backend: pointsAwarded ainda vem por status.
// A regra final por item, estado, multiplicadores e distribuição depende
// de PointLedger/DonationPointEvent na Fase 2 e não é recalculada aqui.
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
  const next = POINT_MILESTONES.find((milestone) => milestone.target > points);

  if (!next) {
    const level = getDonorLevel(points);
    return {
      label: level.nextThreshold ? `Próximo nível` : 'Nível máximo',
      current: points,
      target: level.nextThreshold ?? points,
      note: level.nextThreshold
        ? `Faltam ${level.nextThreshold - points} pontos para o próximo nível.`
        : 'Você alcançou o último nível desta curva.',
    };
  }

  return {
    label: next.label,
    current: points,
    target: next.target,
    note: `Faltam ${next.target - points} pontos para o próximo nível.`,
  };
}

function getItemQuantity(donations: DonationRecord[]) {
  return donations.reduce((sum, donation) => {
    const itemQuantity = donation.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    return sum + (itemQuantity > 0 ? itemQuantity : donation.itemCount);
  }, 0);
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
    pointsLabel: 'Pontos solidários',
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
