import { redirect } from 'next/navigation';
import { OperationalBoard } from '@/components/donations/operational-board';
import { OperationalBatchesPanel } from '@/components/operations/operational-batches-panel';
import { auth } from '@/lib/auth';
import {
  getMyProfile,
  getOperationalBatches,
  getOperationalDonations,
  type DonationStatus,
  type OperationalFilters,
} from '@/lib/api';

function getSingleSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isDonationStatus(value: string | undefined): value is DonationStatus {
  return (
    value === 'PENDING' ||
    value === 'AT_POINT' ||
    value === 'IN_TRANSIT' ||
    value === 'DELIVERED' ||
    value === 'DISTRIBUTED' ||
    value === 'CANCELLED'
  );
}
function buildFiltersFromSearchParams(searchParams?: Record<string, string | string[] | undefined>) {
  const statusParam = getSingleSearchParam(searchParams?.status);
  const collectionPointId = getSingleSearchParam(searchParams?.collectionPointId);
  const ngoId = getSingleSearchParam(searchParams?.ngoId);
  const actionableOnly = getSingleSearchParam(searchParams?.actionableOnly) === 'true';
  const direction = getSingleSearchParam(searchParams?.direction);

  const filters: OperationalFilters = {
    ...(isDonationStatus(statusParam) ? { status: statusParam } : {}),
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

  const activeFilters = buildFiltersFromSearchParams(searchParams);
  const kpiFilters = {
    ...activeFilters,
    status: undefined,
    limit: 1,
  };

  const [response, kpiResponse, batchesResponse, profile] = await Promise.all([
    getOperationalDonations(accessToken, activeFilters),
    getOperationalDonations(accessToken, kpiFilters),
    role !== 'NGO'
      ? getOperationalBatches(accessToken, { limit: 50 })
      : Promise.resolve({ data: [] }),
    getMyProfile(accessToken).catch(() => null),
  ]);

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell">
        <OperationalBoard
          initialDonations={response.data}
          role={role}
          availableCollectionPoints={response.meta.availableCollectionPoints}
          availableNgos={response.meta.availableNgos}
          initialFilters={response.meta.filters}
          statusCounts={kpiResponse.meta.statusCounts ?? {}}
          actionableCount={kpiResponse.meta.actionableCount}
          organizationName={
            profile?.organizationName ??
            session?.user?.organizationName ??
            session?.user?.name ??
            null
          }
          operatorName={session?.user?.name ?? null}
          publicProfileState={profile?.publicProfileState ?? null}
          verifiedAt={profile?.verifiedAt ?? null}
        >
          {role !== 'NGO' && (
            <OperationalBatchesPanel
              accessToken={accessToken}
              role={role}
              initialBatches={batchesResponse.data}
              availableCollectionPoints={response.meta.availableCollectionPoints}
              availableNgos={response.meta.availableNgos}
            />
          )}
        </OperationalBoard>
      </div>
    </div>
  );
}
