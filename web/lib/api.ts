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
  latitude: number | null;
  longitude: number | null;
  avatarUrl: string | null;
  coverImageUrl?: string | null;
  galleryImageUrls?: string[];
  phone: string | null;
  description?: string | null;
  purpose?: string | null;
  openingHours?: string | null;
  openingSchedule?: OpeningScheduleEntry[];
  openingHoursExceptions?: string | null;
  publicNotes?: string | null;
  accessibilityDetails?: string | null;
  accessibilityFeatures?: string[];
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

export type ItemCategory = 'CLOTHING' | 'SHOES' | 'ACCESSORIES' | 'BAGS' | 'OTHER';
export type OperationalBatchStatus =
  | 'OPEN'
  | 'READY_TO_SHIP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED';
export type PublicProfileState = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'VERIFIED';
export type PartnershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';
export type PickupRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PublicProfileRevisionStatus = 'PENDING' | 'REJECTED';
export type OpeningScheduleDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type OpeningScheduleEntry = {
  day: OpeningScheduleDay;
  isOpen: boolean;
  open?: string;
  close?: string;
};

export type PublicRevisionPayload = {
  phone?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  galleryImageUrls?: string[];
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  neighborhood?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: string | null;
  openingSchedule?: unknown;
  openingHoursExceptions?: string | null;
  publicNotes?: string | null;
  accessibilityDetails?: string | null;
  accessibilityFeatures?: string[];
  rules?: string[];
};

export type DonationPoint = {
  id: string;
  name: string;
  organizationName: string | null;
  role: string;
  avatarUrl?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  neighborhood?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  openingHours?: string | null;
  serviceRegions?: string[];
};

