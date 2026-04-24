'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';

export type AwardBadgeType =
  | 'primeira-doacao'
  | 'constancia'
  | 'mes-solidario'
  | 'rede-ativa'
  | 'heroi-solidario';

export type AwardBadgeTier = 'bronze' | 'prata' | 'ouro';

interface AwardBadgeProps {
  type: AwardBadgeType;
  tier?: AwardBadgeTier;
  title?: string;
  subtitle?: string;
  earnedAt?: string;
  className?: string;
}

const identityMatrix =
  '1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1';

const maxRotate = 0.25;
const minRotate = -0.25;
const maxScale = 1;
const minScale = 0.97;

/** Base palette per tier — ribbon background */
const tierPalette: Record<AwardBadgeTier, { bg: string; border: string; ink: string; accent: string }> = {
  bronze: { bg: '#f1cfa6', border: '#c48a55', ink: '#4b2e13', accent: '#a45a22' },
  prata: { bg: '#e5e7ea', border: '#9aa2ab', ink: '#1f2a34', accent: '#4f5a66' },
  ouro: { bg: '#f3e3ac', border: '#c9a54a', ink: '#3d2b00', accent: '#8a6a10' },
};

/** Default title/subtitle when not explicitly provided */
const defaultCopy: Record<AwardBadgeType, { title: string; subtitle: string }> = {
  'primeira-doacao': { title: 'Primeira Doação', subtitle: 'Começou a jornada' },
  'constancia': { title: 'Constância', subtitle: 'Meses seguidos doando' },
  'mes-solidario': { title: 'Mês Solidário', subtitle: 'Meta batida no mês' },
  'rede-ativa': { title: 'Rede Ativa', subtitle: 'Conectou pessoas à rede' },
  'heroi-solidario': { title: 'Herói Solidário', subtitle: 'Top doadores do período' },
};

