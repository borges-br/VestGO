'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  Loader2,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  getCollectionPoint,
  getNearbyPoints,
  reverseGeocodeAddress,
  type CollectionPoint,
} from '@/lib/api';
import { useAddressSuggestions } from '@/hooks/use-address-suggestions';
import { formatAddressSummary } from '@/lib/address';

const CollectionMap = dynamic(
  () => import('@/components/map/collection-map').then((module) => module.CollectionMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-[1.75rem] bg-primary-light dark:bg-primary/20">
        <Loader2 className="animate-spin text-primary dark:text-primary-muted" size={28} />
      </div>
    ),
  },
);

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

const ROLE_LABELS: Record<string, string> = {
  COLLECTION_POINT: 'Ponto',
  NGO: 'ONG',
};

const DEFAULT_CENTER: [number, number] = [-23.50153, -47.45256];

function isDonationSelectablePoint(point: CollectionPoint | null | undefined) {
  return point?.role === 'COLLECTION_POINT' && point.donationEligibility?.canDonateHere === true;
}

function sortSelectionPoints(points: CollectionPoint[]) {
  return [...points].sort((left, right) => {
    const leftEligible = isDonationSelectablePoint(left) ? 1 : 0;
    const rightEligible = isDonationSelectablePoint(right) ? 1 : 0;

    if (leftEligible !== rightEligible) {
      return rightEligible - leftEligible;
    }

    return (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY);
  });
}

function mergeCollectionPoints(primary: CollectionPoint[], secondary: CollectionPoint[]) {
  const map = new Map<string, CollectionPoint>();

  [...primary, ...secondary].forEach((point) => {
    map.set(point.id, point);
  });

  return Array.from(map.values());
}

