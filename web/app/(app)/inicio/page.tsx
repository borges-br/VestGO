import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  HeartHandshake,
  Map,
  MapPin,
  Package,
  Plus,
  Sparkles,
  Truck,
} from 'lucide-react';
import {
  BadgeCollectionCard,
  ImpactProgressCard,
  ImpactSummaryCard,
  RankingPreviewCard,
} from '@/components/gamification/impact-widgets';
import { auth } from '@/lib/auth';
import { getNearbyPoints, getUserDonations, type DonationRecord, type DonationStatus } from '@/lib/api';
import { buildImpactSnapshot } from '@/lib/gamification';

const quickActions = [
  {
    href: '/doar',
    label: 'Nova doacao',
    description: 'Registrar pecas',
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
    label: 'Meu impacto',
    description: 'Resumo pessoal',
    icon: HeartHandshake,
    tone: 'bg-amber-50 text-amber-600',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calcados',
  ACCESSORIES: 'Acessorios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

const STATUS_META: Record<
  DonationStatus,
  { label: string; tone: string; stepIndex: number }
> = {
  PENDING: { label: 'Pendente', tone: 'bg-amber-50 text-amber-600', stepIndex: 0 },
  AT_POINT: { label: 'No ponto', tone: 'bg-blue-50 text-blue-600', stepIndex: 1 },
  IN_TRANSIT: { label: 'Em transito', tone: 'bg-indigo-50 text-indigo-600', stepIndex: 2 },
  DELIVERED: { label: 'Entregue', tone: 'bg-primary-light text-primary', stepIndex: 3 },
  DISTRIBUTED: { label: 'Distribuida', tone: 'bg-emerald-50 text-emerald-600', stepIndex: 3 },
  CANCELLED: { label: 'Cancelada', tone: 'bg-red-50 text-red-500', stepIndex: 0 },
};

function formatDateLabel(input: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(input));
}

export default async function InicioPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'voce';
  const accessToken = session?.user?.accessToken ?? '';

  let donations: DonationRecord[] = [];
  let nearbyPoints: Awaited<ReturnType<typeof getNearbyPoints>>['data'] = [];

  if (accessToken) {
    try {
      const [donationsResponse, pointsResponse] = await Promise.all([
        getUserDonations(accessToken, { limit: 20 }),
        getNearbyPoints({ lat: -23.5505, lng: -46.6333, radius: 15, limit: 2 }),
      ]);
      donations = donationsResponse.data;
      nearbyPoints = pointsResponse.data;
    } catch {
      donations = [];
      nearbyPoints = [];
    }
  }

  const snapshot = buildImpactSnapshot(donations);
  const latestDonation = donations[0] ?? null;
  const recentDonations = donations.slice(0, 3);
  const latestStatus = latestDonation ? STATUS_META[latestDonation.status] : null;
  const progressSteps = ['Registrada', 'No ponto parceiro', 'Em transito', 'Entregue ao destino'];

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="overflow-hidden rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <Sparkles size={14} />
                Central do doador
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                dados reais ativos
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">Ola, {firstName}.</p>
                <p className="mt-3 max-w-2xl text-base leading-8 text-primary-muted">
                  Seu dashboard agora reflete doacoes reais registradas, o estado atual da sua
                  jornada e o progresso de impacto acumulado no VestGO.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/doar"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                  >
                    <Plus size={16} />
                    Registrar nova doacao
                  </Link>
                  <Link
                    href="/rastreio"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    <Truck size={16} />
                    Ver meu rastreio
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    `${snapshot.points} pontos solidarios`,
                    `${snapshot.streak.value} meses de participacao`,
                    `${snapshot.monthlyGoal.current}/${snapshot.monthlyGoal.target} na meta do mes`,
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white/10 p-5 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-muted">
                  Ultima doacao
                </p>

                {latestDonation ? (
                  <>
                    <p className="mt-3 text-xl font-semibold">{latestDonation.itemLabel}</p>
                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-on-surface">
                      <p className="text-sm font-semibold">Status atual: {latestStatus?.label}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {latestDonation.dropOffPoint?.organizationName ?? latestDonation.dropOffPoint?.name ?? 'Destino em definicao'} - ultima atualizacao em {formatDateLabel(latestDonation.updatedAt)}
                      </p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-muted">
                        Reconhecimento ativo
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        +{latestDonation.pointsAwarded} pontos nesta jornada
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {progressSteps.map((step, index, array) => {
                        const done = index <= (latestStatus?.stepIndex ?? 0);
                        return (
                          <div key={step} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                  done ? 'bg-primary text-white' : 'bg-white/15 text-primary-muted'
                                }`}
                              >
                                <Package size={14} />
                              </div>
                              {index < array.length - 1 && (
                                <div className={`mt-1 h-5 w-px ${done ? 'bg-primary' : 'bg-white/20'}`} />
                              )}
                            </div>
                            <p className={`pt-1 text-sm ${done ? 'font-semibold text-white' : 'text-primary-muted'}`}>
                              {step}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl bg-white/5 px-4 py-5">
                    <p className="text-sm font-semibold text-white">Sua primeira doacao ainda nao foi registrada.</p>
                    <p className="mt-2 text-sm leading-7 text-primary-muted">
                      Assim que voce concluir o wizard, esta area passa a acompanhar o status real da entrega.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ImpactSummaryCard snapshot={snapshot} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.85fr)_minmax(0,0.95fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Acoes rapidas
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">O que voce pode fazer agora</h2>
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
                  Pontos proximos
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Onde doar</h2>
              </div>
              <MapPin size={20} className="text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              {nearbyPoints.length > 0 ? (
                nearbyPoints.map((point) => (
                  <div key={point.id} className="rounded-3xl bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          {point.organizationName ?? point.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {point.distanceKm ? `${point.distanceKm} km - ` : ''}
                          {point.address}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                          {point.acceptedCategories.slice(0, 3).map((item) => CATEGORY_LABELS[item] ?? item).join(' - ')}
                        </p>
                      </div>
                      <Link href={`/mapa/${point.id}`} className="mt-1 text-primary">
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-surface p-4">
                  <p className="text-sm font-semibold text-primary-deeper">Os pontos aparecem aqui quando o backend responder.</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    A estrutura ja esta pronta para listar parceiros reais da area de exploracao.
                  </p>
                </div>
              )}
            </div>

            <Link href="/mapa" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Explorar todos os pontos
              <ArrowRight size={15} />
            </Link>
          </div>

          <ImpactProgressCard snapshot={snapshot} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Historico resumido
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Impacto recente</h2>
              </div>
              <Link href="/rastreio" className="text-sm font-semibold text-primary">
                Ver tudo
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {snapshot.stats.map((item) => (
                <div key={item.label} className="rounded-[1.5rem] bg-surface p-4">
                  <p className="text-3xl font-bold text-primary-deeper">{item.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {recentDonations.length > 0 ? (
                recentDonations.map((donation) => {
                  const status = STATUS_META[donation.status];
                  return (
                    <Link
                      key={donation.id}
                      href={`/rastreio/${donation.id}`}
                      className="flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-4 transition-all hover:shadow-card-lg"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                        <Package size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-on-surface">{donation.itemLabel}</p>
                        <p className="mt-1 text-sm text-gray-400">
                          {donation.dropOffPoint?.organizationName ?? donation.dropOffPoint?.name ?? 'Destino em definicao'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.tone}`}>
                          {status.label}
                        </span>
                        <span className="rounded-full bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                          +{donation.pointsAwarded} pts
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">Seu historico real comeca aqui.</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    Assim que a primeira doacao for criada pelo wizard, ela passa a aparecer neste bloco.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <BadgeCollectionCard badges={snapshot.badges} compact />
            <RankingPreviewCard snapshot={snapshot} />
          </div>
        </section>
      </div>
    </div>
  );
}