export function AwardBadge({
  type,
  tier = 'prata',
  title,
  subtitle,
  earnedAt,
  className,
}: AwardBadgeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [matrix, setMatrix] = useState(identityMatrix);
  const [overlayAngle, setOverlayAngle] = useState(0);
  const [hovering, setHovering] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = tierPalette[tier];
  const copy = {
    title: title ?? defaultCopy[type].title,
    subtitle: subtitle ?? defaultCopy[type].subtitle,
  };

  const getDims = () => {
    const r = ref.current?.getBoundingClientRect();
    return {
      left: r?.left ?? 0,
      right: r?.right ?? 0,
      top: r?.top ?? 0,
      bottom: r?.bottom ?? 0,
    };
  };

  const getMatrix = (cx: number, cy: number) => {
    const { left, right, top, bottom } = getDims();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;

    const scale = [
      maxScale - ((maxScale - minScale) * Math.abs(xCenter - cx)) / (xCenter - left || 1),
      maxScale - ((maxScale - minScale) * Math.abs(yCenter - cy)) / (yCenter - top || 1),
      maxScale -
        ((maxScale - minScale) * (Math.abs(xCenter - cx) + Math.abs(yCenter - cy))) /
          ((xCenter - left || 1) + (yCenter - top || 1)),
    ];

    const rX1 = 0.25 * ((yCenter - cy) / (yCenter || 1) - (xCenter - cx) / (xCenter || 1));
    const rX2 = maxRotate - ((maxRotate - minRotate) * Math.abs(right - cx)) / (right - left || 1);
    const rY2 = maxRotate - ((maxRotate - minRotate) * (top - cy)) / (top - bottom || 1);
    const rZ0 = -(maxRotate - ((maxRotate - minRotate) * Math.abs(right - cx)) / (right - left || 1));
    const rZ1 = 0.2 - ((0.2 + 0.6) * (top - cy)) / (top - bottom || 1);

    return `${scale[0]}, 0, ${rZ0}, 0, ${rX1}, ${scale[1]}, ${rZ1}, 0, ${rX2}, ${rY2}, ${scale[2]}, 0, 0, 0, 0, 1`;
  };

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    setMatrix(getMatrix(e.clientX, e.clientY));
    const { left, right, top, bottom } = getDims();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;
    setOverlayAngle(((Math.abs(xCenter - e.clientX) + Math.abs(yCenter - e.clientY)) / 1.5) % 180);
  };

  const onEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovering(true);
  };

  const onLeave = () => {
    setMatrix(identityMatrix);
    leaveTimer.current = setTimeout(() => {
      setHovering(false);
      setOverlayAngle(0);
    }, 220);
  };

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${copy.title}${earnedAt ? ` — ${earnedAt}` : ''}`}
      className={cn('block w-full max-w-[220px] select-none sm:max-w-[260px]', className)}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div
        style={{
          transform: `perspective(700px) matrix3d(${matrix})`,
          transformOrigin: 'center center',
          transition: 'transform 200ms ease-out',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 64" className="h-auto w-full">
          <defs>
            <filter id={`vg-blur-${type}-${tier}`}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            <mask id={`vg-mask-${type}-${tier}`}>
              <rect width="260" height="64" fill="white" rx="12" />
            </mask>
            <linearGradient id={`vg-ribbon-${type}-${tier}`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor={palette.bg} />
              <stop offset="100%" stopColor={palette.border} stopOpacity="0.65" />
            </linearGradient>
          </defs>

          <rect width="260" height="64" rx="12" fill={`url(#vg-ribbon-${type}-${tier})`} />
          <rect
            x="4"
            y="4"
            width="252"
            height="56"
            rx="10"
            fill="transparent"
            stroke={palette.border}
            strokeWidth="1"
            strokeOpacity="0.55"
          />

          {/* Icon badge on the left */}
          <g transform="translate(14, 14)">
            <rect width="36" height="36" rx="10" fill={palette.accent} opacity="0.14" />
            <g transform="translate(8, 8)" fill={palette.ink}>
              <BadgeGlyph type={type} />
            </g>
          </g>

          <text
            x="62"
            y="23"
            fontFamily="Inter, Helvetica, sans-serif"
            fontSize="9"
            fontWeight="700"
            letterSpacing="1.4"
            fill={palette.accent}
          >
            VESTGO · {tier.toUpperCase()}
          </text>
          <text
            x="62"
            y="43"
            fontFamily="Inter, Helvetica, sans-serif"
            fontSize="15"
            fontWeight="700"
            fill={palette.ink}
          >
            {copy.title}
          </text>
          <text
            x="62"
            y="55"
            fontFamily="Inter, Helvetica, sans-serif"
            fontSize="9.5"
            fontWeight="500"
            fill={palette.ink}
            opacity="0.72"
          >
            {copy.subtitle}
          </text>

          {/* Holographic overlay — animated hues rotating on hover */}
          <g style={{ mixBlendMode: 'overlay' }} mask={`url(#vg-mask-${type}-${tier})`}>
            {[0, 18, 36, 54, 72, 90, 108, 126].map((base, i) => (
              <g
                key={i}
                style={{
                  transform: `rotate(${overlayAngle + base}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 250ms ease-out',
                  opacity: hovering ? 0.55 : 0.2,
                }}
              >
                <polygon
                  points="0,0 260,64 260,0 0,64"
                  fill={['#21d3c4', '#e8a33d', '#5c7a4f', '#ffffff', '#006a62', '#f3e3ac', '#c97a12', '#ffffff'][i]}
                  filter={`url(#vg-blur-${type}-${tier})`}
                  opacity="0.45"
                />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {earnedAt && (
        <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
          Conquistada em {earnedAt}
        </p>
      )}
    </div>
  );
}

/** Inline SVG glyphs per badge type — drawn at 20×20 */
function BadgeGlyph({ type }: { type: AwardBadgeType }) {
  switch (type) {
    case 'primeira-doacao':
      // heart
      return (
        <path d="M10 17.5s-6.5-4-8.5-8.3C.3 6.8 2.3 4 5.2 4c1.8 0 3.3 1 4.2 2.4h1.2A4.9 4.9 0 0 1 14.8 4c2.9 0 4.9 2.8 3.7 5.2-2 4.3-8.5 8.3-8.5 8.3Z" />
      );
    case 'constancia':
      // flame
      return (
        <path d="M10 1.5s3.5 3.5 3.5 7a3.5 3.5 0 1 1-7 0c0-1.2.6-2.3 1.4-3.2C8.5 6.4 10 8 10 8S9 5 10 1.5Zm-4.5 9A4.5 4.5 0 0 0 10 18.5a4.5 4.5 0 0 0 4.5-4.5c0-1.4-.6-2.6-1.6-3.6A5.3 5.3 0 0 1 10 13a5.3 5.3 0 0 1-2.9-2.6c-1 1-1.6 2.2-1.6 3.6Z" />
      );
    case 'mes-solidario':
      // crown
      return (
        <path d="M2 6l3 3 3-5 2 4 2-4 3 5 3-3v9H2V6Zm0 11h16v2H2v-2Z" />
      );
    case 'rede-ativa':
      // users
      return (
        <path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm-7 1.5c-2.8 0-5 1.4-5 3.2V16h10v-2.3c0-1.8-2.2-3.2-5-3.2Zm7 0c-.7 0-1.4.1-2 .3 1.1.7 1.8 1.8 1.8 3.1V16H19v-2.3c0-1.7-2-3.2-5-3.2Z" />
      );
    case 'heroi-solidario':
    default:
      // star
      return (
        <path d="M10 1.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L10 14.8l-5.2 2.7 1-5.8L1.5 7.6l5.9-.8L10 1.5Z" />
      );
  }
}
