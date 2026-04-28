'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpDown, Filter, Target } from 'lucide-react';
import {
  DONATION_STATUS_ACTIONS,
  DONATION_STATUS_CONFIG,
  DONATION_STATUS_ORDER,
  formatDonationDateLabel,
} from '@/components/donations/donation-status';
import { StatusActionPanel } from '@/components/donations/status-action-panel';
import type { DonationPoint, DonationRecord, DonationStatus } from '@/lib/api';

const FILTER_OPTIONS: { value: 'ALL' | DonationStatus; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'AT_POINT', label: 'No ponto' },
  { value: 'IN_TRANSIT', label: 'Em trânsito' },
  { value: 'DELIVERED', label: 'Entregues' },
  { value: 'DISTRIBUTED', label: 'Distribuídas' },
];

interface OperationalBoardProps {
  initialDonations: DonationRecord[];
  role: string;
  availableCollectionPoints: DonationPoint[];
  availableNgos: DonationPoint[];
  initialFilters: {
    status: DonationStatus | null;
    collectionPointId: string | null;
    ngoId: string | null;
    actionableOnly: boolean;
    sortBy: 'updatedAt' | 'createdAt';
    direction: 'asc' | 'desc';
  };
  actionableCount: number;
}

function getOperationalLabel(role: string, donation: DonationRecord) {
  if (role === 'COLLECTION_POINT') {
    return donation.ngo?.organizationName ?? donation.ngo?.name ?? 'ONG ainda não vinculada';
  }

  if (role === 'NGO') {
    return (
      donation.collectionPoint?.organizationName ??
      donation.collectionPoint?.name ??
      'Ponto de origem não informado'
    );
  }

  return `${donation.collectionPoint?.organizationName ?? donation.collectionPoint?.name ?? 'Origem'} -> ${
    donation.ngo?.organizationName ?? donation.ngo?.name ?? 'Destino'
  }`;
}

function pointLabel(point: DonationPoint) {
  return point.organizationName ?? point.name;
}

function getNextActionLabel(donation: DonationRecord) {
  const nextStatus = donation.allowedNextStatuses[0];
  return nextStatus ? DONATION_STATUS_ACTIONS[nextStatus]?.label : null;
}

