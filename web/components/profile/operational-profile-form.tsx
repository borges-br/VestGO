'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Users,
} from 'lucide-react';
import {
  getMyProfile,
  uploadProfileAsset,
  updateMyProfile,
  type MyProfile,
  type OpeningScheduleDay,
  type OpeningScheduleEntry,
} from '@/lib/api';
import { useAddressSuggestions } from '@/hooks/use-address-suggestions';
import { SafeImage } from '@/components/ui/safe-image';
import { ImageCropperDialog } from '@/components/uploads/image-cropper-dialog';
import { IMAGE_CROP_PRESETS, type ImageCropPreset } from '@/lib/image-crop';
import { formatBrazilPhoneInput, normalizeBrazilPhone } from '@/lib/phone';
import { formatCpfInput, normalizeCpfInput, isValidCpf } from '@/lib/cpf';
import { formatCnpjInput, normalizeCnpjInput, isValidCnpj } from '@/lib/cnpj';
import { getOperationalDisplayName } from '@/lib/profile-display';

// ── Constants ─────────────────────────────────────────────────────────────────

type StepKey = 'identity' | 'location' | 'acceptance' | 'review';

const MAX_GALLERY_IMAGES = 6;

const CATEGORY_OPTIONS = [
  { value: 'CLOTHING', label: 'Roupas' },
  { value: 'SHOES', label: 'Calçados' },
  { value: 'ACCESSORIES', label: 'Acessórios' },
  { value: 'BAGS', label: 'Bolsas' },
  { value: 'TOYS', label: 'Brinquedos' },
  { value: 'FOOD', label: 'Alimentos' },
  { value: 'OTHER', label: 'Outros itens' },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  TOYS: 'Brinquedos',
  FOOD: 'Alimentos',
  OTHER: 'Outros itens',
};

const PROFILE_STATE_LABELS = {
  DRAFT: 'Rascunho',
  PENDING: 'Enviado para análise',
  ACTIVE: 'Aprovado',
  VERIFIED: 'Verificado',
} as const;

const WEEKDAY_OPTIONS: Array<{ day: OpeningScheduleDay; label: string }> = [
  { day: 'MONDAY', label: 'Segunda' },
  { day: 'TUESDAY', label: 'Terça' },
  { day: 'WEDNESDAY', label: 'Quarta' },
  { day: 'THURSDAY', label: 'Quinta' },
  { day: 'FRIDAY', label: 'Sexta' },
  { day: 'SATURDAY', label: 'Sábado' },
  { day: 'SUNDAY', label: 'Domingo' },
];

const ACCESSIBILITY_OPTIONS = [
  { value: 'RAMP_ACCESS', label: 'Acesso por rampa' },
  { value: 'ACCESSIBLE_RESTROOM', label: 'Banheiro acessível' },
  { value: 'ACCESSIBLE_PARKING', label: 'Estacionamento acessível' },
  { value: 'PRIORITY_SERVICE', label: 'Atendimento preferencial' },
  { value: 'GROUND_FLOOR', label: 'Acesso térreo' },
  { value: 'SIGN_LANGUAGE_SUPPORT', label: 'Suporte em Libras' },
] as const;

const ACCESSIBILITY_LABELS: Record<string, string> = {
  RAMP_ACCESS: 'Acesso por rampa',
  ACCESSIBLE_RESTROOM: 'Banheiro acessível',
  ACCESSIBLE_PARKING: 'Estacionamento acessível',
  PRIORITY_SERVICE: 'Atendimento preferencial',
  GROUND_FLOOR: 'Acesso térreo',
  SIGN_LANGUAGE_SUPPORT: 'Suporte em Libras',
};

const SCHEDULE_PRESETS = [
  { id: 'WEEKDAYS', label: 'Segunda a sexta' },
  { id: 'WEEKDAYS_SATURDAY', label: 'Segunda a sábado' },
  { id: 'ALL_DAYS', label: 'Todos os dias' },
  { id: 'CLEAR', label: 'Limpar horários' },
] as const;

const SERVICE_REGION_OPTIONS = [
  'Zona Norte',
  'Zona Sul',
  'Zona Leste',
  'Zona Oeste',
  'Centro',
  'Região Metropolitana',
] as const;

type SchedulePresetId = (typeof SCHEDULE_PRESETS)[number]['id'];

// ── Types ─────────────────────────────────────────────────────────────────────

type CropTarget = 'avatar' | 'cover' | 'gallery';

