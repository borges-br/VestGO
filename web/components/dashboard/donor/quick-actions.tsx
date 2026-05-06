import Link from 'next/link';
import {
  HelpCircle,
  MapPin,
  Plus,
  Truck,
  type LucideIcon,
} from 'lucide-react';

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const ACTIONS: QuickAction[] = [
  {
    href: '/doar',
    label: 'Como doar',
    description: 'Passo a passo da doação',
    icon: Plus,
  },
  {
    href: '/mapa',
    label: 'Explorar pontos',
    description: 'Mapa com parceiros próximos',
    icon: MapPin,
  },
  {
    href: '/rastreio',
    label: 'Minhas doações',
    description: 'Histórico e rastreio',
    icon: Truck,
  },
  {
    href: '/suporte',
    label: 'Suporte',
    description: 'Tire dúvidas com a equipe',
    icon: HelpCircle,
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="vg-card flex flex-col gap-2.5 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_14px_30px_-18px_rgba(0,51,60,0.2)] motion-reduce:hover:transform-none"
          >
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary"
            >
              <Icon size={20} strokeWidth={1.6} />
            </span>
            <div>
              <p className="vg-text-primary text-sm font-bold">{action.label}</p>
              <p className="vg-text-secondary mt-1 text-xs leading-relaxed">
                {action.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
