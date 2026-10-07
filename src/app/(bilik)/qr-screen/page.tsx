'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { RotateCw, Clock, Maximize2, Minimize2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DEFAULT_YOUTUBE_ID = 'J8Hk0Gz1v6E'; // ID Video Profil / Kampus UBTH

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

  // Listen to external fullscreen changes (e.g. Esc key)
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

  const voteUrl = baseUrl ? `${baseUrl}/vote?token=${token}` : '';
  const formattedTime = `00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft}`;

  return (
    <main
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[#FAF9F5] p-6 text-slate-800 select-none"
    >
      {/* Layer Video YouTube Background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <iframe
          className="absolute top-1/2 left-1/2 h-[56.25vw] min-h-screen w-[177.77vh] min-w-full -translate-x-1/2 -translate-y-1/2 opacity-40 scale-125 pointer-events-none"
          src={`https://www.youtube.com/embed/${DEFAULT_YOUTUBE_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${DEFAULT_YOUTUBE_ID}&playsinline=1&rel=0&showinfo=0&modestbranding=1&enablejsapi=1`}
          title="Background Kampus UBTH"
          allow="autoplay; encrypted-media"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/35 via-[#FAF9F5]/65 to-[#FAF9F5]" />
      </div>

      {/* Aksen Lengkungan Vektor */}
      <div className="pointer-events-none absolute -top-12 -left-12 z-10 h-48 w-48 rounded-full border-[18px] border-sky-500/70 opacity-90" />
      <div className="pointer-events-none absolute top-0 left-0 z-10 h-32 w-32 border-b-[10px] border-r-[10px] border-sky-400 rounded-br-full" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 z-10 h-56 w-56 rounded-full border-t-[14px] border-sky-500/50" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 z-10 h-56 w-56 rounded-full border-t-[14px] border-amber-400/70" />

      {/* Tombol Fullscreen */}
      <button
        onClick={toggleFullscreen}
        title="Layar Penuh"
        className="absolute top-6 right-6 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md border border-slate-200 text-slate-700 hover:bg-white hover:text-slate-950 transition cursor-pointer"
      >
        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>

      {/* Header */}
      <header className="z-20 mt-4 flex flex-col items-center text-center">
        <span className="text-xs md:text-sm font-bold tracking-[0.3em] text-slate-600 uppercase">
          Selamat Datang Di
        </span>
        <h1 className="mt-1 text-4xl md:text-6xl font-black tracking-tight text-[#1E293B]">
          PEMIRA UBTH
        </h1>
        <span className="mt-1 text-base md:text-lg font-bold tracking-widest text-[#1D4ED8] uppercase">
          Tahun 2026
        </span>
      </header>

      {/* Kartu QR Code */}
      <div className="z-20 my-auto flex flex-col items-center">
        <div className="relative rounded-3xl bg-white p-7 shadow-2xl border border-slate-100">
          <div className="absolute -top-3 -left-3 h-9 w-9 rounded-tl-xl border-t-4 border-l-4 border-sky-400" />
          <div className="absolute -top-3 -right-3 h-9 w-9 rounded-tr-xl border-t-4 border-r-4 border-sky-400" />
          <div className="absolute -bottom-3 -left-3 h-9 w-9 rounded-bl-xl border-b-4 border-l-4 border-sky-400" />
          <div className="absolute -bottom-3 -right-3 h-9 w-9 rounded-tr-xl border-b-4 border-r-4 border-sky-400" />

          <div className="flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
            {voteUrl ? (
              <QRCode
                size={260}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                value={voteUrl}
                viewBox="0 0 256 256"
              />
            ) : (
              <div className="h-64 w-64 animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>

          <button
            onClick={generateNewToken}
            title="Refresh Token"
            className="absolute -bottom-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        <h2 className="mt-7 text-base md:text-lg font-extrabold tracking-wider text-slate-800">
          SILAKAN SCAN MENGGUNAKAN HP ANDA
        </h2>

        <div className="mt-3 flex items-center gap-2 rounded-full bg-red-50/90 px-5 py-1.5 border border-red-200 shadow-xs backdrop-blur-xs">
          <Clock className="h-4 w-4 text-red-500" />
          <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
            QR Valid Dalam:
          </span>
          <span className="text-sm font-extrabold tabular-nums text-red-600">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Footer */}
      <footer className="z-20 mb-1 text-center">
        <p className="text-[11px] md:text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Pemilihan Raya Mahasiswa 2026 • Bilik Suara Digital by Mr.s Sistem Informasi
        </p>
      </footer>
    </main>
  );
}
