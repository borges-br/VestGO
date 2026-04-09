// web/lib/api.ts
// Cliente HTTP tipado para o Fastify backend

function getApiUrl() {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL ?? publicUrl;
  }

  return publicUrl;
}

export type CollectionPoint = {
  id: string;
  name: string;
  organizationName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  avatarUrl: string | null;
  phone: string | null;
  acceptedCategories: string[];
  distanceKm?: number;
  totalDonations?: number;
};

export type NearbyResponse = {
  data: CollectionPoint[];
  meta: {
    count: number;
    nextCursor: string | null;
    radiusKm: number;
    center: { lat: number; lng: number };
  };
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Collection points ────────────────────────────────────────────────────────

export async function getNearbyPoints(params: {
  lat: number;
  lng: number;
  radius?: number;
  category?: string;
  limit?: number;
}): Promise<NearbyResponse> {
  const qs = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    ...(params.radius && { radius: String(params.radius) }),
    ...(params.category && { category: params.category }),
    ...(params.limit && { limit: String(params.limit) }),
  });

  return apiFetch<NearbyResponse>(`/collection-points?${qs}`);
}

export async function getCollectionPoint(id: string): Promise<CollectionPoint> {
  return apiFetch<CollectionPoint>(`/collection-points/${id}`);
}
