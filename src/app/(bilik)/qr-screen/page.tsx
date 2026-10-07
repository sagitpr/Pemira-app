'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { RotateCw, Clock, Maximize2, Minimize2 } from 'lucide-react';
import AppLogo from '@/components/common/AppLogo';

export const dynamic = 'force-dynamic';

export default function QrScreenPage() {
  const [token, setToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [baseUrl, setBaseUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateNewToken = () => {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    setToken(`UBTH-${timestamp}-${randomStr}`);
    setTimeLeft(30);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
    generateNewToken();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateNewToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Listen to external fullscreen changes (Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const voteUrl = baseUrl ? `${baseUrl}/vote?token=${token}&booth=01` : '';
  const formattedTime = `00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft}`;

  return (
    <main
      ref={containerRef}
      className="fixed inset-0 flex h-screen max-h-screen w-screen flex-col items-center justify-between overflow-hidden bg-[#FAF9F5] p-4 md:p-6 text-slate-800 select-none"
    >
      {/* Layer Video YouTube Background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <iframe
          className="absolute top-1/2 left-1/2 h-[56.25vw] min-h-screen w-[177.77vh] min-w-full -translate-x-1/2 -translate-y-1/2 opacity-70 scale-125 pointer-events-none"
          src="https://www.youtube.com/embed/uQFd91AhFes?autoplay=1&mute=1&controls=0&loop=1&playlist=uQFd91AhFes&playsinline=1&rel=0&showinfo=0&modestbranding=1"
          title="Background Kampus UBTH"
          allow="autoplay; encrypted-media"
        />
        {/* Gradasi putih diturunkan ke bawah agar video gedung UBTH di atas jelas terlihat */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-900/15 via-40% to-[#FAF9F5] to-75%" />
      </div>

      {/* Aksen Lengkungan Vektor Biru Sudut Kiri Atas (Sesuai Screenshot Referensi) */}
      <div className="pointer-events-none absolute -top-16 -left-16 z-10 h-56 w-56 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 opacity-90 shadow-lg" />
      <div className="pointer-events-none absolute -top-24 -left-24 z-10 h-72 w-72 rounded-full border-[16px] border-sky-300/40" />

      {/* Aksen Lengkungan Vektor Bawah (Kiri & Kanan Sesuai Screenshot) */}
      <div className="pointer-events-none absolute -bottom-16 -left-16 z-10 h-64 w-64">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
          <path d="M 0 160 C 60 140, 120 180, 180 120" stroke="#0284c7" strokeWidth="4" fill="none" opacity="0.7" />
          <path d="M 0 180 C 80 150, 140 190, 200 140" stroke="#f59e0b" strokeWidth="3" fill="none" opacity="0.6" />
        </svg>
      </div>
      <div className="pointer-events-none absolute -bottom-16 -right-16 z-10 h-64 w-64">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
          <path d="M 200 160 C 140 140, 80 180, 20 120" stroke="#0284c7" strokeWidth="4" fill="none" opacity="0.7" />
          <path d="M 200 180 C 120 150, 60 190, 0 140" stroke="#f59e0b" strokeWidth="3" fill="none" opacity="0.6" />
        </svg>
      </div>

      {/* Tombol Layar Penuh (Top Right) */}
      <button
        onClick={toggleFullscreen}
        title="Layar Penuh"
        className="absolute top-6 right-6 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-md border border-slate-200 text-slate-700 hover:bg-white hover:text-slate-950 transition cursor-pointer"
      >
        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>

      {/* Header Teks Atas (Dibuat Sangat Jelas Terbaca dengan Kontras & Logo Resmi) */}
      <header className="z-20 mt-4 flex flex-col items-center text-center max-w-4xl px-4">
        {/* Official Logo Badge */}
        <div className="mb-2 drop-shadow-md">
          <AppLogo size={52} showText={false} />
        </div>

        <span className="text-xs sm:text-sm font-extrabold tracking-[0.35em] text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          SELAMAT DATANG DI
        </span>

        <h1 className="mt-1 text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          PEMIRA UNIVERSITAS BAKTI TUNAS HUSADA
        </h1>

        <span className="mt-1 text-sm sm:text-base md:text-lg font-black tracking-widest text-amber-300 uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
          TAHUN 2026
        </span>
      </header>

      {/* Kartu QR Code (Bingkai Sudut Biru Sesuai Referensi, Tanpa Kotak Nomor Tambahan) */}
      <div className="z-20 my-auto flex flex-col items-center">
        <div className="relative rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100">
          {/* 4 Sudut Fokus Biru */}
          <div className="absolute -top-3 -left-3 h-8 w-8 rounded-tl-xl border-t-4 border-l-4 border-sky-500" />
          <div className="absolute -top-3 -right-3 h-8 w-8 rounded-tr-xl border-t-4 border-r-4 border-sky-500" />
          <div className="absolute -bottom-3 -left-3 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-sky-500" />
          <div className="absolute -bottom-3 -right-3 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-sky-500" />

          {/* QR Code */}
          <div className="flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72">
            {voteUrl ? (
              <QRCode
                size={260}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                value={voteUrl}
                viewBox="0 0 256 256"
              />
            ) : (
              <div className="h-60 w-60 animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>

          {/* Tombol Refresh Token Kecil di Sudut */}
          <button
            onClick={generateNewToken}
            title="Refresh Token"
            className="absolute -bottom-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Teks Instruksi Bawah QR */}
        <h2 className="mt-6 text-sm sm:text-base md:text-lg font-black tracking-wider text-slate-800 uppercase">
          SILAKAN SCAN MENGGUNAKAN HP ANDA
        </h2>

        {/* Badge Timer Merah */}
        <div className="mt-3 flex items-center gap-2 rounded-full bg-red-50/90 px-5 py-1.5 border border-red-200 shadow-xs backdrop-blur-xs">
          <Clock className="h-4 w-4 text-red-500" />
          <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
            QR VALID DALAM:
          </span>
          <span className="text-sm font-extrabold tabular-nums text-red-600 font-mono">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Footer */}
      <footer className="z-20 mb-1 text-center">
        <p className="text-[11px] md:text-xs font-semibold tracking-wider text-slate-500 uppercase">
          PEMILIHAN RAYA MAHASISWA 2026 • BILIK SUARA DIGITAL BY Mr.s SISTEM INFORMASI
        </p>
      </footer>
    </main>
  );
}
