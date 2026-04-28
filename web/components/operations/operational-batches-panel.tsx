'use client';

import { startTransition, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  PackagePlus,
  Search,
  Send,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  DONATION_STATUS_ACTIONS,
  DONATION_STATUS_CONFIG,
  formatDonationDateLabel,
} from '@/components/donations/donation-status';
import {
  addOperationalBatchItem,
  cancelOperationalBatch,
  closeOperationalBatch,
  confirmOperationalBatchDelivery,
  createOperationalBatch,
  dispatchOperationalBatch,
  getOperationalDonationByCode,
  markOperationalBatchReady,
  updateDonationStatus,
  type DonationPoint,
  type DonationRecord,
  type ItemCategory,
  type OperationalBatchRecord,
  type OperationalBatchStatus,
} from '@/lib/api';

const CODE_PATTERN = /^VGO-[A-Z0-9]{6,}$/;

const ITEM_CATEGORIES: ItemCategory[] = ['CLOTHING', 'SHOES', 'ACCESSORIES', 'BAGS', 'OTHER'];

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

const BATCH_STATUS_LABELS: Record<OperationalBatchStatus, string> = {
  OPEN: 'Aberta',
  READY_TO_SHIP: 'Pronta',
  IN_TRANSIT: 'Em trânsito',
  DELIVERED: 'Entregue',
  CLOSED: 'Fechada',
  CANCELLED: 'Cancelada',
};

const BATCH_STATUS_STYLES: Record<OperationalBatchStatus, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  READY_TO_SHIP: 'bg-amber-50 text-amber-700',
  IN_TRANSIT: 'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-primary-light text-primary-deeper',
  CANCELLED: 'bg-red-50 text-red-600',
};

interface OperationalBatchesPanelProps {
  accessToken: string;
  role: string;
  initialBatches: OperationalBatchRecord[];
  availableCollectionPoints: DonationPoint[];
  availableNgos: DonationPoint[];
}

function pointLabel(point: DonationPoint | null | undefined) {
  return point?.organizationName ?? point?.name ?? 'Nao informado';
}

function normalizeCode(input: string) {
  return input.trim().toUpperCase();
}

function inferPrimaryCategory(donation: DonationRecord): ItemCategory | undefined {
  const category = donation.items[0]?.category;
  return ITEM_CATEGORIES.includes(category as ItemCategory) ? (category as ItemCategory) : undefined;
}

function defaultBatchName(donation: DonationRecord) {
  const category = inferPrimaryCategory(donation);
  const categoryLabel = category ? CATEGORY_LABELS[category] : 'Doacoes';
  const ngoName = pointLabel(donation.ngo);
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date());

  return `Carga ${categoryLabel} - ${ngoName} - ${dateLabel}`;
}

function getStatusLocation(donation: DonationRecord) {
  return (
    donation.collectionPoint?.organizationName ??
    donation.collectionPoint?.name ??
    donation.dropOffPoint?.organizationName ??
    donation.dropOffPoint?.name ??
    undefined
  );
}

