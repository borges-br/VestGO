import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { DonationStatus } from '@/lib/api';
import { formatDateTimeLabel } from '@/lib/date-time';

export const DONATION_STATUS_ORDER: DonationStatus[] = [
  'PENDING',
  'AT_POINT',
  'IN_TRANSIT',
  'DELIVERED',
  'DISTRIBUTED',
];

export const DONATION_STATUS_CONFIG: Record<
  DonationStatus,
  {
    label: string;
    description: string;
    color: string;
    bg: string;
    icon: LucideIcon;
  }
> = {
  PENDING: {
    label: 'Pendente',
    description: 'Doação registrada. Aguardando entrega no ponto de coleta.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    icon: Clock,
  },
  AT_POINT: {
    label: 'No ponto',
    description: 'Item recebido no ponto de coleta e aguardando o próximo passo.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: Package,
  },
  IN_TRANSIT: {
    label: 'Em trânsito',
    description: 'A doação está em deslocamento para o parceiro responsável.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Entregue',
    description: 'Chegou ao destino parceiro e já pode seguir para triagem social.',
    color: 'text-primary',
    bg: 'bg-primary-light',
    icon: CheckCircle,
  },
  DISTRIBUTED: {
    label: 'Distribuída',
    description: 'Doação distribuída para atendimento social. Obrigado por movimentar a solidariedade.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Cancelada',
    description: 'Esta doação foi cancelada.',
    color: 'text-red-500',
    bg: 'bg-red-50',
    icon: XCircle,
  },
};

export const DONATION_STATUS_ACTIONS: Record<
  DonationStatus,
  { label: string; description: string }
> = {
  PENDING: {
    label: 'Aguardando recebimento',
    description: 'A doação foi registrada e ainda não iniciou o fluxo operacional.',
  },
  AT_POINT: {
    label: 'Receber no ponto',
    description: 'Recebimento registrado no ponto parceiro.',
  },
  IN_TRANSIT: {
    label: 'Vincular a carga & despachar',
    description: 'Envio para a ONG parceira confirmado.',
  },
  DELIVERED: {
    label: 'Confirmar recebimento',
    description: 'Recebimento confirmado pela ONG parceira.',
  },
  DISTRIBUTED: {
    label: 'Marcar como distribuída',
    description: 'Distribuição social concluída.',
  },
  CANCELLED: {
    label: 'Cancelar doação',
    description: 'Doação cancelada antes da coleta.',
  },
};

export function formatDonationDateLabel(input: string) {
  return formatDateTimeLabel(input);
}
