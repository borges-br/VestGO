'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Footprints,
  Info,
  Layers,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus as PlusIcon,
  Shirt,
  Sparkles,
} from 'lucide-react';
import { PostDonationRewardCard } from '@/components/gamification/impact-widgets';
import {
  createDonation,
  getCollectionPoint,
  getNearbyPoints,
  getUserDonations,
  type CollectionPoint,
  type DonationRecord,
} from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';
import { buildPostDonationReward, type PostDonationReward } from '@/lib/gamification';
import { cn } from '@/lib/utils';

type CategoryId = 'adult' | 'child' | 'shoes' | 'blankets' | 'other';
type ConditionId = 'otimo' | 'bom';

const steps = [
  { eyebrow: 'Etapa 1', short: 'Tipo', title: 'O que você vai doar?', description: 'Escolha as categorias principais para iniciar o registro.' },
  { eyebrow: 'Etapa 2', short: 'Detalhes', title: 'Detalhes das peças', description: 'Informe só o necessário para dar contexto à entrega.' },
  { eyebrow: 'Etapa 3', short: 'Ponto', title: 'Escolha o ponto de coleta', description: 'Selecione um parceiro real para receber a doação.' },
  { eyebrow: 'Etapa 4', short: 'Revisão', title: 'Revisão e confirmação', description: 'Confira os dados principais antes de concluir.' },
];

const categories = [
  { id: 'adult' as CategoryId, label: 'Roupas adultas', hint: 'camisetas, calças, casacos', icon: Shirt },
  { id: 'child' as CategoryId, label: 'Roupas infantis', hint: 'peças para crianças', icon: Sparkles },
  { id: 'shoes' as CategoryId, label: 'Calçados', hint: 'tênis, sapatos e chinelos', icon: Footprints },
  { id: 'blankets' as CategoryId, label: 'Cobertores', hint: 'mantas e agasalhos pesados', icon: Layers },
  { id: 'other' as CategoryId, label: 'Outros itens', hint: 'acessórios e peças diversas', icon: Package },
];

const conditions = [
  { id: 'otimo' as ConditionId, label: 'Em ótimo estado', description: 'Prontas para uso imediato.' },
  { id: 'bom' as ConditionId, label: 'Usadas, mas conservadas', description: 'Com bom potencial de reaproveitamento.' },
];

const volumeOptions = [
  'Sacola pequena',
  'Sacola média',
  'Sacola grande',
  'Caixa pequena',
  'Caixa média',
  'Caixa grande',
];

const volumeHints: Record<string, string> = {
  'Sacola pequena': 'cerca de 3 a 5 peças',
  'Sacola média': 'cerca de 6 a 10 peças',
  'Sacola grande': 'cerca de 11 a 18 peças',
  'Caixa pequena': 'cerca de 12 a 20 peças',
  'Caixa média': 'cerca de 20 a 35 peças',
  'Caixa grande': 'cerca de 35 a 60 peças',
};

const categoryLabels: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  OTHER: 'Outros',
};

const categoryToApiCategory: Record<CategoryId, string> = {
  adult: 'CLOTHING',
  child: 'CLOTHING',
  shoes: 'SHOES',
  blankets: 'CLOTHING',
  other: 'OTHER',
};

const DONATION_WIZARD_STORAGE_KEY = 'vestgo:donation-wizard-draft';
const DEFAULT_DISCOVERY_CENTER = { lat: -23.50153, lng: -47.45256 };

type DonationWizardDraft = {
  currentStep: number;
  selectedCategories: CategoryId[];
  quantity: string;
  volume: string;
  condition: ConditionId;
  notes: string;
  pointId: string;
  confirmed: boolean;
};

function isCategoryId(value: string): value is CategoryId {
  return categories.some((item) => item.id === value);
}

function isConditionId(value: string): value is ConditionId {
  return conditions.some((item) => item.id === value);
}

function mergeCollectionPoints(primary: CollectionPoint[], secondary: CollectionPoint[]) {
  const map = new Map<string, CollectionPoint>();

  [...primary, ...secondary].forEach((point) => {
    map.set(point.id, point);
  });

  return Array.from(map.values());
}

