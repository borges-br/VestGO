import { cn } from '@/lib/utils';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  rightElement?: React.ReactNode;
}

export function Input({ label, hint, rightElement, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {(label || hint) && (
        <div className="flex justify-between items-center mb-1.5 px-1">
          {label && (
            <label
              htmlFor={inputId}
              className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase"
            >
              {label}
            </label>
          )}
          {hint && <span className="text-[11px] font-semibold tracking-widest text-primary uppercase">{hint}</span>}
        </div>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'soft-field h-14 px-5 text-base w-full outline-none text-on-surface placeholder:text-gray-400',
            rightElement && 'pr-12',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}