import type {
  CollectionPoint,
  DonationRecord,
  DonationStatus,
} from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';
import { buildImpactSnapshot } from '@/lib/gamification';
import type {
  DashboardAchievement,
  DashboardDonation,
  DashboardPoint,
  DonationStatusMeta,
  DonorDashboardData,
  DonorUserStats,
} from '@/components/donor-dashboard/types';

export const DEFAULT_NEARBY_COORDS = {
  lat: -23.50153,
  lng: -47.45256,
  label: 'Sorocaba/SP',
};

export const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calcados',
  ACCESSORIES: 'Acessorios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

export const STATUS_META: Record<DonationStatus, DonationStatusMeta> = {
  PENDING: { label: 'Pendente', tone: 'amber', step: 0 },
  AT_POINT: { label: 'No ponto', tone: 'blue', step: 1 },
  IN_TRANSIT: { label: 'Em transito', tone: 'indigo', step: 2 },
  DELIVERED: { label: 'Entregue', tone: 'primary', step: 3 },
  DISTRIBUTED: { label: 'Distribuida', tone: 'emerald', step: 3 },
  CANCELLED: { label: 'Cancelada', tone: 'red', step: 0 },
};

export const STATUS_TONE_CLASS: Record<DonationStatusMeta['tone'], string> = {
  amber: 'bg-[rgba(232,163,61,0.12)] text-[#b67100]',
  blue: 'bg-[rgba(45,99,166,0.10)] text-[#2d63a6]',
  indigo: 'bg-[rgba(78,69,170,0.10)] text-[#4e45aa]',
  primary: 'bg-[rgba(0,106,98,0.10)] text-primary',
  emerald: 'bg-[rgba(58,128,76,0.12)] text-[#3a804c]',
  red: 'bg-[rgba(196,78,58,0.10)] text-[#c44e3a]',
};

const TRACKED_STATUSES = new Set<DonationStatus>([
  'AT_POINT',
  'IN_TRANSIT',
  'DELIVERED',
  'DISTRIBUTED',
]);

function getMonthKey(input: string) {
  const date = new Date(input);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function formatDateShort(input: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(input));
}

function formatMonthYear(input: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(input));
}

function getDonationPoint(donation: DonationRecord) {
  const point = donation.dropOffPoint ?? donation.collectionPoint ?? donation.ngo;
  return point?.organizationName ?? point?.name ?? 'Destino em definicao';
}

export function mapDonationToDashboard(donation: DonationRecord): DashboardDonation {
  return {
    id: donation.id,
    itemLabel: donation.itemLabel,
    itemCount: donation.itemCount,
    status: donation.status,
    pointsAwarded: donation.pointsAwarded,
    point: getDonationPoint(donation),
    date: donation.updatedAt ?? donation.createdAt,
    href: `/rastreio/${donation.id}`,
    source: donation,
  };
}

export function mapPointToDashboard(point: CollectionPoint): DashboardPoint {
  return {
    id: point.id,
    name: point.organizationName ?? point.name,
    distanceKm: point.distanceKm ?? null,
    address: formatAddressSummary(point) ?? 'Endereco nao informado',
    categories: point.acceptedCategories.map((category) => CATEGORY_LABELS[category] ?? category),
    href: `/mapa/${point.id}`,
    source: point,
  };
}

function buildAchievements(donations: DonationRecord[]): DashboardAchievement[] {
  const snapshot = buildImpactSnapshot(donations);
  const ordered = [...donations].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const firstDonation = ordered[0];
  const firstTracked = ordered.find((donation) => TRACKED_STATUSES.has(donation.status));

  return snapshot.badges.map((badge) => {
    const earnedAtSource =
      badge.id === 'tracked-impact' ? firstTracked : firstDonation;

    return {
      id: badge.id,
      label: badge.label,
      earned: badge.earned,
      earnedAt: badge.earned && earnedAtSource ? formatMonthYear(earnedAtSource.createdAt) : undefined,
      progress: badge.progressLabel,
      description: badge.description,
      tone: badge.tone,
    };
  });
}

export function deriveDonorUserStats(donations: DonationRecord[]): DonorUserStats {
  const snapshot = buildImpactSnapshot(donations);
  const monthCount = new Set(donations.map((donation) => getMonthKey(donation.createdAt))).size;

  return {
    points: snapshot.points,
    totalDonations: donations.length,
    itemsDonated: donations.reduce((sum, donation) => sum + donation.itemCount, 0),
    partnersUsed: new Set(
      donations.map((donation) => donation.dropOffPoint?.id ?? donation.collectionPoint?.id).filter(Boolean),
    ).size,
    monthsActive: monthCount,
    streakMonths: snapshot.streak.value,
    monthlyGoal: {
      current: snapshot.monthlyGoal.current,
      target: snapshot.monthlyGoal.target,
    },
    monthlyRanking: null,
    achievements: buildAchievements(donations),
  };
}

export function buildDonorDashboardData({
  firstName,
  donations,
  nearbyPoints,
}: {
  firstName: string;
  donations: DonationRecord[];
  nearbyPoints: CollectionPoint[];
}): DonorDashboardData {
  const initials =
    firstName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'V';

  return {
    firstName,
    initials,
    donations: donations.map(mapDonationToDashboard),
    nearbyPoints: nearbyPoints.map(mapPointToDashboard),
    userStats: deriveDonorUserStats(donations),
  };
}
