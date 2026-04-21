import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { VestgoHero } from '@/components/ui/vestgo-hero';
import { MotionSection } from '@/components/ui/motion-section';
import { StatusTrack, type TrackStep } from '@/components/ui/status-track';
import { VestgoMark } from '@/components/branding/vestgo-mark';

const journeySteps: TrackStep[] = [
  {
    id: 'donor',
    label: 'Doador registra a doação',
    description: 'Separa peças, escolhe um ponto parceiro e gera um código rastreável.',
    caption: 'Doador',
    role: 'donor',
    iconName: 'Users',
    status: 'done',
  },
  {
    id: 'point',
    label: 'Ponto de coleta recebe',
    description: 'A rede confirma a chegada e organiza a triagem com visibilidade.',
    caption: 'Ponto parceiro',
    role: 'point',
    iconName: 'Boxes',
    status: 'done',
  },
  {
    id: 'ngo',
    label: 'ONG parceira retira',
    description: 'Instituição verificada assume a guarda e segue para a distribuição.',
    caption: 'ONG',
    role: 'ngo',
    iconName: 'Truck',
    status: 'active',
  },
  {
    id: 'impact',
    label: 'Solidariedade entregue',
    description: 'A peça chega até quem precisa, e o doador acompanha o fechamento.',
    caption: 'Solidariedade',
    role: 'impact',
    iconName: 'HeartHandshake',
    status: 'pending',
  },
];

const impactStats = [
  { value: '45,8t', label: 'roupas coletadas', sub: 'peças reaproveitadas com destino útil.' },
  { value: '12,4k', label: 'vidas alcançadas', sub: 'pessoas em situação de vulnerabilidade.' },
  { value: '890', label: 'pontos parceiros', sub: 'rede de coleta organizada e verificável.' },
  { value: '93%', label: 'entregas rastreadas', sub: 'transparência de ponta a ponta.' },
];

const trustPillars = [
  {
    icon: ShieldCheck,
    title: 'ONGs verificadas',
    description: 'Parcerias auditadas antes de aparecerem na rede — sem vitrine improvisada.',
  },
  {
    icon: Truck,
    title: 'Rastreio real',
    description: 'Cada doação ganha um código e uma linha do tempo compartilhada com o doador.',
  },
  {
    icon: HeartHandshake,
    title: 'Rede viva',
    description: 'Pontos, ONGs e admin conversam na mesma plataforma, com papéis definidos.',
  },
];

