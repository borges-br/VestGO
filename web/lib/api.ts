function getApiUrl() {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL ?? publicUrl;
  }

  return '/api/backend';
}

export type CollectionPoint = {
  id: string;
  name: string;
  organizationName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  role: string;
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

export type DonationStatus =
  | 'PENDING'
  | 'AT_POINT'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'DISTRIBUTED'
  | 'CANCELLED';

export type DonationPoint = {
  id: string;
  name: string;
  organizationName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  role: string;
};

export type DonationItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  description: string | null;
  imageUrl: string | null;
  weightKg: number | null;
};

export type DonationEvent = {
  id: string;
  status: DonationStatus;
  description: string;
  createdBy: string | null;
  location: string | null;
  createdAt: string;
};

export type DonationPartnership = {
  id: string;
  isActive: boolean;
  priority: number;
  notes: string | null;
};

export type DonationRecord = {
  id: string;
  code: string;
  status: DonationStatus;
  notes: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  pointsAwarded: number;
  itemCount: number;
  itemLabel: string;
  canCancel: boolean;
  allowedNextStatuses: DonationStatus[];
  collectionPoint: DonationPoint | null;
  ngo: DonationPoint | null;
  partnership: DonationPartnership | null;
  dropOffPoint: DonationPoint | null;
  items: DonationItem[];
  latestEvent: DonationEvent | null;
  timeline: DonationEvent[];
};

export type DonationListResponse = {
  data: DonationRecord[];
  meta: {
    count: number;
  };
};

export type OperationalFilters = {
  status?: DonationStatus;
  collectionPointId?: string;
  ngoId?: string;
  actionableOnly?: boolean;
  limit?: number;
  sortBy?: 'updatedAt' | 'createdAt';
  direction?: 'asc' | 'desc';
};

export type OperationalDonationListResponse = {
  data: DonationRecord[];
  meta: {
    count: number;
    actionableCount: number;
    statusCounts: Partial<Record<DonationStatus, number>>;
    availableCollectionPoints: DonationPoint[];
    availableNgos: DonationPoint[];
    filters: {
      status: DonationStatus | null;
      collectionPointId: string | null;
      ngoId: string | null;
      actionableOnly: boolean;
      sortBy: 'updatedAt' | 'createdAt';
      direction: 'asc' | 'desc';
    };
  };
};

export type DonationTimelineResponse = {
  donationId: string;
  code: string;
  status: DonationStatus;
  pointsAwarded: number;
  data: DonationEvent[];
};

export type CreateDonationInput = {
  collectionPointId: string;
  notes?: string;
  scheduledAt?: string;
  items: {
    name: string;
    category: string;
    quantity: number;
    description?: string;
  }[];
};

export type UpdateDonationStatusInput = {
  status: DonationStatus;
  description?: string;
  location?: string;
};

type ApiFetchOptions = RequestInit & {
  accessToken?: string;
};

async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  if (init.accessToken) {
    headers.set('Authorization', `Bearer ${init.accessToken}`);
  }

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
    cache: init.cache ?? 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `API error ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

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

export async function createDonation(
  input: CreateDonationInput,
  accessToken: string,
): Promise<DonationRecord> {
  return apiFetch<DonationRecord>('/donations', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function getUserDonations(
  accessToken: string,
  params?: { limit?: number; status?: DonationStatus },
): Promise<DonationListResponse> {
  const qs = new URLSearchParams({
    ...(params?.limit ? { limit: String(params.limit) } : {}),
    ...(params?.status ? { status: params.status } : {}),
  });

  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<DonationListResponse>(`/donations${suffix}`, { accessToken });
}

export async function getOperationalDonations(
  accessToken: string,
  params?: OperationalFilters,
): Promise<OperationalDonationListResponse> {
  const qs = new URLSearchParams({
    ...(params?.limit ? { limit: String(params.limit) } : {}),
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.collectionPointId ? { collectionPointId: params.collectionPointId } : {}),
    ...(params?.ngoId ? { ngoId: params.ngoId } : {}),
    ...(params?.actionableOnly ? { actionableOnly: 'true' } : {}),
    ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
    ...(params?.direction ? { direction: params.direction } : {}),
  });

  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<OperationalDonationListResponse>(`/donations/operations${suffix}`, {
    accessToken,
  });
}

export async function getDonation(id: string, accessToken: string): Promise<DonationRecord> {
  return apiFetch<DonationRecord>(`/donations/${id}`, { accessToken });
}

export async function getDonationTimeline(
  id: string,
  accessToken: string,
): Promise<DonationTimelineResponse> {
  return apiFetch<DonationTimelineResponse>(`/donations/${id}/timeline`, { accessToken });
}

export async function updateDonationStatus(
  id: string,
  input: UpdateDonationStatusInput,
  accessToken: string,
): Promise<DonationRecord> {
  return apiFetch<DonationRecord>(`/donations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}
