import { z } from 'zod';

const BRAZIL_DEFAULT_CENTER = {
  latitude: -23.50153,
  longitude: -47.45256,
  label: 'Sorocaba, SP',
} as const;

const geocodingAddressSchema = z
  .object({
    road: z.string().optional(),
    pedestrian: z.string().optional(),
    footway: z.string().optional(),
    path: z.string().optional(),
    cycleway: z.string().optional(),
    residential: z.string().optional(),
    house: z.string().optional(),
    building: z.string().optional(),
    amenity: z.string().optional(),
    shop: z.string().optional(),
    office: z.string().optional(),
    house_number: z.string().optional(),
    neighbourhood: z.string().optional(),
    suburb: z.string().optional(),
    quarter: z.string().optional(),
    city_district: z.string().optional(),
    borough: z.string().optional(),
    city: z.string().optional(),
    town: z.string().optional(),
    village: z.string().optional(),
    municipality: z.string().optional(),
    county: z.string().optional(),
    state: z.string().optional(),
    state_code: z.string().optional(),
    postcode: z.string().optional(),
  })
  .passthrough();

const geocodingItemSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string().optional(),
  place_id: z.union([z.number(), z.string()]).optional(),
  address: geocodingAddressSchema.optional(),
});

const geocodingResponseSchema = z.array(geocodingItemSchema);

type GeocodingInput = {
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  zipCode?: string;
  city?: string;
  state?: string;
};

type GeocodingAttempt = {
  label: string;
  params: URLSearchParams;
};

type GeocodingProviderItem = z.infer<typeof geocodingItemSchema>;

type AddressAutocompleteInput = {
  query: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
  scope?: 'profile' | 'public';
};

type GeocodingRequestResult =
  | { status: 'resolved'; payload: GeocodingProviderItem[]; query: string }
  | { status: 'unavailable'; message: string };

export type GeocodingResult = {
  latitude: number;
  longitude: number;
  displayName: string | null;
  query: string;
};

export type AddressSuggestion = {
  id: string;
  label: string;
  displayName: string;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
};

export type GeocodingLookup =
  | {
      status: 'resolved';
      result: GeocodingResult;
      attempts: string[];
    }
  | {
      status: 'incomplete';
      missingFields: string[];
    }
  | {
      status: 'not_found';
      attempts: string[];
    }
  | {
      status: 'unavailable';
      message: string;
      attempts: string[];
    };

export type AddressSuggestionLookup =
  | {
      status: 'resolved';
      suggestions: AddressSuggestion[];
      bias: {
        latitude: number;
        longitude: number;
        source: 'user' | 'fallback';
        label: string;
      };
    }
  | {
      status: 'incomplete';
    }
  | {
      status: 'unavailable';
      message: string;
    };

type AddressBias = {
  latitude: number;
  longitude: number;
  source: 'user' | 'fallback';
  label: string;
};

const suggestionCache = new Map<
  string,
  { expiresAt: number; suggestions: AddressSuggestion[]; bias: AddressBias }
