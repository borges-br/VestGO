import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  HeartHandshake,
  MapPin,
  Navigation,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';

const trustSignals = [
  {
    icon: ShieldCheck,
    title: 'ONGs verificadas',
    description: 'Mais confiança para doar com clareza e destino responsável.',
  },
  {
    icon: Truck,
    title: 'Rastreio da doação',
    description: 'Acompanhe o caminho da entrega até a etapa final do impacto.',
  },
  {
    icon: HeartHandshake,
    title: 'Solidariedade organizada',
    description: 'Menos improviso, mais previsibilidade para doadores e instituições.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Separe o que ainda pode vestir alguém',
    description: 'Peças limpas e em bom estado entram em um fluxo mais digno e útil.',
  },
  {
    step: '02',
    title: 'Escolha um ponto parceiro com transparência',
    description: 'Veja parceiros próximos e registre sua entrega com mais segurança.',
  },
  {
    step: '03',
    title: 'Acompanhe a rota até o impacto',
    description: 'O VestGO transforma a doação em uma jornada visível, não em um ato perdido.',
  },
];

const impactStats = [
  { value: '45,8t', label: 'roupas coletadas', detail: 'mais peças reaproveitadas com destino útil' },
  { value: '12,4k', label: 'vidas alcançadas', detail: 'famílias e pessoas em situação de vulnerabilidade' },
  { value: '890', label: 'pontos parceiros', detail: 'rede de coleta organizada e verificável' },
  { value: '93%', label: 'entregas rastreadas', detail: 'mais transparência para quem doa e para quem recebe' },
];

const pointPreview = [
  {
    name: 'Hub Solidário Pinheiros',
    info: '1,8 km • roupas, calçados e cobertores',
    badge: 'Verificado',
  },
  {
    name: 'ONG Caminho da Luz',
    info: '3,1 km • triagem e distribuição',
    badge: 'Alta demanda',
  },
  {
    name: 'Centro de Coleta Bela Vista',
    info: '4,2 km • campanhas de inverno',
    badge: 'Aberto hoje',
  },
];

