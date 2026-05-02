import Link from 'next/link';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  HeartHandshake,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SafeImage } from '@/components/ui/safe-image';
import { auth } from '@/lib/auth';
import { getCollectionPoint, type CollectionPoint } from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas e vestuário',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas e mochilas',
  OTHER: 'Outros itens',
};

const PROFILE_STATE_LABELS = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  VERIFIED: 'Verificado',
} as const;

const ACCESSIBILITY_LABELS: Record<string, string> = {
  RAMP_ACCESS: 'Acesso por rampa',
  ACCESSIBLE_RESTROOM: 'Banheiro acessível',
  ACCESSIBLE_PARKING: 'Estacionamento acessível',
  PRIORITY_SERVICE: 'Atendimento preferencial',
  GROUND_FLOOR: 'Acesso térreo',
  SIGN_LANGUAGE_SUPPORT: 'Suporte em Libras',
};

type ActiveNgo = NonNullable<NonNullable<CollectionPoint['donationEligibility']>['activeNgo']>;

interface Props {
  params: { id: string };
}

function initialsFrom(value: string) {
  return value
    .split(' ')
    .map((segment) => segment[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function HeroFallback() {
  return (
    <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,_rgba(153,234,225,0.55),_transparent_34%),linear-gradient(135deg,#00333c_0%,#006a62_58%,#c8eae7_100%)]" />
  );
}

function InfoCard({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm lg:rounded-none lg:border-0 lg:border-t lg:border-gray-100 lg:bg-transparent lg:p-0 lg:pt-5 lg:shadow-none">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <h2 className="mt-2 text-base font-bold text-primary-deeper">{title}</h2>
      <div className="mt-3 text-sm leading-7 text-gray-600">{children}</div>
    </section>
  );
}

function PillList({
  items,
  empty,
  mapLabel,
}: {
  items: string[];
  empty: string;
  mapLabel?: (item: string) => string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{empty}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary"
        >
          {mapLabel ? mapLabel(item) : item}
        </span>
      ))}
    </div>
  );
}

function PublicGallery({ images, title }: { images: string[]; title: string }) {
  return (
    <InfoCard label="Galeria" title="Fotos públicas">
      {images.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((imageUrl, index) => (
            <SafeImage
              key={imageUrl}
              src={imageUrl}
              alt={`Foto ${index + 1} de ${title}`}
              className="aspect-[4/3] rounded-[1.25rem] border border-gray-100"
              fallbackLabel="Foto indisponível"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.25rem] border border-dashed border-gray-200 bg-surface px-4 py-8 text-center text-sm font-semibold text-gray-400">
          Este perfil ainda não publicou fotos adicionais.
        </div>
      )}
    </InfoCard>
  );
}

