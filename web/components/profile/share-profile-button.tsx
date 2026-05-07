'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

type ShareProfileButtonProps = {
  title: string;
  text: string;
  url?: string | null;
  disabled?: boolean;
  disabledMessage?: string;
};

function resolveShareUrl(url?: string | null) {
  if (typeof window === 'undefined') {
    return url ?? '';
  }

  if (!url) {
    return window.location.href.split('?')[0];
  }

  return new URL(url, window.location.origin).toString();
}

export function ShareProfileButton({
  title,
  text,
  url,
  disabled = false,
  disabledMessage = 'Disponível após aprovação do perfil público.',
}: ShareProfileButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const shareUrl = useMemo(() => resolveShareUrl(url), [url]);
  const fullText = `${text} ${shareUrl}`.trim();

  async function copyLink() {
    if (!shareUrl) {
      setStatus('manual');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 2200);
    } catch {
      setStatus('manual');
    }
  }

  async function handleShare() {
    if (disabled) {
      return;
    }

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: fullText, url: shareUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    await copyLink();
  }

  if (disabled) {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-primary-muted">
        {disabledMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleShare()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-primary-deeper transition-colors hover:bg-primary-light"
      >
        {status === 'copied' ? <Check size={16} /> : <Share2 size={16} />}
        {status === 'copied' ? 'Link copiado!' : 'Compartilhar perfil'}
      </button>
      {status === 'manual' && (
        <label className="block text-xs font-medium text-primary-muted">
          Copie o link
          <span className="mt-1 flex overflow-hidden rounded-xl bg-white/95 text-primary-deeper">
            <input
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
            />
            <button
              type="button"
              onClick={() => void copyLink()}
              className="flex items-center justify-center px-3 text-primary"
              aria-label="Copiar link"
            >
              <Copy size={14} />
            </button>
          </span>
        </label>
      )}
    </div>
  );
}
