import type {
  DonationPackageSize,
  DonationPackageType,
  ItemCategory,
} from '@/lib/api';

export type DonationItemForPackageEstimate = {
  category: ItemCategory;
  quantity: number;
};

export type EstimatedDonationPackage = {
  id: string;
  type: DonationPackageType;
  size: DonationPackageSize;
  quantity: number;
};

export type PackageEstimate = {
  packages: EstimatedDonationPackage[];
  estimatedUnits: number;
  roundedUnits: number;
  prefersBox: boolean;
  explanation: string;
};

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
  units: number;
  quantity: number;
};

const categoryPackingModel = {
  CLOTHING: { group: 'SOFT', alpha: 1.0, beta: 0.92 },
  ACCESSORIES: { group: 'SOFT', alpha: 0.35, beta: 0.85 },
  BAGS: { group: 'SOFT', alpha: 1.8, beta: 0.95 },
  SHOES: { group: 'SHOES', alpha: 2.4, beta: 1.0 },
  TOYS: { group: 'TOYS', alpha: 2.0, beta: 1.0 },
  FOOD: { group: 'FOOD', alpha: 1.5, beta: 1.0 },
  OTHER: { group: 'OTHER', alpha: 1.4, beta: 1.0 },
} satisfies Record<ItemCategory, {
  group: PackingGroup;
  alpha: number;
  beta: number;
}>;

const packageCapacity: Record<PackageKey, number> = {
  BAG_SMALL: 6,
  BAG_MEDIUM: 14,
  BAG_LARGE: 28,
  BOX_SMALL: 8,
  BOX_MEDIUM: 20,
  BOX_LARGE: 36,
};

const packageMeta: Record<PackageKey, {
  type: DonationPackageType;
  size: DonationPackageSize;
}> = {
  BAG_SMALL: { type: 'BAG', size: 'SMALL' },
  BAG_MEDIUM: { type: 'BAG', size: 'MEDIUM' },
  BAG_LARGE: { type: 'BAG', size: 'LARGE' },
  BOX_SMALL: { type: 'BOX', size: 'SMALL' },
  BOX_MEDIUM: { type: 'BOX', size: 'MEDIUM' },
  BOX_LARGE: { type: 'BOX', size: 'LARGE' },
};

const shoePairCapacity: Record<PackageKey, number> = {
  ...packageCapacity,
  BOX_SMALL: 2,
  BOX_MEDIUM: 6,
  BOX_LARGE: 10,
};

function createPackageId() {
  return Math.random().toString(36).slice(2, 10);
}

function getItemVolume(item: DonationItemForPackageEstimate) {
  const model = categoryPackingModel[item.category];
  return model.alpha * Math.pow(item.quantity, model.beta);
}

