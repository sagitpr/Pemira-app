'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // sesuaikan path import supabase Anda

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
      // 1. Ambil seluruh data bilik dari Supabase terurut dari nomor bilik terkecil
      const { data: booths, error } = await supabase
        .from('booths')
        .select('*')
        .order('booth_number', { ascending: true });

      if (error || !booths || booths.length === 0) {
        setQueueMessage('Sistem bilik belum dikonfigurasi oleh Panitia KPUM.');
        setIsAllocating(false);
        return;
      }

      // 2. Cari bilik pertama yang benar-benar AVAILABLE
      const availableBooth = booths.find(b => b.status === 'AVAILABLE');

      if (availableBooth) {
        // ADA BILIK KOSONG! (Bilik 1, atau Bilik 2, atau Bilik 3, dst.)
        isAllocatedRef.current = true;
        const generatedToken = `UBTH-B${availableBooth.booth_number}-${Date.now()}`;

        // 3. KUNCI BILIK DI DATABASE SUPABASE SECARA INSTAN AGAR PEMILIH LAIN TIDAK MASUK KE BILIK INI
        const { error: lockErr } = await supabase
          .from('booths')
          .update({
            status: 'ALLOCATED',
            session_token: generatedToken,
            updated_at: new Date().toISOString()
          })
          .eq('id', availableBooth.id);

        if (lockErr) {
          // Jika terjadi benturan (race condition) dengan pemilih lain, coba lagi
          isAllocatedRef.current = false;
          setTimeout(tryAllocateBooth, 500);
          return;
        }

        // 4. Bersihkan memori lama & simpan sesi bilik di HP pemilih
        sessionStorage.clear();
        localStorage.removeItem('pemira_booth_session');
        localStorage.removeItem('pemira_completed_voter');
        
        sessionStorage.setItem('pemira_active_token', generatedToken);
        sessionStorage.setItem('pemira_assigned_booth', JSON.stringify({
          ...availableBooth,
          status: 'ALLOCATED',
          session_token: generatedToken
        }));
        sessionStorage.setItem('pemira_access_verified', 'true');

        // 5. Alihkan ke halaman /vote dengan parameter token & nomor bilik yang sah
        router.replace(`/vote?booth=${availableBooth.booth_number}&token=${generatedToken}&src=qr`);
      } else {
        // SEMUA BILIK SEDANG PENUH / TERPAKAI!
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

    // REALTIME LISTENER: Jika semua bilik penuh, dengarkan perubahan tabel booths
    // Begitu ada bilik yang selesai mencoblos (berubah jadi 'AVAILABLE'), langsung ambil bilik tersebut!
    const channel = supabase
      .channel('booths_queue_channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'booths' },
        (payload) => {
          if (payload.new && payload.new.status === 'AVAILABLE' && !isAllocatedRef.current) {
            tryAllocateBooth();
          }
        }
      )
      .subscribe();

    // Polling cadangan setiap 3 detik jika realtime terkendala
    const interval = setInterval(() => {
      if (!isAllocatedRef.current) {
        tryAllocateBooth();
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
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
