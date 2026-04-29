'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Check, Copy } from 'lucide-react';

interface CodeQrCardProps {
  code: string;
  title: string;
  description: string;
  compact?: boolean;
  className?: string;
}

export function CodeQrCard({
  code,
  title,
  description,
  compact = false,
  className = '',
}: CodeQrCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={`rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 ${
        compact ? 'sm:flex sm:items-center sm:gap-4' : ''
      } ${className}`}
    >
      <div
        className={`mx-auto flex items-center justify-center rounded-[1.25rem] bg-white p-3 ring-1 ring-gray-100 ${
          compact ? 'h-32 w-32 flex-shrink-0' : 'h-44 w-44'
        }`}
        aria-label={`QR Code ${code}`}
      >
        <QRCode value={code} size={compact ? 104 : 152} level="M" />
      </div>

      <div className={compact ? 'mt-4 min-w-0 flex-1 sm:mt-0' : 'mt-4 text-center'}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          {title}
        </p>
        <p className="mt-2 font-mono text-lg font-bold text-primary-deeper dark:text-white">
          {code}
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-300">
          {description}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 px-4 py-2 text-xs font-semibold text-primary-deeper transition-colors hover:bg-primary-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-primary/40 dark:text-primary-light"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Codigo copiado' : 'Copiar codigo'}
        </button>
      </div>
    </div>
  );
}