>();
const SUGGESTION_CACHE_TTL_MS = 5 * 60 * 1000;
const SUGGESTION_CACHE_MAX_ITEMS = 200;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizePart(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeZipCode(value?: string) {
  const digits = value?.replace(/\D/g, '') ?? '';

  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  return normalizePart(value);
}

function normalizeState(value?: string) {
  const normalized = normalizePart(value);

  if (!normalized) {
    return null;
  }

  return normalized.length === 2 ? normalized.toUpperCase() : normalized;
}

function buildFreeformQuery(parts: Array<string | null>) {
  return parts.filter((value): value is string => Boolean(value)).join(', ');
}

function getStreetLine(input: GeocodingInput) {
  const street = normalizePart(input.address);
  const addressNumber = normalizePart(input.addressNumber);

  if (!street) {
    return null;
  }

  return addressNumber ? `${street}, ${addressNumber}` : street;
}

function getMissingGeocodingFields(input: GeocodingInput) {
  const streetLine = getStreetLine(input);
  const city = normalizePart(input.city);
  const state = normalizeState(input.state);
  const zipCode = normalizeZipCode(input.zipCode);

  const missingFields: string[] = [];

  if (!streetLine) {
    missingFields.push('endereco');
  }

  if (!city && !zipCode) {
    missingFields.push('cidade ou CEP');
  }

  if (!state && !zipCode) {
    missingFields.push('estado ou CEP');
  }

  return missingFields;
}

function getStreetCandidate(address?: GeocodingProviderItem['address']) {
  if (!address) {
    return null;
  }

  return (
    normalizePart(address.road) ??
    normalizePart(address.pedestrian) ??
    normalizePart(address.footway) ??
    normalizePart(address.path) ??
    normalizePart(address.cycleway) ??
    normalizePart(address.residential) ??
    normalizePart(address.house) ??
    normalizePart(address.building) ??
    normalizePart(address.amenity) ??
    normalizePart(address.shop) ??
    normalizePart(address.office)
  );
}

function splitDisplayName(displayName?: string) {
  return (displayName ?? '')
    .split(',')
    .map((segment) => normalizePart(segment))
    .filter((segment): segment is string => Boolean(segment));
}

function looksLikeStreet(value?: string | null) {
  const normalized = normalizePart(value ?? undefined);

  if (!normalized) {
    return false;
  }

  return /^(rua|r\.|avenida|av\.|av |travessa|tv\.|alameda|rodovia|estrada|praca|praça|largo|via|viela|servid[aã]o|passagem|acesso)/i.test(
    normalized,
  );
}

function looksLikeAddressNumber(value?: string | null) {
  const normalized = normalizePart(value ?? undefined);

  if (!normalized) {
    return false;
  }

  return /^\d+[A-Za-z0-9/-]*$/.test(normalized);
}

function extractDisplayNameAddress(displayName?: string) {
  const segments = splitDisplayName(displayName);

  if (segments.length === 0) {
    return {
      address: null,
      addressNumber: null,
    };
  }

  const streetIndex = segments.findIndex((segment) => looksLikeStreet(segment));
  const baseIndex = streetIndex >= 0 ? streetIndex : 0;
  const rawAddress = segments[baseIndex] ?? null;
  const nextSegment = segments[baseIndex + 1] ?? null;
  const trailingNumberMatch = rawAddress?.match(/^(.*?)(?:\s+|,\s*)(\d+[A-Za-z0-9/-]*)$/);

  const address = normalizePart(
    trailingNumberMatch?.[1] ?? rawAddress ?? undefined,
  );
  const addressNumber =
    normalizePart(trailingNumberMatch?.[2] ?? undefined) ??
    (looksLikeAddressNumber(nextSegment) ? normalizePart(nextSegment ?? undefined) : null);

  return {
    address,
    addressNumber,
  };
}

function getNeighborhoodCandidate(address?: GeocodingProviderItem['address']) {
  if (!address) {
    return null;
  }

  return (
    normalizePart(address.neighbourhood) ??
    normalizePart(address.suburb) ??
    normalizePart(address.quarter) ??
    normalizePart(address.city_district) ??
    normalizePart(address.borough)
  );
}

function getCityCandidate(address?: GeocodingProviderItem['address']) {
  if (!address) {
    return null;
  }

  return (
    normalizePart(address.city) ??
    normalizePart(address.town) ??
    normalizePart(address.village) ??
    normalizePart(address.municipality) ??
    normalizePart(address.county)
  );
}

function getResolvedBias(
  latitude?: number,
  longitude?: number,
): AddressBias {
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return {
      latitude,
      longitude,
      source: 'user',
      label: 'localizacao atual',
    };
  }

  return {
    ...BRAZIL_DEFAULT_CENTER,
    source: 'fallback',
  };
}

