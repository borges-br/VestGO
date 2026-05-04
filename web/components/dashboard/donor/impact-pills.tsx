import { CalendarHeart, Flame, MapPin, Package } from 'lucide-react';

export type DonorImpactStats = {
  totalDonations: number;
  itemsDonated: number;
  partnersUsed: number;
  streakMonths: number;
};

type ImpactPillsProps = {
  stats: DonorImpactStats;
};

export function ImpactPills({ stats }: ImpactPillsProps) {
  const pills = [
    {
      icon: CalendarHeart,
      value: stats.totalDonations,
      label:
        stats.totalDonations === 1 ? 'doação registrada' : 'doações registradas',
    },
    {
      icon: Package,
      value: stats.itemsDonated,
      label: stats.itemsDonated === 1 ? 'peça doada' : 'peças doadas',
    },
    {
      icon: MapPin,
      value: stats.partnersUsed,
      label:
        stats.partnersUsed === 1 ? 'ponto parceiro' : 'pontos parceiros',
    },
    {
      icon: Flame,
      value: stats.streakMonths,
      label:
        stats.streakMonths === 1 ? 'mês consecutivo' : 'meses consecutivos',
    },
  ];

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-primary-deeper/10 border-y border-primary-deeper/10 sm:grid-cols-4 sm:divide-y-0">
      {pills.map(({ icon: Icon, value, label }) => (
        <div key={label} className="flex flex-col gap-2 px-5 py-5 first:border-l-0">
          <span className="inline-flex items-center text-primary">
            <Icon size={14} strokeWidth={1.6} />
          </span>
          <span className="text-3xl font-extrabold leading-none tracking-tight text-primary-deeper tabular-nums">
            {value.toLocaleString('pt-BR')}
          </span>
          <span className="text-[13px] leading-tight text-primary-deeper/65">{label}</span>
        </div>
      ))}
    </div>
  );
}
