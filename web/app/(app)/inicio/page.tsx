import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock3,
  HeartHandshake,
  Map,
  MapPin,
  Package,
  Plus,
  Sparkles,
  Star,
  Target,
  Truck,
} from 'lucide-react';
import { auth } from '@/lib/auth';

const quickActions = [
  {
    href: '/doar',
    label: 'Nova doação',
    description: 'Registrar peças',
    icon: Plus,
    tone: 'bg-primary-deeper text-white',
  },
  {
    href: '/mapa',
    label: 'Explorar pontos',
    description: 'Encontrar parceiros',
    icon: Map,
    tone: 'bg-primary-light text-primary',
  },
  {
    href: '/rastreio',
    label: 'Acompanhar status',
    description: 'Ver andamento',
    icon: Truck,
    tone: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/perfil',
    label: 'Meu histórico',
    description: 'Resumo pessoal',
    icon: HeartHandshake,
    tone: 'bg-amber-50 text-amber-600',
  },
];

const recentDonations = [
  {
    id: 'VGO-104',
    title: 'Kit inverno • 6 peças',
    point: 'ONG Caminho da Luz',
    status: 'Em trânsito',
    tone: 'bg-indigo-50 text-indigo-600',
  },
  {
    id: 'VGO-097',
    title: 'Calçados e agasalhos',
    point: 'Hub Solidário Pinheiros',
    status: 'Entregue',
    tone: 'bg-primary-light text-primary',
  },
  {
    id: 'VGO-088',
    title: 'Roupas infantis',
    point: 'Centro Bela Vista',
    status: 'Distribuída',
    tone: 'bg-emerald-50 text-emerald-600',
  },
];

const nearbyPoints = [
  {
    name: 'Hub Solidário Pinheiros',
    distance: '1,8 km',
    note: 'Aberto hoje até 20h',
    focus: 'Aceita roupas, calçados e cobertores',
  },
  {
    name: 'ONG Caminho da Luz',
    distance: '3,1 km',
    note: 'Alta demanda de agasalhos',
    focus: 'Triagem e distribuição recorrente',
  },
];

const impactStats = [
  { value: '12', label: 'famílias alcançadas' },
  { value: '32kg', label: 'impacto acumulado' },
  { value: '7', label: 'doações registradas' },
];

export default async function InicioPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'você';

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <div className="overflow-hidden rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <Sparkles size={14} />
                Central do doador
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                atualização de hoje
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Olá, {firstName}.
                </p>
                <p className="mt-3 max-w-2xl text-base leading-8 text-primary-muted">
                  Sua última doação já está em movimento. O próximo passo está claro: acompanhar o
                  status ou registrar uma nova entrega quando estiver pronto.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/doar"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                  >
                    <Plus size={16} />
                    Registrar nova doação
                  </Link>
                  <Link
                    href="/rastreio"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    <Truck size={16} />
                    Ver meu rastreio
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white/10 p-5 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-muted">
                  Última doação
                </p>
                <p className="mt-3 text-xl font-semibold">Kit inverno • 6 peças</p>
                <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-on-surface">
                  <p className="text-sm font-semibold">Status atual: Em trânsito</p>
                  <p className="mt-1 text-sm text-gray-400">
                    ONG Caminho da Luz • atualização há 2 horas
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Registrada', done: true },
                    { label: 'No ponto parceiro', done: true },
                    { label: 'Em trânsito', done: true },
                    { label: 'Entregue à ONG', done: false },
                  ].map((step, index, array) => (
                    <div key={step.label} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            step.done ? 'bg-primary text-white' : 'bg-white/15 text-primary-muted'
                          }`}
                        >
                          <Package size={14} />
                        </div>
                        {index < array.length - 1 && (
                          <div className={`mt-1 h-5 w-px ${step.done ? 'bg-primary' : 'bg-white/20'}`} />
                        )}
                      </div>
                      <p
                        className={`pt-1 text-sm ${
                          step.done ? 'font-semibold text-white' : 'text-primary-muted'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Meu impacto
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Resumo pessoal</h2>
              </div>
              <BadgeCheck className="text-primary" size={22} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {impactStats.map((item) => (
                <div key={item.label} className="rounded-3xl bg-surface p-4">
                  <p className="text-3xl font-bold text-primary-deeper">{item.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl bg-primary-light/45 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary-deeper">Progresso solidário</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Base visual pronta para metas e conquistas.
                  </p>
                </div>
                <Target size={20} className="text-primary" />
              </div>
              <div className="mt-4 h-2 rounded-full bg-white">
                <div className="h-full w-3/5 rounded-full bg-primary" />
              </div>
              <p className="mt-2 text-xs font-medium text-primary-deeper">
                3 de 5 entregas para liberar o próximo marco visual
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Ações rápidas
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">O que você pode fazer agora</h2>
              </div>
              <ArrowRight size={18} className="text-primary" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickActions.map(({ href, label, description, icon: Icon, tone }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-start gap-4 rounded-3xl border border-gray-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{label}</p>
                    <p className="mt-1 text-sm text-gray-400">{description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Pontos próximos
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Onde doar</h2>
              </div>
              <MapPin size={20} className="text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              {nearbyPoints.map((point) => (
                <div key={point.name} className="rounded-3xl bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{point.name}</p>
                      <p className="mt-1 text-sm text-gray-400">{point.distance} • {point.note}</p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                        {point.focus}
                      </p>
                    </div>
                    <Link href="/mapa" className="mt-1 text-primary">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/mapa"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              Explorar todos os pontos
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="rounded-[2rem] bg-primary-light/45 p-6 shadow-card lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Próximos passos
            </p>
            <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
              Um dashboard feito para decidir rápido.
            </h2>

            <div className="mt-5 space-y-3">
              {[
                'Registrar outra doação quando separar novas peças.',
                'Acompanhar a entrega em andamento pelo rastreio.',
                'Encontrar um ponto parceiro com melhor conveniência.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-3xl bg-white px-4 py-4 shadow-sm">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-primary">
                    <Star size={15} />
                  </div>
                  <p className="text-sm leading-7 text-gray-500">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Histórico resumido
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Suas últimas entregas</h2>
              </div>
              <Link href="/rastreio" className="text-sm font-semibold text-primary">
                Ver tudo
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentDonations.map((donation) => (
                <Link
                  key={donation.id}
                  href="/rastreio"
                  className="flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-4 transition-all hover:shadow-card-lg"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                    <Package size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">{donation.title}</p>
                    <p className="mt-1 text-sm text-gray-400">{donation.point}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${donation.tone}`}>
                      {donation.status}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-300">
                      {donation.id}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Janela futura
            </p>
            <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Espaço preparado para evolução</h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-3xl bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Conquistas em breve</p>
                    <p className="mt-1 text-sm text-gray-400">
                      Área reservada para badges, metas e reconhecimento de recorrência.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-primary-deeper p-5 text-white">
                <p className="text-sm font-semibold">Dica do dia</p>
                <p className="mt-2 text-sm leading-7 text-primary-muted">
                  Doações organizadas por tipo e volume ajudam a triagem a acontecer com mais
                  rapidez e menos retrabalho.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-muted">
                  <Clock3 size={14} />
                  leitura rápida
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
