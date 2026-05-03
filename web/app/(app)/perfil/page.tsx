'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Flame,
  HelpCircle,
  Loader2,
  LogOut,
  MailCheck,
  MailWarning,
  Package,
  Send,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AwardBadge, type AwardBadgeTier, type AwardBadgeType } from '@/components/ui/award-badge';
import { OperationalProfileSummary } from '@/components/profile/operational-profile-summary';
import {
  getMyProfile,
  requestEmailVerification,
  getUserDonations,
  updateMyProfile,
  uploadProfileAsset,
  type DonationRecord,
  type MyProfile,
} from '@/lib/api';
import { buildImpactSnapshot, getDonorLevel } from '@/lib/gamification';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  DONOR: 'Doador',
  COLLECTION_POINT: 'Ponto de Coleta',
  NGO: 'ONG Parceira',
  ADMIN: 'Administrador',
};

const menuItems = [
  { icon: Edit3, label: 'Configurações da conta', href: '/configuracoes' },
  { icon: Shield, label: 'Privacidade e segurança', href: '/perfil/privacidade' },
  { icon: Bell, label: 'Notificações', href: '/notificacoes' },
  { icon: HelpCircle, label: 'Suporte e FAQ', href: '/suporte' },
];

type BadgeEntry = {
  type: AwardBadgeType;
  tier: AwardBadgeTier;
  earned: boolean;
  earnedAt?: string;
  progressLabel?: string;
  subtitle?: string;
};

function pickTier(value: number, thresholds: [number, number, number]): AwardBadgeTier {
  if (value >= thresholds[2]) return 'ouro';
  if (value >= thresholds[1]) return 'prata';
  return 'bronze';
}

function formatMonthLabel(input: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' })
    .format(new Date(input))
    .replace('.', '');
}

function buildBadges(donations: DonationRecord[]): BadgeEntry[] {
  const ordered = [...donations].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const completed = donations.filter(
    (d) => d.status === 'DELIVERED' || d.status === 'DISTRIBUTED',
  );
  const usedPoints = new Set(
    donations.map((d) => d.dropOffPoint?.id).filter(Boolean) as string[],
  ).size;
  const monthSet = new Set(
    donations.map((d) => {
      const date = new Date(d.createdAt);
      return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    }),
  );
  const monthsActive = monthSet.size;

  const first = ordered[0];

  return [
    {
      type: 'primeira-doacao',
      tier: pickTier(donations.length, [1, 5, 20]),
      earned: donations.length >= 1,
      earnedAt: first ? formatMonthLabel(first.createdAt) : undefined,
      subtitle:
        donations.length >= 20
          ? '20+ doações registradas'
          : donations.length >= 5
            ? '5+ doações registradas'
            : 'Jornada iniciada',
      progressLabel: donations.length === 0 ? 'Faça sua primeira doação' : undefined,
    },
    {
      type: 'constancia',
      tier: pickTier(monthsActive, [2, 4, 6]),
      earned: monthsActive >= 2,
      subtitle: `${monthsActive} ${monthsActive === 1 ? 'mês ativo' : 'meses ativos'}`,
      progressLabel: monthsActive < 2 ? `${monthsActive}/2 meses ativos` : undefined,
    },
    {
      type: 'mes-solidario',
      tier: pickTier(completed.length, [1, 5, 15]),
      earned: completed.length >= 1,
      subtitle:
        completed.length >= 15
          ? '15+ entregas concluídas'
          : completed.length >= 5
            ? '5+ entregas concluídas'
            : 'Primeira entrega concluída',
      progressLabel:
        completed.length < 1 ? 'Complete uma entrega' : undefined,
    },
    {
      type: 'rede-ativa',
      tier: pickTier(usedPoints, [2, 4, 6]),
      earned: usedPoints >= 2,
      subtitle: `${usedPoints} ${usedPoints === 1 ? 'ponto parceiro' : 'pontos parceiros'}`,
      progressLabel: usedPoints < 2 ? `${usedPoints}/2 pontos parceiros` : undefined,
    },
    {
      type: 'heroi-solidario',
      tier: pickTier(donations.length, [10, 30, 100]),
      earned: donations.length >= 10,
      subtitle:
        donations.length >= 100
          ? 'Lenda solidária'
          : donations.length >= 30
            ? 'Referência da rede'
            : 'Destaque do período',
      progressLabel:
        donations.length < 10 ? `${donations.length}/10 doações` : undefined,
    },
  ];
}

