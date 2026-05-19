'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import {
  createDonation,
  getCollectionPoint,
  getNearbyPoints,
  getUserDonations,
  type CollectionPoint,
  type DonationRecord,
  type ItemCategory,
} from '@/lib/api';
import {
  DonationButton,
  DonationStepper,
  DonationSuccessPanel,
  DonationSummaryCard,
  CollectionPointStep,
  ItemsStep,
  LoadingDonationState,
  NonDonorState,
  PackagingStep,
  ReviewStep,
  categoryLabels,
  clampItemQuantity,
  clampPackageQuantity,
  getPointAvailability,
  isCondition,
  isItemCategory,
  isPackageMode,
  isPackageSize,
  isPackageType,
  sortCollectionPointsForDonation,
  type DonationItemDraft,
  type DonationPackageDraft,
  type PackageMode,
  type StepConfig,
} from '@/components/donations/new-donation-flow';
import { estimatePackagesFromItems } from '@/lib/donation-package-estimator';

const steps: StepConfig[] = [
  {
    eyebrow: 'Etapa 1',
    short: 'Itens',
    title: 'O que você quer doar?',
    description: 'Escolha as categorias e ajuste as quantidades. Você poderá revisar tudo antes de confirmar.',
  },
  {
    eyebrow: 'Etapa 2',
    short: 'Embalagem',
    title: 'Como você vai levar a doação?',
    description: 'Sugerimos uma embalagem com base nos itens. Se precisar, você pode ajustar.',
  },
  {
    eyebrow: 'Etapa 3',
    short: 'Ponto',
    title: 'Escolha o ponto de coleta',
    description: 'Escolha um ponto próximo que receba os itens da sua doação.',
  },
  {
    eyebrow: 'Etapa 4',
    short: 'Revisão',
    title: 'Revisão da doação',
    description: 'Confira rapidamente e confirme para registrar sua doação.',
  },
];

type DonationDraft = {
  currentStep: number;
  items: DonationItemDraft[];
  packages: DonationPackageDraft[];
  packageMode: PackageMode;
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
  return [];
}

function defaultPackages(): DonationPackageDraft[] {
  return [{ id: makeId(), type: 'BAG', size: 'MEDIUM', quantity: 1 }];
}

function defaultDraft(): DonationDraft {
  return {
    currentStep: 0,
    items: defaultItems(),
    packages: defaultPackages(),
    packageMode: 'AUTO',
    notes: '',
    pointId: '',
    confirmed: false,
  };
}

function sanitizeItems(value: unknown): DonationItemDraft[] {
  if (!Array.isArray(value)) return [];

  return value
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
      quantity: clampItemQuantity(entry.quantity),
      condition: entry.condition,
    }));
}

function sanitizePackages(value: unknown): DonationPackageDraft[] {
  if (!Array.isArray(value)) return [];

  return value
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
      quantity: clampPackageQuantity(entry.quantity),
    }));
}

