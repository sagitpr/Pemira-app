'use client';

import React, { useEffect, useState, useRef } from 'react';

export default function SelesaiPage() {
  const [voter, setVoter] = useState<{
    name: string;
    nim: string;
    prodi: string;
    voted_at: string;
  } | null>(null);
  const [countdown, setCountdown] = useState(60); // 1 Menit (60 Detik)
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasExitedRef = useRef(false);

  // FUNGSI UTAMA KELUAR & ALIHKAN KE about:blank
  const handleExitToAboutBlank = () => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;

    // 1. Matikan audio
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // 2. Musnahkan total semua memori
    sessionStorage.clear();
    localStorage.clear();

    // 3. Paksa ganti URL menjadi about:blank
    window.location.replace('about:blank');
  };

  useEffect(() => {
    // Validasi Sesi: Jika halaman dibuka tanpa data selesai yang sah, langsung buang ke about:blank
    const stored = sessionStorage.getItem('pemira_completed_voter');
    if (!stored) {
      handleExitToAboutBlank();
      return;
    }

    try {
      setVoter(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }

    // Audio Suara Ucapan Terima Kasih (Web Speech API Indonesia)
    const speakThankYou = () => {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const text = "Terima kasih atas partisipasi Anda dalam Pemilihan Raya Mahasiswa Universitas Bakti Tunas Husada Tahun 2026. Hak suara Anda telah berhasil disimpan secara sah.";
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'id-ID';
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } catch (err) {}
    };

    speakThankYou();

    // Looping suara setiap 20 detik selama 1 menit
    speechIntervalRef.current = setInterval(() => {
      speakThankYou();
    }, 20000);

    // Kunci tombol navigasi Back browser
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    // Hitung Mundur 60 Detik menuju about:blank
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleExitToAboutBlank();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-800 flex flex-col justify-between p-4 md:p-6 font-sans antialiased">
      {/* Header Resmi */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#EFECE6] p-1.5 shadow-xs flex items-center justify-center overflow-hidden">
            <img 
              src="/candidate/image-logo-Pemira.png" 
              alt="Logo Pemira" 
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('image-logo-Pemira.png')) {
                  target.src = '/image-logo-Pemira.png';
                }
              }}
            />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-900 tracking-tight leading-none">PEMIRA UBTH 2026</h1>
            <p className="text-[10px] font-medium text-slate-500 tracking-wide mt-0.5">KOMISI PEMILIHAN RAYA</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-600 tracking-tight">
          Suara Terverifikasi
        </span>
      </header>

      {/* Konten Utama */}
      <main className="w-full max-w-md mx-auto my-auto py-4">
        <div className="bg-white rounded-3xl border border-[#EFECE6] p-6 shadow-sm flex flex-col items-center text-center">
          
          <p className="text-[11px] font-bold tracking-widest text-emerald-600 uppercase mb-2">
            Transaksi Suara Berhasil
          </p>

          <h2 className="text-xl font-bold text-slate-900 leading-snug mb-2">
            Terima Kasih Atas Partisipasi Anda
          </h2>

          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mb-6">
            Hak suara Anda dalam Pemilihan Raya Mahasiswa Universitas Bakti Tunas Husada Tahun 2026 telah berhasil disimpan secara sah dan terenkripsi ke dalam tabulasi suara digital.
          </p>

          {/* Rincian Identitas Pemilih */}
          <div className="w-full bg-[#FAF8F4] border border-[#EFECE6] rounded-2xl p-4 text-left mb-6 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Nama Pemilih</span>
              <span className="font-semibold text-slate-800 text-right">{voter?.name || 'Mahasiswa Terdaftar'}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-[#EAE6DF]">
              <span className="text-slate-400 font-medium">NIM</span>
              <span className="font-mono font-semibold text-slate-800">{voter?.nim || '-'}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-[#EAE6DF]">
              <span className="text-slate-400 font-medium">Program Studi</span>
              <span className="font-medium text-slate-700 text-right">{voter?.prodi || '-'}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-[#EAE6DF]">
              <span className="text-slate-400 font-medium">Waktu Rekam</span>
              <span className="font-mono text-slate-600">{voter?.voted_at || '-'} WIB</span>
            </div>
          </div>

          {/* Hitung Mundur 1 Menit Menuju about:blank */}
          <div className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 mb-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <span>Sesi bilik tertutup otomatis dalam</span>
            <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {countdown}s
            </span>
          </div>

          <button
            onClick={handleExitToAboutBlank}
            className="w-full py-3 px-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-xs active:scale-[0.99]"
          >
            Selesai & Keluar dari Bilik
          </button>

          {/* Watermark Konsisten */}
          <div className="w-full mt-6 pt-4 border-t border-[#EFECE6] flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Engineered by <strong className="text-slate-700 font-semibold">Sagit Faturrakhman</strong></span>
          </div>
        </div>
      </main>

      {/* Footer Resmi */}
      <footer className="w-full py-3 text-center">
        <p className="text-[11px] text-slate-400 font-medium tracking-wide">
          KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
        </p>
      </footer>
    </div>
  );
}
