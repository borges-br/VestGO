import type { DonationStatus } from '@/lib/api';

export type DonorStatusMeta = {
  label: string;
  /** Pre-built classes for the status pill background and foreground. */
  pill: string;
  /** 0..3 step index used by LastDonationTracker. */
  step: number;
};

export const DONOR_STATUS_META: Record<DonationStatus, DonorStatusMeta> = {
  PENDING: {
    label: 'Pendente',
    pill: 'bg-amber-50 text-amber-700',
    step: 0,
  },
  AT_POINT: {
    label: 'No ponto',
    pill: 'bg-blue-50 text-blue-700',
    step: 1,
  },
  IN_TRANSIT: {
    label: 'Em trânsito',
    pill: 'bg-indigo-50 text-indigo-700',
    step: 2,
  },
  DELIVERED: {
    label: 'Entregue',
    pill: 'bg-primary-light text-primary-deeper',
    step: 3,
  },
  DISTRIBUTED: {
    label: 'Distribuída',
    pill: 'bg-emerald-50 text-emerald-700',
    step: 3,
  },
  CANCELLED: {
    label: 'Cancelada',
    pill: 'bg-red-50 text-red-500',
    step: 0,
  },
};

export function formatDonorDate(input: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(input));
}