function readDonationDraft(): DonationDraft {
  if (typeof window === 'undefined') return defaultDraft();

  const raw = window.sessionStorage.getItem(DONATION_DRAFT_STORAGE_KEY);

  if (!raw) return defaultDraft();

  try {
    const parsed = JSON.parse(raw) as Partial<DonationDraft>;
    const items = sanitizeItems(parsed.items);
    const packages = sanitizePackages(parsed.packages);

    return {
      currentStep:
        typeof parsed.currentStep === 'number'
          ? Math.min(Math.max(parsed.currentStep, 0), steps.length - 1)
          : 0,
      items,
      packages: packages.length > 0 ? packages : defaultPackages(),
      packageMode: isPackageMode(parsed.packageMode) ? parsed.packageMode : 'AUTO',
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

function clonePackagesForManual(packages: DonationPackageDraft[]) {
  return packages.map((pkg) => ({ ...pkg, id: makeId() }));
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
  const [packageMode, setPackageMode] = useState<PackageMode>('AUTO');
  const [notes, setNotes] = useState('');
  const [pointId, setPointId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [existingDonations, setExistingDonations] = useState<DonationRecord[]>([]);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [pointsNotice, setPointsNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null);
  const [showPreselectedPointNotice, setShowPreselectedPointNotice] = useState(false);
  const [createdDonationId, setCreatedDonationId] = useState<string | null>(null);
  const [attemptedSteps, setAttemptedSteps] = useState<Set<number>>(() => new Set());

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
    setPackageMode(draft.packageMode);
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
      setPointsNotice(null);
      setShowPreselectedPointNotice(cameFromPointProfile);
    }

    if (selectionApplied) {
      setSelectionFeedback(
        cameFromPointProfile ? null : 'Ponto selecionado. Voce podera revisar antes de finalizar.',
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
    if (!draftReady || !isDonor || typeof window === 'undefined' || createdDonationId) return;

    window.sessionStorage.setItem(
      DONATION_DRAFT_STORAGE_KEY,
      JSON.stringify({
        currentStep,
        items,
        packages,
        packageMode,
        notes,
        pointId,
        confirmed,
      } satisfies DonationDraft),
    );
  }, [confirmed, createdDonationId, currentStep, draftReady, isDonor, items, notes, packageMode, packages, pointId]);

  const selectedCategories = useMemo(() => items.map((item) => item.category), [items]);
  const automaticEstimate = useMemo(() => estimatePackagesFromItems(items), [items]);
  const effectivePackages = packageMode === 'AUTO' ? automaticEstimate.packages : packages;
  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const uniqueCategories = useMemo(() => new Set(items.map((item) => item.category)).size, [items]);
  const totalPackagesCount = useMemo(
    () => effectivePackages.reduce((sum, pkg) => sum + pkg.quantity, 0),
    [effectivePackages],
  );
  const usedPointIds = useMemo(() => {
    const ids = existingDonations
      .map((donation) => donation.collectionPoint?.id)
      .filter((value): value is string => Boolean(value));
    return new Set(ids);
  }, [existingDonations]);
  const sortedPoints = useMemo(
    () => sortCollectionPointsForDonation(points, selectedCategories, usedPointIds),
    [points, selectedCategories, usedPointIds],
  );
  const selectedPoint = points.find((point) => point.id === pointId) ?? null;
  const selectedPointAvailability = selectedPoint
    ? getPointAvailability(selectedPoint, selectedCategories)
    : null;
  const selectedPointLabel = selectedPoint?.organizationName ?? selectedPoint?.name ?? null;

  const mapSelectionParams = new URLSearchParams({
    mode: 'select-point',
    returnTo: '/doar',
    source: 'donation-flow',
    returnStep: '2',
  });

  if (pointId) mapSelectionParams.set('selectedPointId', pointId);
  const mapSelectionHref = `/mapa?${mapSelectionParams.toString()}`;

  const loadDonationContext = useCallback(async () => {
    if (status === 'loading' || !isDonor || !draftReady) return;

    setPointsLoading(true);
    setPointsError(null);
    setPointsNotice(null);

    try {
      const location = await getCurrentPosition();
      const nearbyPromise = getNearbyPoints({
        lat: location.lat,
        lng: location.lng,
        radius: 15,
        limit: 12,
        forDonation: true,
      });
      const donationsPromise = session?.user?.accessToken
        ? getUserDonations(session.user.accessToken, { limit: 50 })
        : Promise.resolve(null);

      const [nearby, donationsResponse] = await Promise.all([nearbyPromise, donationsPromise]);
      const collectionPointsOnly = nearby.data.filter((point) => point.role === 'COLLECTION_POINT');
      setPoints(collectionPointsOnly);

      if (donationsResponse) {
        setExistingDonations(donationsResponse.data);
      }

      if (collectionPointsOnly.length === 0) {
        setPointsError('Nenhum ponto de coleta foi encontrado agora.');
      }
    } catch {
      setPointsError('Não conseguimos carregar os pontos de coleta no momento. Tente novamente em instantes.');
    } finally {
      setPointsLoading(false);
    }
  }, [draftReady, isDonor, session?.user?.accessToken, status]);

  useEffect(() => {
    loadDonationContext();
  }, [loadDonationContext]);

  useEffect(() => {
    if (!draftReady || !pointId || points.some((point) => point.id === pointId)) return;

    let cancelled = false;

    async function loadSelectedPoint() {
      try {
        const point = await getCollectionPoint(pointId, { forDonation: true });
        if (cancelled || point.role !== 'COLLECTION_POINT') return;

        setPoints((current) => mergeCollectionPoints([point], current));

        const availability = getPointAvailability(point, selectedCategories);
        if (!availability.canSelect) {
          setPointId('');
          setConfirmed(false);
          setShowPreselectedPointNotice(false);
          setPointsNotice(availability.reason ?? 'Este ponto não pode receber os itens selecionados.');
        }
      } catch {
        if (!cancelled) {
          setPointId('');
          setConfirmed(false);
          setShowPreselectedPointNotice(false);
          setPointsNotice('O ponto escolhido anteriormente não está mais disponível. Escolha outro para seguir.');
        }
      }
    }

    loadSelectedPoint();

    return () => {
      cancelled = true;
    };
  }, [draftReady, pointId, points, selectedCategories]);

  useEffect(() => {
    if (!pointId || !selectedPoint) return;

    const availability = getPointAvailability(selectedPoint, selectedCategories);
    if (availability.canSelect) return;

    setPointId('');
    setConfirmed(false);
    setShowPreselectedPointNotice(false);
    setPointsNotice(availability.reason ?? 'O ponto escolhido não pode receber os itens selecionados.');
  }, [pointId, selectedCategories, selectedPoint]);

  const stepValidation = getStepValidation({
    currentStep,
    items,
    totalItems,
    effectivePackages,
    totalPackagesCount,
    selectedPoint,
    selectedPointAvailability,
    confirmed,
  });

  const visibleValidationMessage = attemptedSteps.has(currentStep) ? stepValidation : null;
  const step = steps[currentStep];

  if (status === 'loading' || !draftReady) {
    return (
      <LoadingDonationState
        label={status === 'loading' ? 'Carregando permissão de acesso...' : 'Recuperando seu rascunho da doação...'}
      />
    );
  }

  if (!isDonor) {
    return <NonDonorState />;
  }

  if (createdDonationId) {
    return (
      <DonationSuccessPanel
        selectedPointName={selectedPointLabel}
        onContinue={() => router.push(`/rastreio/${createdDonationId}?celebrate=registered`)}
        onViewDonations={() => router.push('/rastreio')}
      />
    );
  }

  function scrollToStepTop() {
    if (typeof window === 'undefined' || window.innerWidth >= 1024 || !stepCardRef.current) return;

    const topbarHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--topbar-height') || '64',
      10,
    );
    const rect = stepCardRef.current.getBoundingClientRect();
    window.scrollBy({ top: rect.top - topbarHeight - 12, behavior: 'smooth' });
  }

  function goToStep(nextStep: number) {
    setCurrentStep(Math.min(Math.max(nextStep, 0), steps.length - 1));
    setSubmitError(null);
    setTimeout(scrollToStepTop, 50);
  }

  function markStepAttempted(stepIndex: number) {
    setAttemptedSteps((current) => new Set(current).add(stepIndex));
  }

  function handleNext() {
    if (stepValidation || currentStep === steps.length - 1) {
      markStepAttempted(currentStep);
      return;
    }
    goToStep(currentStep + 1);
  }

  function handleBack() {
    if (loading) return;
    if (currentStep === 0) {
      router.push('/inicio');
      return;
    }
    goToStep(currentStep - 1);
  }

  function updateItem(id: string, patch: Partial<DonationItemDraft>) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              quantity: patch.quantity == null ? item.quantity : clampItemQuantity(patch.quantity),
            }
          : item,
      ),
    );
    setConfirmed(false);
  }

  function toggleCategory(category: ItemCategory) {
    setItems((current) => {
      const existing = current.find((item) => item.category === category);
      if (existing) return current.filter((item) => item.id !== existing.id);
      return [...current, { id: makeId(), category, quantity: 1, condition: 'GOOD' }];
    });
    setConfirmed(false);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setConfirmed(false);
  }

  function updatePackage(id: string, patch: Partial<DonationPackageDraft>) {
    setPackages((current) =>
      current.map((pkg) =>
        pkg.id === id
          ? {
              ...pkg,
              ...patch,
              quantity: patch.quantity == null ? pkg.quantity : clampPackageQuantity(patch.quantity),
            }
          : pkg,
      ),
    );
    setPackageMode('MANUAL');
    setConfirmed(false);
  }

  function addPackage() {
    setPackages((current) => [
      ...current,
      { id: makeId(), type: 'BAG', size: 'MEDIUM', quantity: 1 },
    ]);
    setPackageMode('MANUAL');
    setConfirmed(false);
  }

  function removePackage(id: string) {
    setPackages((current) => {
      const next = current.filter((pkg) => pkg.id !== id);
      return next.length > 0 ? next : current;
    });
    setPackageMode('MANUAL');
    setConfirmed(false);
  }

  function startManualPackaging() {
    setPackages(clonePackagesForManual(effectivePackages.length > 0 ? effectivePackages : defaultPackages()));
    setPackageMode('MANUAL');
    setConfirmed(false);
  }

  function useAutomaticPackaging() {
    setPackageMode('AUTO');
    setConfirmed(false);
  }

  function selectPoint(point: CollectionPoint) {
    const availability = getPointAvailability(point, selectedCategories);
    if (!availability.canSelect) {
      setPointsNotice(availability.reason ?? 'Este ponto não pode receber os itens selecionados.');
      return;
    }

    setPointId(point.id);
    setConfirmed(false);
    setPointsNotice(null);
    setPointsError(null);
    setSelectionFeedback('Ponto selecionado. Você poderá trocar antes de confirmar.');
    setShowPreselectedPointNotice(false);
  }

  async function handleConfirm() {
    const reviewValidation = getStepValidation({
      currentStep: 3,
      items,
      totalItems,
      effectivePackages,
      totalPackagesCount,
      selectedPoint,
      selectedPointAvailability,
      confirmed,
    });

    if (reviewValidation) {
      markStepAttempted(3);
      setSubmitError(null);
      return;
    }

    if (!session?.user?.accessToken || !selectedPoint) {
      setSubmitError('Sua sessão expirou. Entre novamente para confirmar a doação.');
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const donation = await createDonation(
        {
          collectionPointId: selectedPoint.id,
          notes: notes.trim() ? notes.trim() : undefined,
          items: items.map((item) => ({
            name: categoryLabels[item.category] ?? item.category,
            category: item.category,
            quantity: item.quantity,
            condition: item.condition,
          })),
          packages: effectivePackages.map((pkg) => ({
            type: pkg.type,
            size: pkg.size,
            quantity: pkg.quantity,
          })),
        },
        session.user.accessToken,
      );

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(DONATION_DRAFT_STORAGE_KEY);
      }

      setCreatedDonationId(donation.id);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível registrar a doação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Nova doacao</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary-deeper dark:text-white sm:text-4xl">
              Registrar uma nova doação
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
              Vamos te ajudar a preparar sua doação e escolher onde entregar.
            </p>
          </div>
        </div>

        <div ref={stepCardRef}>
          <DonationStepper
            steps={steps}
            currentStep={currentStep}
            canVisitStep={(index) => index <= currentStep}
            onStepClick={goToStep}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_360px]">
          <section className="rounded-[2rem] bg-white p-6 shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:p-8">
            {showPreselectedPointNotice && currentStep < 2 && (
              <div className="mb-5 rounded-[1.5rem] border border-primary/15 bg-primary-light/45 px-4 py-3 text-sm text-primary-deeper dark:border-primary/30 dark:bg-primary/10 dark:text-primary-muted">
                Ponto selecionado{selectedPointLabel ? `: ${selectedPointLabel}` : ''}. Agora informe os itens da doacao.
              </div>
            )}

            {selectionFeedback && currentStep === 2 && (
              <div className="mb-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                {selectionFeedback}
              </div>
            )}

            {selectionFeedback && currentStep === 2 && (
              <div className="mb-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                {selectionFeedback}
              </div>
            )}

            {selectionFeedback && currentStep === 2 && (
              <div className="mb-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                {selectionFeedback}
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
              <ItemsStep
                items={items}
                totalItems={totalItems}
                uniqueCategories={uniqueCategories}
                validationMessage={visibleValidationMessage}
                onToggleCategory={toggleCategory}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
              />
            )}

            {currentStep === 1 && (
              <PackagingStep
                packageMode={packageMode}
                automaticEstimate={automaticEstimate}
                packages={packages}
                notes={notes}
                validationMessage={visibleValidationMessage}
                onUseAuto={useAutomaticPackaging}
                onStartManual={startManualPackaging}
                onUpdatePackage={updatePackage}
                onAddPackage={addPackage}
                onRemovePackage={removePackage}
                onNotesChange={setNotes}
              />
            )}

            {currentStep === 2 && (
              <CollectionPointStep
                points={sortedPoints}
                pointsLoading={pointsLoading}
                pointsError={pointsError}
                pointsNotice={pointsNotice}
                selectedPointId={pointId}
                selectedCategories={selectedCategories}
                usedPointIds={usedPointIds}
                mapSelectionHref={mapSelectionHref}
                validationMessage={visibleValidationMessage}
                onSelectPoint={selectPoint}
                onRetry={loadDonationContext}
                onEditItems={() => goToStep(0)}
              />
            )}

            {currentStep === 3 && (
              <ReviewStep
                items={items}
                packages={effectivePackages}
                notes={notes}
                selectedPoint={selectedPoint}
                packageMode={packageMode}
                totalItems={totalItems}
                uniqueCategories={uniqueCategories}
                confirmed={confirmed}
                validationMessage={visibleValidationMessage}
                onEditStep={goToStep}
                onConfirmedChange={setConfirmed}
              />
            )}

            {submitError && (
              <div
                role="alert"
                className="mt-6 rounded-[1.5rem] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300"
              >
                {submitError}
              </div>
            )}

            <div className="sticky bottom-[calc(var(--mobile-bottom-nav-offset)+env(safe-area-inset-bottom))] z-20 -mx-6 mt-8 border-t border-gray-100 bg-white/95 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 backdrop-blur dark:border-white/10 dark:bg-surface-inkSoft/95 lg:static lg:-mx-8 lg:px-8 lg:pb-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <DonationButton
                  variant="secondary"
                  leftIcon={currentStep === 0 ? undefined : <ChevronLeft size={16} />}
                  onClick={handleBack}
                  disabled={loading}
                >
                  {currentStep === 0 ? 'Cancelar' : 'Voltar'}
                </DonationButton>

                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  {visibleValidationMessage && (
                    <p className="max-w-md text-xs leading-5 text-gray-500" aria-live="polite">
                      {visibleValidationMessage}
                    </p>
                  )}
                  {currentStep < steps.length - 1 ? (
                    <DonationButton
                      onClick={handleNext}
                      disabled={loading}
                      rightIcon={<ChevronRight size={16} />}
                      full
                      className="sm:w-auto"
                    >
                      Continuar
                    </DonationButton>
                  ) : (
                    <DonationButton
                      onClick={handleConfirm}
                      disabled={loading || !session?.user?.accessToken}
                      loading={loading}
                      rightIcon={<ChevronRight size={16} />}
                      full
                      className="sm:w-auto"
                    >
                      {loading ? 'Registrando doação...' : 'Confirmar doação'}
                    </DonationButton>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <Clock3 size={14} />
                Salvamos seu rascunho automaticamente neste dispositivo.
              </div>
            </div>
          </section>

          <aside className="hidden xl:block">
            <div className="sticky top-[calc(var(--topbar-height)+1rem)]">
              <DonationSummaryCard
                items={items}
                packages={effectivePackages}
                notes={notes}
                selectedPoint={selectedPoint}
                packageMode={packageMode}
                totalItems={totalItems}
                uniqueCategories={uniqueCategories}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

type StepValidationInput = {
  currentStep: number;
  items: DonationItemDraft[];
  totalItems: number;
  effectivePackages: DonationPackageDraft[];
  totalPackagesCount: number;
  selectedPoint: CollectionPoint | null;
  selectedPointAvailability: ReturnType<typeof getPointAvailability> | null;
  confirmed: boolean;
};

function getStepValidation({
  currentStep,
  items,
  totalItems,
  effectivePackages,
  totalPackagesCount,
  selectedPoint,
  selectedPointAvailability,
  confirmed,
}: StepValidationInput) {
  if (currentStep >= 0) {
    if (items.length === 0 || totalItems <= 0) {
      return 'Adicione pelo menos um item para seguir.';
    }

    const invalidItem = items.find((item) => item.quantity < 1 || item.quantity > 200);
    if (invalidItem) {
      return 'Revise as quantidades. Cada categoria precisa ter entre 1 e 200 itens.';
    }
  }

  if (currentStep >= 1) {
    if (effectivePackages.length === 0 || totalPackagesCount <= 0) {
      return 'Informe ao menos um volume para continuar.';
    }
  }

  if (currentStep >= 2) {
    if (!selectedPoint) {
      return 'Escolha um ponto de coleta para continuar.';
    }

    if (selectedPointAvailability?.canSelect !== true) {
      return selectedPointAvailability?.reason ?? 'Escolha um ponto compatível com os itens selecionados.';
    }
  }

  if (currentStep >= 3 && !confirmed) {
    return 'Confirme que os itens estão prontos para seguir ao ponto selecionado.';
  }

  return null;
}
