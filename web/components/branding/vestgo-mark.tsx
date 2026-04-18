'use client';

import { useState } from 'react';

type VestgoMarkProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
};

export function VestgoMark({
  className = '',
  imageClassName = '',
  alt = 'VestGO',
}: VestgoMarkProps) {
  const sources = ['/branding/vestgo-mark.svg', '/branding/vestgo-mark.webp'];
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex] ?? null;

  if (!source) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-primary-deeper text-sm font-bold text-white shadow-sm ${className}`.trim()}
      >
        VG
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