type CropRequest = {
  file: File;
  target: CropTarget;
  preset: ImageCropPreset;
  remainingFiles?: File[];
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cnpj: string;
  avatarUrl: string;
  coverImageUrl: string;
  galleryImageUrls: string[];
  organizationName: string;
  description: string;
  purpose: string;
  publicNotes: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  zipCode: string;
  city: string;
  state: string;
  openingSchedule: OpeningScheduleEntry[];
  openingHoursExceptions: string;
  accessibilityDetails: string;
  accessibilityFeatures: string[];
  estimatedCapacity: string;
  acceptedCategories: string[];
  nonAcceptedItemsText: string;
  rulesText: string;
  serviceRegions: string[];
  termsAccepted: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeCallbackUrl(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/')) return fallback;
  return value;
}

function serializeMultiline(value: string) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeAddressValue(value?: string | null) {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized ? normalized : null;
}

function looksLikeAddressNumber(value?: string | null) {
  const normalized = normalizeAddressValue(value);
  return normalized ? /^\d+[A-Za-z0-9/-]*$/.test(normalized) : false;
}

function looksLikeStreet(value?: string | null) {
  const normalized = normalizeAddressValue(value);
  if (!normalized) return false;
  return /^(rua|r\.|avenida|av\.|av |travessa|tv\.|alameda|rodovia|estrada|praca|praça|largo|via|viela|servid[aã]o|passagem|acesso)/i.test(
    normalized,
  );
}

function extractAddressSegments(value?: string | null) {
  return (value ?? '')
    .split(/[,-]/)
    .map((segment) => normalizeAddressValue(segment))
    .filter((segment): segment is string => Boolean(segment));
}

function resolveSuggestionAddress(
  suggestion: {
    address: string | null;
    addressNumber: string | null;
    label?: string | null;
    displayName?: string | null;
  },
  currentAddress: string,
) {
  const directAddress = normalizeAddressValue(suggestion.address);
  if (directAddress) return directAddress;

  for (const source of [suggestion.label, suggestion.displayName]) {
    const segments = extractAddressSegments(source);
    const streetIndex = segments.findIndex((segment) => looksLikeStreet(segment));
    const baseIndex = streetIndex >= 0 ? streetIndex : 0;
    const candidate = normalizeAddressValue(segments[baseIndex]);
    if (candidate && !looksLikeAddressNumber(candidate)) return candidate;
  }

  const fallbackSegments = extractAddressSegments(suggestion.displayName ?? suggestion.label);
  const fallbackCandidate = normalizeAddressValue(fallbackSegments[0]);
  return fallbackCandidate ?? currentAddress;
}

function normalizeScheduleEntries(value?: OpeningScheduleEntry[] | null) {
  return WEEKDAY_OPTIONS.map(({ day }) => {
    const current = value?.find((entry) => entry.day === day);
    return {
      day,
      isOpen: current?.isOpen === true,
      open: current?.open ?? '',
      close: current?.close ?? '',
    } satisfies OpeningScheduleEntry;
  });
}

function buildInitialState(profile: MyProfile): FormState {
  return {
    name: profile.name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ? formatBrazilPhoneInput(profile.phone) : '',
    cpf: profile.cpf ? formatCpfInput(profile.cpf) : '',
    cnpj: profile.cnpj ? formatCnpjInput(profile.cnpj) : '',
    avatarUrl: profile.avatarUrl ?? '',
    coverImageUrl: profile.coverImageUrl ?? '',
    galleryImageUrls: profile.galleryImageUrls ?? [],
    organizationName: profile.organizationName ?? '',
    description: profile.description ?? '',
    purpose: profile.purpose ?? '',
    publicNotes: profile.publicNotes ?? '',
    address: profile.address ?? '',
    addressNumber: profile.addressNumber ?? '',
    addressComplement: profile.addressComplement ?? '',
    neighborhood: profile.neighborhood ?? '',
    zipCode: profile.zipCode ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    openingSchedule: normalizeScheduleEntries(profile.openingSchedule),
    openingHoursExceptions: profile.openingHoursExceptions ?? '',
    accessibilityDetails: profile.accessibilityDetails ?? '',
    accessibilityFeatures: profile.accessibilityFeatures ?? [],
    estimatedCapacity: profile.estimatedCapacity ?? '',
    acceptedCategories: profile.acceptedCategories ?? [],
    nonAcceptedItemsText: (profile.nonAcceptedItems ?? []).join('\n'),
    rulesText: (profile.rules ?? []).join('\n'),
    serviceRegions: profile.serviceRegions ?? [],
    termsAccepted: false,
  };
}

function buildPayload(role: string, form: FormState) {
  return {
    name: form.name,
    email: form.email,
    phone: form.phone ? normalizeBrazilPhone(form.phone) ?? form.phone : null,
    cpf: form.cpf ? normalizeCpfInput(form.cpf) : null,
    cnpj: form.cnpj ? normalizeCnpjInput(form.cnpj) : null,
    avatarUrl: form.avatarUrl || null,
    coverImageUrl: form.coverImageUrl || null,
    galleryImageUrls: form.galleryImageUrls,
    organizationName: form.organizationName || null,
    description: form.description || null,
    purpose: form.purpose || null,
    publicNotes: form.publicNotes || null,
    address: form.address || null,
    addressNumber: form.addressNumber || null,
    addressComplement: form.addressComplement || null,
    neighborhood: form.neighborhood || null,
    zipCode: form.zipCode || null,
    city: form.city || null,
    state: form.state || null,
    openingSchedule: form.openingSchedule.map((entry) => ({
      day: entry.day,
      isOpen: entry.isOpen,
      ...(entry.open ? { open: entry.open } : {}),
      ...(entry.close ? { close: entry.close } : {}),
    })),
    openingHoursExceptions: form.openingHoursExceptions || null,
    accessibilityDetails: form.accessibilityDetails || null,
    accessibilityFeatures: form.accessibilityFeatures,
    estimatedCapacity: role === 'COLLECTION_POINT' ? form.estimatedCapacity || null : null,
    acceptedCategories: form.acceptedCategories,
    nonAcceptedItems: serializeMultiline(form.nonAcceptedItemsText),
    rules: serializeMultiline(form.rulesText),
    serviceRegions: role === 'NGO' ? form.serviceRegions : [],
  };
}

function getPublishedImages(profile: MyProfile) {
  return (
    profile.publishedPublicProfile ?? {
      avatarUrl: profile.avatarUrl,
      coverImageUrl: profile.coverImageUrl,
      galleryImageUrls: profile.galleryImageUrls ?? [],
    }
  );
}

function getPendingImages(profile: MyProfile) {
  const payload = profile.pendingPublicRevision?.payload;
  if (!payload || profile.pendingPublicRevision?.status !== 'PENDING') return null;

  return {
    avatarUrl:
      typeof payload.avatarUrl === 'string' || payload.avatarUrl === null
        ? payload.avatarUrl
        : undefined,
    coverImageUrl:
      typeof payload.coverImageUrl === 'string' || payload.coverImageUrl === null
        ? payload.coverImageUrl
        : undefined,
    galleryImageUrls: Array.isArray(payload.galleryImageUrls)
      ? payload.galleryImageUrls.filter((item): item is string => typeof item === 'string')
      : undefined,
  };
}

function sameGallery(left: string[], right: string[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasPendingImageChanges(profile: MyProfile) {
  const published = getPublishedImages(profile);
  const pending = getPendingImages(profile);
  if (!pending) return false;

  return (
    (pending.avatarUrl !== undefined && pending.avatarUrl !== published.avatarUrl) ||
    (pending.coverImageUrl !== undefined && pending.coverImageUrl !== published.coverImageUrl) ||
    (pending.galleryImageUrls !== undefined &&
      !sameGallery(pending.galleryImageUrls, published.galleryImageUrls ?? []))
  );
}

function getRoleLabel(role: string) {
  return role === 'NGO' ? 'ONG Parceira' : 'Ponto de Coleta';
}

function getRoleIcon(role: string) {
  return role === 'NGO' ? Users : Store;
}

function getProfileStatusLabel(profile: MyProfile) {
  if (profile.pendingPublicRevision?.status === 'REJECTED') {
    return 'Rejeitado — ajuste e envie novamente';
  }

  if (profile.pendingPublicRevision?.status === 'PENDING') {
    return 'Alterações em revisão';
  }

  if (profile.publicProfileState === 'PENDING') {
    return 'Enviado para análise';
  }

  return PROFILE_STATE_LABELS[profile.publicProfileState];
}

function needsPrivatePreview(profile: MyProfile) {
  return (
    !['ACTIVE', 'VERIFIED'].includes(profile.publicProfileState) ||
    profile.pendingPublicRevision?.status === 'PENDING'
  );
}

function getProfilePreviewHref(profile: MyProfile) {
  return `/mapa/${profile.id}${needsPrivatePreview(profile) ? '?preview=1' : ''}`;
}

function getSubmitLabel(profile: MyProfile, step: StepKey, setupMode: boolean) {
  if (setupMode) return 'Salvar e continuar';

  if (profile.publicProfileState === 'ACTIVE' || profile.publicProfileState === 'VERIFIED') {
    return 'Salvar alterações para revisão';
  }

  if (step === 'review') {
    return 'Enviar para aprovação';
  }

  return 'Salvar rascunho';
}

function formatScheduleSummary(schedule: OpeningScheduleEntry[]) {
  const open = schedule.filter((e) => e.isOpen && e.open && e.close);
  if (open.length === 0) return 'Nenhum horário cadastrado';

  const SHORT_DAYS: Record<string, string> = {
    MONDAY: 'Seg',
    TUESDAY: 'Ter',
    WEDNESDAY: 'Qua',
    THURSDAY: 'Qui',
    FRIDAY: 'Sex',
    SATURDAY: 'Sáb',
    SUNDAY: 'Dom',
  };

  return open.map((e) => `${SHORT_DAYS[e.day]} ${e.open}–${e.close}`).join(' | ');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MediaThumb({
  src,
  alt,
  label,
  className = 'h-24',
}: {
  src?: string | null;
  alt: string;
  label: string;
  className?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <SafeImage src={src} alt={alt} className={className} fallbackLabel="Sem imagem" />
      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>
    </div>
  );
}

function ProfileMediaReview({ profile }: { profile: MyProfile }) {
  const title = getOperationalDisplayName(profile);
  const published = getPublishedImages(profile);
  const pending = getPendingImages(profile);
  const showPending = pending && hasPendingImageChanges(profile);
  const pendingGallery = pending?.galleryImageUrls;

  return (
    <section className="mb-5 rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-card lg:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-deeper">Imagens do perfil</p>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            A coluna publicada é a versão visível no mapa. Imagens pendentes só vão ao ar após
            aprovação administrativa.
          </p>
        </div>
        {showPending && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            mídia em revisão
          </span>
        )}
      </div>

      <div className={`mt-4 grid gap-4 ${showPending ? 'lg:grid-cols-2' : ''}`}>
        <div className="rounded-[1.35rem] bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Publicado
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
            <MediaThumb src={published.avatarUrl} alt={`Avatar publicado de ${title}`} label="Avatar" />
            <MediaThumb src={published.coverImageUrl} alt={`Capa publicada de ${title}`} label="Capa" />
          </div>
          {published.galleryImageUrls.length > 0 ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {published.galleryImageUrls.slice(0, 6).map((imageUrl, index) => (
                <MediaThumb
                  key={imageUrl}
                  src={imageUrl}
                  alt={`Foto publicada ${index + 1} de ${title}`}
                  label={`Foto ${index + 1}`}
                  className="h-16"
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-500">
              Galeria publicada vazia.
            </p>
          )}
        </div>

        {showPending && (
          <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Pendente
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
              <MediaThumb
                src={pending.avatarUrl ?? null}
                alt={`Avatar pendente de ${title}`}
                label={pending.avatarUrl === null ? 'Avatar removido' : 'Avatar'}
              />
              <MediaThumb
                src={pending.coverImageUrl ?? null}
                alt={`Capa pendente de ${title}`}
                label={pending.coverImageUrl === null ? 'Capa removida' : 'Capa'}
              />
            </div>
            {pendingGallery && pendingGallery.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {pendingGallery.slice(0, 6).map((imageUrl, index) => (
                  <MediaThumb
                    key={imageUrl}
                    src={imageUrl}
                    alt={`Foto pendente ${index + 1} de ${title}`}
                    label={`Foto ${index + 1}`}
                    className="h-16"
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-dashed border-amber-200 bg-white/70 px-4 py-5 text-sm text-amber-800">
                Galeria pendente vazia ou removida.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OperationalProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [step, setStep] = useState<StepKey>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addressFocused, setAddressFocused] = useState(false);
  const [addressAssistMessage, setAddressAssistMessage] = useState<string | null>(null);
  const [addressPreview, setAddressPreview] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [presetOpenTime, setPresetOpenTime] = useState('09:00');
  const [presetCloseTime, setPresetCloseTime] = useState('18:00');
  const [uploadingTarget, setUploadingTarget] = useState<CropTarget | null>(null);
  const [cropRequest, setCropRequest] = useState<CropRequest | null>(null);

  const addressBlurTimeoutRef = useRef<number | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const setupMode = searchParams.get('setup') === '1';
  const role = session?.user?.role ?? '';
  const defaultCallback = role === 'DONOR' ? '/inicio' : '/operacoes';
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'), defaultCallback);
  const steps: StepKey[] = ['identity', 'location', 'acceptance', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const addressBias = useMemo(
    () =>
      addressPreview ??
      (profile?.latitude != null && profile.longitude != null
        ? { latitude: profile.latitude, longitude: profile.longitude }
        : null),
    [addressPreview, profile?.latitude, profile?.longitude],
  );

  const {
    suggestions: addressSuggestions,
    loading: addressSuggestionsLoading,
    error: addressSuggestionsError,
    hasQuery: hasAddressSuggestionQuery,
    clearSuggestions,
  } = useAddressSuggestions({
    query: form?.address ?? '',
    lat: addressBias?.latitude,
    lng: addressBias?.longitude,
    scope: 'profile',
    enabled: Boolean(form) && addressFocused,
  });

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user?.accessToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextProfile = await getMyProfile(session.user.accessToken);
        setProfile(nextProfile);
        setForm(buildInitialState(nextProfile));
        setAddressPreview(
          nextProfile.latitude != null && nextProfile.longitude != null
            ? { latitude: nextProfile.latitude, longitude: nextProfile.longitude }
            : null,
        );
        setAddressAssistMessage(null);
        setStep('identity');
      } catch {
        setError('Não foi possível carregar seu perfil operacional agora.');
      } finally {
        setLoading(false);
      }
    }

    if (status !== 'loading') {
      loadProfile();
    }
  }, [session?.user?.accessToken, status]);

  useEffect(() => {
    if (status === 'authenticated' && role && !['COLLECTION_POINT', 'NGO'].includes(role)) {
      router.replace('/perfil');
    }
  }, [role, router, status]);

  useEffect(
    () => () => {
      if (addressBlurTimeoutRef.current) {
        window.clearTimeout(addressBlurTimeoutRef.current);
      }
    },
    [],
  );

  // ── Field updaters ──────────────────────────────────────────────────────────

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => {
      if (!current) return current;
      return { ...current, [field]: value };
    });
  }

  function updateAddressField(field: keyof FormState, value: string) {
    updateField(field as keyof FormState, value as FormState[typeof field]);
    setAddressAssistMessage(null);

    if (['address', 'addressNumber', 'addressComplement', 'neighborhood', 'zipCode', 'city', 'state'].includes(field)) {
      setAddressPreview(null);
    }
  }

  function updateScheduleEntry(day: OpeningScheduleDay, patch: Partial<OpeningScheduleEntry>) {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        openingSchedule: current.openingSchedule.map((entry) =>
          entry.day === day
            ? { ...entry, ...patch, ...(patch.isOpen === false ? { open: '', close: '' } : {}) }
            : entry,
        ),
      };
    });
  }

  function applySchedulePreset(presetId: SchedulePresetId) {
    setForm((current) => {
      if (!current) return current;

      const activeDays =
        presetId === 'WEEKDAYS'
          ? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
          : presetId === 'WEEKDAYS_SATURDAY'
            ? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
            : presetId === 'ALL_DAYS'
              ? WEEKDAY_OPTIONS.map((item) => item.day)
              : [];

      return {
        ...current,
        openingSchedule: current.openingSchedule.map((entry) => {
          if (presetId === 'CLEAR') {
            return { ...entry, isOpen: false, open: '', close: '' };
          }

          if (activeDays.includes(entry.day)) {
            return { ...entry, isOpen: true, open: presetOpenTime, close: presetCloseTime };
          }

          return { ...entry, isOpen: false, open: '', close: '' };
        }),
      };
    });
  }

  function toggleAccessibilityFeature(value: string) {
    setForm((current) => {
      if (!current) return current;
      const exists = current.accessibilityFeatures.includes(value);
      return {
        ...current,
        accessibilityFeatures: exists
          ? current.accessibilityFeatures.filter((item) => item !== value)
          : [...current.accessibilityFeatures, value],
      };
    });
  }

  function toggleCategory(category: string) {
    setForm((current) => {
      if (!current) return current;
      const exists = current.acceptedCategories.includes(category);
      return {
        ...current,
        acceptedCategories: exists
          ? current.acceptedCategories.filter((item) => item !== category)
          : [...current.acceptedCategories, category],
      };
    });
  }

  function toggleServiceRegion(region: string) {
    setForm((current) => {
      if (!current) return current;
      const exists = current.serviceRegions.includes(region);
      return {
        ...current,
        serviceRegions: exists
          ? current.serviceRegions.filter((r) => r !== region)
          : [...current.serviceRegions, region],
      };
    });
  }

  // ── Image upload with crop ──────────────────────────────────────────────────

  function requestCrop(target: CropTarget, file: File, remainingFiles: File[] = []) {
    const configs: Record<CropTarget, ImageCropPreset> = {
      avatar: IMAGE_CROP_PRESETS.avatar,
      cover: IMAGE_CROP_PRESETS.cover,
      gallery: IMAGE_CROP_PRESETS.gallery,
    };
    setCropRequest({ file, target, preset: configs[target], remainingFiles });
  }

  async function handleCropConfirm(croppedFile: File) {
    const request = cropRequest;
    const target = request?.target;
    setCropRequest(null);
    if (!target) return;
    await handleUploadAsset(target, croppedFile);

    const [nextFile, ...remainingFiles] = request?.remainingFiles ?? [];
    if (target === 'gallery' && nextFile) {
      requestCrop('gallery', nextFile, remainingFiles);
    }
  }

  async function handleUploadAsset(target: CropTarget, file: File | null | undefined) {
    if (!file || !session?.user?.accessToken) return false;

    setUploadingTarget(target);
    setError(null);
    setSuccess(null);

    try {
      const uploaded = await uploadProfileAsset({ file, target }, session.user.accessToken);

      if (target === 'avatar') {
        updateField('avatarUrl', uploaded.url);
      } else if (target === 'cover') {
        updateField('coverImageUrl', uploaded.url);
      } else {
        setForm((current) => {
          if (!current) return current;
          if (current.galleryImageUrls.includes(uploaded.url)) return current;
          return {
            ...current,
            galleryImageUrls: [...current.galleryImageUrls, uploaded.url].slice(0, MAX_GALLERY_IMAGES),
          };
        });
      }

      setSuccess(
        target === 'avatar'
          ? 'Avatar enviado com sucesso.'
          : target === 'cover'
            ? 'Capa enviada com sucesso.'
            : 'Foto adicionada com sucesso.',
      );
      return true;
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar a imagem agora.',
      );
      return false;
    } finally {
      setUploadingTarget(null);
    }
  }

  async function handleUploadGallery(files: FileList | null) {
    if (!files || files.length === 0 || !form) return;

    const remainingSlots = MAX_GALLERY_IMAGES - form.galleryImageUrls.length;
    if (remainingSlots <= 0) {
      setError(`A galeria aceita no máximo ${MAX_GALLERY_IMAGES} fotos.`);
      return;
    }

    // For gallery, crop the first file then queue the rest
    const uploadQueue = Array.from(files).slice(0, remainingSlots);
    if (uploadQueue[0]) {
      requestCrop('gallery', uploadQueue[0], uploadQueue.slice(1));
    }

    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  }

  function removeGalleryImage(imageUrl: string) {
    setForm((current) => {
      if (!current) return current;
      return { ...current, galleryImageUrls: current.galleryImageUrls.filter((item) => item !== imageUrl) };
    });
  }

  function moveGalleryImage(index: number, direction: -1 | 1) {
    setForm((current) => {
      if (!current) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.galleryImageUrls.length) return current;

      const nextGallery = [...current.galleryImageUrls];
      const [item] = nextGallery.splice(index, 1);
      nextGallery.splice(nextIndex, 0, item);

      return { ...current, galleryImageUrls: nextGallery };
    });
  }

  // ── Address ─────────────────────────────────────────────────────────────────

  function handleAddressFocus() {
    if (addressBlurTimeoutRef.current) {
      window.clearTimeout(addressBlurTimeoutRef.current);
      addressBlurTimeoutRef.current = null;
    }
    setAddressFocused(true);
  }

  function handleAddressBlur() {
    addressBlurTimeoutRef.current = window.setTimeout(() => {
      setAddressFocused(false);
    }, 160);
  }

  function applyAddressSuggestion(suggestion: {
    address: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    latitude: number;
    longitude: number;
    label?: string | null;
    displayName?: string | null;
  }) {
    setForm((current) => {
      if (!current) return current;
      const resolvedAddress = resolveSuggestionAddress(suggestion, current.address);
      return {
        ...current,
        address: resolvedAddress,
        addressNumber: suggestion.addressNumber ?? current.addressNumber,
        addressComplement: suggestion.addressComplement ?? current.addressComplement,
        neighborhood: suggestion.neighborhood ?? current.neighborhood,
        city: suggestion.city ?? current.city,
        state: suggestion.state ?? current.state,
        zipCode: suggestion.zipCode ?? current.zipCode,
      };
    });
    setAddressPreview({ latitude: suggestion.latitude, longitude: suggestion.longitude });
    setAddressAssistMessage('Sugestão aplicada. Revise número e complemento antes de salvar.');
    setAddressFocused(false);
    clearSuggestions();
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session?.user?.accessToken || !form || !profile) return;

    // Validate CPF if filled
    if (form.cpf && !isValidCpf(form.cpf)) {
      setError('O CPF informado não é válido. Verifique e tente novamente.');
      return;
    }

    // Validate CNPJ if filled
    if (form.cnpj && !isValidCnpj(form.cnpj)) {
      setError('O CNPJ informado não é válido. Verifique e tente novamente.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateMyProfile(buildPayload(profile.role, form), session.user.accessToken);

      await updateSession({
        user: {
          name: updated.name,
          email: updated.email,
          image: updated.avatarUrl ?? null,
          organizationName: updated.organizationName,
        },
      });

      setProfile(updated);
      setForm(buildInitialState(updated));
      setAddressPreview(
        updated.latitude != null && updated.longitude != null
          ? { latitude: updated.latitude, longitude: updated.longitude }
          : null,
      );
      setAddressAssistMessage('Endereço salvo e coordenadas atualizadas automaticamente.');
      setSuccess(
        updated.pendingPublicRevision?.status === 'PENDING'
          ? 'Alterações públicas enviadas para revisão administrativa. O perfil publicado segue estável até a aprovação.'
          : setupMode
            ? 'Perfil salvo. Redirecionando...'
            : 'Perfil operacional atualizado com sucesso.',
      );

      if (setupMode) {
        router.push(callbackUrl);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Não foi possível salvar o perfil agora.',
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Step labels ─────────────────────────────────────────────────────────────

  function getStepLabel(s: StepKey) {
    if (s === 'identity') return role === 'NGO' ? 'Institucional' : 'Identidade';
    if (s === 'location') return role === 'NGO' ? 'Base e cobertura' : 'Local e horário';
    if (s === 'acceptance') return 'Itens e regras';
    return 'Revisão';
  }

  // ── Loading / guard ─────────────────────────────────────────────────────────

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-card">
          <Loader2 className="animate-spin text-primary" size={18} />
          <span className="text-sm text-gray-500">Carregando perfil operacional...</span>
        </div>
      </div>
    );
  }

  if (!profile || !form || !['COLLECTION_POINT', 'NGO'].includes(profile.role)) {
    return null;
  }

  const RoleIcon = getRoleIcon(profile.role);
  const orgTitle = getOperationalDisplayName(profile);

  return (
    <>
      {cropRequest && (
        <ImageCropperDialog
          file={cropRequest.file}
          preset={cropRequest.preset}
          onApply={handleCropConfirm}
          onCancel={() => setCropRequest(null)}
        />
      )}

      <div className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Link
                href="/perfil"
                className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-card transition-colors hover:text-primary"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  {setupMode ? 'Configuração inicial' : 'Perfil operacional'}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-primary-deeper">
                  {profile.role === 'NGO' ? 'Perfil público da ONG' : 'Perfil público do ponto'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">
                  {setupMode
                    ? 'Preencha as informações que doadores precisam ver para confiar no local, encontrar você no mapa e entender como doar.'
                    : 'Edite as informações públicas e operacionais que aparecem para doadores e ajudam a equipe a operar melhor.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {profile.id && (
                <Link
                  href={getProfilePreviewHref(profile)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary shadow-card transition-colors hover:bg-primary-light"
                >
                  <Sparkles size={13} />
                  {needsPrivatePreview(profile) ? 'Visualizar preview' : 'Ver perfil público'}
                </Link>
              )}
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary shadow-card">
                <ShieldCheck size={15} />
                {getProfileStatusLabel(profile)}
              </div>
            </div>
          </div>

          {/* ── Media review ───────────────────────────────────────────────── */}
          <ProfileMediaReview profile={profile} />

          {/* ── Governance notice ──────────────────────────────────────────── */}
          {profile.pendingPublicRevision && (
            <div
              className={`mb-5 rounded-[1.75rem] border px-5 py-4 text-sm ${
                profile.pendingPublicRevision.status === 'PENDING'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              <p className="font-semibold">
                {profile.pendingPublicRevision.status === 'PENDING'
                  ? 'Alterações públicas em revisão'
                  : 'Última revisão de alterações foi rejeitada'}
              </p>
              <p className="mt-2 leading-7">
                {profile.pendingPublicRevision.status === 'PENDING'
                  ? 'Endereço, telefone, imagens, horário e acessibilidade passam por revisão administrativa antes de atualizar o perfil publicado.'
                  : 'Você pode ajustar os dados abaixo e reenviar para nova revisão quando estiver pronto.'}
              </p>
              {profile.pendingPublicRevision.reviewNotes && (
                <p className="mt-2 text-xs font-medium">
                  Revisão admin: {profile.pendingPublicRevision.reviewNotes}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_430px]">
            {/* ── Form ───────────────────────────────────────────────────── */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-[2rem] bg-white p-5 shadow-card lg:p-6"
            >
              {/* Stepper */}
              <div className="flex flex-wrap gap-2">
                {steps.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStep(item)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      step === item
                        ? 'bg-primary-deeper text-white'
                        : 'bg-surface text-gray-500 hover:text-primary'
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs">
                      {index + 1}
                    </span>
                    {getStepLabel(item)}
                  </button>
                ))}
              </div>

              {/* ── Step: Identity ──────────────────────────────────────── */}
              {step === 'identity' && (
                <section className="space-y-4">
                  <div className="rounded-[1.75rem] bg-surface p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                        <RoleIcon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary-deeper">
                          {getRoleLabel(profile.role)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Identidade pública e pessoa responsável pelo atendimento.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Responsible info */}
                  <div className="rounded-[1.5rem] border border-gray-100 bg-surface p-4">
                    <p className="mb-3 text-sm font-semibold text-on-surface">Responsável</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-gray-500">
                        <span className="font-semibold text-on-surface">Nome completo</span>
                        <input
                          value={form.name}
                          onChange={(event) => updateField('name', event.target.value)}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-gray-500">
                        <span className="font-semibold text-on-surface">E-mail</span>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(event) => updateField('email', event.target.value)}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-gray-500">
                        <span className="font-semibold text-on-surface">Telefone público</span>
                        <input
                          value={form.phone}
                          onChange={(event) =>
                            updateField('phone', formatBrazilPhoneInput(event.target.value))
                          }
                          placeholder="(11) 99999-9999"
                          inputMode="tel"
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                        />
                      </label>

                      <label className="space-y-2 text-sm text-gray-500">
                        <span className="font-semibold text-on-surface">CPF do responsável</span>
                        <input
                          value={form.cpf}
                          onChange={(event) =>
                            updateField('cpf', formatCpfInput(normalizeCpfInput(event.target.value)))
                          }
                          placeholder="000.000.000-00"
                          maxLength={14}
                          inputMode="numeric"
                          className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary ${
                            form.cpf && !isValidCpf(form.cpf)
                              ? 'border-rose-300'
                              : 'border-gray-200'
                          }`}
                        />
                        <p className="text-[11px] text-gray-400">
                          Apenas para verificação interna. Não aparece no perfil público.
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Organization info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-gray-500">
                      <span className="font-semibold text-on-surface">
                        {profile.role === 'NGO' ? 'Nome da ONG' : 'Nome do ponto'}
                      </span>
                      <input
                        value={form.organizationName}
                        onChange={(event) => updateField('organizationName', event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                      />
                    </label>

                    <label className="space-y-2 text-sm text-gray-500">
                      <span className="font-semibold text-on-surface">
                        CNPJ
                        <span className="ml-1 font-normal text-gray-400">(opcional)</span>
                      </span>
                      <input
                        value={form.cnpj}
                        onChange={(event) =>
                          updateField('cnpj', formatCnpjInput(normalizeCnpjInput(event.target.value)))
                        }
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        inputMode="numeric"
                        className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary ${
                          form.cnpj && !isValidCnpj(form.cnpj) ? 'border-rose-300' : 'border-gray-200'
                        }`}
                      />
                    </label>
                  </div>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Descrição pública</span>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(event) => updateField('description', event.target.value)}
                      placeholder="Explique rapidamente o que este parceiro faz, como recebe doações e qual contexto atende."
                      className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Propósito</span>
                    <textarea
                      rows={4}
                      value={form.purpose}
                      onChange={(event) => updateField('purpose', event.target.value)}
                      placeholder={
                        profile.role === 'NGO'
                          ? 'Como a ONG transforma as doações em impacto real.'
                          : 'Explique por que este ponto fortalece as doações na região.'
                      }
                      className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Observações públicas</span>
                    <textarea
                      rows={3}
                      value={form.publicNotes}
                      onChange={(event) => updateField('publicNotes', event.target.value)}
                      placeholder="Inclua orientações úteis para quem vai doar ou conhecer este perfil."
                      className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  {/* Images */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Avatar */}
                    <div className="space-y-3 rounded-[1.5rem] border border-gray-200 bg-surface p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">Foto / avatar</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Upload principal do perfil. JPG, PNG ou WEBP até 5MB.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={uploadingTarget === 'avatar'}
                          aria-label="Alterar logo do perfil"
                          className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.25rem] bg-white text-sm font-bold text-primary shadow-sm ring-1 ring-gray-100 transition focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {form.avatarUrl ? (
                            <SafeImage
                              src={form.avatarUrl}
                              alt={orgTitle}
                              className="h-full w-full"
                              fallbackLabel="Avatar indisponível"
                            />
                          ) : (
                            orgTitle
                              .split(' ')
                              .map((segment) => segment[0])
                              .slice(0, 2)
                              .join('')
                          )}
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-primary-deeper/72 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                            <Camera size={15} />
                            Alterar logo
                          </span>
                        </button>
                      </div>

                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        aria-label="Selecionar avatar"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) requestCrop('avatar', file);
                          event.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingTarget === 'avatar'}
                        className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingTarget === 'avatar' ? 'Enviando...' : 'Alterar logo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('avatarUrl', '')}
                        disabled={!form.avatarUrl}
                        className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                      >
                        Remover avatar
                      </button>
                    </div>

                    {/* Cover */}
                    <div className="space-y-3 rounded-[1.5rem] border border-gray-200 bg-surface p-4">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Capa pública</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Usada no detalhe público do parceiro. Proporção 16:9.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingTarget === 'cover'}
                        aria-label="Alterar capa do perfil"
                        className="group relative w-full overflow-hidden rounded-[1.25rem] border border-gray-200 bg-white text-left transition focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {form.coverImageUrl ? (
                          <SafeImage
                            src={form.coverImageUrl}
                            alt={`Capa de ${orgTitle}`}
                            className="h-32 w-full"
                            fallbackLabel="Capa indisponível"
                          />
                        ) : (
                          <div className="flex h-32 w-full items-center justify-center bg-primary-light text-sm font-semibold text-primary">
                            Nenhuma capa enviada
                          </div>
                        )}
                        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-primary-deeper/64 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                          <Pencil size={16} />
                          Alterar capa
                        </span>
                      </button>

                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        aria-label="Selecionar capa"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) requestCrop('cover', file);
                          event.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingTarget === 'cover'}
                        className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingTarget === 'cover' ? 'Enviando...' : 'Alterar capa'}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('coverImageUrl', '')}
                        disabled={!form.coverImageUrl}
                        className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                      >
                        Remover capa
                      </button>
                    </div>
                  </div>

                  {/* Gallery */}
                  <div className="space-y-4 rounded-[1.5rem] border border-gray-200 bg-surface p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Galeria pública</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Fotos adicionais do espaço. Até {MAX_GALLERY_IMAGES} imagens, proporção 4:3.
                        </p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-deeper shadow-sm">
                        {form.galleryImageUrls.length}/{MAX_GALLERY_IMAGES}
                      </div>
                    </div>

                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="hidden"
                      aria-label="Adicionar fotos à galeria"
                      onChange={(event) => void handleUploadGallery(event.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={uploadingTarget === 'gallery' || form.galleryImageUrls.length >= MAX_GALLERY_IMAGES}
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ImagePlus size={16} />
                      {uploadingTarget === 'gallery' ? 'Enviando fotos...' : 'Adicionar fotos'}
                    </button>

                    {form.galleryImageUrls.length === 0 ? (
                      <div className="rounded-[1.25rem] border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                        Nenhuma foto adicional enviada ainda.
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {form.galleryImageUrls.map((imageUrl, index) => (
                          <div
                            key={imageUrl}
                            className="overflow-hidden rounded-[1.25rem] border border-gray-200 bg-white"
                          >
                            <SafeImage
                              src={imageUrl}
                              alt={`Foto adicional ${index + 1} de ${orgTitle}`}
                              className="h-40 w-full"
                              fallbackLabel="Foto indisponível"
                            />
                            <div className="flex items-center justify-between gap-3 px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                                Foto {index + 1}
                              </p>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveGalleryImage(index, -1)}
                                  disabled={index === 0}
                                  aria-label={`Mover foto ${index + 1} para a esquerda`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveGalleryImage(index, 1)}
                                  disabled={index === form.galleryImageUrls.length - 1}
                                  aria-label={`Mover foto ${index + 1} para a direita`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(imageUrl)}
                                  aria-label={`Remover foto ${index + 1}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-primary hover:text-primary"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ── Step: Location ──────────────────────────────────────── */}
              {step === 'location' && (
                <section className="space-y-4">
                  <div className="rounded-[1.75rem] bg-surface p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary-deeper">
                          {profile.role === 'NGO' ? 'Base e área de atendimento' : 'Endereço e horário'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Estes dados alimentam o mapa, o detalhe público e a confiança do doador.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">
                      {profile.role === 'NGO' ? 'Logradouro ou base operacional' : 'Logradouro'}
                    </span>
                    <div className="relative">
                      <input
                        value={form.address}
                        onChange={(event) => updateAddressField('address', event.target.value)}
                        onFocus={handleAddressFocus}
                        onBlur={handleAddressBlur}
                        placeholder="Ex.: Rua Augusta"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                      />

                      {addressFocused && (hasAddressSuggestionQuery || addressSuggestionsLoading) && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white shadow-card-lg">
                          {addressSuggestionsLoading && (
                            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                              <Loader2 size={15} className="animate-spin text-primary" />
                              Buscando sugestões...
                            </div>
                          )}
                          {!addressSuggestionsLoading && addressSuggestionsError && (
                            <div className="px-4 py-3 text-sm text-amber-700">{addressSuggestionsError}</div>
                          )}
                          {!addressSuggestionsLoading && !addressSuggestionsError && addressSuggestions.length > 0 && (
                            <div className="max-h-72 overflow-y-auto py-2">
                              {addressSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion.id}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => applyAddressSuggestion(suggestion)}
                                  className="w-full px-4 py-3 text-left transition-colors hover:bg-surface"
                                >
                                  <p className="text-sm font-semibold text-on-surface">{suggestion.label}</p>
                                  <p className="mt-1 text-xs leading-6 text-gray-400">{suggestion.displayName}</p>
                                </button>
                              ))}
                            </div>
                          )}
                          {!addressSuggestionsLoading && !addressSuggestionsError && hasAddressSuggestionQuery && addressSuggestions.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              Nenhuma sugestão. Continue digitando ou refine cidade/estado.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Digite parte do endereço e escolha uma sugestão para preencher bairro, cidade, CEP e coordenadas automaticamente.
                    </p>
                    {addressAssistMessage && (
                      <p className="rounded-2xl bg-primary-light px-3 py-2 text-xs font-medium text-primary-deeper">
                        {addressAssistMessage}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      { field: 'addressNumber' as const, label: 'Número', placeholder: 'Ex.: 1200' },
                      { field: 'addressComplement' as const, label: 'Complemento', placeholder: 'Ex.: Sala 2' },
                      { field: 'neighborhood' as const, label: 'Bairro', placeholder: '' },
                      { field: 'zipCode' as const, label: 'CEP', placeholder: '' },
                      { field: 'city' as const, label: 'Cidade', placeholder: '' },
                      { field: 'state' as const, label: 'Estado', placeholder: '' },
                    ].map(({ field, label, placeholder }) => (
                      <label key={field} className="space-y-2 text-sm text-gray-500">
                        <span className="font-semibold text-on-surface">{label}</span>
                        <input
                          value={form[field]}
                          onChange={(event) => updateAddressField(field, event.target.value)}
                          placeholder={placeholder}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                        />
                      </label>
                    ))}
                  </div>

                  {/* Coordinates info */}
                  <div className="rounded-[1.5rem] border border-dashed border-primary/25 bg-primary-light/30 p-4 text-sm text-gray-500">
                    <p className="font-semibold text-primary-deeper">Localização gerada automaticamente</p>
                    <p className="mt-2 text-xs text-gray-400">
                      {addressPreview != null
                        ? `Coordenadas sugeridas: ${addressPreview.latitude.toFixed(5)}, ${addressPreview.longitude.toFixed(5)}`
                        : profile.latitude != null && profile.longitude != null
                          ? `Coordenadas atuais: ${profile.latitude.toFixed(5)}, ${profile.longitude.toFixed(5)}`
                          : 'Use rua com número, cidade e CEP para melhorar a precisão.'}
                    </p>
                  </div>

                  {/* Opening hours */}
                  <div className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-surface p-5">
                    <div>
                      <p className="text-sm font-semibold text-primary-deeper">Horário de funcionamento</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Estruture dias e faixas de horário para publicar o local com mais clareza.
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] bg-white px-4 py-4">
                      <p className="text-sm font-semibold text-primary-deeper">Aplicação rápida</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="space-y-2 text-sm text-gray-500">
                          <span className="font-semibold text-on-surface">Horário base de abertura</span>
                          <input
                            type="time"
                            value={presetOpenTime}
                            onChange={(event) => setPresetOpenTime(event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                          />
                        </label>
                        <label className="space-y-2 text-sm text-gray-500">
                          <span className="font-semibold text-on-surface">Horário base de fechamento</span>
                          <input
                            type="time"
                            value={presetCloseTime}
                            onChange={(event) => setPresetCloseTime(event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                          />
                        </label>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {SCHEDULE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applySchedulePreset(preset.id)}
                            className="rounded-full border border-gray-200 bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-deeper transition-colors hover:border-primary hover:bg-primary-light"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {WEEKDAY_OPTIONS.map(({ day, label }) => {
                        const entry = form.openingSchedule.find((item) => item.day === day);
                        return (
                          <div
                            key={day}
                            className="grid gap-3 rounded-[1.25rem] bg-white px-4 py-4 md:grid-cols-[11rem_minmax(0,1fr)] md:items-center"
                          >
                            <label className="inline-flex items-center gap-3 text-sm font-semibold text-on-surface">
                              <input
                                type="checkbox"
                                checked={entry?.isOpen === true}
                                onChange={(event) => updateScheduleEntry(day, { isOpen: event.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              {label}
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                              <input
                                type="time"
                                value={entry?.open ?? ''}
                                disabled={!entry?.isOpen}
                                onChange={(event) => updateScheduleEntry(day, { open: event.target.value })}
                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:bg-surface disabled:text-gray-300"
                              />
                              <input
                                type="time"
                                value={entry?.close ?? ''}
                                disabled={!entry?.isOpen}
                                onChange={(event) => updateScheduleEntry(day, { close: event.target.value })}
                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:bg-surface disabled:text-gray-300"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <label className="space-y-2 text-sm text-gray-500">
                      <span className="font-semibold text-on-surface">Exceções simples</span>
                      <textarea
                        rows={2}
                        value={form.openingHoursExceptions}
                        onChange={(event) => updateField('openingHoursExceptions', event.target.value)}
                        placeholder="Ex.: Fecha em feriados municipais."
                        className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                      />
                    </label>
                  </div>

                  {/* Regions (NGO) */}
                  {profile.role === 'NGO' && (
                    <div className="space-y-3 rounded-[1.5rem] border border-gray-100 bg-surface p-4">
                      <p className="text-sm font-semibold text-on-surface">Regiões atendidas</p>
                      <div className="flex flex-wrap gap-2">
                        {SERVICE_REGION_OPTIONS.map((region) => (
                          <button
                            key={region}
                            type="button"
                            onClick={() => toggleServiceRegion(region)}
                            aria-pressed={form.serviceRegions.includes(region)}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                              form.serviceRegions.includes(region)
                                ? 'border-primary bg-primary-light text-primary-deeper'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-primary hover:text-primary'
                            }`}
                          >
                            {region}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Capacity (Collection Point) */}
                  {profile.role === 'COLLECTION_POINT' && (
                    <label className="space-y-2 text-sm text-gray-500">
                      <span className="font-semibold text-on-surface">Capacidade estimada</span>
                      <input
                        value={form.estimatedCapacity}
                        onChange={(event) => updateField('estimatedCapacity', event.target.value)}
                        placeholder="Ex.: Até 100 sacolas por semana"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                      />
                    </label>
                  )}

                  {/* Accessibility */}
                  <div className="space-y-4 rounded-[1.75rem] border border-gray-100 bg-surface p-5">
                    <div>
                      <p className="text-sm font-semibold text-primary-deeper">Acessibilidade</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Marque os recursos disponíveis.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {ACCESSIBILITY_OPTIONS.map((option) => {
                        const checked = form.accessibilityFeatures.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleAccessibilityFeature(option.value)}
                            aria-pressed={checked}
                            className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                              checked
                                ? 'border-primary bg-primary-light text-primary-deeper'
                                : 'border-gray-200 bg-white text-gray-500'
                            }`}
                          >
                            <p className="text-sm font-semibold">{option.label}</p>
                          </button>
                        );
                      })}
                    </div>
                    <label className="space-y-2 text-sm text-gray-500">
                      <span className="font-semibold text-on-surface">Detalhes de acessibilidade</span>
                      <textarea
                        rows={3}
                        value={form.accessibilityDetails}
                        onChange={(event) => updateField('accessibilityDetails', event.target.value)}
                        placeholder="Ex.: entrada sem degrau pela lateral, equipe treinada para atendimento prioritário."
                        className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                      />
                    </label>
                  </div>
                </section>
              )}

              {/* ── Step: Acceptance ────────────────────────────────────── */}
              {step === 'acceptance' && (
                <section className="space-y-4">
                  <div className="rounded-[1.75rem] bg-surface p-5">
                    <p className="text-sm font-semibold text-primary-deeper">Itens aceitos e regras</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Esta parte reduz atrito para o doador e deixa claro o que pode ou não ser entregue.
                    </p>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-on-surface">Categorias aceitas</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CATEGORY_OPTIONS.map((category) => {
                        const checked = form.acceptedCategories.includes(category.value);
                        return (
                          <button
                            key={category.value}
                            type="button"
                            onClick={() => toggleCategory(category.value)}
                            aria-pressed={checked}
                            className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                              checked
                                ? 'border-primary bg-primary-light text-primary-deeper'
                                : 'border-gray-200 bg-white text-gray-500'
                            }`}
                          >
                            <p className="text-sm font-semibold">{category.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Itens não aceitos</span>
                    <textarea
                      rows={4}
                      value={form.nonAcceptedItemsText}
                      onChange={(event) => updateField('nonAcceptedItemsText', event.target.value)}
                      placeholder={'Um item por linha\nEx.: Peças com mofo'}
                      className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Regras para entrega</span>
                    <textarea
                      rows={4}
                      value={form.rulesText}
                      onChange={(event) => updateField('rulesText', event.target.value)}
                      placeholder={'Uma regra por linha\nEx.: Entregar roupas limpas e separadas por tipo'}
                      className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                </section>
              )}

              {/* ── Step: Review ────────────────────────────────────────── */}
              {step === 'review' && (
                <section className="space-y-4">
                  <div className="rounded-[1.75rem] bg-surface p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary-deeper">Revisão e confirmação</p>
                        <p className="text-sm text-gray-500">
                          Confira o resumo antes de salvar. Após confirmar, alterações públicas aguardam aprovação se o perfil já estiver ativo.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preview card */}
                  <div className="overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm">
                    {/* Cover preview */}
                    <div className="relative h-40 bg-primary-deeper">
                      {form.coverImageUrl ? (
                        <SafeImage
                          src={form.coverImageUrl}
                          alt="Capa"
                          className="absolute inset-0 h-full w-full"
                          imageClassName="h-full w-full object-cover"
                          fallbackLabel="Capa"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-primary-muted/50 text-sm font-semibold">
                          Sem capa
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#00272e]/60 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 flex items-end gap-3">
                        <div className="h-14 w-14 overflow-hidden rounded-2xl border-2 border-white/30 bg-white/10 shadow-lg">
                          {form.avatarUrl ? (
                            <SafeImage
                              src={form.avatarUrl}
                              alt="Avatar"
                              className="h-full w-full"
                              fallbackLabel=""
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary text-white font-bold">
                              {orgTitle.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-base font-bold text-white">
                            {form.organizationName || orgTitle}
                          </p>
                          <p className="text-xs text-white/70">{getRoleLabel(profile.role)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Summary rows */}
                    <div className="divide-y divide-gray-100 px-5 py-2">
                      <ReviewRow label="Responsável" value={form.name || '—'} />
                      <ReviewRow label="Telefone" value={form.phone || '—'} />
                      {form.cnpj && <ReviewRow label="CNPJ" value={form.cnpj} />}
                      <ReviewRow
                        label="Endereço"
                        value={
                          [form.address, form.addressNumber, form.neighborhood, form.city, form.state]
                            .filter(Boolean)
                            .join(', ') || '—'
                        }
                      />
                      <ReviewRow
                        label="Horário"
                        value={formatScheduleSummary(form.openingSchedule)}
                      />
                      <ReviewRow
                        label="Categorias aceitas"
                        value={
                          form.acceptedCategories.length > 0
                            ? form.acceptedCategories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')
                            : '—'
                        }
                      />
                      {form.rulesText.trim() && (
                        <ReviewRow label="Regras" value={serializeMultiline(form.rulesText).join(' | ')} />
                      )}
                      {form.accessibilityFeatures.length > 0 && (
                        <ReviewRow
                          label="Acessibilidade"
                          value={form.accessibilityFeatures
                            .map((f) => ACCESSIBILITY_LABELS[f] ?? f)
                            .join(', ')}
                        />
                      )}
                      {profile.role === 'NGO' && form.serviceRegions.length > 0 && (
                        <ReviewRow
                          label="Regiões atendidas"
                          value={form.serviceRegions.join(', ')}
                        />
                      )}
                    </div>
                  </div>

                  {/* Gallery preview */}
                  {form.galleryImageUrls.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-on-surface">Galeria</p>
                      <div className="grid grid-cols-3 gap-2">
                        {form.galleryImageUrls.slice(0, 6).map((url, i) => (
                          <SafeImage
                            key={url}
                            src={url}
                            alt={`Foto ${i + 1}`}
                            className="aspect-[4/3] overflow-hidden rounded-2xl border border-gray-100"
                            fallbackLabel="Foto"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Terms acceptance */}
                  <div className="rounded-[1.75rem] border border-gray-200 bg-surface p-5">
                    <p className="text-sm font-semibold text-on-surface">Termos e Política de Privacidade</p>
                    <p className="mt-2 text-sm leading-7 text-gray-500">
                      Ao publicar este perfil, você confirma que as informações são verdadeiras e concorda com os{' '}
                      {/* TODO: substituir pelos links reais quando disponíveis */}
                      <span className="font-semibold text-primary">Termos de Uso</span> e a{' '}
                      <span className="font-semibold text-primary">Política de Privacidade</span> do VestGO.
                    </p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.termsAccepted}
                        onChange={(event) => updateField('termsAccepted', event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-semibold text-on-surface">
                        Li e aceito os termos antes de publicar
                      </span>
                    </label>
                  </div>
                </section>
              )}

              {/* ── Feedback messages ────────────────────────────────────── */}
              {error && (
                <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {/* ── Navigation buttons ───────────────────────────────────── */}
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={currentStepIndex <= 0}
                    onClick={() => setStep(steps[currentStepIndex - 1])}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-500 transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                  >
                    Voltar
                  </button>
                  {currentStepIndex < steps.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(steps[currentStepIndex + 1])}
                      className="rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                    >
                      Próxima etapa
                    </button>
                  )}
                </div>

                {/* Show save on last step (review) or always (for quick save from any step) */}
                <button
                  type="submit"
                  disabled={saving || (step === 'review' && !form.termsAccepted)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
                  title={step === 'review' && !form.termsAccepted ? 'Aceite os termos para continuar' : undefined}
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {getSubmitLabel(profile, step, setupMode)}
                </button>
              </div>
            </form>

            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside className="space-y-4">
              <div className="rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                  Status do perfil
                </p>
                <h2 className="mt-3 text-2xl font-bold">
                  {getProfileStatusLabel(profile)}
                </h2>
                <p className="mt-3 text-sm leading-7 text-primary-muted">
                  {profile.profileCompletion.totalItems > 0
                    ? `${profile.profileCompletion.completedItems} de ${profile.profileCompletion.totalItems} itens essenciais preenchidos.`
                    : 'Este perfil ainda não possui checklist operacional.'}
                </p>
              </div>

              <div className="rounded-[2rem] bg-white p-6 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  O que já alimenta o produto
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-500">
                  <li>Mapa e listagem pública de pontos</li>
                  <li>Detalhe público do ponto ou ONG</li>
                  <li>Contexto operacional do seu perfil</li>
                </ul>
              </div>

              {profile.profileCompletion.missingFields.length > 0 && (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
                  <p className="text-sm font-semibold">Ainda faltam campos essenciais</p>
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

              <div className="rounded-[2rem] bg-white p-6 shadow-card">
                <p className="text-sm font-semibold text-primary-deeper">Solidariedade operacional</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                    <p className="text-2xl font-bold text-primary-deeper">
                      {profile.stats.handledDonations}
                    </p>
                    <p className="text-sm text-gray-500">Doações ligadas ao seu perfil</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                    <p className="text-2xl font-bold text-primary-deeper">
                      {profile.stats.activePartnerships}
                    </p>
                    <p className="text-sm text-gray-500">Parcerias operacionais ativas</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-on-surface">{value}</span>
    </div>
  );
}
