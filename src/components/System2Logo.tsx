import React, { useId, useState, useEffect } from 'react';

export const SYSTEM2_CUSTOM_LOGO_KEY = 'sktg_system2_custom_logo';
export const SYSTEM2_DEFAULT_ADDRESS = 'B/84B ၊အခန်း(၃+၄+၅+၆)၊ နဝဒေးရှော့ဟောက်စ်၊ ကျန်စစ်သားလမ်း၊လှိုင်သာယာ(အရှေ့ပိုင်း) မြို့နယ်။';
export const SYSTEM2_DEFAULT_PHONE = '09 453077667, 09 457063667';
export const SYSTEM2_ADDRESS_KEY = 'sktg_system2_address_v2';
export const SYSTEM2_PHONE_KEY = 'sktg_system2_phone_v2';

export function getSystem2CustomLogo(): string {
  if (typeof window === 'undefined') return '/system2-logo.svg';
  try {
    return localStorage.getItem(SYSTEM2_CUSTOM_LOGO_KEY) || '/system2-logo.svg';
  } catch {
    return '/system2-logo.svg';
  }
}

export function getSystem2Address(): string {
  if (typeof window === 'undefined') return SYSTEM2_DEFAULT_ADDRESS;
  try {
    const saved = localStorage.getItem(SYSTEM2_ADDRESS_KEY);
    if (!saved || saved.includes('ဘုရားလမ်းမီးပွိုင့်')) {
      try { localStorage.setItem(SYSTEM2_ADDRESS_KEY, SYSTEM2_DEFAULT_ADDRESS); } catch {}
      return SYSTEM2_DEFAULT_ADDRESS;
    }
    return saved;
  } catch {
    return SYSTEM2_DEFAULT_ADDRESS;
  }
}

export function getSystem2Phone(): string {
  if (typeof window === 'undefined') return SYSTEM2_DEFAULT_PHONE;
  try {
    return localStorage.getItem(SYSTEM2_PHONE_KEY) || SYSTEM2_DEFAULT_PHONE;
  } catch {
    return SYSTEM2_DEFAULT_PHONE;
  }
}

