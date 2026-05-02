export type CookieConsent = {
  essential: true;
  optional: boolean;
  decidedAt: string;
  version: 1;
};

const STORAGE_KEY = 'vestgo:cookie-consent';

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(optional: boolean): CookieConsent {
  const consent: CookieConsent = {
    essential: true,
    optional,
    decidedAt: new Date().toISOString(),
    version: 1,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  return consent;
}
