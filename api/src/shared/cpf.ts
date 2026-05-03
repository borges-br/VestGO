const REPEATED_DIGITS = /^(\d)\1+$/;

export function normalizeCpf(input: string) {
  const digits = input.replace(/\D/g, '');

  if (digits.length !== 11 || REPEATED_DIGITS.test(digits)) {
    return null;
  }

  const calculateDigit = (length: number) => {
    const sum = digits
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  if (calculateDigit(9) !== Number(digits[9])) {
    return null;
  }

  if (calculateDigit(10) !== Number(digits[10])) {
    return null;
  }

  return digits;
}
