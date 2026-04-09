'use client';
// web/components/map/mapa-page-content.tsx
// Componente compartilhado do mapa. Importado por (app)/mapa/page.tsx.
// Detecta sessão para mostrar/ocultar o header próprio (AppShell já tem TopBar).

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, Navigation, Search, SlidersHorizontal, ChevronRight, Loader2 } from 'lucide-react';
import { getNearbyPoints, type CollectionPoint } from '@/lib/api';
import { useSession } from 'next-auth/react';

const CollectionMap = dynamic(
  () => import('@/components/map/collection-map').then((m) => m.CollectionMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-primary-light rounded-2xl">
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
      const res = await getNearbyPoints({ lat, lng, radius, limit: 30 });
      setPoints(res.data);
      if (res.data.length === 0) {
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
        const pos: [number, number] = [coords.latitude, coords.longitude];
        setCenter(pos);
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
    <div className={`flex flex-col bg-surface font-sans overflow-hidden ${isLoggedIn ? 'h-[calc(100vh-7.5rem)]' : 'h-screen'}`}>
      {/* Header público — renderizado apenas quando não há AppShell (não logado) */}
      {!isLoggedIn && (
        <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <Link href="/" className="text-lg font-bold text-primary-deeper">VestGO</Link>
          <Link href="/login" className="text-sm font-semibold text-primary bg-primary-light px-4 py-2 rounded-xl">
            Entrar
          </Link>
        </header>
      )}

      <div className="flex flex-col flex-1 max-w-sm mx-auto w-full overflow-hidden">
        {/* Barra de busca */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cidade, bairro..."
                className="w-full bg-white rounded-xl pl-9 pr-4 py-3 text-sm border border-gray-100 shadow-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleLocate}
              title="Usar minha localização"
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-colors flex-shrink-0 ${
                located ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-100'
              }`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
            </button>
          </div>
        </div>

        {/* Mapa */}
        <div className="px-4 flex-shrink-0" style={{ height: '42vh' }}>
          <CollectionMap
            points={points}
            center={center}
            zoom={13}
            onPointClick={setSelected}
            selectedId={selected?.id}
          />
        </div>

        {/* Lista de pontos */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
              {loading ? 'Buscando...' : `${points.length} pontos encontrados`}
            </p>
            <button className="flex items-center gap-1 text-xs text-gray-500">
              <SlidersHorizontal size={13} />
              Filtrar
            </button>
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3 mb-3">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {points.map((point) => (
              <button
                key={point.id}
                onClick={() => setSelected(selected?.id === point.id ? null : point)}
                className={`w-full text-left bg-white rounded-2xl p-4 shadow-card transition-all active:scale-[0.98] ${
                  selected?.id === point.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-on-surface truncate">
                          {point.organizationName ?? point.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {point.address}{point.city ? ` • ${point.city}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        {point.distanceKm != null && (
                          <span className="text-xs font-semibold text-primary">{point.distanceKm}km</span>
                        )}
                        <Link
                          href={`/mapa/${point.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        >
                          <ChevronRight size={16} className="text-gray-300" />
                        </Link>
                      </div>
                    </div>
                    {point.acceptedCategories?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {point.acceptedCategories.slice(0, 3).map((cat) => (
                          <span key={cat} className="text-[10px] font-semibold bg-primary-light text-primary px-2 py-0.5 rounded-full">
                            {CATEGORY_LABELS[cat] ?? cat}
                          </span>
                        ))}
                        {point.acceptedCategories.length > 3 && (
                          <span className="text-[10px] text-gray-400">+{point.acceptedCategories.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {!loading && points.length === 0 && !error && (
              <div className="text-center py-10">
                <MapPin size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Use sua localização para ver pontos próximos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
