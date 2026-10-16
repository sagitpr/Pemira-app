'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const router = useRouter();
  const [isAllocating, setIsAllocating] = useState(true);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueMessage, setQueueMessage] = useState('Memeriksa ketersediaan bilik suara fisik...');
  const isAllocatedRef = useRef(false);

  // FUNGSI UTAMA: MENCARI DAN MENGUNCI BILIK KOSONG SECARA BERURUTAN
  const tryAllocateBooth = async () => {
    if (isAllocatedRef.current) return;

    try {
      const res = await fetch('/api/vote/assign-booth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success && data.booth_number) {
        isAllocatedRef.current = true;
        const generatedToken = data.session_token || data.token || `UBTH-B${data.booth_number}-${Date.now()}`;

        // Bersihkan memori lama & simpan sesi bilik di HP pemilih
        sessionStorage.clear();
        localStorage.removeItem('pemira_booth_session');
        localStorage.removeItem('pemira_completed_voter');

        sessionStorage.setItem('pemira_active_token', generatedToken);
        sessionStorage.setItem('pemira_assigned_booth', JSON.stringify({
          id: data.booth_id || `booth-${data.booth_number}`,
          booth_number: data.booth_number,
          name: data.booth_name || `Bilik ${String(data.booth_number).padStart(2, '0')}`,
          status: 'ALLOCATED',
          session_token: generatedToken,
        }));
        sessionStorage.setItem('pemira_access_verified', 'true');

        // Alihkan ke halaman /vote dengan parameter token & nomor bilik yang sah
        router.replace(`/vote?booth=${data.booth_number}&token=${generatedToken}&src=qr`);
      } else {
        // SEMUA BILIK SEDANG PENUH / TERPAKAI
        setIsAllocating(false);
        setIsQueueing(true);
        setQueueMessage('Seluruh bilik suara fisik saat ini sedang digunakan. Anda berada dalam antrean otomatis, mohon menunggu...');
      }
    } catch (err) {
      console.error('Error alokasi bilik:', err);
      setIsAllocating(false);
    }
  };

  useEffect(() => {
    tryAllocateBooth();

    // Polling setiap 3 detik jika antrean penuh
    const interval = setInterval(() => {
      if (!isAllocatedRef.current) {
        tryAllocateBooth();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-800 flex flex-col justify-between p-4 md:p-6 font-sans antialiased">
      <header className="w-full max-w-md mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#EFECE6] p-1.5 shadow-xs flex items-center justify-center">
            <img src="/candidate/image-logo-Pemira.png" alt="Logo Pemira" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-900 tracking-tight leading-none">PEMIRA UBTH 2026</h1>
            <p className="text-[10px] font-medium text-slate-500 tracking-wide mt-0.5">KOMISI PEMILIHAN RAYA</p>
          </div>
        </div>
      </header>

      <main className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-white rounded-3xl border border-[#EFECE6] p-6 shadow-sm text-center flex flex-col items-center">
          {/* Spinner Halus */}
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-4 text-slate-700">
            <div className="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <h2 className="text-base font-bold text-slate-900 mb-1">
            {isQueueing ? 'Antrean Bilik Suara' : 'Menghubungkan ke Bilik Suara'}
          </h2>

          <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-6">
            {queueMessage}
          </p>

          {isQueueing && (
            <div className="w-full bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-800 font-medium">
              Sistem akan otomatis mengarahkan Anda ke bilik fisik begitu pemilih sebelumnya selesai. Mohon tetap di halaman ini.
            </div>
          )}
        </div>
      </main>

      <footer className="w-full py-3 text-center">
        <p className="text-[11px] text-slate-400 font-medium tracking-wide">
          KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
        </p>
      </footer>
    </div>
  );
}
