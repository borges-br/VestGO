import { ClipboardList, Package, Plus, Route, Target } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  DONATION_STATUS_CONFIG,
  formatDonationDateLabel,
} from '@/components/donations/donation-status';
import { auth } from '@/lib/auth';
import {
  getOperationalDonations,
  getUserDonations,
  type DonationRecord,
} from '@/lib/api';
import { buildImpactSnapshot } from '@/lib/gamification';

export default async function RastreioPage() {
  const session = await auth();
  const accessToken = session?.user?.accessToken ?? '';
  const role = session?.user?.role ?? 'DONOR';

  if (role !== 'DONOR') {
    const fallbackResponse = {
      data: [] as DonationRecord[],
      meta: {
        count: 0,
        actionableCount: 0,
        statusCounts: {},
        availableCollectionPoints: [],
        availableNgos: [],
        filters: {
          status: null,
          collectionPointId: null,
          ngoId: null,
          actionableOnly: false,
          sortBy: 'updatedAt' as const,
          direction: 'desc' as const,
        },
      },
    };

    const response = accessToken
      ? await getOperationalDonations(accessToken, {
          limit: 30,
          sortBy: 'updatedAt',
          direction: 'desc',
        }).catch(() => fallbackResponse)
      : fallbackResponse;

    const donations = response.data;
    const statusCounts: Partial<Record<'PENDING' | 'AT_POINT' | 'IN_TRANSIT' | 'DELIVERED' | 'DISTRIBUTED' | 'CANCELLED', number>> =
      response.meta.statusCounts ?? {};

    const summaryCards = [
      { label: 'Total', value: String(response.meta.count), color: 'text-on-surface dark:text-gray-100' },
      {
        label: 'Aguardando ação',
        value: String(response.meta.actionableCount),
        color: 'text-amber-600 dark:text-amber-400',
      },
      {
        label: 'No ponto',
        value: String(statusCounts.AT_POINT ?? 0),
        color: 'text-blue-600 dark:text-blue-400',
      },
      {
        label: 'Distribuídas',
        value: String(statusCounts.DISTRIBUTED ?? 0),
        color: 'text-primary dark:text-primary-muted',
      },
    ];

    return (
      <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell space-y-4">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Rastreio operacional
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary-deeper dark:text-white sm:text-4xl">
              Acompanhamento da jornada
            </h1>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              Esta tela mostra a evolução das doações sob sua rede. Use <strong>/operacoes</strong>{' '}
              para executar a fila e <strong>/rastreio</strong> para acompanhar a timeline sem
              misturar os dois contextos.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map(({ label, value, color }) => (
              <div key={label} className="rounded-[1.75rem] bg-white p-4 shadow-card dark:bg-surface-inkSoft dark:shadow-none">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_360px]">
            <div className="rounded-[2rem] bg-white p-6 shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Timeline operacional
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-primary-deeper dark:text-white">
                    Doações mais recentes
                  </h2>
                </div>
                <Link href="/operacoes" className="text-sm font-semibold text-primary dark:text-primary-muted">
                  Abrir fila
                </Link>
              </div>

              {donations.length === 0 ? (
                <div className="py-16 text-center">
                  <Route size={40} className="mx-auto mb-4 text-gray-200 dark:text-gray-600" />
                  <p className="text-base font-semibold text-gray-400">
                    Nenhuma doação operacional ainda
                  </p>
                  <p className="mb-6 mt-1 text-sm text-gray-300 dark:text-gray-500">
                    Quando a rede gerar movimento real, o rastreio operacional aparece aqui.
                  </p>
                  <Link
                    href="/operacoes"
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-white"
                  >
                    <ClipboardList size={16} />
                    Ir para operações
                  </Link>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {donations.map((donation) => {
                    const statusConfig = DONATION_STATUS_CONFIG[donation.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <Link
                        key={donation.id}
                        href={`/rastreio/${donation.id}`}
                        className="block rounded-[1.75rem] border border-gray-100 bg-white p-4 transition-all hover:shadow-card-lg dark:border-white/10 dark:bg-surface-ink dark:hover:bg-surface-inkSoft"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
                            <Package size={20} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-on-surface dark:text-gray-100">
                                  {donation.itemLabel}
                                </p>
                                <p className="mt-1 truncate text-sm text-gray-400">
                                  {donation.dropOffPoint?.organizationName ??
                                    donation.dropOffPoint?.name ??
                                    'Destino em definição'}
                                </p>
                              </div>

                              <div className="flex flex-col items-start gap-2 sm:items-end">
                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.color}`}
                                >
                                  {statusConfig.label}
                                </span>
                                <span className="rounded-full bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:bg-surface-ink dark:text-gray-400">
                                  {donation.code}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                              <span className="inline-flex items-center gap-2">
                                <StatusIcon size={14} className={statusConfig.color} />
                                {formatDonationDateLabel(donation.updatedAt)}
                              </span>
                            </div>

                            {donation.latestEvent && (
                              <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                                {donation.latestEvent.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-[2rem] bg-white p-6 shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                      Distinção de contexto
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-primary-deeper dark:text-white">
                      Rastreio vs operações
                    </h2>
                  </div>
                  <Target size={20} className="text-primary dark:text-primary-muted" />
                </div>

                <div className="mt-5 rounded-[1.75rem] bg-surface p-5 dark:bg-surface-ink">
                  <p className="text-sm font-semibold text-primary-deeper dark:text-primary-muted">Rastreio</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-gray-400">
                    Visão de acompanhamento, histórico e leitura da jornada das doações.
                  </p>
                </div>

                <div className="mt-4 rounded-[1.75rem] bg-primary-light/45 p-5 dark:bg-primary/10">
                  <p className="text-sm font-semibold text-primary-deeper dark:text-primary-muted">Operações</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-gray-400">
                    Fila acionável para mudar status, responder pedidos e executar a rotina do papel.
                  </p>
                </div>
              </div>

              <Link
                href="/operacoes"
                className="flex items-center justify-center gap-2 rounded-[2rem] bg-primary-deeper px-5 py-4 font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                <ClipboardList size={18} />
                Abrir fila operacional
              </Link>
            </aside>
          </section>
        </div>
      </div>
    );
  }

  let donations: DonationRecord[] = [];

  if (accessToken) {
    try {
      const response = await getUserDonations(accessToken, { limit: 50 });
      donations = response.data;
    } catch {
      donations = [];
    }
  }

  const snapshot = buildImpactSnapshot(donations);

  const summaryCards = [
    { label: 'Total', value: String(donations.length), color: 'text-on-surface dark:text-gray-100' },
    {
      label: 'Em andamento',
      value: String(
        donations.filter((donation) =>
          ['PENDING', 'AT_POINT', 'IN_TRANSIT'].includes(donation.status),
        ).length,
      ),
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Concluídas',
      value: String(
        donations.filter((donation) =>
          ['DELIVERED', 'DISTRIBUTED'].includes(donation.status),
        ).length,
      ),
      color: 'text-primary dark:text-primary-muted',
    },
    {
      label: 'Pontos solidários',
      value: String(snapshot.points),
      color: 'text-primary-deeper dark:text-white',
    },
  ];

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Rastreio
          </p>
          <h1 className="mt-2 text-3xl font-bold text-primary-deeper dark:text-white sm:text-4xl">
            Minhas doações
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Acompanhe o status real de cada entrega e como isso movimenta seu impacto.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, color }) => (
            <div key={label} className="rounded-[1.75rem] bg-white p-4 shadow-card dark:bg-surface-inkSoft dark:shadow-none">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_360px]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Jornada das doações
                </p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper dark:text-white">
                  Status de cada entrega
                </h2>
              </div>
              <Link href="/doar" className="text-sm font-semibold text-primary dark:text-primary-muted">
                Nova doação
              </Link>
            </div>

            {donations.length === 0 ? (
              <div className="py-16 text-center">
                <Package size={40} className="mx-auto mb-4 text-gray-200 dark:text-gray-600" />
                <p className="text-base font-semibold text-gray-400">Nenhuma doação ainda</p>
                <p className="mb-6 mt-1 text-sm text-gray-300 dark:text-gray-500">
                  Comece sua primeira doação agora.
                </p>
                <Link
                  href="/doar"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-white"
                >
                  <Plus size={16} />
                  Nova doação
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {donations.map((donation) => {
                  const statusConfig = DONATION_STATUS_CONFIG[donation.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Link
                      key={donation.id}
                      href={`/rastreio/${donation.id}`}
                      className="block rounded-[1.75rem] border border-gray-100 bg-white p-4 transition-all hover:shadow-card-lg dark:border-white/10 dark:bg-surface-ink dark:hover:bg-surface-inkSoft"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
                          <Package size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-on-surface dark:text-gray-100">
                                {donation.itemLabel}
                              </p>
                              <p className="mt-1 truncate text-sm text-gray-400">
                                {donation.dropOffPoint?.organizationName ??
                                  donation.dropOffPoint?.name ??
                                  'Destino em definição'}
                              </p>
                            </div>

                            <div className="flex flex-col items-start gap-2 sm:items-end">
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.color}`}
                              >
                                {statusConfig.label}
                              </span>
                              <span className="rounded-full bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary dark:bg-surface-ink dark:text-primary-muted">
                                +{donation.pointsAwarded} pts
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                            <span className="inline-flex items-center gap-2">
                              <StatusIcon size={14} className={statusConfig.color} />
                              {formatDonationDateLabel(donation.createdAt)}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-300 dark:text-gray-500">
                              {donation.code}
                            </span>
                          </div>

                          {donation.latestEvent && (
                            <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                              {donation.latestEvent.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] bg-white p-6 shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Progresso ligado ao rastreio
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-primary-deeper dark:text-white">
                    Cada etapa conta
                  </h2>
                </div>
                <Target size={20} className="text-primary dark:text-primary-muted" />
              </div>

              <div className="mt-5 rounded-[1.75rem] bg-surface p-5 dark:bg-surface-ink">
                <p className="text-sm font-semibold text-primary-deeper dark:text-primary-muted">
                  {snapshot.nextMilestone.label}
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-gray-400">
                  {snapshot.nextMilestone.note}
                </p>
                <div className="mt-4 h-2 rounded-full bg-white dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${
                        snapshot.nextMilestone.target === 0
                          ? 100
                          : Math.min(
                              (snapshot.nextMilestone.current / snapshot.nextMilestone.target) *
                                100,
                              100,
                            )
                      }%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-primary dark:text-primary-muted">
                  {snapshot.nextMilestone.current}/{snapshot.nextMilestone.target} neste marco
                </p>
              </div>

              <div className="mt-4 rounded-[1.75rem] bg-primary-light/45 p-5 dark:bg-primary/10">
                <p className="text-sm font-semibold text-primary-deeper dark:text-primary-muted">Meta do mês em andamento</p>
                <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-gray-400">
                  {snapshot.monthlyGoal.current}/{snapshot.monthlyGoal.target} entregas
                  registradas neste ciclo.
                </p>
              </div>
            </div>

            <Link
              href="/doar"
              className="flex items-center justify-center gap-2 rounded-[2rem] bg-primary-deeper px-5 py-4 font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              <Plus size={18} />
              Registrar nova doação
            </Link>
          </aside>
        </section>
      </div>
    </div>
  );
}
