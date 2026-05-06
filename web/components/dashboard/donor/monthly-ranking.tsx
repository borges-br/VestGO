import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export type MonthlyRankingData = {
  position: number;
  scope: string;
  monthlyGoal: { current: number; target: number };
};

type MonthlyRankingProps = {
  data: MonthlyRankingData;
};

export function MonthlyRanking({ data }: MonthlyRankingProps) {
  return (
    <div className="vg-card-soft rounded-3xl px-6 py-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="vg-text-secondary text-[11px] font-semibold uppercase tracking-[0.22em]">
          Ranking do mês
        </span>
        <span className="vg-text-muted text-[10px] font-bold uppercase tracking-[0.1em]">
          opcional
        </span>
      </div>
      <div className="flex items-end gap-4">
        <div>
          <p className="vg-text-primary text-3xl font-extrabold leading-none tracking-tight tabular-nums">
            #{data.position}
          </p>
          <p className="vg-text-secondary mt-1 text-xs">
            entre doadores em {data.scope}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[13px] font-bold tabular-nums text-primary">
            {data.monthlyGoal.current}/{data.monthlyGoal.target}
          </p>
          <p className="vg-text-muted mt-0.5 text-[11px]">doações no mês</p>
        </div>
      </div>
      <Link
        href="/perfil"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
      >
        Ver classificação
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}
