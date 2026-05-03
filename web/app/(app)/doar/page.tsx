'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Apple,
  BadgeCheck,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Footprints,
  Gamepad2,
  Info,
  Layers,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus as PlusIcon,
  Shirt,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { PostDonationRewardCard } from '@/components/gamification/impact-widgets';
import {
  createDonation,
  getCollectionPoint,
  getNearbyPoints,
  getUserDonations,
  type CollectionPoint,
  type DonationItemCondition,
  type DonationPackageSize,
  type DonationPackageType,
  type DonationRecord,
  type ItemCategory,
} from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';
import { calculateDonationPointsBreakdown } from '@/lib/donation-points';
import {
  buildPostDonationRewardFromBreakdown,
  type PostDonationReward,
} from '@/lib/gamification';
import { cn } from '@/lib/utils';

const steps = [
  { eyebrow: 'Etapa 1', short: 'Itens', title: 'O que você vai doar?', description: 'Adicione os grupos de itens com categoria, quantidade e estado.' },
  { eyebrow: 'Etapa 2', short: 'Embalagem', title: 'Como está embalado?', description: 'Informe quantas sacolas e caixas, com tamanhos, vão acompanhar a entrega.' },
  { eyebrow: 'Etapa 3', short: 'Ponto', title: 'Escolha o ponto de coleta', description: 'Selecione um parceiro real para receber a doação.' },
  { eyebrow: 'Etapa 4', short: 'Revisão', title: 'Revisão e confirmação', description: 'Confira os dados principais antes de concluir.' },
];

type CategoryOption = {
  id: ItemCategory;
  label: string;
  hint: string;
  icon: typeof Shirt;
};

const categoryOptions: CategoryOption[] = [
  { id: 'CLOTHING', label: 'Roupas', hint: 'Camisetas, calças, casacos, peças adultas e infantis', icon: Shirt },
  { id: 'SHOES', label: 'Calçados', hint: 'Tênis, sapatos, chinelos em pares', icon: Footprints },
  { id: 'ACCESSORIES', label: 'Acessórios', hint: 'Cintos, lenços, gorros, cachecóis', icon: Sparkles },
  { id: 'BAGS', label: 'Bolsas', hint: 'Mochilas, bolsas e necessaires', icon: ShoppingBag },
  { id: 'TOYS', label: 'Brinquedos', hint: 'Brinquedos limpos e completos', icon: Gamepad2 },
  { id: 'FOOD', label: 'Alimentos', hint: 'Alimentos não perecíveis dentro da validade', icon: Apple },
  { id: 'OTHER', label: 'Outros', hint: 'Cobertores, mantas e itens diversos', icon: Layers },
];

const conditionOptions: { id: DonationItemCondition; label: string; description: string }[] = [
  { id: 'EXCELLENT', label: 'Em ótimo estado', description: 'Prontas para uso imediato (rende +5 pts/item).' },
  { id: 'GOOD', label: 'Usadas, mas conservadas', description: 'Com bom potencial de reaproveitamento.' },
];

const packageTypeOptions: { id: DonationPackageType; label: string }[] = [
  { id: 'BAG', label: 'Sacola' },
  { id: 'BOX', label: 'Caixa' },
];

const packageSizeOptions: { id: DonationPackageSize; label: string; hint: string }[] = [
  { id: 'SMALL', label: 'Pequena', hint: 'cerca de 3 a 8 peças' },
  { id: 'MEDIUM', label: 'Média', hint: 'cerca de 9 a 20 peças' },
  { id: 'LARGE', label: 'Grande', hint: 'cerca de 20 a 40 peças' },
];

const categoryLabels: Record<string, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  TOYS: 'Brinquedos',
  FOOD: 'Alimentos',
  OTHER: 'Outros',
};

type DonationItemDraft = {
  id: string;
  category: ItemCategory;
  quantity: number;
  condition: DonationItemCondition;
};

type DonationPackageDraft = {
  id: string;
  type: DonationPackageType;
  size: DonationPackageSize;
  quantity: number;
};

