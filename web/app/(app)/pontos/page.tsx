'use client';
import { useState, useMemo } from 'react';
import {
  MapPin, Search, Clock, Star, Zap, CheckCircle,
  ChevronRight, Shirt, Footprints, Layers, Package,
  Trophy, TrendingUp, BadgeCheck,
} from 'lucide-react';
import Link from 'next/link';

type Category = 'Roupas' | 'Calçados' | 'Cobertores' | 'Acessórios' | 'Infantil';

interface CollectionPoint {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  distance: number; // km
  isOpen: boolean;
  closingTime: string;
  categories: Category[];
  totalCollections: number;
  impactKg: number;
  sponsored?: boolean;
  featured?: boolean;
  rating: number;
}

const CATEGORY_ICONS: Record<Category, typeof Shirt> = {
  Roupas: Shirt,
  Calçados: Footprints,
  Cobertores: Layers,
  Acessórios: Package,
  Infantil: Package,
};

// Mock baseado nos dados seed do backend (Milestone 2)
const COLLECTION_POINTS: CollectionPoint[] = [
  {
    id: '1',
    name: 'Hub Central Pinheiros',
    address: 'Rua dos Pinheiros, 1234',
    neighborhood: 'Pinheiros',
    distance: 1.2,
    isOpen: true,
    closingTime: '20:00',
    categories: ['Roupas', 'Calçados', 'Cobertores'],
    totalCollections: 847,
    impactKg: 2.340,
    sponsored: true,
    featured: true,
    rating: 4.9,
  },
  {
    id: '2',
    name: 'ONG Caminho da Luz',
    address: 'Av. Paulista, 900',
    neighborhood: 'Bela Vista',
    distance: 2.1,
    isOpen: true,
    closingTime: '18:00',
    categories: ['Roupas', 'Infantil'],
    totalCollections: 612,
    impactKg: 1.820,
    featured: true,
    rating: 4.8,
  },
  {
    id: '3',
    name: 'Centro de Coleta Sul',
    address: 'Rua Vergueiro, 3300',
    neighborhood: 'Vila Mariana',
    distance: 3.4,
    isOpen: false,
    closingTime: '17:00',
    categories: ['Roupas', 'Cobertores', 'Acessórios'],
    totalCollections: 430,
    impactKg: 1.120,
    rating: 4.6,
  },
  {
    id: '4',
    name: 'Instituto Veste Bem',
    address: 'Rua Lins de Vasconcelos, 220',
    neighborhood: 'Cambuci',
    distance: 4.8,
    isOpen: true,
    closingTime: '19:00',
    categories: ['Roupas', 'Calçados'],
    totalCollections: 285,
    impactKg: 780,
    sponsored: true,
    rating: 4.7,
  },
  {
    id: '5',
    name: 'Ação Social Leste',
    address: 'Rua do Tatuapé, 580',
    neighborhood: 'Tatuapé',
    distance: 6.2,
    isOpen: false,
    closingTime: '16:00',
    categories: ['Roupas', 'Infantil', 'Calçados'],
    totalCollections: 198,
    impactKg: 540,
    rating: 4.5,
  },
];

const FEATURED_POINTS = COLLECTION_POINTS.filter((p) => p.featured || p.sponsored)
  .sort((a, b) => b.totalCollections - a.totalCollections);

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function CategoryChip({ category }: { category: Category }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-surface px-2 py-1 rounded-lg">
      <Icon size={10} />
      {category}
    </span>
  );
}

