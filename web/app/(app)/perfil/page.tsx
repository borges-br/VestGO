'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  Bell,
  Camera,
  ChevronRight,
  Edit3,
  Flame,
  HelpCircle,
  LogOut,
  Package,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AwardBadge, type AwardBadgeTier, type AwardBadgeType } from '@/components/ui/award-badge';
import { OperationalProfileSummary } from '@/components/profile/operational-profile-summary';
import {
  getMyProfile,
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

const DONATION_INTEREST_OPTIONS = [
  { value: 'CLOTHING', label: 'Roupas' },
  { value: 'SHOES', label: 'Calcados' },
  { value: 'ACCESSORIES', label: 'Acessorios' },
  { value: 'BAGS', label: 'Bolsas' },
  { value: 'OTHER', label: 'Outros' },
] as const;

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
  const [donorProfileSuccess, setDonorProfileSuccess] = useState<string | null>(null);
  const [savingDonorProfile, setSavingDonorProfile] = useState(false);
  const [donorProfileForm, setDonorProfileForm] = useState({
    birthDate: '',
    city: '',
    state: '',
    donationInterestCategories: [] as string[],
  });
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
          setProfileError('Nao foi possivel carregar seu perfil agora.');
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

  useEffect(() => {
    if (session?.user?.role !== 'DONOR' || !profile) {
      return;
    }

    setDonorProfileForm({
      birthDate: profile.birthDate ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      donationInterestCategories: profile.donationInterestCategories ?? [],
    });
  }, [profile, session?.user?.role]);

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

  if (status === 'loading') {
    return (
      <div className="px-4 pb-6 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell">
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

  const userName = session?.user?.name ?? 'Usuário';
  const userEmail = session?.user?.email ?? '';
  const userRole = session?.user?.role ?? 'DONOR';
  const userAvatar = session?.user?.image ?? profile?.avatarUrl ?? null;
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
      setDonorProfileSuccess(null);
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

  function toggleDonationInterest(category: string) {
    setDonorProfileForm((current) => {
      const exists = current.donationInterestCategories.includes(category);

      return {
        ...current,
        donationInterestCategories: exists
          ? current.donationInterestCategories.filter((item) => item !== category)
          : [...current.donationInterestCategories, category],
      };
    });
    setDonorProfileSuccess(null);
    setProfileError(null);
  }

  async function handleSaveDonorProfile() {
    if (!session?.user?.accessToken || !profile) {
      return;
    }

    setSavingDonorProfile(true);
    setProfileError(null);
    setDonorProfileSuccess(null);

    try {
      const updated = await updateMyProfile(
        {
          name: profile.name,
          email: profile.email,
          birthDate: donorProfileForm.birthDate || undefined,
          city: donorProfileForm.city || undefined,
          state: donorProfileForm.state || undefined,
          donationInterestCategories: donorProfileForm.donationInterestCategories,
        },
        session.user.accessToken,
      );

      setProfile(updated);
      setDonorProfileSuccess('Perfil complementar salvo com sucesso.');
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel salvar seu perfil complementar agora.',
      );
    } finally {
      setSavingDonorProfile(false);
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Soft gradient wash, bleeds fluidly */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(33,211,196,0.16),transparent_65%),linear-gradient(180deg,#f4faf8,#ffffff_70%)]"
      />

      <div className="relative px-4 pt-12 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-shell flex-col gap-14">
          {/* ──────────────────── HEADER ──────────────────── */}
          <header className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="relative h-28 w-28 overflow-hidden rounded-[2rem] bg-primary-deeper shadow-xl shadow-primary/20 ring-4 ring-white">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
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
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary-deeper shadow-md transition-transform hover:scale-105 disabled:opacity-60"
                aria-label="Atualizar avatar"
              >
                <Camera size={14} />
              </button>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary-deeper sm:text-4xl">
                {userName}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{userEmail}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-700">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Sparkles size={14} className="text-primary" />
                  {ROLE_LABELS[userRole] ?? userRole}
                </span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>
                  <span className="font-bold text-primary-deeper">
                    {snapshot.points.toLocaleString('pt-BR')}
                  </span>{' '}
                  pontos
                </span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="inline-flex items-center gap-1.5">
                  <Flame size={14} className="text-amber-500" />
                  <span className="font-bold text-primary-deeper">{snapshot.streak.value}</span>
                  {snapshot.streak.value === 1 ? 'mês seguido' : 'meses seguidos'}
                </span>
              </div>
              {/* Level chip — only shown for donors */}
              {userRole === 'DONOR' && (
                <div className="mt-3 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600 shadow-sm">
                    <TrendingUp size={11} className="text-primary" />
                    {getDonorLevel(snapshot.points).name}
                  </span>
                </div>
              )}
            </div>

            {avatarUploading && (
              <p className="text-xs text-gray-500">Enviando novo avatar…</p>
            )}
            {profileError && (
              <p className="max-w-md rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                {profileError}
              </p>
            )}

            {donorCompletion &&
              (donorCompletion.missingFields?.length ?? 0) > 0 && (
                <a
                  href="#completar-perfil"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-primary-light"
                >
                  <Sparkles size={13} />
                  Complete seu perfil ({donorCompletion.completedItems ?? 0}/
                  {donorCompletion.totalItems ?? 0})
                  <ArrowDown size={12} />
                </a>
              )}
          </header>

          {/* ──────────────────── STATS STRIP ──────────────────── */}
          <section aria-labelledby="stats-heading" className="relative">
            <h2 id="stats-heading" className="sr-only">
              Resumo
            </h2>
            <div className="mx-auto grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-2xl bg-primary/10">
              <Stat value={donations.length} label="doações" />
              <Stat value={completed} label="concluídas" />
              <Stat value={itemsTotal} label="itens" />
            </div>
            {impactError && (
              <p className="mx-auto mt-3 max-w-md rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                {impactError}
              </p>
            )}
          </section>

          {/* ──────────────────── BADGES ──────────────────── */}
          <section aria-labelledby="badges-heading">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Conquistas
                </p>
                <h2
                  id="badges-heading"
                  className="mt-1 text-2xl font-bold text-primary-deeper"
                >
                  Sua coleção solidária
                </h2>
              </div>
              <p className="hidden text-xs text-gray-500 sm:block">
                Passe o mouse nos medalhões para ver o brilho
              </p>
            </div>

            {loadingImpact && donations.length === 0 ? (
              <p className="text-sm text-gray-500">Carregando conquistas…</p>
            ) : (
              <div className="grid justify-items-center gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        {badge.progressLabel}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ──────────────────── RECENT TIMELINE ──────────────────── */}
          <section aria-labelledby="history-heading">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Últimas entregas
                </p>
                <h2
                  id="history-heading"
                  className="mt-1 text-2xl font-bold text-primary-deeper"
                >
                  Sua linha do tempo
                </h2>
              </div>
              <Link
                href="/rastreio"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-deeper"
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
                      className="group flex items-start gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-white"
                    >
                      <div className="relative z-[1] flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm">
                        <Package size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-primary-deeper">
                            {donation.itemLabel}
                          </p>
                          <span className="flex-shrink-0 text-[11px] text-gray-400">
                            {formatMonthLabel(donation.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
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
              <p className="text-sm text-gray-500">
                Assim que você registrar uma doação, ela aparece aqui.
              </p>
            )}
          </section>

          {/* ──────────────────── COMPLETAR PERFIL ──────────────────── */}
          <section
            id="completar-perfil"
            aria-labelledby="profile-completion-heading"
            className="mx-auto w-full max-w-4xl scroll-mt-24"
          >
            <div className="rounded-[2rem] border border-gray-100 bg-white/80 p-6 shadow-card">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                    Perfil complementar
                  </p>
                  <h2
                    id="profile-completion-heading"
                    className="mt-1 text-2xl font-bold text-primary-deeper"
                  >
                    Complete seu perfil no seu ritmo
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    Esses dados continuam opcionais. Eles ajudam o VestGO a melhorar
                    personalização e descoberta local sem mexer no cadastro inicial.
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-surface px-4 py-3 text-sm text-gray-600">
                  <p className="font-semibold text-primary-deeper">
                    {donorCompletion?.completedItems ?? 0} de {donorCompletion?.totalItems ?? 0}{' '}
                    itens concluídos
                  </p>
                  {donorCompletion?.missingFields?.length ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Faltando: {donorCompletion.missingFields.join(', ')}.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      Perfil complementar em dia.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm text-gray-500">
                  <span className="font-semibold text-on-surface">Data de nascimento</span>
                  <input
                    type="date"
                    value={donorProfileForm.birthDate}
                    onChange={(event) => {
                      setDonorProfileForm((current) => ({
                        ...current,
                        birthDate: event.target.value,
                      }));
                      setDonorProfileSuccess(null);
                      setProfileError(null);
                    }}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-500">
                  <span className="font-semibold text-on-surface">Cidade</span>
                  <input
                    value={donorProfileForm.city}
                    onChange={(event) => {
                      setDonorProfileForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }));
                      setDonorProfileSuccess(null);
                      setProfileError(null);
                    }}
                    placeholder="Ex.: Sorocaba"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-500">
                  <span className="font-semibold text-on-surface">Estado</span>
                  <input
                    value={donorProfileForm.state}
                    onChange={(event) => {
                      setDonorProfileForm((current) => ({
                        ...current,
                        state: event.target.value,
                      }));
                      setDonorProfileSuccess(null);
                      setProfileError(null);
                    }}
                    placeholder="Ex.: SP"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </label>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-primary-deeper">
                  Interesses de doação
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Escolha categorias que fazem sentido para o seu momento solidário.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {DONATION_INTEREST_OPTIONS.map((option) => {
                    const selected = donorProfileForm.donationInterestCategories.includes(
                      option.value,
                    );

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleDonationInterest(option.value)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                          selected
                            ? 'border-primary bg-primary-light text-primary-deeper'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {donorProfileSuccess && (
                <p className="mt-5 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {donorProfileSuccess}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveDonorProfile()}
                  disabled={savingDonorProfile || loadingProfile}
                  className="inline-flex items-center justify-center rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingDonorProfile ? 'Salvando perfil...' : 'Salvar perfil complementar'}
                </button>
                <Link
                  href="/configuracoes"
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary"
                >
                  Ajustes da conta
                </Link>
              </div>
            </div>
          </section>

          {/* ──────────────────── ACCOUNT MENU ──────────────────── */}
          <section
            aria-labelledby="account-heading"
            className="mx-auto w-full max-w-2xl"
          >
            <div className="mb-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                Conta
              </p>
              <h2
                id="account-heading"
                className="mt-1 text-2xl font-bold text-primary-deeper"
              >
                Ajustes e suporte
              </h2>
            </div>

            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white/70">
              {menuItems.map(({ icon: Icon, label, href }) => (
                <Link
                  key={href + label}
                  href={href}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface/80"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <Icon size={15} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-primary-deeper">
                    {label}
                  </span>
                  <ChevronRight size={14} className="text-gray-300" />
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white py-3.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut size={15} />
              Sair da conta
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white py-5">
      <span className="text-3xl font-bold text-primary-deeper">
        {value.toLocaleString('pt-BR')}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
