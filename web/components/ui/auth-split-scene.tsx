'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Dot = { x: number; y: number; r: number; opacity: number };
type Route = {
  start: { x: number; y: number; delay: number };
  end: { x: number; y: number };
  color: string;
};

interface AuthSplitSceneProps {
  className?: string;
  /** Normalized routes: coords 0..1 relative to canvas width/height. */
  routes?: Route[];
  /** Primary dot color (HSL/RGB css string). */
  dotColor?: string;
  /** Accent for moving particle glow. */
  accentColor?: string;
}

/**
 * Generates dots inside a loose Brazil-shaped silhouette — an approximation
 * using overlapping ellipses. The coordinate system is 0..100 (percent).
 */
function inBrazilShape(px: number, py: number): boolean {
  // Core body (central Brazil)
  const core = ((px - 50) ** 2) / 26 ** 2 + ((py - 58) ** 2) / 28 ** 2 <= 1;
  // Northern bulge (Amazonia)
  const north = ((px - 36) ** 2) / 22 ** 2 + ((py - 28) ** 2) / 18 ** 2 <= 1;
  // North-east corner
  const ne = ((px - 66) ** 2) / 14 ** 2 + ((py - 38) ** 2) / 14 ** 2 <= 1;
  // South tail
  const south = ((px - 46) ** 2) / 12 ** 2 + ((py - 84) ** 2) / 10 ** 2 <= 1;
  return core || north || ne || south;
}

export function AuthSplitScene({
  className,
  routes,
  dotColor = '#0f766e',
  accentColor = '#21d3c4',
}: AuthSplitSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const animRef = useRef<number | null>(null);

  // Default routes (relative) — doação → ponto de coleta → ONG pulses
  const defaultRoutes: Route[] = [
    { start: { x: 0.32, y: 0.35, delay: 0 }, end: { x: 0.56, y: 0.55 }, color: dotColor },
    { start: { x: 0.56, y: 0.55, delay: 2 }, end: { x: 0.72, y: 0.42 }, color: dotColor },
    { start: { x: 0.48, y: 0.78, delay: 1 }, end: { x: 0.58, y: 0.58 }, color: dotColor },
    { start: { x: 0.40, y: 0.25, delay: 3 }, end: { x: 0.55, y: 0.52 }, color: dotColor },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setSize({ w: width, h: height });
    });

    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w || !size.h) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gap = Math.max(10, Math.floor(size.w / 38));
    const dots: Dot[] = [];
    for (let x = 0; x < size.w; x += gap) {
      for (let y = 0; y < size.h; y += gap) {
        const px = (x / size.w) * 100;
        const py = (y / size.h) * 100;
        if (inBrazilShape(px, py) && Math.random() > 0.22) {
          dots.push({ x, y, r: 1.25, opacity: Math.random() * 0.55 + 0.2 });
        }
      }
    }

    const rSet = (routes ?? defaultRoutes).map((r) => ({
      ...r,
      s: { x: r.start.x * size.w, y: r.start.y * size.h, delay: r.start.delay },
      e: { x: r.end.x * size.w, y: r.end.y * size.h },
    }));

    const start = performance.now();
    const cycle = 9; // seconds

    const loop = (now: number) => {
      const t = ((now - start) / 1000) % cycle;
      ctx.clearRect(0, 0, size.w, size.h);

      // Background dots
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(15, 118, 110, ${d.opacity})`;
        ctx.fill();
      }

      // Routes
      for (const r of rSet) {
        const elapsed = t - r.start.delay;
        if (elapsed <= 0 || elapsed > 3.5) continue;
        const progress = Math.min(elapsed / 3, 1);
        const x = r.s.x + (r.e.x - r.s.x) * progress;
        const y = r.s.y + (r.e.y - r.s.y) * progress;

        // Path line
        ctx.beginPath();
        ctx.moveTo(r.s.x, r.s.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.85;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Start marker
        ctx.beginPath();
        ctx.arc(r.s.x, r.s.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.fill();

        // Moving head with glow
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = `${accentColor}55`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 3.25, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.fill();

        if (progress >= 1) {
          ctx.beginPath();
          ctx.arc(r.e.x, r.e.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = r.color;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [size, routes, dotColor, accentColor]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    </div>
  );
}
