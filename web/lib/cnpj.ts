const REPEATED_DIGITS = /^(\d)\1+$/;

export function normalizeCnpjInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 14);
}

export function formatCnpjInput(value: string) {
  const digits = normalizeCnpjInput(value);
  const a = digits.slice(0, 2);
  const b = digits.slice(2, 5);
  const c = digits.slice(5, 8);
  const d = digits.slice(8, 12);
  const e = digits.slice(12, 14);

  if (digits.length <= 2) return a;
  if (digits.length <= 5) return `${a}.${b}`;
  if (digits.length <= 8) return `${a}.${b}.${c}`;
  if (digits.length <= 12) return `${a}.${b}.${c}/${d}`;
  return `${a}.${b}.${c}/${d}-${e}`;
}

export function isValidCnpj(value: string) {
  const digits = normalizeCnpjInput(value);

  if (digits.length !== 14 || REPEATED_DIGITS.test(digits)) {
    return false;
  }

  const calcDigit = (slice: string, weights: number[]) => {
    const sum = slice.split('').reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(digits.slice(0, 12), weights1);
  const d2 = calcDigit(digits.slice(0, 13), weights2);

  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}
