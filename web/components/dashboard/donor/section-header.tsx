import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type SectionHeaderProps = {
  kicker: string;
  title: string;
  action?: { label: string; href: string } | null;
};

export function SectionHeader({ kicker, title, action }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {kicker}
        </p>
        <h2 className="vg-text-primary mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
          {title}
        </h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary transition-colors hover:text-primary-deeper"
        >
          {action.label}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