function readWizardDraft(): DonationWizardDraft {
  if (typeof window === 'undefined') {
    return {
      currentStep: 0,
      selectedCategories: ['adult'],
      quantity: '',
      volume: 'Sacola média',
      condition: 'otimo',
      notes: '',
      pointId: '',
      confirmed: false,
    };
  }

  const rawDraft = window.sessionStorage.getItem(DONATION_WIZARD_STORAGE_KEY);

  if (!rawDraft) {
    return {
      currentStep: 0,
      selectedCategories: ['adult'],
      quantity: '',
      volume: 'Sacola média',
      condition: 'otimo',
      notes: '',
      pointId: '',
      confirmed: false,
    };
  }

  try {
    const parsed = JSON.parse(rawDraft) as Partial<DonationWizardDraft>;

    return {
      currentStep:
        typeof parsed.currentStep === 'number'
          ? Math.min(Math.max(parsed.currentStep, 0), steps.length - 1)
          : 0,
      selectedCategories:
        parsed.selectedCategories?.filter((value): value is CategoryId => isCategoryId(value)) ??
        ['adult'],
      quantity: typeof parsed.quantity === 'string' ? parsed.quantity : '',
      volume:
        typeof parsed.volume === 'string' && volumeOptions.includes(parsed.volume)
          ? parsed.volume
          : 'Sacola média',
      condition:
        typeof parsed.condition === 'string' && isConditionId(parsed.condition)
          ? parsed.condition
          : 'otimo',
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      pointId: typeof parsed.pointId === 'string' ? parsed.pointId : '',
      confirmed: parsed.confirmed === true,
    };
  } catch {
    return {
      currentStep: 0,
      selectedCategories: ['adult'],
      quantity: '',
      volume: 'Sacola média',
      condition: 'otimo',
      notes: '',
      pointId: '',
      confirmed: false,
    };
  }
}

function getCurrentPosition() {
  if (typeof window === 'undefined' || !window.navigator.geolocation) {
    return Promise.resolve(DEFAULT_DISCOVERY_CENTER);
  }

  return new Promise<{ lat: number; lng: number }>((resolve) => {
    window.navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => resolve(DEFAULT_DISCOVERY_CENTER),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  });
}

function getEstimatedQuantity(value: string) {
  const match = value.match(/\d+/);
  if (!match) return 0;
  return Number.parseInt(match[0], 10);
}

function splitQuantity(total: number, parts: number) {
  if (parts <= 0) return [];
  const base = Math.max(1, Math.floor(total / parts));
  const quantities = Array.from({ length: parts }, () => base);
  let remainder = Math.max(total - base * parts, 0);
  let index = 0;

  while (remainder > 0) {
    quantities[index] += 1;
    remainder -= 1;
    index = (index + 1) % parts;
  }

  return quantities;
}

function isDonationEligiblePoint(point: CollectionPoint | null | undefined) {
  return point?.role === 'COLLECTION_POINT' && point.donationEligibility?.canDonateHere === true;
}

function sortPointsForDonation(points: CollectionPoint[]) {
  return [...points].sort((left, right) => {
    const leftEligible = isDonationEligiblePoint(left) ? 1 : 0;
    const rightEligible = isDonationEligiblePoint(right) ? 1 : 0;

    if (leftEligible !== rightEligible) {
      return rightEligible - leftEligible;
    }

    return (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY);
  });
}

