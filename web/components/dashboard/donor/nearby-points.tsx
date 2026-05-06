import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { CollectionPoint } from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  TOYS: 'Brinquedos',
  FOOD: 'Alimentos',
  OTHER: 'Outros',
};

type NearbyPointsProps = {
  points: CollectionPoint[];
};

export function NearbyPoints({ points }: NearbyPointsProps) {
  if (points.length === 0) {
    return (
      <div className="vg-card-soft rounded-2xl border-dashed px-6 py-6">
        <p className="vg-text-primary text-sm font-bold">
          Nenhum ponto verificado por aqui ainda.
        </p>
        <p className="vg-text-secondary mt-2 text-xs leading-relaxed">
          Assim que um parceiro publicar o perfil na sua região, ele aparece nesta lista.
        </p>
      </div>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {points.slice(0, 3).map((point) => {
        const name = point.organizationName ?? point.name;
        const address = formatAddressSummary(point) ?? 'Endereço não informado';
        const categories = point.acceptedCategories.slice(0, 3);
        return (
          <li key={point.id}>
            <Link
              href={`/mapa/${point.id}`}
              className="vg-card flex gap-4 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25 motion-reduce:hover:transform-none"
              aria-label={`Abrir ${name}`}
            >
              <span
                aria-hidden
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary"
              >
                <MapPin size={18} strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="vg-text-primary truncate text-sm font-bold">{name}</p>
                  {point.distanceKm != null && (
                    <span className="flex-shrink-0 text-[11px] font-bold uppercase tracking-wide text-primary tabular-nums">
                      {point.distanceKm} km
                    </span>
                  )}
                </div>
                <p className="vg-text-secondary mt-1 truncate text-xs leading-relaxed">
                  {address}
                </p>
                {categories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-[var(--vg-bg-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--vg-text-secondary)]"
                      >
                        {CATEGORY_LABELS[c] ?? c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