function getDistanceKm(
  origin: { latitude: number; longitude: number },
  target: { latitude: number; longitude: number },
) {
  const earthRadiusKm = 6371;
  const dLat = ((target.latitude - origin.latitude) * Math.PI) / 180;
  const dLng = ((target.longitude - origin.longitude) * Math.PI) / 180;
  const startLat = (origin.latitude * Math.PI) / 180;
  const endLat = (target.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLat) *
      Math.cos(endLat) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function buildSuggestionLabel(item: Omit<AddressSuggestion, 'label'>) {
  const primary = buildFreeformQuery([item.address, item.addressNumber]);
  const secondary = buildFreeformQuery([item.neighborhood, item.city, item.state]);

  if (primary && secondary) {
    return `${primary} - ${secondary}`;
  }

  return primary || secondary || item.displayName;
}

function mapSuggestionItem(
  item: GeocodingProviderItem,
  bias: AddressBias,
): AddressSuggestion | null {
  const latitude = Number.parseFloat(item.lat);
  const longitude = Number.parseFloat(item.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const displayNameAddress = extractDisplayNameAddress(item.display_name);
  const address = getStreetCandidate(item.address) ?? displayNameAddress.address;
  const addressNumber =
    normalizePart(item.address?.house_number) ?? displayNameAddress.addressNumber;
  const neighborhood = getNeighborhoodCandidate(item.address);
  const city = getCityCandidate(item.address);
  const state =
    normalizeState(item.address?.state_code) ??
    normalizeState(item.address?.state);
  const zipCode = normalizeZipCode(item.address?.postcode);

  const suggestionBase = {
    id: String(item.place_id ?? `${latitude}:${longitude}:${item.display_name ?? 'result'}`),
    displayName: item.display_name ?? '',
    address,
    addressNumber,
    addressComplement: null,
    neighborhood,
    city,
    state,
    zipCode,
    latitude,
    longitude,
    distanceKm: Number.isFinite(bias.latitude) && Number.isFinite(bias.longitude)
      ? Math.round(getDistanceKm(bias, { latitude, longitude }) * 10) / 10
      : null,
  };

  return {
    ...suggestionBase,
    label: buildSuggestionLabel(suggestionBase),
  };
}

function sortSuggestions(
  suggestions: AddressSuggestion[],
  query: string,
  scope: 'profile' | 'public',
) {
  const normalizedQuery = normalizeWhitespace(query).toLowerCase();

  return [...suggestions].sort((left, right) => {
    const leftStartsWith = left.label.toLowerCase().startsWith(normalizedQuery) ? 1 : 0;
    const rightStartsWith = right.label.toLowerCase().startsWith(normalizedQuery) ? 1 : 0;

    if (leftStartsWith !== rightStartsWith) {
      return rightStartsWith - leftStartsWith;
    }

    if (scope === 'profile') {
      const leftHasStreet = left.address ? 1 : 0;
      const rightHasStreet = right.address ? 1 : 0;

      if (leftHasStreet !== rightHasStreet) {
        return rightHasStreet - leftHasStreet;
      }
    }

    return (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY);
  });
}

function setSuggestionCache(
  key: string,
  suggestions: AddressSuggestion[],
  bias: AddressBias,
) {
  if (suggestionCache.size >= SUGGESTION_CACHE_MAX_ITEMS) {
    const oldestKey = suggestionCache.keys().next().value;
    if (oldestKey) {
      suggestionCache.delete(oldestKey);
    }
  }

  suggestionCache.set(key, {
    suggestions,
    bias,
    expiresAt: Date.now() + SUGGESTION_CACHE_TTL_MS,
  });
}

function getSuggestionCache(key: string) {
  const cached = suggestionCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    suggestionCache.delete(key);
    return null;
  }

  return cached;
}

export function hasGeocodingAddress(input: GeocodingInput) {
  return getMissingGeocodingFields(input).length === 0;
}

function buildGeocodingAttempts(input: GeocodingInput) {
  const streetLine = getStreetLine(input);
  const neighborhood = normalizePart(input.neighborhood);
  const city = normalizePart(input.city);
  const state = normalizeState(input.state);
  const zipCode = normalizeZipCode(input.zipCode);

  const attempts: GeocodingAttempt[] = [];

  if (streetLine && city && state && zipCode) {
    attempts.push({
      label: 'structured_with_zip',
      params: new URLSearchParams({
        street: streetLine,
        city,
        state,
        postalcode: zipCode,
      }),
    });
  }

  if (streetLine && city && state) {
    attempts.push({
      label: 'structured_basic',
      params: new URLSearchParams({
        street: streetLine,
        city,
        state,
      }),
    });
  }

  const freeformComplete = buildFreeformQuery([
    streetLine,
    neighborhood,
    city,
    state,
    zipCode,
    'Brasil',
  ]);

  if (freeformComplete) {
    attempts.push({
      label: 'freeform_complete',
      params: new URLSearchParams({ q: freeformComplete }),
    });
  }

  const freeformAddress = buildFreeformQuery([streetLine, city, state, 'Brasil']);

  if (freeformAddress) {
    attempts.push({
      label: 'freeform_address_city_state',
      params: new URLSearchParams({ q: freeformAddress }),
    });
  }

  const freeformAddressZip = buildFreeformQuery([streetLine, zipCode, 'Brasil']);

  if (streetLine && zipCode && freeformAddressZip) {
    attempts.push({
      label: 'freeform_address_zip',
      params: new URLSearchParams({ q: freeformAddressZip }),
    });
  }

  const seen = new Set<string>();

  return attempts.filter((attempt) => {
    const fingerprint = attempt.params.toString();

    if (seen.has(fingerprint)) {
      return false;
    }

    seen.add(fingerprint);
    return true;
  });
}

function buildBaseGeocodingUrl() {
  return new URL(
    process.env.GEOCODING_BASE_URL ?? 'https://nominatim.openstreetmap.org/search',
  );
}

function applyCommonParams(
  params: URLSearchParams,
  options?: { limit?: number; includeLayer?: boolean },
) {
  params.set('format', 'jsonv2');
  params.set('limit', String(options?.limit ?? 1));
  params.set('addressdetails', '1');
  params.set('countrycodes', process.env.GEOCODING_COUNTRY_CODES ?? 'br');

  if (options?.includeLayer !== false) {
    params.set('layer', 'address');
  }

  const geocodingEmail = normalizePart(process.env.GEOCODING_EMAIL);
  if (geocodingEmail) {
    params.set('email', geocodingEmail);
  }

  return params;
}

async function fetchGeocodingPayload(
  params: URLSearchParams,
  options?: { limit?: number; includeLayer?: boolean },
): Promise<GeocodingRequestResult> {
  const url = buildBaseGeocodingUrl();
  const queryParams = applyCommonParams(new URLSearchParams(params), options);
  url.search = queryParams.toString();

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.GEOCODING_TIMEOUT_MS) || 5000,
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          process.env.GEOCODING_USER_AGENT ??
          'VestGO/1.0 (+https://mosfet.com.br; contact: contato@mosfet.com.br)',
        'Accept-Language': process.env.GEOCODING_ACCEPT_LANGUAGE ?? 'pt-BR',
        ...(process.env.APP_PUBLIC_URL ? { Referer: process.env.APP_PUBLIC_URL } : {}),
      },
    });

    if (response.status === 429) {
      return {
        status: 'unavailable',
        message:
          'O servico de geolocalizacao atingiu limite temporario de uso. Tente novamente em instantes.',
      };
    }

    if (!response.ok) {
      return {
        status: 'unavailable',
        message: 'Nao foi possivel consultar o servico de geolocalizacao no momento.',
      };
    }

    return {
      status: 'resolved',
      payload: geocodingResponseSchema.parse(await response.json()),
      query: url.toString(),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 'unavailable',
        message: 'O servico de geolocalizacao respondeu em um formato invalido.',
      };
    }

    const isTimeoutError =
      error instanceof Error &&
      (error.name === 'AbortError' || /abort/i.test(error.message));

    return {
      status: 'unavailable',
      message: isTimeoutError
        ? 'A consulta ao servico de geolocalizacao demorou demais para responder.'
        : 'Nao foi possivel consultar o servico de geolocalizacao no momento.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGeocodingAttempt(
  attempt: GeocodingAttempt,
): Promise<
  | { status: 'resolved'; result: GeocodingResult }
  | { status: 'empty' }
  | { status: 'unavailable'; message: string }