export function OperationalBatchesPanel({
  accessToken,
  role,
  initialBatches,
  availableCollectionPoints,
  availableNgos,
}: OperationalBatchesPanelProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [donation, setDonation] = useState<DonationRecord | null>(null);
  const [batches, setBatches] = useState(initialBatches);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [expandedBatchIds, setExpandedBatchIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedBatches = useMemo(() => {
    const priority: Record<OperationalBatchStatus, number> =
      role === 'NGO'
        ? {
            IN_TRANSIT: 0,
            DELIVERED: 1,
            OPEN: 2,
            READY_TO_SHIP: 3,
            CLOSED: 4,
            CANCELLED: 5,
          }
        : {
            OPEN: 0,
            READY_TO_SHIP: 1,
            IN_TRANSIT: 2,
            DELIVERED: 3,
            CLOSED: 4,
            CANCELLED: 5,
          };

    return [...batches].sort((left, right) => {
      const statusDiff = priority[left.status] - priority[right.status];

      if (statusDiff !== 0) {
        return statusDiff;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [batches, role]);

  const eligibleBatches = useMemo(() => {
    if (!donation) {
      return [];
    }

    return batches.filter((batch) => {
      if (!batch.allowedActions.canAddItems) {
        return false;
      }

      if (donation.ngo?.id && batch.ngoId !== donation.ngo.id) {
        return false;
      }

      if (donation.collectionPoint?.id && batch.collectionPointId !== donation.collectionPoint.id) {
        return false;
      }

      return true;
    });
  }, [batches, donation]);

  function updateBatchState(batch: OperationalBatchRecord) {
    setBatches((current) => {
      const exists = current.some((item) => item.id === batch.id);

      if (!exists) {
        return [batch, ...current];
      }

      return current.map((item) => (item.id === batch.id ? batch : item));
    });
  }

  function refreshUi() {
    startTransition(() => {
      router.refresh();
    });
  }

  function toggleBatch(batchId: string) {
    setExpandedBatchIds((current) =>
      current.includes(batchId)
        ? current.filter((id) => id !== batchId)
        : [...current, batchId],
    );
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = normalizeCode(code);

    if (!CODE_PATTERN.test(normalizedCode)) {
      setError('Informe um codigo no formato VGO-XXXXXX.');
      setMessage(null);
      setDonation(null);
      return;
    }

    setLoadingCode(true);
    setError(null);
    setMessage(null);

    try {
      const foundDonation = await getOperationalDonationByCode(normalizedCode, accessToken);
      setDonation(foundDonation);
      setBatchName(defaultBatchName(foundDonation));
      const firstEligibleBatch = batches.find(
        (batch) =>
          batch.allowedActions.canAddItems &&
          batch.ngoId === foundDonation.ngo?.id &&
          batch.collectionPointId === foundDonation.collectionPoint?.id,
      );
      setSelectedBatchId(firstEligibleBatch?.id ?? '');
    } catch (err) {
      setDonation(null);
      setError(err instanceof Error ? err.message : 'Nao foi possivel localizar a doacao.');
    } finally {
      setLoadingCode(false);
    }
  }

  async function handleReceiveDonation() {
    if (!donation) {
      return;
    }

    setPendingAction('receive');
    setError(null);
    setMessage(null);

    try {
      const updatedDonation = await updateDonationStatus(
        donation.id,
        {
          status: 'AT_POINT',
          description: DONATION_STATUS_ACTIONS.AT_POINT.description,
          location: getStatusLocation(donation),
        },
        accessToken,
      );
      setDonation(updatedDonation);
      setMessage('Recebimento confirmado. Agora voce pode adicionar a doacao a uma carga.');
      refreshUi();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel confirmar o recebimento.');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAddToSelectedBatch() {
    if (!donation || !selectedBatchId) {
      setError('Selecione uma carga aberta para adicionar a doacao.');
      return;
    }

    setPendingAction('add');
    setError(null);
    setMessage(null);

    try {
      const updatedBatch = await addOperationalBatchItem(selectedBatchId, donation.id, accessToken);
      updateBatchState(updatedBatch);
      setDonation((current) =>
        current
          ? {
              ...current,
              operationalBatch: {
                id: updatedBatch.id,
                code: updatedBatch.code,
                name: updatedBatch.name,
                status: updatedBatch.status,
              },
            }
          : current,
      );
      setMessage(`Doacao adicionada a carga ${updatedBatch.code}.`);
      refreshUi();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel adicionar a doacao.');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCreateBatchAndAdd() {
    if (!donation?.ngo?.id) {
      setError('A doacao precisa ter uma ONG destino para criar carga.');
      return;
    }

    if (role === 'ADMIN' && !donation.collectionPoint?.id) {
      setError('A doacao precisa ter ponto de coleta para criar carga como admin.');
      return;
    }

    setPendingAction('create-add');
    setError(null);
    setMessage(null);

    try {
      const createdBatch = await createOperationalBatch(
        {
          name: batchName.trim() || defaultBatchName(donation),
          ngoId: donation.ngo.id,
          ...(role === 'ADMIN' && donation.collectionPoint?.id
            ? { collectionPointId: donation.collectionPoint.id }
            : {}),
          ...(inferPrimaryCategory(donation) ? { primaryCategory: inferPrimaryCategory(donation) } : {}),
        },
        accessToken,
      );
      const updatedBatch = await addOperationalBatchItem(createdBatch.id, donation.id, accessToken);
      updateBatchState(updatedBatch);
      setSelectedBatchId(updatedBatch.id);
      setDonation((current) =>
        current
          ? {
              ...current,
              operationalBatch: {
                id: updatedBatch.id,
                code: updatedBatch.code,
                name: updatedBatch.name,
                status: updatedBatch.status,
              },
            }
          : current,
      );
      setMessage(`Carga ${updatedBatch.code} criada e doacao adicionada.`);
      refreshUi();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel criar a carga.');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBatchAction(
    batch: OperationalBatchRecord,
    action: 'ready' | 'dispatch' | 'deliver' | 'close' | 'cancel',
  ) {
    if (
      action === 'deliver' &&
      !window.confirm(
        `Confirmar recebimento da carga ${batch.code}? As ${batch.donationCount} doações vinculadas elegíveis avançarão para entregue.`,
      )
    ) {
      return;
    }

    setPendingAction(`${action}:${batch.id}`);
    setError(null);
    setMessage(null);

    try {
      const updatedBatch =
        action === 'ready'
          ? await markOperationalBatchReady(batch.id, accessToken)
          : action === 'dispatch'
            ? await dispatchOperationalBatch(batch.id, accessToken)
            : action === 'deliver'
              ? await confirmOperationalBatchDelivery(batch.id, accessToken)
              : action === 'close'
                ? await closeOperationalBatch(batch.id, accessToken)
                : await cancelOperationalBatch(batch.id, accessToken);

      updateBatchState(updatedBatch);
      setDonation((current) => {
        if (!current?.operationalBatch || current.operationalBatch.id !== updatedBatch.id) {
          return current;
        }

        const updatedDonation = updatedBatch.items.find((item) => item.donation.id === current.id)?.donation;
        return updatedDonation ?? {
          ...current,
          operationalBatch: {
            ...current.operationalBatch,
            status: updatedBatch.status,
          },
        };
      });
      setMessage(
        updatedBatch.operationSummary
          ? `Carga ${updatedBatch.code} atualizada: ${updatedBatch.operationSummary.updated}/${updatedBatch.operationSummary.total} doações avançaram.`
          : `Carga ${updatedBatch.code} atualizada.`,
      );
      refreshUi();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel atualizar a carga.');
    } finally {
      setPendingAction(null);
    }
  }

  const canReceiveDonation = donation?.allowedNextStatuses.includes('AT_POINT') ?? false;
  const canAddDonation =
    role !== 'NGO' &&
    donation?.status === 'AT_POINT' &&
    donation.operationalBatch == null;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
      <div className="rounded-[2rem] bg-white p-4 shadow-card sm:p-5 lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Entrada por codigo
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary-deeper">
              Localizar doacao
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Use o codigo publico VGO para confirmar recebimento e vincular a uma carga.
            </p>
          </div>
          <PackagePlus size={22} className="text-primary" />
        </div>

        <form onSubmit={handleSearch} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
          <label className="text-sm">
            <span className="mb-2 block text-xs font-semibold text-gray-500">
              Codigo da doacao
            </span>
            <input
              value={code}
              onChange={(event) => setCode(normalizeCode(event.target.value))}
              placeholder="VGO-XXXXXX"
              aria-invalid={Boolean(error && !donation)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm uppercase text-on-surface outline-none transition-colors focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </label>
          <button
            type="submit"
            disabled={loadingCode}
            aria-busy={loadingCode}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300"
          >
            {loadingCode ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Buscar
          </button>
        </form>

        {(error || message) && (
          <div
            role={error ? 'alert' : undefined}
            aria-live="polite"
            className={`mt-4 rounded-[1.25rem] border px-4 py-3 text-sm ${
              error
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error ?? message}
          </div>
        )}

        {donation && (
          <div className="mt-5 rounded-[1.5rem] border border-gray-100 bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-sm font-bold text-primary-deeper">{donation.code}</p>
                <p className="mt-1 text-base font-bold text-on-surface">{donation.itemLabel}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {donation.itemCount} item(ns) {'->'} {pointLabel(donation.ngo)}
                </p>
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold ${
                  DONATION_STATUS_CONFIG[donation.status].bg
                } ${DONATION_STATUS_CONFIG[donation.status].color}`}
              >
                {DONATION_STATUS_CONFIG[donation.status].label}
              </span>
            </div>

            {donation.operationalBatch && (
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-gray-600">
                Vinculada a carga{' '}
                <strong className="font-mono text-primary-deeper">
                  {donation.operationalBatch.code}
                </strong>{' '}
                ({BATCH_STATUS_LABELS[donation.operationalBatch.status]}).
              </div>
            )}

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {canReceiveDonation && (
                <button
                  type="button"
                  onClick={handleReceiveDonation}
                  disabled={Boolean(pendingAction)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300"
                >
                  {pendingAction === 'receive' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  Confirmar recebimento
                </button>
              )}

              {canAddDonation && eligibleBatches.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px] lg:col-span-2">
                  <label className="text-sm">
                    <span className="mb-2 block text-xs font-semibold text-gray-500">
                      Carga aberta
                    </span>
                    <select
                      value={selectedBatchId}
                      onChange={(event) => setSelectedBatchId(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary/40"
                    >
                      <option value="">Selecionar carga</option>
                      {eligibleBatches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.code} - {batch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddToSelectedBatch}
                    disabled={Boolean(pendingAction)}
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 px-4 py-3 text-sm font-semibold text-primary-deeper transition-colors hover:bg-primary-light/40 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
                  >
                    {pendingAction === 'add' ? <Loader2 size={15} className="animate-spin" /> : null}
                    Adicionar
                  </button>
                </div>
              )}

              {canAddDonation && (
                <div className="grid gap-2 lg:col-span-2">
                  <label className="text-sm">
                    <span className="mb-2 block text-xs font-semibold text-gray-500">
                      Nova carga
                    </span>
                    <input
                      value={batchName}
                      onChange={(event) => setBatchName(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary/40"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleCreateBatchAndAdd}
                    disabled={Boolean(pendingAction)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300"
                  >
                    {pendingAction === 'create-add' ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <PackagePlus size={15} />
                    )}
                    Criar carga e adicionar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[2rem] bg-white p-4 shadow-card sm:p-5 lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Cargas operacionais
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary-deeper">
              {role === 'NGO' ? 'Cargas em trânsito para sua ONG' : 'Lotes em andamento'}
            </h2>
            {role === 'NGO' && (
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Confirme o recebimento pelo lote para evitar atualização item a item.
              </p>
            )}
          </div>
          <Truck size={22} className="text-primary" />
        </div>

        {batches.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] bg-surface px-5 py-8 text-center">
            <PackagePlus size={24} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-500">
              Nenhuma carga operacional ainda
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Confirme uma doacao no ponto para criar a primeira carga.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {orderedBatches.slice(0, 8).map((batch) => {
              const actionKey = pendingAction?.endsWith(`:${batch.id}`) ? pendingAction : null;
              const isExpanded = expandedBatchIds.includes(batch.id);

              return (
                <article
                  key={batch.id}
                  className={`rounded-[1.35rem] border p-4 ${
                    batch.allowedActions.canConfirmDelivery
                      ? 'border-primary/25 bg-primary-light/20'
                      : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-primary-deeper">
                          {batch.code}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            BATCH_STATUS_STYLES[batch.status]
                          }`}
                        >
                          {BATCH_STATUS_LABELS[batch.status]}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-on-surface">
                        {batch.name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {batch.donationCount} doacao(oes), {batch.totalItemQuantity} peça(s) {'->'} {pointLabel(batch.ngo)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Origem: {pointLabel(batch.collectionPoint)}
                        {batch.dispatchedAt
                          ? ` · Saída: ${formatDonationDateLabel(batch.dispatchedAt)}`
                          : ''}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Atualizada {formatDonationDateLabel(batch.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {batch.allowedActions.canMarkReady && (
                      <button
                        type="button"
                        onClick={() => handleBatchAction(batch, 'ready')}
                        disabled={Boolean(pendingAction)}
                        className="rounded-2xl bg-surface px-3 py-2 text-xs font-semibold text-primary-deeper transition-colors hover:bg-primary-light/40 disabled:text-gray-300"
                      >
                        {actionKey === `ready:${batch.id}` ? 'Salvando...' : 'Marcar pronta'}
                      </button>
                    )}
                    {batch.allowedActions.canDispatch && (
                      <button
                        type="button"
                        onClick={() => handleBatchAction(batch, 'dispatch')}
                        disabled={Boolean(pendingAction)}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-primary-deeper px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:bg-surface disabled:text-gray-300"
                      >
                        {actionKey === `dispatch:${batch.id}` ? (
                          'Despachando...'
                        ) : (
                          <>
                            <Send size={13} />
                            Despachar
                          </>
                        )}
                      </button>
                    )}
                    {batch.allowedActions.canConfirmDelivery && (
                      <button
                        type="button"
                        onClick={() => handleBatchAction(batch, 'deliver')}
                        disabled={Boolean(pendingAction)}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-primary-deeper px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:bg-surface disabled:text-gray-300"
                      >
                        {actionKey === `deliver:${batch.id}` ? (
                          'Confirmando...'
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            Confirmar recebimento da carga
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleBatch(batch.id)}
                      className="rounded-2xl bg-surface px-3 py-2 text-xs font-semibold text-primary-deeper transition-colors hover:bg-primary-light/40"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'Ocultar doações' : 'Ver doações'}
                    </button>
                    {batch.allowedActions.canClose && (
                      <button
                        type="button"
                        onClick={() => handleBatchAction(batch, 'close')}
                        disabled={Boolean(pendingAction)}
                        className="rounded-2xl bg-surface px-3 py-2 text-xs font-semibold text-primary-deeper transition-colors hover:bg-primary-light/40 disabled:text-gray-300"
                      >
                        {actionKey === `close:${batch.id}` ? 'Fechando...' : 'Fechar'}
                      </button>
                    )}
                    {batch.allowedActions.canCancel && (
                      <button
                        type="button"
                        onClick={() => handleBatchAction(batch, 'cancel')}
                        disabled={Boolean(pendingAction)}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:text-gray-300"
                      >
                        <XCircle size={13} />
                        {actionKey === `cancel:${batch.id}` ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <div className="space-y-2">
                        {batch.items.map((item) => {
                          const statusConfig = DONATION_STATUS_CONFIG[item.donation.status];

                          return (
                            <div
                              key={item.id}
                              className="grid gap-2 rounded-2xl bg-surface px-3 py-3 text-xs sm:grid-cols-[110px_minmax(0,1fr)_90px] sm:items-center"
                            >
                              <span className="font-mono font-semibold text-primary-deeper">
                                {item.donation.code}
                              </span>
                              <span className="min-w-0 truncate text-gray-600">
                                {item.donation.itemLabel} · {item.donation.itemCount} item(ns)
                              </span>
                              <span
                                className={`w-fit rounded-full px-2 py-1 text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.color}`}
                              >
                                {statusConfig.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {(availableCollectionPoints.length > 0 || availableNgos.length > 0) && (
          <p className="mt-4 text-xs leading-5 text-gray-400">
            Rede carregada: {availableCollectionPoints.length} ponto(s) e {availableNgos.length} ONG(s).
          </p>
        )}
      </div>
    </section>
  );
}
