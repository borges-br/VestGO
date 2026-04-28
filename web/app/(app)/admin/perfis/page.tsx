'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  Clock,
  FileWarning,
  ShieldCheck,
  ShieldAlert,
  Ban,
  User,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  getAdminProfiles,
  reviewAdminProfileRevision,
  updateAdminProfileStatus,
  type AdminProfileRecord,
  type PublicProfileRevisionStatus,
  type PublicProfileState,
} from '@/lib/api';
import { SafeImage } from '@/components/ui/safe-image';

const STATUS_ICONS = {
  DRAFT: <FileWarning className="w-5 h-5 text-gray-400" />,
  PENDING: <Clock className="w-5 h-5 text-yellow-500" />,
  ACTIVE: <CheckCircle className="w-5 h-5 text-primary" />,
  VERIFIED: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
};

const STATUS_LABELS = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  VERIFIED: 'Verificado',
};

const ROLE_LABELS = {
  COLLECTION_POINT: 'Ponto de Coleta',
  NGO: 'ONG',
};

function getPendingImages(profile: AdminProfileRecord) {
  const payload = profile.pendingPublicRevision?.payload;

  return {
    avatarUrl:
      payload && 'avatarUrl' in payload
        ? (payload.avatarUrl ?? null)
        : profile.avatarUrl,
    coverImageUrl:
      payload && 'coverImageUrl' in payload
        ? (payload.coverImageUrl ?? null)
        : profile.coverImageUrl,
    galleryImageUrls:
      payload && Array.isArray(payload.galleryImageUrls)
        ? payload.galleryImageUrls.filter((item): item is string => typeof item === 'string')
        : profile.galleryImageUrls,
  };
}

function imageChangeLabel(current: string | null, pending: string | null) {
  if (!current && pending) return 'Imagem adicionada';
  if (current && !pending) return 'Imagem removida';
  if (current !== pending) return 'Imagem alterada';
  return 'Sem alteração visual';
}

function galleryChangeLabel(current: string[], pending: string[]) {
  if (current.length === 0 && pending.length > 0) return 'Galeria adicionada';
  if (current.length > 0 && pending.length === 0) return 'Galeria removida';
  if (JSON.stringify(current) !== JSON.stringify(pending)) return 'Galeria alterada';
  return 'Sem alteração visual';
}

function MediaCompareCard({
  title,
  current,
  pending,
  alt,
}: {
  title: string;
  current: string | null;
  pending: string | null;
  alt: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-deeper">{title}</p>
        <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-gray-500">
          {imageChangeLabel(current, pending)}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Atual
          </p>
          <SafeImage
            src={current}
            alt={`${alt} atual`}
            className="h-24 rounded-xl border border-gray-100"
            fallbackLabel="Sem imagem"
          />
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            Pendente
          </p>
          <SafeImage
            src={pending}
            alt={`${alt} pendente`}
            className="h-24 rounded-xl border border-amber-100"
            fallbackLabel={pending ? 'Imagem indisponível' : 'Sem imagem'}
          />
        </div>
      </div>
    </div>
  );
}

function GalleryCompare({
  current,
  pending,
  title,
}: {
  current: string[];
  pending: string[];
  title: string;
}) {
  const renderGallery = (images: string[], label: string) => (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.slice(0, 6).map((imageUrl, index) => (
            <SafeImage
              key={`${label}-${imageUrl}`}
              src={imageUrl}
              alt={`${title} ${label.toLowerCase()} ${index + 1}`}
              className="h-16 rounded-xl border border-gray-100"
              fallbackLabel="Falhou"
            />
          ))}
        </div>
      ) : (
        <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-surface px-3 text-center text-xs font-semibold text-gray-400">
          Sem fotos
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-deeper">
          Galeria
        </p>
        <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-gray-500">
          {galleryChangeLabel(current, pending)}
        </span>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {renderGallery(current, 'Atual')}
        {renderGallery(pending, 'Pendente')}
      </div>
    </div>
  );
}

