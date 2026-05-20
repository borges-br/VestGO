import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Apple,
  BadgeCheck,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Footprints,
  Gamepad2,
  Heart,
  Info,
  Layers,
  Loader2,
  Map as MapIcon,
  MapPin,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Shirt,
  ShoppingBag,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type {
  CollectionPoint,
  DonationItemCondition,
  DonationPackageSize,
  DonationPackageType,
  ItemCategory,
} from '@/lib/api';
import { formatAddressSummary } from '@/lib/address';
import { cn } from '@/lib/utils';

export const MAX_ITEM_QUANTITY = 200;
export const MAX_PACKAGE_QUANTITY = 50;

export type DonationItemDraft = {
  id: string;
  category: ItemCategory;
  quantity: number;
  condition: DonationItemCondition;
};

export type DonationPackageDraft = {
  id: string;
  type: DonationPackageType;
  size: DonationPackageSize;
  quantity: number;
};

export type PackageMode = 'AUTO' | 'MANUAL';

export type StepConfig = {
  eyebrow: string;
  short: string;
  title: string;
  description: string;
};

type CategoryTone = {
  iconBg: string;
  iconText: string;
  selectedBg: string;
  selectedBorder: string;
};

export type CategoryOption = {
  id: ItemCategory;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: CategoryTone;
};

export const categoryOptions: CategoryOption[] = [
  {
    id: 'CLOTHING',
    label: 'Roupas',
    hint: 'Camisetas, calças, casacos e peças infantis',
    icon: Shirt,
    tone: {
      iconBg: 'bg-primary-light',
      iconText: 'text-primary',
      selectedBg: 'bg-primary-light/70',
      selectedBorder: 'border-primary',
    },
  },
  {
    id: 'SHOES',
    label: 'Calçados',
    hint: 'Tênis, sapatos e chinelos em pares',
    icon: Footprints,
    tone: {
      iconBg: 'bg-accent-oliveSoft',
      iconText: 'text-accent-olive',
      selectedBg: 'bg-accent-oliveSoft/80',
      selectedBorder: 'border-accent-olive',
    },
  },
  {
    id: 'ACCESSORIES',
    label: 'Acessórios',
    hint: 'Cintos, lenços, gorros e cachecóis',
    icon: Sparkles,
    tone: {
      iconBg: 'bg-violet-50',
      iconText: 'text-violet-700',
      selectedBg: 'bg-violet-50',
      selectedBorder: 'border-violet-400',
    },
  },
  {
    id: 'BAGS',
    label: 'Bolsas',
    hint: 'Mochilas, bolsas e nécessaires',
    icon: ShoppingBag,
    tone: {
      iconBg: 'bg-orange-50',
      iconText: 'text-orange-700',
      selectedBg: 'bg-orange-50',
      selectedBorder: 'border-orange-300',
    },
  },
  {
    id: 'TOYS',
    label: 'Brinquedos',
    hint: 'Brinquedos limpos e completos',
    icon: Gamepad2,
    tone: {
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-700',
      selectedBg: 'bg-amber-50',
      selectedBorder: 'border-amber-300',
    },
  },
  {
    id: 'FOOD',
    label: 'Alimentos',
    hint: 'Não perecíveis dentro da validade',
    icon: Apple,
    tone: {
      iconBg: 'bg-yellow-50',
      iconText: 'text-yellow-800',
      selectedBg: 'bg-yellow-50',
      selectedBorder: 'border-yellow-300',
    },
  },
  {
    id: 'OTHER',
    label: 'Outros',
    hint: 'Cobertores, mantas e itens diversos',
    icon: Layers,
    tone: {
      iconBg: 'bg-slate-100',
      iconText: 'text-slate-600',
      selectedBg: 'bg-slate-100',
      selectedBorder: 'border-slate-300',
    },
  },
];

export const categoryLabels: Record<ItemCategory, string> = {
  CLOTHING: 'Roupas',
  SHOES: 'Calçados',
  ACCESSORIES: 'Acessórios',
  BAGS: 'Bolsas',
  TOYS: 'Brinquedos',
  FOOD: 'Alimentos',
  OTHER: 'Outros',
};

export const conditionOptions: Array<{
  id: DonationItemCondition;
  label: string;
  description: string;
}> = [
  {
    id: 'EXCELLENT',
    label: 'Em ótimo estado',
    description: 'Prontas para uso imediato.',
  },
  {
    id: 'GOOD',
    label: 'Usadas, mas conservadas',
    description: 'Boas para reaproveitamento.',
  },
];

export const packageTypeOptions: Array<{ id: DonationPackageType; label: string; icon: LucideIcon }> = [
  { id: 'BAG', label: 'Sacola', icon: ShoppingBag },
  { id: 'BOX', label: 'Caixa', icon: Box },
];

export const packageSizeOptions: Array<{ id: DonationPackageSize; label: string; hint: string }> = [
  { id: 'SMALL', label: 'Pequena', hint: 'até 8 itens leves' },
  { id: 'MEDIUM', label: 'Média', hint: '9 a 20 itens' },
  { id: 'LARGE', label: 'Grande', hint: '21 a 40 itens' },
];

const categoryVolumeFactor: Record<ItemCategory, number> = {
  CLOTHING: 1,
  SHOES: 2.4,
  ACCESSORIES: 0.35,
  BAGS: 1.8,
  TOYS: 2,
  FOOD: 1.5,
  OTHER: 1.4,
};

export type PackageEstimate = {
  packages: DonationPackageDraft[];
  estimatedUnits: number;
  roundedUnits: number;
  prefersBox: boolean;
  explanation: string;
};

export function isItemCategory(value: unknown): value is ItemCategory {
  return categoryOptions.some((option) => option.id === value);
}

export function isCondition(value: unknown): value is DonationItemCondition {
  return value === 'EXCELLENT' || value === 'GOOD';
}

export function isPackageType(value: unknown): value is DonationPackageType {
  return value === 'BAG' || value === 'BOX';
}

export function isPackageSize(value: unknown): value is DonationPackageSize {
  return value === 'SMALL' || value === 'MEDIUM' || value === 'LARGE';
}

export function isPackageMode(value: unknown): value is PackageMode {
  return value === 'AUTO' || value === 'MANUAL';
}

export function clampItemQuantity(value: number) {
  return Math.max(1, Math.min(MAX_ITEM_QUANTITY, Math.floor(value)));
}

export function clampPackageQuantity(value: number) {
  return Math.max(1, Math.min(MAX_PACKAGE_QUANTITY, Math.floor(value)));
}

export function getCategoryOption(category: ItemCategory) {
  return categoryOptions.find((option) => option.id === category) ?? categoryOptions[0];
}

