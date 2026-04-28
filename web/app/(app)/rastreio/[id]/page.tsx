import {
  ArrowLeft,
  Award,
  ClipboardList,
  Info,
  MapPin,
  Package,
  Sparkles,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import {
  DONATION_STATUS_CONFIG,
  DONATION_STATUS_ORDER,
  formatDonationDateLabel,
} from '@/components/donations/donation-status';
import { PostDonationRating } from '@/components/donations/post-donation-rating';
import { StatusActionPanel } from '@/components/donations/status-action-panel';
import { auth } from '@/lib/auth';
import { getDonation, getUserDonations, type DonationRecord } from '@/lib/api';
import { buildImpactSnapshot } from '@/lib/gamification';

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

export default async function RastreioDetalhePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { celebrate?: string };
}) {
  const session = await auth();
  const accessToken = session?.user?.accessToken ?? '';
  const role = session?.user?.role ?? 'DONOR';

  if (!accessToken) {
    return null;
  }

  let donation: DonationRecord | null = null;
  let allDonations: DonationRecord[] = [];

  try {
    const [donationResponse, donationsResponse] = await Promise.all([
      getDonation(params.id, accessToken),
      getUserDonations(accessToken, { limit: 50 }),
    ]);
    donation = donationResponse;
    allDonations = donationsResponse.data;
  } catch {
    donation = null;
    allDonations = [];
  }

  if (!donation) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
        <Package size={40} className="mb-4 text-gray-200" />
        <p className="font-semibold text-gray-400">Doação não encontrada</p>
        <Link href="/rastreio" className="mt-4 text-sm font-semibold text-primary hover:underline">
          {role !== 'DONOR' ? 'Voltar ao rastreio operacional' : 'Voltar ao rastreio'}
        </Link>
      </div>
    );
  }

  const snapshot = buildImpactSnapshot(allDonations);
  const statusConfig = DONATION_STATUS_CONFIG[donation.status];
  const StatusIcon = statusConfig.icon;
  const currentIdx = DONATION_STATUS_ORDER.indexOf(donation.status);
  const isCancelled = donation.status === 'CANCELLED';
  const showCelebrate = searchParams?.celebrate === '1';
  const isOperationalRole = role !== 'DONOR';
  const hasOperationalAction = isOperationalRole && donation.allowedNextStatuses.length > 0;
  const operationHref = hasOperationalAction
    ? `/operacoes?actionableOnly=true&status=${donation.status}`
    : `/operacoes?status=${donation.status}`;
  const ngoLocationSummary =
    role === 'DONOR' && donation.ngo?.role === 'NGO'
      ? donation.ngo.serviceRegions && donation.ngo.serviceRegions.length > 0
        ? `Atuação regional: ${donation.ngo.serviceRegions.join(', ')}`
        : 'Localização precisa protegida durante o rastreio do doador.'
      : donation.ngo?.address ?? 'Destino social será exibido quando o fluxo for vinculado';

  const backHref = '/rastreio';

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <section>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-primary"
          >
            <ArrowLeft size={14} />
            {isOperationalRole ? 'Voltar ao rastreio operacional' : 'Voltar ao rastreio'}
          </Link>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Detalhes
          </p>
          <h1 className="mt-2 text-3xl font-bold text-primary-deeper sm:text-4xl">{donation.code}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Registrada em {formatDonationDateLabel(donation.createdAt)}
          </p>
        </section>

        {showCelebrate && (
          <section className="rounded-[2rem] bg-primary-light/45 p-6 shadow-card lg:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-sm">
                <Sparkles size={14} />
                Doação confirmada
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <h2 className="text-2xl font-bold text-primary-deeper">
                  Sua doação já faz parte do fluxo real do VestGO.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">
                  O rastreio, o dashboard e o perfil agora refletem esta entrega a partir do mesmo
                  dado persistido.
                </p>
              </div>

              <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  Pontos desta doação
                </p>
                <p className="mt-2 text-3xl font-bold text-primary-deeper">
                  +{donation.pointsAwarded} pts
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-500">
                  Seu progresso total agora está em {snapshot.points} pontos solidários.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                  Meta do mês
                </p>
                <p className="mt-2 text-sm font-semibold text-primary-deeper">
                  {snapshot.monthlyGoal.current}/{snapshot.monthlyGoal.target} entregas
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                  Próximo marco
                </p>
                <p className="mt-2 text-sm font-semibold text-primary-deeper">
                  {snapshot.nextMilestone.label}
                </p>
              </div>
              <Link
                href="/perfil"
                className="flex items-center justify-between rounded-[1.5rem] bg-primary-deeper p-4 text-white"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-muted">
                    Minha solidariedade
                  </p>
                  <p className="mt-2 text-sm font-semibold">Ver perfil completo</p>
                </div>
                <Award size={18} />
              </Link>
            </div>
          </section>
        )}

        {showCelebrate && role === 'DONOR' && (
          <PostDonationRating donationId={donation.id} />
        )}

        <section
          className={`flex items-start gap-4 rounded-[2rem] p-5 shadow-card ${statusConfig.bg} lg:p-6`}
        >
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <StatusIcon size={26} className={statusConfig.color} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-lg font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
            <p className="mt-1 text-sm leading-7 text-gray-500">{statusConfig.description}</p>
            {donation.latestEvent && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary-deeper">
                Última atualização: {formatDonationDateLabel(donation.latestEvent.createdAt)}
              </p>
            )}
            {donation.operationalBatch && (
              <p className="mt-2 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary-deeper">
                Vinculada à carga {donation.operationalBatch.code} - {donation.operationalBatch.name}
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {!isCancelled && (
              <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Progresso
                </p>
                <div className="mt-5 space-y-4">
                  {DONATION_STATUS_ORDER.map((status, index) => {
                    const stepConfig = DONATION_STATUS_CONFIG[status];
                    const StepIcon = stepConfig.icon;
                    const done = index <= currentIdx;
                    const isCurrentStep = index === currentIdx;
                    const isLast = index === DONATION_STATUS_ORDER.length - 1;

                    return (
                      <div key={status} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              done
                                ? isCurrentStep
                                  ? 'bg-primary ring-4 ring-primary/20'
                                  : 'bg-primary'
                                : 'bg-gray-100'
                            }`}
                          >
                            <StepIcon size={15} className={done ? 'text-white' : 'text-gray-300'} />
                          </div>
                          {!isLast && (
                            <div
                              className={`my-1 w-0.5 flex-1 ${
                                index < currentIdx ? 'bg-primary' : 'bg-gray-100'
                              }`}
                              style={{ minHeight: 24 }}
                            />
                          )}
                        </div>

                        <div className="pb-4">
                          <p
                            className={`text-sm font-bold ${
                              done ? 'text-on-surface' : 'text-gray-300'
                            }`}
                          >
                            {stepConfig.label}
                          </p>
                          {isCurrentStep && (
                            <p className="mt-0.5 text-xs leading-snug text-gray-400">
                              {stepConfig.description}
                            </p>
                          )}
                          {donation.timeline.find((event) => event.status === status) && (
                            <p className="mt-0.5 text-[10px] text-gray-300">
                              {formatDonationDateLabel(
                                donation.timeline.find((event) => event.status === status)
                                  ?.createdAt ?? donation.createdAt,
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Histórico de eventos
              </p>
              <div className="mt-5 space-y-3">
                {[...donation.timeline].reverse().map((event) => {
                  const eventConfig = DONATION_STATUS_CONFIG[event.status];
                  const EventIcon = eventConfig.icon;

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 rounded-[1.75rem] bg-white p-4 shadow-sm"
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${eventConfig.bg}`}
                      >
                        <EventIcon size={15} className={eventConfig.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-on-surface">
                          {eventConfig.label}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-gray-400">{event.description}</p>
                        {event.location && (
                          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                            {event.location}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-gray-300">
                          {formatDonationDateLabel(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Itens doados
              </p>
              <div className="mt-5 space-y-3">
                {donation.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-[1.75rem] bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{item.name}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {CATEGORY_LABELS[item.category] ?? item.category} - {item.quantity}{' '}
                        unidade(s)
                      </p>
                      {item.description && (
                        <div className="mt-2 flex items-center gap-1">
                          <Info size={11} className="text-gray-300" />
                          <p className="text-[11px] text-gray-400">{item.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="overflow-hidden rounded-[2rem] bg-white shadow-card">
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-primary-light to-[#c8eae7]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                  <MapPin size={16} />
                </div>
              </div>

              <div className="p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Fluxo logístico
                </p>

                <div className="mt-3 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                      Ponto de coleta
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      {donation.collectionPoint?.organizationName ??
                        donation.collectionPoint?.name ??
                        'Não informado'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {donation.collectionPoint?.address ?? 'Endereço ainda não informado'}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                      ONG vinculada
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-surface">
                      {donation.ngo?.organizationName ??
                        donation.ngo?.name ??
                        'Parceiro ainda não vinculado'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {ngoLocationSummary}
                    </p>
                  </div>

                  {donation.operationalBatch && (
                    <div className="rounded-[1.5rem] bg-primary-light/45 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Carga operacional
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-primary-deeper">
                        {donation.operationalBatch.code}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {donation.operationalBatch.name}
                      </p>
                    </div>
                  )}
                </div>

                <Link
                  href="/mapa"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                >
                  <MapPin size={12} />
                  Ver no mapa
                </Link>
              </div>
            </div>

            {isOperationalRole ? (
              <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                      Operação ativa
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                      Próximo passo da coleta
                    </h2>
                  </div>
                  <ClipboardList size={20} className="text-primary" />
                </div>

                {hasOperationalAction ? (
                  <div className="mt-5 rounded-[1.75rem] border border-primary/15 bg-primary-light/30 p-4">
                    <p className="text-sm font-semibold text-primary-deeper">
                      Esta coleta possui ação permitida para seu perfil.
                    </p>
                    <p className="mt-2 text-sm leading-7 text-gray-500">
                      Use a ação rápida abaixo para atualizar o status. A mudança atualiza este
                      rastreio e também aparece na fila operacional.
                    </p>
                    <div className="mt-4">
                      <StatusActionPanel compact donation={donation} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.75rem] bg-surface p-5">
                    <p className="text-sm font-semibold text-primary-deeper">
                      Nenhuma ação operacional disponível para seu perfil neste momento.
                    </p>
                    <p className="mt-2 text-sm leading-7 text-gray-500">
                      A coleta pode estar aguardando outro ator do fluxo ou já ter concluído a
                      etapa sob responsabilidade deste perfil.
                    </p>
                  </div>
                )}

                <Link
                  href={operationHref}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                >
                  <ClipboardList size={16} />
                  {hasOperationalAction ? 'Abrir na fila operacional' : 'Ver em operações'}
                </Link>
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white p-6 shadow-card lg:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                      Progresso pessoal
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-primary-deeper">
                      {snapshot.nextMilestone.label}
                    </h2>
                  </div>
                  <Target size={20} className="text-primary" />
                </div>

                <div className="mt-5 rounded-[1.75rem] bg-surface p-5">
                  <p className="text-sm font-semibold text-primary-deeper">Pontos solidários</p>
                  <p className="mt-2 text-3xl font-bold text-primary-deeper">{snapshot.points}</p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    {snapshot.nextMilestone.note}
                  </p>
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