function PointCard({ point }: { point: CollectionPoint }) {
  return (
    <Link
      href={`/mapa`}
      className="block bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-lg transition-all active:scale-[0.98]"
    >
      {/* Topo colorido */}
      <div className="h-2 bg-gradient-to-r from-primary to-primary-deeper" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-sm text-on-surface">{point.name}</p>
              {point.sponsored && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md">
                  Patrocinado
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{point.address} • {point.neighborhood}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              point.isOpen
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {point.isOpen ? 'Aberto' : 'Fechado'}
            </span>
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {point.distance} km
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            Fecha às {point.closingTime}
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <Star size={11} className="fill-amber-400" />
            {point.rating}
          </span>
        </div>

        {/* Categorias */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {point.categories.map((c) => (
            <CategoryChip key={c} category={c} />
          ))}
        </div>

        {/* Stats + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle size={11} className="text-primary" />
              {formatNumber(point.totalCollections)} coletas
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp size={11} className="text-primary" />
              {formatNumber(point.impactKg)}kg impacto
            </span>
          </div>
          <span className="text-[11px] font-semibold text-primary flex items-center gap-0.5">
            Ver no mapa <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedCard({ point, rank }: { point: CollectionPoint; rank: number }) {
  const rankColors = ['text-amber-500', 'text-gray-400', 'text-amber-700'];
  const rankBg = ['bg-amber-50', 'bg-gray-50', 'bg-amber-50/50'];

  return (
    <Link
      href={`/mapa`}
      className="block bg-white rounded-2xl shadow-card p-4 hover:shadow-card-lg transition-all active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        {/* Rank */}
        <div className={`w-9 h-9 ${rankBg[rank] ?? 'bg-gray-50'} rounded-xl flex items-center justify-center flex-shrink-0`}>
          {rank === 0 ? (
            <Trophy size={16} className={rankColors[rank]} />
          ) : (
            <span className={`text-sm font-bold ${rankColors[rank] ?? 'text-gray-400'}`}>#{rank + 1}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm text-on-surface truncate">{point.name}</p>
            {point.sponsored && (
              <BadgeCheck size={13} className="text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{point.neighborhood} • {point.distance} km</p>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>{formatNumber(point.totalCollections)} coletas</span>
                <span className="text-primary font-semibold">{formatNumber(point.impactKg)}kg</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-deeper rounded-full"
                  style={{
                    width: `${Math.min(100, (point.totalCollections / COLLECTION_POINTS[0].totalCollections) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
              point.isOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {point.isOpen ? 'Aberto' : 'Fechado'}
            </span>
          </div>
        </div>
      </div>

      {point.sponsored && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-primary bg-primary-light px-3 py-1.5 rounded-xl">
          <Zap size={10} />
          <span className="font-semibold">Ponto parceiro verificado — aceita doações prioritárias</span>
        </div>
      )}
    </Link>
  );
}

type Tab = 'todos' | 'destaque';

export default function PontosPage() {
  const [activeTab, setActiveTab] = useState<Tab>('todos');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return COLLECTION_POINTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q),
    );
  }, [search]);

  const nearest = COLLECTION_POINTS.reduce((a, b) => (a.distance < b.distance ? a : b));

  return (
    <div className="pb-2">
      {/* ── Header ── */}
      <section className="px-5 pt-6 pb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
          Explorar
        </p>
        <h1 className="text-3xl font-bold text-primary-deeper">Pontos de Coleta</h1>
        <p className="text-sm text-gray-400 mt-1">
          {COLLECTION_POINTS.length} pontos verificados próximos a você.
        </p>
      </section>

      {/* ── Tabs ── */}
      <section className="px-5 mb-4">
        <div className="flex bg-surface rounded-2xl p-1 gap-1">
          {([
            { key: 'todos', label: 'Todos os pontos' },
            { key: 'destaque', label: '⭐ Em destaque' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'todos' && (
        <>
          {/* ── Busca ── */}
          <section className="px-5 mb-5">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-primary transition-colors">
              <Search size={16} className="text-gray-300 flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nome ou bairro…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm outline-none placeholder:text-gray-300 bg-transparent"
              />
            </div>
          </section>

          {/* ── Ponto mais próximo ── */}
          {!search && (
            <section className="px-5 mb-5">
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
                Mais próximo de você
              </p>
              <div className="bg-primary-deeper rounded-3xl p-5 text-white relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -right-2 bottom-0 w-20 h-20 bg-white/5 rounded-full" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className="text-primary-muted" />
                    <p className="text-xs text-primary-muted font-semibold">{nearest.distance} km de distância</p>
                  </div>
                  <p className="text-xl font-bold mb-0.5">{nearest.name}</p>
                  <p className="text-xs text-primary-muted mb-4">{nearest.address}</p>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/mapa"
                      className="flex items-center gap-2 bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-primary-dark transition-colors active:scale-95"
                    >
                      <MapPin size={12} />
                      Ver no mapa
                    </Link>
                    <Link
                      href="/doar"
                      className="flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-white/20 transition-colors"
                    >
                      Iniciar doação
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Lista ── */}
          <section className="px-5">
            <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">
              {search ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}` : 'Todos os pontos'}
            </p>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <Search size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-400">Nenhum ponto encontrado</p>
                <p className="text-xs text-gray-300 mt-1">Tente outro nome ou bairro</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => (
                  <PointCard key={p.id} point={p} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'destaque' && (
        <section className="px-5">
          {/* Intro destaque */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4 mb-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={16} className="text-amber-500" />
              <p className="text-sm font-bold text-amber-700">Pontos com maior impacto</p>
            </div>
            <p className="text-xs text-amber-600/80 leading-relaxed">
              Ranking baseado em número de coletas realizadas e kg de roupas doadas. Pontos patrocinados são parceiros verificados pelo VestGO.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURED_POINTS.map((p, i) => (
              <FeaturedCard key={p.id} point={p} rank={i} />
            ))}
          </div>

          {/* Patrocinados info */}
          <div className="mt-5 flex items-center gap-2 text-[11px] text-gray-400">
            <BadgeCheck size={14} className="text-primary" />
            <span>Pontos patrocinados passam por verificação rigorosa de impacto.</span>
          </div>
        </section>
      )}
    </div>
  );
}
