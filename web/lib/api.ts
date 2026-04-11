function getApiUrl() {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL ?? publicUrl;
  }

  return '/api/backend';
}

export type CollectionPoint = {
  id: string;
  role: string;
  name: string;
  organizationName: string | null;
  address: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  neighborhood: string | null;
  zipCode?: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  avatarUrl: string | null;
  coverImageUrl?: string | null;
  phone: string | null;
  description?: string | null;
  purpose?: string | null;
  openingHours?: string | null;
  publicNotes?: string | null;
  accessibilityDetails?: string | null;
  estimatedCapacity?: string | null;
  serviceRegions?: string[];
  rules?: string[];
  nonAcceptedItems?: string[];
  publicProfileState?: PublicProfileState;
  verifiedAt?: string | null;
  acceptedCategories: string[];
  distanceKm?: number;
  totalDonations?: number;
  activePartnerships?: number;
  donationEligibility?: {
    canDonateHere: boolean;
    status: 'ELIGIBLE' | 'WAITING_NGO';
    label: string;
    message: string;
    activeNgo: DonationPoint | null;
  } | null;
  createdAt?: string;
};

export type NearbyResponse = {
  data: CollectionPoint[];
  meta: {
    count: number;
    nextCursor: string | null;
    radiusKm: number;
    center: { lat: number; lng: number } | null;
    search: string | null;
  };
};

export type DonationStatus =
  | 'PENDING'
  | 'AT_POINT'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'DISTRIBUTED'
  | 'CANCELLED';

