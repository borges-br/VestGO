'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  ChevronRight,
  Edit3,
  HelpCircle,
  LogOut,
  Package,
  Shield,
} from 'lucide-react';
import { AchievementsScroller } from '@/components/profile/achievements-scroller';
import { GamificationSyncToast } from '@/components/profile/gamification-sync-toast';
import { OperationalProfileSummary } from '@/components/profile/operational-profile-summary';
import { PublicProfileHero } from '@/components/profile/public-profile-hero';
import { ImageCropperDialog } from '@/components/uploads/image-cropper-dialog';
import {
  getMyGamification,
  getMyProfile,
  getUserDonations,
  requestEmailVerification,
  syncMyGamification,
  updateMyProfile,
  uploadProfileAsset,
  type DonorGamificationResponse,
  type DonationRecord,
  type GamificationSyncResponse,
  type MyProfile,
} from '@/lib/api';
import { formatDayLabel, formatMonthLabel } from '@/lib/date-time';
import { IMAGE_CROP_PRESETS } from '@/lib/image-crop';

const footerLinks = [
  { icon: Edit3, label: 'Configurações da conta', href: '/configuracoes' },
  { icon: Shield, label: 'Privacidade e segurança', href: '/perfil/privacidade' },
  { icon: Bell, label: 'Notificações', href: '/notificacoes' },
  { icon: HelpCircle, label: 'Suporte e FAQ', href: '/suporte' },
];

