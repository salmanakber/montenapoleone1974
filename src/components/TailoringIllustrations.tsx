import React from 'react';
import type { TailoringZoneKey } from '../types.ts';

export const CUFF_SPECS: Record<
  string,
  { subtitle: string; detail: string; stitchSpec: string }
> = {
  Angle: {
    subtitle: '45° Mitred Edge · 1 Button',
    detail: 'Sharp chamfered corner crafted to slide effortlessly beneath tailored suit cuffs.',
    stitchSpec: '7 cm cuff height · 2 mm edge stitch',
  },
  Modern: {
    subtitle: 'Soft Bevelled · 1 Button',
    detail: 'Signature Monte Napoleone house cuff balancing daily business and smart-casual wear.',
    stitchSpec: '6.8 cm cuff height · Mother-of-pearl button',
  },
  Rounded: {
    subtitle: 'Curved Barrel · 1 Button',
    detail: 'Generously rounded tip suited to soft linen and relaxed Oxford weaves.',
    stitchSpec: '6.8 cm cuff height · Soft interlining',
  },
  'Single French': {
    subtitle: 'Convertible French / Double',
    detail: 'Formal fold-over construction accommodating silk knots or gold cufflinks.',
    stitchSpec: '7.5 cm cuff height · Dual buttonhole',
  },
};

/** Zone baseline (cm) used to subtly scale measurement marks when size changes. */
const ZONE_BASE_CM: Record<TailoringZoneKey, number> = {
  shirt_length: 80,
  sleeve_length: 66,
  waist: 100,
  chest: 110,
  bottom_hem: 108,
  shoulder: 46,
};

