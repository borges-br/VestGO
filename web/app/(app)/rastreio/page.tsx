import { ArrowRight, ClipboardList, Package, Plus, Route, Target } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OperationalBatchTraceCard } from '@/components/operations/operational-batch-trace-card';
import { auth } from '@/lib/auth';
import {
  getOperationalBatches,
  getOperationalDonations,
  getUserDonations,
  type DonationRecord,
  type OperationalBatchRecord,
} from '@/lib/api';
import { buildImpactSnapshot } from '@/lib/gamification';
import { TrackingBoard } from '@/components/donations/tracking-board';

export default async function RastreioPage() {
  const session = await auth();
  const accessToken = session?.user?.accessToken ?? '';
  const role = (session?.user?.role as 'DONOR' | 'NGO' | 'COLLECTION_POINT' | 'ADMIN') ?? 'DONOR';

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
    const fallbackBatchesResponse = {
      data: [] as OperationalBatchRecord[],
      meta: {
        count: 0,
        statusCounts: {
          OPEN: 0,
          READY_TO_SHIP: 0,
          IN_TRANSIT: 0,
          DELIVERED: 0,
          CLOSED: 0,
          CANCELLED: 0,
        },
      },
    };

    const [response, batchesResponse] = accessToken
      ? await Promise.all([
          getOperationalDonations(accessToken, {
            limit: 100, // Aumentado o limite para dar melhor suporte aos filtros da busca cliente
            sortBy: 'updatedAt',
            direction: 'desc',
          }).catch(() => fallbackResponse),
          getOperationalBatches(accessToken, { limit: 100 }).catch(() => fallbackBatchesResponse),
        ])
      : [fallbackResponse, fallbackBatchesResponse];

    const donations = response.data;
    const batches = batchesResponse.data;
    const statusCounts: Partial<Record<'PENDING' | 'AT_POINT' | 'IN_TRANSIT' | 'DELIVERED' | 'DISTRIBUTED' | 'CANCELLED', number>> =
      response.meta.statusCounts ?? {};

    const summaryCards = [
      { label: 'Total', value: String(response.meta.count), color: 'text-on-surface' },
      {
        label: 'Aguardando ação',
        value: String(response.meta.actionableCount),
        color: 'text-amber-600',
      },
      {
        label: 'No ponto',
        value: String(statusCounts.AT_POINT ?? 0),
        color: 'text-blue-600',
      },
      {
        label: 'Distribuídas',
        value: String(statusCounts.DISTRIBUTED ?? 0),
        color: 'text-primary',
      },
    ];

    return (
      <div className="vg-dark-fix px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell space-y-6">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Rastreio operacional
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary-deeper sm:text-4xl">
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
              <div key={label} className="rounded-[1.75rem] bg-white p-4 shadow-card">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="mt-1 text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </section>

          {batches.length > 0 && (
            <section className="rounded-[2rem] bg-white p-5 shadow-card lg:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Cargas acompanhadas
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                    Lotes operacionais recentes
                  </h2>
                </div>
                <Link href="/operacoes" className="text-sm font-semibold text-primary">
                  Gerenciar cargas
                </Link>
              </div>
              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {batches.slice(0, 4).map((batch) => (
                  <OperationalBatchTraceCard
                    key={batch.id}
                    compact
                    initialBatch={batch}
                    viewerRole={role}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_360px]">
            <div className="space-y-4">
              <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                      Timeline operacional
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                      Fila de rastreamento
                    </h2>
                  </div>
                  <Link href="/operacoes" className="text-sm font-semibold text-primary">
                    Abrir fila
                  </Link>
                </div>
              </div>

              <TrackingBoard
                initialDonations={donations}
                initialBatches={batches}
                viewerRole={role}
              />
            </div>

            <aside className="space-y-4">
              <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                      Distinção de contexto
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                      Rastreio vs operações
                    </h2>
                  </div>
                  <Target size={20} className="text-primary" />
                </div>

                <div className="mt-5 rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">Rastreio</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    Visão de acompanhamento, histórico e leitura da jornada das doações.
                  </p>
                </div>

                <div className="mt-4 rounded-[1.75rem] bg-primary-light/45 p-5">
                  <p className="text-sm font-semibold text-primary-deeper">Operações</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
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
      const response = await getUserDonations(accessToken, { limit: 100 });
      donations = response.data;
    } catch {
      donations = [];
    }
  }

  const snapshot = buildImpactSnapshot(donations);

  const totalItemsCount = donations.reduce((sum, donation) => {
    const itemQuantity = donation.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) ?? 0;
    return sum + (itemQuantity > 0 ? itemQuantity : donation.itemCount);
  }, 0);

  const summaryCards = [
    { label: 'Total', value: String(donations.length), color: 'text-on-surface' },
    {
      label: 'Em andamento',
      value: String(
        donations.filter((donation) =>
          ['PENDING', 'AT_POINT', 'IN_TRANSIT'].includes(donation.status),
        ).length,
      ),
      color: 'text-blue-600',
    },
    {
      label: 'Concluídas',
      value: String(
        donations.filter((donation) =>
          ['DELIVERED', 'DISTRIBUTED'].includes(donation.status),
        ).length,
      ),
      color: 'text-primary',
    },
    {
      label: 'Itens doados',
      value: String(totalItemsCount),
      color: 'text-primary-deeper',
    },
  ];

  return (
    <div className="vg-dark-fix px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-6">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Rastreio
          </p>
          <h1 className="mt-2 text-3xl font-bold text-primary-deeper sm:text-4xl">
            Minhas doações
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Acompanhe o status real de cada entrega e como isso movimenta seu impacto.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, color }) => (
            <div key={label} className="rounded-[1.75rem] bg-white p-4 shadow-card">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="mt-1 text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Jornada das doações
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                    Status de cada entrega
                  </h2>
                </div>
                <Link href="/doar" className="text-sm font-semibold text-primary">
                  Nova doação
                </Link>
              </div>
            </div>

            <TrackingBoard
              initialDonations={donations}
              viewerRole="DONOR"
            />
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Progresso de impacto
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                    Cada etapa conta
                  </h2>
                </div>
                <Target size={20} className="text-primary" />
              </div>

              <div className="mt-5 rounded-[1.75rem] bg-surface p-5">
                <p className="text-sm font-semibold text-primary-deeper">
                  {snapshot.nextMilestone.label}
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-500">
                  {snapshot.nextMilestone.note}
                </p>
                <div className="mt-4 h-2 rounded-full bg-white">
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
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                  {snapshot.nextMilestone.current}/{snapshot.nextMilestone.target} neste marco
                </p>
              </div>

              <div className="mt-4 rounded-[1.75rem] bg-primary-light/45 p-5">
                <p className="text-sm font-semibold text-primary-deeper">Meta do mês em andamento</p>
                <p className="mt-2 text-sm leading-7 text-gray-500">
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