export default function PerfilPage() {
  const { data: session, status, update: updateSession } = useSession();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loadingImpact, setLoadingImpact] = useState(true);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [emailVerificationSending, setEmailVerificationSending] = useState(false);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState<string | null>(null);
  const [emailVerificationError, setEmailVerificationError] = useState<string | null>(null);
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
          const [response, nextProfile] = await Promise.all([
            getUserDonations(session.user.accessToken, { limit: 50 }),
            getMyProfile(session.user.accessToken),
          ]);
          setDonations(response.data);
          setProfile(nextProfile);
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
      loadProfileContext();
    }
  }, [loadOperationalProfile, session?.user?.accessToken, status]);

  const snapshot = useMemo(() => buildImpactSnapshot(donations), [donations]);
  const badges = useMemo(() => buildBadges(donations), [donations]);
  const completed = useMemo(
    () =>
      donations.filter((d) => d.status === 'DELIVERED' || d.status === 'DISTRIBUTED').length,
    [donations],
  );
  const itemsTotal = useMemo(
    () => donations.reduce((sum, d) => sum + d.itemCount, 0),
    [donations],
  );
  const recentDonations = useMemo(() => donations.slice(0, 5), [donations]);
  const donorCompletion = profile?.profileCompletion;
  const completionMissing = donorCompletion?.missingFields?.length ?? 0;
  const showCompletionCta = completionMissing > 0;

  if (status === 'loading') {
    return (
      <div className="px-4 pb-6 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell">
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando perfil...</p>
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

  const userName = session?.user?.name ?? 'Usuário';
  const userEmail = session?.user?.email ?? '';
  const userRole = session?.user?.role ?? 'DONOR';
  const userAvatar = session?.user?.image ?? profile?.avatarUrl ?? null;
  const emailVerifiedAt = profile?.emailVerifiedAt ?? session?.user?.emailVerifiedAt ?? null;
  const initials = userName
    .split(' ')
    .map((name) => name[0])
    .slice(0, 2)
    .join('');

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
        },
      });
      setProfile(updated);
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
      setEmailVerificationError('Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.');
    } finally {
      setEmailVerificationSending(false);
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Soft gradient wash — light mode only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(33,211,196,0.16),transparent_65%),linear-gradient(180deg,#f4faf8,#ffffff_70%)] dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[480px] dark:block bg-[radial-gradient(ellipse_at_50%_0%,rgba(33,211,196,0.10),transparent_70%)]"
      />

      <div className="relative px-4 pt-10 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-shell flex-col gap-10 lg:grid lg:grid-cols-[1fr_360px] lg:gap-10 lg:items-start">
          {/* ──────────────────── MAIN COLUMN ──────────────────── */}
          <div className="flex flex-col gap-12 min-w-0">
            <header className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
              <div className="relative">
                <div className="relative h-24 w-24 overflow-hidden rounded-[1.75rem] bg-primary-deeper shadow-xl shadow-primary/20 ring-4 ring-white dark:ring-surface-inkSoft">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                      {initials || '?'}
                    </div>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void handleDonorAvatarUpload(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary-deeper shadow-md transition-transform hover:scale-105 disabled:opacity-60 dark:bg-surface-inkSoft dark:text-primary-muted"
                  aria-label="Atualizar avatar"
                >
                  <Camera size={14} />
                </button>
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary-deeper dark:text-white sm:text-4xl">
                  {userName}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
                <div className="mt-3 flex flex-col items-center gap-2 lg:items-start">
                  {emailVerifiedAt ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                      <MailCheck size={12} />
                      Email verificado
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                        <MailWarning size={12} />
                        Email não verificado
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleResendEmailVerification()}
                        disabled={emailVerificationSending}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-primary transition-colors hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-surface-inkSoft dark:text-primary-muted"
                      >
                        {emailVerificationSending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        Reenviar confirmação
                      </button>
                    </div>
                  )}
                  {emailVerificationMessage && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">{emailVerificationMessage}</p>
                  )}
                  {emailVerificationError && (
                    <p className="text-xs text-red-600 dark:text-red-300">{emailVerificationError}</p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-300 lg:justify-start">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Sparkles size={14} className="text-primary" />
                    {ROLE_LABELS[userRole] ?? userRole}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-white/20" />
                  <span>
                    <span className="font-bold text-primary-deeper dark:text-primary-muted">
                      {snapshot.points.toLocaleString('pt-BR')}
                    </span>{' '}
                    pontos
                  </span>
                  <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-white/20" />
                  <span className="inline-flex items-center gap-1.5">
                    <Flame size={14} className="text-amber-500" />
                    <span className="font-bold text-primary-deeper dark:text-primary-muted">
                      {snapshot.streak.value}
                    </span>
                    {snapshot.streak.value === 1 ? 'mês seguido' : 'meses seguidos'}
                  </span>
                </div>

                {userRole === 'DONOR' && (
                  <div className="mt-3 flex items-center justify-center lg:justify-start">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600 shadow-sm dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-300">
                      <TrendingUp size={11} className="text-primary" />
                      {getDonorLevel(snapshot.points).name}
                    </span>
                  </div>
                )}
              </div>

              {avatarUploading && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Enviando novo avatar…</p>
              )}
              {profileError && (
                <p className="max-w-md rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {profileError}
                </p>
              )}
            </header>

            {/* STATS STRIP */}
            <section aria-labelledby="stats-heading" className="relative">
              <h2 id="stats-heading" className="sr-only">
                Resumo
              </h2>
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-primary/10 dark:bg-white/10">
                <Stat value={donations.length} label="doações" />
                <Stat value={completed} label="concluídas" />
                <Stat value={itemsTotal} label="itens" />
              </div>
              {impactError && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  {impactError}
                </p>
              )}
            </section>

            {/* BADGES */}
            <section aria-labelledby="badges-heading">
              <div className="mb-6 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                    Conquistas
                  </p>
                  <h2
                    id="badges-heading"
                    className="mt-1 text-2xl font-bold text-primary-deeper dark:text-white"
                  >
                    Sua coleção solidária
                  </h2>
                </div>
              </div>

              {loadingImpact && donations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Carregando conquistas…</p>
              ) : (
                <div className="grid justify-items-center gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5">
                  {badges.map((badge) => (
                    <div
                      key={badge.type}
                      className={cn(
                        'flex w-full max-w-[260px] flex-col items-center text-center transition-opacity',
                        !badge.earned && 'opacity-50 grayscale-[55%]',
                      )}
                    >
                      <AwardBadge
                        type={badge.type}
                        tier={badge.tier}
                        subtitle={badge.subtitle}
                        earnedAt={badge.earned ? badge.earnedAt : undefined}
                        className="!w-full"
                      />
                      {!badge.earned && badge.progressLabel && (
                        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {badge.progressLabel}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* RECENT TIMELINE */}
            <section aria-labelledby="history-heading">
              <div className="mb-6 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                    Últimas entregas
                  </p>
                  <h2
                    id="history-heading"
                    className="mt-1 text-2xl font-bold text-primary-deeper dark:text-white"
                  >
                    Sua linha do tempo
                  </h2>
                </div>
                <Link
                  href="/rastreio"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-deeper dark:hover:text-primary-muted"
                >
                  Ver tudo
                  <ChevronRight size={14} />
                </Link>
              </div>

              {recentDonations.length > 0 ? (
                <ol className="relative space-y-3 pl-1">
                  <div
                    aria-hidden
                    className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/30 via-primary/15 to-transparent"
                  />
                  {recentDonations.map((donation) => (
                    <li key={donation.id} className="relative">
                      <Link
                        href={`/rastreio/${donation.id}`}
                        className="group flex items-start gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-white dark:hover:bg-surface-inkSoft"
                      >
                        <div className="relative z-[1] flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm dark:border-surface-ink">
                          <Package size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-primary-deeper dark:text-white">
                              {donation.itemLabel}
                            </p>
                            <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                              {formatMonthLabel(donation.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                            {donation.dropOffPoint?.organizationName ??
                              donation.dropOffPoint?.name ??
                              'Destino em definição'}
                          </p>
                          <span className="mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-primary">
                            +{donation.pointsAwarded} pts
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Assim que você registrar uma doação, ela aparece aqui.
                </p>
              )}
            </section>
          </div>

          {/* ──────────────────── ASIDE COLUMN ──────────────────── */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-[6rem]">
            {/* Identity card */}
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-card dark:border-white/10 dark:bg-surface-inkSoft dark:shadow-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                Resumo da conta
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-light text-sm font-semibold text-primary dark:bg-primary/20 dark:text-primary-muted">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                  ) : (
                    initials || '?'
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface dark:text-gray-100">
                    {userName}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                  <dt>Papel</dt>
                  <dd className="font-semibold text-on-surface dark:text-gray-100">
                    {ROLE_LABELS[userRole] ?? userRole}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                  <dt>Pontos</dt>
                  <dd className="font-semibold text-on-surface dark:text-gray-100">
                    {snapshot.points.toLocaleString('pt-BR')}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                  <dt>Constância</dt>
                  <dd className="font-semibold text-on-surface dark:text-gray-100">
                    {snapshot.streak.value} {snapshot.streak.value === 1 ? 'mês' : 'meses'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Profile completion CTA — only when missing fields */}
            {showCompletionCta ? (
              <Link
                href="/configuracoes/perfil"
                className="group rounded-3xl border border-primary/20 bg-primary-light p-5 transition-colors hover:border-primary/40 dark:border-primary/30 dark:bg-primary/10 dark:hover:border-primary/50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-primary dark:bg-surface-inkSoft dark:text-primary-muted">
                    <Sparkles size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary-deeper dark:text-white">
                      Complete suas informações de cadastro
                    </p>
                    <p className="mt-1 text-xs text-primary-deeper/70 dark:text-primary-muted">
                      {donorCompletion?.completedItems ?? 0} de {donorCompletion?.totalItems ?? 0} itens preenchidos.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      Abrir configurações de cadastro
                      <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ) : donorCompletion ? (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 dark:bg-surface-inkSoft dark:text-emerald-300">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      Configurações de cadastro em dia
                    </p>
                    <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-300/70">
                      Tudo certo. Você pode revisar quando quiser em configurações.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Account menu */}
            <nav aria-label="Atalhos de conta" className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-card dark:border-white/10 dark:bg-surface-inkSoft dark:shadow-none">
              <ul className="divide-y divide-gray-100 dark:divide-white/5">
                {menuItems.map(({ icon: Icon, label, href }) => (
                  <li key={href + label}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface dark:hover:bg-white/5"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
                        <Icon size={15} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-primary-deeper dark:text-gray-100">
                        {label}
                      </span>
                      <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/30 dark:bg-surface-inkSoft dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut size={15} />
              Sair da conta
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white py-5 dark:bg-surface-inkSoft">
      <span className="text-3xl font-bold text-primary-deeper dark:text-white">
        {value.toLocaleString('pt-BR')}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}
