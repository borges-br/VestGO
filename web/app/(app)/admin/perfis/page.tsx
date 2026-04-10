'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, FileWarning, ShieldCheck, ShieldAlert, Ban, Info, User, Check, X } from 'lucide-react';
import { getAdminProfiles, updateAdminProfileStatus, type PublicProfileState } from '@/lib/api';
import type { MyProfile } from '@/lib/api';

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

export default function AdminPerfisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profiles, setProfiles] = useState<MyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');

  const fetchProfiles = useCallback(async () => {
    if (!session?.user?.accessToken) return;
    setLoading(true);
    try {
      const res = await getAdminProfiles(session.user.accessToken, {
        role: filterRole || undefined,
        status: filterStatus || undefined,
        limit: 50,
      });
      setProfiles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session, filterRole, filterStatus]);

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

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-deeper">Governanca de Perfis</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administre os pontos de coleta e ongs da plataforma.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-3xl bg-white p-4 shadow-sm">
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
      </div>

      <div className="flex flex-col gap-4">
        {profiles.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-gray-500 shadow-sm">
            Nenhum perfil encontrado com os filtros selecionados.
          </div>
        ) : (
          profiles.map((profile) => (
            <div key={profile.id} className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:flex-row sm:items-center">
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
              <div className="flex items-center gap-2 text-sm font-semibold">
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

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 sm:ml-auto">
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