export const System2BadgeLogo: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  forceDefault?: boolean;
  customUrl?: string;
}> = ({ className = '', style = {}, forceDefault = false, customUrl }) => {
  const uid = useId().replace(/:/g, '_');
  const [customLogo, setCustomLogo] = useState<string>(() => {
    if (customUrl !== undefined) return customUrl;
    return forceDefault ? '' : getSystem2CustomLogo();
  });

  useEffect(() => {
    if (customUrl !== undefined) {
      setCustomLogo(customUrl);
      return;
    }
    if (forceDefault) return;
    const handleUpdate = () => {
      setCustomLogo(getSystem2CustomLogo());
    };
    window.addEventListener('sktg_system2_logo_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sktg_system2_logo_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [forceDefault, customUrl]);

  const activeLogo = customUrl !== undefined ? customUrl : customLogo;

  // If custom uploaded image is set and not fallback svg
  if (activeLogo && !forceDefault && activeLogo !== '/system2-logo.svg') {
    return (
      <img
        src={activeLogo}
        alt="SYSTEM II Logo"
        className={`select-none object-contain ${className}`}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          imageRendering: 'crisp-edges',
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
      viewBox="0 0 380 150"
      className={`select-none ${className}`}
      aria-label="SYSTEM II မိုဘိုင်းနှင့် ကွန်ပျူတာ စင်တာ Logo"
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
          .sys2-serif-title_${uid} {
            font-family: 'Cinzel', 'Times New Roman', 'Georgia', serif;
            font-weight: 900;
            letter-spacing: 1.5px;
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
          }
          .sys2-myanmar-sub_${uid} {
            font-family: 'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
          }
          `}
        </style>

        {/* Tech Badge Vibrant Crisp Ice-Blue Gradient */}
        <linearGradient id={`sys2BadgeGrad_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#eff6ff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>

        {/* Vivid Royal Blue Circuit Gradient */}
        <linearGradient id={`sys2RibbonGrad_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0038ff" />
        </linearGradient>
      </defs>

      {/* Oval / Stadium Pill Outer Border in Vivid Royal Blue */}
      <rect
        x="4"
        y="4"
        width="372"
        height="142"
        rx="71"
        fill="#ffffff"
        stroke="#0038ff"
        strokeWidth="6"
      />

      {/* Inner Crisp Royal Blue Accent Ring */}
      <rect
        x="8"
        y="8"
        width="364"
        height="134"
        rx="67"
        fill="none"
        stroke="#2563eb"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />

      {/* TOP ROW: Left Tech S Badge + Right SYSTEM II ® */}
      <g id={`top-row_${uid}`}>
        {/* Left: Rounded Square Badge (Crisp Ice-Blue) */}
        <g transform="translate(56, 20)">
          <rect
            x="0"
            y="0"
            width="58"
            height="58"
            rx="12"
            fill={`url(#sys2BadgeGrad_${uid})`}
            stroke="#2563eb"
            strokeWidth="1.5"
          />

          {/* Top-Right Wing/Arrow extending from S ribbon */}
          <path
            d="M 37 17 L 54 8 L 45 18 Z"
            fill="#0038ff"
          />

          {/* Stylized S Circuit Ribbon (Thick Path) */}
          <path
            d="M 45 16 L 24 16 C 18 16 16 26 23 28 L 35 30 C 42 32 40 42 33 43 L 13 43"
            fill="none"
            stroke={`url(#sys2RibbonGrad_${uid})`}
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interior White Line inside S Ribbon */}
          <path
            d="M 45 16 L 24 16 C 19 16 18 26 23 28 L 35 30 C 40 32 38 42 33 43 L 13 43"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* PCB Circuit Nodes & Branches */}
          <line x1="20" y1="16" x2="20" y2="10" stroke="#0038ff" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="20" cy="9" r="2" fill="#0038ff" />

          <line x1="38" y1="31" x2="47" y2="31" stroke="#0038ff" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="47" cy="31" r="2" fill="#0038ff" />

          <line x1="24" y1="43" x2="24" y2="49" stroke="#0038ff" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="24" cy="49" r="2" fill="#0038ff" />

          {/* Precision Tech Gear / Cogwheel in Lower-Right */}
          <g transform="translate(45, 45)">
            <circle cx="0" cy="0" r="4.5" fill="none" stroke="#0038ff" strokeWidth="1.8" />
            <circle cx="0" cy="0" r="1.6" fill="#0038ff" />
            <rect x="-0.9" y="-6.8" width="1.8" height="2" fill="#0038ff" rx="0.3" />
            <rect x="-0.9" y="4.8" width="1.8" height="2" fill="#0038ff" rx="0.3" />
            <rect x="-6.8" y="-0.9" width="2" height="1.8" fill="#0038ff" rx="0.3" />
            <rect x="4.8" y="-0.9" width="2" height="1.8" fill="#0038ff" rx="0.3" />
            <rect x="-5" y="-5" width="1.8" height="1.8" fill="#0038ff" rx="0.3" transform="rotate(45)" />
            <rect x="3.2" y="3.2" width="1.8" height="1.8" fill="#0038ff" rx="0.3" transform="rotate(45)" />
            <rect x="-5" y="3.2" width="1.8" height="1.8" fill="#0038ff" rx="0.3" transform="rotate(-45)" />
            <rect x="3.2" y="-5" width="1.8" height="1.8" fill="#0038ff" rx="0.3" transform="rotate(-45)" />
          </g>
        </g>

        {/* Right: Brand Typography "SYSTEM II" (Serif) */}
        <text
          x="126"
          y="62"
          fill="#002bb8"
          fontSize="36"
          className={`sys2-serif-title_${uid}`}
        >
          SYSTEM II
        </text>

        {/* Registered Trademark ® */}
        <g transform="translate(306, 38)">
          <circle cx="0" cy="0" r="7.5" fill="none" stroke="#002bb8" strokeWidth="1.4" />
          <text
            x="0"
            y="4"
            fill="#002bb8"
            fontSize="10"
            fontFamily="'Times New Roman', 'Cinzel', serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            R
          </text>
        </g>
      </g>

      {/* BOTTOM ROW: Burmese Subtitle "မိုဘိုင်းနှင့် ကွန်ပျူတာ စင်တာ" */}
      <text
        x="190"
        y="119"
        fill="#002bb8"
        fontSize="23"
        textAnchor="middle"
        className={`sys2-myanmar-sub_${uid}`}
      >
        မိုဘိုင်းနှင့် ကွန်ပျူတာ စင်တာ
      </text>
    </svg>
  );
};
