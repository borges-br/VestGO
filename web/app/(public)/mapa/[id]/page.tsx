import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getCollectionPoint } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas e vestuario',
  SHOES: 'Calcados',
  ACCESSORIES: 'Acessorios',
  BAGS: 'Bolsas e mochilas',
  OTHER: 'Outros itens',
};

const PROFILE_STATE_LABELS = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  VERIFIED: 'Verificado',
} as const;

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

  const title = point.organizationName ?? point.name;
  const isNgo = point.role === 'NGO';
  const googleMapsUrl =
    point.latitude && point.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`
      : null;

  return (
    <div className="min-h-screen bg-surface font-sans">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-3">
          <Link
            href="/mapa"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-card transition-colors hover:text-primary"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              {isNgo ? 'ONG parceira' : 'Ponto de coleta'}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-primary-deeper sm:text-3xl">{title}</h1>
          </div>
        </div>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_360px]">
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-card">
            <div
              className="relative min-h-[18rem] overflow-hidden px-6 py-8 text-white"
              style={{
                background:
                  'linear-gradient(135deg, rgba(0,51,60,1) 0%, rgba(0,106,98,0.96) 55%, rgba(153,234,225,0.88) 100%)',
              }}
            >
              {point.coverImageUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-20"
                  style={{ backgroundImage: `url(${point.coverImageUrl})` }}
                />
              )}
              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                    <Sparkles size={14} />
                    {isNgo ? 'Rede social parceira' : 'Entrega presencial'}
                  </span>
                  <span className="rounded-full bg-white/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                    {PROFILE_STATE_LABELS[point.publicProfileState ?? 'ACTIVE']}
                  </span>
                </div>

                <h2 className="mt-6 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
                  {title}
                </h2>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-primary-muted sm:text-base">
                  {point.description ??
                    'Parceiro ativo do VestGO com operacao preparada para receber doacoes com organizacao e rastreio.'}
                </p>

                {point.purpose && (
                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
                    <p className="text-sm font-semibold text-white">Proposito</p>
                    <p className="mt-2 text-sm leading-7 text-primary-muted">{point.purpose}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-2 lg:p-6">
              <div className="rounded-[1.75rem] bg-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Localizacao e contato
                </p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="mt-1 text-primary" />
                    <span>
                      {point.address ?? 'Endereco nao informado'}
                      {point.neighborhood ? ` - ${point.neighborhood}` : ''}
                      {point.city ? ` - ${point.city}` : ''}
                      {point.state ? ` - ${point.state}` : ''}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone size={16} className="mt-1 text-primary" />
                    <span>{point.phone ?? 'Telefone nao informado'}</span>
                  </div>

                  {point.openingHours && (
                    <div className="flex items-start gap-3">
                      <Clock3 size={16} className="mt-1 text-primary" />
                      <span>{point.openingHours}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Operacao publica
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] bg-white px-4 py-4">
                    <p className="text-2xl font-bold text-primary-deeper">
                      {point.totalDonations ?? 0}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">Doacoes ligadas a este perfil</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-white px-4 py-4">
                    <p className="text-2xl font-bold text-primary-deeper">
                      {point.activePartnerships ?? 0}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">Parcerias operacionais ativas</p>
                  </div>
                </div>

                {point.accessibilityDetails && (
                  <div className="mt-4 rounded-[1.25rem] bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-primary-deeper">Acessibilidade</p>
                    <p className="mt-2 text-sm leading-7 text-gray-500">
                      {point.accessibilityDetails}
                    </p>
                  </div>
                )}

                {point.publicNotes && (
                  <div className="mt-4 rounded-[1.25rem] bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-primary-deeper">Observacoes</p>
                    <p className="mt-2 text-sm leading-7 text-gray-500">{point.publicNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] bg-white p-6 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Itens aceitos
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(point.acceptedCategories ?? []).map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {CATEGORY_LABELS[category] ?? category}
                  </span>
                ))}
              </div>

              {point.nonAcceptedItems && point.nonAcceptedItems.length > 0 && (
                <div className="mt-5 rounded-[1.5rem] bg-surface px-4 py-4">
                  <p className="text-sm font-semibold text-primary-deeper">Nao aceitamos</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-500">
                    {point.nonAcceptedItems.map((item) => (
                      <p key={item}>- {item}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {point.rules && point.rules.length > 0 && (
              <div className="rounded-[2rem] bg-white p-6 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Regras do local
                </p>
                <div className="mt-4 space-y-3 text-sm text-gray-500">
                  {point.rules.map((rule) => (
                    <div key={rule} className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="mt-1 text-primary" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isNgo && point.serviceRegions && point.serviceRegions.length > 0 && (
              <div className="rounded-[2rem] bg-white p-6 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Regioes atendidas
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {point.serviceRegions.map((region) => (
                    <span
                      key={region}
                      className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(point.publicProfileState === 'VERIFIED' || point.verifiedAt) && (
              <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-1 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold">Perfil verificado pelo VestGO</p>
                    <p className="mt-2 text-sm leading-7">
                      Este parceiro ja possui dados completos e operacao ativa na plataforma.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[2rem] bg-white p-6 shadow-card">
              <Link
                href="/login?callbackUrl=%2Fdoar"
                className="block rounded-2xl bg-primary px-5 py-4 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Iniciar doacao
              </Link>

              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block rounded-2xl border border-gray-200 px-5 py-4 text-center text-sm font-semibold text-on-surface transition-colors hover:bg-surface"
                >
                  Como chegar
                </a>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