> {
  const response = await fetchGeocodingPayload(attempt.params);

  if (response.status === 'unavailable') {
    return response;
  }

  const firstMatch = response.payload[0];

  if (!firstMatch) {
    return { status: 'empty' };
  }

  const latitude = Number.parseFloat(firstMatch.lat);
  const longitude = Number.parseFloat(firstMatch.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      status: 'unavailable',
      message: 'O servico de geolocalizacao retornou coordenadas invalidas.',
    };
  }

  return {
    status: 'resolved',
    result: {
      latitude,
      longitude,
      displayName: firstMatch.display_name ?? null,
      query: response.query,
    },
  };
}

export async function geocodeAddress(input: GeocodingInput): Promise<GeocodingLookup> {
  const missingFields = getMissingGeocodingFields(input);

  if (missingFields.length > 0) {
    return {
      status: 'incomplete',
      missingFields,
    };
  }

  const attempts = buildGeocodingAttempts(input);
  const attemptLabels: string[] = [];

  for (const attempt of attempts) {
    attemptLabels.push(attempt.label);
    const result = await fetchGeocodingAttempt(attempt);

    if (result.status === 'resolved') {
      return {
        status: 'resolved',
        result: result.result,
        attempts: attemptLabels,
      };
    }

    if (result.status === 'unavailable') {
      return {
        status: 'unavailable',
        message: result.message,
        attempts: attemptLabels,
      };
    }
  }

  return {
    status: 'not_found',
    attempts: attemptLabels,
  };
}

