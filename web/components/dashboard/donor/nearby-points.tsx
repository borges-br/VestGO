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
      <div className="rounded-2xl border border-dashed border-primary-deeper/12 bg-surface-cream/40 px-6 py-6">
        <p className="text-sm font-bold text-primary-deeper">
          Nenhum ponto verificado por aqui ainda.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-primary-deeper/55">
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
              className="flex gap-4 rounded-2xl border border-primary-deeper/[0.06] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25 motion-reduce:hover:transform-none"
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
                  <p className="truncate text-sm font-bold text-primary-deeper">{name}</p>
                  {point.distanceKm != null && (
                    <span className="flex-shrink-0 text-[11px] font-bold uppercase tracking-wide text-primary tabular-nums">
                      {point.distanceKm} km
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs leading-relaxed text-primary-deeper/55">
                  {address}
                </p>
                {categories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-deeper/60"
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