function PartnerCard({ partner }: { partner: ActiveNgo | null }) {
  if (!partner) {
    return null;
  }

  const title = partner.organizationName ?? partner.name;

  return (
    <div className="rounded-[1.25rem] bg-surface p-4">
      <p className="text-sm font-semibold text-primary-deeper">ONG parceira ativa</p>
      <div className="mt-3 flex items-center gap-3">
        <SafeImage
          src={partner.avatarUrl}
          alt={`Avatar de ${title}`}
          className="h-12 w-12 shrink-0 rounded-2xl bg-white"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-primary-light text-sm font-bold text-primary">
              {initialsFrom(title)}
            </div>
          }
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-primary-deeper">{title}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Parceria ativa para triagem e encaminhamento das doações.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function CollectionPointDetailPage({ params }: Props) {
  const session = await auth();
  const currentRole = session?.user?.role ?? null;
  const viewerAccessToken =
    currentRole === 'COLLECTION_POINT' || currentRole === 'NGO' || currentRole === 'ADMIN'
      ? session?.user?.accessToken
      : undefined;
  let point: CollectionPoint;

  try {
    point = await getCollectionPoint(params.id, {
      accessToken: viewerAccessToken,
    });
  } catch {
    notFound();
  }

  const title = point.organizationName ?? point.name;
  const isNgo = point.role === 'NGO';
  const isDonor = currentRole === 'DONOR';
  const isOperationalViewer =
    currentRole === 'COLLECTION_POINT' || currentRole === 'NGO' || currentRole === 'ADMIN';
  const hideSensitiveNgoLocation = isNgo && (!session || isDonor);
  const partnerNgo = !isNgo ? point.donationEligibility?.activeNgo ?? null : null;
  const galleryImages = point.galleryImageUrls ?? [];
  const donationShortcutHref = `/doar?selectedPointId=${point.id}&selectionApplied=1&step=2`;
  const googleMapsUrl =
    !hideSensitiveNgoLocation && point.latitude != null && point.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`
      : null;
  const profileState = point.publicProfileState ?? 'ACTIVE';
  const locationLabel = hideSensitiveNgoLocation
    ? point.serviceRegions && point.serviceRegions.length > 0
      ? `Atuação regional: ${point.serviceRegions.join(', ')}`
      : 'Localização precisa protegida para doadores e visitantes públicos.'
    : formatAddressSummary(point) ?? 'Endereço não informado';

  return (
    <div className="vg-dark-fix min-h-screen bg-surface font-sans dark:bg-surface-ink">
      <div className="mx-auto max-w-[1500px] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <Link
          href="/mapa"
          className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-gray-500 shadow-sm transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} />
          Voltar ao mapa
        </Link>

        <section className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-primary-deeper text-white shadow-card-lg">
          <SafeImage
            src={point.coverImageUrl}
            alt={`Capa de ${title}`}
            className="absolute inset-0"
            imageClassName="h-full w-full object-cover"
            fallback={<HeroFallback />}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#00272e]/88 via-[#00333c]/58 to-[#00333c]/18" />
          <div className="relative z-10 grid min-h-[420px] gap-6 px-5 py-8 sm:px-7 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-end lg:px-8 lg:py-10 xl:grid-cols-[minmax(0,1fr)_440px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-muted">
                  <Sparkles size={14} />
                  {isNgo ? 'ONG parceira' : 'Ponto de coleta'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-muted">
                  <ShieldCheck size={13} />
                  {PROFILE_STATE_LABELS[profileState]}
                </span>
              </div>

              <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end">
                <SafeImage
                  src={point.avatarUrl}
                  alt={`Avatar de ${title}`}
                  className="h-24 w-24 rounded-[1.75rem] border border-white/20 bg-white/10 shadow-lg"
                  fallback={
                    <div className="flex h-full w-full items-center justify-center bg-primary text-2xl font-bold text-white">
                      {initialsFrom(title)}
                    </div>
                  }
                />
                <div className="min-w-0">
                  <h1 className="max-w-4xl text-3xl font-bold tracking-tight sm:text-5xl">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-primary-muted sm:text-base">
                    {point.description ??
                      'Parceiro ativo do VestGO com operação preparada para receber doações com organização e rastreio.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/15 bg-white/12 p-5 backdrop-blur">
              <p className="text-sm font-semibold text-white">Resumo público</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/12 p-3">
                  <p className="text-2xl font-bold">{point.totalDonations ?? 0}</p>
                  <p className="mt-1 text-xs text-primary-muted">doações ligadas</p>
                </div>
                <div className="rounded-2xl bg-white/12 p-3">
                  <p className="text-2xl font-bold">{point.activePartnerships ?? 0}</p>
                  <p className="mt-1 text-xs text-primary-muted">parcerias ativas</p>
                </div>
              </div>
              {point.donationEligibility && (
                <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-primary-deeper">
                  <p className="text-sm font-semibold">{point.donationEligibility.label}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    {point.donationEligibility.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-5 rounded-[2rem] bg-white p-5 shadow-card lg:p-7">
            {point.purpose && (
              <InfoCard label="Propósito" title="Impacto institucional">
                {point.purpose}
              </InfoCard>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <InfoCard label="Localização" title={hideSensitiveNgoLocation ? 'Área atendida' : 'Endereço'}>
                <div className="flex items-start gap-3">
                  <MapPin size={17} className="mt-1 shrink-0 text-primary" />
                  <span>{locationLabel}</span>
                </div>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    Como chegar
                    <ExternalLink size={14} />
                  </a>
                )}
              </InfoCard>

              <InfoCard label="Contato e horário" title="Atendimento">
                {!hideSensitiveNgoLocation && (
                  <div className="flex items-start gap-3">
                    <Phone size={17} className="mt-1 shrink-0 text-primary" />
                    <span>{point.phone ?? 'Telefone não informado'}</span>
                  </div>
                )}
                {!hideSensitiveNgoLocation && (
                  <div className="mt-3 flex items-start gap-3">
                    <Clock3 size={17} className="mt-1 shrink-0 text-primary" />
                    <span>{point.openingHours ?? 'Horário ainda não informado.'}</span>
                  </div>
                )}
                {point.openingHoursExceptions && !hideSensitiveNgoLocation && (
                  <p className="mt-3 rounded-2xl bg-surface px-4 py-3 text-xs font-medium text-gray-500">
                    Exceções: {point.openingHoursExceptions}
                  </p>
                )}
              </InfoCard>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <InfoCard label="Itens" title="Categorias aceitas">
                <PillList
                  items={point.acceptedCategories ?? []}
                  empty="Categorias ainda não informadas."
                  mapLabel={(item) => CATEGORY_LABELS[item] ?? item}
                />
                {point.nonAcceptedItems && point.nonAcceptedItems.length > 0 && (
                  <div className="mt-4 rounded-[1.25rem] bg-surface px-4 py-3">
                    <p className="text-sm font-semibold text-primary-deeper">Não aceitamos</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-500">
                      {point.nonAcceptedItems.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </InfoCard>

              <InfoCard label="Acessibilidade" title="Recursos disponíveis">
                <PillList
                  items={point.accessibilityFeatures ?? []}
                  empty="Recursos de acessibilidade ainda não informados."
                  mapLabel={(item) => ACCESSIBILITY_LABELS[item] ?? item}
                />
                {point.accessibilityDetails && (
                  <p className="mt-4 rounded-[1.25rem] bg-surface px-4 py-3">
                    {point.accessibilityDetails}
                  </p>
                )}
              </InfoCard>
            </div>

            {point.rules && point.rules.length > 0 && (
              <InfoCard label="Regras" title="Como entregar">
                <div className="space-y-2">
                  {point.rules.map((rule) => (
                    <div key={rule} className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="mt-1 shrink-0 text-primary" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}

            <PublicGallery images={galleryImages} title={title} />
          </main>

          <aside className="space-y-5 rounded-[2rem] bg-white p-5 shadow-card lg:sticky lg:top-5 lg:self-start">
            <InfoCard label="Operação" title={isNgo ? 'ONG parceira' : 'Fluxo de doação'}>
              {isNgo ? (
                <p>
                  A ONG permanece pública como entidade parceira. Para doadores, a localização
                  precisa pode ser protegida.
                </p>
              ) : point.donationEligibility?.canDonateHere === false ? (
                <p>{point.donationEligibility.message}</p>
              ) : isOperationalViewer ? (
                <p>
                  Perfis operacionais e administração acompanham parceiros e operações, mas não
                  iniciam doações por este CTA.
                </p>
              ) : isDonor ? (
                <Link
                  href={donationShortcutHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                >
                  <HeartHandshake size={17} />
                  Iniciar doação
                </Link>
              ) : (
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(donationShortcutHref)}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                >
                  <HeartHandshake size={17} />
                  Iniciar doação
                </Link>
              )}
            </InfoCard>

            <PartnerCard partner={partnerNgo} />

            {isNgo && point.serviceRegions && point.serviceRegions.length > 0 && (
              <InfoCard label="Cobertura" title="Regiões atendidas">
                <PillList items={point.serviceRegions} empty="Regiões ainda não informadas." />
              </InfoCard>
            )}

            {(point.publicProfileState === 'VERIFIED' || point.verifiedAt) && (
              <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-1 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold">Perfil verificado pelo VestGO</p>
                    <p className="mt-2 text-sm leading-7">
                      Este parceiro possui dados completos e operação ativa na plataforma.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
