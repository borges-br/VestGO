type AddressLike = {
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

function compact(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function formatAddressLine(address: AddressLike) {
  const primary = [compact(address.address), compact(address.addressNumber)]
    .filter(Boolean)
    .join(', ');

  if (!primary) {
    return null;
  }

  const complement = compact(address.addressComplement);
  return complement ? `${primary} - ${complement}` : primary;
}

export function formatAddressSummary(address: AddressLike) {
  return [
    formatAddressLine(address),
    compact(address.neighborhood),
    compact(address.city),
    compact(address.state),
  ]
    .filter(Boolean)
    .join(' - ');
}
