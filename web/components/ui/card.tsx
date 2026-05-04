import { cn } from '@/lib/utils';
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-2xl shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}