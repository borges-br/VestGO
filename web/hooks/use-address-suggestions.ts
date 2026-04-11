'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  searchAddressSuggestions,
  type AddressSuggestion,
} from '@/lib/api';

type UseAddressSuggestionsParams = {
  query: string;
  lat?: number;
  lng?: number;
  scope?: 'profile' | 'public';
  enabled?: boolean;
  minLength?: number;
  debounceMs?: number;
  limit?: number;
};

export function useAddressSuggestions({
  query,
  lat,
  lng,
  scope = 'profile',
  enabled = true,
  minLength = 3,
  debounceMs = 350,
  limit = 5,
}: UseAddressSuggestionsParams) {
  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || normalizedQuery.length < minLength) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await searchAddressSuggestions(
          {
            query: normalizedQuery,
            lat,
            lng,
            scope,
            limit,
          },
          { signal: controller.signal },
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        setSuggestions(response.data);
      } catch (requestError) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        setSuggestions([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Nao foi possivel carregar sugestoes de endereco agora.',
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [debounceMs, enabled, lat, limit, lng, minLength, normalizedQuery, scope]);

  return {
    suggestions,
    loading,
    error,
    hasQuery: normalizedQuery.length >= minLength,
    clearSuggestions: () => {
      requestIdRef.current += 1;
      setSuggestions([]);
      setLoading(false);
      setError(null);
    },
  };
}