export type UploadedAsset = {
  key: string;
  url: string;
  contentType: string;
  size: number;
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

export type DonationBatchSummary = {
  id: string;
  code: string;
  name: string;
  status: OperationalBatchStatus;
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
  operationalBatch: DonationBatchSummary | null;
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

export type PickupRequestRecord = {
  id: string;
  status: PickupRequestStatus;
  requestedDate: string | null;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  notes: string | null;
  responseNotes: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  operationalPartnershipId: string;
  operationalPartnership: DonationPartnership;
  collectionPoint: DonationPoint & { publicProfileState?: PublicProfileState };
  ngo: DonationPoint & { publicProfileState?: PublicProfileState };
};

export type PickupRequestListResponse = {
  data: PickupRequestRecord[];
  meta: {
    count: number;
    statusCounts: Record<PickupRequestStatus, number>;
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

export type OperationalBatchItemRecord = {
  id: string;
  addedById: string;
  addedAt: string;
  donation: DonationRecord;
};

export type OperationalBatchRecord = {
  id: string;
  code: string;
  name: string;
  status: OperationalBatchStatus;
  primaryCategory: ItemCategory | null;
  notes: string | null;
  collectionPointId: string;
  ngoId: string;
  createdById: string;
  dispatchedById: string | null;
  deliveredById: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  collectionPoint: DonationPoint;
  ngo: DonationPoint;
  itemCount: number;
  donationCount: number;
  totalItemQuantity: number;
  allowedActions: {
    canAddItems: boolean;
    canRemoveItems: boolean;
    canMarkReady: boolean;
    canDispatch: boolean;
    canConfirmDelivery: boolean;
    canClose: boolean;
    canCancel: boolean;
  };
  operationSummary: {
    total: number;
    updated: number;
    skipped: number;
    skippedItems: Array<{
      donationId: string;
      donationCode: string;
      reason: string;
    }>;
  } | null;
  items: OperationalBatchItemRecord[];
};

export type OperationalBatchListResponse = {
  data: OperationalBatchRecord[];
  meta: {
    count: number;
    statusCounts: Record<OperationalBatchStatus, number>;
  };
};

export type CreateOperationalBatchInput = {
  name: string;
  ngoId: string;
  collectionPointId?: string;
  primaryCategory?: ItemCategory;
  notes?: string;
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
  emailVerifiedAt: string | null;
  emailNotificationsEnabled: boolean;
  birthDate: string | null;
  phone: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  galleryImageUrls: string[];
  publishedPublicProfile: {
    avatarUrl: string | null;
    coverImageUrl: string | null;
    galleryImageUrls: string[];
  };
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
  openingSchedule: OpeningScheduleEntry[];
  openingHoursExceptions: string | null;
  publicNotes: string | null;
  operationalNotes: string | null;
  accessibilityDetails: string | null;
  accessibilityFeatures: string[];
  verificationNotes: string | null;
  estimatedCapacity: string | null;
  serviceRegions: string[];
  rules: string[];
  nonAcceptedItems: string[];
  acceptedCategories: string[];
  donationInterestCategories: string[];
  publicProfileState: PublicProfileState;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  pendingPublicRevision: {
    status: PublicProfileRevisionStatus;
    fields: string[];
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    payload: PublicRevisionPayload | null;
  } | null;
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
  birthDate?: string;
  phone?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
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
  openingSchedule?: OpeningScheduleEntry[];
  openingHoursExceptions?: string;
  publicNotes?: string;
  operationalNotes?: string;
  accessibilityDetails?: string;
  accessibilityFeatures?: string[];
  estimatedCapacity?: string;
  acceptedCategories?: string[];
  donationInterestCategories?: string[];
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

export type ReverseGeocodingResponse = {
  data: AddressSuggestion | null;
};

export type NotificationType =
  | 'DONATION_STATUS'
  | 'DONATION_POINTS'
  | 'BADGE_EARNED'
  | 'DONATION_CREATED_FOR_POINT'
  | 'PARTNERSHIP_REQUEST_RECEIVED'
  | 'PARTNERSHIP_STATUS_CHANGED'
  | 'PICKUP_REQUEST_CREATED'
  | 'PICKUP_REQUEST_RECEIVED'
  | 'PICKUP_REQUEST_STATUS_CHANGED'
  | 'PROFILE_APPROVAL_REQUIRED'
  | 'PROFILE_REVISION_PENDING';

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

export type EmailVerificationResponse = {
  emailVerificationSent: boolean;
  alreadyVerified: boolean;
};

type ApiFetchOptions = RequestInit & {
  accessToken?: string;
};

const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type AuthApiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  phone: string | null;
  organizationName: string | null;
  publicProfileState: PublicProfileState;
  createdAt: string;
};

export type LoginApiSuccess = {
  user: AuthApiUser;
  accessToken: string;
  refreshToken: string;
};

export type LoginApiTwoFactor = {
  requiresTwoFactor: true;
  challengeId: string;
  expiresAt: string;
};

export type LoginApiResponse = LoginApiSuccess | LoginApiTwoFactor;

export type ActiveSession = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  deviceLabel: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type ActiveSessionsResponse = {
  data: ActiveSession[];
  meta: {
    currentSessionId: string | null;
    count: number;
  };
};

export type TwoFactorStatus = {
  enabled: boolean;
  enabledAt: string | null;
  remainingRecoveryCodes: number;
};

export type TwoFactorSetupResponse = {
  secret: string;
  otpauthUri: string;
  expiresInSeconds: number;
};

export type TwoFactorConfirmResponse = {
  enabled: boolean;
  recoveryCodes: string[];
};

async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const hasBody = init.body != null;

  if (hasBody) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  } else {
    headers.delete('Content-Type');
  }

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

function inferProfileImageContentType(file: File) {
  const declaredType = file.type.trim().toLowerCase();

  if (declaredType === 'image/jpg') {
    return 'image/jpeg';
  }

  if (SUPPORTED_PROFILE_IMAGE_TYPES.has(declaredType)) {
    return declaredType;
  }

  const filename = file.name.toLowerCase();

  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (filename.endsWith('.png')) {
    return 'image/png';
  }

  if (filename.endsWith('.webp')) {
    return 'image/webp';
  }

  return null;
}

function validateProfileImageFile(file: File) {
  if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    throw new Error('A imagem excede o limite de 5MB. Escolha um arquivo menor.');
  }

  const contentType = inferProfileImageContentType(file);

  if (!contentType) {
    throw new Error('Formato de imagem invalido. Use JPG, PNG ou WEBP.');
  }

  return contentType;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Nao foi possivel ler o arquivo selecionado.'));
    };

    reader.onerror = () => reject(new Error('Falha ao processar o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadProfileAsset(
  input: { file: File; target: 'avatar' | 'cover' | 'gallery' },
  accessToken: string,
): Promise<UploadedAsset> {
  const contentType = validateProfileImageFile(input.file);
  const dataBase64 = await readFileAsDataUrl(input.file);
  const response = await apiFetch<{ data: UploadedAsset }>('/uploads', {
    method: 'POST',
    body: JSON.stringify({
      filename: input.file.name,
      contentType,
      target: input.target,
      dataBase64,
    }),
    accessToken,
  });

  return response.data;
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
  accessToken?: string;
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

  return apiFetch<NearbyResponse>(`/collection-points?${qs}`, {
    accessToken: params.accessToken,
  });
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

export async function reverseGeocodeAddress(
  params: { latitude: number; longitude: number },
  options?: { signal?: AbortSignal },
): Promise<ReverseGeocodingResponse> {
  const qs = new URLSearchParams({
    lat: String(params.latitude),
    lng: String(params.longitude),
  });

  return apiFetch<ReverseGeocodingResponse>(`/addresses/reverse?${qs.toString()}`, {
    signal: options?.signal,
  });
}

export async function getCollectionPoint(
  id: string,
  options?: { forDonation?: boolean; accessToken?: string },
): Promise<CollectionPoint> {
  const qs = new URLSearchParams();

  if (options?.forDonation) {
    qs.set('forDonation', 'true');
  }

  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<CollectionPoint>(`/collection-points/${id}${suffix}`, {
    accessToken: options?.accessToken,
  });
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

export async function getOperationalDonationByCode(
  code: string,
  accessToken: string,
): Promise<DonationRecord> {
  return apiFetch<DonationRecord>(
    `/operational-donations/by-code/${encodeURIComponent(code.trim().toUpperCase())}`,
    { accessToken },
  );
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

export async function getPickupRequests(
  accessToken: string,
  params?: { status?: PickupRequestStatus },
): Promise<PickupRequestListResponse> {
  const qs = new URLSearchParams({
    ...(params?.status ? { status: params.status } : {}),
  });

  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<PickupRequestListResponse>(`/pickup-requests${suffix}`, {
    accessToken,
  });
}

export async function createPickupRequest(
  input: {
    operationalPartnershipId: string;
    requestedDate?: string;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    notes?: string;
  },
  accessToken: string,
): Promise<PickupRequestRecord> {
  return apiFetch<PickupRequestRecord>('/pickup-requests', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function updatePickupRequestStatus(
  id: string,
  input: { status: Extract<PickupRequestStatus, 'APPROVED' | 'REJECTED'>; responseNotes?: string },
  accessToken: string,
): Promise<PickupRequestRecord> {
  return apiFetch<PickupRequestRecord>(`/pickup-requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type AdminProfileRecord = {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  organizationName: string | null;
  description: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  galleryImageUrls: string[];
  city: string | null;
  state: string | null;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  zipCode: string | null;
  acceptedCategories: string[];
  publicProfileState: PublicProfileState;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  pendingPublicRevision: MyProfile['pendingPublicRevision'];
};

export type AdminProfilesResponse = {
  data: AdminProfileRecord[];
  meta: { count: number; nextCursor: string | null };
};

export async function getAdminProfiles(
  accessToken: string,
  params?: {
    role?: string;
    status?: string;
    revisionStatus?: PublicProfileRevisionStatus;
    limit?: number;
    cursor?: string;
  },
): Promise<AdminProfilesResponse> {
  const qs = new URLSearchParams({
    ...(params?.role ? { role: params.role } : {}),
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.revisionStatus ? { revisionStatus: params.revisionStatus } : {}),
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
): Promise<AdminProfileRecord> {
  return apiFetch<AdminProfileRecord>(`/admin/profiles/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export async function reviewAdminProfileRevision(
  id: string,
  input: { action: 'APPROVE' | 'REJECT'; reviewNotes?: string },
  accessToken: string,
): Promise<AdminProfileRecord> {
  return apiFetch<AdminProfileRecord>(`/admin/profiles/${id}/revision`, {
    method: 'PATCH',
    body: JSON.stringify(input),
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

export async function loginWithCredentials(input: {
  email: string;
  password: string;
}): Promise<LoginApiResponse> {
  return apiFetch<LoginApiResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function verifyTwoFactorLogin(input: {
  challengeId: string;
  code?: string;
  recoveryCode?: string;
}): Promise<LoginApiSuccess> {
  return apiFetch<LoginApiSuccess>('/auth/2fa/verify-login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getMyAuthIdentity(
  accessToken: string,
): Promise<{ user: AuthApiUser }> {
  return apiFetch<{ user: AuthApiUser }>('/auth/me', { accessToken });
}

export async function getActiveSessions(
  accessToken: string,
): Promise<ActiveSessionsResponse> {
  return apiFetch<ActiveSessionsResponse>('/auth/sessions', { accessToken });
}

export async function revokeSession(id: string, accessToken: string): Promise<void> {
  await apiFetch<void>(`/auth/sessions/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function revokeOtherSessions(
  accessToken: string,
): Promise<{ revokedCount: number }> {
  return apiFetch<{ revokedCount: number }>('/auth/sessions/revoke-others', {
    method: 'POST',
    accessToken,
  });
}

export async function getTwoFactorStatus(
  accessToken: string,
): Promise<TwoFactorStatus> {
  return apiFetch<TwoFactorStatus>('/auth/2fa/status', { accessToken });
}

export async function startTwoFactorSetup(
  accessToken: string,
): Promise<TwoFactorSetupResponse> {
  return apiFetch<TwoFactorSetupResponse>('/auth/2fa/setup', {
    method: 'POST',
    accessToken,
  });
}

export async function confirmTwoFactorSetup(
  input: { code: string },
  accessToken: string,
): Promise<TwoFactorConfirmResponse> {
  return apiFetch<TwoFactorConfirmResponse>('/auth/2fa/confirm', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function disableTwoFactor(
  input: { password: string; code?: string; recoveryCode?: string },
  accessToken: string,
): Promise<{ enabled: false }> {
  return apiFetch<{ enabled: false }>('/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function regenerateRecoveryCodes(
  input: { password: string; code?: string; recoveryCode?: string },
  accessToken: string,
): Promise<{ recoveryCodes: string[] }> {
  return apiFetch<{ recoveryCodes: string[] }>('/auth/2fa/recovery-codes/regenerate', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function changePassword(
  input: { currentPassword: string; newPassword: string },
  accessToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return apiFetch<{ accessToken: string; refreshToken: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function getOperationalBatches(
  accessToken: string,
  params?: { status?: OperationalBatchStatus; limit?: number },
): Promise<OperationalBatchListResponse> {
  const qs = new URLSearchParams({
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.limit ? { limit: String(params.limit) } : {}),
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<OperationalBatchListResponse>(`/operational-batches${suffix}`, { accessToken });
}

export async function getOperationalBatch(id: string, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>(`/operational-batches/${id}`, { accessToken });
}

export async function getOperationalBatchByCode(code: string, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>(
    `/operational-batches/by-code/${encodeURIComponent(code.trim().toUpperCase())}`,
    { accessToken },
  );
}

export async function createOperationalBatch(input: CreateOperationalBatchInput, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>('/operational-batches', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function addOperationalBatchItem(batchId: string, donationId: string, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>(`/operational-batches/${batchId}/items`, {
    method: 'POST',
    body: JSON.stringify({ donationId }),
    accessToken,
  });
}

export async function removeOperationalBatchItem(batchId: string, itemId: string, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>(`/operational-batches/${batchId}/items/${itemId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function markOperationalBatchReady(id: string, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>(`/operational-batches/${id}/mark-ready`, {
    method: 'POST',
    accessToken,
  });
}

export async function dispatchOperationalBatch(id: string, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>(`/operational-batches/${id}/dispatch`, {
    method: 'POST',
    accessToken,
  });
}

export async function confirmOperationalBatchDelivery(id: string, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>(`/operational-batches/${id}/confirm-delivery`, {
    method: 'POST',
    accessToken,
  });
}

export async function closeOperationalBatch(id: string, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>(`/operational-batches/${id}/close`, {
    method: 'POST',
    accessToken,
  });
}

export async function cancelOperationalBatch(id: string, accessToken: string): Promise<OperationalBatchRecord> {
  return apiFetch<OperationalBatchRecord>(`/operational-batches/${id}/cancel`, {
    method: 'POST',
    accessToken,
  });
}

export async function requestAccountDeletion(accessToken: string): Promise<{
  message: string;
  accountDeletionEmailSent: boolean;
  requiresSupport: boolean;
}> {
  return apiFetch<{
    message: string;
    accountDeletionEmailSent: boolean;
    requiresSupport: boolean;
  }>('/auth/request-account-deletion', {
    method: 'POST',
    accessToken,
  });
}

export async function confirmAccountDeletion(token: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/confirm-account-deletion', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function requestEmailVerification(
  accessToken: string,
): Promise<EmailVerificationResponse> {
  return apiFetch<EmailVerificationResponse>('/auth/request-email-verification', {
    method: 'POST',
    accessToken,
  });
}

export async function verifyEmail(token: string): Promise<{ user: { emailVerifiedAt: string | null } }> {
  return apiFetch<{ user: { emailVerifiedAt: string | null } }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