function buildReturnUrl(
  returnTo: string,
  selectedPointId: string,
  source: string,
  returnStep: string | null,
) {
  const nextUrl = new URL(returnTo, window.location.origin);
  nextUrl.searchParams.set('selectedPointId', selectedPointId);
  nextUrl.searchParams.set('selectionApplied', '1');
  nextUrl.searchParams.set('source', source || 'donation-flow');
  nextUrl.searchParams.set('step', source === 'point-profile' ? '0' : returnStep ?? '2');
  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

export function MapaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isLoggedIn = !!session;
  const currentRole = session?.user?.role ?? null;
  const isSelectionMode = searchParams.get('mode') === 'select-point';
  const returnTo = searchParams.get('returnTo') ?? '/doar';
  const selectionSource = searchParams.get('source') ?? 'donation-flow';
  const returnStep = searchParams.get('returnStep');
  const initialSelectedPointId = searchParams.get('selectedPointId');
  const canSeeNgoLocations =
    currentRole === 'NGO' || currentRole === 'COLLECTION_POINT' || currentRole === 'ADMIN';
  const viewerAccessToken = canSeeNgoLocations ? session?.user?.accessToken : undefined;

  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    initialSelectedPointId,
  );
  const [selectedPointPreview, setSelectedPointPreview] = useState<CollectionPoint | null>(null);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [loading, setLoading] = useState(false);
  const [located, setLocated] = useState(false);
  const [hasResolvedInitialCenter, setHasResolvedInitialCenter] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const autoLocateAttemptedRef = useRef(false);
  const locationRequestActiveRef = useRef(false);
  const lastFetchRequestIdRef = useRef(0);
  const selectedPointIdRef = useRef<string | null>(selectedPointId);
  const selectedPointPreviewRef = useRef<CollectionPoint | null>(selectedPointPreview);
  const searchBlurTimeoutRef = useRef<number | null>(null);
  const skipNextPartnerSearchSyncRef = useRef(false);
  const reverseGeocodeRequestIdRef = useRef(0);

  selectedPointIdRef.current = selectedPointId;
  selectedPointPreviewRef.current = selectedPointPreview;

  const normalizedSearchInput = useMemo(() => searchInput.trim(), [searchInput]);
  const selectedPoint = useMemo(() => {
    if (!selectedPointId) {
      return null;
    }

    return (
      points.find((point) => point.id === selectedPointId) ??
      (selectedPointPreview?.id === selectedPointId ? selectedPointPreview : null)
    );
  }, [points, selectedPointId, selectedPointPreview]);

  const {
    suggestions: addressSuggestions,
    loading: addressSuggestionsLoading,
    error: addressSuggestionsError,
    hasQuery: hasAddressSuggestionQuery,
    clearSuggestions,
  } = useAddressSuggestions({
    query: searchInput,
    lat: center[0],
    lng: center[1],
    scope: 'public',
    enabled: searchFocused,
    limit: 6,
  });

  const fetchPoints = useCallback(
    async (lat: number, lng: number, radius = 10, nextSearch?: string) => {
      const requestId = lastFetchRequestIdRef.current + 1;
      lastFetchRequestIdRef.current = requestId;
      setLoading(true);
      setError(null);

      try {
        const response = await getNearbyPoints({
          lat,
          lng,
          radius,
          limit: 30,
          search: nextSearch,
          forDonation: isSelectionMode,
          role: isSelectionMode || !canSeeNgoLocations ? 'COLLECTION_POINT' : undefined,
          accessToken: viewerAccessToken,
        });

        if (requestId !== lastFetchRequestIdRef.current) {
          return;
        }

        const availablePoints = isSelectionMode
          ? sortSelectionPoints(response.data.filter((point) => point.role === 'COLLECTION_POINT'))
          : response.data;

        setPoints((current) => {
          const activeSelectedId = selectedPointIdRef.current;
          const pinnedPoint =
            current.find((point) => point.id === activeSelectedId) ??
            selectedPointPreviewRef.current;

          if (
            activeSelectedId &&
            pinnedPoint &&
            !availablePoints.some((point) => point.id === activeSelectedId)
          ) {
            return mergeCollectionPoints(availablePoints, [pinnedPoint]);
          }

          return availablePoints;
        });

        if (availablePoints.length === 0) {
          setError(
            nextSearch
              ? 'Nenhum parceiro público corresponde a essa busca.'
              : isSelectionMode
                ? 'Nenhum ponto de coleta público foi encontrado nessa área.'
                : 'Nenhum parceiro público encontrado nessa área.',
          );
        }
      } catch {
        if (requestId === lastFetchRequestIdRef.current) {
          setError('Erro ao buscar pontos. Verifique sua conexão.');
        }
      } finally {
        if (requestId === lastFetchRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [canSeeNgoLocations, isSelectionMode, viewerAccessToken],
  );

  const refreshLocationNotice = useCallback(async (latitude: number, longitude: number) => {
    const requestId = reverseGeocodeRequestIdRef.current + 1;
    reverseGeocodeRequestIdRef.current = requestId;

    try {
      const response = await reverseGeocodeAddress({ latitude, longitude });

      if (requestId !== reverseGeocodeRequestIdRef.current || !response.data) {
        return;
      }

      const city = response.data.city;
      const state = response.data.state;
      const fallbackLabel = response.data.label;
      const locationLabel =
        city && state ? `${city} - ${state}` : city ?? state ?? fallbackLabel;

      if (locationLabel) {
        setLocationNotice(`Mostrando parceiros próximos de ${locationLabel}.`);
      }
    } catch {
      // The generic location notice is already enough when reverse geocoding fails.
    }
  }, []);

  const requestLocation = useCallback((source: 'auto' | 'manual') => {
    if (locationRequestActiveRef.current) {
      return;
    }

    if (!window.navigator.geolocation) {
      setHasResolvedInitialCenter(true);
      setLocationNotice(
        'Geolocalização indisponível neste navegador. Mostrando Sorocaba como área base.',
      );
      return;
    }

    locationRequestActiveRef.current = true;
    setIsLocating(true);

    window.navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCenter([coords.latitude, coords.longitude]);
        setLocated(true);
        setLocationNotice('Mostrando parceiros próximos da sua localização atual.');
        setHasResolvedInitialCenter(true);
        setIsLocating(false);
        locationRequestActiveRef.current = false;
        void refreshLocationNotice(coords.latitude, coords.longitude);
      },
      () => {
        setLocated(false);
        setHasResolvedInitialCenter(true);
        setIsLocating(false);
        setLocationNotice(
          source === 'auto'
            ? 'Não foi possível usar sua localização agora. Mostrando Sorocaba como área base para você explorar.'
            : 'Permissão de localização negada. Continue explorando pelo mapa ou pela busca.',
        );
        locationRequestActiveRef.current = false;
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  }, [refreshLocationNotice]);

  const handleLocate = useCallback(() => {
    requestLocation('manual');
  }, [requestLocation]);

  const handleSearchFocus = useCallback(() => {
    if (searchBlurTimeoutRef.current) {
      window.clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }

    setSearchFocused(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    searchBlurTimeoutRef.current = window.setTimeout(() => {
      setSearchFocused(false);
    }, 160);
  }, []);

  const handleSelectPoint = useCallback((point: CollectionPoint) => {
    if (isSelectionMode && !isDonationSelectablePoint(point)) {
      setLocationNotice(
        point.donationEligibility?.message ??
          'Este ponto ainda não pode finalizar doações no fluxo doador.',
      );
      return;
    }

    setSelectedPointId(point.id);
    setSelectedPointPreview(point);

    if (point.latitude == null || point.longitude == null) {
      return;
    }

    const nextLatitude = point.latitude;
    const nextLongitude = point.longitude;

    setCenter((current) => {
      if (current[0] === nextLatitude && current[1] === nextLongitude) {
        return current;
      }

      return [nextLatitude, nextLongitude];
    });
  }, [isSelectionMode]);

  const handleConfirmSelection = useCallback(() => {
    if (!selectedPointId || !isDonationSelectablePoint(selectedPoint)) return;
    router.push(buildReturnUrl(returnTo, selectedPointId, selectionSource, returnStep));
  }, [returnStep, returnTo, router, selectedPoint, selectedPointId, selectionSource]);

  const handleSelectAddressSuggestion = useCallback(
    (suggestion: {
      label: string;
      latitude: number;
      longitude: number;
      city: string | null;
      state: string | null;
    }) => {
      skipNextPartnerSearchSyncRef.current = true;
      setSearchInput(suggestion.label);
      setPartnerSearch('');
      setCenter([suggestion.latitude, suggestion.longitude]);
      setLocationNotice(
        `Mapa recentralizado para ${suggestion.city ?? suggestion.label}${
          suggestion.state ? ` - ${suggestion.state}` : ''
        }. A busca textual de parceiros continua disponível.`,
      );
      setSearchFocused(false);
      clearSuggestions();
    },
    [clearSuggestions],
  );

  useEffect(() => {
    if (!initialSelectedPointId) return;
    setSelectedPointId(initialSelectedPointId);
  }, [initialSelectedPointId]);

  useEffect(() => {
    if (autoLocateAttemptedRef.current) {
      return;
    }

    autoLocateAttemptedRef.current = true;
    requestLocation('auto');
  }, [requestLocation]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (skipNextPartnerSearchSyncRef.current) {
        skipNextPartnerSearchSyncRef.current = false;
        return;
      }

      setPartnerSearch(normalizedSearchInput);
    }, normalizedSearchInput ? 250 : 0);

    return () => window.clearTimeout(timeout);
  }, [normalizedSearchInput]);

  useEffect(() => {
    if (!hasResolvedInitialCenter) return;

    const timeout = window.setTimeout(() => {
      void fetchPoints(center[0], center[1], 10, partnerSearch || undefined);
    }, partnerSearch ? 300 : 0);

    return () => window.clearTimeout(timeout);
  }, [center, fetchPoints, hasResolvedInitialCenter, partnerSearch]);

  const hasSelectedPointLoaded = useMemo(
    () =>
      Boolean(
        selectedPointId &&
          (points.some((point) => point.id === selectedPointId) ||
            selectedPointPreview?.id === selectedPointId),
      ),
    [points, selectedPointId, selectedPointPreview],
  );

  useEffect(() => {
    if (!selectedPointId || hasSelectedPointLoaded) {
      return;
    }

    const pointIdToLoad = selectedPointId;
    let cancelled = false;

    async function loadSelectedPoint() {
      try {
        const point = await getCollectionPoint(pointIdToLoad, {
          forDonation: isSelectionMode,
          accessToken: viewerAccessToken,
        });

        if (cancelled) return;
        if (isSelectionMode && point.role !== 'COLLECTION_POINT') return;

        setSelectedPointPreview(point);

        if (isSelectionMode && !isDonationSelectablePoint(point)) {
          setSelectedPointId(null);
          setLocationNotice(
            point.donationEligibility?.message ??
              'O ponto anteriormente selecionado ainda não pode finalizar doações.',
          );
        }
      } catch {
        if (!cancelled) {
          setLocationNotice('O ponto anteriormente selecionado não está mais disponível nesta busca.');
        }
      }
    }

    void loadSelectedPoint();

    return () => {
      cancelled = true;
    };
  }, [hasSelectedPointLoaded, isSelectionMode, selectedPointId, viewerAccessToken]);

  useEffect(() => {
    if (!isSelectionMode || !selectedPointId) {
      return;
    }

    const point = points.find((item) => item.id === selectedPointId);

    if (!point || isDonationSelectablePoint(point)) {
      return;
    }

    setSelectedPointId(null);
    setLocationNotice(
      point.donationEligibility?.message ??
      'Este ponto ainda não pode finalizar doações no fluxo doador.',
    );
  }, [isSelectionMode, points, selectedPointId]);

  useEffect(
    () => () => {
      if (searchBlurTimeoutRef.current) {
        window.clearTimeout(searchBlurTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <div className={`vg-dark-fix isolate flex flex-col bg-surface font-sans dark:bg-surface-ink ${isLoggedIn ? 'min-h-full' : 'min-h-screen'}`}>
      {!isLoggedIn && (
        <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-4 dark:border-white/10 dark:bg-surface-inkSoft">
          <Link href="/" className="text-lg font-bold text-primary-deeper dark:text-primary-muted">
            VestGO
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-primary-light px-4 py-2 text-sm font-semibold text-primary dark:bg-primary/20 dark:text-primary-muted"
          >
            Entrar
          </Link>
        </header>
      )}

      <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${isLoggedIn ? '' : 'max-w-shell'}`}>
        <div className="relative z-10 flex-shrink-0 px-4 pb-4 pt-4 sm:px-5 lg:px-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <input
                type="text"
                placeholder="Buscar parceiros ou ir para um endereço..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-9 pr-4 text-sm shadow-sm outline-none transition-colors focus:border-primary dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100 dark:placeholder:text-gray-500 dark:shadow-none dark:focus:border-primary-muted"
              />

              {searchFocused && (hasAddressSuggestionQuery || addressSuggestionsLoading) && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white shadow-card-lg dark:border-white/10 dark:bg-surface-inkSoft dark:shadow-none">
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-white/10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Ir para um lugar
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Escolha uma sugestão para recentralizar o mapa sem substituir a busca textual de parceiros.
                    </p>
                  </div>

                  {addressSuggestionsLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      <Loader2 size={15} className="animate-spin text-primary dark:text-primary-muted" />
                      Buscando lugares e endereços...
                    </div>
                  )}

                  {!addressSuggestionsLoading && addressSuggestionsError && (
                    <div className="px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                      {addressSuggestionsError}
                    </div>
                  )}

                  {!addressSuggestionsLoading &&
                    !addressSuggestionsError &&
                    addressSuggestions.length > 0 && (
                      <div className="max-h-72 overflow-y-auto py-2">
                        {addressSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelectAddressSuggestion(suggestion)}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-surface dark:hover:bg-white/5"
                          >
                            <p className="text-sm font-semibold text-on-surface dark:text-gray-100">
                              {suggestion.label}
                            </p>
                            <p className="mt-1 text-xs leading-6 text-gray-400 dark:text-gray-500">
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
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        Nenhum lugar sugerido para esse termo. A busca de parceiros continua ativa normalmente.
                      </div>
                    )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLocate}
              title="Usar minha localização"
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm transition-colors ${
                located
                  ? 'bg-primary text-white'
                  : 'border border-gray-100 bg-white text-gray-500 dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-300 dark:shadow-none'
              }`}
            >
              {isLocating ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Digite para filtrar parceiros cadastrados. Se quiser recentralizar o mapa, escolha uma sugestão de endereço ou lugar.
          </p>

          {isSelectionMode && (
            <div className="mt-4 rounded-[1.75rem] bg-white p-4 shadow-card dark:bg-surface-inkSoft dark:shadow-none">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Selecionar ponto para doação
                  </p>
                  <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-gray-400">
                    Escolha um ponto de coleta para continuar seu registro de doação.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary-deeper dark:text-primary-muted">
                    {selectedPoint
                      ? `Ponto selecionado: ${selectedPoint.organizationName ?? selectedPoint.name}`
                      : 'Nenhum ponto confirmado ainda.'}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push(returnTo)}
                    className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-gray-300 dark:hover:border-primary-muted dark:hover:text-primary-muted"
                  >
                    Voltar para a doação
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSelection}
                    disabled={!isDonationSelectablePoint(selectedPoint)}
                    className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${
                      isDonationSelectablePoint(selectedPoint)
                        ? 'bg-primary-deeper text-white hover:bg-primary-dark'
                        : 'cursor-not-allowed bg-surface text-gray-300 dark:bg-surface-ink dark:text-gray-600'
                    }`}
                  >
                    Confirmar ponto e continuar
                  </button>
                </div>
              </div>
            </div>
          )}

          {locationNotice && (
            <div className="mt-4 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-400 dark:shadow-none">
              {locationNotice}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 sm:px-5 lg:px-6 lg:pb-6">
          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
            <section className="relative z-0 order-2 flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white p-3 shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:order-1 lg:h-full">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    Explorar pontos
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedPoint
                      ? `Selecionado: ${selectedPoint.organizationName ?? selectedPoint.name}`
                      : partnerSearch
                        ? `Resultados para "${partnerSearch}".`
                        : located
                          ? 'Veja pontos e parceiros próximos da sua localização.'
                          : 'Veja parceiros ativos, compare perfis e escolha onde doar.'}
                  </p>
                </div>
                <span className="rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-muted">
                  {points.length} resultados
                </span>
              </div>

              <div className="h-[19rem] min-h-[19rem] overflow-hidden rounded-[1.75rem] sm:h-[24rem] sm:min-h-[24rem] lg:min-h-0 lg:flex-1">
                {hasResolvedInitialCenter ? (
                  <CollectionMap
                    points={points}
                    center={center}
                    zoom={selectedPoint ? 14 : 13}
                    onPointClick={handleSelectPoint}
                    selectedId={selectedPointId}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[1.75rem] bg-primary-light/40 text-sm text-gray-500 dark:bg-primary/10 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <Loader2 size={18} className="animate-spin text-primary dark:text-primary-muted" />
                      Preparando mapa...
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="order-1 flex flex-col overflow-hidden rounded-3xl bg-white shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:order-2 lg:h-full lg:min-h-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-white/10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    {loading ? 'Buscando...' : isSelectionMode ? 'Pontos sugeridos' : 'Lista de parceiros'}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {isSelectionMode
                      ? 'Você poderá revisar o ponto escolhido antes de finalizar.'
                      : 'Perfis públicos de pontos de coleta e ONGs em operação.'}
                  </p>
                </div>
                {!isSelectionMode && (
                  <button type="button" className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <SlidersHorizontal size={13} />
                    Filtrar
                  </button>
                )}
              </div>

              <div className="px-4 pb-4 pt-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                {error && (
                  <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-400">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  {points.map((point) => {
                    const isSelected = selectedPointId === point.id;
                    const canSelect = !isSelectionMode || isDonationSelectablePoint(point);

                    return (
                      <button
                        key={point.id}
                        type="button"
                        onClick={() => handleSelectPoint(point)}
                        disabled={!canSelect}
                        className={`w-full rounded-2xl bg-white p-4 text-left transition-all active:scale-[0.98] dark:bg-surface-ink ${
                          isSelected
                            ? 'ring-2 ring-primary shadow-card-lg dark:shadow-none'
                            : canSelect
                              ? 'shadow-card hover:shadow-card-lg dark:shadow-none dark:hover:bg-surface-inkSoft'
                              : 'border border-amber-200 bg-amber-50/70 shadow-none dark:border-amber-800/40 dark:bg-amber-900/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light dark:bg-primary/20">
                            <MapPin size={16} className="text-primary dark:text-primary-muted" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-on-surface dark:text-gray-100">
                                  {point.organizationName ?? point.name}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                                  <span>{ROLE_LABELS[point.role] ?? 'Parceiro'}</span>
                                  {point.neighborhood && <span>{point.neighborhood}</span>}
                                  {point.city && <span>{point.city}</span>}
                                </div>
                                <p className="mt-2 line-clamp-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
                                  {point.description ??
                                    formatAddressSummary(point) ??
                                    'Perfil público em construção.'}
                                </p>
                                {point.donationEligibility && (
                                  <div
                                    className={`mt-3 rounded-2xl px-3 py-2 text-xs leading-6 ${
                                      point.donationEligibility.canDonateHere
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                                    }`}
                                  >
                                    <p className="font-semibold">{point.donationEligibility.label}</p>
                                    <p>{point.donationEligibility.message}</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                                {point.distanceKm != null && (
                                  <span className="text-xs font-semibold text-primary dark:text-primary-muted">
                                    {point.distanceKm}km
                                  </span>
                                )}
                                {isSelectionMode ? (
                                  <span
                                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                      isSelected
                                        ? 'bg-primary-deeper text-white'
                                        : canSelect
                                          ? 'bg-surface text-gray-400 dark:bg-surface-ink dark:text-gray-500'
                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                                    }`}
                                  >
                                    {isSelected
                                      ? 'Selecionado'
                                      : point.donationEligibility?.label ?? 'Selecionar'}
                                  </span>
                                ) : (
                                  <Link
                                    href={`/mapa/${point.id}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="mt-1"
                                  >
                                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                                  </Link>
                                )}
                              </div>
                            </div>

                            {point.acceptedCategories?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {point.acceptedCategories.slice(0, 3).map((category) => (
                                  <span
                                    key={category}
                                    className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-muted"
                                  >
                                    {CATEGORY_LABELS[category] ?? category}
                                  </span>
                                ))}
                                {point.acceptedCategories.length > 3 && (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    +{point.acceptedCategories.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {point.openingHours && point.role === 'COLLECTION_POINT' && (
                              <p className="mt-2 text-[11px] leading-5 text-gray-400 dark:text-gray-500">
                                {point.openingHours}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {!loading && points.length === 0 && !error && (
                    <div className="py-10 text-center">
                      <MapPin size={32} className="mx-auto mb-3 text-gray-200 dark:text-gray-600" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        {isSelectionMode
                          ? 'Use sua localização para ver pontos de coleta próximos.'
                          : 'Use sua localização para ver parceiros públicos próximos.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
