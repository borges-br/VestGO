export type OperationalCodeKind = 'DONATION' | 'BATCH';

export type ParsedOperationalCode =
  | { valid: true; kind: OperationalCodeKind; code: string }
  | { valid: false; code: string; reason: string };

const DONATION_CODE_PATTERN = /^VGO-[A-Z0-9]{6}$/;
const BATCH_CODE_PATTERN = /^LOT-[A-Z0-9]{6}$/;
const MAX_OPERATIONAL_CODE_LENGTH = 16;

export function normalizeOperationalCode(input: string) {
  return input.trim().toUpperCase();
}

export function parseOperationalCode(input: string): ParsedOperationalCode {
  const code = normalizeOperationalCode(input);

  if (!code) {
    return { valid: false, code, reason: 'Informe um codigo VGO ou LOT.' };
  }

  if (code.length > MAX_OPERATIONAL_CODE_LENGTH) {
    return { valid: false, code, reason: 'Codigo muito longo.' };
  }

  if (/\s/.test(code)) {
    return { valid: false, code, reason: 'Codigo nao pode conter espacos internos.' };
  }

  if (DONATION_CODE_PATTERN.test(code)) {
    return { valid: true, kind: 'DONATION', code };
  }

  if (BATCH_CODE_PATTERN.test(code)) {
    return { valid: true, kind: 'BATCH', code };
  }

  return {
    valid: false,
    code,
    reason: 'Codigo nao reconhecido. Use VGO-XXXXXX ou LOT-XXXXXX.',
  };
}
