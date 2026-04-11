import { ItemCategory, PublicProfileState, UserRole } from '@prisma/client';
import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrl = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalStringArray = (maxItems: number, maxItemLength: number) =>
  z
    .array(z.string().trim().min(2).max(maxItemLength))
    .max(maxItems)
    .optional()
    .transform((value) => value?.filter(Boolean) ?? []);

export const profileWriteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: optionalText(30),
  organizationName: optionalText(160),
  description: optionalText(1200),
  purpose: optionalText(1200),
  address: optionalText(180),
  neighborhood: optionalText(120),
  zipCode: optionalText(20),
  city: optionalText(120),
  state: optionalText(80),
  openingHours: optionalText(800),
  publicNotes: optionalText(1000),
  operationalNotes: optionalText(1000),
  accessibilityDetails: optionalText(600),
  verificationNotes: optionalText(600),
  estimatedCapacity: optionalText(120),
  avatarUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  acceptedCategories: z.array(z.nativeEnum(ItemCategory)).max(10).optional().default([]),
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
  | 'address'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'neighborhood'
  | 'openingHours'
  | 'phone'
  | 'acceptedCategories'
  | 'serviceRegions'
> & {
  latitude?: number;
  longitude?: number;
};

export function getOperationalProfileChecklist(
  role: UserRole,
  payload: CompletionPayload,
): CompletionEntry[] {
  if (role === UserRole.COLLECTION_POINT) {
    return [
      { key: 'organizationName', label: 'Nome publico do ponto', complete: hasValue(payload.organizationName) },
      { key: 'description', label: 'Descricao do local', complete: hasValue(payload.description) },
      { key: 'address', label: 'Endereco', complete: hasValue(payload.address) },
      { key: 'neighborhood', label: 'Bairro', complete: hasValue(payload.neighborhood) },
      { key: 'zipCode', label: 'CEP', complete: hasValue(payload.zipCode) },
      { key: 'city', label: 'Cidade', complete: hasValue(payload.city) },
      { key: 'state', label: 'Estado', complete: hasValue(payload.state) },
      { key: 'phone', label: 'Telefone', complete: hasValue(payload.phone) },
      { key: 'openingHours', label: 'Horario de funcionamento', complete: hasValue(payload.openingHours) },
      {
        key: 'acceptedCategories',
        label: 'Itens aceitos',
        complete: Array.isArray(payload.acceptedCategories) && payload.acceptedCategories.length > 0,
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
      { key: 'organizationName', label: 'Nome da ONG', complete: hasValue(payload.organizationName) },
      { key: 'description', label: 'Descricao institucional', complete: hasValue(payload.description) },
      { key: 'purpose', label: 'Proposito', complete: hasValue(payload.purpose) },
      { key: 'address', label: 'Endereco base', complete: hasValue(payload.address) },
      { key: 'city', label: 'Cidade base', complete: hasValue(payload.city) },
      { key: 'state', label: 'Estado', complete: hasValue(payload.state) },
      { key: 'phone', label: 'Telefone', complete: hasValue(payload.phone) },
      {
        key: 'acceptedCategories',
        label: 'Itens aceitos',
        complete: Array.isArray(payload.acceptedCategories) && payload.acceptedCategories.length > 0,
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
    acceptedCategories: input.acceptedCategories ?? [],
    nonAcceptedItems: input.nonAcceptedItems ?? [],
    rules: input.rules ?? [],
    serviceRegions: input.serviceRegions ?? [],
  };
}