export function formatCategoryList(categories: ItemCategory[]) {
  if (categories.length === 0) return 'nenhuma categoria';
  const labels = categories.map((category) => categoryLabels[category] ?? category);
  if (labels.length === 1) return labels[0].toLocaleLowerCase('pt-BR');
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`.toLocaleLowerCase('pt-BR');
}

export function describeItem(item: DonationItemDraft) {
  const categoryLabel = categoryLabels[item.category] ?? item.category;
  const conditionLabel = item.condition === 'EXCELLENT' ? 'ótimo estado' : 'bom estado';
  return `${item.quantity} ${categoryLabel.toLocaleLowerCase('pt-BR')} (${conditionLabel})`;
}

export function describePackage(pkg: DonationPackageDraft) {
  const typeLabel = packageTypeOptions.find((option) => option.id === pkg.type)?.label ?? pkg.type;
  const sizeLabel = packageSizeOptions.find((option) => option.id === pkg.size)?.label ?? pkg.size;
  return `${pkg.quantity}x ${typeLabel.toLocaleLowerCase('pt-BR')} ${sizeLabel.toLocaleLowerCase('pt-BR')}`;
}

export function describePackages(packages: DonationPackageDraft[]) {
  if (packages.length === 0) return 'Nenhuma embalagem informada';
  return packages.map(describePackage).join(' + ');
}

type PackingGroup = 'SOFT' | 'SHOES' | 'TOYS' | 'FOOD' | 'OTHER';

type PackageKey =
  | 'BAG_SMALL'
  | 'BAG_MEDIUM'
  | 'BAG_LARGE'
  | 'BOX_SMALL'
  | 'BOX_MEDIUM'
  | 'BOX_LARGE';

type PackageSuggestion = {
  key: PackageKey;
  type: DonationPackageType;
  size: DonationPackageSize;
  quantity: number;
};

type PackingGroupInput = {
  group: PackingGroup;
  categories: ItemCategory[];
  quantity: number;
  units: number;
};

const packingGroupOrder: PackingGroup[] = ['SOFT', 'SHOES', 'TOYS', 'FOOD', 'OTHER'];

const packageKeyOrder: PackageKey[] = [
  'BAG_SMALL',
  'BAG_MEDIUM',
  'BAG_LARGE',
  'BOX_SMALL',
  'BOX_MEDIUM',
  'BOX_LARGE',
];

const packageCapacity: Record<PackageKey, number> = {
  BAG_SMALL: 6,
  BAG_MEDIUM: 14,
  BAG_LARGE: 28,
  BOX_SMALL: 8,
  BOX_MEDIUM: 20,
  BOX_LARGE: 36,
};

const packageMeta: Record<PackageKey, { type: DonationPackageType; size: DonationPackageSize }> = {
  BAG_SMALL: { type: 'BAG', size: 'SMALL' },
  BAG_MEDIUM: { type: 'BAG', size: 'MEDIUM' },
  BAG_LARGE: { type: 'BAG', size: 'LARGE' },
  BOX_SMALL: { type: 'BOX', size: 'SMALL' },
  BOX_MEDIUM: { type: 'BOX', size: 'MEDIUM' },
  BOX_LARGE: { type: 'BOX', size: 'LARGE' },
};

function getPackingGroup(category: ItemCategory): PackingGroup {
  if (category === 'CLOTHING' || category === 'ACCESSORIES' || category === 'BAGS') return 'SOFT';
  if (category === 'SHOES') return 'SHOES';
  if (category === 'TOYS') return 'TOYS';
  if (category === 'FOOD') return 'FOOD';
  return 'OTHER';
}

function buildPackingGroups(items: DonationItemDraft[]): PackingGroupInput[] {
  const groups = new Map<PackingGroup, PackingGroupInput>();

  items.forEach((item) => {
    const group = getPackingGroup(item.category);
    const current = groups.get(group) ?? {
      group,
      categories: [],
      quantity: 0,
      units: 0,
    };

    if (!current.categories.includes(item.category)) {
      current.categories.push(item.category);
    }

    current.quantity += item.quantity;
    current.units += item.quantity * categoryVolumeFactor[item.category];
    groups.set(group, current);
  });

  return packingGroupOrder.flatMap((group) => {
    const input = groups.get(group);
    return input ? [input] : [];
  });
}

function makeSuggestion(key: PackageKey, quantity = 1): PackageSuggestion {
  return {
    key,
    ...packageMeta[key],
    quantity,
  };
}

function mergeEqualPackages(suggestions: PackageSuggestion[]): PackageSuggestion[] {
  const merged = new Map<PackageKey, PackageSuggestion>();

  suggestions.forEach((suggestion) => {
    const current = merged.get(suggestion.key);
    if (current) {
      current.quantity += suggestion.quantity;
      return;
    }

    merged.set(suggestion.key, { ...suggestion });
  });

  return packageKeyOrder.flatMap((key) => {
    const suggestion = merged.get(key);
    return suggestion ? [suggestion] : [];
  });
}

function findSmallestPackageKey(units: number, keys: PackageKey[]) {
  return [...keys]
    .sort((left, right) => packageCapacity[left] - packageCapacity[right])
    .find((key) => units <= packageCapacity[key]) ?? keys[0];
}

function packGreedy(units: number, keys: PackageKey[]): PackageSuggestion[] {
  let remaining = Math.max(0, Math.ceil(units));
  const suggestions: PackageSuggestion[] = [];
  const sortedKeys = [...keys].sort((left, right) => packageCapacity[right] - packageCapacity[left]);

  sortedKeys.forEach((key) => {
    const capacity = packageCapacity[key];
    const quantity = Math.floor(remaining / capacity);

    if (quantity <= 0) return;

    suggestions.push(makeSuggestion(key, quantity));
    remaining -= quantity * capacity;
  });

  if (remaining > 0) {
    suggestions.push(makeSuggestion(findSmallestPackageKey(remaining, keys)));
  }

  return mergeEqualPackages(suggestions);
}

function packByCount(count: number, capacities: Array<{ key: PackageKey; capacity: number }>): PackageSuggestion[] {
  let remaining = Math.max(0, count);
  const suggestions: PackageSuggestion[] = [];

  capacities.forEach(({ key, capacity }) => {
    const quantity = Math.floor(remaining / capacity);
    if (quantity <= 0) return;

    suggestions.push(makeSuggestion(key, quantity));
    remaining -= quantity * capacity;
  });

  if (remaining > 0) {
    const smallest = [...capacities]
      .sort((left, right) => left.capacity - right.capacity)
      .find(({ capacity }) => remaining <= capacity) ?? capacities[capacities.length - 1];
    suggestions.push(makeSuggestion(smallest.key));
  }

  return mergeEqualPackages(suggestions);
}

function estimateGroupPackages(group: PackingGroupInput): PackageSuggestion[] {
  const units = Math.max(1, Math.ceil(group.units));

  if (group.group === 'SOFT') {
    if (units <= 6) return [makeSuggestion('BAG_SMALL')];
    if (units <= 14) return [makeSuggestion('BAG_MEDIUM')];
    if (units <= 28) return [makeSuggestion('BAG_LARGE')];
    return packGreedy(units, ['BAG_LARGE', 'BAG_MEDIUM', 'BAG_SMALL']);
  }

  if (group.group === 'SHOES') {
    if (group.quantity <= 2) return [makeSuggestion('BOX_SMALL')];
    if (group.quantity <= 6) return [makeSuggestion('BOX_MEDIUM')];
    if (group.quantity <= 10) return [makeSuggestion('BOX_LARGE')];
    return packByCount(group.quantity, [
      { key: 'BOX_LARGE', capacity: 10 },
      { key: 'BOX_MEDIUM', capacity: 6 },
      { key: 'BOX_SMALL', capacity: 2 },
    ]);
  }

  if (group.group === 'TOYS') {
    if (group.quantity <= 4) return [makeSuggestion('BOX_SMALL')];
    if (group.quantity <= 10) return [makeSuggestion('BOX_MEDIUM')];
    return packGreedy(units, ['BOX_LARGE', 'BOX_MEDIUM', 'BOX_SMALL']);
  }

  if (group.group === 'FOOD') {
    if (units <= 6) return [makeSuggestion('BOX_SMALL')];
    if (units <= 16) return [makeSuggestion('BOX_MEDIUM')];
    return packGreedy(units, ['BOX_LARGE', 'BOX_MEDIUM', 'BOX_SMALL']);
  }

  if (units <= 8) return [makeSuggestion('BOX_SMALL')];
  if (units <= 20) return [makeSuggestion('BOX_MEDIUM')];
  return packGreedy(units, ['BOX_LARGE', 'BOX_MEDIUM', 'BOX_SMALL']);
}

function toDonationPackageDraft(suggestion: PackageSuggestion, index: number): DonationPackageDraft {
  return {
    id: `auto-${index}-${suggestion.type}-${suggestion.size}`,
    type: suggestion.type,
    size: suggestion.size,
    quantity: suggestion.quantity,
  };
}

function buildPackagingExplanation(groups: PackingGroupInput[]) {
  if (groups.length === 0) return 'Escolha os itens para receber uma sugestão.';

  const groupSet = new Set(groups.map((group) => group.group));
  const notes: string[] = [];

  if (groupSet.has('FOOD') && groups.length > 1) {
    notes.push('Alimentos vão separados dos demais itens.');
  }

  if (groupSet.has('SHOES') && groupSet.has('SOFT')) {
    notes.push('Separamos calçados das roupas para facilitar a entrega e a triagem.');
  } else if (groupSet.has('SHOES')) {
    notes.push('Calçados seguem em caixa para facilitar a organização por pares.');
  }

  if (groupSet.has('TOYS') && groups.length > 1) {
    notes.push('Brinquedos seguem em caixa separada para proteger os itens.');
  }

  if (notes.length > 0) return notes.join(' ');

  return groupSet.has('SOFT')
    ? 'Itens flexíveis costumam ficar bem acomodados em sacolas.'
    : 'Sugerimos caixas para proteger melhor estes itens.';
}

export function estimatePackagesFromItems(items: DonationItemDraft[]): PackageEstimate {
  const groups = buildPackingGroups(items);
  const estimatedUnits = items.reduce(
    (sum, item) => sum + item.quantity * categoryVolumeFactor[item.category],
    0,
  );
  const roundedUnits = Math.max(1, Math.ceil(estimatedUnits));
  const suggestions =
    groups.length > 0
      ? mergeEqualPackages(groups.flatMap(estimateGroupPackages))
      : [makeSuggestion('BAG_SMALL')];
  const packages = suggestions.map(toDonationPackageDraft);
  const boxCount = suggestions.reduce((sum, suggestion) => sum + (suggestion.type === 'BOX' ? suggestion.quantity : 0), 0);
  const bagCount = suggestions.reduce((sum, suggestion) => sum + (suggestion.type === 'BAG' ? suggestion.quantity : 0), 0);

  return {
    packages,
    estimatedUnits,
    roundedUnits,
    prefersBox: boxCount > bagCount,
    explanation: buildPackagingExplanation(groups),
  };
}

export type PointAvailability = {
  canSelect: boolean;
  label: string;
  tone: 'success' | 'warning' | 'danger';
  reason: string | null;
  missingCategories: ItemCategory[];
};

function normalizeAcceptedCategories(point: CollectionPoint) {
  return point.acceptedCategories.filter(isItemCategory);
}

export function getPointAvailability(
  point: CollectionPoint,
  selectedCategories: ItemCategory[],
): PointAvailability {
  if (point.role !== 'COLLECTION_POINT') {
    return {
      canSelect: false,
      label: 'Indisponível',
      tone: 'danger',
      reason: 'Este local não opera como ponto de coleta.',
      missingCategories: [],
    };
  }

  if (point.donationEligibility?.canDonateHere !== true) {
    return {
      canSelect: false,
      label: point.donationEligibility?.label ?? 'Parceria pendente',
      tone: 'warning',
      reason:
        point.donationEligibility?.message ??
        'Este ponto ainda não possui ONG parceira ativa.',
      missingCategories: [],
    };
  }

  const acceptedCategories = normalizeAcceptedCategories(point);
  const missingCategories =
    acceptedCategories.length === 0
      ? []
      : selectedCategories.filter((category) => !acceptedCategories.includes(category));

  if (missingCategories.length > 0) {
    return {
      canSelect: false,
      label: 'Não aceita todos os itens',
      tone: 'warning',
      reason:
        missingCategories.length === 1
          ? `Este ponto não recebe ${formatCategoryList(missingCategories)}.`
          : `Este ponto não recebe ${formatCategoryList(missingCategories)}.`,
      missingCategories,
    };
  }

  return {
    canSelect: true,
    label: 'Compatível',
    tone: 'success',
    reason: null,
    missingCategories: [],
  };
}

export function sortCollectionPointsForDonation(
  points: CollectionPoint[],
  selectedCategories: ItemCategory[],
  usedPointIds: Set<string>,
) {
  return [...points].sort((left, right) => {
    const leftAvailability = getPointAvailability(left, selectedCategories);
    const rightAvailability = getPointAvailability(right, selectedCategories);

    if (leftAvailability.canSelect !== rightAvailability.canSelect) {
      return leftAvailability.canSelect ? -1 : 1;
    }

    const leftUsed = usedPointIds.has(left.id);
    const rightUsed = usedPointIds.has(right.id);

    if (leftUsed !== rightUsed) return leftUsed ? -1 : 1;

    return (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY);
  });
}

export type PointFilterKey = 'compatible' | 'history' | 'distance';

export function filterAndSortCollectionPointsForDonation({
  points,
  selectedCategories,
  usedPointIds,
  activeFilters,
}: {
  points: CollectionPoint[];
  selectedCategories: ItemCategory[];
  usedPointIds: Set<string>;
  activeFilters: PointFilterKey[];
}) {
  const filterSet = new Set(activeFilters);
  const decorated = points.map((point) => ({
    point,
    availability: getPointAvailability(point, selectedCategories),
    alreadyUsed: usedPointIds.has(point.id),
    distance: point.distanceKm ?? Number.POSITIVE_INFINITY,
  }));

  const visible = decorated.filter(({ availability, alreadyUsed }) => {
    if (filterSet.has('compatible') && !availability.canSelect) return false;
    if (filterSet.has('history') && !alreadyUsed) return false;
    return true;
  });

  visible.sort((left, right) => {
    if (left.availability.canSelect !== right.availability.canSelect) {
      return left.availability.canSelect ? -1 : 1;
    }

    if (filterSet.has('distance') && left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    if (left.alreadyUsed !== right.alreadyUsed) return left.alreadyUsed ? -1 : 1;

    return left.distance - right.distance;
  });

  return visible.map(({ point }) => point);
}

type DonationButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'warn' | 'danger';
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  type?: 'button' | 'submit';
  className?: string;
  onClick?: () => void;
};

export function DonationButton({
  children,
  variant = 'primary',
  full = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  type = 'button',
  className,
  onClick,
}: DonationButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        full && 'w-full',
        variant === 'primary' &&
          'bg-primary-deeper text-white hover:bg-primary-dark disabled:bg-surface disabled:text-gray-300 dark:disabled:bg-surface-ink',
        variant === 'secondary' &&
          'border border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:bg-surface disabled:text-gray-300 dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-300 dark:disabled:bg-surface-ink',
        variant === 'ghost' &&
          'bg-transparent text-primary hover:bg-primary-light/60 disabled:cursor-not-allowed disabled:text-gray-300 dark:hover:bg-primary/10',
        variant === 'warn' &&
          'border border-primary/25 bg-white text-primary hover:bg-primary-light/50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 dark:bg-surface-inkSoft',
        variant === 'danger' &&
          'bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:text-gray-300',
        (disabled || loading) && 'cursor-not-allowed',
        loading && variant === 'primary' && 'bg-primary-deeper text-white',
        className,
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}

type StepperProps = {
  steps: StepConfig[];
  currentStep: number;
  canVisitStep: (index: number) => boolean;
  onStepClick: (index: number) => void;
};

export function DonationStepper({ steps, currentStep, canVisitStep, onStepClick }: StepperProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];

  return (
    <div className="rounded-[2rem] bg-white p-4 shadow-card dark:bg-surface-inkSoft dark:shadow-none sm:p-5 lg:p-6">
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-surface dark:bg-surface-ink">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="flex-shrink-0 rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold text-primary dark:bg-primary/20">
          {currentStep + 1}/{steps.length} - {step.short}
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

        <div className="mt-5 grid gap-2 lg:grid-cols-4">
          {steps.map((item, index) => {
            const isCurrent = index === currentStep;
            const isPast = index < currentStep;
            const canVisit = canVisitStep(index);

            return (
              <button
                key={item.title}
                type="button"
                onClick={() => canVisit && onStepClick(index)}
                disabled={!canVisit}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex min-h-[68px] items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  isCurrent && 'bg-primary-deeper text-white',
                  isPast && 'bg-primary-light text-primary-deeper dark:bg-primary/20 dark:text-primary-muted',
                  !isCurrent && !isPast && 'bg-surface text-gray-400 dark:bg-surface-ink',
                  !canVisit && 'cursor-not-allowed opacity-70',
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
  );
}

type SummaryCardProps = {
  items: DonationItemDraft[];
  packages: DonationPackageDraft[];
  notes: string;
  selectedPoint: CollectionPoint | null;
  packageMode: PackageMode;
  totalItems: number;
  uniqueCategories: number;
  compact?: boolean;
};

export function DonationSummaryCard({
  items,
  packages,
  notes,
  selectedPoint,
  packageMode,
  totalItems,
  uniqueCategories,
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
        <SummarySection icon={Shirt} title="Itens">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum item adicionado.</p>
          ) : (
            <>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.id} className="text-sm font-medium text-on-surface dark:text-gray-100">
                    {describeItem(item)}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-400">
                {totalItems} item(ns) em {uniqueCategories} categoria(s)
              </p>
            </>
          )}
        </SummarySection>

        <SummarySection icon={Box} title="Embalagem">
          {packages.length === 0 ? (
            <p className="text-sm text-gray-400">Sem embalagem definida.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-on-surface dark:text-gray-100">{describePackages(packages)}</p>
              <p className="mt-2 text-xs text-gray-400">
                {packageMode === 'AUTO' ? 'Estimativa automática' : 'Ajustado manualmente'}
              </p>
            </>
          )}
        </SummarySection>

        <SummarySection icon={MapPin} title="Ponto de coleta">
          {selectedPoint ? (
            <div>
              <p className="text-sm font-semibold text-on-surface dark:text-gray-100">
                {selectedPoint.organizationName ?? selectedPoint.name}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {formatDistance(selectedPoint.distanceKm)}
                {formatAddressSummary(selectedPoint) ?? 'Endereço não informado'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Escolha ainda pendente.</p>
          )}
        </SummarySection>

        {notes.trim() && (
          <SummarySection icon={Info} title="Observações">
            <p className="text-sm leading-6 text-gray-500">{notes.trim()}</p>
          </SummarySection>
        )}
      </div>
    </div>
  );
}

function SummarySection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-surface p-4 dark:bg-surface-ink">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-primary" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

type ItemsStepProps = {
  items: DonationItemDraft[];
  totalItems: number;
  uniqueCategories: number;
  validationMessage: string | null;
  onToggleCategory: (category: ItemCategory) => void;
  onUpdateItem: (id: string, patch: Partial<DonationItemDraft>) => void;
  onRemoveItem: (id: string) => void;
};

export function ItemsStep({
  items,
  totalItems,
  uniqueCategories,
  validationMessage,
  onToggleCategory,
  onUpdateItem,
  onRemoveItem,
}: ItemsStepProps) {
  const selectedCategories = new Set(items.map((item) => item.category));

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Categorias</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {categoryOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedCategories.has(option.id);

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggleCategory(option.id)}
                className={cn(
                  'relative min-h-[132px] rounded-[1.35rem] border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-surface-ink dark:shadow-none',
                  isSelected
                    ? `${option.tone.selectedBg} ${option.tone.selectedBorder} shadow-card`
                    : 'border-gray-100 hover:border-primary/30 dark:border-white/10',
                )}
              >
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', option.tone.iconBg, option.tone.iconText)}>
                  <Icon size={20} />
                </div>
                <p className="mt-3 text-sm font-bold text-primary-deeper dark:text-white">{option.label}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">{option.hint}</p>
                {isSelected && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {validationMessage && (
        <InlineAlert tone="danger" title="Para continuar" message={validationMessage} />
      )}

      {items.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500 dark:border-white/10 dark:bg-surface-ink">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <Heart size={18} />
            </div>
            <div>
              <p className="font-semibold text-primary-deeper dark:text-white">Comece por uma categoria.</p>
              <p className="mt-1 leading-6">
                Depois ajuste a quantidade com os botões de mais e menos. Você revisa tudo antes de confirmar.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Quantidades</p>
              <p className="mt-1 text-sm text-gray-500">
                {totalItems} item(ns) em {uniqueCategories} categoria(s)
              </p>
            </div>
          </div>

          {items.map((item) => (
            <ItemQuantityCard
              key={item.id}
              item={item}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemQuantityCard({
  item,
  onUpdateItem,
  onRemoveItem,
}: {
  item: DonationItemDraft;
  onUpdateItem: (id: string, patch: Partial<DonationItemDraft>) => void;
  onRemoveItem: (id: string) => void;
}) {
  const option = getCategoryOption(item.category);
  const Icon = option.icon;
  const inputId = `item-quantity-${item.id}`;

  return (
    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-surface-ink">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_42px] lg:items-start">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl', option.tone.iconBg, option.tone.iconText)}>
            <Icon size={21} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-deeper dark:text-white">{option.label}</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">{option.hint}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {conditionOptions.map((condition) => (
                <button
                  key={condition.id}
                  type="button"
                  onClick={() => onUpdateItem(item.id, { condition: condition.id })}
                  className={cn(
                    'rounded-2xl border px-3 py-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    item.condition === condition.id
                      ? 'border-primary bg-primary-light/60 text-primary-deeper dark:bg-primary/20 dark:text-white'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-primary/40 dark:border-white/10 dark:bg-surface-inkSoft',
                  )}
                >
                  <span className="block font-semibold">{condition.label}</span>
                  <span className="mt-1 block leading-5">{condition.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            Quantidade
          </label>
          <div className="mt-2 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateItem(item.id, { quantity: clampItemQuantity(item.quantity - 1) })}
              disabled={item.quantity <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              aria-label={`Diminuir quantidade de ${option.label}`}
            >
              <Minus size={16} />
            </button>
            <input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_ITEM_QUANTITY}
              value={item.quantity}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                onUpdateItem(item.id, { quantity: clampItemQuantity(Number.isFinite(next) ? next : 1) });
              }}
              className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-base font-bold text-primary-deeper outline-none focus:border-primary dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onUpdateItem(item.id, { quantity: clampItemQuantity(item.quantity + 1) })}
              disabled={item.quantity >= MAX_ITEM_QUANTITY}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              aria-label={`Aumentar quantidade de ${option.label}`}
            >
              <Plus size={16} />
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">Mínimo 1, máximo {MAX_ITEM_QUANTITY}.</p>
        </div>

        <button
          type="button"
          onClick={() => onRemoveItem(item.id)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 lg:mt-6"
          aria-label={`Remover ${option.label}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

type PackagingStepProps = {
  packageMode: PackageMode;
  automaticEstimate: PackageEstimate;
  packages: DonationPackageDraft[];
  notes: string;
  validationMessage: string | null;
  onUseAuto: () => void;
  onStartManual: () => void;
  onUpdatePackage: (id: string, patch: Partial<DonationPackageDraft>) => void;
  onAddPackage: () => void;
  onRemovePackage: (id: string) => void;
  onNotesChange: (value: string) => void;
};

export function PackagingStep({
  packageMode,
  automaticEstimate,
  packages,
  notes,
  validationMessage,
  onUseAuto,
  onStartManual,
  onUpdatePackage,
  onAddPackage,
  onRemovePackage,
  onNotesChange,
}: PackagingStepProps) {
  return (
    <div className="space-y-5">
      {packageMode === 'AUTO' ? (
        <div className="overflow-hidden rounded-[1.75rem] border border-primary/25 bg-white shadow-card dark:bg-surface-ink">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-primary-light/55 px-5 py-4 dark:bg-primary/10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary" icon={<Sparkles size={12} />}>Recomendado</Badge>
              <Badge tone="white" icon={<Check size={12} strokeWidth={3} />}>Calculado automaticamente</Badge>
            </div>
            <span className="text-xs font-semibold text-primary-deeper dark:text-primary-muted">
              Sugerido para estes itens
            </span>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[140px_minmax(0,1fr)] lg:items-center">
            <VolumeIllustration prefersBox={automaticEstimate.prefersBox} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Estimativa automática</p>
              <h3 className="mt-2 text-2xl font-bold text-primary-deeper dark:text-white">
                {describePackages(automaticEstimate.packages)}
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-500">
                Sugerimos com base nas categorias e quantidades informadas. {automaticEstimate.explanation}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-primary/20 bg-primary-light/45 p-5 text-sm text-primary-deeper dark:bg-primary/10 dark:text-primary-muted">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-primary dark:bg-surface-inkSoft">
              <Edit3 size={18} />
            </div>
            <div>
              <p className="font-semibold">Ajustado manualmente</p>
              <p className="mt-1 leading-6">
                Você alterou a sugestão automática. Pode voltar para a sugestão quando quiser.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {packageMode === 'AUTO' ? (
          <DonationButton variant="warn" leftIcon={<Edit3 size={16} />} onClick={onStartManual}>
            Ajustar volume manualmente
          </DonationButton>
        ) : (
          <DonationButton variant="ghost" leftIcon={<RotateCcw size={16} />} onClick={onUseAuto}>
            Voltar à estimativa automática
          </DonationButton>
        )}
      </div>

      {packageMode === 'MANUAL' && (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <PackageEditor
              key={pkg.id}
              pkg={pkg}
              canRemove={packages.length > 1}
              onUpdatePackage={onUpdatePackage}
              onRemovePackage={onRemovePackage}
            />
          ))}

          <button
            type="button"
            onClick={onAddPackage}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary-light/30 px-4 py-3 text-sm font-semibold text-primary hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-primary/10"
          >
            <Plus size={16} />
            Adicionar outro volume
          </button>
        </div>
      )}

      {validationMessage && <InlineAlert tone="danger" title="Revise a embalagem" message={validationMessage} />}

      <div>
        <label htmlFor="donation-notes" className="mb-2 block px-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Observações
        </label>
        <textarea
          id="donation-notes"
          rows={4}
          placeholder="Opcional: tamanhos, itens frágeis ou algum detalhe útil para o ponto de coleta."
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          className="w-full resize-none rounded-[1.75rem] border border-gray-100 bg-surface px-5 py-4 text-sm text-on-surface outline-none placeholder:text-gray-400 focus:border-primary focus:bg-white dark:border-white/10 dark:bg-surface-ink dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-surface-inkSoft"
        />
      </div>
    </div>
  );
}

