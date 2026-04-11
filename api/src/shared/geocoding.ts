import { z } from 'zod';

const geocodingItemSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string().optional(),
});

const geocodingResponseSchema = z.array(geocodingItemSchema);

type GeocodingInput = {
  address?: string;
  neighborhood?: string;
  zipCode?: string;
  city?: string;
  state?: string;
};

type GeocodingAttempt = {
  label: string;
  params: URLSearchParams;
};

export type GeocodingResult = {
  latitude: number;
  longitude: number;
  displayName: string | null;
  query: string;
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

function getMissingGeocodingFields(input: GeocodingInput) {
  const street = normalizePart(input.address);
  const city = normalizePart(input.city);
  const state = normalizeState(input.state);
  const zipCode = normalizeZipCode(input.zipCode);

  const missingFields: string[] = [];

  if (!street) {
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

export function hasGeocodingAddress(input: GeocodingInput) {
  return getMissingGeocodingFields(input).length === 0;
}

function buildGeocodingAttempts(input: GeocodingInput) {
  const street = normalizePart(input.address);
  const neighborhood = normalizePart(input.neighborhood);
  const city = normalizePart(input.city);
  const state = normalizeState(input.state);
  const zipCode = normalizeZipCode(input.zipCode);

  const attempts: GeocodingAttempt[] = [];

  if (street && city && state && zipCode) {
    attempts.push({
      label: 'structured_with_zip',
      params: new URLSearchParams({
        street,
        city,
        state,
        postalcode: zipCode,
      }),
    });
  }

  if (street && city && state) {
    attempts.push({
      label: 'structured_basic',
      params: new URLSearchParams({
        street,
        city,
        state,
      }),
    });
  }

  const freeformComplete = buildFreeformQuery([
    street,
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

  const freeformAddress = buildFreeformQuery([street, city, state, 'Brasil']);

  if (freeformAddress) {
    attempts.push({
      label: 'freeform_address_city_state',
      params: new URLSearchParams({ q: freeformAddress }),
    });
  }

  const freeformAddressZip = buildFreeformQuery([street, zipCode, 'Brasil']);

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

function applyCommonParams(params: URLSearchParams) {
  params.set('format', 'jsonv2');
  params.set('limit', '1');
  params.set('addressdetails', '1');
  params.set('countrycodes', process.env.GEOCODING_COUNTRY_CODES ?? 'br');
  params.set('layer', 'address');

  const geocodingEmail = normalizePart(process.env.GEOCODING_EMAIL);
  if (geocodingEmail) {
    params.set('email', geocodingEmail);
  }

  return params;
}

async function fetchGeocodingAttempt(
  attempt: GeocodingAttempt,
): Promise<
  | { status: 'resolved'; result: GeocodingResult }
  | { status: 'empty' }
  | { status: 'unavailable'; message: string }
> {
  const url = new URL(
    process.env.GEOCODING_BASE_URL ?? 'https://nominatim.openstreetmap.org/search',
  );
  const params = applyCommonParams(new URLSearchParams(attempt.params));
  url.search = params.toString();

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

    const payload = geocodingResponseSchema.parse(await response.json());
    const firstMatch = payload[0];

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
        query: url.toString(),
      },
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
