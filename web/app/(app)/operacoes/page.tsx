import { Route } from 'lucide-react';
import { redirect } from 'next/navigation';
import { OperationalBoard } from '@/components/donations/operational-board';
import { auth } from '@/lib/auth';
import {
  getOperationalDonations,
  type DonationStatus,
  type OperationalFilters,
} from '@/lib/api';

const ROLE_LABELS: Record<string, string> = {
  COLLECTION_POINT: 'Ponto de coleta',
  NGO: 'ONG parceira',
  ADMIN: 'Administracao operacional',
};

function getSingleSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function buildFiltersFromSearchParams(searchParams?: Record<string, string | string[] | undefined>) {
  const status = getSingleSearchParam(searchParams?.status) as DonationStatus | undefined;
  const collectionPointId = getSingleSearchParam(searchParams?.collectionPointId);
  const ngoId = getSingleSearchParam(searchParams?.ngoId);
  const actionableOnly = getSingleSearchParam(searchParams?.actionableOnly) === 'true';
  const direction = getSingleSearchParam(searchParams?.direction);

  const filters: OperationalFilters = {
    ...(status ? { status } : {}),
    ...(collectionPointId ? { collectionPointId } : {}),
    ...(ngoId ? { ngoId } : {}),
    ...(actionableOnly ? { actionableOnly: true } : {}),
    ...(direction === 'asc' || direction === 'desc' ? { direction } : {}),
    limit: 50,
    sortBy: 'updatedAt',
  };

  return filters;
}

export default async function OperacoesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  const accessToken = session?.user?.accessToken ?? '';
  const role = session?.user?.role ?? 'DONOR';

  if (!accessToken || role === 'DONOR') {
    redirect('/rastreio');
  }

  const response = await getOperationalDonations(accessToken, buildFiltersFromSearchParams(searchParams));

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="rounded-[2rem] bg-white p-5 shadow-card lg:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Painel operacional
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary-deeper">
              Fila de operação
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-500">
              Atualize o próximo passo das coletas sob sua responsabilidade e use filtros rápidos
              para focar no que precisa de ação.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary-light/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-deeper">
                {ROLE_LABELS[role] ?? role}
              </span>
              <span className="rounded-full bg-surface px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                {response.meta.count} doações neste recorte
              </span>
              <span className="rounded-full bg-surface px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                {response.meta.actionableCount} aguardando ação
              </span>
            </div>
          </div>

          <aside className="rounded-[2rem] bg-primary-deeper p-5 text-white shadow-card lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                  Rede configurada
                </p>
                <h2 className="mt-2 text-2xl font-bold">Parceiros ativos</h2>
              </div>
              <Route size={20} className="text-primary-muted" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-muted">
                  Pontos
                </p>
                <p className="mt-2 text-2xl font-bold">{response.meta.availableCollectionPoints.length}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-muted">
                  ONGs vinculadas
                </p>
                <p className="mt-2 text-2xl font-bold">{response.meta.availableNgos.length}</p>
              </div>
            </div>
          </aside>
        </section>

        <OperationalBoard
          initialDonations={response.data}
          role={role}
          availableCollectionPoints={response.meta.availableCollectionPoints}
          availableNgos={response.meta.availableNgos}
          initialFilters={response.meta.filters}
          actionableCount={response.meta.actionableCount}
        />

      </div>
    </div>
  );
}
