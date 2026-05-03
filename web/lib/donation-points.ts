import type {
  DonationItemCondition,
  DonationStatus,
  ItemCategory,
} from '@/lib/api';

// Mirror of api/src/shared/donation-points.ts. Keep both files in sync if the
// formula evolves. The backend remains the source of truth for the persisted
// PointLedger; this helper only powers the wizard's preview and frontend UI.

export const POINTS_PER_ITEM_CONFIRMED = 10;
export const POINTS_PER_EXCELLENT_ITEM_BONUS = 5;
export const POINTS_PER_ITEM_DISTRIBUTED_BONUS = 5;

export function getCategoryMultiplier(uniqueCategories: number): number {
  if (uniqueCategories <= 1) return 1.0;
  if (uniqueCategories === 2) return 1.1;
  if (uniqueCategories === 3) return 1.2;
  if (uniqueCategories === 4) return 1.4;
  return 1.8;
}

export type DonationPointsItemInput = {
  category: ItemCategory;
  quantity: number;
  condition: DonationItemCondition;
};

export type DonationPointsBreakdown = {
  totalItems: number;
  excellentItems: number;
  uniqueCategories: number;
  categoryMultiplier: number;
  seasonalMultiplier: number;
  confirmationBase: number;
  conditionBonus: number;
  confirmationPoints: number;
  distributionBonus: number;
  totalPotentialPoints: number;
  pointsForCurrentStatus: number;
};

export function calculateDonationPointsBreakdown(input: {
  items: DonationPointsItemInput[];
  status: DonationStatus;
}): DonationPointsBreakdown {
  const items = input.items ?? [];
  const totalItems = items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
  const excellentItems = items
    .filter((item) => item.condition === 'EXCELLENT')
    .reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
  const uniqueCategories = new Set(items.map((item) => item.category)).size;
  const categoryMultiplier = getCategoryMultiplier(uniqueCategories);
  const seasonalMultiplier = 1;

  const confirmationBase = totalItems * POINTS_PER_ITEM_CONFIRMED;
  const conditionBonus = excellentItems * POINTS_PER_EXCELLENT_ITEM_BONUS;
  const confirmationSubtotal = confirmationBase + conditionBonus;
  const confirmationPoints = Math.round(confirmationSubtotal * categoryMultiplier);
  const distributionBonus = totalItems * POINTS_PER_ITEM_DISTRIBUTED_BONUS;
  const totalPotentialPoints = confirmationPoints + distributionBonus;

  let pointsForCurrentStatus = 0;
  switch (input.status) {
    case 'PENDING':
    case 'CANCELLED':
      pointsForCurrentStatus = 0;
      break;
    case 'AT_POINT':
    case 'IN_TRANSIT':
    case 'DELIVERED':
      pointsForCurrentStatus = confirmationPoints;
      break;
    case 'DISTRIBUTED':
      pointsForCurrentStatus = totalPotentialPoints;
      break;
  }

  return {
    totalItems,
    excellentItems,
    uniqueCategories,
    categoryMultiplier,
    seasonalMultiplier,
    confirmationBase,
    conditionBonus,
    confirmationPoints,
    distributionBonus,
    totalPotentialPoints,
    pointsForCurrentStatus,
  };
}
