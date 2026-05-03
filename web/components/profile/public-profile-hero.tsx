'use client';

import Link from 'next/link';
import { Camera, CheckCircle2, Loader2, MailWarning, Send, Settings } from 'lucide-react';
import { LevelRing } from '@/components/profile/level-ring';
import { cn } from '@/lib/utils';
import type { DonorGamificationResponse } from '@/lib/api';

type PublicProfileHeroProps = {
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  avatarUrl: string | null;
  initials: string;
  level: DonorGamificationResponse['level'] | null;
  levelName: string;
  streakMonths: number;
  points: number;
  donationsCount: number;
  completedCount: number;
  itemsCount: number;
  showPrivateEmail: boolean;
  showSettingsLink: boolean;
  avatarUploading: boolean;
  emailVerificationSending: boolean;
  emailVerificationMessage: string | null;
  emailVerificationError: string | null;
  onAvatarFileSelected: (file: File | null | undefined) => void;
  onResendEmailVerification: () => void;
};

export function PublicProfileHero({
  name,
  email,
  emailVerifiedAt,
  avatarUrl,
  initials,
  level,
  levelName,
  streakMonths,
  points,
  donationsCount,
  completedCount,
  itemsCount,
  showPrivateEmail,
  showSettingsLink,
  avatarUploading,
  emailVerificationSending,
  emailVerificationMessage,
  emailVerificationError,
  onAvatarFileSelected,
  onResendEmailVerification,
}: PublicProfileHeroProps) {
  return (
    <header className="relative overflow-hidden px-5 pb-16 pt-12 sm:px-8 lg:px-12">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[410px] bg-[linear-gradient(180deg,#faf7f1_0%,#faf7f1_64%,#ffffff_100%)]"
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-8 -z-10 h-[360px] w-[360px] opacity-60"
      >
        <defs>
          <pattern id="profile-hero-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(0,106,98,0.18)" />
          </pattern>
        </defs>
        <rect width="360" height="360" fill="url(#profile-hero-dots)" />
      </svg>

      <div className="mx-auto grid max-w-[1080px] gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            Perfil · Doador
          </p>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-[76px] w-[76px] flex-shrink-0 overflow-visible">
              <div className="h-[76px] w-[76px] overflow-hidden rounded-[22px] bg-primary-deeper text-white shadow-[0_16px_38px_rgba(0,51,60,0.2)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-extrabold">
                    {initials || '?'}
                  </div>
                )}
              </div>
              <label
                className={cn(
                  'absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-primary-deeper shadow-md transition-transform hover:scale-105',
                  avatarUploading && 'pointer-events-none opacity-60',
                )}
                aria-label="Atualizar avatar"
              >
                {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={avatarUploading}
                  onChange={(event) => onAvatarFileSelected(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-4xl font-extrabold leading-none tracking-tight text-primary-deeper sm:text-5xl lg:text-6xl">
                  {name}
                </h1>
                {showSettingsLink && (
                  <Link
                    href="/configuracoes"
                    aria-label="Abrir configurações"
                    className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-primary-deeper/10 bg-white/80 text-primary-deeper shadow-sm transition-colors hover:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Settings size={18} />
                  </Link>
                )}
              </div>

              {showPrivateEmail && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-primary-deeper/60">
                  <span className="break-all">{email}</span>
                  {emailVerifiedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      <CheckCircle2 size={12} />
                      e-mail verificado
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        <MailWarning size={12} />
                        e-mail não verificado
                      </span>
                      <button
                        type="button"
                        onClick={onResendEmailVerification}
                        disabled={emailVerificationSending}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:border-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {emailVerificationSending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        reenviar confirmação
                      </button>
                    </>
                  )}
                </div>
              )}

              {emailVerificationMessage && (
                <p className="mt-2 text-xs text-emerald-700">{emailVerificationMessage}</p>
              )}
              {emailVerificationError && (
                <p className="mt-2 text-xs text-red-600">{emailVerificationError}</p>
              )}
            </div>
          </div>

          <p className="mt-7 max-w-xl text-lg leading-8 text-primary-deeper/70">
            <strong className="font-extrabold text-primary-deeper">{levelName}</strong>
            {' — '}
            <span>
              constância de {streakMonths}{' '}
              {streakMonths === 1 ? 'mês seguido' : 'meses seguidos'}.
            </span>
          </p>

          <div className="mt-8 flex flex-col border-t border-primary-deeper/10 sm:flex-row">
            <HeroStat value={donationsCount} label="doações" />
            <HeroStat value={completedCount} label="concluídas" divided />
            <HeroStat value={itemsCount} label="itens entregues" divided />
          </div>
        </div>

        <LevelRing
          points={points}
          level={level}
          className="justify-self-center lg:justify-self-end"
        />
      </div>
    </header>
  );
}

function HeroStat({ value, label, divided = false }: { value: number; label: string; divided?: boolean }) {
  return (
    <div
      className={cn(
        'min-w-0 flex-1 py-5 sm:pr-8',
        divided && 'border-t border-primary-deeper/10 sm:border-l sm:border-t-0 sm:pl-8',
      )}
    >
      <span className="block text-4xl font-extrabold leading-none tracking-tight text-primary-deeper tabular-nums">
        {value.toLocaleString('pt-BR')}
      </span>
      <span className="mt-2 block text-xs text-primary-deeper/55">{label}</span>
    </div>
  );
}
