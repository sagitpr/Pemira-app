'use client';

import React, { useState } from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
  subtitleClassName?: string;
}

export default function AppLogo({
  className = '',
  size = 44,
  showText = false,
  textClassName = 'text-slate-900 font-bold',
  subtitleClassName = 'text-slate-500 font-medium',
}: AppLogoProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {!imgError ? (
        <img
          src="/logo.png"
          alt="Logo UBTH"
          width={size}
          height={size}
          className="object-contain shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-900 flex items-center justify-center text-white font-black shadow-md shrink-0 border border-sky-400/30"
        >
          <span style={{ fontSize: `${Math.max(10, size * 0.32)}px` }} className="tracking-tighter">
            UBTH
          </span>
        </div>
      )}

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`text-base tracking-tight ${textClassName}`}>PEMIRA 2026</span>
          <span className={`text-xs ${subtitleClassName}`}>Universitas Bakti Tunas Husada</span>
        </div>
      )}
    </div>
  );
}
