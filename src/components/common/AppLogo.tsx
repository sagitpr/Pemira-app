'use client';

import React from 'react';

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
  size = 38,
  showText = true,
  subtitle = 'ADMIN KPUM',
  textClassName = 'text-slate-800 font-extrabold',
  subtitleClassName = 'text-slate-400 font-bold',
}: AppLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Official Vector Droplet / Flame Flame Logo */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={size * 0.75}
          height={size}
          viewBox="0 0 32 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xs"
        >
          {/* Outer Blue Droplet */}
          <path
            d="M16 2C16 2 30 16 30 26C30 33.732 23.732 40 16 40C8.26801 40 2 33.732 2 26C2 16 16 2 16 2Z"
            fill="#0284C7"
          />
          {/* Inner Golden Accent Flame */}
          <path
            d="M16 15C16 15 24 23 24 28C24 32.4183 20.4183 36 16 36C11.5817 36 8 32.4183 8 28C8 23 16 15 16 15Z"
            fill="#F59E0B"
          />
        </svg>
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