function makeSuggestion(key: PackageKey, quantity: number): PackageSuggestion {
  const meta = packageMeta[key];
  return {
    key,
    type: meta.type,
    size: meta.size,
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

  return Array.from(merged.values());
}

function packGreedy(
  units: number,
  allowedKeys: PackageKey[],
  capacities: Record<PackageKey, number> = packageCapacity,
): PackageSuggestion[] {
  let remaining = Math.ceil(Math.max(0, units));
  const result: PackageSuggestion[] = [];

  const sorted = [...allowedKeys].sort(
    (left, right) => capacities[right] - capacities[left],
  );

  for (const key of sorted) {
    const capacity = capacities[key];
    const quantity = Math.floor(remaining / capacity);

    if (quantity > 0) {
      result.push(makeSuggestion(key, quantity));
      remaining -= quantity * capacity;
    }
  }

  if (remaining > 0) {
    const smallest = [...allowedKeys]
      .sort((left, right) => capacities[left] - capacities[right])
      .find((key) => remaining <= capacities[key])
      ?? allowedKeys[allowedKeys.length - 1];

    result.push(makeSuggestion(smallest, 1));
  }

  return mergeEqualPackages(result);
}

function buildPackingGroups(items: DonationItemForPackageEstimate[]): PackingGroupInput[] {
  const groups = new Map<PackingGroup, PackingGroupInput>();

  items.forEach((item) => {
    if (item.quantity <= 0) return;

    const model = categoryPackingModel[item.category];
    const current = groups.get(model.group) ?? {
      group: model.group,
      units: 0,
      quantity: 0,
    };

    current.units += getItemVolume(item);
    current.quantity += item.quantity;
    groups.set(model.group, current);
  });

  return Array.from(groups.values());
}

function estimateGroupPackages(group: PackingGroupInput): PackageSuggestion[] {
  if (group.group === 'SOFT') {
    if (group.units <= 6 && group.quantity <= 5) {
      return [makeSuggestion('BAG_SMALL', 1)];
    }

    if (group.units <= 14) {
      return [makeSuggestion('BAG_MEDIUM', 1)];
    }

    if (group.units <= 28) {
      return [makeSuggestion('BAG_LARGE', 1)];
    }

    return packGreedy(group.units, ['BAG_LARGE', 'BAG_MEDIUM', 'BAG_SMALL']);
  }

  if (group.group === 'SHOES') {
    if (group.quantity <= 2) {
      return [makeSuggestion('BOX_SMALL', 1)];
    }

    if (group.quantity <= 6) {
      return [makeSuggestion('BOX_MEDIUM', 1)];
    }

    if (group.quantity <= 10) {
      return [makeSuggestion('BOX_LARGE', 1)];
    }

    return packGreedy(group.quantity, ['BOX_LARGE', 'BOX_MEDIUM', 'BOX_SMALL'], shoePairCapacity);
  }

  if (group.group === 'TOYS') {
    if (group.quantity <= 4 || group.units <= 8) {
      return [makeSuggestion('BOX_SMALL', 1)];
    }

    if (group.quantity <= 10 || group.units <= 20) {
      return [makeSuggestion('BOX_MEDIUM', 1)];
    }

    return packGreedy(group.units, ['BOX_LARGE', 'BOX_MEDIUM', 'BOX_SMALL']);
  }

  if (group.group === 'FOOD') {
    if (group.units <= 6) {
      return [makeSuggestion('BOX_SMALL', 1)];
    }

    if (group.units <= 16) {
      return [makeSuggestion('BOX_MEDIUM', 1)];
    }

    return packGreedy(group.units, ['BOX_LARGE', 'BOX_MEDIUM', 'BOX_SMALL']);
  }

  if (group.units <= 8) {
    return [makeSuggestion('BOX_SMALL', 1)];
  }

  if (group.units <= 20) {
    return [makeSuggestion('BOX_MEDIUM', 1)];
  }

  return packGreedy(group.units, ['BOX_LARGE', 'BOX_MEDIUM', 'BOX_SMALL']);
}

function buildPackagingExplanation(groups: PackingGroupInput[]) {
  const groupSet = new Set(groups.map((group) => group.group));
  const notes: string[] = [];

  if (groupSet.has('FOOD') && groups.length > 1) {
    notes.push('Alimentos vão separados dos demais itens.');
  }

  if (groupSet.has('SHOES') && groupSet.has('SOFT')) {
    notes.push('Separamos calçados das roupas para facilitar a entrega.');
  }

  if (groupSet.has('TOYS') && groups.length > 1) {
    notes.push('Brinquedos seguem em caixa separada para proteger os itens.');
  }

  return notes.length > 0
    ? notes.join(' ')
    : 'Sugerimos uma embalagem prática para levar sua doação.';
}

function toDonationPackageDraft(
  suggestion: PackageSuggestion,
  createId: () => string,
): EstimatedDonationPackage {
  return {
    id: createId(),
    type: suggestion.type,
    size: suggestion.size,
    quantity: suggestion.quantity,
  };
}

export function estimatePackagesFromItems(
  items: DonationItemForPackageEstimate[],
  createId: () => string = createPackageId,
): PackageEstimate {
  const groups = buildPackingGroups(items);

  if (groups.length === 0) {
    return {
      packages: [toDonationPackageDraft(makeSuggestion('BAG_SMALL', 1), createId)],
      estimatedUnits: 0,
      roundedUnits: 1,
      prefersBox: false,
      explanation: 'Sugerimos uma embalagem prática para levar sua doação.',
    };
  }

  const estimatedUnits = groups.reduce((sum, group) => sum + group.units, 0);
  const suggestions = groups.flatMap(estimateGroupPackages);
  const merged = mergeEqualPackages(suggestions);

  // Futuro: calibrar alpha/beta e capacidades com base em ajustes manuais reais dos usuários.
  return {
    packages: merged.map((suggestion) => toDonationPackageDraft(suggestion, createId)),
    estimatedUnits,
    roundedUnits: Math.max(1, Math.ceil(estimatedUnits)),
    prefersBox: merged.some((suggestion) => suggestion.type === 'BOX'),
    explanation: buildPackagingExplanation(groups),
  };
}
