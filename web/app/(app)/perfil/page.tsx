'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Edit3,
  HelpCircle,
  LogOut,
  Shield,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  BadgeCollectionCard,
  ImpactHistoryCard,
  ImpactProgressCard,
  RankingPreviewCard,
} from '@/components/gamification/impact-widgets';
import { OperationalProfileSummary } from '@/components/profile/operational-profile-summary';
import {
  getMyProfile,
  getUserDonations,
  updateMyProfile,
  uploadProfileAsset,
  type DonationRecord,
  type MyProfile,
} from '@/lib/api';
import { buildImpactSnapshot, donorImpactSnapshot } from '@/lib/gamification';

const ROLE_LABELS: Record<string, string> = {
  DONOR: 'Doador',
  COLLECTION_POINT: 'Ponto de Coleta',
  NGO: 'ONG Parceira',
  ADMIN: 'Administrador',
};

const menuItems = [
  { icon: Edit3, label: 'Configuracoes da conta', href: '/configuracoes' },
  { icon: Shield, label: 'Privacidade e seguranca', href: '/perfil/privacidade' },
  { icon: Bell, label: 'Notificacoes', href: '/notificacoes' },
  { icon: HelpCircle, label: 'Suporte / FAQ', href: '/suporte' },
];

export default function PerfilPage() {
  const { data: session, status, update: updateSession } = useSession();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loadingImpact, setLoadingImpact] = useState(true);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const loadOperationalProfile = useCallback(async () => {
    if (!session?.user?.accessToken || session.user.role === 'DONOR') {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    setProfileError(null);

    try {
      const nextProfile = await getMyProfile(session.user.accessToken);
      setProfile(nextProfile);
    } catch {
      setProfileError('Nao foi possivel carregar o perfil operacional agora.');
    } finally {
      setLoadingProfile(false);
    }
  }, [session?.user?.accessToken, session?.user?.role]);

  useEffect(() => {
    async function loadProfileContext() {
      if (!session?.user?.accessToken) {
        setLoadingImpact(false);
        setLoadingProfile(false);
        return;
      }

      if (session.user.role === 'DONOR') {
        setLoadingImpact(true);
        setImpactError(null);

        try {
          const response = await getUserDonations(session.user.accessToken, { limit: 50 });
          setDonations(response.data);
        } catch {
          setImpactError('Nao foi possivel carregar seu historico agora.');
        } finally {
          setLoadingImpact(false);
          setLoadingProfile(false);
        }

        return;
      }

      await loadOperationalProfile();
      setLoadingImpact(false);
    }

    if (status !== 'loading') {
      loadProfileContext();
    }
  }, [loadOperationalProfile, session?.user?.accessToken, status]);

  if (status === 'loading') {
    return (
      <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell rounded-[2rem] bg-white p-6 shadow-card">
          <p className="text-sm text-gray-500">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role && session.user.role !== 'DONOR') {
    return (
      <OperationalProfileSummary
        profile={profile}
        loading={loadingProfile}
        error={profileError}
        accessToken={session.user.accessToken}
        onRefreshProfile={loadOperationalProfile}
      />
    );
  }

  const snapshot = buildImpactSnapshot(donations);
  const userName = session?.user?.name ?? 'Usuario';
  const userEmail = session?.user?.email ?? '';
  const userRole = session?.user?.role ?? 'DONOR';
  const userAvatar = session?.user?.image ?? null;
  const initials = userName
    .split(' ')
    .map((name) => name[0])
    .slice(0, 2)
    .join('');

  async function handleDonorAvatarUpload(file: File | null | undefined) {
    if (!file || !session?.user?.accessToken) {
      return;
    }

    setAvatarUploading(true);
    setProfileError(null);

    try {
      const uploaded = await uploadProfileAsset(
        {
          file,
          target: 'avatar',
        },
        session.user.accessToken,
      );

      const updated = await updateMyProfile(
        {
          name: userName,
          email: userEmail,
          avatarUrl: uploaded.url,
        },
        session.user.accessToken,
      );

      await updateSession({
        name: updated.name,
        email: updated.email,
        image: updated.avatarUrl ?? null,
      });
      setProfile(updated);
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel atualizar seu avatar agora.',
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
          <div className="rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                <Sparkles size={14} />
                Meu impacto
              </span>
              <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                baseado em doacoes reais
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary text-white shadow-sm">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="h-full w-full rounded-[1.75rem] object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold">{initials}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">{userName}</p>
                <p className="mt-2 truncate text-sm text-primary-muted">{userEmail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-muted">
                    {ROLE_LABELS[userRole] ?? userRole}
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-muted">
                    {snapshot.points} pontos solidarios
                  </span>
                  <span className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-muted">
                    {snapshot.streak.value} meses de participacao
                  </span>
                </div>
              </div>

              <div className="sm:ml-auto">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) =>
                    void handleDonorAvatarUpload(event.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {avatarUploading ? 'Enviando avatar...' : 'Atualizar avatar'}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">{snapshot.levelTitle}</p>
              <p className="mt-2 text-sm leading-7 text-primary-muted">
                Seu perfil agora e alimentado pelo mesmo historico persistido usado no wizard, no rastreio e no dashboard.
              </p>
            </div>

            {impactError && (
              <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {impactError}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(loadingImpact ? donorImpactSnapshot : snapshot).stats.map((item) => (
                <div key={item.label} className="rounded-[1.5rem] bg-white/10 p-4 backdrop-blur">
                  <p className="text-3xl font-bold">{item.value}</p>
                  <p className="mt-1 text-sm text-primary-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <ImpactProgressCard snapshot={loadingImpact ? donorImpactSnapshot : snapshot} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <BadgeCollectionCard badges={loadingImpact ? donorImpactSnapshot.badges : snapshot.badges} />

          <div className="space-y-4">
            <RankingPreviewCard snapshot={loadingImpact ? donorImpactSnapshot : snapshot} />

            <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Conta e suporte
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-primary-deeper">Ajustes da sua conta</h2>
                </div>
                <Trophy size={20} className="text-primary" />
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white">
                {menuItems.map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href + label}
                    href={href}
                    className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-surface"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-gray-500">
                      <Icon size={16} />
                    </div>
                    <span className="flex-1 text-sm text-on-surface">{label}</span>
                    <ChevronRight size={15} className="text-gray-300" />
                  </Link>
                ))}
              </div>

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-red-50 py-4 font-semibold text-red-500 transition-colors hover:bg-red-100"
              >
                <LogOut size={18} />
                Sair da conta
              </button>
            </div>
          </div>
        </section>

        <ImpactHistoryCard snapshot={loadingImpact ? donorImpactSnapshot : snapshot} />
      </div>
    </div>
  );
}
