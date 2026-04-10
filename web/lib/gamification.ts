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

export type ImpactSnapshot = {
  points: number;
  pointsLabel: string;
  levelTitle: string;
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
  { label: 'Primeiro marco solidario', target: 120 },
  { label: 'Constancia em evolucao', target: 300 },
  { label: 'Guardiao da recorrencia', target: 500 },
  { label: 'Impacto recorrente', target: 800 },
  { label: 'Referencia comunitaria', target: 1200 },
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

function getLevelTitle(points: number) {
  if (points >= 1200) {
    return 'Constancia que gera impacto';
  }

  if (points >= 800) {
    return 'Impacto recorrente em consolidacao';
  }

  if (points >= 300) {
    return 'Participacao com ritmo consistente';
  }

  if (points >= 120) {
    return 'Primeiros marcos de impacto';
  }

  return 'Primeiros passos solidarios';
}

function getNextMilestone(points: number) {
  const next = POINT_MILESTONES.find((milestone) => milestone.target > points);

  if (!next) {
    return {
      label: 'Referencia comunitaria',
      current: points,
      target: points,
      note: 'Voce ja ultrapassou os marcos iniciais desta fase.',
    };
  }

  return {
    label: next.label,
    current: points,
    target: next.target,
    note: `Faltam ${next.target - points} pontos para o proximo marco.`,
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

  return {
    points: totalPoints,
    pointsLabel: 'Pontos solidarios',
    levelTitle: getLevelTitle(totalPoints),
    nextMilestone,
    monthlyGoal: {
      label: 'Meta do mes',
      current: monthlyDonations,
      target: MONTHLY_GOAL_TARGET,
      note:
        monthlyDonations === 0
          ? 'Sua meta mensal comeca na primeira doacao registrada.'
          : 'Meta calculada a partir das doacoes reais deste mes.',
    },
    streak: {
      value: streakMonths,
      label: 'meses consecutivos com participacao',
      note: 'A constancia considera meses seguidos com ao menos uma doacao registrada.',
    },
    ranking: {
      position: null,
      scope: 'comunidade local',
      note: 'Ranking opt-in segue preparado para uma integracao futura com dados de comunidade.',
    },
    stats: [
      { value: String(completed.length), label: 'doacoes concluidas' },
      { value: String(itemCount), label: 'itens registrados' },
      { value: String(usedDropOffPoints), label: 'pontos parceiros usados' },
      { value: String(active.length), label: 'jornadas em andamento' },
    ],
    badges: [
      {
        id: 'first-donation',
        label: 'Primeira entrega',
        description: 'Reconhece a primeira doacao registrada na plataforma.',
        tone: 'primary',
        earned: ordered.length >= 1,
      },
      {
        id: 'tracked-impact',
        label: 'Jornada rastreada',
        description: 'Doacao acompanhada ate uma etapa real da jornada logistica.',
        tone: 'indigo',
        earned: tracked.length >= 1,
        progressLabel: tracked.length === 0 ? 'Aguardando a primeira jornada acompanhada' : undefined,
      },
      {
        id: 'steady-donor',
        label: 'Constancia solidaria',
        description: 'Participacao recorrente em mais de um ciclo mensal.',
        tone: 'emerald',
        earned: streakMonths >= 2,
        progressLabel: streakMonths < 2 ? `${streakMonths} de 2 meses consecutivos` : undefined,
      },
      {
        id: 'local-impact',
        label: 'Impacto local',
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
        'Doacao registrada e pronta para acompanhar.',
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
    label: 'Pontuacao prevista desta entrega',
    note: 'Ao registrar a doacao, seu progresso passa a refletir esta nova jornada no sistema.',
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