function RevisionMediaComparison({ profile }: { profile: AdminProfileRecord }) {
  if (!profile.pendingPublicRevision) {
    return null;
  }

  const title = profile.organizationName || profile.name;
  const pending = getPendingImages(profile);

  return (
    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
      <p className="text-sm font-semibold text-primary-deeper">Imagens atuais vs pendentes</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">
        A coluna pendente mostra exatamente o que será publicado se o admin aprovar a revisão.
      </p>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <MediaCompareCard
          title="Avatar"
          current={profile.avatarUrl}
          pending={pending.avatarUrl}
          alt={`Avatar de ${title}`}
        />
        <MediaCompareCard
          title="Capa"
          current={profile.coverImageUrl}
          pending={pending.coverImageUrl}
          alt={`Capa de ${title}`}
        />
      </div>
      <div className="mt-3">
        <GalleryCompare
          current={profile.galleryImageUrls}
          pending={pending.galleryImageUrls}
          title={`Galeria de ${title}`}
        />
      </div>
    </div>
  );
}

export default function AdminPerfisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profiles, setProfiles] = useState<AdminProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRevisionStatus, setFilterRevisionStatus] =
    useState<PublicProfileRevisionStatus | ''>('');
  const [actingRevisionId, setActingRevisionId] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    if (!session?.user?.accessToken) return;
    setLoading(true);
    try {
      const res = await getAdminProfiles(session.user.accessToken, {
        role: filterRole || undefined,
        status: filterStatus || undefined,
        revisionStatus: filterRevisionStatus || undefined,
        limit: 50,
      });
      setProfiles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session, filterRole, filterStatus, filterRevisionStatus]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/inicio');
    } else if (status === 'authenticated') {
      fetchProfiles();
    }
  }, [status, session, router, fetchProfiles]);

  const handleStatusChange = async (id: string, newStatus: PublicProfileState) => {
    if (!session?.user?.accessToken) return;
    try {
      await updateAdminProfileStatus(id, newStatus, session.user.accessToken);
      // Refresh list
      fetchProfiles();
    } catch (err) {
      alert('Erro ao atualizar status');
    }
  };

  const handleRevisionDecision = async (
    id: string,
    action: 'APPROVE' | 'REJECT',
  ) => {
    if (!session?.user?.accessToken) return;
    try {
      setActingRevisionId(id);
      await reviewAdminProfileRevision(id, { action }, session.user.accessToken);
      fetchProfiles();
    } catch (err) {
      alert('Erro ao revisar alteracao pendente');
    } finally {
      setActingRevisionId(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-deeper">Governanca de Perfis</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administre os pontos de coleta e ongs da plataforma.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3 rounded-[1.5rem] bg-white p-3 shadow-sm">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-xl border-gray-200 bg-surface px-4 py-3 text-sm font-medium text-gray-700 focus:border-primary focus:ring-primary"
        >
          <option value="">Todos os papeis</option>
          <option value="COLLECTION_POINT">Pontos de Coleta</option>
          <option value="NGO">ONGs</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border-gray-200 bg-surface px-4 py-3 text-sm font-medium text-gray-700 focus:border-primary focus:ring-primary"
        >
          <option value="">Todos os status</option>
          <option value="DRAFT">Rascunho (Incompletos)</option>
          <option value="PENDING">Pendentes (Aguardando)</option>
          <option value="ACTIVE">Ativos</option>
          <option value="VERIFIED">Verificados</option>
        </select>

        <select
          value={filterRevisionStatus}
          onChange={(e) =>
            setFilterRevisionStatus((e.target.value as PublicProfileRevisionStatus | '') || '')
          }
          className="rounded-xl border-gray-200 bg-surface px-4 py-3 text-sm font-medium text-gray-700 focus:border-primary focus:ring-primary"
        >
          <option value="">Todas as revisoes</option>
          <option value="PENDING">Revisao pendente</option>
          <option value="REJECTED">Revisoes rejeitadas</option>
        </select>
      </div>

      <div className="flex flex-col gap-4">
        {profiles.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-gray-500 shadow-sm">
            Nenhum perfil encontrado com os filtros selecionados.
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="grid gap-4 rounded-[1.5rem] bg-white p-4 shadow-sm lg:grid-cols-[minmax(260px,1fr)_180px_minmax(260px,auto)] lg:items-center"
            >
              {/* Info Column */}
              <div className="flex flex-1 items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-surface text-gray-500">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-primary-deeper">
                    {profile.organizationName || profile.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5">
                      {ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] || profile.role}
                    </span>
                    <span>{profile.city && profile.state ? `${profile.city}, ${profile.state}` : 'Sem localizacao'}</span>
                  </div>
                </div>
              </div>

              {/* Status Info */}
              <div className="flex flex-col items-start gap-2 text-sm font-semibold">
                <div className="flex items-center gap-2">
                  {STATUS_ICONS[profile.publicProfileState]}
                  <span className={
                    profile.publicProfileState === 'ACTIVE' ? 'text-primary'
                      : profile.publicProfileState === 'VERIFIED' ? 'text-emerald-500'
                      : profile.publicProfileState === 'PENDING' ? 'text-yellow-500'
                      : 'text-gray-500'
                  }>
                    {STATUS_LABELS[profile.publicProfileState]}
                  </span>
                </div>
                {profile.pendingPublicRevision && (
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      profile.pendingPublicRevision.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    Revisao {profile.pendingPublicRevision.status === 'PENDING' ? 'pendente' : 'rejeitada'}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                {profile.pendingPublicRevision?.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleRevisionDecision(profile.id, 'APPROVE')}
                      disabled={actingRevisionId === profile.id}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary-deeper px-4 py-2 text-sm font-bold text-white transition hover:bg-primary"
                    >
                      <Check size={16} /> Aprovar alteracoes
                    </button>
                    <button
                      onClick={() => handleRevisionDecision(profile.id, 'REJECT')}
                      disabled={actingRevisionId === profile.id}
                      className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
                    >
                      <X size={16} /> Rejeitar alteracoes
                    </button>
                  </>
                )}
                {profile.publicProfileState === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(profile.id, 'ACTIVE')}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-deeper"
                    >
                      <Check size={16} /> Aprovar
                    </button>
                    <button
                      onClick={() => handleStatusChange(profile.id, 'DRAFT')}
                      className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
                    >
                      <X size={16} /> Reprovar
                    </button>
                  </>
                )}
                
                {profile.publicProfileState === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(profile.id, 'VERIFIED')}
                      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600 transition hover:bg-emerald-100"
                    >
                      <ShieldCheck size={16} /> Dar Selo
                    </button>
                    <button
                      onClick={() => handleStatusChange(profile.id, 'DRAFT')}
                      className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
                    >
                      <Ban size={16} /> Desativar
                    </button>
                  </>
                )}

                {profile.publicProfileState === 'VERIFIED' && (
                  <button
                    onClick={() => handleStatusChange(profile.id, 'ACTIVE')}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
                  >
                    <ShieldAlert size={16} /> Remover Selo
                  </button>
                )}
              </div>

              {profile.pendingPublicRevision && (
                <div className="rounded-2xl bg-surface px-4 py-4 text-sm text-gray-600 lg:col-span-3 xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-4">
                  <div>
                    <p className="font-semibold text-primary-deeper">Campos em revisao</p>
                    <p className="mt-2 leading-7">
                      {profile.pendingPublicRevision.fields.length > 0
                        ? profile.pendingPublicRevision.fields.join(', ')
                        : 'Alteracoes publicas aguardando avaliacao.'}
                    </p>
                    {profile.pendingPublicRevision.reviewNotes && (
                      <p className="mt-2 text-xs text-gray-500">
                        Observacao anterior: {profile.pendingPublicRevision.reviewNotes}
                      </p>
                    )}
                  </div>
                  <RevisionMediaComparison profile={profile} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
