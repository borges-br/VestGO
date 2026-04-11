'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { getMyProfile, updateMyProfile, type MyProfile } from '@/lib/api';
import { useAddressSuggestions } from '@/hooks/use-address-suggestions';

type StepKey = 'identity' | 'location' | 'acceptance';

type FormState = {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  coverImageUrl: string;
  organizationName: string;
  description: string;
  purpose: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  zipCode: string;
  city: string;
  state: string;
  openingHours: string;
  publicNotes: string;
  operationalNotes: string;
  accessibilityDetails: string;
  estimatedCapacity: string;
  acceptedCategories: string[];
  nonAcceptedItemsText: string;
  rulesText: string;
  serviceRegionsText: string;
};

const CATEGORY_OPTIONS = [
  { value: 'CLOTHING', label: 'Roupas' },
  { value: 'SHOES', label: 'Calcados' },
  { value: 'ACCESSORIES', label: 'Acessorios' },
  { value: 'BAGS', label: 'Bolsas' },
  { value: 'OTHER', label: 'Outros itens' },
];

const PROFILE_STATE_LABELS = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  VERIFIED: 'Verificado',
} as const;

function sanitizeCallbackUrl(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/')) {
    return fallback;
  }

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

  if (!normalized) {
    return false;
  }

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

  if (directAddress) {
    return directAddress;
  }

  for (const source of [suggestion.label, suggestion.displayName]) {
    const segments = extractAddressSegments(source);
    const streetIndex = segments.findIndex((segment) => looksLikeStreet(segment));
    const baseIndex = streetIndex >= 0 ? streetIndex : 0;
    const candidate = normalizeAddressValue(segments[baseIndex]);

    if (candidate && !looksLikeAddressNumber(candidate)) {
      return candidate;
    }
  }

  return currentAddress;
}

function buildInitialState(profile: MyProfile): FormState {
  return {
    name: profile.name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    avatarUrl: profile.avatarUrl ?? '',
    coverImageUrl: profile.coverImageUrl ?? '',
    organizationName: profile.organizationName ?? '',
    description: profile.description ?? '',
    purpose: profile.purpose ?? '',
    address: profile.address ?? '',
    addressNumber: profile.addressNumber ?? '',
    addressComplement: profile.addressComplement ?? '',
    neighborhood: profile.neighborhood ?? '',
    zipCode: profile.zipCode ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    openingHours: profile.openingHours ?? '',
    publicNotes: profile.publicNotes ?? '',
    operationalNotes: profile.operationalNotes ?? '',
    accessibilityDetails: profile.accessibilityDetails ?? '',
    estimatedCapacity: profile.estimatedCapacity ?? '',
    acceptedCategories: profile.acceptedCategories ?? [],
    nonAcceptedItemsText: (profile.nonAcceptedItems ?? []).join('\n'),
    rulesText: (profile.rules ?? []).join('\n'),
    serviceRegionsText: (profile.serviceRegions ?? []).join('\n'),
  };
}

function getStepOrder() {
  return ['identity', 'location', 'acceptance'] as StepKey[];
}

function getStepLabel(step: StepKey, role: string) {
  if (step === 'identity') {
    return role === 'NGO' ? 'Institucional' : 'Identidade';
  }

  if (step === 'location') {
    return role === 'NGO' ? 'Base e cobertura' : 'Local e horario';
  }

  return 'Itens e regras';
}

function getRoleLabel(role: string) {
  return role === 'NGO' ? 'ONG Parceira' : 'Ponto de Coleta';
}

function getRoleIcon(role: string) {
  return role === 'NGO' ? Users : Store;
}

