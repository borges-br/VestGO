'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ChevronRight,
  Loader2,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { getNearbyPoints, type CollectionPoint } from '@/lib/api';
import { useSession } from 'next-auth/react';

const CollectionMap = dynamic(
  () => import('@/components/map/collection-map').then((module) => module.CollectionMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-primary-light">
        <Loader2 className="animate-spin text-primary" size={28} />
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

export function MapaPageContent() {
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [selected, setSelected] = useState<CollectionPoint | null>(null);
  const [center, setCenter] = useState<[number, number]>([-23.5505, -46.6333]);
  const [loading, setLoading] = useState(false);
  const [located, setLocated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoints = useCallback(async (lat: number, lng: number, radius = 10) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getNearbyPoints({ lat, lng, radius, limit: 30 });
      setPoints(response.data);

      if (response.data.length === 0) {
        setError('Nenhum ponto de coleta encontrado nessa área.');
      }
    } catch {
      setError('Erro ao buscar pontos. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não disponível neste navegador.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position: [number, number] = [coords.latitude, coords.longitude];
        setCenter(position);
        setLocated(true);
        fetchPoints(coords.latitude, coords.longitude);
      },
      () => {
        setLoading(false);
        setError('Permissão de localização negada. Tente buscar por CEP.');
      },
    );
  }, [fetchPoints]);

  useEffect(() => {
    fetchPoints(center[0], center[1]);
  }, []);

  return (
    <div className={`flex flex-col bg-surface font-sans ${isLoggedIn ? '' : 'min-h-screen'}`}>
      {!isLoggedIn && (
        <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <Link href="/" className="text-lg font-bold text-primary-deeper">
            VestGO
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-primary-light px-4 py-2 text-sm font-semibold text-primary"
          >
            Entrar
          </Link>
        </header>
      )}

      <div className={`mx-auto flex w-full flex-1 flex-col ${isLoggedIn ? '' : 'max-w-shell'}`}>
        <div className="flex-shrink-0 px-4 pb-3 pt-4 sm:px-5 lg:px-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar cidade, bairro..."
                className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-9 pr-4 text-sm shadow-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <button
              onClick={handleLocate}
              title="Usar minha localização"
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm transition-colors ${
                located
                  ? 'bg-primary text-white'
                  : 'border border-gray-100 bg-white text-gray-500'
              }`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-4 pb-4 sm:px-5 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)] lg:px-6">
          <section className="flex min-h-[18rem] flex-col overflow-hidden rounded-3xl bg-white p-3 shadow-card lg:min-h-[34rem]">
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Explorar pontos
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {selected
                    ? `Selecionado: ${selected.organizationName ?? selected.name}`
                    : 'Veja pontos próximos e selecione um parceiro no mapa.'}
                </p>
              </div>
              <span className="rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold text-primary">
                {points.length} resultados
              </span>
            </div>

            <div className="h-[40vh] min-h-[18rem] flex-1 lg:min-h-[30rem]">
              <CollectionMap
                points={points}
                center={center}
                zoom={13}
                onPointClick={setSelected}
                selectedId={selected?.id}
              />
            </div>
          </section>

          <section className="flex min-h-[18rem] flex-col overflow-hidden rounded-3xl bg-white shadow-card lg:min-h-[34rem]">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  {loading ? 'Buscando...' : 'Lista de pontos'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Área principal de descoberta do VestGO.
                </p>
              </div>
              <button className="flex items-center gap-1 text-xs text-gray-500">
                <SlidersHorizontal size={13} />
                Filtrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
              {error && (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {points.map((point) => (
                  <button
                    key={point.id}
                    onClick={() => setSelected(selected?.id === point.id ? null : point)}
                    className={`w-full rounded-2xl bg-white p-4 text-left transition-all active:scale-[0.98] ${
                      selected?.id === point.id
                        ? 'ring-2 ring-primary shadow-card-lg'
                        : 'shadow-card hover:shadow-card-lg'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light">
                        <MapPin size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-on-surface">
                              {point.organizationName ?? point.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-400">
                              {point.address}
                              {point.city ? ` • ${point.city}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 flex-col items-end">
                            {point.distanceKm != null && (
                              <span className="text-xs font-semibold text-primary">
                                {point.distanceKm}km
                              </span>
                            )}
                            <Link
                              href={`/mapa/${point.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="mt-1"
                            >
                              <ChevronRight size={16} className="text-gray-300" />
                            </Link>
                          </div>
                        </div>
                        {point.acceptedCategories?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {point.acceptedCategories.slice(0, 3).map((category) => (
                              <span
                                key={category}
                                className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary"
                              >
                                {CATEGORY_LABELS[category] ?? category}
                              </span>
                            ))}
                            {point.acceptedCategories.length > 3 && (
                              <span className="text-[10px] text-gray-400">
                                +{point.acceptedCategories.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {!loading && points.length === 0 && !error && (
                  <div className="py-10 text-center">
                    <MapPin size={32} className="mx-auto mb-3 text-gray-200" />
                    <p className="text-sm text-gray-400">
                      Use sua localização para ver pontos próximos
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
