'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TrackStatus = 'done' | 'active' | 'pending';

export interface TrackStep {
  id: string;
  label: string;
  description?: string;
  caption?: string;
  icon?: LucideIcon;
  status?: TrackStatus;
  role?: 'donor' | 'point' | 'ngo' | 'admin' | 'impact';
}

interface StatusTrackProps {
  steps: TrackStep[];
  orientation?: 'horizontal' | 'vertical';
  tone?: 'light' | 'dark';
  className?: string;
}

const roleDot: Record<NonNullable<TrackStep['role']>, string> = {
  donor: 'bg-primary',
  point: 'bg-accent-amber',
  ngo: 'bg-accent-olive',
  admin: 'bg-accent-slate',
  impact: 'bg-primary-glow',
};

export function StatusTrack({
  steps,
  orientation = 'horizontal',
  tone = 'dark',
  className,
}: StatusTrackProps) {
  const reduce = useReducedMotion();
  const isVertical = orientation === 'vertical';
  const dark = tone === 'dark';

  return (
    <ol
      className={cn(
        'relative w-full',
        isVertical ? 'flex flex-col gap-6' : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {steps.map((step, index) => {
        const Icon = step.icon;
        const status = step.status ?? (index === 0 ? 'done' : index === 1 ? 'active' : 'pending');
        const isLast = index === steps.length - 1;

        const dotClass =
          status === 'done'
            ? 'bg-primary-glow text-primary-deeper'
            : status === 'active'
              ? 'bg-white text-primary-deeper'
              : dark
                ? 'bg-white/10 text-white/60'
                : 'bg-surface text-gray-400';

        const labelClass = dark ? 'text-white' : 'text-primary-deeper';
        const subClass = dark ? 'text-white/65' : 'text-gray-500';
        const captionClass = dark ? 'text-primary-muted' : 'text-primary';
        const connectorClass = dark ? 'bg-white/15' : 'bg-primary/10';

        return (
          <motion.li
            key={step.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
            className={cn('relative', isVertical ? 'flex gap-4' : 'flex flex-col gap-3')}
          >
            <div className={cn('relative flex', isVertical ? 'flex-col items-center' : 'items-center gap-3')}>
              <div
                className={cn(
                  'relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl font-semibold shadow-card transition-colors',
                  dotClass,
                )}
              >
                {Icon ? <Icon size={18} strokeWidth={1.75} /> : <span>{index + 1}</span>}
                {status === 'active' && (
                  <span className="pointer-events-none absolute inset-0 rounded-2xl border border-white/60 animate-pulse-ring" />
                )}
              </div>

              {!isLast && (
                <div
                  className={cn(
                    'origin-left overflow-hidden rounded-full',
                    isVertical ? 'mt-2 h-10 w-0.5' : 'flex-1 h-[2px]',
                    connectorClass,
                  )}
                >
                  <motion.div
                    initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.8, delay: index * 0.12 + 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      'h-full w-full origin-left bg-gradient-to-r',
                      dark ? 'from-primary-glow via-primary-muted to-primary' : 'from-primary via-primary/60 to-primary-glow',
                    )}
                    style={{ transformOrigin: isVertical ? 'top' : 'left' }}
                  />
                </div>
              )}
            </div>

            <div className={cn('min-w-0', isVertical ? 'pt-1' : '')}>
              {step.role && (
                <span
                  className={cn(
                    'mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]',
                    dark ? 'text-primary-muted' : 'text-primary',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', roleDot[step.role])} />
                  {step.caption ?? step.role}
                </span>
              )}
              <p className={cn('text-sm font-semibold leading-tight sm:text-base', labelClass)}>
                {step.label}
              </p>
              {step.description && (
                <p className={cn('mt-1 text-xs leading-relaxed sm:text-sm', subClass)}>{step.description}</p>
              )}
              {!step.role && step.caption && (
                <p className={cn('mt-2 text-[11px] font-semibold uppercase tracking-[0.2em]', captionClass)}>
                  {step.caption}
                </p>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