function buildPayload(role: string, form: FormState) {
  return {
    name: form.name,
    email: form.email,
    phone: form.phone || undefined,
    avatarUrl: form.avatarUrl || undefined,
    coverImageUrl: form.coverImageUrl || undefined,
    organizationName: form.organizationName || undefined,
    description: form.description || undefined,
    purpose: role === 'NGO' ? form.purpose || undefined : undefined,
    address: form.address || undefined,
    addressNumber: form.addressNumber || undefined,
    addressComplement: form.addressComplement || undefined,
    neighborhood: form.neighborhood || undefined,
    zipCode: form.zipCode || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    openingHours: role === 'COLLECTION_POINT' ? form.openingHours || undefined : undefined,
    publicNotes: form.publicNotes || undefined,
    operationalNotes: role === 'NGO' ? form.operationalNotes || undefined : undefined,
    accessibilityDetails:
      role === 'COLLECTION_POINT' ? form.accessibilityDetails || undefined : undefined,
    estimatedCapacity:
      role === 'COLLECTION_POINT' ? form.estimatedCapacity || undefined : undefined,
    acceptedCategories: form.acceptedCategories,
    nonAcceptedItems: serializeMultiline(form.nonAcceptedItemsText),
    rules: serializeMultiline(form.rulesText),
    serviceRegions: role === 'NGO' ? serializeMultiline(form.serviceRegionsText) : [],
  };
}

