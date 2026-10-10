'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Monitor, Clock, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessionToken, setSessionToken] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isWaitingQueue, setIsWaitingQueue] = useState<boolean>(false);
  const [assignedBooth, setAssignedBooth] = useState<any>(null);
  const [queueSeconds, setQueueSeconds] = useState<number>(0);
  const isClaimingRef = useRef<boolean>(false);

  // 1. Ekstraksi Token QR & Simpan di sessionStorage HP Pemilih (Anti-Share)
  useEffect(() => {
    let token = searchParams.get('token') || searchParams.get('session_token');
    if (!token) {
      // Buat token darurat kriptografis jika scan langsung tanpa query
      const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
      token = `UBTH-${Date.now().toString(36).toUpperCase()}-${randomStr}`;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pemira_session_token', token);
      setSessionToken(token);
    }
  }, [searchParams]);

  // 2. Fungsi Cari dan Klaim Bilik Berstatus 'AVAILABLE' / 'TERSEDIA'
  const checkAndClaimBooth = async () => {
    if (isClaimingRef.current) return;
    isClaimingRef.current = true;

    try {
      // Ambil bilik pertama yang berstatus AVAILABLE atau TERSEDIA
      const { data: availableBooth, error } = await supabase
        .from('booths')
        .select('*')
        .or('status.eq.AVAILABLE,status.eq.TERSEDIA')
        .order('booth_number', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Gagal cek bilik dari Supabase:', error);
      }

      if (availableBooth) {
        setAssignedBooth(availableBooth);
        setIsWaitingQueue(false);
        setIsChecking(false);

        // Kunci sementara bilik tersebut menjadi 'OCCUPIED'
        try {
          await supabase
            .from('booths')
            .update({
              status: 'OCCUPIED',
              updated_at: new Date().toISOString(),
            })
            .eq('id', availableBooth.id);
        } catch (lockErr) {
          console.warn('Gagal kunci status OCCUPIED bilik:', lockErr);
        }

        const boothNum = availableBooth.booth_number || 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem('pemira_booth', String(boothNum));
        }

        // Arahkan HP pemilih langsung ke halaman pemilihan bilik tersebut
        setTimeout(() => {
          router.push(`/vote?booth=${boothNum}`);
        }, 1200);
        return;
      }

      // Jika semua bilik penuh
      setIsWaitingQueue(true);
      setIsChecking(false);
    } catch (err) {
      console.error('Scan booth allocation error:', err);
      setIsWaitingQueue(true);
      setIsChecking(false);
    } finally {
      isClaimingRef.current = false;
    }
  };

  // 3. Jalankan pengecekan pertama saat token siap
  useEffect(() => {
    if (sessionToken) {
      checkAndClaimBooth();
    }
  }, [sessionToken]);

  // 4. Timer antrean dan Supabase Realtime Listener jika semua bilik penuh
  useEffect(() => {
    if (!isWaitingQueue) return;

    const timer = setInterval(() => {
      setQueueSeconds((prev) => prev + 1);
    }, 1000);

    // Polling setiap 3 detik
    const pollInterval = setInterval(() => {
      checkAndClaimBooth();
    }, 3000);

    // Realtime Postgres Change Listener pada tabel booths
    const channel = supabase
      .channel('scan_booth_allocation_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booths' }, (payload: any) => {
        const st = (payload?.new?.status || '').toUpperCase();
        if (st === 'AVAILABLE' || st === 'TERSEDIA' || st === 'KOSONG') {
          checkAndClaimBooth();
        }
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [isWaitingQueue]);

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-between items-center p-6 font-sans text-slate-800 select-none">
      {/* HEADER */}
      <header className="w-full max-w-md mx-auto text-center pt-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img
            src="/candidate/image/logo-pemira.png"
            alt="Logo Pemira"
            className="h-10 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">
          PEMIRA UNIVERSITAS BAKTI TUNAS HUSADA
        </h1>
        <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
          SMART QR GATE • ALOKASI BILIK OTOMATIS
        </p>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        {/* KONDISI 1: SUKSES DIALOKASIKAN KE BILIK */}
        {assignedBooth ? (
          <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest block">
                BILIK BERHASIL DIALOKASIKAN
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                BILIK {String(assignedBooth.booth_number).padStart(2, '0')}
              </h2>
              <p className="text-xs text-slate-500 mt-2">
                Token anti-share telah diamankan pada sesi HP Anda. Mengalihkan ke bilik suara...
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Membuka Formulir Bilik {String(assignedBooth.booth_number).padStart(2, '0')}...</span>
            </div>
          </div>
        ) : isWaitingQueue ? (
          /* KONDISI 2: SEMUA BILIK SEDANG PENUH (ANTREAN REALTIME) */
          <div className="bg-white rounded-3xl p-8 border border-amber-200 shadow-xl text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200 shadow-xs relative">
              <Monitor className="w-8 h-8" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 animate-ping" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                ANTREAN DIGITAL AKTIF
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                Semua bilik sedang terisi, mohon menunggu sejenak...
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                HP Anda telah terdaftar dalam sistem. Anda akan otomatis diarahkan begitu salah satu bilik selesai digunakan oleh pemilih lain.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs font-bold text-amber-900">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                <span>Waktu Antre:</span>
              </span>
              <span className="font-mono text-sm font-black">
                {String(Math.floor(queueSeconds / 60)).padStart(2, '0')}:
                {String(queueSeconds % 60).padStart(2, '0')}
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => checkAndClaimBooth()}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Cek Ulang Ketersediaan Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => router.push('/vote?booth=1')}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 text-[11px] font-bold transition-all cursor-pointer"
              >
                Masuk Bilik 1 (Mode Uji Coba)
              </button>
            </div>
          </div>
        ) : (
          /* KONDISI 3: MEMERIKSA KETERSEDIAAN BILIK FISIK */
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-200 shadow-xs">
              <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Memverifikasi Gerbang &amp; Mencari Bilik Kosong...
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Sistem sedang mengamankan token sesi anti-share dan mencocokkan bilik fisik yang tersedia.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Token: {sessionToken.substring(0, 16)}...</span>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-md mx-auto text-center pb-2 text-[10px] text-slate-400 font-medium">
        KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA 2026
      </footer>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF9F5]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
            <p className="mt-3 text-xs font-bold text-slate-600">Menghubungkan ke Gerbang QR...</p>
          </div>
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
