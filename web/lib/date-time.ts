export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'America/Sao_Paulo';

type DateInput = string | number | Date;

function toDate(input: DateInput) {
  return input instanceof Date ? input : new Date(input);
}

function formatWithParts(input: DateInput) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(toDate(input));
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? '';
}

export function formatDateLabel(input: DateInput) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(toDate(input));
}

export function formatShortDateLabel(input: DateInput) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
  }).format(toDate(input));
}

export function formatDayMonthLabel(input: DateInput) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: 'short',
  }).format(toDate(input));
}

export function formatDateTimeLabel(input: DateInput) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(toDate(input));
}

export function formatDayLabel(input: DateInput) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
  }).format(toDate(input));
}

export function formatMonthLabel(input: DateInput) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    month: 'short',
    year: 'numeric',
  })
    .format(toDate(input))
    .replace('.', '');
}

export function getMonthKey(input: DateInput = new Date()) {
  const parts = formatWithParts(input);
  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}`;
}

export function getCurrentMonthKey() {
  return getMonthKey(new Date());
}

export function getPreviousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return getCurrentMonthKey();
  }

  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  return `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
}
