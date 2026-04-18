import { Building2, Factory, Route } from 'lucide-react';
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
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Painel operacional
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary-deeper sm:text-4xl">
              Fila de operacao dedicada
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-500">
              Esta area separa a rotina operacional do rastreio do doador. Aqui voce acompanha a
              fila sob sua responsabilidade, aplica filtros por etapa e atualiza o fluxo real de
              cada doacao.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary-light/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-deeper">
                {ROLE_LABELS[role] ?? role}
              </span>
              <span className="rounded-full bg-surface px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                {response.meta.count} doacoes neste recorte
              </span>
              <span className="rounded-full bg-surface px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                {response.meta.actionableCount} aguardando acao
              </span>
            </div>
          </div>

          <aside className="rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card lg:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                  Rede configurada
                </p>
                <h2 className="mt-2 text-2xl font-bold">Ponto e ONG agora seguem parceria explicita</h2>
              </div>
              <Route size={20} className="text-primary-muted" />
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[1.5rem] bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-muted">
                  Pontos acessiveis
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

            <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
              <div className="flex items-start gap-3">
                <Factory size={18} className="mt-0.5 text-primary-muted" />
                <p className="text-sm leading-7 text-primary-muted">
                  A atribuicao da ONG nao depende mais de busca generica. Cada doacao segue a
                  parceria operacional configurada para o ponto selecionado.
                </p>
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

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-primary" />
              <div>
                <p className="text-sm font-semibold text-primary-deeper">Como cada perfil opera</p>
                <p className="mt-1 text-sm text-gray-500">
                  Ponto confirma recebimento e envio. ONG confirma entrega e distribuicao. Admin
                  acompanha e intervem quando necessario.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
            <p className="text-sm font-semibold text-primary-deeper">Reflexo no rastreio</p>
            <p className="mt-2 text-sm leading-7 text-gray-500">
              O doador continua vendo a mesma timeline, mas agora alimentada por uma operacao
              dedicada e por uma relacao explicita entre ponto e ONG.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
