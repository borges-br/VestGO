'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, MapPin, Navigation, Sparkles } from 'lucide-react';
import { SceneCanvas } from '@/components/ui/scene-canvas';
import { VestgoMark } from '@/components/branding/vestgo-mark';

const GlobeScene = dynamic(() => import('@/components/ui/vestgo-globe-scene'), {
  ssr: false,
  loading: () => null,
});

const signals = [
  { role: 'Doadores', dot: 'bg-primary-glow', copy: 'Pessoas separando peças com propósito.' },
  { role: 'Pontos de coleta', dot: 'bg-accent-amber', copy: 'Rede parceira organizada e verificável.' },
  { role: 'ONGs', dot: 'bg-[#9bc78a]', copy: 'Instituições transformando entrega em impacto.' },
];

interface VestgoHeroProps {
  signedIn?: boolean;
}

export function VestgoHero({ signedIn = false }: VestgoHeroProps) {
  const reduce = useReducedMotion();
  const primaryHref = signedIn ? '/doar' : '/cadastro';
  const primaryLabel = signedIn ? 'Começar uma doação' : 'Começar minha doação';
  const secondaryHref = signedIn ? '/mapa' : '/login?callbackUrl=%2Fmapa';
  const secondaryLabel = signedIn ? 'Ver pontos no mapa' : 'Entrar para explorar pontos';

  return (
    <section className="relative isolate overflow-hidden vg-ink">
      {/* Grid + noise overlays for texture */}
      <div className="pointer-events-none absolute inset-0 vg-grid-overlay" />
      <div className="pointer-events-none absolute inset-0 vg-noise" />

      {/* 3D Globe — full bleed, behind content */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute inset-0 opacity-90">
          <SceneCanvas camera={{ position: [0, 0, 3.6], fov: 50 }} dpr={[1, 1.75]}>
            <GlobeScene radius={1.35} />
          </SceneCanvas>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f22] via-[#0a1f22]/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#0a1f22]" />
      </div>

      {/* Top frame / wordmark row */}
      <div className="relative z-10">
        <div className="mx-auto flex max-w-shell items-center justify-between px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-white">
            <VestgoMark className="h-11 w-11" />
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-tight">VestGO</p>
              <p className="text-[11px] uppercase tracking-[0.28em] text-primary-muted">
                Rede solidária rastreável
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/70 md:flex">
            <a href="#jornada" className="transition-colors hover:text-white">Jornada</a>
            <a href="#impacto" className="transition-colors hover:text-white">Impacto</a>
            <a href="#confianca" className="transition-colors hover:text-white">Confiança</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:border-white/30 hover:bg-white/10 md:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-primary-deeper shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Criar conta
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-10 mx-auto grid max-w-shell gap-12 px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="relative">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="vg-eyebrow border border-primary-glow/25 bg-primary-glow/10 text-primary-muted"
          >
            <Sparkles size={13} className="text-primary-glow" />
            Plataforma solidária · rastreio real
          </motion.div>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="vg-display mt-6 max-w-[18ch] text-white text-[2.75rem] sm:text-6xl lg:text-[5.25rem]"
          >
            Doar não é um
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary-glow via-white to-accent-amber bg-clip-text text-transparent">
                gesto isolado.
              </span>
              <span
                aria-hidden
                className="absolute -bottom-2 left-0 right-0 h-[6px] rounded-full bg-gradient-to-r from-primary-glow/70 via-white/40 to-accent-amber/60 blur-md"
              />
            </span>
            <br />
            É uma <span className="italic text-white/85 font-light">rede</span>.
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-base leading-8 text-white/75 sm:text-lg"
          >
            O VestGO conecta doadores, pontos de coleta e ONGs parceiras em uma mesma rede
            rastreável. Cada peça tem um caminho, cada etapa tem um responsável — e quem doa
            acompanha o impacto até o final.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href={primaryHref}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-primary-deeper shadow-hero transition-transform hover:-translate-y-0.5"
            >
              {primaryLabel}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/10"
            >
              <Navigation size={16} />
              {secondaryLabel}
            </Link>
          </motion.div>

          {/* Signals row */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 grid max-w-xl gap-3 sm:grid-cols-3"
          >
            {signals.map((s) => (
              <div
                key={s.role}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`}>
                    <span className={`absolute inset-0 rounded-full ${s.dot} animate-pulse-ring`} />
                  </span>
                  {s.role}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/70">{s.copy}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating live-node card, anchored to the globe side */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:block"
        >
          <div className="absolute -left-6 top-8 w-[19rem] rounded-[2rem] border border-white/10 bg-[#0a1f22]/75 p-5 shadow-ring backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="vg-eyebrow border border-primary-glow/30 bg-primary-glow/10 text-primary-muted">
                Ao vivo
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-muted">
                Rede
              </span>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary-glow">
                <MapPin size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Hub Solidário Pinheiros</p>
                <p className="mt-1 text-xs text-white/60">
                  Recebeu <span className="text-primary-glow">12 peças</span> há 4min
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-xs">
              {[
                { role: 'Doador', where: 'Perdizes · SP', dot: 'bg-primary-glow' },
                { role: 'Ponto', where: 'Pinheiros · SP', dot: 'bg-accent-amber' },
                { role: 'ONG', where: 'Caminho da Luz', dot: 'bg-[#9bc78a]' },
              ].map((row) => (
                <div key={row.role} className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                  <span className="flex-1 text-white/60">{row.role}</span>
                  <span className="text-white/85">{row.where}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Status
              </span>
              <span className="text-xs font-semibold text-primary-glow">Rastreado · verificado</span>
            </div>
          </div>

          <div className="absolute -bottom-2 right-0 w-[14rem] rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-muted">
              Hoje na rede
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              312 <span className="text-sm font-medium text-white/60">peças em trânsito</span>
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary-glow to-accent-amber" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
