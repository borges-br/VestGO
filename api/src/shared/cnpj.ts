const REPEATED_DIGITS = /^(\d)\1+$/;

export function normalizeCnpj(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  if (digits.length !== 14 || REPEATED_DIGITS.test(digits)) {
    return null;
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

  if (d1 !== Number(digits[12]) || d2 !== Number(digits[13])) {
    return null;
  }

  return digits;
}