const statusLabel: Record<DonationRecord['status'], string> = {
  PENDING: 'pendente',
  AT_POINT: 'no ponto',
  IN_TRANSIT: 'em trânsito',
  DELIVERED: 'entregue',
  DISTRIBUTED: 'distribuída',
  CANCELLED: 'cancelada',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function PerfilPage() {
  const { data: session, status, update: updateSession } = useSession();
  const syncedTokenRef = useRef<string | null>(null);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loadingImpact, setLoadingImpact] = useState(true);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [gamification, setGamification] = useState<DonorGamificationResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const [emailVerificationSending, setEmailVerificationSending] = useState(false);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState<string | null>(null);
  const [emailVerificationError, setEmailVerificationError] = useState<string | null>(null);
  const [gamificationSync, setGamificationSync] = useState<GamificationSyncResponse | null>(null);

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
      setProfileError('Não foi possível carregar o perfil operacional agora.');
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
        setLoadingProfile(true);
        setProfileError(null);

        try {
          const [donationResponse, nextProfile, nextGamification] = await Promise.all([
            getUserDonations(session.user.accessToken, { limit: 100 }),
            getMyProfile(session.user.accessToken),
            getMyGamification(session.user.accessToken),
          ]);

          setDonations(donationResponse.data);
          setProfile(nextProfile);
          setGamification(nextGamification);

          if (syncedTokenRef.current !== session.user.accessToken) {
            syncedTokenRef.current = session.user.accessToken;

            try {
              const sync = await syncMyGamification(session.user.accessToken);
              setGamification(sync.gamification);

              if (sync.pointsAwarded > 0 || sync.achievementsChanged > 0) {
                setGamificationSync(sync);
              }
            } catch {
              setImpactError('Perfil carregado, mas não foi possível atualizar suas conquistas agora.');
            }
          }
        } catch {
          setProfileError('Não foi possível carregar seu perfil agora.');
          setImpactError('Não foi possível carregar seu histórico agora.');
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
      void loadProfileContext();
    }
  }, [loadOperationalProfile, session?.user?.accessToken, session?.user?.role, status]);

  const achievements = gamification?.achievements ?? [];
  const completedDonationsCount = gamification?.summary.confirmedDonationsCount ?? 0;
  const deliveredItemsTotal = gamification?.summary.donatedItemsQuantity ?? 0;
  const recentDonations = useMemo(() => donations.slice(0, 5), [donations]);

  if (status === 'loading') {
    return (
      <div className="vg-page-bg px-5 py-8">
        <div className="vg-card mx-auto max-w-shell rounded-3xl p-6 shadow-card">
          <p className="vg-text-secondary text-sm">Carregando perfil...</p>
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

  const userName = profile?.name ?? session?.user?.name ?? 'Usuário';
  const userEmail = profile?.email ?? session?.user?.email ?? '';
  const userAvatar = profile ? profile.avatarUrl : session?.user?.image ?? null;
  const emailVerifiedAt = profile ? profile.emailVerifiedAt : session?.user?.emailVerifiedAt ?? null;
  const isOwner = Boolean(session?.user?.accessToken && session.user.role === 'DONOR');

  async function handleDonorAvatarUpload(file: File | null | undefined) {
    if (!file || !session?.user?.accessToken) return;

    setAvatarUploading(true);
    setProfileError(null);

    try {
      const uploaded = await uploadProfileAsset(
        { file, target: 'avatar' },
        session.user.accessToken,
      );

      const updated = await updateMyProfile(
        { name: userName, email: userEmail, avatarUrl: uploaded.url },
        session.user.accessToken,
      );

      await updateSession({
        user: {
          name: updated.name,
          email: updated.email,
          image: updated.avatarUrl ?? null,
          emailVerifiedAt: updated.emailVerifiedAt,
        },
      });
      setProfile(updated);
      const sync = await syncMyGamification(session.user.accessToken);
      setGamification(sync.gamification);

      if (sync.pointsAwarded > 0 || sync.achievementsChanged > 0) {
        setGamificationSync(sync);
      }
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar seu avatar agora.',
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleDonorAvatarSelected(file: File | null | undefined) {
    if (!file) return;
    setAvatarCropFile(file);
  }

  async function handleResendEmailVerification() {
    if (!session?.user?.accessToken) return;

    setEmailVerificationSending(true);
    setEmailVerificationMessage(null);
    setEmailVerificationError(null);

    try {
      const response = await requestEmailVerification(session.user.accessToken);
      setEmailVerificationMessage(
        response.alreadyVerified
          ? 'Seu e-mail já está confirmado.'
          : 'Enviamos um novo e-mail de confirmação.',
      );
    } catch {
      setEmailVerificationError(
        'Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.',
      );
    } finally {
      setEmailVerificationSending(false);
    }
  }

  return (
    <div className="vg-page-bg vg-dark-fix min-h-screen">
      {avatarCropFile ? (
        <ImageCropperDialog
          file={avatarCropFile}
          preset={IMAGE_CROP_PRESETS.avatar}
          onApply={async (file) => {
            setAvatarCropFile(null);
            await handleDonorAvatarUpload(file);
          }}
          onCancel={() => setAvatarCropFile(null)}
        />
      ) : null}

      <PublicProfileHero
        name={userName}
        email={userEmail}
        emailVerifiedAt={emailVerifiedAt}
        avatarUrl={userAvatar}
        initials={getInitials(userName)}
        level={gamification?.level ?? null}
        levelName={gamification?.level.name ?? 'Semente Solidária'}
        streakMonths={gamification?.summary.consecutiveActiveMonths ?? 0}
        points={gamification?.points ?? 0}
        pointsBreakdown={gamification?.pointsBreakdown ?? null}
        donationsCount={gamification?.summary.donationsCount ?? donations.length}
        completedCount={completedDonationsCount}
        itemsCount={deliveredItemsTotal}
        showPrivateEmail={isOwner}
        showSettingsLink={isOwner}
        avatarUploading={avatarUploading}
        emailVerificationSending={emailVerificationSending}
        emailVerificationMessage={emailVerificationMessage}
        emailVerificationError={emailVerificationError}
        onAvatarFileSelected={handleDonorAvatarSelected}
        onResendEmailVerification={() => void handleResendEmailVerification()}
      />

      <GamificationSyncToast
        sync={gamificationSync}
        onDismiss={() => setGamificationSync(null)}
      />

      {(profileError || impactError) && (
        <div className="mx-auto -mt-8 max-w-[1080px] px-5 sm:px-8 lg:px-12">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{profileError ?? impactError}</p>
          </div>
        </div>
      )}

      <AchievementsScroller achievements={achievements} />

      <section className="px-5 pb-16 pt-4 sm:px-8 lg:px-12" aria-labelledby="history-heading">
        <div className="mx-auto max-w-[1080px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                Últimas entregas
              </p>
              <h2
                id="history-heading"
              className="vg-text-primary text-3xl font-extrabold tracking-tight sm:text-4xl"
              >
                Sua linha do tempo
              </h2>
            </div>
            <Link
              href="/rastreio"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary/40"
            >
              Ver tudo
              <ChevronRight size={14} />
            </Link>
          </div>

          {loadingImpact && donations.length === 0 ? (
            <p className="vg-text-secondary text-sm">Carregando histórico...</p>
          ) : recentDonations.length > 0 ? (
            <ol className="list-none p-0">
              {recentDonations.map((donation, index) => (
                <li
                  key={donation.id}
                  className="grid gap-4 border-b border-[var(--vg-border)] py-6 last:border-b-0 sm:grid-cols-[76px_28px_minmax(0,1fr)_auto] sm:gap-6"
                >
                  <div className="flex items-baseline gap-2 sm:block">
                    <span className="vg-text-primary block text-3xl font-extrabold leading-none tracking-tight tabular-nums">
                      {formatDayLabel(donation.createdAt)}
                    </span>
                    <span className="vg-text-muted block text-[11px] tracking-wide">
                      {formatMonthLabel(donation.createdAt)}
                    </span>
                  </div>

                  <div className="relative hidden justify-center pt-2 sm:flex">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(0,106,98,0.12)]" />
                    {index < recentDonations.length - 1 && (
                      <span className="absolute bottom-[-1.5rem] top-7 w-px bg-primary-deeper/10" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={`/rastreio/${donation.id}`}
                      className="vg-text-primary text-base font-bold tracking-tight transition-colors hover:text-primary"
                    >
                      {donation.itemLabel}
                    </Link>
                    <p className="vg-text-secondary mt-1 text-sm leading-6">
                      Ponto parceiro:{' '}
                      <span className="vg-text-primary font-semibold">
                        {donation.dropOffPoint?.organizationName ??
                          donation.dropOffPoint?.name ??
                          'destino em definição'}
                      </span>
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      <Package size={12} />
                      {statusLabel[donation.status]}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="block text-lg font-extrabold text-primary tabular-nums">
                      +{donation.pointsAwarded}
                    </span>
                    <span className="vg-text-muted text-[11px]">pontos</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="vg-card-soft rounded-2xl p-5 text-sm leading-7">
              Assim que você registrar uma doação, ela aparece aqui com os dados reais do rastreio.
            </p>
          )}
        </div>
      </section>

      <footer className="vg-card-soft border-x-0 border-b-0 px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1080px]">
          <p className="vg-text-muted mb-5 text-[11px] font-bold uppercase tracking-[0.2em]">
            Conta
          </p>
          <div className="flex flex-wrap gap-x-7 gap-y-4 border-b border-[var(--vg-border)] pb-7">
            {footerLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="vg-text-secondary inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:text-primary"
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
            <p className="vg-text-muted text-xs">
              VestGO · {isOwner ? userEmail : 'perfil público'}
            </p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 transition-colors hover:text-red-600"
            >
              <LogOut size={15} />
              Sair da conta
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
