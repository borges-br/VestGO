'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Handshake,
  Loader2,
  MapPin,
  Phone,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  getMyPartnerships,
  getNearbyPoints,
  requestOperationalPartnership,
  updateOperationalPartnershipStatus,
  type CollectionPoint,
  type MyProfile,
  type PartnershipRecord,
} from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';
import { SafeImage } from '@/components/ui/safe-image';

const PROFILE_STATE_LABELS = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  VERIFIED: 'Verificado',
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calcados',
  ACCESSORIES: 'Acessorios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

const ACCESSIBILITY_LABELS: Record<string, string> = {
  RAMP_ACCESS: 'Acesso por rampa',
  ACCESSIBLE_RESTROOM: 'Banheiro acessivel',
  ACCESSIBLE_PARKING: 'Estacionamento acessivel',
  PRIORITY_SERVICE: 'Atendimento preferencial',
  GROUND_FLOOR: 'Acesso terreo',
  SIGN_LANGUAGE_SUPPORT: 'Suporte em Libras',
};

type Props = {
  profile: MyProfile | null;
  loading: boolean;
  error: string | null;
  accessToken?: string;
  emailVerifiedAt?: string | null;
  onRefreshProfile?: () => Promise<void> | void;
};

function getPublishedImages(profile: MyProfile) {
  return (
    profile.publishedPublicProfile ?? {
      avatarUrl: profile.avatarUrl,
      coverImageUrl: profile.coverImageUrl,
      galleryImageUrls: profile.galleryImageUrls ?? [],
    }
  );
}

