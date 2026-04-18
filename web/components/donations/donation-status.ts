import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { DonationStatus } from '@/lib/api';

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
    description: 'Doacao registrada. Aguardando entrega no ponto de coleta.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    icon: Clock,
  },
  AT_POINT: {
    label: 'No ponto',
    description: 'Item recebido no ponto de coleta e aguardando o proximo passo.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: Package,
  },
  IN_TRANSIT: {
    label: 'Em transito',
    description: 'A doacao esta em deslocamento para o parceiro responsavel.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Entregue',
    description: 'Chegou ao destino parceiro e ja pode seguir para triagem social.',
    color: 'text-primary',
    bg: 'bg-primary-light',
    icon: CheckCircle,
  },
  DISTRIBUTED: {
    label: 'Distribuida',
    description: 'Doacao distribuida para atendimento social. Obrigado pelo impacto.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Cancelada',
    description: 'Esta doacao foi cancelada.',
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
    description: 'A doacao foi registrada e ainda nao iniciou o fluxo operacional.',
  },
  AT_POINT: {
    label: 'Confirmar recebimento',
    description: 'Recebimento registrado no ponto parceiro.',
  },
  IN_TRANSIT: {
    label: 'Enviar para ONG',
    description: 'Envio para a ONG parceira confirmado.',
  },
  DELIVERED: {
    label: 'Confirmar entrega na ONG',
    description: 'Recebimento confirmado pela ONG parceira.',
  },
  DISTRIBUTED: {
    label: 'Marcar distribuicao',
    description: 'Distribuicao social concluida.',
  },
  CANCELLED: {
    label: 'Cancelar doacao',
    description: 'Doacao cancelada antes da coleta.',
  },
};

export function formatDonationDateLabel(input: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(input));
}
