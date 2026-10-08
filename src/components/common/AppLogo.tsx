'use client';

import React, { useState } from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
  textClassName?: string;
  subtitleClassName?: string;
}

export default function AppLogo({
  className = '',
  size = 40,
  showText = true,
  subtitle = 'ADMIN KPUM',
  textClassName = 'text-slate-900 font-black',
  subtitleClassName = 'text-slate-400 font-bold',
}: AppLogoProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Official Komisi Pemilihan Raya Universitas BTH Logo */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: `${size * 0.8}px`, height: `${size}px` }}
      >
        {!imgError ? (
          <img
            src="/candidate/image/logo-pemira.png"
            alt="Logo Pemira UBTH"
            className="w-full h-full object-contain drop-shadow-sm"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('/candidates/image/Image-logo-Pemira.png')) {
                target.src = '/candidates/image/Image-logo-Pemira.png';
              } else if (!target.src.includes('/api/logo')) {
                target.src = '/api/logo';
              } else {
                setImgError(true);
              }
            }}
          />
        ) : (
          /* High-Fidelity Vector Fallback matching the official badge */
          <svg
            viewBox="0 0 100 130"
            className="w-full h-full drop-shadow-xs"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Badge Shell */}
            <path
              d="M50 4 C75 4 88 16 92 36 C96 60 92 90 76 112 C64 126 54 128 50 128 C46 128 36 126 24 112 C8 90 4 60 8 36 C12 16 25 4 50 4 Z"
              fill="#18181B"
            />
            {/* Red & White Flag Inner Shield */}
            <path
              d="M50 20 C70 20 80 28 83 44 C84 54 84 62 84 66 L16 66 C16 62 16 54 17 44 C20 28 30 20 50 20 Z"
              fill="#DC2626"
            />
            <path
              d="M16 66 L84 66 C84 76 80 94 68 108 C58 118 52 119 50 119 C48 119 42 118 32 108 C20 94 16 76 16 66 Z"
              fill="#FFFFFF"
            />
            {/* Inner Flame Wings Emblem */}
            <path
              d="M50 32 C50 32 64 48 64 64 C64 78 54 86 50 86 C46 86 36 78 36 64 C36 48 50 32 50 32 Z"
              fill="#F59E0B"
            />
            <path
              d="M50 48 C50 48 58 58 58 68 C58 76 52 82 50 82 C48 82 42 76 42 68 C42 58 50 48 50 48 Z"
              fill="#0284C7"
            />
            {/* KOMISI text */}
            <text x="50" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="sans-serif">
              KOMISI
            </text>
            {/* UNIVERSITAS BTH */}
            <text x="50" y="96" textAnchor="middle" fill="#000000" fontSize="7" fontWeight="900" fontFamily="sans-serif">
              UNIVERSITAS BTH
            </text>
            {/* PEMILIHAN RAYA */}
            <text x="50" y="122" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">
              PEMILIHAN RAYA
            </text>
          </svg>
        )}
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`text-base tracking-tight ${textClassName}`}>
            PEMIRA 2026
          </span>
          <span className={`text-[10px] tracking-wider uppercase ${subtitleClassName}`}>
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
