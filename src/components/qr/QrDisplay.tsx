'use client';

import React from 'react';
import QRCode from 'react-qr-code';
import { RefreshCw, Smartphone, ShieldCheck, Clock } from 'lucide-react';

interface QrDisplayProps {
  token: string;
  boothNumber: string;
  expiresInSeconds?: number;
  onRefresh?: () => void;
  onSimulateScan?: () => void;
}

export default function QrDisplay({
  token,
  boothNumber,
  expiresInSeconds = 120,
  onRefresh,
  onSimulateScan,
}: QrDisplayProps) {
  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/vote?token=${token}&booth=${encodeURIComponent(boothNumber)}`
    : `https://pemira.ubth.ac.id/vote?token=${token}&booth=${encodeURIComponent(boothNumber)}`;

  return (
    <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
      {/* Decorative Outer Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-cyan-500 rounded-3xl blur-xl opacity-30 animate-pulse" />

      {/* Main Container */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 flex flex-col items-center">
        {/* Booth Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold tracking-wide mb-5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-4" />
          <span>BILIK AKTIF: {boothNumber.toUpperCase()}</span>
        </div>

        {/* QR Code Container with Frame */}
        <div className="relative p-5 bg-white rounded-2xl shadow-inner border-2 border-slate-100 flex items-center justify-center">
          {/* Animated Scanning Beam Line */}
          <div className="absolute inset-x-5 top-5 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent animate-scanBeam pointer-events-none rounded-full shadow-[0_0_8px_#0284c7]" />

          <QRCode
            value={qrUrl}
            size={220}
            level="H"
            className="w-full h-auto max-w-[200px] sm:max-w-[230px]"
          />
        </div>

        {/* Scan Instruction */}
        <div className="mt-5 text-center">
          <div className="inline-flex items-center justify-center gap-1.5 text-slate-800 font-bold text-base sm:text-lg">
            <Smartphone className="w-5 h-5 text-sky-600" />
            <span>Pindai dengan Smartphone Pemilih</span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xs">
            Arahkan kamera atau pemindai QR untuk memulai proses pencoblosan langsung di bilik ini.
          </p>
        </div>

        {/* Timer & Refresh */}
        <div className="mt-5 pt-4 w-full border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>
              Kadaluarsa dlm: <strong className="text-slate-700 font-mono">{expiresInSeconds}s</strong>
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan QR</span>
            </button>
          )}
        </div>

        {/* Simulation Shortcut Button for Demo */}
        {onSimulateScan && (
          <button
            onClick={onSimulateScan}
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Simulasikan Buka Bilik Pemilih (Demo)</span>
          </button>
        )}
      </div>
    </div>
  );
}
