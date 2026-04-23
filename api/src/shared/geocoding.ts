import { z } from 'zod';

const BRAZIL_DEFAULT_CENTER = {
  latitude: -23.50153,
  longitude: -47.45256,
  label: 'Sorocaba, SP',
} as const;

const MAPBOX_FORWARD_URL = 'https://api.mapbox.com/search/geocode/v6/forward';
const MAPBOX_REVERSE_URL = 'https://api.mapbox.com/search/geocode/v6/reverse';
const MAPBOX_PROFILE_TYPES = 'address,street,postcode,locality,neighborhood,place,region';
const MAPBOX_PUBLIC_TYPES = 'address,street,postcode,locality,neighborhood,place,region';

const nominatimAddressSchema = z
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

const nominatimSearchItemSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string().optional(),
  place_id: z.union([z.number(), z.string()]).optional(),
  address: nominatimAddressSchema.optional(),
});

const nominatimSearchResponseSchema = z.array(nominatimSearchItemSchema);

const nominatimReverseResponseSchema = z.object({
  lat: z.union([z.string(), z.number()]),
  lon: z.union([z.string(), z.number()]),
  display_name: z.string().optional(),
  place_id: z.union([z.number(), z.string()]).optional(),
  address: nominatimAddressSchema.optional(),
});

type GeocodingInput = {
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  zipCode?: string;
  city?: string;
  state?: string;
};

type AddressAutocompleteInput = {
  query: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
  scope?: 'profile' | 'public';
};

type ForwardAttempt = {
  label: string;
  params: URLSearchParams;
};

type AddressBias = {
  latitude: number;
  longitude: number;
  source: 'user' | 'fallback';
  label: string;
};

type NominatimItem = z.infer<typeof nominatimSearchItemSchema>;

type JsonRecord = Record<string, unknown>;

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
      bias: AddressBias;
    }
  | {
      status: 'incomplete';
    }
  | {
      status: 'unavailable';
      message: string;
    };

export type ReverseGeocodingLookup =
  | {
      status: 'resolved';
      result: AddressSuggestion;
    }
  | {
      status: 'not_found';
    }
  | {
      status: 'unavailable';
      message: string;
    };

type ForwardRequestResult =
  | { status: 'resolved'; features: unknown[]; query: string }
  | { status: 'unavailable'; message: string };

const suggestionCache = new Map<
  string,
  { expiresAt: number; suggestions: AddressSuggestion[]; bias: AddressBias }
