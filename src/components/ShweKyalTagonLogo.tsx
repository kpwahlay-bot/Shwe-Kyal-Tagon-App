import React, { useId, useState, useEffect } from 'react';

interface ShweKyalTagonLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  showText?: boolean;
  variant?: 'emblem' | 'horizontal' | 'badge';
  textColor?: 'dark' | 'light' | 'purple';
}

function getStoredLogo(): string {
  try {
    return localStorage.getItem('sktg_voucher_custom_logo') || localStorage.getItem('sktg_app_custom_logo') || '/shwekyaltagon-badge-logo.svg';
  } catch {
    return '/shwekyaltagon-badge-logo.svg';
  }
}

export const ShweKyalTagonBadgeLogo: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  forceDefault?: boolean;
}> = ({ className = '', style = {}, forceDefault = false }) => {
  const uid = useId().replace(/:/g, '_');
  const [customLogo, setCustomLogo] = useState<string>(() => forceDefault ? '' : getStoredLogo());

  useEffect(() => {
    if (forceDefault) return;
    const handleUpdate = () => {
      setCustomLogo(getStoredLogo());
    };
    window.addEventListener('sktg_logo_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sktg_logo_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [forceDefault]);

  if (customLogo && !forceDefault && customLogo !== '/shwekyaltagon-badge-logo.svg') {
    return (
      <img
        src={customLogo}
        alt="ရွှေကြယ်တံခွန် Logo"
        className={`select-none object-contain ${className}`}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          imageRendering: '-webkit-optimize-contrast',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          ...style,
        }}
      />
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 380 124"
      className={`select-none ${className}`}
      aria-label="ရွှေကြယ်တံခွန် မိုဘိုင်း နှင့် ကွန်ပျူတာ Logo"
      textRendering="geometricPrecision"
      shapeRendering="geometricPrecision"
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        textRendering: 'geometricPrecision',
        shapeRendering: 'geometricPrecision',
        ...style,
      }}
    >
      <defs>
        <style type="text/css">
          {`
          .sktg-title-text_${uid} {
            font-family: 'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif;
            font-weight: 800;
            letter-spacing: 0.2px;
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
          }
          .sktg-sub-text_${uid} {
            font-family: 'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif;
            font-weight: 700;
            letter-spacing: 0.3px;
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
          }
          `}
        </style>
        <linearGradient id={`purpleBadgeGrad_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5300aa" />
          <stop offset="50%" stopColor="#480096" />
          <stop offset="100%" stopColor="#3c007e" />
        </linearGradient>
      </defs>

      {/* Main Royal Purple Capsule Body */}
      <rect
        x="3"
        y="3"
        width="374"
        height="118"
        rx="59"
        fill={`url(#purpleBadgeGrad_${uid})`}
        stroke="#FFFFFF"
        strokeWidth="3.5"
      />

      {/* Inner Thin Concentric White Border */}
      <rect
        x="9"
        y="9"
        width="362"
        height="106"
        rx="53"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeOpacity="0.9"
      />

      {/* Left: Speed Star Emblem with Motion Streaks */}
      <g id="speed-star-group">
        {/* Speed Motion Trailing Lines */}
        <g stroke="#FFFFFF" strokeLinecap="round">
          <line x1="30" y1="48" x2="68" y2="48" strokeWidth="4.5" />
          <line x1="20" y1="59" x2="68" y2="59" strokeWidth="4.5" />
          <line x1="14" y1="70" x2="68" y2="70" strokeWidth="4.5" />
          <line x1="24" y1="81" x2="68" y2="81" strokeWidth="4.5" />
        </g>

        {/* Speed Trail Dots */}
        <circle cx="22" cy="48" r="2.2" fill="#FFFFFF" />
        <circle cx="12" cy="59" r="2.2" fill="#FFFFFF" />
        <circle cx="8" cy="70" r="2.2" fill="#FFFFFF" />
        <circle cx="16" cy="81" r="2.2" fill="#FFFFFF" />

        {/* 5-Pointed White Speed Star */}
        <polygon
          points="80,24 95,51 125,54 102,76 109,106 80,89 51,106 58,76 35,54 65,51"
          fill="#FFFFFF"
        />

        {/* Stylized S Cutout inside star */}
        <path
          d="M 68 53 C 82 51 88 59 83 67 C 78 74 72 76 72 83 C 72 90 82 92 92 88"
          fill="none"
          stroke="#480096"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>

      {/* Right: Authentic Myanmar Unicode Brand Stack */}
      <g id="brand-typography-group">
        {/* Main Title: ရွှေကြယ်တံခွန် */}
        <text
          x="242"
          y="62"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="37"
          fontWeight="800"
          className={`sktg-title-text_${uid}`}
          style={{
            fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif",
            fontWeight: 800,
            textRendering: 'geometricPrecision',
          }}
        >
          ရွှေကြယ်တံခွန်
        </text>

        {/* Small White Star Accent near တံ */}
        <polygon
          points="288,31 290,35 295,36 291,39 292,44 288,41 284,44 285,39 281,36 286,35"
          fill="#FFFFFF"
        />

        {/* Subtitle: မိုဘိုင်း နှင့် ကွန်ပျူတာ with High-Contrast Crisp Capsule & Underline */}
        <rect
          x="146"
          y="78"
          width="192"
          height="27"
          rx="6"
          fill="rgba(255, 255, 255, 0.18)"
          stroke="#FFFFFF"
          strokeWidth="1.3"
        />
        <text
          x="242"
          y="97"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="16.5"
          fontWeight="800"
          className={`sktg-sub-text_${uid}`}
          style={{
            fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif",
            fontWeight: 800,
            letterSpacing: '0.4px',
            textRendering: 'geometricPrecision',
          }}
        >
          မိုဘိုင်း နှင့် ကွန်ပျူတာ
        </text>
      </g>
    </svg>
  );
};

export const ShweKyalTagonLogo: React.FC<ShweKyalTagonLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  variant = 'emblem',
  textColor = 'dark',
}) => {
  const uid = useId().replace(/:/g, '_');

  if (variant === 'badge') {
    return <ShweKyalTagonBadgeLogo className={className} />;
  }

  // Dimension mapping
  let pixelSize = 48;
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'xs': pixelSize = 24; break;
      case 'sm': pixelSize = 32; break;
      case 'md': pixelSize = 44; break;
      case 'lg': pixelSize = 64; break;
      case 'xl': pixelSize = 96; break;
      case '2xl': pixelSize = 130; break;
    }
  }

  // Pure SVG Emblem with bulletproof solid color fallbacks and official Speed Star
  const EmblemSVG = (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 320 320"
      className={`shrink-0 select-none ${className}`}
      aria-label="Shwe Kyal Tagon IT & Mobile Logo"
      style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}
    >
      <defs>
        {/* Purple Brand Background Gradients with unique id */}
        <linearGradient id={`purpleGrad_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C1EC9" />
          <stop offset="45%" stopColor="#530EAA" />
          <stop offset="100%" stopColor="#3C0785" />
        </linearGradient>
      </defs>

      {/* Main Solid Royal Purple Circle Badge */}
      <circle
        cx="160"
        cy="160"
        r="154"
        fill="#530EAA"
        style={{ fill: `url(#purpleGrad_${uid})`, fillOpacity: 1 }}
      />

      {/* Double White Border Rings */}
      <circle
        cx="160"
        cy="160"
        r="147"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
      />
      <circle
        cx="160"
        cy="160"
        r="140"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />

      {/* Speed Motion Trails (Left of Star) */}
      <g stroke="#FFFFFF" strokeLinecap="round">
        <line x1="45" y1="130" x2="135" y2="130" strokeWidth="8.5" />
        <line x1="30" y1="160" x2="135" y2="160" strokeWidth="8.5" />
        <line x1="20" y1="190" x2="135" y2="190" strokeWidth="8.5" />
        <line x1="38" y1="220" x2="135" y2="220" strokeWidth="8.5" />
      </g>

      {/* Speed Dots */}
      <circle cx="35" cy="130" r="4" fill="#FFFFFF" />
      <circle cx="20" cy="160" r="4" fill="#FFFFFF" />
      <circle cx="12" cy="190" r="4" fill="#FFFFFF" />
      <circle cx="28" cy="220" r="4" fill="#FFFFFF" />

      {/* 5-Pointed White Speed Star */}
      <polygon
        points="195,45 225,112 298,118 238,172 258,248 195,202 132,248 152,172 92,118 165,112"
        fill="#FFFFFF"
      />

      {/* Stylized S Cutout inside star */}
      <path
        d="M 160 123 C 192 119 206 137 197 154 C 188 171 175 174 175 191 C 175 208 196 211 220 200"
        fill="none"
        stroke="#530EAA"
        strokeWidth="11.5"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'emblem') {
    return EmblemSVG;
  }

  // Horizontal Layout with side-by-side text
  const isDarkText = textColor === 'dark';
  const isPurpleText = textColor === 'purple';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {EmblemSVG}
      {showText && (
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-black tracking-wide leading-tight text-sm sm:text-base ${
                isDarkText
                  ? 'text-slate-900'
                  : isPurpleText
                  ? 'text-purple-900'
                  : 'text-white'
              }`}
            >
              SHWE KYAL TAGON
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
              IT &amp; Mobile
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-xs font-bold ${
                isDarkText ? 'text-purple-700' : isPurpleText ? 'text-purple-700' : 'text-purple-200'
              }`}
            >
              Enterprise POS &amp; Inventory
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
              • Co., Ltd.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
