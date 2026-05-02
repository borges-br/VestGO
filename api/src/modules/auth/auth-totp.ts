import { authenticator } from 'otplib';

authenticator.options = {
  window: 1,
  step: 30,
  digits: 6,
};

const ISSUER = 'VestGO';

export function generateTotpSecret(): string {
  return authenticator.generateSecret(20);
}

export function buildOtpAuthUri(secret: string, accountLabel: string): string {
  const account = accountLabel || 'usuario';
  return authenticator.keyuri(account, ISSUER, secret);
}

export function verifyTotp(secret: string, code: string): boolean {
  const sanitized = code.replace(/\s+/g, '').trim();

  if (!/^\d{6}$/.test(sanitized)) {
    return false;
  }

  try {
    return authenticator.verify({ token: sanitized, secret });
  } catch {
    return false;
  }
}
