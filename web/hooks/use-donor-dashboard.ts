'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CollectionPoint,
  DonationListResponse,
  DonationRecord,
  NearbyResponse,
} from '@/lib/api';
import {
  DEFAULT_NEARBY_COORDS,
  buildDonorDashboardData,
} from '@/components/donor-dashboard/data';

type ResourceState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

type Coordinates = {
  lat: number;
  lng: number;
  label: string;
  source: 'browser' | 'fallback';
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : `Erro ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function useDonorCoordinates() {
  const [coordinates, setCoordinates] = useState<Coordinates>({
    ...DEFAULT_NEARBY_COORDS,
    source: 'fallback',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLoading(false);
      setError('Geolocalizacao do navegador indisponivel.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'sua localizacao',
          source: 'browser',
        });
        setError(null);
        setLoading(false);
      },
      () => {
        setCoordinates({
          ...DEFAULT_NEARBY_COORDS,
          source: 'fallback',
        });
        setError('Usando Sorocaba/SP como referencia enquanto a localizacao precisa nao esta disponivel.');
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 15,
        timeout: 5000,
      },
    );
  }, []);

  return { coordinates, loading, error };
}

export function useDonorDonations(accessToken?: string, limit = 20) {
  const [state, setState] = useState<ResourceState<DonationRecord[]>>({
    data: [],
    loading: Boolean(accessToken),
    error: null,
  });
  const [version, setVersion] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!accessToken) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((current) => ({ ...current, loading: true, error: null }));

    async function loadDonations() {
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        const response = await fetch(`/api/users/me/donations?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await readJson<DonationListResponse>(response);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setState({
          data: payload.data,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        setState({
          data: [],
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Nao foi possivel carregar suas doacoes.',
        });
      }
    }

    void loadDonations();

    return () => controller.abort();
  }, [accessToken, limit, version]);

  const refetch = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { ...state, refetch };
}

export function useNearbyCollectionPoints({
  lat,
  lng,
  limit = 3,
  radius = 15,
}: {
  lat: number;
  lng: number;
  limit?: number;
  radius?: number;
}) {
  const [state, setState] = useState<ResourceState<CollectionPoint[]>>({
    data: [],
    loading: true,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((current) => ({ ...current, loading: true, error: null }));

    async function loadPoints() {
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radius: String(radius),
          limit: String(limit),
          forDonation: 'true',
        });
        const response = await fetch(`/api/collection-points/nearby?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await readJson<NearbyResponse>(response);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setState({
          data: payload.data,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        setState({
          data: [],
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Nao foi possivel carregar pontos proximos.',
        });
      }
    }

    void loadPoints();

    return () => controller.abort();
  }, [lat, limit, lng, radius, version]);

  const refetch = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { ...state, refetch };
}

export function useDonorDashboardData({
  firstName,
  accessToken,
}: {
  firstName: string;
  accessToken?: string;
}) {
  const location = useDonorCoordinates();
  const donations = useDonorDonations(accessToken);
  const nearbyPoints = useNearbyCollectionPoints({
    lat: location.coordinates.lat,
    lng: location.coordinates.lng,
  });

  const data = useMemo(
    () =>
      buildDonorDashboardData({
        firstName,
        donations: donations.data,
        nearbyPoints: nearbyPoints.data,
      }),
    [donations.data, firstName, nearbyPoints.data],
  );

  return {
    data,
    loading: {
      donations: donations.loading,
      nearbyPoints: nearbyPoints.loading,
      location: location.loading,
    },
    errors: {
      donations: donations.error,
      nearbyPoints: nearbyPoints.error,
      location: location.error,
    },
    location: location.coordinates,
    refetch: {
      donations: donations.refetch,
      nearbyPoints: nearbyPoints.refetch,
    },
  };
}
