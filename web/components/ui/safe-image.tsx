'use client';

import { type ImgHTMLAttributes, type ReactNode, useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> & {
  alt: string;
  src?: string | null;
  className?: string;
  imageClassName?: string;
  fallback?: ReactNode;
  fallbackLabel?: string;
};

export function SafeImage({
  alt,
  src,
  className = '',
  imageClassName = 'h-full w-full object-cover',
  fallback,
  fallbackLabel = 'Imagem indisponível',
  onError,
  ...imageProps
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const shouldShowFallback = !src || failed;

  return (
    <div className={`flex overflow-hidden ${className}`}>
      {shouldShowFallback ? (
        fallback ?? (
          <div
            role={src ? 'img' : undefined}
            aria-label={src ? `${alt} indisponível` : undefined}
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface px-4 py-6 text-center text-sm font-semibold text-gray-400"
          >
            <ImageOff size={22} aria-hidden="true" />
            <span>{fallbackLabel}</span>
          </div>
        )
      ) : (
        <img
          {...imageProps}
          src={src}
          alt={alt}
          className={imageClassName}
          onError={(event) => {
            setFailed(true);
            onError?.(event);
          }}
        />
      )}
    </div>
  );
}
