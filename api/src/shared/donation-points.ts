import { DonationStatus } from '@prisma/client';

export const DONATION_STATUS_POINTS: Record<DonationStatus, number> = {
  PENDING: 60,
  AT_POINT: 90,
  IN_TRANSIT: 110,
  DELIVERED: 150,
  DISTRIBUTED: 180,
  CANCELLED: 0,
};

export const CONFIRMED_DONATION_STATUSES: DonationStatus[] = [
  DonationStatus.AT_POINT,
  DonationStatus.IN_TRANSIT,
  DonationStatus.DELIVERED,
  DonationStatus.DISTRIBUTED,
];

export function getDonationPointsValue(status: DonationStatus) {
  return DONATION_STATUS_POINTS[status] ?? 0;
}

export function isConfirmedDonationStatus(status: DonationStatus) {
  return CONFIRMED_DONATION_STATUSES.includes(status);
}
