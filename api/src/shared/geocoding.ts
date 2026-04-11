import { z } from 'zod';
import { AppError } from './errors';

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

export type GeocodingResult = {
  latitude: number;
  longitude: number;
  displayName: string | null;
  query: string;
};

function normalizePart(value?: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function hasGeocodingAddress(input: GeocodingInput) {
  return Boolean(normalizePart(input.address) && normalizePart(input.city) && normalizePart(input.state));
}

export function buildGeocodingQuery(input: GeocodingInput) {
  return [
    normalizePart(input.address),
    normalizePart(input.neighborhood),
    normalizePart(input.city),
    normalizePart(input.state),
    normalizePart(input.zipCode),
    'Brasil',
  ]
    .filter((value): value is string => Boolean(value))
    .join(', ');
}

export async function geocodeAddress(input: GeocodingInput): Promise<GeocodingResult | null> {
  if (!hasGeocodingAddress(input)) {
    return null;
  }

  const query = buildGeocodingQuery(input);
  const url = new URL(
    process.env.GEOCODING_BASE_URL ?? 'https://nominatim.openstreetmap.org/search',
  );

  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('q', query);
  url.searchParams.set('countrycodes', process.env.GEOCODING_COUNTRY_CODES ?? 'br');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.GEOCODING_TIMEOUT_MS) || 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          process.env.GEOCODING_USER_AGENT ??
          'VestGO/1.0 (operational-profile-geocoding)',
        'Accept-Language': process.env.GEOCODING_ACCEPT_LANGUAGE ?? 'pt-BR',
      },
    });

    if (!response.ok) {
      throw new AppError('Nao foi possivel consultar o servico de geolocalizacao.', 503, 'GEOCODING_UNAVAILABLE');
    }

    const payload = geocodingResponseSchema.parse(await response.json());
    const firstMatch = payload[0];

    if (!firstMatch) {
      return null;
    }

    return {
      latitude: Number.parseFloat(firstMatch.lat),
      longitude: Number.parseFloat(firstMatch.lon),
      displayName: firstMatch.display_name ?? null,
      query,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      throw new AppError('O servico de geolocalizacao respondeu em um formato invalido.', 503, 'GEOCODING_INVALID_RESPONSE');
    }

    throw new AppError('Nao foi possivel consultar o servico de geolocalizacao.', 503, 'GEOCODING_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
}
