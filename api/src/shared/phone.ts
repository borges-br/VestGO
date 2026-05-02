import { parsePhoneNumberFromString } from 'libphonenumber-js';

const REPEATED_DIGITS = /^(\d)\1+$/;

export function normalizeBrazilianPhone(input: string) {
  const raw = input.trim();
  const phone = parsePhoneNumberFromString(raw, 'BR');

  if (!phone || phone.country !== 'BR' || !phone.isValid()) {
    return null;
  }

  if (REPEATED_DIGITS.test(phone.nationalNumber)) {
    return null;
  }

  return phone.number;
}