function OperationProgress({ status }: { status: DonationStatus }) {
  const activeIndex = DONATION_STATUS_ORDER.indexOf(status);

  return (
    <div className="flex items-center gap-1.5" aria-label={`Etapa atual: ${DONATION_STATUS_CONFIG[status].label}`}>
      {DONATION_STATUS_ORDER.map((step, index) => {
        const active = index <= activeIndex && activeIndex >= 0;

        return (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full ${
              active ? 'bg-primary' : 'bg-gray-200'
            }`}
          />
        );
      })}
    </div>
  );
}

export function OperationalBoard({
  initialDonations,
  role,
  availableCollectionPoints,
  availableNgos,
  initialFilters,
  actionableCount,
}: OperationalBoardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [donations, setDonations] = useState(initialDonations);

  useEffect(() => {
    setDonations(initialDonations);
  }, [initialDonations]);

  const summary = useMemo(
    () => ({
      total: donations.length,
      actionable: actionableCount,
      inMotion: donations.filter((donation) => ['AT_POINT', 'IN_TRANSIT'].includes(donation.status))
        .length,
      completed: donations.filter((donation) =>
        ['DELIVERED', 'DISTRIBUTED'].includes(donation.status),
      ).length,
    }),
    [actionableCount, donations],
  );

  function updateQuery(values: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(values)) {
      if (!value || value === 'ALL' || value === 'false') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const showCollectionPointFilter = role === 'ADMIN' || role === 'NGO';
  const showNgoFilter = role === 'ADMIN' || role === 'COLLECTION_POINT';

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-4">
        {[
          ['Total', summary.total, 'text-primary-deeper'],
          ['Ação', summary.actionable, 'text-primary'],
          ['Em fluxo', summary.inMotion, 'text-indigo-600'],
          ['Finalizadas', summary.completed, 'text-emerald-600'],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-[1.4rem] bg-white p-4 shadow-card">
            <p className={`text-2xl font-bold ${tone}`}>{value}</p>
            <p className="mt-1 text-xs font-semibold text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white p-4 shadow-card sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Operação
              </p>
              <h2 className="mt-1 text-2xl font-bold text-primary-deeper">Fila operacional</h2>
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {FILTER_OPTIONS.map((option) => {
                const isActive =
                  (initialFilters.status ?? 'ALL') ===
                  (option.value === 'ALL' ? null : option.value);

                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      updateQuery({
                        status: option.value === 'ALL' ? null : option.value,
                      })
                    }
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary-deeper text-white'
                        : 'bg-surface text-gray-500 hover:text-primary-deeper'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] bg-surface p-3 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
            {showCollectionPointFilter && (
              <label className="text-sm">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  <Filter size={12} />
                  Ponto
                </span>
                <select
                  value={initialFilters.collectionPointId ?? ''}
                  onChange={(event) =>
                    updateQuery({ collectionPointId: event.target.value || null })
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary/40"
                >
                  <option value="">Todos</option>
                  {availableCollectionPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {pointLabel(point)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {showNgoFilter && (
              <label className="text-sm">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  <Filter size={12} />
                  ONG
                </span>
                <select
                  value={initialFilters.ngoId ?? ''}
                  onChange={(event) => updateQuery({ ngoId: event.target.value || null })}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary/40"
                >
                  <option value="">Todas</option>
                  {availableNgos.map((ngo) => (
                    <option key={ngo.id} value={ngo.id}>
                      {pointLabel(ngo)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              onClick={() =>
                updateQuery({
                  actionableOnly: initialFilters.actionableOnly ? null : 'true',
                })
              }
              className={`rounded-[1.35rem] border px-4 py-3 text-left text-sm transition-colors ${
                initialFilters.actionableOnly
                  ? 'border-primary/30 bg-primary-light/40 text-primary-deeper'
                  : 'border-gray-200 bg-white text-gray-500 hover:text-primary-deeper'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                Ação imediata
              </span>
              <p className="mt-1 font-semibold">
                {initialFilters.actionableOnly ? 'Somente acionáveis' : 'Filtrar acionáveis'}
              </p>
            </button>

            <button
              onClick={() =>
                updateQuery({
                  direction: initialFilters.direction === 'desc' ? 'asc' : 'desc',
                })
              }
              className="rounded-[1.35rem] border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-500 transition-colors hover:text-primary-deeper"
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <ArrowUpDown size={12} />
                Ordem
              </span>
              <p className="mt-1 font-semibold text-on-surface">
                {initialFilters.direction === 'desc' ? 'Recentes primeiro' : 'Antigas primeiro'}
              </p>
            </button>
          </div>
        </div>

        {donations.length === 0 ? (
          <div className="mt-6 rounded-[1.75rem] bg-surface px-6 py-12 text-center">
            <Target size={24} className="mx-auto text-primary" />
            <p className="mt-4 text-base font-semibold text-primary-deeper">
              Nenhuma doação neste recorte
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Ajuste os filtros ou aguarde novas entradas no fluxo operacional.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {donations.map((donation) => {
              const statusConfig = DONATION_STATUS_CONFIG[donation.status];
              const StatusIcon = statusConfig.icon;
              const actionLabel = getNextActionLabel(donation);

              return (
                <article
                  key={donation.id}
                  className="rounded-[1.35rem] border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-primary-deeper">
                          {donation.code}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.color}`}
                        >
                          <StatusIcon size={13} />
                          {statusConfig.label}
                        </span>
                        {donation.partnership && (
                          <span className="rounded-full bg-primary-light/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-deeper">
                            parceria ativa
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-primary-deeper">
                            {donation.itemLabel}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                            <span>{donation.itemCount} item(ns)</span>
                            <span>{getOperationalLabel(role, donation)}</span>
                            <span>{formatDonationDateLabel(donation.updatedAt)}</span>
                          </div>
                        </div>
                        <OperationProgress status={donation.status} />
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">
                        {donation.latestEvent?.description ??
                          'Registro inicial aguardando atualização operacional.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {donation.allowedNextStatuses.length > 0 ? (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                            {actionLabel ?? 'Próximo passo'}
                          </p>
                          <StatusActionPanel
                            compact
                            donation={donation}
                            onUpdated={(updatedDonation) => {
                              setDonations((current) =>
                                current.map((item) =>
                                  item.id === updatedDonation.id ? updatedDonation : item,
                                ),
                              );
                            }}
                          />
                        </>
                      ) : (
                        <div className="rounded-2xl bg-surface px-4 py-3">
                          <p className="text-sm font-semibold text-primary-deeper">
                            Sem ação agora
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            Aguarda outro ator ou já concluiu sua etapa.
                          </p>
                        </div>
                      )}

                      <Link
                        href={`/rastreio/${donation.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary"
                      >
                        Detalhes
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