function SummaryCard({
  selectedCategories,
  quantity,
  volume,
  condition,
  notes,
  selectedPoint,
  compact = false,
  reward,
}: {
  selectedCategories: CategoryId[];
  quantity: string;
  volume: string;
  condition: ConditionId;
  notes: string;
  selectedPoint: CollectionPoint | null;
  compact?: boolean;
  reward: PostDonationReward;
}) {
  const labels = selectedCategories.length
    ? categories.filter((item) => selectedCategories.includes(item.id)).map((item) => item.label)
    : ['Nenhuma categoria'];
  const conditionLabel = conditions.find((item) => item.id === condition)?.label ?? 'Não informado';

  return (
    <div className={cn('rounded-[2rem] bg-white shadow-card dark:bg-surface-inkSoft dark:shadow-none', compact ? 'p-5' : 'p-6 lg:p-7')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Resumo da doação</p>
          <h2 className="mt-2 text-xl font-bold text-primary-deeper dark:text-white">O que já foi definido</h2>
        </div>
        <BadgeCheck size={20} className="text-primary" />
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-3xl bg-surface p-4 dark:bg-surface-ink">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Categorias</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {labels.map((label) => (
              <span key={label} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-primary shadow-sm dark:bg-surface-inkSoft">
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-surface p-4 dark:bg-surface-ink">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Detalhes</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">{quantity || 'Quantidade pendente'}</p>
              <p className="mt-1 text-sm text-gray-400">{volume}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">{conditionLabel}</p>
              <p className="mt-1 text-sm text-gray-400">{notes ? 'Com observações' : 'Sem observações'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-surface p-4 dark:bg-surface-ink">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Ponto de coleta</p>
          {selectedPoint ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">{selectedPoint.organizationName ?? selectedPoint.name}</p>
                <p className="mt-1 text-sm text-gray-400">
                  {selectedPoint.distanceKm ? `${selectedPoint.distanceKm} km - ` : ''}
                  {formatAddressSummary(selectedPoint) ?? 'Endereço não informado'}
                </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                {selectedPoint.acceptedCategories.slice(0, 3).map((item) => categoryLabels[item] ?? item).join(' - ')}
              </p>
              {selectedPoint.donationEligibility && (
                <div
                  className={cn(
                    'mt-3 rounded-2xl px-3 py-2 text-xs leading-6',
                    selectedPoint.donationEligibility.canDonateHere
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
                  )}
                >
                  <p className="font-semibold">{selectedPoint.donationEligibility.label}</p>
                  <p>{selectedPoint.donationEligibility.message}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-400">Escolha do ponto ainda pendente.</p>
          )}
        </div>

        <div className="rounded-3xl bg-primary-light/45 p-4 dark:bg-primary/10">
          <p className="text-sm font-semibold text-primary-deeper dark:text-white">+{reward.points} pontos previstos</p>
          <p className="mt-2 text-sm leading-7 text-gray-500">Esta entrega passa a contar no seu progresso real assim que for registrada.</p>
        </div>
      </div>
    </div>
  );
}

export default function DoarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const userRole = session?.user?.role ?? 'DONOR';
  const isDonor = userRole === 'DONOR';
  const stepCardRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>(['adult']);
  const [quantity, setQuantity] = useState('');
  const [volume, setVolume] = useState('Sacola média');
  const [condition, setCondition] = useState<ConditionId>('otimo');
  const [notes, setNotes] = useState('');
  const [pointId, setPointId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [existingDonations, setExistingDonations] = useState<DonationRecord[]>([]);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && !isDonor) {
      router.replace('/inicio');
    }
  }, [isDonor, router, status]);

  useEffect(() => {
    const draft = readWizardDraft();
    setCurrentStep(draft.currentStep);
    setSelectedCategories(draft.selectedCategories.length > 0 ? draft.selectedCategories : ['adult']);
    setQuantity(draft.quantity);
    setVolume(draft.volume);
    setCondition(draft.condition);
    setNotes(draft.notes);
    setPointId(draft.pointId);
    setConfirmed(draft.confirmed);
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    const selectedPointId = searchParams.get('selectedPointId');
    const selectionApplied = searchParams.get('selectionApplied') === '1';
    const stepParam = searchParams.get('step');

    if (!selectedPointId && !selectionApplied && !stepParam) {
      return;
    }

    if (selectedPointId) {
      setPointId(selectedPointId);
      setConfirmed(false);
    }

    if (selectionApplied) {
      setSelectionFeedback('Ponto aplicado com sucesso. Você já pode continuar a doação.');
    }

    const parsedStep = Number.parseInt(stepParam ?? '2', 10);
    if (Number.isFinite(parsedStep)) {
      setCurrentStep(Math.min(Math.max(parsedStep, 0), steps.length - 1));
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('selectedPointId');
    nextParams.delete('selectionApplied');
    nextParams.delete('step');
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [draftReady, pathname, router, searchParams]);

  useEffect(() => {
    if (!draftReady || !isDonor || typeof window === 'undefined') return;

    window.sessionStorage.setItem(
      DONATION_WIZARD_STORAGE_KEY,
      JSON.stringify({
        currentStep,
        selectedCategories,
        quantity,
        volume,
        condition,
        notes,
        pointId,
        confirmed,
      } satisfies DonationWizardDraft),
    );
  }, [condition, confirmed, currentStep, draftReady, isDonor, notes, pointId, quantity, selectedCategories, volume]);

  useEffect(() => {
    if (!draftReady || !pointId || points.some((item) => item.id === pointId)) {
      return;
    }

    let cancelled = false;

    async function loadSelectedPoint() {
      try {
        const point = await getCollectionPoint(pointId, { forDonation: true });

        if (cancelled || point.role !== 'COLLECTION_POINT') return;

        setPoints((current) => mergeCollectionPoints([point], current));

        if (!isDonationEligiblePoint(point)) {
          setPointId('');
          setConfirmed(false);
          setPointsError(point.donationEligibility?.message ?? 'Este ponto ainda não pode finalizar doações.');
        } else {
          setPointsError(null);
        }
      } catch {
        if (!cancelled) {
          setPointId('');
          setConfirmed(false);
          setPointsError('O ponto escolhido anteriormente não está mais disponível. Escolha outro para seguir.');
        }
      }
    }

    loadSelectedPoint();

    return () => {
      cancelled = true;
    };
  }, [draftReady, pointId, points]);

  useEffect(() => {
    async function loadContext() {
      if (status === 'loading' || !isDonor || !draftReady) return;

      setPointsLoading(true);
      setPointsError(null);

      try {
        const location = await getCurrentPosition();
        const nearbyPromise = getNearbyPoints({
          lat: location.lat,
          lng: location.lng,
          radius: 15,
          limit: 6,
          forDonation: true,
        });
        const donationsPromise = session?.user?.accessToken
          ? getUserDonations(session.user.accessToken, { limit: 50 })
          : Promise.resolve(null);

        const [nearby, donationsResponse] = await Promise.all([nearbyPromise, donationsPromise]);
        const collectionPointsOnly = sortPointsForDonation(
          nearby.data.filter((point) => point.role === 'COLLECTION_POINT'),
        );
        setPoints(collectionPointsOnly);

        const firstEligiblePoint = collectionPointsOnly.find((point) => isDonationEligiblePoint(point));

        if (firstEligiblePoint) {
          setPointId((current) => current || firstEligiblePoint.id);
        }

        if (donationsResponse) {
          setExistingDonations(donationsResponse.data);
        }

        if (collectionPointsOnly.length === 0) {
          setPointsError('Nenhum ponto parceiro disponível agora.');
        } else if (!firstEligiblePoint) {
          setPointsError(
            'Os pontos visíveis nesta área ainda aguardam ONG parceira ativa e, por isso, não podem finalizar doações.',
          );
        }
      } catch {
        setPointsError('Não foi possível carregar os pontos de coleta no momento.');
      } finally {
        setPointsLoading(false);
      }
    }

    loadContext();
  }, [draftReady, isDonor, session?.user?.accessToken, status]);

  useEffect(() => {
    if (!pointId) {
      return;
    }

    const currentPoint = points.find((item) => item.id === pointId);

    if (!currentPoint || isDonationEligiblePoint(currentPoint)) {
      return;
    }

    setPointId('');
    setConfirmed(false);
    setPointsError(
      currentPoint.donationEligibility?.message ??
        'Este ponto ainda não pode finalizar doações.',
    );
  }, [pointId, points]);

  if (status === 'loading' || !draftReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="rounded-[1.75rem] bg-white px-5 py-4 text-sm text-gray-500 shadow-card dark:bg-surface-inkSoft dark:text-gray-400 dark:shadow-none">
          {status === 'loading' ? 'Carregando permissão de acesso...' : 'Recuperando seu rascunho da doação...'}
        </div>
      </div>
    );
  }

  if (!isDonor) {
    return (
      <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-shell">
          <div className="rounded-[2rem] bg-white p-6 shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
              Fluxo exclusivo para doadores
            </p>
            <h1 className="mt-3 text-3xl font-bold text-primary-deeper dark:text-white">Seu perfil não cria doações</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
              Perfis de ponto de coleta, ONG e administração acompanham ou operam doações, mas não podem iniciar uma nova entrega como doadores.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/inicio"
                className="inline-flex items-center justify-center rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Ir para meu painel
              </Link>
              <Link
                href="/operacoes"
                className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-gray-300"
              >
                Abrir operações
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedPoint = points.find((item) => item.id === pointId) ?? null;
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const estimatedQuantity = getEstimatedQuantity(quantity);
  const rewardPreview = buildPostDonationReward(existingDonations);
  const mapSelectionParams = new URLSearchParams({
    mode: 'select-point',
    returnTo: '/doar',
    step: '2',
  });

  if (pointId) {
    mapSelectionParams.set('selectedPointId', pointId);
  }

  const mapSelectionHref = `/mapa?${mapSelectionParams.toString()}`;
  const canContinue =
    currentStep === 0
      ? selectedCategories.length > 0
      : currentStep === 1
        ? estimatedQuantity > 0
        : currentStep === 2
          ? isDonationEligiblePoint(selectedPoint)
          : confirmed && isDonationEligiblePoint(selectedPoint);

  function toggleCategory(categoryId: CategoryId) {
    setSelectedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId],
    );
  }

  function scrollToStepTop() {
    // On mobile, scroll the step card into view; on desktop leave position intact
    if (window.innerWidth < 1024 && stepCardRef.current) {
      const topbarHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--topbar-height') || '64',
        10,
      );
      const rect = stepCardRef.current.getBoundingClientRect();
      window.scrollBy({ top: rect.top - topbarHeight - 12, behavior: 'smooth' });
    }
  }

  function handleNext() {
    if (!canContinue || currentStep === steps.length - 1) return;
    setCurrentStep((value) => value + 1);
    // Defer scroll so the new step has rendered
    setTimeout(scrollToStepTop, 50);
  }

  function handleBack() {
    if (currentStep === 0) return;
    setCurrentStep((value) => value - 1);
    setTimeout(scrollToStepTop, 50);
  }

  async function handleConfirm() {
    if (!confirmed || !session?.user?.accessToken || !selectedPoint) return;

    const quantities = splitQuantity(Math.max(estimatedQuantity, selectedCategories.length), selectedCategories.length);
    const conditionLabel = conditions.find((item) => item.id === condition)?.label ?? condition;
    const payload = {
      collectionPointId: selectedPoint.id,
      notes: [`Volume aproximado: ${volume}`, `Condição declarada: ${conditionLabel}`, notes ? `Observações: ${notes}` : null].filter(Boolean).join(' | '),
      items: selectedCategories.map((categoryId, index) => {
        const category = categories.find((item) => item.id === categoryId)!;
        return {
          name: category.label,
          category: categoryToApiCategory[categoryId],
          quantity: quantities[index] ?? 1,
          description: category.hint,
        };
      }),
    };

    setLoading(true);
    setSubmitError(null);

    try {
      const donation = await createDonation(payload, session.user.accessToken);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(DONATION_WIZARD_STORAGE_KEY);
      }
      router.push(`/rastreio/${donation.id}?celebrate=1`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível registrar a doação.');
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Nova doação</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary-deeper dark:text-white sm:text-4xl">
              Registrar doação em etapas
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
              Preencha cada passo para registrar sua doação com segurança.
            </p>
          </div>
        </div>

        <div ref={stepCardRef} className="rounded-[2rem] bg-white p-4 shadow-card dark:bg-surface-inkSoft dark:shadow-none sm:p-5 lg:p-6">
          {/* Mobile: compact pill header — progress bar + current step label only */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-surface dark:bg-surface-ink">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="flex-shrink-0 rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold text-primary dark:bg-primary/20">
              {currentStep + 1}/{steps.length} · {step.short}
            </span>
          </div>

          {/* Desktop: full step buttons */}
          <div className="hidden lg:block">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Fluxo guiado</p>
                <p className="mt-1 text-sm text-gray-500">Etapa {currentStep + 1} de {steps.length}</p>
              </div>
              <span className="rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary dark:bg-primary/20">
                {step.short}
              </span>
            </div>

            <div className="mt-4 h-2 rounded-full bg-surface dark:bg-surface-ink">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-5 grid gap-2 grid-cols-4">
              {steps.map((item, index) => {
                const isCurrent = index === currentStep;
                const isPast = index < currentStep;

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => index <= currentStep && setCurrentStep(index)}
                    disabled={index > currentStep}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors',
                      isCurrent && 'bg-primary-deeper text-white',
                      isPast && 'bg-primary-light text-primary-deeper dark:bg-primary/20 dark:text-primary-muted',
                      !isCurrent && !isPast && 'bg-surface text-gray-400 dark:bg-surface-ink',
                      index > currentStep && 'cursor-not-allowed opacity-70',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                        isCurrent && 'bg-white/15 text-white',
                        isPast && 'bg-white text-primary dark:bg-surface-ink',
                        !isCurrent && !isPast && 'bg-white text-gray-400 dark:bg-surface-inkSoft',
                      )}
                    >
                      {isPast ? <Check size={16} /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.short}</p>
                      <p className={cn('mt-0.5 text-xs', isCurrent ? 'text-white/75' : 'text-gray-400')}>
                        {item.eyebrow}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_360px]">
          <section className="rounded-[2rem] bg-white p-6 shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">{step.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-bold text-primary-deeper dark:text-white">{step.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">{step.description}</p>
              </div>
              <div className="hidden rounded-2xl bg-surface px-3 py-2 text-right dark:bg-surface-ink lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">etapa atual</p>
                <p className="mt-1 text-sm font-semibold text-primary-deeper dark:text-primary-muted">{step.short}</p>
              </div>
            </div>

            {currentStep === 0 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isSelected = selectedCategories.includes(category.id);

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={cn(
                          'rounded-[1.75rem] border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-card-lg',
                          isSelected
                            ? 'border-primary bg-primary-light/40 shadow-card dark:bg-primary/20'
                            : 'border-gray-100 bg-white dark:border-white/10 dark:bg-surface-ink',
                        )}
                      >
                        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', isSelected ? 'bg-primary text-white' : 'bg-surface text-gray-500 dark:bg-surface-inkSoft')}>
                          <Icon size={20} />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-on-surface dark:text-gray-100">{category.label}</p>
                        <p className="mt-2 text-sm leading-7 text-gray-400">{category.hint}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[1.75rem] bg-primary-deeper p-5 text-white">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary">
                      <Info size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Combine mais de uma categoria na mesma entrega.</p>
                      <p className="mt-2 text-sm leading-7 text-primary-muted">
                        Você pode selecionar quantas quiser — elas serão organizadas no resumo antes de confirmar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="quantidade"
                      className="mb-2 block px-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400"
                    >
                      Quantidade estimada
                    </label>
                    <div className="flex items-stretch gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = getEstimatedQuantity(quantity) || 0;
                          const next = Math.max(0, current - 1);
                          setQuantity(next === 0 ? '' : String(next));
                        }}
                        aria-label="Diminuir quantidade"
                        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-400"
                        disabled={getEstimatedQuantity(quantity) <= 0}
                      >
                        <Minus size={18} />
                      </button>
                      <input
                        id="quantidade"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        placeholder="0"
                        value={quantity}
                        onChange={(event) => {
                          const raw = event.target.value;
                          if (raw === '') {
                            setQuantity('');
                            return;
                          }
                          const digits = raw.replace(/[^0-9]/g, '');
                          setQuantity(digits);
                        }}
                        className="h-14 flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-center text-lg font-bold text-primary-deeper outline-none transition-colors placeholder:text-gray-300 focus:border-primary dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100 dark:placeholder:text-gray-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = getEstimatedQuantity(quantity) || 0;
                          setQuantity(String(current + 1));
                        }}
                        aria-label="Aumentar quantidade"
                        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-400"
                      >
                        <PlusIcon size={18} />
                      </button>
                    </div>
                    <p className="mt-2 px-1 text-xs text-gray-400">
                      Informe quantas peças (ou pares) você planeja entregar.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="volume"
                      className="mb-2 block px-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400"
                    >
                      Volume (tipo de embalagem)
                    </label>
                    <div className="relative">
                      <select
                        id="volume"
                        value={volume}
                        onChange={(event) => setVolume(event.target.value)}
                        className="h-14 w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 pr-12 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100"
                      >
                        {volumeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option} — {volumeHints[option]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={18}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                    <p className="mt-2 px-1 text-xs text-gray-400">
                      Escolha o recipiente que melhor representa o volume — isso ajuda o ponto
                      de coleta a reservar espaço.
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Observações</p>
                    <textarea
                      rows={4}
                      placeholder="Opcional: tamanhos, peças mais sensíveis ou contexto útil."
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="w-full resize-none rounded-[1.75rem] border border-gray-100 bg-surface px-5 py-4 text-sm text-on-surface outline-none transition-colors placeholder:text-gray-400 focus:border-primary focus:bg-white dark:border-white/10 dark:bg-surface-ink dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-surface-inkSoft"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.75rem] bg-surface p-5 dark:bg-surface-ink">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Condição das peças</p>
                    <div className="mt-3 space-y-3">
                      {conditions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCondition(item.id)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-[1.5rem] px-4 py-4 text-left transition-all',
                            condition === item.id
                              ? 'bg-primary-deeper text-white'
                              : 'bg-white text-gray-600 shadow-sm hover:shadow-card dark:bg-surface-inkSoft dark:text-gray-100',
                          )}
                        >
                          <div className={cn('mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', condition === item.id ? 'bg-white/15 text-white' : 'bg-primary-light text-primary dark:bg-primary/20')}>
                            <Check size={15} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{item.label}</p>
                            <p className={cn('mt-1 text-sm leading-7', condition === item.id ? 'text-white/75' : 'text-gray-400')}>
                              {item.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] bg-primary-light/45 p-5 dark:bg-primary/10">
                    <p className="text-sm font-semibold text-primary-deeper dark:text-white">
                      Dica rápida
                    </p>
                    <p className="mt-2 text-sm leading-7 text-gray-500">
                      Quanto mais precisa a quantidade informada, mais fácil o ponto de coleta
                      separa o espaço para sua entrega.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="rounded-[1.75rem] bg-primary-light/45 p-5 dark:bg-primary/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary-deeper dark:text-white">Escolha um ponto parceiro.</p>
                      <p className="mt-2 text-sm leading-7 text-gray-500">
                        Só pontos de coleta com ONG ativa podem finalizar a doação. Pontos ainda em estruturação continuam visíveis como indisponíveis.
                      </p>
                    </div>
                    <Link href={mapSelectionHref} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Explorar no mapa
                      <ChevronRight size={15} />
                    </Link>
                  </div>
                </div>

                {selectionFeedback && (
                  <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-400">
                    {selectionFeedback}
                  </div>
                )}

                {pointsLoading ? (
                  <div className="flex items-center gap-3 rounded-[1.75rem] bg-surface p-5 text-sm text-gray-500 dark:bg-surface-ink">
                    <Loader2 size={18} className="animate-spin text-primary" />
                    Carregando pontos de coleta próximos...
                  </div>
                ) : pointsError ? (
                  <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-400">
                    {pointsError}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {points.map((point) => {
                      const isSelected = point.id === pointId;
                      const canDonateHere = isDonationEligiblePoint(point);

                      return (
                        <button
                          key={point.id}
                          type="button"
                          onClick={() => {
                            if (!canDonateHere) {
                              return;
                            }

                            setPointId(point.id);
                            setPointsError(null);
                          }}
                          disabled={!canDonateHere}
                          className={cn(
                            'w-full rounded-[1.75rem] border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-card-lg',
                            isSelected
                              ? 'border-primary bg-primary-light/35 shadow-card dark:bg-primary/20'
                              : canDonateHere
                                ? 'border-gray-100 bg-white dark:border-white/10 dark:bg-surface-inkSoft'
                                : 'border-amber-200 bg-amber-50/70 text-gray-500 opacity-95 dark:border-amber-800/50 dark:bg-amber-900/10',
                            !canDonateHere && 'cursor-not-allowed hover:translate-y-0 hover:shadow-none',
                          )}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex gap-4">
                              <div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl', isSelected ? 'bg-primary text-white' : 'bg-surface text-gray-500 dark:bg-surface-ink')}>
                                <MapPin size={20} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-on-surface dark:text-gray-100">{point.organizationName ?? point.name}</p>
                                  {point.distanceKm != null && (
                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-primary shadow-sm dark:bg-surface-ink">
                                      {point.distanceKm} km
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm text-gray-400">
                                  {formatAddressSummary(point) ?? 'Endereço não informado'}
                                </p>
                                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                                  {point.acceptedCategories.map((item) => categoryLabels[item] ?? item).join(' - ')}
                                </p>
                                <p className="mt-2 text-sm leading-7 text-gray-500">
                                  {point.city} {point.state ? `- ${point.state}` : ''}
                                </p>
                                {point.donationEligibility && (
                                  <div
                                    className={cn(
                                      'mt-3 rounded-2xl px-3 py-2 text-xs leading-6',
                                      canDonateHere
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
                                    )}
                                  >
                                    <p className="font-semibold">{point.donationEligibility.label}</p>
                                    <p>{point.donationEligibility.message}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]',
                                isSelected
                                  ? 'bg-primary-deeper text-white'
                                  : canDonateHere
                                    ? 'bg-surface text-gray-400 dark:bg-surface-ink'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
                              )}
                            >
                              {isSelected
                                ? 'Selecionado'
                                : point.donationEligibility?.label ?? 'Disponível'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.75rem] bg-surface p-5 dark:bg-surface-ink">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Tipo da doação</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCategories.map((categoryId) => {
                        const label = categories.find((item) => item.id === categoryId)?.label ?? categoryId;
                        return (
                          <span key={categoryId} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-primary shadow-sm dark:bg-surface-inkSoft">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] bg-surface p-5 dark:bg-surface-ink">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Detalhes</p>
                    <p className="mt-3 text-sm font-semibold text-on-surface dark:text-gray-100">{quantity || 'Quantidade pendente'}</p>
                    <p className="mt-1 text-sm text-gray-400">{volume}</p>
                    <p className="mt-2 text-sm text-gray-500">
                      Condição: {conditions.find((item) => item.id === condition)?.label}
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] bg-surface p-5 dark:bg-surface-ink lg:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Ponto escolhido</p>
                    {selectedPoint && (
                      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-on-surface dark:text-gray-100">{selectedPoint.organizationName ?? selectedPoint.name}</p>
                            <p className="mt-1 text-sm text-gray-400">
                              {formatAddressSummary(selectedPoint) ?? 'Endereço não informado'}
                            </p>
                          {selectedPoint.donationEligibility && (
                            <p className="mt-2 text-sm text-gray-500">
                              {selectedPoint.donationEligibility.label}: {selectedPoint.donationEligibility.message}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-primary shadow-sm dark:bg-surface-inkSoft">
                          {selectedPoint.acceptedCategories.slice(0, 3).map((item) => categoryLabels[item] ?? item).join(' - ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.75rem] bg-primary-light/45 p-5 dark:bg-primary/10 lg:col-span-2">
                    <p className="text-sm font-semibold text-primary-deeper dark:text-white">Antes de confirmar</p>
                    <div className="mt-4 space-y-3">
                      {[
                        'As peças estão limpas e prontas para reaproveitamento.',
                        'O ponto escolhido está ativo e receberá sua doação.',
                        'Após concluir, você será redirecionado ao rastreio da doação criada.',
                      ].map((item) => (
                        <div key={item} className="flex items-start gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary dark:bg-surface-inkSoft">
                            <Check size={15} />
                          </div>
                          <p className="text-sm leading-7 text-gray-500">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <PostDonationRewardCard className="lg:col-span-2" reward={rewardPreview} />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-[1.75rem] border border-gray-100 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-surface-inkSoft">
                  <button
                    type="button"
                    onClick={() => setConfirmed((value) => !value)}
                    className={cn('mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors', confirmed ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-transparent dark:border-white/20 dark:bg-surface-ink')}
                  >
                    <Check size={12} />
                  </button>
                  <span className="text-sm leading-7 text-gray-500">
                    Confirmo que as peças estão limpas, em bom estado e prontas para seguir para o ponto selecionado.
                  </span>
                </label>
              </div>
            )}

            {submitError && (
              <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
                {submitError}
              </div>
            )}

            <div className="mt-8 border-t border-gray-100 pt-5 dark:border-white/10">
              <div className="xl:hidden">
                <SummaryCard
                  selectedCategories={selectedCategories}
                  quantity={quantity}
                  volume={volume}
                  condition={condition}
                  notes={notes}
                  selectedPoint={selectedPoint}
                  compact
                  reward={rewardPreview}
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 0 || loading}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors',
                    currentStep === 0 || loading
                      ? 'cursor-not-allowed bg-surface text-gray-300 dark:bg-surface-ink'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-300',
                  )}
                >
                  <ChevronLeft size={16} />
                  Voltar
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {currentStep < steps.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!canContinue || loading}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors',
                        canContinue && !loading ? 'bg-primary-deeper text-white hover:bg-primary-dark' : 'cursor-not-allowed bg-surface text-gray-300 dark:bg-surface-ink',
                      )}
                    >
                      Continuar
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={!canContinue || loading || !session?.user?.accessToken}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors',
                        canContinue && !loading && session?.user?.accessToken
                          ? 'bg-primary-deeper text-white hover:bg-primary-dark'
                          : 'cursor-not-allowed bg-surface text-gray-300 dark:bg-surface-ink',
                      )}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Registrando doação...
                        </>
                      ) : (
                        <>
                          Confirmar doação
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <Clock3 size={14} />
                Você pode voltar etapas anteriores sem perder o contexto preenchido.
              </div>
            </div>
          </section>

          <aside className="hidden xl:block">
            <div className="sticky top-[calc(var(--topbar-height)+1rem)]">
              <SummaryCard
                selectedCategories={selectedCategories}
                quantity={quantity}
                volume={volume}
                condition={condition}
                notes={notes}
                selectedPoint={selectedPoint}
                reward={rewardPreview}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