export async function suggestAddresses(
  input: AddressAutocompleteInput,
): Promise<AddressSuggestionLookup> {
  const query = normalizePart(input.query);

  if (!query || query.length < 3) {
    return { status: 'incomplete' };
  }

  const limit = Math.min(Math.max(input.limit ?? 5, 1), 8);
  const scope = input.scope ?? 'profile';
  const bias = getResolvedBias(input.latitude, input.longitude);
  const cacheKey = `${scope}:${query.toLowerCase()}:${bias.latitude.toFixed(3)}:${bias.longitude.toFixed(3)}:${limit}`;
  const cached = getSuggestionCache(cacheKey);

  if (cached) {
    return {
      status: 'resolved',
      suggestions: cached.suggestions,
      bias: cached.bias,
    };
  }

  const params = new URLSearchParams({ q: query });
  const response = await fetchGeocodingPayload(params, {
    limit: Math.max(limit * 2, 6),
    includeLayer: false,
  });

  if (response.status === 'unavailable') {
    return {
      status: 'unavailable',
      message: response.message,
    };
  }

  const suggestions = sortSuggestions(
    response.payload
      .map((item) => mapSuggestionItem(item, bias))
      .filter((item): item is AddressSuggestion => Boolean(item)),
    query,
    scope,
  ).slice(0, limit);

  setSuggestionCache(cacheKey, suggestions, bias);

  return {
    status: 'resolved',
    suggestions,
    bias,
  };
}

export function formatAddressLine(input: {
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
}) {
  const address = normalizePart(input.address ?? undefined);
  const addressNumber = normalizePart(input.addressNumber ?? undefined);
  const addressComplement = normalizePart(input.addressComplement ?? undefined);

  const line = buildFreeformQuery([address, addressNumber]);

  if (!line) {
    return null;
  }

  return addressComplement ? `${line} - ${addressComplement}` : line;
}

export function getDefaultLocationBias() {
  return BRAZIL_DEFAULT_CENTER;
}