export function OperationalProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

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

  const addressBlurTimeoutRef = useRef<number | null>(null);

  const setupMode = searchParams.get('setup') === '1';
  const role = session?.user?.role ?? '';
  const defaultCallback = role === 'DONOR' ? '/inicio' : '/operacoes';
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'), defaultCallback);
  const steps = getStepOrder();
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
        setStep(getStepOrder()[0]);
      } catch {
        setError('Nao foi possivel carregar seu perfil operacional agora.');
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

  function updateField(field: keyof FormState, value: string | string[]) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function updateAddressField(field: keyof FormState, value: string) {
    updateField(field, value);
    setAddressAssistMessage(null);

    if (
      field === 'address' ||
      field === 'addressNumber' ||
      field === 'addressComplement' ||
      field === 'neighborhood' ||
      field === 'zipCode' ||
      field === 'city' ||
      field === 'state'
    ) {
      setAddressPreview(null);
    }
  }

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
      if (!current) {
        return current;
      }

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

    setAddressPreview({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    setAddressAssistMessage(
      'Sugestao aplicada. Revise numero e complemento antes de salvar, se necessario.',
    );
    setAddressFocused(false);
    clearSuggestions();
  }

  function toggleCategory(category: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const exists = current.acceptedCategories.includes(category);

      return {
        ...current,
        acceptedCategories: exists
          ? current.acceptedCategories.filter((item) => item !== category)
          : [...current.acceptedCategories, category],
      };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!session?.user?.accessToken || !form || !profile) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateMyProfile(
        buildPayload(profile.role, form),
        session.user.accessToken,
      );

      setProfile(updated);
      setForm(buildInitialState(updated));
      setAddressPreview(
        updated.latitude != null && updated.longitude != null
          ? { latitude: updated.latitude, longitude: updated.longitude }
          : null,
      );
      setAddressAssistMessage('Endereco salvo e coordenadas atualizadas automaticamente.');
      setSuccess(
        setupMode
          ? 'Perfil salvo. Redirecionando para o proximo passo da sua operacao...'
          : 'Perfil operacional atualizado com sucesso.',
      );

      if (setupMode) {
        router.push(callbackUrl);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Nao foi possivel salvar o perfil agora.',
      );
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <div className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell">
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
                {setupMode ? 'Configuracao inicial' : 'Perfil operacional'}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-primary-deeper">
                {profile.role === 'NGO' ? 'Perfil publico da ONG' : 'Perfil publico do ponto'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">
                {setupMode
                  ? 'Preencha as informacoes que doadores precisam ver para confiar no local, encontrar voce no mapa e entender como doar.'
                  : 'Edite as informacoes publicas e operacionais que aparecem para doadores e ajudam a equipe a operar melhor.'}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary shadow-card">
            <ShieldCheck size={15} />
            {PROFILE_STATE_LABELS[profile.publicProfileState]}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-[2rem] bg-white p-5 shadow-card lg:p-7"
          >
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
                  {getStepLabel(item, profile.role)}
                </button>
              ))}
            </div>

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
                        Identidade publica e pessoa responsavel pelo atendimento.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Responsavel</span>
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

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Telefone</span>
                    <input
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>
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
                </div>

                <label className="space-y-2 text-sm text-gray-500">
                  <span className="font-semibold text-on-surface">Descricao publica</span>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    placeholder="Explique rapidamente o que este parceiro faz, como recebe doacoes e qual contexto atende."
                    className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </label>

                {profile.role === 'NGO' && (
                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Proposito</span>
                    <textarea
                      rows={4}
                      value={form.purpose}
                      onChange={(event) => updateField('purpose', event.target.value)}
                      placeholder="Como a ONG transforma as doacoes em impacto real."
                      className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Foto/Avatar (URL)</span>
                    <input
                      value={form.avatarUrl}
                      onChange={(event) => updateField('avatarUrl', event.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Capa (URL)</span>
                    <input
                      value={form.coverImageUrl}
                      onChange={(event) => updateField('coverImageUrl', event.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>
                </div>
              </section>
            )}

            {step === 'location' && (
              <section className="space-y-4">
                <div className="rounded-[1.75rem] bg-surface p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary-deeper">
                        {profile.role === 'NGO' ? 'Base e area de atendimento' : 'Endereco e horario'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Estes dados alimentam o mapa, o detalhe publico e a confianca do doador.
                      </p>
                    </div>
                  </div>
                </div>

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
                            Buscando sugestoes de endereco...
                          </div>
                        )}

                        {!addressSuggestionsLoading && addressSuggestionsError && (
                          <div className="px-4 py-3 text-sm text-amber-700">
                            {addressSuggestionsError}
                          </div>
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
                                <p className="text-sm font-semibold text-on-surface">
                                  {suggestion.label}
                                </p>
                                <p className="mt-1 text-xs leading-6 text-gray-400">
                                  {suggestion.displayName}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}

                        {!addressSuggestionsLoading &&
                          !addressSuggestionsError &&
                          hasAddressSuggestionQuery &&
                          addressSuggestions.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              Nenhuma sugestao apareceu para esse trecho. Continue digitando ou refine cidade/estado.
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Digite parte do endereco e escolha uma sugestao para preencher bairro, cidade, estado, CEP e coordenadas automaticamente.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Numero</span>
                    <input
                      value={form.addressNumber}
                      onChange={(event) => updateAddressField('addressNumber', event.target.value)}
                      placeholder="Ex.: 1200"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Complemento</span>
                    <input
                      value={form.addressComplement}
                      onChange={(event) =>
                        updateAddressField('addressComplement', event.target.value)
                      }
                      placeholder="Ex.: Sala 2, bloco B"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Bairro</span>
                    <input
                      value={form.neighborhood}
                      onChange={(event) => updateAddressField('neighborhood', event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">CEP</span>
                    <input
                      value={form.zipCode}
                      onChange={(event) => updateAddressField('zipCode', event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Cidade</span>
                    <input
                      value={form.city}
                      onChange={(event) => updateAddressField('city', event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-gray-500">
                    <span className="font-semibold text-on-surface">Estado</span>
                    <input
                      value={form.state}
                      onChange={(event) => updateAddressField('state', event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </label>
                </div>

                {profile.role === 'COLLECTION_POINT' && (
                  <>
                    <label className="space-y-2 text-sm text-gray-500">
                      <span className="font-semibold text-on-surface">Horario de funcionamento</span>
                      <textarea
                        rows={3}
                        value={form.openingHours}
                        onChange={(event) => updateField('openingHours', event.target.value)}
                        placeholder="Segunda a sexta, das 9h as 18h..."
                        className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-gray-500">
                        <span className="font-semibold text-on-surface">Capacidade estimada</span>
                        <input
                          value={form.estimatedCapacity}
                          onChange={(event) => updateField('estimatedCapacity', event.target.value)}
                          placeholder="Ex.: Ate 100 sacolas por semana"
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-gray-500">
                        <span className="font-semibold text-on-surface">Acessibilidade</span>
                        <input
                          value={form.accessibilityDetails}
                          onChange={(event) =>
                            updateField('accessibilityDetails', event.target.value)
                          }
                          placeholder="Ex.: Rampa, elevador, apoio no desembarque"
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                        />
                      </label>
                    </div>
                  </>
                )}

                {profile.role === 'NGO' && (
                  <>
                    <label className="space-y-2 text-sm text-gray-500">
                      <span className="font-semibold text-on-surface">Regioes atendidas</span>
                      <textarea
                        rows={4}
                        value={form.serviceRegionsText}
                        onChange={(event) => updateField('serviceRegionsText', event.target.value)}
                        placeholder={'Uma regiao por linha\nEx.: Zona Leste'}
                        className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                      />
                    </label>

                    <label className="space-y-2 text-sm text-gray-500">
                      <span className="font-semibold text-on-surface">Observacoes operacionais</span>
                      <textarea
                        rows={4}
                        value={form.operationalNotes}
                        onChange={(event) => updateField('operationalNotes', event.target.value)}
                        placeholder="Contexto de triagem, campanhas atendidas e particularidades da operacao."
                        className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                      />
                    </label>
                  </>
                )}

                <div className="rounded-[1.5rem] border border-dashed border-primary/25 bg-primary-light/30 p-4 text-sm text-gray-500">
                  <p className="font-semibold text-primary-deeper">Localizacao estimada automaticamente</p>
                  <p className="mt-2 leading-7">
                    O VestGO agora gera as coordenadas a partir do endereco salvo. Nao e mais necessario informar latitude e longitude manualmente.
                  </p>
                  {addressAssistMessage && (
                    <p className="mt-2 rounded-2xl bg-white/80 px-3 py-2 text-xs font-medium text-primary-deeper">
                      {addressAssistMessage}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {addressPreview != null
                      ? `Coordenadas sugeridas: ${addressPreview.latitude.toFixed(5)}, ${addressPreview.longitude.toFixed(5)}`
                      : profile.latitude != null && profile.longitude != null
                        ? `Coordenadas atuais: ${profile.latitude.toFixed(5)}, ${profile.longitude.toFixed(5)}`
                      : 'Use rua com numero e, de preferencia, cidade/estado e CEP para melhorar a precisao da geolocalizacao automatica.'}
                  </p>
                </div>
              </section>
            )}

            {step === 'acceptance' && (
              <section className="space-y-4">
                <div className="rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">Itens aceitos e regras</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Esta parte reduz atrito para o doador e deixa mais claro o que pode ou nao ser entregue.
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
                  <span className="font-semibold text-on-surface">Itens nao aceitos</span>
                  <textarea
                    rows={4}
                    value={form.nonAcceptedItemsText}
                    onChange={(event) => updateField('nonAcceptedItemsText', event.target.value)}
                    placeholder={'Um item por linha\nEx.: Pecas com mofo'}
                    className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-500">
                  <span className="font-semibold text-on-surface">Regras do local</span>
                  <textarea
                    rows={4}
                    value={form.rulesText}
                    onChange={(event) => updateField('rulesText', event.target.value)}
                    placeholder={'Uma regra por linha\nEx.: Doe apenas itens limpos'}
                    className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-500">
                  <span className="font-semibold text-on-surface">Observacoes publicas</span>
                  <textarea
                    rows={4}
                    value={form.publicNotes}
                    onChange={(event) => updateField('publicNotes', event.target.value)}
                    placeholder="Informacoes adicionais que ajudam o doador a planejar a entrega."
                    className="w-full rounded-[1.5rem] border border-gray-200 bg-white px-4 py-3.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                  />
                </label>
              </section>
            )}

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
                    Proxima etapa
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {setupMode ? 'Salvar e continuar' : 'Salvar perfil'}
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-[2rem] bg-primary-deeper p-6 text-white shadow-card-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                Status do perfil
              </p>
              <h2 className="mt-3 text-2xl font-bold">
                {PROFILE_STATE_LABELS[profile.publicProfileState]}
              </h2>
              <p className="mt-3 text-sm leading-7 text-primary-muted">
                {profile.profileCompletion.totalItems > 0
                  ? `${profile.profileCompletion.completedItems} de ${profile.profileCompletion.totalItems} itens essenciais preenchidos.`
                  : 'Este perfil ainda nao possui checklist operacional.'}
              </p>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                O que ja alimenta o produto
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-500">
                <li>Mapa e listagem publica de pontos</li>
                <li>Detalhe publico do ponto ou ONG</li>
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
              <p className="text-sm font-semibold text-primary-deeper">Impacto operacional</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.5rem] bg-surface px-4 py-4">
                  <p className="text-2xl font-bold text-primary-deeper">
                    {profile.stats.handledDonations}
                  </p>
                  <p className="text-sm text-gray-500">Doacoes ligadas ao seu perfil</p>
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
  );
}
