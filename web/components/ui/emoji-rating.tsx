'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface EmojiRatingProps {
  value?: number;
  defaultValue?: number;
  onChange?: (rating: number) => void;
  className?: string;
  labels?: [string, string, string, string, string];
  idleLabel?: string;
  disabled?: boolean;
}

const defaultLabels: [string, string, string, string, string] = [
  'Difícil',
  'Fraco',
  'Regular',
  'Boa',
  'Incrível',
];

const emojis = ['😔', '😕', '😐', '🙂', '😍'];

export function EmojiRating({
  value,
  defaultValue = 0,
  onChange,
  className,
  labels = defaultLabels,
  idleLabel = 'Como foi?',
  disabled = false,
}: EmojiRatingProps) {
  const [internal, setInternal] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const controlled = typeof value === 'number';
  const current = controlled ? (value as number) : internal;
  const display = hover || current;

  const handleClick = (next: number) => {
    if (disabled) return;
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className={cn('flex flex-col items-center gap-5', className)}>
      <div className="flex items-center gap-2 sm:gap-3">
        {emojis.map((emoji, i) => {
          const val = i + 1;
          const active = val <= display;
          return (
            <button
              key={val}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(val)}
              onMouseEnter={() => !disabled && setHover(val)}
              onMouseLeave={() => setHover(0)}
              onFocus={() => !disabled && setHover(val)}
              onBlur={() => setHover(0)}
              className={cn(
                'group relative rounded-2xl p-1 transition-transform duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
              )}
              aria-label={`${val} de 5 — ${labels[i]}`}
              aria-pressed={val === current}
            >
              <span
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl text-3xl transition-all duration-300 ease-out sm:h-14 sm:w-14',
                  active
                    ? 'scale-110 grayscale-0 drop-shadow-sm'
                    : 'grayscale opacity-40 group-hover:scale-105 group-hover:opacity-70 group-hover:grayscale-[0.3]',
                )}
              >
                {emoji}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative h-6 w-40">
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center text-xs font-medium uppercase tracking-[0.18em] text-gray-400 transition-all duration-300',
            display > 0 ? 'scale-95 opacity-0 blur-sm' : 'scale-100 opacity-100 blur-0',
          )}
        >
          {idleLabel}
        </span>
        {labels.map((label, i) => (
          <span
            key={label + i}
            className={cn(
              'absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide text-primary-deeper transition-all duration-300',
              display === i + 1 ? 'scale-100 opacity-100 blur-0' : 'scale-105 opacity-0 blur-sm',
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
