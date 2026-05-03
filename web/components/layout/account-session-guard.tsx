'use client';

import { signOut, useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

const ACCOUNT_CLOSED_EVENT_KEY = 'vestgo:account-closed';
const DONATION_DRAFT_KEY = 'vestgo:donation-draft';

function clearSensitiveLocalState() {
  window.sessionStorage.removeItem(DONATION_DRAFT_KEY);
}

export function notifyAccountClosed() {
  if (typeof window === 'undefined') return;

  const value = String(Date.now());
  window.localStorage.setItem(ACCOUNT_CLOSED_EVENT_KEY, value);
  window.dispatchEvent(new CustomEvent('vestgo:account-closed'));

  try {
    const channel = new BroadcastChannel(ACCOUNT_CLOSED_EVENT_KEY);
    channel.postMessage({ closedAt: value });
    channel.close();
  } catch {
    // localStorage event is enough when BroadcastChannel is unavailable.
  }
}

export function AccountSessionGuard() {
  const { data: session } = useSession();
  const signingOutRef = useRef(false);

  useEffect(() => {
    async function closeSession(reason: 'account-closed' | 'session-ended' = 'account-closed') {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      clearSensitiveLocalState();
      await signOut({
        callbackUrl: reason === 'account-closed' ? '/login?accountClosed=1' : '/login?sessionExpired=1',
      });
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === ACCOUNT_CLOSED_EVENT_KEY) {
        void closeSession('account-closed');
      }
    }

    function handleAccountClosed() {
      void closeSession('account-closed');
    }

    function handleAuthInvalid(event: Event) {
      const detail = (event as CustomEvent<{ code?: string }>).detail;
      if (detail?.code === 'ACCOUNT_CLOSED') {
        void closeSession('account-closed');
      }
      if (detail?.code === 'SESSION_REVOKED') {
        void closeSession('session-ended');
      }
    }

    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel(ACCOUNT_CLOSED_EVENT_KEY);
      channel.onmessage = () => {
        void closeSession('account-closed');
      };
    } catch {
      channel = null;
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener('vestgo:account-closed', handleAccountClosed);
    window.addEventListener('vestgo:auth-invalid', handleAuthInvalid);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('vestgo:account-closed', handleAccountClosed);
      window.removeEventListener('vestgo:auth-invalid', handleAuthInvalid);
      channel?.close();
    };
  }, []);

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      void signOut({ callbackUrl: '/login?sessionExpired=1' });
    }
  }, [session?.error]);

  return null;
}
