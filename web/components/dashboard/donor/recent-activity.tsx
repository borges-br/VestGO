import Link from 'next/link';
import type { DonationRecord } from '@/lib/api';
import { cn } from '@/lib/utils';
import { DONOR_STATUS_META, formatDonorDate } from './status-meta';
import {
  Package,
  Shirt,
  Footprints,
  Apple,
  Sparkles,
  HeartHandshake,
  Home,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; size?: number | string }>
> = {
  CLOTHING: Shirt,
  SHOES: Footprints,
  FOOD: Apple,
  ACCESSORIES: Sparkles,
  TOYS: HeartHandshake,
  BAGS: Package,
  OTHER: Package,
  BED_BATH: Home,
};

type RecentActivityProps = {
  donations: DonationRecord[];
};

export function RecentActivity({ donations }: RecentActivityProps) {
  if (donations.length === 0) {
    return (
      <div className="vg-card-soft rounded-3xl border-dashed px-7 py-9 text-center">
        <p className="vg-text-primary text-[15px] font-bold">
          Sua linha solidária aparece aqui.
        </p>
        <p className="vg-text-secondary mt-2 text-[13px] leading-relaxed">
          Cada doação registrada vira um marco com status, destino real e histórico de impacto.
        </p>
      </div>
    );
  }

  const items = donations.slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      {items.map((donation) => {
        const meta = DONOR_STATUS_META[donation.status];
        const originName =
          donation.collectionPoint?.organizationName ??
          donation.collectionPoint?.name ??
          donation.dropOffPoint?.organizationName ??
          donation.dropOffPoint?.name ??
          'Ponto de Coleta';

        const destinationName =
          donation.ngo?.organizationName ??
          donation.ngo?.name ??
          'Destino em definição';

        const mainCategory = donation.items?.[0]?.category || 'OTHER';
        const CategoryIcon = CATEGORY_ICONS[mainCategory] || Package;
        const totalPieces =
          donation.items?.reduce((sum, item) => sum + item.quantity, 0) ||
          donation.itemCount;

        return (
          <article
            key={donation.id}
            className="group relative overflow-hidden rounded-[20px] border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-card-lg"
          >
            <Link
              href={`/rastreio/${donation.id}`}
              className="flex items-center gap-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {/* Category Icon */}
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <CategoryIcon size={20} />
              </div>

              {/* Card Details */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-surface px-2 py-0.5 rounded">
                    {donation.code}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {formatDonorDate(donation.createdAt)}
                  </span>
                </div>

                <h3 className="vg-text-primary text-sm font-bold truncate">
                  {donation.itemLabel || 'Itens diversos'}
                </h3>

                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <span className="font-medium text-gray-700 truncate max-w-[120px] sm:max-w-none">
                    {originName}
                  </span>
                  <ArrowRight size={10} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {destinationName}
                  </span>
                </div>
              </div>

              {/* Right Side: Status / Quantities / Go Button */}
              <div className="flex flex-col items-end gap-2">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]',
                    meta.pill,
                  )}
                >
                  {meta.label}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-primary-deeper">
                    {totalPieces} {totalPieces === 1 ? 'peça' : 'peças'}
                  </span>
                  <span className="text-gray-400 group-hover:text-primary transition-colors">
                    <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
