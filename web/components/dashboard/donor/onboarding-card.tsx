import Link from 'next/link';
import { ArrowRight, MapPin, Package, Plus } from 'lucide-react';

type OnboardingStep = {
  number: number;
  label: string;
  description: string;
  icon: typeof Plus;
};

const STEPS: OnboardingStep[] = [
  {
    number: 1,
    label: 'Encontrar ponto',
    description: 'Veja parceiros próximos no mapa.',
    icon: MapPin,
  },
  {
    number: 2,
    label: 'Separar peças',
    description: 'Roupas em bom estado, limpas e dobradas.',
    icon: Package,
  },
  {
    number: 3,
    label: 'Registrar doação',
    description: 'Cadastre na plataforma para rastrear.',
    icon: Plus,
  },
];

type OnboardingCardProps = {
  firstName: string;
};

export function OnboardingCard({ firstName }: OnboardingCardProps) {
  return (
    <article className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-deeper to-primary-dark p-8 text-white shadow-[0_18px_40px_-20px_rgba(0,51,60,0.45)]">
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -right-5 -top-3 h-52 w-52 opacity-20"
      >
        <circle cx="100" cy="100" r="80" stroke="#b2e8e3" strokeWidth="1" fill="none" strokeDasharray="3 4" />
        <circle cx="100" cy="100" r="50" stroke="#e8a33d" strokeWidth="1" fill="none" strokeDasharray="2 3" />
      </svg>

      <header className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-amber">
          Comece por aqui
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
          Sua primeira doação em 3 passos
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-primary-muted/80">
          Olá, {firstName}. Veja como funciona a entrega solidária no VestGO.
        </p>
      </header>

      <ol className="relative flex flex-col gap-3">
        {STEPS.map((step) => (
          <li
            key={step.number}
            className="flex items-start gap-4 rounded-2xl border border-primary-muted/10 bg-white/[0.06] px-4 py-3.5"
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-amber text-[13px] font-extrabold text-primary-deeper">
              {step.number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{step.label}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-primary-muted/75">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <Link
        href="/mapa"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-amber px-5 py-3.5 text-sm font-bold text-primary-deeper transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
      >
        Ver pontos próximos
        <ArrowRight size={15} />
      </Link>
    </article>
  );
}
