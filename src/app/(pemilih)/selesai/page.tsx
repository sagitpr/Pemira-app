'use client';

import React, { useEffect, useState, useRef } from 'react';

export default function SelesaiPage() {
  const [voter, setVoter] = useState<{
    name: string;
    nim: string;
    prodi: string;
    voted_at: string;
  } | null>(null);
  const [countdown, setCountdown] = useState(60); // Tepat 1 Menit (60 Detik)
  const [isLockedBlank, setIsLockedBlank] = useState(false);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Ambil data selesai dari sessionStorage
    const stored = sessionStorage.getItem('pemira_completed_voter');
    if (!stored) {
      setIsLockedBlank(true);
      return;
    }

    try {
      setVoter(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }

    // 2. Audio Suara Ucapan Terima Kasih (Web Speech API Indonesia)
    const playThankYouAudio = () => {
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
      } catch (err) {
        console.warn("Speech API tidak tersedia:", err);
      }
    };

    // Putar pertama kali
    playThankYouAudio();

    // Looping suara setiap 20 detik selama rentang 1 menit
    speechIntervalRef.current = setInterval(() => {
      playThankYouAudio();
    }, 20000);

    // Kunci tombol back browser
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    // 3. Hitung Mundur 60 Detik Menuju Blank
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerBlankLockdown();
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

  const triggerBlankLockdown = () => {
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    
    // Hancurkan semua data sesi
    sessionStorage.clear();
    localStorage.removeItem('pemira_booth_session');
    localStorage.removeItem('pemira_active_token');
    localStorage.removeItem('pemira_assigned_booth');
    localStorage.removeItem('pemira_completed_voter');
    localStorage.removeItem('pemira_access_verified');

    // Kunci permanen ke blank screen tanpa redirect
    setIsLockedBlank(true);
  };

  // TAMPILAN BLANK HITAM TOTAL SETELAH 1 MENIT ATAU JIKA LINK DIBUKA ULANG
  if (isLockedBlank) {
    return (
      <div className="fixed inset-0 bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 text-center z-50 select-none">
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-11a9 9 0 110 18 9 9 0 010-18z" />
          </svg>
        </div>
        <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-400 mb-1">
          Sesi Bilik Telah Selesai
        </h2>
        <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed">
          Hak suara Anda telah tersimpan secara resmi. Silakan tinggalkan bilik suara.
        </p>
      </div>
    );
  }

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
                if (!target.src.includes('image-logo-Pemira')) {
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

          {/* Hitung Mundur 1 Menit Menuju Blank */}
          <div className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 mb-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <span>Sesi bilik tertutup otomatis dalam</span>
            <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {countdown}s
            </span>
          </div>

          <button
            onClick={triggerBlankLockdown}
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