type DonationDraft = {
  currentStep: number;
  items: DonationItemDraft[];
  packages: DonationPackageDraft[];
  notes: string;
  pointId: string;
  confirmed: boolean;
};

const DONATION_DRAFT_STORAGE_KEY = 'vestgo:donation-draft-v2';
const DEFAULT_DISCOVERY_CENTER = { lat: -23.50153, lng: -47.45256 };

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultItems(): DonationItemDraft[] {
  return [
    { id: makeId(), category: 'CLOTHING', quantity: 5, condition: 'GOOD' },
  ];
}

function defaultPackages(): DonationPackageDraft[] {
  return [{ id: makeId(), type: 'BAG', size: 'MEDIUM', quantity: 1 }];
}

function defaultDraft(): DonationDraft {
  return {
    currentStep: 0,
    items: defaultItems(),
    packages: defaultPackages(),
    notes: '',
    pointId: '',
    confirmed: false,
  };
}

function isItemCategory(value: unknown): value is ItemCategory {
  return categoryOptions.some((entry) => entry.id === value);
}

function isCondition(value: unknown): value is DonationItemCondition {
  return value === 'EXCELLENT' || value === 'GOOD';
}

function isPackageType(value: unknown): value is DonationPackageType {
  return value === 'BAG' || value === 'BOX';
}

function isPackageSize(value: unknown): value is DonationPackageSize {
  return value === 'SMALL' || value === 'MEDIUM' || value === 'LARGE';
}

function readDonationDraft(): DonationDraft {
  if (typeof window === 'undefined') return defaultDraft();
  const raw = window.sessionStorage.getItem(DONATION_DRAFT_STORAGE_KEY);
  if (!raw) return defaultDraft();

  try {
    const parsed = JSON.parse(raw) as Partial<DonationDraft>;
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .filter(
            (entry): entry is DonationItemDraft =>
              !!entry &&
              isItemCategory((entry as DonationItemDraft).category) &&
              typeof (entry as DonationItemDraft).quantity === 'number' &&
              (entry as DonationItemDraft).quantity > 0 &&
              isCondition((entry as DonationItemDraft).condition),
          )
          .map((entry) => ({
            id: typeof entry.id === 'string' && entry.id ? entry.id : makeId(),
            category: entry.category,
            quantity: Math.max(1, Math.min(200, Math.floor(entry.quantity))),
            condition: entry.condition,
          }))
      : [];

    const packages = Array.isArray(parsed.packages)
      ? parsed.packages
          .filter(
            (entry): entry is DonationPackageDraft =>
              !!entry &&
              isPackageType((entry as DonationPackageDraft).type) &&
              isPackageSize((entry as DonationPackageDraft).size) &&
              typeof (entry as DonationPackageDraft).quantity === 'number' &&
              (entry as DonationPackageDraft).quantity > 0,
          )
          .map((entry) => ({
            id: typeof entry.id === 'string' && entry.id ? entry.id : makeId(),
            type: entry.type,
            size: entry.size,
            quantity: Math.max(1, Math.min(50, Math.floor(entry.quantity))),
          }))
      : [];

    return {
      currentStep:
        typeof parsed.currentStep === 'number'
          ? Math.min(Math.max(parsed.currentStep, 0), steps.length - 1)
          : 0,
      items: items.length > 0 ? items : defaultItems(),
      packages: packages.length > 0 ? packages : defaultPackages(),
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      pointId: typeof parsed.pointId === 'string' ? parsed.pointId : '',
      confirmed: parsed.confirmed === true,
    };
  } catch {
    return defaultDraft();
  }
}

