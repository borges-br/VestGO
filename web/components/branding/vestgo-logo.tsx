'use client';

import { useState } from 'react';
import { VestgoMark } from '@/components/branding/vestgo-mark';

type VestgoLogoProps = {
  className?: string;
  imageClassName?: string;
  fallbackTextClassName?: string;
  alt?: string;
};

export function VestgoLogo({
  className = '',
  imageClassName = '',
  fallbackTextClassName = '',
  alt = 'VestGO',
}: VestgoLogoProps) {
  const sources = ['/branding/vestgo-logo.svg', '/branding/vestgo-logo.webp'];
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex] ?? null;

  if (!source) {
    return (
      <div className={`flex items-center gap-3 ${className}`.trim()}>
        <VestgoMark className="h-11 w-11" />
        <div className={fallbackTextClassName || 'leading-tight'}>
          <p className="text-lg font-bold tracking-tight text-primary-deeper">VestGO</p>
          <p className="text-[11px] uppercase tracking-[0.24em] text-gray-400">
            Doacao com proposito
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={source}
        alt={alt}
        className={`h-full w-full object-contain ${imageClassName}`.trim()}
        onError={() => setSourceIndex((current) => current + 1)}
      />
    </div>
  );
}