>();
const SUGGESTION_CACHE_TTL_MS = 5 * 60 * 1000;
const SUGGESTION_CACHE_MAX_ITEMS = 200;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizePart(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeZipCode(value?: string | null) {
  const digits = value?.replace(/\D/g, '') ?? '';

  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  return normalizePart(value);
}

function normalizeState(value?: string | null) {
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

function looksLikeStreet(value?: string | null) {
  const normalized = normalizePart(value);

  if (!normalized) {
    return false;
  }

  return /^(rua|r\.|avenida|av\.|av |travessa|tv\.|alameda|rodovia|estrada|praca|praça|largo|via|viela|servid[aã]o|passagem|acesso)/i.test(
    normalized,
  );
}

function looksLikeAddressNumber(value?: string | null) {
  const normalized = normalizePart(value);

  if (!normalized) {
    return false;
  }

  return /^\d+[A-Za-z0-9/-]*$/.test(normalized);
}

function splitDisplayName(displayName?: string) {
  return (displayName ?? '')
    .split(',')
    .map((segment) => normalizePart(segment))
    .filter((segment): segment is string => Boolean(segment));
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
    (looksLikeAddressNumber(nextSegment) ? normalizePart(nextSegment) : null);

  return {
    address,
    addressNumber,
  };
}

function buildSuggestionLabel(item: Omit<AddressSuggestion, 'label'>) {
  const primary = buildFreeformQuery([item.address, item.addressNumber]);
  const secondary = buildFreeformQuery([item.neighborhood, item.city, item.state]);

  if (primary && secondary) {
    return `${primary} - ${secondary}`;
  }

  return primary || secondary || item.displayName;
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

    return (
      (left.distanceKm ?? Number.POSITIVE_INFINITY) -
      (right.distanceKm ?? Number.POSITIVE_INFINITY)
    );
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringValue(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function getNumberValue(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getMapboxContextEntry(context: unknown, key: string) {
  if (!isRecord(context)) {
    return null;
  }

  const candidate = context[key];
  return isRecord(candidate) ? candidate : null;
}

function getMapboxCoordinates(feature: JsonRecord) {
  const geometry = isRecord(feature.geometry) ? feature.geometry : null;
  const geometryCoordinates = Array.isArray(geometry?.coordinates) ? geometry?.coordinates : null;
  const properties = isRecord(feature.properties) ? feature.properties : null;
  const coordinateRecord = isRecord(properties?.coordinates) ? properties?.coordinates : null;

  const longitude =
    getNumberValue(coordinateRecord ?? {}, 'longitude') ??
    (typeof geometryCoordinates?.[0] === 'number' ? geometryCoordinates[0] : null);
  const latitude =
    getNumberValue(coordinateRecord ?? {}, 'latitude') ??
    (typeof geometryCoordinates?.[1] === 'number' ? geometryCoordinates[1] : null);

  if (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  ) {
    return { latitude, longitude };
  }

  return null;
}

function getMapboxDisplayName(feature: JsonRecord) {
  const properties = isRecord(feature.properties) ? feature.properties : null;
  const fullAddress = properties ? getStringValue(properties, 'full_address') : null;
  const name = properties ? getStringValue(properties, 'name') : null;
  const placeFormatted = properties ? getStringValue(properties, 'place_formatted') : null;

  if (fullAddress) {
    return fullAddress;
  }

  if (name && placeFormatted) {
    return `${name}, ${placeFormatted}`;
  }

  return name ?? placeFormatted ?? '';
}

function mapMapboxFeatureToSuggestion(
  feature: unknown,
  bias: AddressBias,
): AddressSuggestion | null {
  if (!isRecord(feature)) {
    return null;
  }

  const coordinates = getMapboxCoordinates(feature);
  if (!coordinates) {
    return null;
  }

  const properties = isRecord(feature.properties) ? feature.properties : {};
  const context = getMapboxContextEntry(properties, 'context') ?? properties.context;
  const featureType = getStringValue(properties, 'feature_type');
  const addressContext = getMapboxContextEntry(context, 'address');
  const streetContext = getMapboxContextEntry(context, 'street');
  const neighborhoodContext = getMapboxContextEntry(context, 'neighborhood');
  const localityContext = getMapboxContextEntry(context, 'locality');
  const placeContext = getMapboxContextEntry(context, 'place');
  const districtContext = getMapboxContextEntry(context, 'district');
  const regionContext = getMapboxContextEntry(context, 'region');
  const postcodeContext = getMapboxContextEntry(context, 'postcode');
  const displayName = getMapboxDisplayName(feature);
  const displayNameAddress = extractDisplayNameAddress(displayName);

  const address =
    normalizePart(getStringValue(addressContext ?? {}, 'street_name')) ??
    normalizePart(getStringValue(streetContext ?? {}, 'name')) ??
    (featureType === 'street' ? normalizePart(getStringValue(properties, 'name')) : null) ??
    displayNameAddress.address;
  const addressNumber =
    normalizePart(getStringValue(addressContext ?? {}, 'address_number')) ??
    displayNameAddress.addressNumber;
  const neighborhood =
    normalizePart(getStringValue(neighborhoodContext ?? {}, 'name')) ??
    normalizePart(getStringValue(localityContext ?? {}, 'name'));
  const city =
    normalizePart(getStringValue(placeContext ?? {}, 'name')) ??
    normalizePart(getStringValue(localityContext ?? {}, 'name')) ??
    normalizePart(getStringValue(districtContext ?? {}, 'name'));
  const state =
    normalizeState(getStringValue(regionContext ?? {}, 'region_code')) ??
    normalizeState(getStringValue(regionContext ?? {}, 'name'));
  const zipCode = normalizeZipCode(getStringValue(postcodeContext ?? {}, 'name'));

  const suggestionBase = {
    id:
      getStringValue(properties, 'mapbox_id') ??
      getStringValue(feature, 'id') ??
      `${coordinates.latitude}:${coordinates.longitude}:${displayName}`,
    displayName,
    address,
    addressNumber,
    addressComplement: null,
    neighborhood,
    city,
    state,
    zipCode,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    distanceKm: Math.round(getDistanceKm(bias, coordinates) * 10) / 10,
  };

  return {
    ...suggestionBase,
    label: buildSuggestionLabel(suggestionBase),
  };
}

function getStreetCandidate(address?: NominatimItem['address']) {
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

function getNeighborhoodCandidate(address?: NominatimItem['address']) {
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

function getCityCandidate(address?: NominatimItem['address']) {
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

function mapNominatimItemToSuggestion(
  item: NominatimItem,
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
    distanceKm: Math.round(getDistanceKm(bias, { latitude, longitude }) * 10) / 10,
  };

  return {
    ...suggestionBase,
    label: buildSuggestionLabel(suggestionBase),
  };
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

function resolvePreferredCountry() {
  const country = (process.env.GEOCODING_COUNTRY_CODES ?? 'br')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)[0];

  return (country ?? 'br').toLowerCase();
}

function resolveLanguage() {
  return process.env.GEOCODING_ACCEPT_LANGUAGE ?? 'pt-BR';
}

function getTimeoutMs() {
  return Number(process.env.GEOCODING_TIMEOUT_MS) || 5000;
}

function buildNominatimSearchUrl() {
  return new URL(
    process.env.GEOCODING_BASE_URL ?? 'https://nominatim.openstreetmap.org/search',
  );
}

function buildNominatimReverseUrl() {
  const explicit = process.env.GEOCODING_REVERSE_BASE_URL;

  if (explicit) {
    return new URL(explicit);
  }

  const searchUrl = buildNominatimSearchUrl();
  const pathname = searchUrl.pathname.endsWith('/search')
    ? searchUrl.pathname.replace(/\/search$/, '/reverse')
    : '/reverse';

  return new URL(`${searchUrl.origin}${pathname}`);
}

function applyCommonNominatimParams(
  params: URLSearchParams,
  options?: { limit?: number; includeLayer?: boolean },
) {
  params.set('format', 'jsonv2');
  params.set('addressdetails', '1');
  params.set('countrycodes', process.env.GEOCODING_COUNTRY_CODES ?? 'br');

  if (options?.limit) {
    params.set('limit', String(options.limit));
  }

  if (options?.includeLayer !== false) {
    params.set('layer', 'address');
  }

  const geocodingEmail = normalizePart(process.env.GEOCODING_EMAIL);
  if (geocodingEmail) {
    params.set('email', geocodingEmail);
  }

  return params;
}

async function fetchNominatimSearchPayload(
  params: URLSearchParams,
  options?: { limit?: number; includeLayer?: boolean },
): Promise<{ status: 'resolved'; payload: NominatimItem[]; query: string } | { status: 'unavailable'; message: string }> {
  const url = buildNominatimSearchUrl();
  url.search = applyCommonNominatimParams(new URLSearchParams(params), options).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          process.env.GEOCODING_USER_AGENT ??
          'VestGO/1.0 (+https://mosfet.com.br; contact: contato@mosfet.com.br)',
        'Accept-Language': resolveLanguage(),
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
      payload: nominatimSearchResponseSchema.parse(await response.json()),
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

async function fetchNominatimReversePayload(
  latitude: number,
  longitude: number,
): Promise<{ status: 'resolved'; payload: z.infer<typeof nominatimReverseResponseSchema>; query: string } | { status: 'unavailable'; message: string }> {
  const url = buildNominatimReverseUrl();
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    zoom: '18',
  });

  url.search = applyCommonNominatimParams(params, { includeLayer: false }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          process.env.GEOCODING_USER_AGENT ??
          'VestGO/1.0 (+https://mosfet.com.br; contact: contato@mosfet.com.br)',
        'Accept-Language': resolveLanguage(),
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
      payload: nominatimReverseResponseSchema.parse(await response.json()),
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

function parseMapboxFeatureCollection(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.features)) {
    throw new Error('invalid_mapbox_response');
  }

  return payload.features;
}

function getMapboxToken() {
  return normalizePart(process.env.MAPBOX_SECRET_TOKEN);
}

function buildMapboxForwardUrl(
  params: URLSearchParams,
  options?: {
    autocomplete?: boolean;
    limit?: number;
    permanent?: boolean;
    types?: string;
    proximity?: { latitude: number; longitude: number };
  },
) {
  const url = new URL(MAPBOX_FORWARD_URL);
  const nextParams = new URLSearchParams(params);

  nextParams.set('access_token', getMapboxToken() ?? '');
  nextParams.set('country', resolvePreferredCountry());
  nextParams.set('language', resolveLanguage());
  nextParams.set('format', 'geojson');
  nextParams.set('autocomplete', options?.autocomplete === false ? 'false' : 'true');
  nextParams.set('limit', String(Math.min(Math.max(options?.limit ?? 5, 1), 10)));

  if (options?.permanent) {
    nextParams.set('permanent', 'true');
  }

  if (options?.types) {
    nextParams.set('types', options.types);
  }

  if (options?.proximity) {
    nextParams.set(
      'proximity',
      `${options.proximity.longitude},${options.proximity.latitude}`,
    );
  }

  url.search = nextParams.toString();
  return url;
}

function buildMapboxReverseUrl(
  latitude: number,
  longitude: number,
  options?: { limit?: number; types?: string },
) {
  const url = new URL(MAPBOX_REVERSE_URL);
  url.searchParams.set('access_token', getMapboxToken() ?? '');
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('country', resolvePreferredCountry());
  url.searchParams.set('language', resolveLanguage());
  url.searchParams.set('format', 'geojson');
  url.searchParams.set('limit', String(Math.min(Math.max(options?.limit ?? 1, 1), 10)));

  if (options?.types) {
    url.searchParams.set('types', options.types);
  }

  return url;
}

async function fetchMapboxFeatures(
  url: URL,
): Promise<ForwardRequestResult> {
  const token = getMapboxToken();

  if (!token) {
    return {
      status: 'unavailable',
      message: 'MAPBOX_SECRET_TOKEN nao foi configurado para geocoding.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      return {
        status: 'unavailable',
        message: 'Mapbox rejeitou o token configurado para geocoding.',
      };
    }

    if (response.status === 429) {
      return {
        status: 'unavailable',
        message: 'Mapbox atingiu limite temporario de geocoding. Tente novamente em instantes.',
      };
    }

    if (!response.ok) {
      return {
        status: 'unavailable',
        message: 'Nao foi possivel consultar o geocoding do Mapbox no momento.',
      };
    }

    return {
      status: 'resolved',
      features: parseMapboxFeatureCollection(await response.json()),
      query: url.toString(),
    };
  } catch (error) {
    const isTimeoutError =
      error instanceof Error &&
      (error.name === 'AbortError' || /abort/i.test(error.message));

    if (error instanceof Error && error.message === 'invalid_mapbox_response') {
      return {
        status: 'unavailable',
        message: 'Mapbox respondeu em um formato invalido para geocoding.',
      };
    }

    return {
      status: 'unavailable',
      message: isTimeoutError
        ? 'A consulta ao Mapbox demorou demais para responder.'
        : 'Nao foi possivel consultar o geocoding do Mapbox no momento.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

type ResolvedProvider =
  | { name: 'mapbox' }
  | { name: 'nominatim' };

function resolveGeocodingProvider(): ResolvedProvider {
  const requestedProvider = normalizePart(process.env.GEOCODING_PROVIDER)?.toLowerCase();
  const hasMapboxToken = Boolean(getMapboxToken());

  if (requestedProvider === 'nominatim') {
    return { name: 'nominatim' };
  }

  if (requestedProvider === 'mapbox') {
    if (hasMapboxToken || process.env.NODE_ENV === 'production') {
      return { name: 'mapbox' };
    }

    return { name: 'nominatim' };
  }

  return hasMapboxToken ? { name: 'mapbox' } : { name: 'nominatim' };
}

export function hasGeocodingAddress(input: GeocodingInput) {
  return getMissingGeocodingFields(input).length === 0;
}

function buildMapboxGeocodingAttempts(input: GeocodingInput) {
  const street = normalizePart(input.address);
  const addressNumber = normalizePart(input.addressNumber);
  const neighborhood = normalizePart(input.neighborhood);
  const city = normalizePart(input.city);
  const state = normalizeState(input.state);
  const zipCode = normalizeZipCode(input.zipCode);
  const country = resolvePreferredCountry();
  const attempts: ForwardAttempt[] = [];

  if (street && city && state && zipCode) {
    attempts.push({
      label: 'structured_with_zip',
      params: new URLSearchParams({
        street,
        ...(addressNumber ? { address_number: addressNumber } : {}),
        place: city,
        region: state,
        postcode: zipCode,
        country,
      }),
    });
  }

  if (street && city && state) {
    attempts.push({
      label: 'structured_basic',
      params: new URLSearchParams({
        street,
        ...(addressNumber ? { address_number: addressNumber } : {}),
        place: city,
        region: state,
        country,
      }),
    });
  }

  const freeformComplete = buildFreeformQuery([
    street ? buildFreeformQuery([street, addressNumber]) : null,
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

  const freeformAddress = buildFreeformQuery([
    street ? buildFreeformQuery([street, addressNumber]) : null,
    city,
    state,
    'Brasil',
  ]);

  if (freeformAddress) {
    attempts.push({
      label: 'freeform_address_city_state',
      params: new URLSearchParams({ q: freeformAddress }),
    });
  }

  const freeformAddressZip = buildFreeformQuery([
    street ? buildFreeformQuery([street, addressNumber]) : null,
    zipCode,
    'Brasil',
  ]);

  if (street && zipCode && freeformAddressZip) {
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

function buildNominatimGeocodingAttempts(input: GeocodingInput) {
  const streetLine = getStreetLine(input);
  const neighborhood = normalizePart(input.neighborhood);
  const city = normalizePart(input.city);
  const state = normalizeState(input.state);
  const zipCode = normalizeZipCode(input.zipCode);

  const attempts: ForwardAttempt[] = [];

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

export async function geocodeAddress(input: GeocodingInput): Promise<GeocodingLookup> {
  const missingFields = getMissingGeocodingFields(input);

  if (missingFields.length > 0) {
    return {
      status: 'incomplete',
      missingFields,
    };
  }

  const provider = resolveGeocodingProvider();
  const attempts = provider.name === 'mapbox'
    ? buildMapboxGeocodingAttempts(input)
    : buildNominatimGeocodingAttempts(input);
  const attemptLabels: string[] = [];

  for (const attempt of attempts) {
    attemptLabels.push(attempt.label);

    if (provider.name === 'mapbox') {
      const usesStructuredInput = !attempt.params.has('q');
      const response = await fetchMapboxFeatures(
        buildMapboxForwardUrl(attempt.params, {
          autocomplete: false,
          limit: 1,
          permanent: true,
          types: 'address,street',
        }),
      );

      if (response.status === 'unavailable') {
        return {
          status: 'unavailable',
          message: response.message,
          attempts: attemptLabels,
        };
      }

      const feature = response.features[0];
      const bias = getResolvedBias(undefined, undefined);
      const mapped = mapMapboxFeatureToSuggestion(feature, bias);

      if (mapped) {
        return {
          status: 'resolved',
          result: {
            latitude: mapped.latitude,
            longitude: mapped.longitude,
            displayName: mapped.displayName || null,
            query: response.query,
          },
          attempts: attemptLabels,
        };
      }

      if (usesStructuredInput) {
        continue;
      }

      continue;
    }

    const response = await fetchNominatimSearchPayload(attempt.params);

    if (response.status === 'unavailable') {
      return {
        status: 'unavailable',
        message: response.message,
        attempts: attemptLabels,
      };
    }

    const firstMatch = response.payload[0];

    if (!firstMatch) {
      continue;
    }

    const latitude = Number.parseFloat(firstMatch.lat);
    const longitude = Number.parseFloat(firstMatch.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        status: 'unavailable',
        message: 'O servico de geolocalizacao retornou coordenadas invalidas.',
        attempts: attemptLabels,
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
      attempts: attemptLabels,
    };
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
  const provider = resolveGeocodingProvider();
  const cacheKey = `${provider.name}:${scope}:${query.toLowerCase()}:${bias.latitude.toFixed(3)}:${bias.longitude.toFixed(3)}:${limit}`;

  if (provider.name === 'nominatim') {
    const cached = getSuggestionCache(cacheKey);

    if (cached) {
      return {
        status: 'resolved',
        suggestions: cached.suggestions,
        bias: cached.bias,
      };
    }
  }

  if (provider.name === 'mapbox') {
    const response = await fetchMapboxFeatures(
      buildMapboxForwardUrl(new URLSearchParams({ q: query }), {
        autocomplete: true,
        limit: Math.max(limit * 2, 6),
        types: scope === 'profile' ? MAPBOX_PROFILE_TYPES : MAPBOX_PUBLIC_TYPES,
        proximity: bias.source === 'user' ? bias : undefined,
      }),
    );

    if (response.status === 'unavailable') {
      return {
        status: 'unavailable',
        message: response.message,
      };
    }

    const suggestions = sortSuggestions(
      response.features
        .map((feature) => mapMapboxFeatureToSuggestion(feature, bias))
        .filter((item): item is AddressSuggestion => Boolean(item)),
      query,
      scope,
    ).slice(0, limit);

    return {
      status: 'resolved',
      suggestions,
      bias,
    };
  }

  const response = await fetchNominatimSearchPayload(new URLSearchParams({ q: query }), {
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
      .map((item) => mapNominatimItemToSuggestion(item, bias))
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

export async function reverseGeocodeCoordinates(input: {
  latitude: number;
  longitude: number;
}): Promise<ReverseGeocodingLookup> {
  const provider = resolveGeocodingProvider();
  const bias = getResolvedBias(input.latitude, input.longitude);

  if (provider.name === 'mapbox') {
    const response = await fetchMapboxFeatures(
      buildMapboxReverseUrl(input.latitude, input.longitude, {
        limit: 1,
        types: MAPBOX_PUBLIC_TYPES,
      }),
    );

    if (response.status === 'unavailable') {
      return {
        status: 'unavailable',
        message: response.message,
      };
    }

    const firstMatch = response.features[0];
    const mapped = mapMapboxFeatureToSuggestion(firstMatch, bias);

    if (!mapped) {
      return { status: 'not_found' };
    }

    return {
      status: 'resolved',
      result: mapped,
    };
  }

  const response = await fetchNominatimReversePayload(input.latitude, input.longitude);

  if (response.status === 'unavailable') {
    return {
      status: 'unavailable',
      message: response.message,
    };
  }

  const mapped = mapNominatimItemToSuggestion(
    {
      lat: String(response.payload.lat),
      lon: String(response.payload.lon),
      display_name: response.payload.display_name,
      place_id: response.payload.place_id,
      address: response.payload.address,
    },
    bias,
  );

  if (!mapped) {
    return { status: 'not_found' };
  }

  return {
    status: 'resolved',
    result: mapped,
  };
}

export function formatAddressLine(input: {
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
}) {
  const address = normalizePart(input.address);
  const addressNumber = normalizePart(input.addressNumber);
  const addressComplement = normalizePart(input.addressComplement);

  const line = buildFreeformQuery([address, addressNumber]);

  if (!line) {
    return null;
  }

  return addressComplement ? `${line} - ${addressComplement}` : line;
}

export function getDefaultLocationBias() {
  return BRAZIL_DEFAULT_CENTER;
}
