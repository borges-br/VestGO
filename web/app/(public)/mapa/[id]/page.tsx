// web/app/(public)/mapa/[id]/page.tsx
import { getCollectionPoint } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, MapPin, Phone, Package, CheckCircle } from 'lucide-react';
import { notFound } from 'next/navigation';

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas e vestuário',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas e mochilas',
  OTHER: 'Outros itens',
};

const CATEGORY_ICONS: Record<string, string> = {
  CLOTHING: '👕',
  SHOES: '👟',
  ACCESSORIES: '🧣',
  BAGS: '👜',
  OTHER: '📦',
};

interface Props {
  params: { id: string };
}

export default async function CollectionPointDetailPage({ params }: Props) {
  let point;
  try {
    point = await getCollectionPoint(params.id);
  } catch {
    notFound();
  }

  const googleMapsUrl = point.latitude && point.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`
    : null;

  return (
    <div className="min-h-screen bg-surface font-sans">
      <div className="max-w-sm mx-auto">
        {/* ── Header ── */}
        <header className="flex items-center gap-3 px-5 py-4 bg-white border-b border-gray-100">
          <Link href="/" className="p-2 -ml-2 rounded-xl hover:bg-surface">
            <ArrowLeft size={20} className="text-on-surface" />
          </Link>
          <span className="text-base font-semibold text-on-surface truncate">
            {point.organizationName ?? point.name}
          </span>
        </header>

        {/* ── Mini mapa (placeholder estático) ── */}
        <div className="relative h-48 bg-gradient-to-br from-primary-light to-[#c8eae7] overflow-hidden">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23006a62' fill-opacity='0.4'%3E%3Cpath d='M0 0h40v1H0zm0 20h40v1H0zm20 0V0h1v40h-1z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-primary w-12 h-12 rounded-full flex items-center justify-center shadow-lg">
              <MapPin size={22} className="text-white" />
            </div>
          </div>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 bg-white text-primary text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm"
            >
              Abrir no Maps
            </a>
          )}
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* ── Nome e endereço ── */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h1 className="text-xl font-bold text-primary-deeper">
              {point.organizationName ?? point.name}
            </h1>
            {point.address && (
              <div className="flex items-start gap-2 mt-3">
                <MapPin size={15} className="text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 leading-snug">
                  {point.address}
                  {point.city && `, ${point.city}`}
                  {point.state && ` — ${point.state}`}
                </p>
              </div>
            )}
            {point.phone && (
              <div className="flex items-center gap-2 mt-2">
                <Phone size={15} className="text-primary flex-shrink-0" />
                <a href={`tel:${point.phone}`} className="text-sm text-primary font-medium">
                  {point.phone}
                </a>
              </div>
            )}
          </div>

          {/* ── O que aceitam ── */}
          {point.acceptedCategories?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Package size={16} className="text-primary" />
                <p className="text-sm font-semibold text-on-surface">O que aceitamos</p>
              </div>
              <div className="space-y-2">
                {point.acceptedCategories.map((cat) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-base">{CATEGORY_ICONS[cat] ?? '📦'}</span>
                    <span className="text-sm text-gray-600">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    <CheckCircle size={14} className="text-primary ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Dicas para doação ── */}
          <div className="bg-primary-deeper rounded-2xl p-5 text-white">
            <p className="font-semibold text-sm mb-3">Antes de ir</p>
            <ul className="space-y-2 text-xs text-primary-muted leading-relaxed">
              <li>• Lave as roupas antes de entregar</li>
              <li>• Confirme o horário de funcionamento por telefone</li>
              <li>• Embalagens plásticas são bem-vindas</li>
              <li>• Não doamos peças com mofo, rasgadas ou muito desgastadas</li>
            </ul>
          </div>

          {/* ── CTA ── */}
          <Link
            href="/login?callbackUrl=%2Fmapa"
            className="block w-full bg-primary text-white text-center font-semibold py-4 rounded-2xl hover:bg-primary-dark transition-colors active:scale-[0.97]"
          >
            Iniciar minha doação aqui
          </Link>

          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white border border-gray-200 text-on-surface text-center font-semibold py-4 rounded-2xl hover:bg-surface transition-colors"
            >
              Como chegar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