const trackingMoments = [
  { title: 'Doação registrada', detail: 'Você informa o volume e o ponto de entrega.' },
  { title: 'Recebida no ponto parceiro', detail: 'A instituição confirma a chegada da sua doação.' },
  { title: 'Encaminhada para a ONG', detail: 'O fluxo segue com visibilidade e atualização de status.' },
];

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/inicio');

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-shell items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-deeper text-sm font-bold text-white shadow-sm">
              VG
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-primary-deeper">VestGO</p>
              <p className="hidden text-[11px] uppercase tracking-[0.24em] text-gray-400 sm:block">
                Doação com propósito
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#como-funciona" className="text-sm font-medium text-gray-500 hover:text-primary-deeper">
              Como funciona
            </a>
            <a href="#impacto" className="text-sm font-medium text-gray-500 hover:text-primary-deeper">
              Impacto
            </a>
            <a href="#confianca" className="text-sm font-medium text-gray-500 hover:text-primary-deeper">
              Confiança
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-primary/30 hover:text-primary md:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary-deeper px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Criar conta
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,106,98,0.12),_transparent_36%),radial-gradient(circle_at_85%_20%,_rgba(178,232,227,0.45),_transparent_24%)]" />
          <div className="mx-auto grid max-w-shell gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:px-8 lg:pb-24 lg:pt-20">
            <div className="relative z-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
                <Sparkles size={14} />
                Roupas com destino visível
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-primary-deeper sm:text-5xl lg:text-6xl">
                Doe com confiança.
                <br />
                Acompanhe o caminho.
                <br />
                Amplifique o impacto.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-gray-500 sm:text-lg">
                O VestGO organiza a doação de roupas com mais transparência, previsibilidade e
                cuidado humano. Você encontra pontos parceiros, registra sua entrega e acompanha o
                percurso até a instituição responsável.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/cadastro"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                >
                  Começar minha doação
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login?callbackUrl=%2Fmapa"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm font-semibold text-gray-600 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Navigation size={16} />
                  Entrar para explorar pontos
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {trustSignals.map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-card backdrop-blur"
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
                      <Icon size={18} />
                    </div>
                    <p className="text-sm font-semibold text-on-surface">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-400">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10">
              <div className="relative overflow-hidden rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg sm:p-7">
                <div className="absolute -right-14 top-8 h-36 w-36 rounded-full bg-white/10" />
                <div className="absolute -bottom-16 right-10 h-44 w-44 rounded-full bg-primary/30" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-muted">
                        Transparência em cada etapa
                      </p>
                      <h2 className="mt-3 text-2xl font-bold leading-tight">
                        A doação deixa de ser invisível.
                      </h2>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-primary-muted">
                        Rastreio
                      </p>
                      <p className="mt-1 text-sm font-semibold">Em andamento</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl bg-white/10 p-4 backdrop-blur">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">Kit inverno registrado</p>
                        <p className="mt-1 text-xs text-primary-muted">
                          ONG parceira confirmada • coleta prevista para hoje
                        </p>
                      </div>
                      <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                        verificado
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      {trackingMoments.map((item, index) => (
                        <div key={item.title} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary">
                              <CheckCircle2 size={16} />
                            </div>
                            {index < trackingMoments.length - 1 && (
                              <div className="mt-1 h-7 w-px bg-white/20" />
                            )}
                          </div>
                          <div className="pt-1">
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-primary-muted">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white p-4 text-on-surface">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Por que isso importa
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        Doar com organização reduz perda, improviso e insegurança.
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/10 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                        Sinal de confiança
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                        <BadgeCheck size={16} />
                        Rede de parceiros com rastreio e validação.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="confianca" className="mx-auto max-w-shell px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                O problema que resolvemos
              </p>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-primary-deeper">
                Quando a doação depende só de boa intenção, muita coisa se perde no caminho.
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-500">
                O VestGO foi pensado para transformar solidariedade em fluxo confiável: menos
                desorganização logística, mais clareza para o doador e mais apoio para instituições
                que já atuam na ponta.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: 'Menos improviso',
                  description: 'A entrega deixa de depender de combinações soltas e pouco previsíveis.',
                },
                {
                  title: 'Mais transparência',
                  description: 'O doador entende onde a peça entrou e em que etapa ela está.',
                },
                {
                  title: 'Mais confiança social',
                  description: 'A plataforma valoriza instituições e pontos parceiros com mais organização.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[2rem] bg-primary-light/45 p-5 shadow-card">
                  <p className="text-lg font-semibold text-primary-deeper">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-shell px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                Como funciona
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-primary-deeper">
                Uma jornada simples para quem quer doar com mais propósito.
              </h2>
            </div>
            <Link
              href="/cadastro"
              className="hidden items-center gap-2 text-sm font-semibold text-primary lg:inline-flex"
            >
              Criar conta
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-sm font-bold text-primary">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold leading-tight text-on-surface">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="impacto" className="mx-auto max-w-shell px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <div className="rounded-[2.25rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary-muted">
                Impacto social
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-bold leading-tight">
                Quando a doação é organizada, o impacto social fica mais visível e mais confiável.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-primary-muted">
                O VestGO não é só uma vitrine de pontos de coleta. Ele organiza o encontro entre
                quem doa, quem recebe e quem transforma as peças em apoio real para outras pessoas.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {impactStats.map((item) => (
                  <div key={item.label} className="rounded-3xl bg-white/10 p-4 backdrop-blur">
                    <p className="text-3xl font-bold">{item.value}</p>
                    <p className="mt-1 text-sm font-semibold">{item.label}</p>
                    <p className="mt-2 text-xs leading-6 text-primary-muted">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2rem] bg-white p-6 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Confiança para quem chega agora
                </p>
                <p className="mt-3 text-2xl font-bold leading-tight text-primary-deeper">
                  Quem entra pela primeira vez precisa sentir clareza logo no começo.
                </p>
                <p className="mt-4 text-sm leading-7 text-gray-500">
                  Por isso a plataforma combina linguagem acolhedora, parceiros verificados e um
                  fluxo visual que mostra o valor da doação desde o primeiro clique.
                </p>
              </div>

              <div className="rounded-[2rem] bg-primary-light/55 p-6 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  O que o VestGO reforça
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    'solidariedade com organização',
                    'transparência no caminho da doação',
                    'credibilidade para instituições parceiras',
                    'mais clareza para quem quer ajudar',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary">
                        <CheckCircle2 size={15} />
                      </div>
                      <p className="text-sm font-medium capitalize text-primary-deeper">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-shell px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Preview de pontos
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                    Pontos de coleta com mais contexto para decidir melhor.
                  </h2>
                </div>
                <MapPin className="text-primary" size={22} />
              </div>

              <div className="mt-5 space-y-3">
                {pointPreview.map((point) => (
                  <div key={point.name} className="rounded-3xl border border-gray-100 bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{point.name}</p>
                        <p className="mt-1 text-sm text-gray-400">{point.info}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-primary shadow-sm">
                        {point.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/login?callbackUrl=%2Fmapa"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Entrar para explorar pontos
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Preview de rastreio
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                    Um fluxo que mostra que a sua doação não desapareceu.
                  </h2>
                </div>
                <Truck className="text-primary" size={22} />
              </div>

              <div className="mt-5 space-y-4">
                {trackingMoments.map((item, index) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary">
                        <CheckCircle2 size={16} />
                      </div>
                      {index < trackingMoments.length - 1 && (
                        <div className="mt-1 h-9 w-px bg-gray-200" />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                      <p className="mt-1 text-sm leading-7 text-gray-400">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl bg-primary-light/45 p-4">
                <p className="text-sm font-semibold text-primary-deeper">
                  Transparência também fortalece a confiança nas instituições.
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-500">
                  Quando o doador enxerga o caminho da doação, o gesto ganha mais continuidade,
                  credibilidade e vínculo com a causa.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-shell px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-24">
          <div className="overflow-hidden rounded-[2.25rem] bg-primary-deeper p-8 text-white shadow-card-lg sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary-muted">
                  Pronto para começar
                </p>
                <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                  Solidariedade com mais clareza inspira mais gente a voltar e doar de novo.
                </h2>
                <p className="mt-4 text-base leading-8 text-primary-muted">
                  Crie sua conta, encontre um ponto parceiro e comece a acompanhar doações com uma
                  experiência mais humana, confiável e organizada.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/cadastro"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                >
                  Quero doar com o VestGO
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                >
                  Já tenho conta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
