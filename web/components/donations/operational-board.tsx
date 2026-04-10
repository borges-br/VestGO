'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpDown, Filter, Target } from 'lucide-react';
import {
  DONATION_STATUS_CONFIG,
  formatDonationDateLabel,
} from '@/components/donations/donation-status';
import { StatusActionPanel } from '@/components/donations/status-action-panel';
import type { DonationPoint, DonationRecord, DonationStatus } from '@/lib/api';

const FILTER_OPTIONS: { value: 'ALL' | DonationStatus; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'AT_POINT', label: 'No ponto' },
  { value: 'IN_TRANSIT', label: 'Em transito' },
  { value: 'DELIVERED', label: 'Entregues' },
  { value: 'DISTRIBUTED', label: 'Distribuidas' },
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
    return donation.ngo?.organizationName ?? donation.ngo?.name ?? 'ONG ainda nao vinculada';
  }

  if (role === 'NGO') {
    return (
      donation.collectionPoint?.organizationName ??
      donation.collectionPoint?.name ??
      'Ponto de origem nao informado'
    );
  }

  return `${donation.collectionPoint?.organizationName ?? donation.collectionPoint?.name ?? 'Origem'} -> ${
    donation.ngo?.organizationName ?? donation.ngo?.name ?? 'Destino'
  }`;
}

function pointLabel(point: DonationPoint) {
  return point.organizationName ?? point.name;
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
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.75rem] bg-white p-4 shadow-card">
          <p className="text-3xl font-bold text-primary-deeper">{summary.total}</p>
          <p className="mt-1 text-sm text-gray-500">Doacoes neste recorte</p>
        </div>
        <div className="rounded-[1.75rem] bg-white p-4 shadow-card">
          <p className="text-3xl font-bold text-primary">{summary.actionable}</p>
          <p className="mt-1 text-sm text-gray-500">Aguardando sua acao</p>
        </div>
        <div className="rounded-[1.75rem] bg-white p-4 shadow-card">
          <p className="text-3xl font-bold text-emerald-600">{summary.completed}</p>
          <p className="mt-1 text-sm text-gray-500">Etapas concluidas neste recorte</p>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Operacao
              </p>
              <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Fila operacional</h2>
              <p className="mt-2 text-sm text-gray-500">
                Filtre por etapa, parceiro e contexto para operar com menos atrito.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
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
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
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

          <div className="grid gap-3 rounded-[1.75rem] bg-surface p-4 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
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
              className={`rounded-[1.5rem] border px-4 py-3 text-left text-sm transition-colors ${
                initialFilters.actionableOnly
                  ? 'border-primary/30 bg-primary-light/40 text-primary-deeper'
                  : 'border-gray-200 bg-white text-gray-500 hover:text-primary-deeper'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                Acao imediata
              </span>
              <p className="mt-2 font-semibold">
                {initialFilters.actionableOnly ? 'Mostrando apenas acionaveis' : 'Mostrar so as que exigem acao'}
              </p>
            </button>

            <button
              onClick={() =>
                updateQuery({
                  direction: initialFilters.direction === 'desc' ? 'asc' : 'desc',
                })
              }
              className="rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-500 transition-colors hover:text-primary-deeper"
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <ArrowUpDown size={12} />
                Ordenacao
              </span>
              <p className="mt-2 font-semibold text-on-surface">
                {initialFilters.direction === 'desc' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
              </p>
            </button>
          </div>
        </div>

        {donations.length === 0 ? (
          <div className="mt-8 rounded-[1.75rem] bg-surface px-6 py-12 text-center">
            <Target size={24} className="mx-auto text-primary" />
            <p className="mt-4 text-base font-semibold text-primary-deeper">
              Nenhuma doacao neste recorte
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Ajuste os filtros ou aguarde novas entradas no fluxo operacional.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {donations.map((donation) => {
              const statusConfig = DONATION_STATUS_CONFIG[donation.status];
              const StatusIcon = statusConfig.icon;

              return (
                <article
                  key={donation.id}
                  className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.color}`}
                        >
                          <StatusIcon size={13} />
                          {statusConfig.label}
                        </span>
                        <span className="rounded-full bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                          {donation.code}
                        </span>
                        {donation.partnership && (
                          <span className="rounded-full bg-primary-light/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-deeper">
                            parceria ativa
                          </span>
                        )}
                      </div>

                      <p className="mt-4 text-lg font-bold text-primary-deeper">{donation.itemLabel}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span>{donation.itemCount} item(ns)</span>
                        <span>Atualizado em {formatDonationDateLabel(donation.updatedAt)}</span>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-[1.5rem] bg-surface p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                            Fluxo relacionado
                          </p>
                          <p className="mt-2 text-sm font-semibold text-on-surface">
                            {getOperationalLabel(role, donation)}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-gray-400">
                            {donation.partnership?.notes ??
                              (role === 'COLLECTION_POINT'
                                ? 'Destino parceiro vinculado para a proxima etapa.'
                                : role === 'NGO'
                                  ? 'Origem registrada para manter o rastreio coerente.'
                                  : 'Origem e destino vinculados no fluxo atual.')}
                          </p>
                        </div>

                        <div className="rounded-[1.5rem] bg-surface p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                            Ultima atualizacao
                          </p>
                          <p className="mt-2 text-sm font-semibold text-on-surface">
                            {donation.latestEvent?.description ?? 'Registro inicial aguardando atualizacao'}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-gray-400">
                            {donation.latestEvent
                              ? formatDonationDateLabel(donation.latestEvent.createdAt)
                              : formatDonationDateLabel(donation.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full xl:max-w-[23rem]">
                      {donation.allowedNextStatuses.length > 0 ? (
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
                      ) : (
                        <div className="rounded-[2rem] bg-surface p-5">
                          <p className="text-sm font-semibold text-primary-deeper">
                            Sem acao disponivel agora
                          </p>
                          <p className="mt-2 text-sm leading-7 text-gray-500">
                            Esta doacao ja concluiu sua etapa sob este perfil ou aguarda o proximo ator.
                          </p>
                        </div>
                      )}

                      <Link
                        href={`/rastreio/${donation.id}`}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                      >
                        Abrir detalhes completos
                        <ArrowRight size={15} />
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