const pointPreview = [
  { name: 'Hub Solidário Pinheiros', info: '1,8 km · roupas, calçados e cobertores', badge: 'Verificado' },
  { name: 'ONG Caminho da Luz', info: '3,1 km · triagem e distribuição', badge: 'Alta demanda' },
  { name: 'Centro de Coleta Bela Vista', info: '4,2 km · campanhas de inverno', badge: 'Aberto hoje' },
];

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/inicio');

  return (
    <div className="min-h-screen bg-surface">
      <VestgoHero signedIn={false} />

      {/* Seção 2: Jornada solidária — ligação visual direta com o hero */}
      <section id="jornada" className="relative bg-surface-cream">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,106,98,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-shell px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <MotionSection className="max-w-3xl" direction="up">
            <span className="vg-eyebrow border border-primary/15 bg-white text-primary">
              <Sparkles size={13} /> Jornada solidária
            </span>
            <h2 className="mt-5 vg-display text-primary-deeper text-4xl sm:text-5xl lg:text-[3.75rem]">
              De quem doa até quem recebe,
              <br />
              <span className="text-primary">em uma única linha do tempo.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
              No VestGO, a doação não some em caixas, grupos de WhatsApp ou campanhas soltas.
              Ela entra em um fluxo rastreável — do doador à família beneficiada — com cada
              etapa tendo um responsável visível.
            </p>
          </MotionSection>

          <MotionSection className="mt-14" delay={0.15}>
            <StatusTrack steps={journeySteps} orientation="horizontal" tone="light" />
          </MotionSection>

          <MotionSection className="mt-14" delay={0.25}>
            <div className="grid gap-4 rounded-[2rem] border border-white bg-white/70 p-6 shadow-card backdrop-blur md:grid-cols-4 lg:p-8">
              {impactStats.map((stat) => (
                <div key={stat.label} className="rounded-3xl bg-white p-5 shadow-card">
                  <p className="text-3xl font-bold tracking-tight text-primary-deeper lg:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">{stat.label}</p>
                  <p className="mt-2 text-xs leading-6 text-gray-500">{stat.sub}</p>
                </div>
              ))}
            </div>
          </MotionSection>
        </div>
      </section>

      {/* Seção 3: Como funciona — 3 passos, linguagem institucional */}
      <section id="como-funciona" className="bg-white">
        <div className="mx-auto max-w-shell px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <MotionSection direction="up">
              <span className="vg-eyebrow border border-primary/15 bg-primary-light text-primary">
                Como funciona
              </span>
              <h2 className="mt-5 vg-display text-primary-deeper text-3xl sm:text-4xl lg:text-[2.75rem]">
                Uma jornada simples,
                <br />
                pensada para quem doa
                <br />
                <span className="text-primary">com propósito.</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-8 text-gray-500">
                Três passos claros no app, desenhados para reduzir improviso e criar confiança
                tanto para quem doa quanto para quem organiza a rede.
              </p>
              <Link
                href="/cadastro"
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Criar conta
                <ArrowRight size={15} />
              </Link>
            </MotionSection>

            <div className="space-y-4">
              {[
                {
                  step: '01',
                  title: 'Separe peças que ainda podem vestir alguém',
                  body: 'Roupas limpas e em bom estado entram num fluxo mais digno. Você nunca doa no vazio.',
                },
                {
                  step: '02',
                  title: 'Escolha um ponto parceiro verificado',
                  body: 'Veja pontos próximos com categorias aceitas e horário, e registre sua entrega com segurança.',
                },
                {
                  step: '03',
                  title: 'Acompanhe a rota até o impacto',
                  body: 'Cada doação vira uma linha do tempo — da triagem até a ONG que transformou a peça em apoio.',
                },
              ].map((s, i) => (
                <MotionSection key={s.step} delay={0.08 * i}>
                  <div className="group flex items-start gap-5 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-card-lg lg:p-7">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-base font-bold text-primary">
                      {s.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold leading-tight text-on-surface">{s.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-gray-500">{s.body}</p>
                    </div>
                  </div>
                </MotionSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Seção 4: Confiança */}
      <section id="confianca" className="relative overflow-hidden bg-surface">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_90%_20%,rgba(0,106,98,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-shell px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <MotionSection>
              <span className="vg-eyebrow border border-primary/15 bg-white text-primary">
                Confiança
              </span>
              <h2 className="mt-5 vg-display text-primary-deeper text-3xl sm:text-4xl lg:text-[2.75rem]">
                Solidariedade com
                <br />
                <span className="text-primary">responsabilidade institucional.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-gray-500">
                A plataforma combina identidade por papéis, verificação de ONGs, parcerias ponto↔ONG
                e revisão de alterações críticas em perfis públicos — para que a boa intenção encontre
                um caminho seguro.
              </p>
            </MotionSection>

            <div className="grid gap-4 sm:grid-cols-2">
              {trustPillars.map((item, i) => (
                <MotionSection key={item.title} delay={0.08 * i}>
                  <div className="h-full rounded-[2rem] border border-gray-100 bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-card-lg">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                      <item.icon size={20} strokeWidth={1.8} />
                    </div>
                    <p className="text-lg font-semibold text-primary-deeper">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-gray-500">{item.description}</p>
                  </div>
                </MotionSection>
              ))}
              <MotionSection delay={0.24}>
                <div className="h-full rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg sm:col-span-2">
                  <div className="flex items-center gap-3">
                    <BadgeCheck size={18} className="text-primary-glow" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                      Governança
                    </p>
                  </div>
                  <p className="mt-3 text-xl font-semibold leading-snug sm:text-2xl">
                    Alterações críticas em perfis públicos passam por revisão. Visibilidade
                    pública só depois de verificação.
                  </p>
                  <p className="mt-4 text-sm leading-7 text-primary-muted">
                    A rede é construída devagar, não improvisada. Isso é o que transforma doação em
                    uma infraestrutura em que dá pra confiar.
                  </p>
                </div>
              </MotionSection>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 5: Preview mapa + rastreio */}
      <section className="bg-white">
        <div className="mx-auto max-w-shell px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <MotionSection>
              <div className="h-full rounded-[2rem] border border-gray-100 bg-surface p-6 shadow-card lg:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="vg-eyebrow border border-primary/15 bg-white text-primary">
                      Pontos próximos
                    </span>
                    <h3 className="mt-4 text-2xl font-bold text-primary-deeper">
                      Mapa com contexto, não só PIN no mapa.
                    </h3>
                  </div>
                  <MapPin size={22} className="text-primary" />
                </div>
                <div className="mt-6 space-y-3">
                  {pointPreview.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-start justify-between gap-3 rounded-3xl bg-white p-4 shadow-card"
                    >
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{p.name}</p>
                        <p className="mt-1 text-sm text-gray-500">{p.info}</p>
                      </div>
                      <span className="rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold text-primary">
                        {p.badge}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/login?callbackUrl=%2Fmapa"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  Entrar para explorar o mapa
                  <ArrowRight size={15} />
                </Link>
              </div>
            </MotionSection>

            <MotionSection delay={0.1}>
              <div className="h-full overflow-hidden rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="vg-eyebrow border border-primary-glow/30 bg-primary-glow/10 text-primary-muted">
                      Rastreio
                    </span>
                    <h3 className="mt-4 text-2xl font-bold">
                      Sua doação deixa de ser invisível.
                    </h3>
                  </div>
                  <Truck size={22} className="text-primary-glow" />
                </div>

                <div className="mt-6 rounded-3xl bg-white/5 p-4 backdrop-blur">
                  <StatusTrack
                    steps={journeySteps.map((s, idx) => ({
                      ...s,
                      status: idx < 2 ? 'done' : idx === 2 ? 'active' : 'pending',
                    }))}
                    orientation="vertical"
                    tone="dark"
                  />
                </div>

                <p className="mt-6 text-sm leading-7 text-primary-muted">
                  Quando o doador enxerga o caminho, o gesto ganha continuidade. É assim que a rede
                  cresce por confiança, não por campanha.
                </p>
              </div>
            </MotionSection>
          </div>
        </div>
      </section>

      {/* Seção 6: CTA final */}
      <section id="impacto" className="relative overflow-hidden vg-ink">
        <div className="pointer-events-none absolute inset-0 vg-grid-overlay opacity-60" />
        <div className="pointer-events-none absolute inset-0 vg-noise" />
        <div className="relative mx-auto max-w-shell px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <MotionSection className="mx-auto max-w-3xl text-center">
            <span className="vg-eyebrow mx-auto border border-primary-glow/30 bg-primary-glow/10 text-primary-muted">
              Pronto para começar
            </span>
            <h2 className="vg-display mt-6 text-white text-4xl sm:text-5xl lg:text-[4rem]">
              Comece com <span className="text-primary-glow">1 peça.</span>
              <br />
              Veja a rede trabalhar.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              Crie sua conta, encontre um ponto parceiro e acompanhe a primeira doação do começo ao
              impacto. O VestGO cuida da organização — você cuida do gesto.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-primary-deeper shadow-hero transition-transform hover:-translate-y-0.5"
              >
                Quero doar com o VestGO
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                Já tenho conta
              </Link>
            </div>
          </MotionSection>
        </div>

        {/* Footer mínimo */}
        <footer className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-shell flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 text-white">
              <VestgoMark className="h-9 w-9" />
              <div className="leading-tight">
                <p className="text-sm font-bold">VestGO</p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary-muted">
                  Rede solidária rastreável
                </p>
              </div>
            </div>
            <p className="text-xs text-white/50">
              © {new Date().getFullYear()} VestGO · Solidariedade com organização.
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}
