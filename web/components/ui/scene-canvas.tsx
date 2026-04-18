'use client';

import dynamic from 'next/dynamic';
import { Suspense, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const Canvas = dynamic(() => import('@react-three/fiber').then((m) => m.Canvas), {
  ssr: false,
  loading: () => null,
});

interface SceneCanvasProps {
  className?: string;
  children: ReactNode;
  camera?: { position?: [number, number, number]; fov?: number };
  dpr?: [number, number];
  fallback?: ReactNode;
}

export function SceneCanvas({
  className,
  children,
  camera = { position: [0, 0, 3.4], fov: 55 },
  dpr = [1, 1.75],
  fallback = null,
}: SceneCanvasProps) {
  return (
    <div className={cn('relative h-full w-full', className)} aria-hidden="true">
      <Suspense fallback={fallback}>
        <Canvas
          camera={camera}
          dpr={dpr}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{ pointerEvents: 'none' }}
        >
          {children}
        </Canvas>
      </Suspense>
    </div>
  );
}
