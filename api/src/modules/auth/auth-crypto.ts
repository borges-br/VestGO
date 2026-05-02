import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.TWO_FACTOR_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error(
      'TWO_FACTOR_ENCRYPTION_KEY ausente. Configure uma chave hex de 32 bytes (64 caracteres) para habilitar 2FA.',
    );
  }

  const key = Buffer.from(raw, 'hex');

  if (key.length !== 32) {
    throw new Error(
      'TWO_FACTOR_ENCRYPTION_KEY deve ser uma string hex de 64 caracteres (32 bytes).',
    );
  }

  return key;
}

/**
 * Validates that the TWO_FACTOR_ENCRYPTION_KEY env var is properly configured.
 * Returns true if ready, false otherwise. Does not throw and does not leak details.
 */
export function isTwoFactorEncryptionReady(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Throws a generic error if 2FA encryption is not configured. Suitable for
 * gating endpoints that depend on encryption before any user-visible work.
 * Logs the underlying reason to the provided logger (if any) without exposing it.
 */
export function assertTwoFactorEncryptionReady(logger?: {
  error: (payload: unknown, msg?: string) => void;
}): void {
  try {
    getKey();
  } catch (err) {
    if (logger) {
      logger.error(
        { err },
        '2FA encryption misconfigured. Set TWO_FACTOR_ENCRYPTION_KEY as a 32-byte hex string (64 characters).',
      );
    }
    const guard = new Error('TWO_FACTOR_UNAVAILABLE');
    (guard as Error & { statusCode?: number }).statusCode = 503;
    throw guard;
  }
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const data = Buffer.from(payload, 'base64');

  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Payload 2FA cifrado invalido');
  }

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const enc = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const RECOVERY_CODE_GROUPS = 2;
const RECOVERY_GROUP_SIZE = 5;
const RECOVERY_CODE_COUNT = 10;

function generateRecoveryCode(): string {
  const groups: string[] = [];

  for (let i = 0; i < RECOVERY_CODE_GROUPS; i += 1) {
    let group = '';

    while (group.length < RECOVERY_GROUP_SIZE) {
      const buf = crypto.randomBytes(8).toString('base64').replace(/[^a-z0-9]/gi, '');
      group += buf;
    }

    groups.push(group.slice(0, RECOVERY_GROUP_SIZE).toLowerCase());
  }

  return groups.join('-');
}

export function generateRecoveryCodes(): string[] {
  const codes = new Set<string>();

  while (codes.size < RECOVERY_CODE_COUNT) {
    codes.add(generateRecoveryCode());
  }

  return Array.from(codes);
}

export function normalizeRecoveryCode(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '');
}
