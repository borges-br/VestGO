import { cn } from '@/lib/utils';
import { DONATION_STATUS_CONFIG } from '@/components/donations/donation-status';
import type { DonationStatus } from '@/lib/api';

interface StatusBadgeProps {
  status: DonationStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  showIcon = false,
  size = 'sm',
  className,
}: StatusBadgeProps) {
  const config = DONATION_STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      aria-label={`Status: ${config.label}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        size === 'sm'
          ? 'px-2.5 py-0.5 text-[11px] tracking-[0.08em]'
          : 'px-3 py-1 text-xs tracking-[0.06em]',
        config.bg,
        config.color,
        className,
      )}
    >
      {showIcon && <Icon size={size === 'sm' ? 11 : 13} aria-hidden />}
      {config.label}
    </span>
  );
}
