'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/common/AppLogo';
import QrDisplay from '@/components/qr/QrDisplay';
import { ShieldCheck, Video, HelpCircle } from 'lucide-react';

export default function BilikQrScreenPage() {
  const router = useRouter();
  const [currentToken, setCurrentToken] = useState('UBTH-TOKEN-89412');
  const [expiresIn, setExpiresIn] = useState(120);
  const [boothNumber, setBoothNumber] = useState('Bilik 01');

  // Timer countdown for QR expiration
  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          setCurrentToken(`UBTH-TOKEN-${Math.floor(10000 + Math.random() * 90000)}`);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setCurrentToken(`UBTH-TOKEN-${Math.floor(10000 + Math.random() * 90000)}`);
    setExpiresIn(120);
  };

  const handleSimulateScan = () => {
    router.push(`/vote?token=${currentToken}&booth=${encodeURIComponent(boothNumber)}`);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-950 font-sans selection:bg-sky-500 selection:text-white">
      {/* Background Ambience / Subtle Video Texture */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Subtle animated gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 opacity-90" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Top Header Section (Direct text on canvas with drop-shadow, no black container box) */}
      <header className="relative z-10 w-full pt-8 sm:pt-12 px-6 flex flex-col items-center text-center">
        {/* University Crest / Logo */}
        <div className="mb-4">
          <AppLogo size={56} />
        </div>

        {/* Header Text Hierarchy */}
        <span className="text-white/90 text-xs md:text-sm font-semibold tracking-widest uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          SELAMAT DATANG DI
        </span>
        <h1 className="text-white text-3xl md:text-5xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] mt-1">
          BILIK SUARA
        </h1>
        <p className="text-sky-300 font-bold text-xs md:text-sm tracking-wider uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] mt-1.5">
          PEMIRA UNIVERSITAS BAKTI TUNAS HUSADA 2026
        </p>

        {/* Quick selector for booths (Testing/Deployment) */}
        <div className="mt-4 flex items-center gap-2 bg-slate-900/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
          <span className="text-slate-400">Pilih Bilik:</span>
          {['Bilik 01', 'Bilik 02', 'Bilik 03', 'Bilik 04'].map((b) => (
            <button
              key={b}
              onClick={() => setBoothNumber(b)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                boothNumber === b
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </header>

      {/* Center QR Display Area */}
      <main className="relative z-10 w-full px-4 py-8 flex flex-col items-center justify-center">
        <QrDisplay
          token={currentToken}
          boothNumber={boothNumber}
          expiresInSeconds={expiresIn}
          onRefresh={handleRefresh}
          onSimulateScan={handleSimulateScan}
        />
      </main>

      {/* Bottom Information (Clean & Minimalist, No cluttering watermarks) */}
      <footer className="relative z-10 w-full pb-6 px-6 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Sistem E-Voting Terenkripsi &amp; Terdesentralisasi KPUM UBTH</span>
        </div>

        <div className="text-[11px] text-slate-500">
          Butuh bantuan? Silakan hubungi Panitia KPUM di depan pintu bilik.
        </div>
      </footer>
    </div>
  );
}
