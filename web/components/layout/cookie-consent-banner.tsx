'use client';

import { useEffect, useState } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';
import { getCookieConsent, setCookieConsent } from '@/lib/cookie-consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() == null);
  }, []);

  function decide(optional: boolean) {
    setCookieConsent(optional);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4 sm:px-6 sm:pb-6" role="dialog" aria-live="polite">
      <div className="mx-auto flex max-w-shell flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-panel dark:border-white/10 dark:bg-surface-inkSoft dark:shadow-none sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/20 dark:text-primary-muted">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-primary-deeper dark:text-white">
              Privacidade e cookies
            </p>
            <p className="mt-1 max-w-3xl text-xs leading-6 text-gray-500 dark:text-gray-400">
              Usamos cookies essenciais para manter o login e a segurança. Cookies opcionais ficam desativados até você autorizar.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 xs:flex-row sm:flex-shrink-0">
          <button
            type="button"
            onClick={() => decide(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-gray-300 dark:hover:border-primary-muted dark:hover:text-primary-muted"
          >
            <X size={14} />
            Continuar sem cookies opcionais
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-deeper px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-dark"
          >
            <Check size={14} />
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
