import { ItemCategory, PublicProfileState, UserRole } from '@prisma/client';
import { z } from 'zod';

const WEEKDAY_IDS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

const WEEKDAY_LABELS: Record<(typeof WEEKDAY_IDS)[number], string> = {
  MONDAY: 'Seg',
  TUESDAY: 'Ter',
  WEDNESDAY: 'Qua',
  THURSDAY: 'Qui',
  FRIDAY: 'Sex',
  SATURDAY: 'Sab',
  SUNDAY: 'Dom',
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data valida no formato AAAA-MM-DD.')
  .optional()
  .or(z.literal(''))
  .transform((value) => (value && value.length > 0 ? value : undefined));

const RELATIVE_ASSET_URL_PATTERN = /^\/api\/backend\/uploads\/[a-zA-Z0-9._%-]+$/;
const MAX_PROFILE_GALLERY_IMAGES = 6;

function isSupportedAssetUrl(value: string) {
  if (RELATIVE_ASSET_URL_PATTERN.test(value)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const optionalUrl = z
  .string()
  .trim()
  .refine(isSupportedAssetUrl, 'Informe uma URL valida ou um asset enviado pelo VestGO.')
  .optional()
  .or(z.literal(''))
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalStringArray = (maxItems: number, maxItemLength: number) =>
  z
    .array(z.string().trim().min(2).max(maxItemLength))
    .max(maxItems)
    .optional()
    .transform((value) => value?.filter(Boolean) ?? []);

const optionalAssetUrlArray = (maxItems: number) =>
  z
    .array(z.string().trim().refine(isSupportedAssetUrl))
    .max(maxItems)
    .optional()
    .transform((value) => Array.from(new Set(value?.filter(Boolean) ?? [])));

const optionalTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .optional()
  .or(z.literal(''))
  .transform((value) => (value && value.length > 0 ? value : undefined));

type WeekdayId = (typeof WEEKDAY_IDS)[number];

export type OpeningScheduleEntry = {
  day: WeekdayId;
  isOpen: boolean;
  open: string | undefined;
  close: string | undefined;
};

export function normalizeOpeningSchedule(
  value?: Array<{
    day: WeekdayId;
    isOpen?: boolean;
    open?: string;
    close?: string;
  }>,
) {
  const entries = value ?? [];
  const byDay = new Map<WeekdayId, OpeningScheduleEntry>();

  entries.forEach((entry) => {
    byDay.set(entry.day, {
      day: entry.day,
      isOpen: entry.isOpen === true,
      open: entry.open,
      close: entry.close,
    });
  });

  return WEEKDAY_IDS.map((day) => {
    const entry = byDay.get(day);

    return {
      day,
      isOpen: entry?.isOpen === true,
      open: entry?.open,
      close: entry?.close,
    };
  });
}

export const openingScheduleEntrySchema = z.object({
  day: z.enum(WEEKDAY_IDS),
  isOpen: z.boolean().optional().default(false),
  open: optionalTime,
  close: optionalTime,
});

export const openingScheduleSchema = z
  .array(openingScheduleEntrySchema)
  .max(7)
  .optional()
  .transform((value) => normalizeOpeningSchedule(value));

export const profileWriteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  birthDate: optionalDate,
  phone: optionalText(30),
  organizationName: optionalText(160),
  description: optionalText(1200),
  purpose: optionalText(1200),
  address: optionalText(180),
  addressNumber: optionalText(40),
  addressComplement: optionalText(120),
  neighborhood: optionalText(120),
  zipCode: optionalText(20),
  city: optionalText(120),
  state: optionalText(80),
  openingHours: optionalText(800),
  openingSchedule: openingScheduleSchema,
  openingHoursExceptions: optionalText(300),
  publicNotes: optionalText(1000),
  operationalNotes: optionalText(1000),
  accessibilityDetails: optionalText(600),
  accessibilityFeatures: optionalStringArray(12, 80),
  verificationNotes: optionalText(600),
  estimatedCapacity: optionalText(120),
  avatarUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  galleryImageUrls: optionalAssetUrlArray(MAX_PROFILE_GALLERY_IMAGES),
  acceptedCategories: z.array(z.nativeEnum(ItemCategory)).max(10).optional().default([]),
  donationInterestCategories: z
    .array(z.nativeEnum(ItemCategory))
    .max(10)
    .optional()
    .default([]),
  nonAcceptedItems: optionalStringArray(20, 80),
  rules: optionalStringArray(16, 140),
  serviceRegions: optionalStringArray(12, 80),
});

export type ProfileWriteInput = z.infer<typeof profileWriteSchema>;

export function getInitialProfileState(role: UserRole) {
  return role === UserRole.COLLECTION_POINT || role === UserRole.NGO
    ? PublicProfileState.DRAFT
    : PublicProfileState.ACTIVE;
}

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function hasOpeningSchedule(
  openingSchedule?: Array<{
    isOpen?: boolean;
    open?: string;
    close?: string;
  }>,
) {
  return Boolean(
    openingSchedule?.some((entry) => entry.isOpen && entry.open && entry.close),
  );
}

type CompletionEntry = {
  key: string;
  label: string;
  complete: boolean;
};

type CompletionPayload = Pick<
  ProfileWriteInput,
  | 'organizationName'
  | 'description'
  | 'purpose'
  | 'birthDate'
  | 'address'
  | 'addressNumber'
  | 'addressComplement'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'neighborhood'
  | 'openingHours'
  | 'openingSchedule'
  | 'phone'
  | 'acceptedCategories'
  | 'donationInterestCategories'
  | 'serviceRegions'
> & {
  latitude?: number;
  longitude?: number;
};

export function getOperationalProfileChecklist(
  role: UserRole,
  payload: CompletionPayload,
): CompletionEntry[] {
  if (role === UserRole.DONOR) {
    return [
      {
        key: 'birthDate',
        label: 'Data de nascimento',
        complete: hasValue(payload.birthDate),
      },
      { key: 'city', label: 'Cidade', complete: hasValue(payload.city) },
      { key: 'state', label: 'Estado', complete: hasValue(payload.state) },
      {
        key: 'donationInterestCategories',
        label: 'Interesses de doacao',
        complete:
          Array.isArray(payload.donationInterestCategories) &&
          payload.donationInterestCategories.length > 0,
      },
    ];
  }

  if (role === UserRole.COLLECTION_POINT) {
    return [
      {
        key: 'organizationName',
        label: 'Nome publico do ponto',
        complete: hasValue(payload.organizationName),
      },
      { key: 'description', label: 'Descricao do local', complete: hasValue(payload.description) },
      { key: 'address', label: 'Endereco', complete: hasValue(payload.address) },
      { key: 'neighborhood', label: 'Bairro', complete: hasValue(payload.neighborhood) },
      { key: 'zipCode', label: 'CEP', complete: hasValue(payload.zipCode) },
      { key: 'city', label: 'Cidade', complete: hasValue(payload.city) },
      { key: 'state', label: 'Estado', complete: hasValue(payload.state) },
      { key: 'phone', label: 'Telefone', complete: hasValue(payload.phone) },
      {
        key: 'openingHours',
        label: 'Horario de funcionamento',
        complete: hasOpeningSchedule(payload.openingSchedule) || hasValue(payload.openingHours),
      },
      {
        key: 'acceptedCategories',
        label: 'Itens aceitos',
        complete:
          Array.isArray(payload.acceptedCategories) && payload.acceptedCategories.length > 0,
      },
      {
        key: 'coordinates',
        label: 'Localizacao no mapa',
        complete: typeof payload.latitude === 'number' && typeof payload.longitude === 'number',
      },
    ];
  }

  if (role === UserRole.NGO) {
    return [
      {
        key: 'organizationName',
        label: 'Nome da ONG',
        complete: hasValue(payload.organizationName),
      },
      {
        key: 'description',
        label: 'Descricao institucional',
        complete: hasValue(payload.description),
      },
      { key: 'purpose', label: 'Proposito', complete: hasValue(payload.purpose) },
      { key: 'address', label: 'Endereco base', complete: hasValue(payload.address) },
      { key: 'city', label: 'Cidade base', complete: hasValue(payload.city) },
      { key: 'state', label: 'Estado', complete: hasValue(payload.state) },
      { key: 'phone', label: 'Telefone', complete: hasValue(payload.phone) },
      {
        key: 'acceptedCategories',
        label: 'Itens aceitos',
        complete:
          Array.isArray(payload.acceptedCategories) && payload.acceptedCategories.length > 0,
      },
      {
        key: 'serviceRegions',
        label: 'Regioes atendidas',
        complete: Array.isArray(payload.serviceRegions) && payload.serviceRegions.length > 0,
      },
      {
        key: 'coordinates',
        label: 'Localizacao no mapa',
        complete: typeof payload.latitude === 'number' && typeof payload.longitude === 'number',
      },
    ];
  }

  return [];
}

export function getOperationalProfileState(
  role: UserRole,
  payload: CompletionPayload,
  currentState?: PublicProfileState,
) {
  const checklist = getOperationalProfileChecklist(role, payload);
  const complete = checklist.every((entry) => entry.complete);

  if (role === UserRole.COLLECTION_POINT || role === UserRole.NGO) {
    if (!complete) return PublicProfileState.DRAFT;

    if (currentState === PublicProfileState.VERIFIED) {
      return PublicProfileState.VERIFIED;
    }

    if (currentState === PublicProfileState.ACTIVE) {
      return currentState;
    }

    return PublicProfileState.PENDING;
  }

  return PublicProfileState.ACTIVE;
}

export function sanitizeProfileWriteInput(input: ProfileWriteInput) {
  return {
    ...input,
    openingSchedule: input.openingSchedule ?? [],
    accessibilityFeatures: input.accessibilityFeatures ?? [],
    acceptedCategories: input.acceptedCategories ?? [],
    donationInterestCategories: input.donationInterestCategories ?? [],
    galleryImageUrls: input.galleryImageUrls ?? [],
    nonAcceptedItems: input.nonAcceptedItems ?? [],
    rules: input.rules ?? [],
    serviceRegions: input.serviceRegions ?? [],
  };
}

export function buildOpeningHoursSummary(
  openingSchedule?: OpeningScheduleEntry[],
  exceptions?: string,
) {
  const normalized = normalizeOpeningSchedule(openingSchedule);
  const openEntries = normalized.filter((entry) => entry.isOpen && entry.open && entry.close);

  if (openEntries.length === 0) {
    return undefined;
  }

  const summary = openEntries
    .map((entry) => `${WEEKDAY_LABELS[entry.day]} ${entry.open}-${entry.close}`)
    .join(' | ');

  if (exceptions && exceptions.trim().length > 0) {
    return `${summary} | Obs.: ${exceptions.trim()}`;
  }

  return summary;
}
