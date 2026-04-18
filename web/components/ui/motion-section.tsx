'use client';

import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface MotionSectionProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  distance?: number;
  once?: boolean;
  amount?: number;
  as?: 'div' | 'section' | 'article' | 'header';
}

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  none: { x: 0, y: 0 },
};

export const MotionSection = forwardRef<HTMLDivElement, MotionSectionProps>(
  (
    {
      children,
      className,
      delay = 0,
      direction = 'up',
      distance,
      once = true,
      amount = 0.25,
      as = 'div',
      ...props
    },
    ref,
  ) => {
    const base = offsets[direction];
    const d = distance ?? Math.max(Math.abs(base.x), Math.abs(base.y));
    const signX = base.x === 0 ? 0 : base.x / Math.abs(base.x);
    const signY = base.y === 0 ? 0 : base.y / Math.abs(base.y);

    const variants: Variants = {
      hidden: { opacity: 0, x: signX * d, y: signY * d },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
      },
    };

    const Comp = motion[as] as typeof motion.div;

    return (
      <Comp
        ref={ref}
        className={cn(className)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, amount }}
        variants={variants}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

MotionSection.displayName = 'MotionSection';

export const staggerParent: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};
