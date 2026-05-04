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
    <div className="rounded-3xl border border-primary-deeper/[0.06] bg-surface-cream/50 px-6 py-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-deeper/55">
          Ranking do mês
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary-deeper/50">
          opcional
        </span>
      </div>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-3xl font-extrabold leading-none tracking-tight text-primary-deeper tabular-nums">
            #{data.position}
          </p>
          <p className="mt-1 text-xs text-primary-deeper/55">
            entre doadores em {data.scope}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[13px] font-bold tabular-nums text-primary">
            {data.monthlyGoal.current}/{data.monthlyGoal.target}
          </p>
          <p className="mt-0.5 text-[11px] text-primary-deeper/50">doações no mês</p>
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
