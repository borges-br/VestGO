import type { ItemCategory } from '@/lib/api';

export const CATEGORY_META: Record<ItemCategory, { label: string; short: string }> = {
  CLOTHING: { label: 'Roupas', short: 'Roupas' },
  SHOES: { label: 'Calcados', short: 'Calcados' },
  ACCESSORIES: { label: 'Acessorios', short: 'Acess.' },
  BAGS: { label: 'Bolsas', short: 'Bolsas' },
  TOYS: { label: 'Brinquedos', short: 'Brinq.' },
  FOOD: { label: 'Alimentos', short: 'Alim.' },
  OTHER: { label: 'Outros', short: 'Outros' },
};

interface CategoryGlyphProps {
  category: ItemCategory;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CategoryGlyph({
  category,
  size = 16,
  strokeWidth = 1.6,
  className,
}: CategoryGlyphProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (category) {
    case 'CLOTHING':
      return (
        <svg {...props}>
          <path d="M7 3 4 5 2.5 7.5 4.5 9 6 8v9h8V8l1.5 1 2-1.5L16 5l-3-2" />
          <path d="M7 3c0 1.5 1.2 2.5 3 2.5s3-1 3-2" />
        </svg>
      );
    case 'SHOES':
      return (
        <svg {...props}>
          <path d="M2.5 14v-3c0-1 .5-1.5 1.5-1.7l3-.8 2-2h2l1 2 3.5 1.5c1.5.5 2 1.5 2 3v1z" />
          <path d="M2.5 14h15l-.5 2H3z" />
          <path d="m11 6.5.5 2.5" />
        </svg>
      );
    case 'ACCESSORIES':
      return (
        <svg {...props}>
          <circle cx="6" cy="12" r="3" />
          <circle cx="14" cy="12" r="3" />
          <path d="M9 11.5h2" />
          <path d="M3.5 11 2 6l2-.5" />
          <path d="M16.5 11 18 6l-2-.5" />
        </svg>
      );
    case 'BAGS':
      return (
        <svg {...props}>
          <path d="M4 8h12l-1 9H5z" />
          <path d="M7 8V6c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5v2" />
        </svg>
      );
    case 'TOYS':
      return (
        <svg {...props}>
          <circle cx="10" cy="9" r="5" />
          <circle cx="5.5" cy="5" r="1.8" />
          <circle cx="14.5" cy="5" r="1.8" />
          <circle cx="8.3" cy="8.5" r=".6" fill="currentColor" stroke="none" />
          <circle cx="11.7" cy="8.5" r=".6" fill="currentColor" stroke="none" />
          <path d="M8.5 11c.5.5 2.5.5 3 0" />
          <path d="m5.5 14-1 3m10-3 1 3" />
        </svg>
      );
    case 'FOOD':
      return (
        <svg {...props}>
          <path d="M10 6C8 4 4 5 4 9c0 4 3 8 6 8s6-4 6-8c0-4-4-5-6-3z" />
          <path d="M10 6V4c0-1 1-2 2-1.5" />
          <path d="M8.5 3c.5 1 1.5 1.5 1.5 3" />
        </svg>
      );
    case 'OTHER':
    default:
      return (
        <svg {...props}>
          <path d="m3 7 7-3 7 3v6l-7 3-7-3z" />
          <path d="m3 7 7 3 7-3" />
          <path d="M10 10v6" />
        </svg>
      );
  }
}