export type PublicProfileState = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'VERIFIED';
export type PartnershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export type DonationPoint = {
  id: string;
  name: string;
  organizationName: string | null;
  address: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
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
  status: PartnershipStatus;
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

export type PartnershipRecord = {
  id: string;
  status: PartnershipStatus;
  isActive: boolean;
  priority: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  collectionPoint: DonationPoint & { publicProfileState?: PublicProfileState };
  ngo: DonationPoint & { publicProfileState?: PublicProfileState };
};

export type PartnershipListResponse = {
  data: PartnershipRecord[];
  meta: {
    count: number;
    statusCounts: Record<PartnershipStatus, number>;
  };
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

export type MyProfile = {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  organizationName: string | null;
  description: string | null;
  purpose: string | null;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  zipCode: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  publicNotes: string | null;
  operationalNotes: string | null;
  accessibilityDetails: string | null;
  verificationNotes: string | null;
  estimatedCapacity: string | null;
  serviceRegions: string[];
  rules: string[];
  nonAcceptedItems: string[];
  acceptedCategories: string[];
  publicProfileState: PublicProfileState;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profileCompletion: {
    completedItems: number;
    totalItems: number;
    missingFields: string[];
  };
  stats: {
    handledDonations: number;
    activePartnerships: number;
  };
};

export type UpdateMyProfileInput = {
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  organizationName?: string;
  description?: string;
  purpose?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  openingHours?: string;
  publicNotes?: string;
  operationalNotes?: string;
  accessibilityDetails?: string;
  estimatedCapacity?: string;
  acceptedCategories?: string[];
  nonAcceptedItems?: string[];
  rules?: string[];
  serviceRegions?: string[];
};

export type UpdateDonationStatusInput = {
  status: DonationStatus;
  description?: string;
  location?: string;
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

export type AddressSuggestionsResponse = {
  data: AddressSuggestion[];
  meta: {
    count: number;
    bias: {
      latitude: number;
      longitude: number;
      source: 'user' | 'fallback';
      label: string;
    } | null;
  };
};

export type NotificationType =
  | 'DONATION_STATUS'
  | 'DONATION_POINTS'
  | 'BADGE_EARNED'
  | 'DONATION_CREATED_FOR_POINT'
  | 'PARTNERSHIP_REQUEST_RECEIVED'
  | 'PARTNERSHIP_STATUS_CHANGED';

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  payload: Record<string, unknown> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  data: NotificationRecord[];
  meta: {
    count: number;
    unreadCount: number;
  };
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
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  role?: 'COLLECTION_POINT' | 'NGO';
  limit?: number;
  search?: string;
  forDonation?: boolean;
}): Promise<NearbyResponse> {
  const qs = new URLSearchParams();

  if (typeof params.lat === 'number') {
    qs.set('lat', String(params.lat));
  }

  if (typeof params.lng === 'number') {
    qs.set('lng', String(params.lng));
  }

  if (params.radius) {
    qs.set('radius', String(params.radius));
  }

  if (params.category) {
    qs.set('category', params.category);
  }

  if (params.role) {
    qs.set('role', params.role);
  }

  if (params.limit) {
    qs.set('limit', String(params.limit));
  }

  if (params.search) {
    qs.set('search', params.search);
  }

  if (params.forDonation) {
    qs.set('forDonation', 'true');
  }

  return apiFetch<NearbyResponse>(`/collection-points?${qs}`);
}

export async function searchAddressSuggestions(
  params: {
    query: string;
    lat?: number;
    lng?: number;
    limit?: number;
    scope?: 'profile' | 'public';
  },
  options?: { signal?: AbortSignal },
): Promise<AddressSuggestionsResponse> {
  const qs = new URLSearchParams();

  qs.set('q', params.query);

  if (typeof params.lat === 'number') {
    qs.set('lat', String(params.lat));
  }

  if (typeof params.lng === 'number') {
    qs.set('lng', String(params.lng));
  }

  if (params.limit) {
    qs.set('limit', String(params.limit));
  }

  if (params.scope) {
    qs.set('scope', params.scope);
  }

  return apiFetch<AddressSuggestionsResponse>(`/addresses/suggestions?${qs.toString()}`, {
    signal: options?.signal,
  });
}

export async function getCollectionPoint(
  id: string,
  options?: { forDonation?: boolean },
): Promise<CollectionPoint> {
  const qs = new URLSearchParams();

  if (options?.forDonation) {
    qs.set('forDonation', 'true');
  }

  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<CollectionPoint>(`/collection-points/${id}${suffix}`);
}

export async function getMyProfile(accessToken: string): Promise<MyProfile> {
  return apiFetch<MyProfile>('/profiles/me', { accessToken });
}

export async function updateMyProfile(
  input: UpdateMyProfileInput,
  accessToken: string,
): Promise<MyProfile> {
  return apiFetch<MyProfile>('/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
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

export async function getMyPartnerships(
  accessToken: string,
  params?: { status?: PartnershipStatus },
): Promise<PartnershipListResponse> {
  const qs = new URLSearchParams({
    ...(params?.status ? { status: params.status } : {}),
  });

  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<PartnershipListResponse>(`/partnerships${suffix}`, {
    accessToken,
  });
}

export async function requestOperationalPartnership(
  input: { ngoId: string; notes?: string },
  accessToken: string,
): Promise<PartnershipRecord> {
  return apiFetch<PartnershipRecord>('/partnerships', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function updateOperationalPartnershipStatus(
  id: string,
  input: { status: Extract<PartnershipStatus, 'ACTIVE' | 'REJECTED'>; notes?: string },
  accessToken: string,
): Promise<PartnershipRecord> {
  return apiFetch<PartnershipRecord>(`/partnerships/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type AdminProfilesResponse = {
  data: MyProfile[];
  meta: { count: number; nextCursor: string | null };
};

export async function getAdminProfiles(
  accessToken: string,
  params?: { role?: string; status?: string; limit?: number; cursor?: string },
): Promise<AdminProfilesResponse> {
  const qs = new URLSearchParams({
    ...(params?.role ? { role: params.role } : {}),
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.limit ? { limit: String(params.limit) } : {}),
    ...(params?.cursor ? { cursor: params.cursor } : {}),
  });

  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<AdminProfilesResponse>(`/admin/profiles${suffix}`, { accessToken });
}

export async function updateAdminProfileStatus(
  id: string,
  status: PublicProfileState,
  accessToken: string,
): Promise<MyProfile> {
  return apiFetch<MyProfile>(`/admin/profiles/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export async function getNotifications(
  accessToken: string,
  params?: { limit?: number },
): Promise<NotificationsResponse> {
  const qs = new URLSearchParams({
    ...(params?.limit ? { limit: String(params.limit) } : {}),
  });

  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<NotificationsResponse>(`/notifications${suffix}`, {
    accessToken,
  });
}

export async function markNotificationAsRead(
  id: string,
  accessToken: string,
): Promise<NotificationRecord> {
  return apiFetch<NotificationRecord>(`/notifications/${id}/read`, {
    method: 'PATCH',
    accessToken,
  });
}

export async function markAllNotificationsAsRead(
  accessToken: string,
): Promise<{ updatedCount: number }> {
  return apiFetch<{ updatedCount: number }>('/notifications/read-all', {
    method: 'PATCH',
    accessToken,
  });
}
