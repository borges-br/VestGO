export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

function formatParts(input: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(input);
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? '';
}

export function getZonedMonthKey(input: Date) {
  const parts = formatParts(input);
  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}`;
}

export function getZonedYear(input: Date) {
  const year = Number(getPart(formatParts(input), 'year'));
  return Number.isFinite(year) ? year : input.getUTCFullYear();
}

export function getPreviousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return getZonedMonthKey(new Date());
  }

  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  return `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
}

export function getMonthsSinceInAppTimezone(input: Date, now = new Date()) {
  const [startYear, startMonth] = getZonedMonthKey(input).split('-').map(Number);
  const [currentYear, currentMonth] = getZonedMonthKey(now).split('-').map(Number);

  if (
    !Number.isFinite(startYear) ||
    !Number.isFinite(startMonth) ||
    !Number.isFinite(currentYear) ||
    !Number.isFinite(currentMonth)
  ) {
    return 0;
  }

  return Math.max(0, (currentYear - startYear) * 12 + (currentMonth - startMonth));
}

export function formatShortDateInAppTimezone(input: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
  }).format(input);
}
