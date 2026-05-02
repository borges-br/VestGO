import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';

const REPEATED_DIGITS = /^(\d)\1+$/;

export function formatBrazilPhoneInput(value: string) {
  const formatter = new AsYouType('BR');
  return formatter.input(value);
}

export function normalizeBrazilPhone(value: string) {
  const phone = parsePhoneNumberFromString(value.trim(), 'BR');

  if (!phone || phone.country !== 'BR' || !phone.isValid()) {
    return null;
  }

  if (REPEATED_DIGITS.test(phone.nationalNumber)) {
    return null;
  }

  return phone.number;
}
