'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Send,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  createPickupRequest,
  updatePickupRequestStatus,
  type PartnershipRecord,
  type PickupRequestRecord,
  type PickupRequestStatus,
} from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';

const STATUS_META: Record<
  PickupRequestStatus,
  { label: string; tone: string }
> = {
  PENDING: {
    label: 'Pendente',
    tone: 'bg-amber-50 text-amber-700',
  },
  APPROVED: {
    label: 'Aprovada',
    tone: 'bg-emerald-50 text-emerald-700',
  },
  REJECTED: {
    label: 'Rejeitada',
    tone: 'bg-red-50 text-red-600',
  },
};

function formatPickupDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatRequestedWindow(pickupRequest: PickupRequestRecord) {
  const segments: string[] = [];

  if (pickupRequest.requestedDate) {
    segments.push(
      new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(pickupRequest.requestedDate)),
    );
  }

  if (pickupRequest.timeWindowStart && pickupRequest.timeWindowEnd) {
    segments.push(`${pickupRequest.timeWindowStart} - ${pickupRequest.timeWindowEnd}`);
  }

  return segments.length > 0 ? segments.join(' | ') : null;
}

export function PickupRequestsPanel({
  role,
  accessToken,
  initialPickupRequests,
  partnerships,
}: {
  role: 'COLLECTION_POINT' | 'NGO';
  accessToken?: string;
  initialPickupRequests: PickupRequestRecord[];
  partnerships: PartnershipRecord[];
}) {
  const [pickupRequests, setPickupRequests] = useState(initialPickupRequests);
  const [selectedPartnershipId, setSelectedPartnershipId] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [timeWindowStart, setTimeWindowStart] = useState('');
  const [timeWindowEnd, setTimeWindowEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [responseNotesById, setResponseNotesById] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setPickupRequests(initialPickupRequests);
  }, [initialPickupRequests]);

  const activePartnerships = useMemo(
    () => partnerships.filter((partnership) => partnership.status === 'ACTIVE' && partnership.isActive),
    [partnerships],
  );

  useEffect(() => {
    if (role !== 'NGO') {
      setSelectedPartnershipId('');
      return;
    }

    setSelectedPartnershipId((current) => current || activePartnerships[0]?.id || '');
  }, [activePartnerships, role]);

  const statusCounts = useMemo(
    () =>
      pickupRequests.reduce<Record<PickupRequestStatus, number>>(
        (acc, pickupRequest) => {
          acc[pickupRequest.status] += 1;
          return acc;
        },
        {
          PENDING: 0,
          APPROVED: 0,
          REJECTED: 0,
        },
      ),
    [pickupRequests],
  );

  const pendingRequests = useMemo(
    () => pickupRequests.filter((pickupRequest) => pickupRequest.status === 'PENDING'),
    [pickupRequests],
  );

  const selectedPartnershipHasPending = useMemo(
    () =>
      pickupRequests.some(
        (pickupRequest) =>
          pickupRequest.operationalPartnershipId === selectedPartnershipId &&
          pickupRequest.status === 'PENDING',
      ),
    [pickupRequests, selectedPartnershipId],
  );

  async function handleCreatePickupRequest() {
    if (!accessToken || !selectedPartnershipId || role !== 'NGO') {
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const created = await createPickupRequest(
        {
          operationalPartnershipId: selectedPartnershipId,
          requestedDate: requestedDate || undefined,
          timeWindowStart: timeWindowStart || undefined,
          timeWindowEnd: timeWindowEnd || undefined,
          notes: notes.trim() || undefined,
        },
        accessToken,
      );

      setPickupRequests((current) => [created, ...current]);
      setRequestedDate('');
      setTimeWindowStart('');
      setTimeWindowEnd('');
      setNotes('');
      setNotice('Solicitacao de retirada enviada para o ponto parceiro.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Nao foi possivel solicitar retirada agora.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(
    pickupRequestId: string,
    status: Extract<PickupRequestStatus, 'APPROVED' | 'REJECTED'>,
  ) {
    if (!accessToken || role !== 'COLLECTION_POINT') {
      return;
    }

    setActingId(pickupRequestId);
    setError(null);
    setNotice(null);

    try {
      const updated = await updatePickupRequestStatus(
        pickupRequestId,
        {
          status,
          responseNotes: responseNotesById[pickupRequestId]?.trim() || undefined,
        },
        accessToken,
      );

      setPickupRequests((current) =>
        current.map((pickupRequest) =>
          pickupRequest.id === updated.id ? updated : pickupRequest,
        ),
      );
      setResponseNotesById((current) => {
        const next = { ...current };
        delete next[pickupRequestId];
        return next;
      });
      setNotice(
        status === 'APPROVED'
          ? 'Solicitacao aprovada. A ONG ja pode seguir com a retirada.'
          : 'Solicitacao rejeitada pelo ponto de coleta.',
      );
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : 'Nao foi possivel responder a solicitacao agora.',
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Retiradas
          </p>
          <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
            {role === 'NGO' ? 'Solicitar retirada' : 'Solicitacoes recebidas'}
          </h2>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            {role === 'NGO'
              ? 'Envie solicitacoes para pontos com parceria ativa. A resposta do ponto aparece neste mesmo painel.'
              : 'Acompanhe e responda pedidos de retirada vindos das ONGs parceiras.'}
          </p>
        </div>
        <Truck size={18} className="text-primary" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {([
          ['PENDING', 'Pendentes'],
          ['APPROVED', 'Aprovadas'],
          ['REJECTED', 'Rejeitadas'],
        ] as Array<[PickupRequestStatus, string]>).map(([status, label]) => (
          <div key={status} className="rounded-[1.5rem] bg-surface p-4">
            <p className="text-3xl font-bold text-primary-deeper">{statusCounts[status]}</p>
            <p className="mt-1 text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      {role === 'NGO' && (
        <div className="mt-5 rounded-[1.75rem] bg-surface p-4">
          <p className="text-sm font-semibold text-primary-deeper">Nova solicitacao</p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-gray-500">
              <span className="mb-2 block font-semibold text-on-surface">
                Parceria ativa
              </span>
              <select
                value={selectedPartnershipId}
                onChange={(event) => setSelectedPartnershipId(event.target.value)}
                disabled={activePartnerships.length === 0 || submitting}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary/40 disabled:cursor-not-allowed disabled:bg-surface"
              >
                <option value="">
                  {activePartnerships.length === 0
                    ? 'Nenhuma parceria ativa disponivel'
                    : 'Selecione o ponto parceiro'}
                </option>
                {activePartnerships.map((partnership) => (
                  <option key={partnership.id} value={partnership.id}>
                    {partnership.collectionPoint.organizationName ??
                      partnership.collectionPoint.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-gray-500">
              <span className="mb-2 block font-semibold text-on-surface">
                Data prevista
              </span>
              <input
                type="date"
                value={requestedDate}
                onChange={(event) => setRequestedDate(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-gray-500">
                <span className="mb-2 block font-semibold text-on-surface">
                  Inicio da faixa
                </span>
                <input
                  type="time"
                  value={timeWindowStart}
                  onChange={(event) => setTimeWindowStart(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                />
              </label>
              <label className="block text-sm text-gray-500">
                <span className="mb-2 block font-semibold text-on-surface">
                  Fim da faixa
                </span>
                <input
                  type="time"
                  value={timeWindowEnd}
                  onChange={(event) => setTimeWindowEnd(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                />
              </label>
            </div>

            <label className="block text-sm text-gray-500">
              <span className="mb-2 block font-semibold text-on-surface">
                Observacao opcional
              </span>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex.: Lote pronto para retirada ainda esta semana."
                className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary/40"
              />
            </label>

            {selectedPartnershipHasPending && selectedPartnershipId && (
              <p className="text-sm leading-7 text-gray-500">
                Ja existe uma solicitacao pendente para esta parceria. Aguarde a resposta do ponto.
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleCreatePickupRequest()}
              disabled={
                !selectedPartnershipId ||
                activePartnerships.length === 0 ||
                selectedPartnershipHasPending ||
                submitting
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Solicitar retirada
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {pickupRequests.length === 0 ? (
          <div className="rounded-[1.75rem] bg-surface px-5 py-5 text-sm leading-7 text-gray-500">
            {role === 'NGO'
              ? 'Nenhuma solicitacao de retirada foi enviada ainda.'
              : 'Nenhuma solicitacao de retirada foi recebida ainda.'}
          </div>
        ) : (
          pickupRequests.map((pickupRequest) => {
            const status = STATUS_META[pickupRequest.status];
            const partnerName =
              role === 'NGO'
                ? pickupRequest.collectionPoint.organizationName ??
                  pickupRequest.collectionPoint.name
                : pickupRequest.ngo.organizationName ?? pickupRequest.ngo.name;
            const addressSummary =
              role === 'NGO'
                ? formatAddressSummary(pickupRequest.collectionPoint)
                : formatAddressSummary(pickupRequest.ngo);

            return (
              <div
                key={pickupRequest.id}
                className="rounded-[1.75rem] border border-gray-100 bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary-deeper">
                      {partnerName}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {addressSummary ?? 'Endereco ainda nao informado.'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.tone}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-sm text-gray-500">
                  <p>Solicitada em {formatPickupDate(pickupRequest.createdAt)}</p>
                  {formatRequestedWindow(pickupRequest) && (
                    <p>Janela sugerida: {formatRequestedWindow(pickupRequest)}</p>
                  )}
                  {pickupRequest.notes && <p>Observacao: {pickupRequest.notes}</p>}
                  {pickupRequest.responseNotes && (
                    <p>Resposta do ponto: {pickupRequest.responseNotes}</p>
                  )}
                </div>

                {role === 'COLLECTION_POINT' && pickupRequest.status === 'PENDING' && (
                  <div className="mt-4 space-y-3">
                    <textarea
                      rows={2}
                      value={responseNotesById[pickupRequest.id] ?? ''}
                      onChange={(event) =>
                        setResponseNotesById((current) => ({
                          ...current,
                          [pickupRequest.id]: event.target.value,
                        }))
                      }
                      placeholder="Observacao opcional para a ONG."
                      className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void handleDecision(pickupRequest.id, 'APPROVED')}
                        disabled={actingId === pickupRequest.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300"
                      >
                        {actingId === pickupRequest.id ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} />
                            Aprovar
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDecision(pickupRequest.id, 'REJECTED')}
                        disabled={actingId === pickupRequest.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                      >
                        <XCircle size={15} />
                        Rejeitar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {role === 'COLLECTION_POINT' && pendingRequests.length > 0 && (
        <p className="mt-4 text-xs text-gray-400">
          A fila detalhada de doacoes continua em /operacoes. Este bloco concentra apenas o
          contexto e a decisao sobre retiradas.
        </p>
      )}
    </section>
  );
}