export const TailoringZoneSketch: React.FC<{
  zone: TailoringZoneKey;
  /** Optional JPG override (admin matrix). Storefront prefers live SVG + size cm. */
  customImageUrl?: string;
  sizeLabel?: string;
  cmValue?: number;
  preferSvg?: boolean;
  /** thumb = row chip; diagram = large popup preview */
  variant?: 'thumb' | 'diagram';
  onActivate?: () => void;
}> = ({
  zone,
  customImageUrl,
  sizeLabel,
  cmValue,
  preferSvg = true,
  variant = 'thumb',
  onActivate,
}) => {
  const isDiagram = variant === 'diagram';
  if (!preferSvg && customImageUrl && customImageUrl.trim().length > 0) {
    return (
      <button
        type="button"
        onClick={onActivate}
        disabled={!onActivate}
        className={`${
          isDiagram ? 'w-56 h-56' : 'w-12 h-12'
        } rounded-none bg-[#F0F0F0] border border-black/10 overflow-hidden relative shrink-0 ${
          onActivate ? 'cursor-pointer hover:border-[#142B4E]/ : ''
        }`}
      >
        <img
          src={customImageUrl}
          alt={`${zone} sketch`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        {cmValue !== undefined && (
          <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-mono-tabular text-center leading-tight py-[1px]">
            {cmValue}cm
          </span>
        )}
      </button>
    );
  }

  const scale =
    cmValue && ZONE_BASE_CM[zone]
      ? Math.max(0.82, Math.min(1.18, cmValue / ZONE_BASE_CM[zone]))
      : 1;

  const Wrapper: React.ElementType = onActivate ? 'button' : 'div';

  return (
    <Wrapper
      type={onActivate ? 'button' : undefined}
      onClick={onActivate}
      className={`${
        isDiagram ? 'w-56 h-56 sm:w-64 sm:h-64' : 'w-12 h-12'
      } rounded-none bg-[#F0F0F0] border border-black/10 flex flex-col items-center justify-center relative shrink-0 overflow-hidden ${
        onActivate ? 'cursor-pointer hover:border-[#142B4E] transition-colors' : ''
      }`}
      title={sizeLabel ? `${sizeLabel}: ${cmValue ?? ''} cm` : undefined}
      aria-label={onActivate ? `Open ${zone} diagram` : undefined}
    >
      <svg
        viewBox="0 0 48 48"
        className={`${isDiagram ? 'w-48 h-48' : 'w-10 h-10'} text-neutral-500 transition-transform duration-300`}
        style={{ transform: `scale(${0.92 + (scale - 1) * 0.35})` }}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      >
        {/* Base shirt silhouette outline */}
        <path
          d="M17 8 L24 11 L31 8 L38 12 L42 23 L36 25 L34 18 L34 40 Q24 42 14 40 L14 18 L12 25 L6 23 L10 12 Z"
          fill="#FFFFFF"
          stroke="#9CA3AF"
          strokeWidth="1.1"
        />
        {zone === 'shirt_length' && (
          <g stroke="#142B4E" strokeWidth="1.6">
            <line x1="24" y1={12 - 2 * scale} x2="24" y2={38 + 3 * scale} />
            <polyline points={`21.5,${13 - 2 * scale} 24,${10 - 2 * scale} 26.5,${13 - 2 * scale}`} />
            <polyline points={`21.5,${38 + 2 * scale} 24,${41 + 2 * scale} 26.5,${38 + 2 * scale}`} />
          </g>
        )}
        {zone === 'sleeve_length' && (
          <g stroke="#142B4E" strokeWidth="1.6">
            <line x1="34" y1="11" x2={39 + 2 * scale} y2={22 + 2 * scale} />
            <circle cx="34" cy="11" r="1.4" fill="#142B4E" />
            <polyline points={`${36.5 + scale},${21 + 2 * scale} ${39 + 2 * scale},${22 + 2 * scale} ${40 + 2 * scale},${19 + scale}`} />
          </g>
        )}
        {zone === 'waist' && (
          <g stroke="#1D63DC" strokeWidth="1.7">
            <line x1={16 - 2 * scale} y1="29" x2={32 + 2 * scale} y2="29" />
            <polyline points={`${18.5 - 2 * scale},26.5 ${16 - 2 * scale},29 ${18.5 - 2 * scale},31.5`} />
            <polyline points={`${29.5 + 2 * scale},26.5 ${32 + 2 * scale},29 ${29.5 + 2 * scale},31.5`} />
          </g>
        )}
        {zone === 'chest' && (
          <g stroke="#1D63DC" strokeWidth="1.7">
            <line x1={16 - 2 * scale} y1="20" x2={32 + 2 * scale} y2="20" />
            <polyline points={`${18.5 - 2 * scale},17.5 ${16 - 2 * scale},20 ${18.5 - 2 * scale},22.5`} />
            <polyline points={`${29.5 + 2 * scale},17.5 ${32 + 2 * scale},20 ${29.5 + 2 * scale},22.5`} />
          </g>
        )}
        {zone === 'bottom_hem' && (
          <g stroke="#1D63DC" strokeWidth="1.7">
            <line x1={16 - 2 * scale} y1="39" x2={32 + 2 * scale} y2="39" />
            <polyline points={`${18.5 - 2 * scale},36.5 ${16 - 2 * scale},39 ${18.5 - 2 * scale},41.5`} />
            <polyline points={`${29.5 + 2 * scale},36.5 ${32 + 2 * scale},39 ${29.5 + 2 * scale},41.5`} />
          </g>
        )}
        {zone === 'shoulder' && (
          <g stroke="#1D63DC" strokeWidth="1.7">
            <line x1={12 - 2 * scale} y1="12" x2={36 + 2 * scale} y2="12" />
            <circle cx={12 - 2 * scale} cy="12" r="1.4" fill="#1D63DC" />
            <circle cx={36 + 2 * scale} cy="12" r="1.4" fill="#1D63DC" />
          </g>
        )}
      </svg>
      {cmValue !== undefined && (
        <span
          className={`${
            isDiagram ? 'text-sm mt-1' : 'text-[8px] -mt-1 pb-0.5'
          } font-mono-tabular font-semibold text-[#142B4E] leading-none`}
        >
          {cmValue}cm
        </span>
      )}
    </Wrapper>
  );
};

export const CuffShowcaseIllustration: React.FC<{ name: string; selected?: boolean }> = ({
  name,
  selected,
}) => {
  const accent = selected ? '#142B4E' : '#262626';
  const fill = selected ? '#F3F6FA' : '#FAFAFA';

  if (name === 'Single French') {
    return (
      <svg viewBox="0 0 110 64" className="w-24 h-14" fill="none">
        {/* Sleeve arm base */}
        <path d="M4 16 H26 V48 H4 Z" fill="#EFEFEF" stroke="#9CA3AF" strokeWidth="1.2" />
        {/* Folded double French cuff */}
        <rect x="26" y="10" width="72" height="44" rx="2" fill={fill} stroke={accent} strokeWidth="1.6" />
        <line x1="62" y1="10" x2="62" y2="54" stroke={accent} strokeDasharray="3 2" strokeWidth="1.2" />
        <rect x="30" y="14" width="64" height="36" rx="1" stroke="#CBD5E1" strokeDasharray="2 2" strokeWidth="0.9" />
        {/* Cufflink oval studs */}
        <ellipse cx="44" cy="32" rx="4" ry="2.8" fill="#142B4E" />
        <ellipse cx="80" cy="32" rx="4" ry="2.8" fill="#142B4E" />
      </svg>
    );
  }

  if (name === 'Rounded') {
    return (
      <svg viewBox="0 0 110 64" className="w-24 h-14" fill="none">
        <path d="M4 16 H26 V48 H4 Z" fill="#EFEFEF" stroke="#9CA3AF" strokeWidth="1.2" />
        <path
          d="M26 11 H80 Q98 11 98 30 V34 Q98 53 80 53 H26 Z"
          fill={fill}
          stroke={accent}
          strokeWidth="1.6"
        />
        <path
          d="M30 15 H78 Q93 15 93 30 V34 Q93 49 78 49 H30"
          stroke="#CBD5E1"
          strokeDasharray="2 2"
          strokeWidth="0.9"
        />
        {/* Mother of pearl button */}
        <circle cx="80" cy="32" r="5" fill="#FFFFFF" stroke={accent} strokeWidth="1.3" />
        <circle cx="78.8" cy="30.8" r="0.8" fill={accent} />
        <circle cx="81.2" cy="30.8" r="0.8" fill={accent} />
        <circle cx="78.8" cy="33.2" r="0.8" fill={accent} />
        <circle cx="81.2" cy="33.2" r="0.8" fill={accent} />
      </svg>
    );
  }

  if (name === 'Angle') {
    return (
      <svg viewBox="0 0 110 64" className="w-24 h-14" fill="none">
        <path d="M4 16 H26 V48 H4 Z" fill="#EFEFEF" stroke="#9CA3AF" strokeWidth="1.2" />
        <path
          d="M26 11 H84 L98 25 V39 L84 53 H26 Z"
          fill={fill}
          stroke={accent}
          strokeWidth="1.6"
        />
        <path
          d="M30 15 H82 L94 27 V37 L82 49 H30"
          stroke="#CBD5E1"
          strokeDasharray="2 2"
          strokeWidth="0.9"
        />
        <circle cx="79" cy="32" r="5" fill="#FFFFFF" stroke={accent} strokeWidth="1.3" />
        <circle cx="77.8" cy="30.8" r="0.8" fill={accent} />
        <circle cx="80.2" cy="30.8" r="0.8" fill={accent} />
        <circle cx="77.8" cy="33.2" r="0.8" fill={accent} />
        <circle cx="80.2" cy="33.2" r="0.8" fill={accent} />
      </svg>
    );
  }

  // Modern
  return (
    <svg viewBox="0 0 110 64" className="w-24 h-14" fill="none">
      <path d="M4 16 H26 V48 H4 Z" fill="#EFEFEF" stroke="#9CA3AF" strokeWidth="1.2" />
      <path
        d="M26 11 H87 L98 20 V44 L87 53 H26 Z"
        fill={fill}
        stroke={accent}
        strokeWidth="1.6"
      />
      <path
        d="M30 15 H85 L94 22 V42 L85 49 H30"
        stroke="#CBD5E1"
        strokeDasharray="2 2"
        strokeWidth="0.9"
      />
      <circle cx="80" cy="32" r="5" fill="#FFFFFF" stroke={accent} strokeWidth="1.3" />
      <circle cx="78.8" cy="30.8" r="0.8" fill={accent} />
      <circle cx="81.2" cy="30.8" r="0.8" fill={accent} />
      <circle cx="78.8" cy="33.2" r="0.8" fill={accent} />
      <circle cx="81.2" cy="33.2" r="0.8" fill={accent} />
    </svg>
  );
};