export function OperationalProfileSummary({
  profile,
  loading,
  error,
  accessToken,
  emailVerifiedAt,
  onRefreshProfile,
}: Props) {
  const [partnerships, setPartnerships] = useState<PartnershipRecord[]>([]);
  const [partnershipsLoading, setPartnershipsLoading] = useState(false);
  const [partnershipsError, setPartnershipsError] = useState<string | null>(null);
  const [partnershipsNotice, setPartnershipsNotice] = useState<string | null>(null);
  const [ngoCandidates, setNgoCandidates] = useState<CollectionPoint[]>([]);
  const [ngoCandidatesLoading, setNgoCandidatesLoading] = useState(false);
  const [selectedNgoId, setSelectedNgoId] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [actingPartnershipId, setActingPartnershipId] = useState<string | null>(null);

  async function loadPartnerships() {
    if (!accessToken || !profile || !['COLLECTION_POINT', 'NGO'].includes(profile.role)) {
      setPartnerships([]);
      return;
    }

    setPartnershipsLoading(true);
    setPartnershipsError(null);

    try {
      const response = await getMyPartnerships(accessToken);
      setPartnerships(response.data);
    } catch (loadError) {
      setPartnershipsError(
        loadError instanceof Error
          ? loadError.message
          : 'Nao foi possivel carregar as parcerias operacionais agora.',
      );
    } finally {
      setPartnershipsLoading(false);
    }
  }

  useEffect(() => {
    void loadPartnerships();
  }, [accessToken, profile?.id, profile?.role]);

  useEffect(() => {
    async function loadNgoCandidates() {
      if (!profile || profile.role !== 'COLLECTION_POINT') {
        setNgoCandidates([]);
        setSelectedNgoId('');
        return;
      }

      setNgoCandidatesLoading(true);

      try {
        const response = await getNearbyPoints({
          ...(profile.latitude != null && profile.longitude != null
            ? {
                lat: profile.latitude,
                lng: profile.longitude,
                radius: 30,
              }
            : {}),
          limit: 12,
          role: 'NGO',
          accessToken,
        });

        const nextCandidates = response.data.filter((item) => item.role === 'NGO');
        setNgoCandidates(nextCandidates);
        setSelectedNgoId((current) => current || nextCandidates[0]?.id || '');
      } catch {
        setNgoCandidates([]);
      } finally {
        setNgoCandidatesLoading(false);
      }
    }

    void loadNgoCandidates();
  }, [accessToken, profile?.latitude, profile?.longitude, profile?.role]);

  const activePartnership = useMemo(
    () => partnerships.find((item) => item.status === 'ACTIVE') ?? null,
    [partnerships],
  );
  const pendingPartnership = useMemo(
    () => partnerships.find((item) => item.status === 'PENDING') ?? null,
    [partnerships],
  );
  const pendingRequests = useMemo(
    () => partnerships.filter((item) => item.status === 'PENDING'),
    [partnerships],
  );
  const rejectedPartnerships = useMemo(
    () => partnerships.filter((item) => item.status === 'REJECTED'),
    [partnerships],
  );
  const canRequestPartnership =
    profile?.role === 'COLLECTION_POINT' &&
    ['ACTIVE', 'VERIFIED'].includes(profile.publicProfileState) &&
    !activePartnership &&
    !pendingPartnership;

  async function refreshPartnershipContext() {
    await loadPartnerships();
    await onRefreshProfile?.();
  }

  async function handleRequestPartnership() {
    if (!accessToken || !selectedNgoId || !canRequestPartnership) {
      return;
    }

    setRequesting(true);
    setPartnershipsError(null);
    setPartnershipsNotice(null);

    try {
      await requestOperationalPartnership({ ngoId: selectedNgoId }, accessToken);
      setPartnershipsNotice(
        'Solicitacao enviada para a ONG selecionada. O ponto passa a aceitar doacoes assim que a parceria for aprovada.',
      );
      await refreshPartnershipContext();
    } catch (requestError) {
      setPartnershipsError(
        requestError instanceof Error
          ? requestError.message
          : 'Nao foi possivel solicitar a parceria agora.',
      );
    } finally {
      setRequesting(false);
    }
  }

  async function handleDecision(partnershipId: string, status: 'ACTIVE' | 'REJECTED') {
    if (!accessToken) {
      return;
    }

    setActingPartnershipId(partnershipId);
    setPartnershipsError(null);
    setPartnershipsNotice(null);

    try {
      await updateOperationalPartnershipStatus(partnershipId, { status }, accessToken);
      setPartnershipsNotice(
        status === 'ACTIVE'
          ? 'Parceria aprovada. O ponto agora fica elegivel para receber doacoes.'
          : 'Solicitacao rejeitada pela ONG.',
      );
      await refreshPartnershipContext();
    } catch (decisionError) {
      setPartnershipsError(
        decisionError instanceof Error
          ? decisionError.message
          : 'Nao foi possivel responder a solicitacao agora.',
      );
    } finally {
      setActingPartnershipId(null);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm text-gray-500">Carregando perfil operacional...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm text-gray-500">Perfil operacional indisponivel no momento.</p>
        </div>
      </div>
    );
  }

  const title = profile.organizationName ?? profile.name;
  const subtitle = profile.role === 'NGO' ? 'ONG Parceira' : 'Ponto de Coleta';
  const emailVerified = Boolean(emailVerifiedAt);
  const publishedImages = getPublishedImages(profile);
  const initials = title
    .split(' ')
    .map((segment) => segment[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <div className="relative overflow-hidden rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-7">
            {publishedImages.coverImageUrl && (
              <>
                <SafeImage
                  src={publishedImages.coverImageUrl}
                  alt={`Capa publicada de ${title}`}
                  className="absolute inset-0"
                  imageClassName="h-full w-full object-cover"
                  fallback={<div className="h-full w-full bg-primary-deeper" />}
                />
                <div className="absolute inset-0 bg-primary-deeper/70" />
              </>
            )}
            <div className="relative z-10 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <Sparkles size={14} />
                Perfil publico
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                {PROFILE_STATE_LABELS[profile.publicProfileState]}
              </span>
            </div>

            <div className="relative z-10 mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.75rem] bg-primary text-white shadow-sm">
                {publishedImages.avatarUrl ? (
                  <SafeImage
                    src={publishedImages.avatarUrl}
                    alt={title}
                    className="h-full w-full"
                    fallbackLabel="Avatar indisponível"
                  />
                ) : (
                  initials ? (
                    <span className="text-2xl font-bold">{initials}</span>
                  ) : (
                    <Building2 size={34} />
                  )
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</p>
                <p className="mt-2 text-sm text-primary-muted">{subtitle}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-primary-muted">{profile.email}</span>
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/30 bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                      <CheckCircle2 size={12} />
                      E-mail verificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/30 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold text-amber-100">
                      <AlertTriangle size={12} />
                      Não verificado
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-primary-muted">
                  Responsavel: {profile.name}
                  {profile.phone ? ` - ${profile.phone}` : ''}
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Resumo institucional</p>
              <p className="mt-2 text-sm leading-7 text-primary-muted">
                {profile.description ??
                  'Complete a descricao do perfil para fortalecer a confianca do doador.'}
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {error}
              </div>
            )}

            {profile.pendingPublicRevision && (
              <div
                className={`mt-4 rounded-[1.5rem] border px-4 py-3 text-sm ${
                  profile.pendingPublicRevision.status === 'PENDING'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                <p className="font-semibold">
                  {profile.pendingPublicRevision.status === 'PENDING'
                    ? 'Alteracoes publicas em revisao'
                    : 'Ultima revisao foi rejeitada'}
                </p>
                <p className="mt-2 leading-7">
                  {profile.pendingPublicRevision.status === 'PENDING'
                    ? 'O perfil publicado segue estavel enquanto endereco, telefone, imagens, horario, acessibilidade, regras e observacoes aguardam avaliacao administrativa.'
                    : 'Revise os dados do perfil operacional e reenvie quando estiver pronto.'}
                </p>
              </div>
            )}

            <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] bg-white/10 p-4">
                <p className="text-3xl font-bold">{profile.stats.handledDonations}</p>
                <p className="mt-1 text-sm text-primary-muted">Doacoes ligadas</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/10 p-4">
                <p className="text-3xl font-bold">{profile.stats.activePartnerships}</p>
                <p className="mt-1 text-sm text-primary-muted">Parcerias ativas</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/10 p-4">
                <p className="text-3xl font-bold">
                  {profile.profileCompletion.completedItems}/{profile.profileCompletion.totalItems}
                </p>
                <p className="mt-1 text-sm text-primary-muted">Checklist essencial</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[2rem] bg-white p-6 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Proximas acoes
              </p>
              <div className="mt-4 space-y-3">
                <Link
                  href="/perfil/operacional"
                  className="flex items-center justify-between rounded-[1.5rem] bg-surface px-4 py-4 text-sm font-semibold text-primary-deeper transition-colors hover:bg-primary-light"
                >
                  Editar perfil publico
                  <CheckCircle2 size={16} className="text-primary" />
                </Link>
                <Link
                  href="/operacoes"
                  className="flex items-center justify-between rounded-[1.5rem] bg-surface px-4 py-4 text-sm font-semibold text-primary-deeper transition-colors hover:bg-primary-light"
                >
                  Abrir painel operacional
                  <ClipboardList size={16} className="text-primary" />
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Parceria operacional
                  </p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    {profile.role === 'COLLECTION_POINT'
                      ? 'O ponto solicita parceria a uma ONG. So uma parceria ativa torna o ponto elegivel para receber doacoes.'
                      : 'Solicitacoes pendentes chegam aqui para aprovacao ou rejeicao pela ONG.'}
                  </p>
                </div>
                <Handshake size={18} className="text-primary" />
              </div>

              {partnershipsNotice && (
                <div className="mt-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {partnershipsNotice}
                </div>
              )}

              {partnershipsError && (
                <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {partnershipsError}
                </div>
              )}

              {partnershipsLoading ? (
                <div className="mt-4 flex items-center gap-3 rounded-[1.5rem] bg-surface px-4 py-4 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  Carregando parcerias operacionais...
                </div>
              ) : profile.role === 'COLLECTION_POINT' ? (
                <div className="mt-4 space-y-3">
                  {activePartnership && (
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                      <p className="font-semibold">Pronto para doar</p>
                      <p className="mt-2 leading-7">
                        ONG ativa: {activePartnership.ngo.organizationName ?? activePartnership.ngo.name}.
                      </p>
                    </div>
                  )}

                  {!activePartnership && pendingPartnership && (
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                      <p className="font-semibold">Aguardando ONG</p>
                      <p className="mt-2 leading-7">
                        Solicitacao enviada para {pendingPartnership.ngo.organizationName ?? pendingPartnership.ngo.name}. O ponto fica visivel no mapa, mas ainda nao pode finalizar doacoes.
                      </p>
                    </div>
                  )}

                  {!activePartnership && !pendingPartnership && (
                    <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                      <p className="text-sm font-semibold text-primary-deeper">
                        Solicitar parceria a uma ONG
                      </p>
                      <p className="mt-2 text-sm leading-7 text-gray-500">
                        Escolha uma ONG parceira ativa para tornar este ponto elegivel para doacoes.
                      </p>

                      <div className="mt-4 space-y-3">
                        <label className="block text-sm text-gray-500">
                          <span className="mb-2 block font-semibold text-on-surface">ONG parceira</span>
                          <select
                            value={selectedNgoId}
                            onChange={(event) => setSelectedNgoId(event.target.value)}
                            disabled={!canRequestPartnership || ngoCandidatesLoading}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary/40 disabled:cursor-not-allowed disabled:bg-surface"
                          >
                            <option value="">
                              {ngoCandidatesLoading ? 'Carregando ONGs...' : 'Selecione uma ONG'}
                            </option>
                            {ngoCandidates.map((ngo) => (
                              <option key={ngo.id} value={ngo.id}>
                                {ngo.organizationName ?? ngo.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        {!canRequestPartnership && (
                          <p className="text-sm leading-7 text-gray-500">
                            {['ACTIVE', 'VERIFIED'].includes(profile.publicProfileState)
                              ? 'Seu ponto ja possui uma parceria ativa ou pendente.'
                              : 'Ative ou verifique o perfil publico do ponto antes de solicitar parceria.'}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => void handleRequestPartnership()}
                          disabled={!selectedNgoId || !canRequestPartnership || requesting}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300"
                        >
                          {requesting ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send size={15} />
                              Solicitar parceria
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {rejectedPartnerships.length > 0 && (
                    <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                      <p className="text-sm font-semibold text-primary-deeper">Historico recente</p>
                      <div className="mt-3 space-y-2 text-sm text-gray-500">
                        {rejectedPartnerships.slice(0, 2).map((partnership) => (
                          <p key={partnership.id}>
                            Solicitacao rejeitada por {partnership.ngo.organizationName ?? partnership.ngo.name}.
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {pendingRequests.length === 0 ? (
                    <div className="rounded-[1.5rem] bg-surface px-4 py-4 text-sm leading-7 text-gray-500">
                      Nenhuma solicitacao pendente no momento.
                    </div>
                  ) : (
                    pendingRequests.map((partnership) => {
                      const acting = actingPartnershipId === partnership.id;

                      return (
                        <div key={partnership.id} className="rounded-[1.5rem] bg-surface px-4 py-4">
                          <p className="text-sm font-semibold text-primary-deeper">
                            {partnership.collectionPoint.organizationName ?? partnership.collectionPoint.name}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-gray-500">
                              {formatAddressSummary(partnership.collectionPoint) ??
                                'Endereco publico ainda nao informado.'}
                            </p>
                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => void handleDecision(partnership.id, 'ACTIVE')}
                              disabled={acting}
                              className="rounded-2xl bg-primary-deeper px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300"
                            >
                              {acting ? 'Processando...' : 'Aprovar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDecision(partnership.id, 'REJECTED')}
                              disabled={acting}
                              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {activePartnership && (
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                      <p className="font-semibold">Parceria ativa</p>
                      <p className="mt-2 leading-7">
                        Este perfil ja opera com o ponto {activePartnership.collectionPoint.organizationName ?? activePartnership.collectionPoint.name}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {profile.profileCompletion.missingFields.length > 0 && (
              <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
                <p className="text-sm font-semibold">Campos essenciais pendentes</p>
                <div className="mt-3 space-y-2 text-sm">
                  {profile.profileCompletion.missingFields.map((field) => (
                    <div key={field} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="mt-1 text-amber-500" />
                      <span>{field}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[2rem] bg-white p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Informacoes publicas
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-primary-deeper">Contato e localizacao</p>
                <div className="mt-3 space-y-2 text-sm text-gray-500">
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="mt-1 text-primary" />
                      <span>
                        {formatAddressSummary(profile) ?? 'Endereco ainda nao informado'}
                      </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone size={15} className="mt-1 text-primary" />
                    <span>{profile.phone ?? 'Telefone ainda nao informado'}</span>
                  </div>
                </div>
              </div>

              {profile.role === 'COLLECTION_POINT' && (
                <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                  <p className="text-sm font-semibold text-primary-deeper">Atendimento no ponto</p>
                  <p className="mt-3 text-sm leading-7 text-gray-500">
                    {profile.openingHours ?? 'Horario ainda nao informado.'}
                  </p>
                  {profile.openingHoursExceptions && (
                    <p className="mt-3 text-sm leading-7 text-gray-500">
                      Excecoes: {profile.openingHoursExceptions}
                    </p>
                  )}
                  {profile.accessibilityDetails && (
                    <p className="mt-3 text-sm leading-7 text-gray-500">
                      Acessibilidade: {profile.accessibilityDetails}
                    </p>
                  )}
                </div>
              )}

              {profile.role === 'NGO' && (
                <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                  <p className="text-sm font-semibold text-primary-deeper">Cobertura da ONG</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(profile.serviceRegions ?? []).map((region) => (
                      <span
                        key={region}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {region}
                      </span>
                    ))}
                    {profile.serviceRegions.length === 0 && (
                      <span className="text-sm text-gray-500">Regioes ainda nao informadas.</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-500">
                    {profile.openingHours ?? 'Horario/base de atendimento ainda nao informado.'}
                  </p>
                  {profile.openingHoursExceptions && (
                    <p className="mt-2 text-sm leading-7 text-gray-500">
                      Excecoes: {profile.openingHoursExceptions}
                    </p>
                  )}
                </div>
              )}

              {(profile.accessibilityFeatures.length > 0 || profile.accessibilityDetails) && (
                <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                  <p className="text-sm font-semibold text-primary-deeper">Acessibilidade</p>
                  {profile.accessibilityFeatures.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.accessibilityFeatures.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary"
                        >
                          {ACCESSIBILITY_LABELS[feature] ?? feature}
                        </span>
                      ))}
                    </div>
                  )}
                  {profile.accessibilityDetails && (
                    <p className="mt-3 text-sm leading-7 text-gray-500">
                      {profile.accessibilityDetails}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-primary-deeper">Galeria publica</p>
                {publishedImages.galleryImageUrls.length > 0 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {publishedImages.galleryImageUrls.slice(0, 4).map((imageUrl, index) => (
                      <SafeImage
                        key={imageUrl}
                        src={imageUrl}
                        alt={`Foto publica ${index + 1} de ${title}`}
                        className="h-36 w-full rounded-[1.25rem]"
                        fallbackLabel="Foto indisponível"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-gray-500">
                    Nenhuma foto adicional publicada ainda.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Itens e regras
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-primary-deeper">Categorias aceitas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile.acceptedCategories ?? []).map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {CATEGORY_LABELS[category] ?? category}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-primary-deeper">Regras do local</p>
                <div className="mt-3 space-y-2 text-sm text-gray-500">
                  {(profile.rules ?? []).map((rule) => (
                    <p key={rule}>- {rule}</p>
                  ))}
                  {profile.rules.length === 0 && <p>Nenhuma regra publica cadastrada ainda.</p>}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-primary-deeper">Itens nao aceitos</p>
                <div className="mt-3 space-y-2 text-sm text-gray-500">
                  {(profile.nonAcceptedItems ?? []).map((rule) => (
                    <p key={rule}>- {rule}</p>
                  ))}
                  {profile.nonAcceptedItems.length === 0 && (
                    <p>Nenhuma restricao publica cadastrada ainda.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
