import type {
  CollectionPoint,
  DonationRecord,
  DonationStatus,
} from '@/lib/api';
import type { ImpactBadgeTone } from '@/lib/gamification';

export type DashboardDonation = {
  id: string;
  itemLabel: string;
  itemCount: number;
  status: DonationStatus;
  pointsAwarded: number;
  point: string;
  date: string;
  href: string;
  source: DonationRecord;
};

export type DashboardPoint = {
  id: string;
  name: string;
  distanceKm: number | null;
  address: string;
  categories: string[];
  href: string;
  source: CollectionPoint;
};

export type DashboardAchievement = {
  id: string;
  label: string;
  earned: boolean;
  earnedAt?: string;
  progress?: string;
  description: string;
  tone: ImpactBadgeTone;
};

export type MonthlyRanking = {
  position: number;
  scope: string;
  monthPoints: number;
} | null;

export type DonorUserStats = {
  points: number;
  totalDonations: number;
  itemsDonated: number;
  partnersUsed: number;
  monthsActive: number;
  streakMonths: number;
  monthlyGoal: {
    current: number;
    target: number;
  };
  monthlyRanking: MonthlyRanking;
  achievements: DashboardAchievement[];
};

export type DonorDashboardData = {
  firstName: string;
  initials: string;
  donations: DashboardDonation[];
  nearbyPoints: DashboardPoint[];
  userStats: DonorUserStats;
};

export type DonationStatusMeta = {
  label: string;
  tone: 'amber' | 'blue' | 'indigo' | 'primary' | 'emerald' | 'red';
  step: number;
};