function mergeCollectionPoints(primary: CollectionPoint[], secondary: CollectionPoint[]) {
  const map = new Map<string, CollectionPoint>();
  [...primary, ...secondary].forEach((point) => {
    map.set(point.id, point);
  });
  return Array.from(map.values());
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

function isDonationEligiblePoint(point: CollectionPoint | null | undefined) {
  return point?.role === 'COLLECTION_POINT' && point.donationEligibility?.canDonateHere === true;
}

function sortPointsForDonation(points: CollectionPoint[]) {
  return [...points].sort((left, right) => {
    const leftEligible = isDonationEligiblePoint(left) ? 1 : 0;
    const rightEligible = isDonationEligiblePoint(right) ? 1 : 0;
    if (leftEligible !== rightEligible) return rightEligible - leftEligible;
    return (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY);
  });
}

function describePackage(pkg: DonationPackageDraft) {
  const typeLabel = packageTypeOptions.find((option) => option.id === pkg.type)?.label ?? pkg.type;
  const sizeLabel = packageSizeOptions.find((option) => option.id === pkg.size)?.label ?? pkg.size;
  return `${pkg.quantity}x ${typeLabel.toLowerCase()} ${sizeLabel.toLowerCase()}`;
}

function describeItem(item: DonationItemDraft) {
  const categoryLabel = categoryLabels[item.category] ?? item.category;
  const conditionLabel = item.condition === 'EXCELLENT' ? 'ótimo estado' : 'bom estado';
  return `${item.quantity} ${categoryLabel.toLowerCase()} (${conditionLabel})`;
}

type SummaryCardProps = {
  items: DonationItemDraft[];
  packages: DonationPackageDraft[];
  notes: string;
  selectedPoint: CollectionPoint | null;
  reward: PostDonationReward;
  totalItems: number;
  uniqueCategories: number;
  multiplierLabel: string;
  compact?: boolean;
};

function SummaryCard({
  items,
  packages,
  notes,
  selectedPoint,
  reward,
  totalItems,
  uniqueCategories,
  multiplierLabel,
  compact = false,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        'rounded-[2rem] bg-white shadow-card dark:bg-surface-inkSoft dark:shadow-none',
        compact ? 'p-5' : 'p-6 lg:p-7',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Resumo da doação</p>
          <h2 className="mt-2 text-xl font-bold text-primary-deeper dark:text-white">O que já foi definido</h2>
        </div>
        <BadgeCheck size={20} className="text-primary" />
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-3xl bg-surface p-4 dark:bg-surface-ink">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Itens</p>
          <ul className="mt-2 space-y-1">
            {items.length === 0 ? (
              <li className="text-sm text-gray-400">Nenhum item adicionado.</li>
            ) : (
              items.map((item) => (
                <li key={item.id} className="text-sm font-medium text-on-surface dark:text-gray-100">
                  · {describeItem(item)}
                </li>
              ))
            )}
          </ul>
          <p className="mt-3 text-xs text-gray-400">
            {totalItems} item(ns) · {uniqueCategories} categoria(s) · multiplicador {multiplierLabel}
          </p>
        </div>

        <div className="rounded-3xl bg-surface p-4 dark:bg-surface-ink">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Embalagem</p>
          {packages.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">Sem embalagens declaradas.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {packages.map((pkg) => (
                <li key={pkg.id} className="text-sm font-medium text-on-surface dark:text-gray-100">
                  · {describePackage(pkg)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl bg-surface p-4 dark:bg-surface-ink">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Ponto de coleta</p>
          {selectedPoint ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">
                {selectedPoint.organizationName ?? selectedPoint.name}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {selectedPoint.distanceKm ? `${selectedPoint.distanceKm} km - ` : ''}
                {formatAddressSummary(selectedPoint) ?? 'Endereço não informado'}
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
          <p className="text-sm font-semibold text-primary-deeper dark:text-white">
            Pontuação prevista: até +{reward.potentialPoints} pontos
          </p>
          <p className="mt-1 text-xs text-gray-500">{reward.confirmationLabel}</p>
          <p className="mt-1 text-xs text-gray-500">{reward.distributionLabel}</p>
          <p className="mt-2 text-xs leading-5 text-gray-500">{reward.pendingPointsLabel}</p>
        </div>

        {notes && (
          <div className="rounded-3xl bg-surface p-4 dark:bg-surface-ink">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Observações</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">{notes}</p>
          </div>
        )}
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
  const [items, setItems] = useState<DonationItemDraft[]>(() => defaultItems());
  const [packages, setPackages] = useState<DonationPackageDraft[]>(() => defaultPackages());
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
  const [showPreselectedPointNotice, setShowPreselectedPointNotice] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && !isDonor) {
      router.replace('/inicio');
    }
  }, [isDonor, router, status]);

  useEffect(() => {
    const draft = readDonationDraft();
    setCurrentStep(draft.currentStep);
    setItems(draft.items);
    setPackages(draft.packages);
    setNotes(draft.notes);
    setPointId(draft.pointId);
    setConfirmed(draft.confirmed);
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    const selectedPointId = searchParams.get('selectedPointId');
    const selectionApplied = searchParams.get('selectionApplied') === '1';
    const source = searchParams.get('source');
    const stepParam = searchParams.get('step');

    if (!selectedPointId && !selectionApplied && !stepParam && !source) return;

    const cameFromPointProfile = source === 'point-profile';

    if (selectedPointId) {
      setPointId(selectedPointId);
      setConfirmed(false);
      setShowPreselectedPointNotice(cameFromPointProfile);
    }

    if (selectionApplied) {
      setSelectionFeedback(
        cameFromPointProfile ? null : 'Ponto selecionado. Você poderá revisar antes de finalizar.',
      );
    }

    const parsedStep = Number.parseInt(stepParam ?? (cameFromPointProfile ? '0' : '2'), 10);
    if (Number.isFinite(parsedStep)) {
      setCurrentStep(Math.min(Math.max(parsedStep, 0), steps.length - 1));
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('selectedPointId');
    nextParams.delete('selectionApplied');
    nextParams.delete('source');
    nextParams.delete('returnStep');
    nextParams.delete('step');
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [draftReady, pathname, router, searchParams]);

  useEffect(() => {
    if (!draftReady || !isDonor || typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      DONATION_DRAFT_STORAGE_KEY,
      JSON.stringify({
        currentStep,
        items,
        packages,
        notes,
        pointId,
        confirmed,
      } satisfies DonationDraft),
    );
  }, [confirmed, currentStep, draftReady, isDonor, items, notes, packages, pointId]);

  useEffect(() => {
    if (!draftReady || !pointId || points.some((item) => item.id === pointId)) return;

    let cancelled = false;

    async function loadSelectedPoint() {
      try {
        const point = await getCollectionPoint(pointId, { forDonation: true });
        if (cancelled || point.role !== 'COLLECTION_POINT') return;
        setPoints((current) => mergeCollectionPoints([point], current));

        if (!isDonationEligiblePoint(point)) {
          setPointId('');
          setConfirmed(false);
          setShowPreselectedPointNotice(false);
          setPointsError(point.donationEligibility?.message ?? 'Este ponto ainda não pode finalizar doações.');
        } else {
          setPointsError(null);
        }
      } catch {
        if (!cancelled) {
          setPointId('');
          setConfirmed(false);
          setShowPreselectedPointNotice(false);
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
        if (firstEligiblePoint) setPointId((current) => current || firstEligiblePoint.id);
        if (donationsResponse) setExistingDonations(donationsResponse.data);

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
    if (!pointId) return;
    const currentPoint = points.find((item) => item.id === pointId);
    if (!currentPoint || isDonationEligiblePoint(currentPoint)) return;

    setPointId('');
    setConfirmed(false);
    setShowPreselectedPointNotice(false);
    setPointsError(currentPoint.donationEligibility?.message ?? 'Este ponto ainda não pode finalizar doações.');
  }, [pointId, points]);

  const breakdown = useMemo(
    () =>
      calculateDonationPointsBreakdown({
        items: items.map((item) => ({
          category: item.category,
          quantity: item.quantity,
          condition: item.condition,
        })),
        status: 'PENDING',
      }),
    [items],
  );

  const monthlyDonationCount = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return existingDonations.filter((donation) => {
      const date = new Date(donation.createdAt);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      return key === monthKey;
    }).length;
  }, [existingDonations]);

  const rewardPreview = useMemo(
    () =>
      buildPostDonationRewardFromBreakdown({
        items: items.map((item) => ({
          category: item.category,
          quantity: item.quantity,
          condition: item.condition,
        })),
        monthlyGoalCurrent: monthlyDonationCount,
      }),
    [items, monthlyDonationCount],
  );

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
  const selectedPointLabel = selectedPoint?.organizationName ?? selectedPoint?.name ?? null;
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const totalItems = breakdown.totalItems;
  const totalPackagesCount = packages.reduce((sum, pkg) => sum + pkg.quantity, 0);
  const multiplierLabel = `${breakdown.categoryMultiplier.toFixed(1).replace('.', ',')}x`;
  const mapSelectionParams = new URLSearchParams({
    mode: 'select-point',
    returnTo: '/doar',
    source: 'donation-flow',
    returnStep: '2',
  });

  if (pointId) mapSelectionParams.set('selectedPointId', pointId);
  const mapSelectionHref = `/mapa?${mapSelectionParams.toString()}`;
  const canContinue =
    currentStep === 0
      ? totalItems > 0
      : currentStep === 1
        ? totalPackagesCount > 0
        : currentStep === 2
          ? isDonationEligiblePoint(selectedPoint)
          : confirmed && isDonationEligiblePoint(selectedPoint);

  function updateItem(id: string, patch: Partial<DonationItemDraft>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { id: makeId(), category: 'CLOTHING', quantity: 1, condition: 'GOOD' },
    ]);
  }

  function removeItem(id: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  }

  function updatePackage(id: string, patch: Partial<DonationPackageDraft>) {
    setPackages((current) => current.map((pkg) => (pkg.id === id ? { ...pkg, ...patch } : pkg)));
  }

  function addPackage() {
    setPackages((current) => [
      ...current,
      { id: makeId(), type: 'BAG', size: 'MEDIUM', quantity: 1 },
    ]);
  }

  function removePackage(id: string) {
    setPackages((current) => (current.length === 1 ? current : current.filter((pkg) => pkg.id !== id)));
  }

  function scrollToStepTop() {
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
    setTimeout(scrollToStepTop, 50);
  }

  function handleBack() {
    if (currentStep === 0) return;
    setCurrentStep((value) => value - 1);
    setTimeout(scrollToStepTop, 50);
  }

  async function handleConfirm() {
    if (!confirmed || !session?.user?.accessToken || !selectedPoint) return;

    const donationInput = {
      collectionPointId: selectedPoint.id,
      notes: notes ? notes.trim() : undefined,
      items: items.map((item) => {
        const categoryLabel = categoryLabels[item.category] ?? item.category;
        return {
          name: categoryLabel,
          category: item.category,
          quantity: item.quantity,
          condition: item.condition,
        };
      }),
      packages: packages.map((pkg) => ({
        type: pkg.type,
        size: pkg.size,
        quantity: pkg.quantity,
      })),
    };

    setLoading(true);
    setSubmitError(null);

    try {
      const donation = await createDonation(donationInput, session.user.accessToken);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(DONATION_DRAFT_STORAGE_KEY);
      }
      router.push(`/rastreio/${donation.id}?celebrate=registered`);
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
              Preencha cada passo para registrar sua doação com segurança. Os pontos só entram quando o ponto de coleta confirmar o recebimento.
            </p>
          </div>
        </div>

        <div ref={stepCardRef} className="rounded-[2rem] bg-white p-4 shadow-card dark:bg-surface-inkSoft dark:shadow-none sm:p-5 lg:p-6">
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
            {showPreselectedPointNotice && currentStep < 2 && (
              <div className="mb-5 rounded-[1.5rem] border border-primary/15 bg-primary-light/45 px-4 py-3 text-sm text-primary-deeper dark:border-primary/30 dark:bg-primary/10 dark:text-primary-muted">
                Ponto selecionado{selectedPointLabel ? `: ${selectedPointLabel}` : ''}. Agora informe os itens da doação.
              </div>
            )}

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
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const Icon = categoryOptions.find((option) => option.id === item.category)?.icon ?? Package;
                    return (
                      <div
                        key={item.id}
                        className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-ink"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20">
                              <Icon size={20} />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                Grupo {index + 1}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-primary-deeper dark:text-white">
                                {categoryLabels[item.category] ?? item.category}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                            className={cn(
                              'inline-flex h-9 w-9 items-center justify-center rounded-xl border text-gray-500 transition-colors',
                              items.length === 1
                                ? 'cursor-not-allowed border-gray-100 bg-surface opacity-60 dark:border-white/10 dark:bg-surface-inkSoft'
                                : 'border-gray-200 hover:border-red-200 hover:text-red-500 dark:border-white/10',
                            )}
                            aria-label="Remover grupo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                              Categoria
                            </label>
                            <select
                              value={item.category}
                              onChange={(event) => updateItem(item.id, { category: event.target.value as ItemCategory })}
                              className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-medium text-on-surface dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100"
                            >
                              {categoryOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label} — {option.hint}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                              Quantidade
                            </label>
                            <div className="mt-2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                                className="flex h-12 w-10 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:text-primary dark:border-white/10"
                                aria-label="Diminuir"
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={200}
                                value={item.quantity}
                                onChange={(event) => {
                                  const next = Math.max(1, Math.min(200, Number.parseInt(event.target.value, 10) || 1));
                                  updateItem(item.id, { quantity: next });
                                }}
                                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-base font-bold text-primary-deeper dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { quantity: Math.min(200, item.quantity + 1) })}
                                className="flex h-12 w-10 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:text-primary dark:border-white/10"
                                aria-label="Aumentar"
                              >
                                <PlusIcon size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Condição das peças</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {conditionOptions.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => updateItem(item.id, { condition: option.id })}
                                className={cn(
                                  'rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                                  item.condition === option.id
                                    ? 'border-primary bg-primary-light/40 text-primary-deeper dark:bg-primary/20 dark:text-white'
                                    : 'border-gray-200 bg-white text-gray-500 hover:border-primary dark:border-white/10 dark:bg-surface-inkSoft',
                                )}
                              >
                                <p className="font-semibold">{option.label}</p>
                                <p className="mt-1 text-xs text-gray-500">{option.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary-light/30 px-4 py-3 text-sm font-semibold text-primary hover:border-primary dark:bg-primary/10"
                >
                  <PlusIcon size={16} />
                  Adicionar outro grupo (categoria + quantidade)
                </button>

                <div className="rounded-[1.75rem] bg-primary-deeper p-5 text-white">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary">
                      <Info size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Pontos só entram após confirmação no ponto de coleta.</p>
                      <p className="mt-2 text-sm leading-7 text-primary-muted">
                        Cada item vale 10 pontos quando o ponto confirmar o recebimento. Itens em ótimo estado adicionam +5 pontos cada. Mais categorias aumentam o multiplicador do reconhecimento.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="space-y-3">
                  {packages.map((pkg, index) => (
                    <div
                      key={pkg.id}
                      className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-ink"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20">
                            {pkg.type === 'BOX' ? <Box size={20} /> : <ShoppingBag size={20} />}
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                              Volume {index + 1}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-primary-deeper dark:text-white">
                              {describePackage(pkg)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePackage(pkg.id)}
                          disabled={packages.length === 1}
                          className={cn(
                            'inline-flex h-9 w-9 items-center justify-center rounded-xl border text-gray-500 transition-colors',
                            packages.length === 1
                              ? 'cursor-not-allowed border-gray-100 bg-surface opacity-60 dark:border-white/10 dark:bg-surface-inkSoft'
                              : 'border-gray-200 hover:border-red-200 hover:text-red-500 dark:border-white/10',
                          )}
                          aria-label="Remover volume"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Tipo</label>
                          <select
                            value={pkg.type}
                            onChange={(event) =>
                              updatePackage(pkg.id, { type: event.target.value as DonationPackageType })
                            }
                            className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-medium dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100"
                          >
                            {packageTypeOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Tamanho</label>
                          <select
                            value={pkg.size}
                            onChange={(event) =>
                              updatePackage(pkg.id, { size: event.target.value as DonationPackageSize })
                            }
                            className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-medium dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100"
                          >
                            {packageSizeOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label} — {option.hint}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Quantos</label>
                          <div className="mt-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updatePackage(pkg.id, { quantity: Math.max(1, pkg.quantity - 1) })}
                              className="flex h-12 w-10 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:text-primary dark:border-white/10"
                              aria-label="Diminuir"
                            >
                              <Minus size={16} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={pkg.quantity}
                              onChange={(event) => {
                                const next = Math.max(1, Math.min(50, Number.parseInt(event.target.value, 10) || 1));
                                updatePackage(pkg.id, { quantity: next });
                              }}
                              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-base font-bold text-primary-deeper dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => updatePackage(pkg.id, { quantity: Math.min(50, pkg.quantity + 1) })}
                              className="flex h-12 w-10 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:text-primary dark:border-white/10"
                              aria-label="Aumentar"
                            >
                              <PlusIcon size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addPackage}
                  className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary-light/30 px-4 py-3 text-sm font-semibold text-primary hover:border-primary dark:bg-primary/10"
                >
                  <PlusIcon size={16} />
                  Adicionar outro volume
                </button>

                <div>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Observações</p>
                  <textarea
                    rows={4}
                    placeholder="Opcional: tamanhos, peças mais sensíveis ou contexto útil para o ponto de coleta."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full resize-none rounded-[1.75rem] border border-gray-100 bg-surface px-5 py-4 text-sm text-on-surface outline-none placeholder:text-gray-400 focus:border-primary focus:bg-white dark:border-white/10 dark:bg-surface-ink dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-surface-inkSoft"
                  />
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
                            if (!canDonateHere) return;
                            setPointId(point.id);
                            setPointsError(null);
                            setShowPreselectedPointNotice(false);
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Itens declarados</p>
                    <ul className="mt-3 space-y-2">
                      {items.map((item) => (
                        <li key={item.id} className="text-sm text-on-surface dark:text-gray-100">
                          · {describeItem(item)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-gray-500">
                      Total: {totalItems} item(ns) · {breakdown.uniqueCategories} categoria(s) · multiplicador {multiplierLabel}
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] bg-surface p-5 dark:bg-surface-ink">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Embalagem</p>
                    <ul className="mt-3 space-y-2">
                      {packages.map((pkg) => (
                        <li key={pkg.id} className="text-sm text-on-surface dark:text-gray-100">
                          · {describePackage(pkg)}
                        </li>
                      ))}
                    </ul>
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
                        'O cadastro inicial não credita pontos automaticamente — eles entram quando o ponto confirmar o recebimento.',
                        'Após distribuição pela ONG você pode receber pontos adicionais.',
                      ].map((entry) => (
                        <div key={entry} className="flex items-start gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary dark:bg-surface-inkSoft">
                            <Check size={15} />
                          </div>
                          <p className="text-sm leading-7 text-gray-500">{entry}</p>
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
                  items={items}
                  packages={packages}
                  notes={notes}
                  selectedPoint={selectedPoint}
                  reward={rewardPreview}
                  totalItems={totalItems}
                  uniqueCategories={breakdown.uniqueCategories}
                  multiplierLabel={multiplierLabel}
                  compact
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
                items={items}
                packages={packages}
                notes={notes}
                selectedPoint={selectedPoint}
                reward={rewardPreview}
                totalItems={totalItems}
                uniqueCategories={breakdown.uniqueCategories}
                multiplierLabel={multiplierLabel}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