function PackageEditor({
  pkg,
  canRemove,
  onUpdatePackage,
  onRemovePackage,
}: {
  pkg: DonationPackageDraft;
  canRemove: boolean;
  onUpdatePackage: (id: string, patch: Partial<DonationPackageDraft>) => void;
  onRemovePackage: (id: string) => void;
}) {
  const typeOption = packageTypeOptions.find((option) => option.id === pkg.type) ?? packageTypeOptions[0];
  const TypeIcon = typeOption.icon;
  const inputId = `package-quantity-${pkg.id}`;

  return (
    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-surface-ink">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <TypeIcon size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-primary-deeper dark:text-white">{describePackage(pkg)}</p>
            <p className="mt-1 text-xs text-gray-500">Ajuste tipo, tamanho e quantidade.</p>
          </div>
        </div>
        <button
          type="button"
          disabled={!canRemove}
          onClick={() => onRemovePackage(pkg.id)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Remover volume"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <fieldset>
          <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Tipo</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {packageTypeOptions.map((option) => {
              const OptionIcon = option.icon;
              const active = pkg.type === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdatePackage(pkg.id, { type: option.id })}
                  className={cn(
                    'flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    active
                      ? 'border-primary bg-primary-light text-primary-deeper'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-primary/40 dark:border-white/10 dark:bg-surface-inkSoft',
                  )}
                >
                  <OptionIcon size={15} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Tamanho</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {packageSizeOptions.map((option) => {
              const active = pkg.size === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdatePackage(pkg.id, { size: option.id })}
                  title={option.hint}
                  className={cn(
                    'min-h-11 rounded-2xl border px-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    active
                      ? 'border-primary bg-primary-light text-primary-deeper'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-primary/40 dark:border-white/10 dark:bg-surface-inkSoft',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            Quantos
          </label>
          <div className="mt-2 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdatePackage(pkg.id, { quantity: clampPackageQuantity(pkg.quantity - 1) })}
              disabled={pkg.quantity <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              aria-label="Diminuir volume"
            >
              <Minus size={16} />
            </button>
            <input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_PACKAGE_QUANTITY}
              value={pkg.quantity}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                onUpdatePackage(pkg.id, { quantity: clampPackageQuantity(Number.isFinite(next) ? next : 1) });
              }}
              className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-center text-base font-bold text-primary-deeper outline-none focus:border-primary dark:border-white/10 dark:bg-surface-inkSoft dark:text-gray-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onUpdatePackage(pkg.id, { quantity: clampPackageQuantity(pkg.quantity + 1) })}
              disabled={pkg.quantity >= MAX_PACKAGE_QUANTITY}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              aria-label="Aumentar volume"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CollectionPointStepProps = {
  points: CollectionPoint[];
  pointsLoading: boolean;
  pointsError: string | null;
  pointsNotice: string | null;
  selectedPointId: string;
  selectedCategories: ItemCategory[];
  usedPointIds: Set<string>;
  mapSelectionHref: string;
  validationMessage: string | null;
  onSelectPoint: (point: CollectionPoint) => void;
  onRetry: () => void;
  onEditItems: () => void;
};

export function CollectionPointStep({
  points,
  pointsLoading,
  pointsError,
  pointsNotice,
  selectedPointId,
  selectedCategories,
  usedPointIds,
  mapSelectionHref,
  validationMessage,
  onSelectPoint,
  onRetry,
  onEditItems,
}: CollectionPointStepProps) {
  const [activePointFilters, setActivePointFilters] = useState<PointFilterKey[]>([]);
  const filterSet = useMemo(() => new Set(activePointFilters), [activePointFilters]);
  const filteredPoints = useMemo(
    () =>
      filterAndSortCollectionPointsForDonation({
        points,
        selectedCategories,
        usedPointIds,
        activeFilters: activePointFilters,
      }),
    [activePointFilters, points, selectedCategories, usedPointIds],
  );
  const availableCount = points.filter((point) => getPointAvailability(point, selectedCategories).canSelect).length;
  const hiddenIncompatibleCount = filterSet.has('compatible') ? points.length - availableCount : 0;
  const noCompatibleMessage =
    !pointsLoading && !pointsError && points.length > 0 && availableCount === 0
      ? 'Nenhum local da lista aceita todos os itens selecionados. Você pode editar os itens ou abrir o mapa para procurar em outra área.'
      : null;

  function toggleFilter(filter: PointFilterKey) {
    setActivePointFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
          <PointFilterChip
            label="Todos"
            active={activePointFilters.length === 0}
            onClick={() => setActivePointFilters([])}
          />
          <PointFilterChip
            label="Mais próximos"
            active={filterSet.has('distance')}
            onClick={() => toggleFilter('distance')}
          />
          <PointFilterChip
            label="Compatíveis"
            active={filterSet.has('compatible')}
            onClick={() => toggleFilter('compatible')}
          />
          <PointFilterChip
            label="Já doei aqui"
            active={filterSet.has('history')}
            onClick={() => toggleFilter('history')}
          />
        </div>
        <Link
          href={mapSelectionHref}
          className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-primary hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-white/10 dark:bg-surface-inkSoft"
        >
          <MapIcon size={16} />
          Abrir mapa
        </Link>
      </div>

      {validationMessage && <InlineAlert tone="danger" title="Escolha um ponto de coleta" message={validationMessage} />}
      {pointsNotice && <InlineAlert tone="warning" title="Atenção" message={pointsNotice} />}
      {hiddenIncompatibleCount > 0 && (
        <p className="px-1 text-xs leading-5 text-gray-500" aria-live="polite">
          Alguns locais foram ocultados por não aceitarem estes itens.
        </p>
      )}
      {noCompatibleMessage && (
        <p className="rounded-[1.25rem] bg-surface px-4 py-3 text-sm leading-6 text-gray-500 dark:bg-surface-ink">
          {noCompatibleMessage}
        </p>
      )}

      {pointsLoading ? (
        <div className="space-y-3" aria-live="polite">
          <div className="flex items-center gap-3 rounded-[1.75rem] bg-surface p-5 text-sm text-gray-500 dark:bg-surface-ink">
            <Loader2 size={18} className="animate-spin text-primary" />
            Carregando pontos de coleta próximos...
          </div>
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-[1.75rem] border border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-surface-ink">
              <div className="flex gap-4">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-surface dark:bg-surface-inkSoft" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface dark:bg-surface-inkSoft" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface dark:bg-surface-inkSoft" />
                  <div className="h-8 w-full animate-pulse rounded-2xl bg-surface dark:bg-surface-inkSoft" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : pointsError && points.length === 0 ? (
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold">Não foi possível carregar a lista.</p>
              <p className="mt-1 leading-6">{pointsError}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <DonationButton variant="secondary" onClick={onRetry}>
                  Tentar novamente
                </DonationButton>
                <Link
                  href={mapSelectionHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Abrir mapa
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : points.length === 0 ? (
        <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-surface-ink">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-primary-light text-primary">
            <MapPin size={26} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-primary-deeper dark:text-white">Nenhum ponto de coleta encontrado</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-gray-500">
            Tente abrir o mapa para buscar em outra área ou volte para revisar as categorias.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <DonationButton variant="secondary" leftIcon={<ChevronLeft size={16} />} onClick={onEditItems}>
              Editar itens
            </DonationButton>
            <Link
              href={mapSelectionHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Abrir mapa
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      ) : filteredPoints.length === 0 ? (
        <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-surface-ink">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary-light text-primary">
            <MapPin size={23} />
          </div>
          <h3 className="mt-4 text-base font-bold text-primary-deeper dark:text-white">Nenhum ponto com esses filtros</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-gray-500">
            Limpe os filtros ou abra o mapa para ver outras opções.
          </p>
          <div className="mt-5 flex justify-center">
            <DonationButton variant="secondary" onClick={() => setActivePointFilters([])}>
              Ver todos
            </DonationButton>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPoints.map((point) => (
            <CollectionPointCard
              key={point.id}
              point={point}
              selectedCategories={selectedCategories}
              isSelected={point.id === selectedPointId}
              alreadyUsed={usedPointIds.has(point.id)}
              onSelectPoint={onSelectPoint}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PointFilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-10 flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        active
          ? 'border-primary bg-primary text-white'
          : 'border-gray-200 bg-white text-gray-500 hover:border-primary/40 hover:text-primary dark:border-white/10 dark:bg-surface-inkSoft',
      )}
    >
      {active && <Check size={14} strokeWidth={3} />}
      {label}
    </button>
  );
}

function CollectionPointCard({
  point,
  selectedCategories,
  isSelected,
  alreadyUsed,
  onSelectPoint,
}: {
  point: CollectionPoint;
  selectedCategories: ItemCategory[];
  isSelected: boolean;
  alreadyUsed: boolean;
  onSelectPoint: (point: CollectionPoint) => void;
}) {
  const availability = getPointAvailability(point, selectedCategories);
  const acceptedCategories = normalizeAcceptedCategories(point);
  const reasonId = `point-reason-${point.id}`;

  return (
    <button
      type="button"
      onClick={() => availability.canSelect && onSelectPoint(point)}
      disabled={!availability.canSelect}
      aria-describedby={!availability.canSelect && availability.reason ? reasonId : undefined}
      className={cn(
        'w-full min-w-0 rounded-[1.75rem] border p-5 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        availability.canSelect && 'hover:-translate-y-0.5 hover:shadow-card-lg',
        isSelected
          ? 'border-primary bg-primary-light/35 shadow-card dark:bg-primary/20'
          : availability.canSelect
            ? 'border-gray-100 bg-white dark:border-white/10 dark:bg-surface-inkSoft'
            : 'cursor-not-allowed border-amber-200 bg-amber-50/70 text-gray-500 dark:border-amber-800/50 dark:bg-amber-900/10',
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={cn(
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl',
              isSelected
                ? 'bg-primary text-white'
                : availability.canSelect
                  ? 'bg-primary-light text-primary dark:bg-primary/20'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20',
            )}
          >
            <MapPin size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-on-surface dark:text-gray-100">
                {point.organizationName ?? point.name}
              </p>
              {point.distanceKm != null && (
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-primary shadow-sm dark:bg-surface-ink">
                  {point.distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km
                </span>
              )}
              {alreadyUsed && <Badge tone="primary">Já doei aqui</Badge>}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {formatAddressSummary(point) ?? 'Endereço não informado'}
            </p>
            {(point.neighborhood || point.city || point.state) && (
              <p className="mt-1 text-sm text-gray-400">
                {[point.neighborhood, point.city, point.state].filter(Boolean).join(' - ')}
              </p>
            )}
            {point.openingHours && (
              <p className="mt-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                <Clock3 size={13} />
                {point.openingHours}
              </p>
            )}
            {acceptedCategories.length > 0 && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {acceptedCategories.map((category) => categoryLabels[category] ?? category).join(' - ')}
              </p>
            )}
            {availability.reason && (
              <div
                id={reasonId}
                className={cn(
                  'mt-3 rounded-2xl px-3 py-2 text-xs leading-6',
                  availability.tone === 'warning'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                    : 'bg-orange-100 text-orange-800',
                )}
              >
                {availability.reason}
              </div>
            )}
          </div>
        </div>

        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]',
            isSelected && 'bg-primary-deeper text-white',
            !isSelected && availability.canSelect && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
            !isSelected && !availability.canSelect && 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
          )}
        >
          {isSelected ? <Check size={13} strokeWidth={3} /> : availability.canSelect ? <Check size={13} /> : <AlertTriangle size={13} />}
          {isSelected ? 'Selecionado' : availability.label}
        </div>
      </div>
    </button>
  );
}

type ReviewStepProps = {
  items: DonationItemDraft[];
  packages: DonationPackageDraft[];
  notes: string;
  selectedPoint: CollectionPoint | null;
  packageMode: PackageMode;
  totalItems: number;
  uniqueCategories: number;
  confirmed: boolean;
  validationMessage: string | null;
  onEditStep: (step: number) => void;
  onConfirmedChange: (value: boolean) => void;
};

export function ReviewStep({
  items,
  packages,
  notes,
  selectedPoint,
  packageMode,
  totalItems,
  uniqueCategories,
  confirmed,
  validationMessage,
  onEditStep,
  onConfirmedChange,
}: ReviewStepProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <ReviewCard
          icon={Shirt}
          title="Itens"
          actionLabel="Editar itens"
          onEdit={() => onEditStep(0)}
          lines={[
            `${totalItems} item(ns) em ${uniqueCategories} categoria(s)`,
            items.map(describeItem).join(' - '),
          ]}
        />
        <ReviewCard
          icon={Box}
          title="Embalagem"
          actionLabel="Editar embalagem"
          onEdit={() => onEditStep(1)}
          lines={[
            describePackages(packages),
            packageMode === 'AUTO' ? 'Estimativa automática' : 'Ajustado manualmente',
          ]}
        />
        <ReviewCard
          icon={MapPin}
          title="Ponto de coleta"
          actionLabel="Trocar ponto"
          onEdit={() => onEditStep(2)}
          className="lg:col-span-2"
          lines={[
            selectedPoint?.organizationName ?? selectedPoint?.name ?? 'Nenhum ponto escolhido',
            selectedPoint
              ? `${formatDistance(selectedPoint.distanceKm)}${formatAddressSummary(selectedPoint) ?? 'Endereço não informado'}`
              : 'Escolha um local para continuar',
          ]}
        />
        {notes.trim() && (
          <ReviewCard
            icon={Info}
            title="Observações"
            actionLabel="Editar"
            onEdit={() => onEditStep(1)}
            className="lg:col-span-2"
            lines={[notes.trim()]}
          />
        )}
      </div>

      {validationMessage && <InlineAlert tone="danger" title="Antes de confirmar" message={validationMessage} />}

      <label className="flex cursor-pointer items-start gap-3 rounded-[1.75rem] border border-gray-100 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-surface-inkSoft">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmedChange(event.target.checked)}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm leading-7 text-gray-500">
          Confirmo que os itens estão limpos, em bom estado e prontos para seguir para o ponto selecionado.
        </span>
      </label>
    </div>
  );
}

function ReviewCard({
  icon: Icon,
  title,
  lines,
  actionLabel,
  onEdit,
  className,
}: {
  icon: LucideIcon;
  title: string;
  lines: string[];
  actionLabel: string;
  onEdit: () => void;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[1.75rem] bg-surface p-5 dark:bg-surface-ink', className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-primary dark:bg-surface-inkSoft">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</p>
          {lines.map((line, index) => (
            <p
              key={`${title}-${index}`}
              className={cn(
                'mt-2 break-words leading-6',
                index === 0
                  ? 'text-sm font-semibold text-primary-deeper dark:text-white'
                  : 'text-sm text-gray-500',
              )}
            >
              {line}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-9 flex-shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-primary hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-white/10 dark:bg-surface-inkSoft"
        >
          <Edit3 size={12} />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

type SuccessPanelProps = {
  selectedPointName: string | null;
  onContinue: () => void;
  onViewDonations: () => void;
};

export function DonationSuccessPanel({ selectedPointName, onContinue, onViewDonations }: SuccessPanelProps) {
  const totalSeconds = 7;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const elapsedPercent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  useEffect(() => {
    const timeout = window.setTimeout(onContinue, totalSeconds * 1000);
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [onContinue]);

  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] bg-primary-deeper p-6 text-white shadow-panel sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white text-primary-deeper shadow-card">
            <Package size={34} />
          </div>
          <div className="mt-5">
            <Badge tone="white" icon={<Check size={12} strokeWidth={3} />}>Doação registrada</Badge>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Doação registrada com sucesso.
          </h1>
          <p className="mt-3 text-sm leading-7 text-primary-muted">
            Redirecionando para o rastreio em {secondsLeft} segundo{secondsLeft === 1 ? '' : 's'}...
          </p>

          <div className="mt-6 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div
              className="h-2 rounded-full bg-primary-glow transition-all duration-1000"
              style={{ width: `${elapsedPercent}%` }}
            />
          </div>

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <DonationButton
              variant="primary"
              onClick={onContinue}
              rightIcon={<ChevronRight size={16} />}
              className="bg-primary-glow text-primary-deeper hover:bg-primary-muted"
            >
              Continuar agora
            </DonationButton>
            <DonationButton
              variant="secondary"
              onClick={onViewDonations}
              className="border-white/20 bg-transparent text-white hover:border-primary-muted hover:text-primary-muted dark:bg-transparent"
            >
              Ver minhas doações
            </DonationButton>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-primary-muted">
            <MapPin size={14} />
            <span>{selectedPointName ?? 'Ponto de coleta escolhido'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoadingDonationState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="flex items-center gap-3 rounded-[1.75rem] bg-white px-5 py-4 text-sm text-gray-500 shadow-card dark:bg-surface-inkSoft dark:text-gray-400 dark:shadow-none">
        <Loader2 size={18} className="animate-spin text-primary" />
        {label}
      </div>
    </div>
  );
}

export function NonDonorState() {
  return (
    <div className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell">
        <div className="rounded-[2rem] bg-white p-6 shadow-card dark:bg-surface-inkSoft dark:shadow-none lg:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Fluxo exclusivo para doadores
          </p>
          <h1 className="mt-3 text-3xl font-bold text-primary-deeper dark:text-white">Seu perfil não cria doações</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
            Perfis de ponto de coleta, ONG e administração acompanham ou operam doações, mas não iniciam uma nova entrega como doadores.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/inicio"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary-deeper px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Ir para meu painel
            </Link>
            <Link
              href="/operacoes"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-white/10 dark:text-gray-300"
            >
              Abrir operações
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'white';
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold',
        tone === 'neutral' && 'bg-surface text-gray-500',
        tone === 'primary' && 'bg-primary-light text-primary',
        tone === 'white' && 'bg-white text-primary shadow-sm',
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function InlineAlert({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: 'danger' | 'warning';
}) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-[1.5rem] border px-4 py-3 text-sm',
        tone === 'danger' && 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}

function VolumeIllustration({ prefersBox }: { prefersBox: boolean }) {
  return (
    <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-[1.75rem] bg-surface dark:bg-surface-inkSoft">
      <div className="absolute right-5 top-5 h-9 w-8 rounded-b-xl rounded-t-md border border-accent-amber bg-accent-amberSoft" />
      <div className="absolute right-7 top-3 h-5 w-4 rounded-t-full border border-accent-amber border-b-0" />
      <div className="relative flex h-20 w-24 items-center justify-center rounded-2xl border border-primary/35 bg-white text-primary shadow-sm">
        {prefersBox ? <Box size={42} /> : <ShoppingBag size={42} />}
      </div>
    </div>
  );
}

function formatDistance(distanceKm?: number) {
  if (distanceKm == null) return '';
  return `${distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km - `;
}
