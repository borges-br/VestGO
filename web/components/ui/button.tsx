'use client';
import { cn } from '@/lib/utils';
import React from 'react';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  asChild?: boolean;
  children: React.ReactNode;
}

export function Button({
  children,
  className,
  variant = 'primary',
  asChild = false,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-primary-deeper text-white hover:bg-primary-dark shadow-sm',
    outline: 'border-2 border-gray-200 text-on-surface bg-white hover:bg-surface',
    ghost: 'text-on-surface hover:bg-surface',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cn(base, styles[variant], className, child.props.className),
    });
  }

  return (
    <button className={cn(base, styles[variant], className)} {...props}>
      {children}
    </button>
  );
}