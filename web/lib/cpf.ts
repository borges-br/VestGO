const REPEATED_DIGITS = /^(\d)\1+$/;

export function normalizeCpfInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function formatCpfInput(value: string) {
  const digits = normalizeCpfInput(value);
  const first = digits.slice(0, 3);
  const second = digits.slice(3, 6);
  const third = digits.slice(6, 9);
  const verifier = digits.slice(9, 11);

  if (digits.length <= 3) return first;
  if (digits.length <= 6) return `${first}.${second}`;
  if (digits.length <= 9) return `${first}.${second}.${third}`;
  return `${first}.${second}.${third}-${verifier}`;
}

export function isValidCpf(value: string) {
  const digits = normalizeCpfInput(value);

  if (digits.length !== 11 || REPEATED_DIGITS.test(digits)) {
    return false;
  }

  const calculateDigit = (length: number) => {
    const sum = digits
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calculateDigit(9) === Number(digits[9]) && calculateDigit(10) === Number(digits[10]);
}
