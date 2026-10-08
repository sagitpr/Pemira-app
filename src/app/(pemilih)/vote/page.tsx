'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { Candidate } from '@/data/voteMockData';
import AppLogo from '@/components/common/AppLogo';
import VisiMisiModal from '@/components/vote/VisiMisiModal';
import { createClient } from '@/lib/supabase/client';
import {
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Volume2,
  VolumeX,
  Clock,
  Eye,
  User,
  Monitor,
  Info,
} from 'lucide-react';

function VoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    voters = [],
    bemCandidates = [],
    himaCandidates = [],
    castVote,
    updateBoothStatus,
    showToast,
    electionStatus: contextStatus,
  } = useAdmin();

  const [electionStatus, setElectionStatus] = useState<'AKTIF' | 'JEDA' | 'TUTUP'>(contextStatus || 'AKTIF');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/admin/election-status');
        const data = await res.json();
        if (data?.success && data?.status) {
          setElectionStatus(data.status);
        }
      } catch {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [assignedBoothName, setAssignedBoothName] = useState<string>('Bilik 03');
  const [assignedBoothNumber, setAssignedBoothNumber] = useState<number>(3);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(false);
  const [isWaitingQueue, setIsWaitingQueue] = useState<boolean>(false);
  const [startVoteAt, setStartVoteAt] = useState<string>('');
  const [dbCandidatesLoaded, setDbCandidatesLoaded] = useState<boolean>(false);
  const [dbBemCandidates, setDbBemCandidates] = useState<Candidate[]>([]);
  const [dbHimaCandidates, setDbHimaCandidates] = useState<Candidate[]>([]);

  // Form State
  const [inputNim, setInputNim] = useState<string>('');
  const [detectedVoter, setDetectedVoter] = useState<any>(null);

  // Selections
  const [selectedBemId, setSelectedBemId] = useState<string>('');
  const [selectedHimaId, setSelectedHimaId] = useState<string>('');

  // Modal
  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isJedaModalDismissed, setIsJedaModalDismissed] = useState(false);

  // Timers
  const [timerSeconds, setTimerSeconds] = useState(180); // 03:00 default voting session
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postSubmitSeconds, setPostSubmitSeconds] = useState(180); // 03:00 countdown post-submit
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioIntervalRef = useRef<any>(null);

  // 1. Initial Booth Assignment & URL Token Burn with Tolerance
  useEffect(() => {
    let rawToken: string | null = null;
    let rawBooth = 'Bilik 03';

    try {
      rawToken = searchParams?.get('token') || null;
      rawBooth = searchParams?.get('booth') || 'Bilik 03';

      if (rawBooth && searchParams?.has('booth')) {
        const match = rawBooth.match(/\d+/);
        const num = match ? parseInt(match[0], 10) : 3;
        setAssignedBoothNumber(num);
        setAssignedBoothName(`Bilik 0${num}`);
        setCurrentStep(0);
      }

      if (typeof window !== 'undefined' && (rawToken || searchParams?.has('token'))) {
        window.history.replaceState(null, '', '/vote');
      }
    } catch (e) {
      console.warn('Parameter read error:', e);
    }

    const initSession = async () => {
      try {
        // Toleransi validasi token QR lokal (minimal 60-90 detik, gunakan 90 detik)
        if (rawToken && rawToken.startsWith('UBTH-')) {
          const parts = rawToken.split('-');
          if (parts.length >= 2) {
            const tokenTime = parseInt(parts[1], 36);
            if (!isNaN(tokenTime)) {
              const elapsedSeconds = (Date.now() - tokenTime) / 1000;
              if (elapsedSeconds > 90) {
                setIsTokenExpired(true);
                return;
              }
            }
          }
        }

        // Alokasikan bilik suara via endpoint API
        try {
          const res = await fetch('/api/vote/assign-booth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: rawToken, preferredBooth: rawBooth }),
          });
          const data = await res.json();
          if (data?.expired) {
            setIsTokenExpired(true);
            return;
          }
          if (data?.waiting) {
            setIsWaitingQueue(true);
            return;
          } else if (data?.success) {
            setIsWaitingQueue(false);
            setAssignedBoothName(data.boothName || rawBooth);
            setAssignedBoothNumber(data.boothNumber || 3);
          }
        } catch (boothErr) {
          console.warn('[VOTE_BOOTH_WARN] Fallback alokasi bilik lokal:', boothErr);
          setAssignedBoothName(rawBooth);
        }

        // Query candidates dari Supabase
        try {
          const supabase = createClient();
          const { data: dbData, error: dbErr } = await supabase
            .from('candidates')
            .select('*');

          if (dbErr) {
            // Pisahkan kondisi error jaringan/tabel dengan kondisi data belum tersedia
            console.warn('[CANDIDATES_QUERY_WARN] Menggunakan fallback kandidat:', dbErr);
          } else if (Array.isArray(dbData)) {
            // Query berhasil! Jika dbData === [], ini kondisi paslon belum diinput (empty state), BUKAN exception
            const bem = dbData.filter((c: any) => c.type === 'BEM');
            const hima = dbData.filter((c: any) => c.type === 'HIMA');
            setDbBemCandidates(bem);
            setDbHimaCandidates(hima);
            setDbCandidatesLoaded(true);
          }
        } catch (candFetchErr) {
          console.warn('[CANDIDATES_FETCH_WARN]', candFetchErr);
        }
      } catch (err) {
        // Logging detail console klien sesuai arahan
        console.error('[VOTE_INIT_ERROR]', err);
        setSessionError('Terjadi kendala saat menyinkronkan sesi pemilihan.');
      }
    };

    initSession();
  }, [searchParams]);

  // Listener antrean bilik ketika isWaitingQueue === true
  useEffect(() => {
    if (!isWaitingQueue) return;

    const retryAssign = async () => {
      try {
        const res = await fetch('/api/vote/assign-booth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data?.success && data?.boothNumber) {
          setAssignedBoothName(data.boothName || `Bilik 0${data.boothNumber}`);
          setAssignedBoothNumber(data.boothNumber);
          setIsWaitingQueue(false);
          setSessionError(null);
          showToast?.(`Bilik 0${data.boothNumber} telah tersedia untuk Anda!`, 'success');
        }
      } catch {}
    };

    const interval = setInterval(retryAssign, 3000);

    const supabase = createClient();
    const channel = supabase
      .channel('booth-queue-listener')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booths' }, (payload: any) => {
        const st = (payload?.new?.status || '').toUpperCase();
        if (st === 'TERSEDIA' || st === 'KOSONG') {
          retryAssign();
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isWaitingQueue, showToast]);

  // 2. Real-time NIM detection with Supabase lookup
  useEffect(() => {
    if (!inputNim) {
      setDetectedVoter(null);
      return;
    }
    const cleanNim = inputNim.trim();
    const safeVoters = voters || [];
    const found = safeVoters.find((v) => v?.nim?.trim() === cleanNim);
    if (found) {
      setDetectedVoter(found);
    } else {
      setDetectedVoter({
        nim: cleanNim,
        name: 'Mahasiswa UBTH',
        facultyId: 'FTB',
        prodiName: 'Bisnis Digital',
        status: 'belum',
      });
      (async () => {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from('voters')
            .select('*')
            .eq('nim', cleanNim)
            .single();
          if (data) {
            setDetectedVoter({
              nim: data.nim,
              name: data.name,
              facultyId: data.faculty_id || data.facultyId || 'FTB',
              prodiName: data.prodi_name || data.prodiName || 'Bisnis Digital',
              status: data.voting_status || (data.has_voted ? 'selesai' : 'belum'),
            });
          }
        } catch {}
      })();
    }
  }, [inputNim, voters]);

  // 3. Voting Session Countdown (Steps 2 - 4)
  useEffect(() => {
    if (currentStep < 2 || currentStep >= 5 || sessionError) return;
    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          showToast?.('Waktu sesi bilik habis. Bilik dikembalikan ke antrean.', 'warning');
          router.push('/qr-screen');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep, sessionError, router, showToast]);

  // 4. Post-Submit Step 5 (Solemn, Formal Screen: Web Audio Alert & 3-Minute Countdown, NO CONFETTI)
  useEffect(() => {
    if (currentStep !== 5) return;

    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', window.location.href);
      } catch {}

      const handlePopState = () => {
        try {
          window.history.pushState(null, '', window.location.href);
          showToast?.('Sesi pemungutan suara telah selesai dan terkunci secara resmi.', 'info');
        } catch {}
      };

      window.addEventListener('popstate', handlePopState);

      // Low formal intermittent audio tone (3 minutes session alert)
      const playBeep = () => {
        if (isAudioMuted) return;
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 solemn tone
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        } catch {}
      };

      playBeep();
      audioIntervalRef.current = setInterval(playBeep, 5000);

      const countdown = setInterval(() => {
        setPostSubmitSeconds((prev) => {
          if (prev <= 1) {
            router.push('/qr-screen');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        clearInterval(countdown);
        if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      };
    }
  }, [currentStep, isAudioMuted, router, showToast]);

  // Step 1 -> 2: Lanjut Memilih & Update status MENGERJAKAN
  const handleProceedToStep2 = async () => {
    if (!detectedVoter) {
      showToast?.('Masukkan NIM mahasiswa yang valid.', 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    setStartVoteAt(nowIso);

    try {
      const supabase = createClient();
      await supabase
        .from('voters')
        .update({
          voting_status: 'MENGERJAKAN',
          start_vote_at: nowIso,
        })
        .eq('nim', detectedVoter?.nim);
    } catch (e) {
      console.warn('Update voting_status MENGERJAKAN note:', e);
    }

    try {
      await fetch('/api/vote/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boothNumber: assignedBoothNumber,
          nim: detectedVoter?.nim,
          name: detectedVoter?.name,
          prodi: detectedVoter?.prodiName,
        }),
      });
    } catch {}

    try {
      updateBoothStatus?.(
        `b-0${assignedBoothNumber}`,
        'Sedang Memilih',
        { voterNim: detectedVoter?.nim, voterName: detectedVoter?.name, prodiName: detectedVoter?.prodiName }
      );
    } catch {}

    if (!selectedBemId && (safeBemList || []).length > 0) {
      setSelectedBemId(String(safeBemList[0]?.id));
    }
    if (!selectedHimaId && (filteredHimaList || []).length > 0) {
      setSelectedHimaId(String(filteredHimaList[0]?.id));
    }

    setCurrentStep(2);
  };

  // Step 4 -> 5: Final atomic vote
  const handleFinalSubmit = async () => {
    if (!selectedBemId) {
      showToast?.('Wajib memilih Paslon BEM.', 'error');
      return;
    }
    if (filteredHimaList.length > 0 && !selectedHimaId) {
      showToast?.('Wajib memilih Paslon HIMA untuk program studi Anda.', 'error');
      return;
    }

    setIsSubmitting(true);
    const voterNim = detectedVoter?.nim || inputNim || '';
    let durationSeconds = 0;
    if (startVoteAt) {
      durationSeconds = Math.max(1, Math.round((Date.now() - new Date(startVoteAt).getTime()) / 1000));
    }

    try {
      await fetch('/api/vote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim: voterNim,
          boothNumber: assignedBoothNumber,
          bemCandidateId: selectedBemId,
          himaCandidateId: selectedHimaId || 'none',
          durationSeconds,
        }),
      });

      castVote?.(voterNim, selectedBemId, selectedHimaId || '');
      updateBoothStatus?.(`b-0${assignedBoothNumber}`, 'Selesai');
      setIsSubmitting(false);
      setCurrentStep(5);
    } catch {
      castVote?.(voterNim, selectedBemId, selectedHimaId || '');
      updateBoothStatus?.(`b-0${assignedBoothNumber}`, 'Selesai');
      setIsSubmitting(false);
      setCurrentStep(5);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const safeBemList = dbCandidatesLoaded
    ? dbBemCandidates
    : (bemCandidates && bemCandidates.length > 0 ? bemCandidates : []);
  const safeHimaList = dbCandidatesLoaded
    ? dbHimaCandidates
    : (himaCandidates && himaCandidates.length > 0 ? himaCandidates : []);

  const voterProdi = (detectedVoter?.prodiName || detectedVoter?.prodi || '').trim().toLowerCase();

  const filteredHimaList = (safeHimaList || []).filter((cand) => {
    if (cand.type && cand.type !== 'HIMA') return false;
    const candProdi = (cand.prodi_id || cand.prodiId || (cand as any).prodi || (cand as any).prodi_name || '').trim().toLowerCase();
    if (!voterProdi) return true;
    return (
      candProdi === voterProdi ||
      candProdi.includes(voterProdi) ||
      voterProdi.includes(candProdi)
    );
  });

  const selectedBemCandidate = safeBemList.find((c) => String(c?.id) === String(selectedBemId)) || safeBemList[0] || null;
  const selectedHimaCandidate = filteredHimaList.find((c) => String(c?.id) === String(selectedHimaId)) || filteredHimaList[0] || null;

  // 1. TAMPILAN ANTREAN BILIK PENUH
  if (isWaitingQueue) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 select-none font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-blue-200 shadow-xl text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-200 shadow-xs relative">
            <Monitor className="w-8 h-8" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 animate-ping" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Semua Bilik Suara Sedang Penuh
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
              Anda sedang berada dalam antrean digital. Mohon tunggu, Anda akan otomatis diarahkan begitu bilik tersedia.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
            <span className="text-xs font-bold text-slate-700 ml-1">Menunggu bilik kosong...</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Sistem secara otomatis mengecek ketersediaan bilik setiap 3 detik
          </p>
        </div>
      </div>
    );
  }

  // 1. TAMPILAN PERINGATAN SPESIFIK TOKEN QR KEDALUWARSA
  if (isTokenExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 select-none font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-200/90 shadow-xl text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200 shadow-xs">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Token QR Kedaluwarsa
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
              Silakan lakukan scan ulang pada layar proyektor utama.
            </p>
          </div>
          <button
            onClick={() => router.push('/qr-screen')}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            Kembali ke Layar QR Kiosk
          </button>
        </div>
      </div>
    );
  }

  // 2. EMPTY STATE PASLON KOSONG INFORMATIF (Bukan exception error)
  if (currentStep !== 5 && safeBemList.length === 0 && safeHimaList.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center bg-slate-50 font-sans select-none">
        <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-sm border border-slate-200 space-y-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200 shadow-xs">
            <Info className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Sesi Pemilihan Belum Dimulai
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
              Data pasangan calon BEM &amp; HIMA sedang dipersiapkan oleh KPUM. Silakan tunggu arahan dari petugas bilik suara.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push('/qr-screen')}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
            >
              Kembali ke Layar QR Kiosk
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep !== 5 && electionStatus === 'TUTUP') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center bg-slate-50 font-sans select-none">
        <div className="max-w-md p-8 bg-white rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase">Pemilihan Telah Ditutup</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pemilihan Telah Ditutup oleh KPUM. Terima kasih atas partisipasi Anda.
          </p>
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Sesi Tidak Valid atau Bilik Penuh
            </h2>
            <p className="text-xs text-slate-500 mt-2">{sessionError}</p>
          </div>
          <button
            onClick={() => router.push('/qr-screen')}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            Kembali ke Layar QR Kiosk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-between overflow-x-hidden font-sans text-slate-800 select-none">
      {/* JEDA NOTIFICATION BANNER */}
      {electionStatus === 'JEDA' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 border-b border-amber-600 shadow-xs sticky top-0 z-30">
          <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
          <span>Pemilihan Sedang Dijeda / Istirahat oleh KPUM. Formulir suara terkunci sementara hingga sesi dibuka kembali.</span>
        </div>
      )}

      {/* JEDA WARNING MODAL */}
      {electionStatus === 'JEDA' && !isJedaModalDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200 shadow-xs">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Peringatan: Pemilihan Dijeda
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                Pemilihan Sedang Dijeda / Istirahat oleh KPUM. Formulir suara terkunci sementara hingga sesi dibuka kembali.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsJedaModalDismissed(true)}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-colors shadow-md cursor-pointer"
              >
                Mengerti, Tunggu Sesi Dibuka
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="relative z-20 px-6 sm:px-12 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white shadow-2xs">
        <div className="flex items-center gap-3">
          <img
            src="/candidate/image/logo-pemira.png"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            alt="Logo Pemira"
            className="h-12 w-auto object-contain mx-auto"
          />
          <div>
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 block leading-tight">
              PEMIRA UBTH 2026
            </span>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
              Komisi Pemilihan Raya Universitas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentStep >= 2 && currentStep <= 4 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold font-mono text-xs shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span>Sesi Bilik: {formatTimer(timerSeconds)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
            <span>Bilik Suara Digital</span>
            <Monitor className="w-3.5 h-3.5 text-slate-700" />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 flex items-center">
        {/* TAHAP 0: PENUGASAN BILIK SUARA (CLEAN WHITE & SLATE CANVAS) */}
        {currentStep === 0 && (
          <div className="w-full max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              <span>Terverifikasi</span>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                PENUGASAN BILIK SUARA
              </p>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mt-1">
                {assignedBoothName.toUpperCase()}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1">
              <strong className="text-slate-800 block">Petunjuk Bilik:</strong>
              <p>
                Silakan menuju ke <strong>{assignedBoothName.toUpperCase()}</strong>. Pastikan Anda berada di bilik fisik yang tepat sebelum membuka surat suara digital.
              </p>
            </div>

            <button
              onClick={() => setCurrentStep(1)}
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-900/15 cursor-pointer"
            >
              <span>Saya Sudah di Bilik, Mulai Memilih</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAHAP 1 - 5: 5-STEP VOTING FLOW */}
        {currentStep >= 1 && (
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Column: Vertical Stepper Indicator */}
            <div className="hidden md:flex md:col-span-1 flex-col items-center justify-center py-6">
              {[1, 2, 3, 4, 5].map((step, idx) => {
                const isPassed = currentStep > step;
                const isCurrent = currentStep === step;

                return (
                  <React.Fragment key={step}>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isPassed
                          ? 'bg-slate-900 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-slate-900 text-white ring-4 ring-slate-300 shadow-md'
                          : 'border-2 border-slate-300 text-slate-400 bg-white'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : step}
                    </div>

                    {idx < 4 && (
                      <div
                        className={`w-0.5 h-12 transition-colors ${
                          currentStep > step ? 'bg-slate-900' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Right Column: Main Voting Card */}
            <div className="md:col-span-11 w-full">
              {/* STEP 1: VALIDASI PEMILIH (CLEAN WHITE CANVAS) */}
              {currentStep === 1 && (
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl max-w-2xl mx-auto space-y-6 animate-in fade-in">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      TAHAP 1 DARI 4
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Validasi Pemilih
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Masukkan data diri Anda untuk membuka surat suara digital.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Nomor Induk Mahasiswa (NIM)
                      </label>
                      <div className="relative">
                        <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Contoh: 210401xxx"
                          value={inputNim}
                          onChange={(e) => setInputNim(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                        />
                      </div>
                    </div>

                    {/* Live Detection Info Box */}
                    {detectedVoter ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-slate-500 block text-[11px]">Mahasiswa Terverifikasi DPT:</span>
                            <span className="font-bold text-slate-900 text-sm">
                              {detectedVoter?.name || 'Mahasiswa'}
                            </span>
                            <span className="text-slate-600 block text-[11px]">
                              {detectedVoter?.prodiName || 'Program Studi Terdaftar'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-slate-900 text-white uppercase">
                          {detectedVoter?.facultyId || 'UBTH'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                        <Info className="w-4 h-4 shrink-0 text-slate-400" />
                        <span>Data program studi akan otomatis terdeteksi dari NIM Anda.</span>
                      </div>
                    )}

                    {/* Quick Demo NIMs */}
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                        Pilih Cepat Sampel Demo Mahasiswa:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { nim: '24030112', label: 'Dimas (Farmasi)' },
                          { nim: '23010045', label: 'Alya (Bisnis Digital)' },
                          { nim: '22020089', label: 'Rian (Keperawatan)' },
                        ].map((d) => (
                          <button
                            key={d.nim}
                            type="button"
                            onClick={() => setInputNim(d.nim)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => router.push('/qr-screen')}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                    >
                      ← Kembali
                    </button>

                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md shadow-slate-900/15 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Lanjut ke Pemilihan BEM</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PILIHAN KETUA & WAKIL BEM (MODERN INTERACTIVE CURVED CARDS) */}
              {currentStep === 2 && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 animate-in fade-in">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      TAHAP 2 DARI 4
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Pemilihan Presiden &amp; Wakil Presiden BEM
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih salah satu pasangan calon Badan Eksekutif Mahasiswa Universitas.
                    </p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="w-1/2 bg-slate-900 h-full rounded-full" />
                    </div>
                  </div>

                  {/* Candidate Cards Grid (Soft Squircle & Deep Navy Selected State) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(safeBemList || []).map((cand) => {
                      const isSelected = String(selectedBemId) === String(cand?.id);
                      const displayPhoto = cand?.photoUrl || cand?.photo_url;
                      const displayName = cand?.leaderName || cand?.leader_name || 'Kandidat';
                      const displayVice = cand?.viceLeaderName || cand?.vice_leader_name || '';
                      const displayNumber = cand?.candidate_number ?? cand?.candidateNumber ?? cand?.number ?? '01';

                      return (
                        <div
                          key={String(cand?.id || displayNumber)}
                          onClick={() => cand?.id && setSelectedBemId(String(cand.id))}
                          className={`rounded-3xl border-2 p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-slate-900 bg-slate-50/50 ring-4 ring-slate-900/10 shadow-lg'
                              : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                          }`}
                        >
                          <div>
                            {/* Header Kartu & Badge Nomor Urut Tegas */}
                            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                              <div>
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide block">
                                  Nomor Urut {displayNumber}: Pasangan Calon BEM
                                </span>
                                <h4 className="text-base font-black text-slate-900 mt-0.5">
                                  {displayName} {displayVice ? `& ${displayVice}` : ''}
                                </h4>
                                <p className="text-xs text-slate-500 italic mt-0.5">
                                  &ldquo;{cand?.tagline || 'Inovatif, Transparan, dan Mengayomi Seluruh Mahasiswa UBTH'}&rdquo;
                                </p>
                              </div>
                              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                {displayNumber}
                              </div>
                            </div>

                            {/* Foto Paslon (Wadah Melengkung Berbingkai Rapi 3:4) */}
                            <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[140px] w-full mx-auto bg-slate-100 flex items-center justify-center relative shadow-xs mb-4">
                              {displayPhoto ? (
                                <img
                                  src={displayPhoto}
                                  alt={displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-1 font-black text-sm">
                                    {displayNumber}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                    Paslon {displayNumber}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Tombol Lihat Visi Misi */}
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailModalCandidate(cand);
                                  setIsDetailModalOpen(true);
                                }}
                                className="text-xs font-bold text-slate-700 hover:text-slate-950 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat Visi &amp; Misi Resmi</span>
                              </button>
                            </div>
                          </div>

                          {/* Tombol Pilihan Solid Pill */}
                          <div className="mt-5">
                            {isSelected ? (
                              <div className="w-full bg-slate-900 text-white font-bold py-2.5 px-4 rounded-full shadow-md flex items-center justify-center gap-2 text-xs">
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Terpilih sebagai Pilihan Anda</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => cand?.id && setSelectedBemId(String(cand.id))}
                                className="w-full bg-white border-2 border-slate-300 text-slate-700 hover:border-slate-900 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-full text-xs transition-colors cursor-pointer"
                              >
                                Pilih Nomor Urut {displayNumber}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={!selectedBemId}
                      onClick={() => setCurrentStep(3)}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md shadow-slate-900/15 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>Lanjut ke Pemilihan HIMA</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PILIHAN KETUA & WAKIL HIMPUNAN (MODERN INTERACTIVE CURVED CARDS) */}
              {currentStep === 3 && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 animate-in fade-in">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      TAHAP 3 DARI 4
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Pemilihan Ketua &amp; Wakil Himpunan Mahasiswa (HIMA)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih pasangan calon Himpunan Mahasiswa program studi Anda.
                    </p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="w-full bg-slate-900 h-full rounded-full" />
                    </div>
                  </div>

                  {filteredHimaList.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-blue-50/60 border border-blue-200 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center">
                        <Info className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Tidak ada pemilihan HIMA untuk Program Studi {detectedVoter?.prodiName || 'Anda'}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                          Anda hanya memberikan suara untuk Pemilihan BEM Universitas. Silakan lanjutkan ke tahap konfirmasi.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredHimaList.map((cand) => {
                        const isSelected = String(selectedHimaId) === String(cand?.id);
                        const displayPhoto = cand?.photoUrl || cand?.photo_url;
                        const displayName = cand?.leaderName || cand?.leader_name || 'Kandidat';
                        const displayVice = cand?.viceLeaderName || cand?.vice_leader_name || '';
                        const displayNumber = cand?.candidate_number ?? cand?.candidateNumber ?? cand?.number ?? '01';

                        return (
                          <div
                            key={String(cand?.id || displayNumber)}
                            onClick={() => cand?.id && setSelectedHimaId(String(cand.id))}
                            className={`rounded-3xl border-2 p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'border-slate-900 bg-slate-50/50 ring-4 ring-slate-900/10 shadow-lg'
                                : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                            }`}
                          >
                            <div>
                              {/* Header Kartu & Badge Nomor Urut Tegas */}
                              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                                <div>
                                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide block">
                                    Nomor Urut {displayNumber}: Pasangan Calon HIMA
                                  </span>
                                  <h4 className="text-base font-black text-slate-900 mt-0.5">
                                    {displayName} {displayVice ? `& ${displayVice}` : ''}
                                  </h4>
                                  <p className="text-xs text-slate-500 italic mt-0.5">
                                    &ldquo;{cand?.tagline || 'Sinergi Bersama Memajukan Potensi Mahasiswa Jurusan'}&rdquo;
                                  </p>
                                </div>
                                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                  {displayNumber}
                                </div>
                              </div>

                              {/* Foto Paslon */}
                              <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[140px] w-full mx-auto bg-slate-100 flex items-center justify-center relative shadow-xs mb-4">
                                {displayPhoto ? (
                                  <img
                                    src={displayPhoto}
                                    alt={displayName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-center p-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-1 font-black text-sm">
                                      {displayNumber}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                      Paslon {displayNumber}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Tombol Lihat Visi Misi */}
                              <div className="text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailModalCandidate(cand);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="text-xs font-bold text-slate-700 hover:text-slate-950 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat Visi &amp; Misi Resmi</span>
                                </button>
                              </div>
                            </div>

                            {/* Tombol Pilihan Solid Pill */}
                            <div className="mt-5">
                              {isSelected ? (
                                <div className="w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-full shadow-md flex items-center justify-center gap-2 text-xs">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                  <span>Terpilih sebagai Pilihan Anda</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => cand?.id && setSelectedHimaId(String(cand.id))}
                                  className="w-full bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-600 hover:bg-slate-50 font-medium py-2.5 px-4 rounded-full text-xs transition-colors cursor-pointer"
                                >
                                  Pilih Nomor Urut {displayNumber}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      ← Kembali ke BEM
                    </button>

                    <button
                      type="button"
                      disabled={filteredHimaList.length > 0 && !selectedHimaId}
                      onClick={() => setCurrentStep(4)}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>Lanjut ke Konfirmasi</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: KONFIRMASI PILIHAN */}
              {currentStep === 4 && (
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl max-w-lg mx-auto text-center space-y-6 animate-in fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-900 mx-auto flex items-center justify-center border border-slate-300 shadow-xs">
                    <ShieldCheck className="w-7 h-7 text-slate-900" />
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      TAHAP 4 DARI 4
                    </span>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Konfirmasi Pilihan Suara
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Pastikan pilihan Anda sudah benar sebelum disimpan permanen ke database.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs font-semibold">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Pilihan BEM-U :</span>
                      <span className="font-bold text-slate-900 font-mono">
                        Paslon {selectedBemCandidate?.candidate_number ?? selectedBemCandidate?.candidateNumber ?? selectedBemCandidate?.number ?? '01'} ({selectedBemCandidate?.leader_name || selectedBemCandidate?.leaderName || '-'})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Pilihan HIMA :</span>
                      {filteredHimaList.length === 0 ? (
                        <span className="font-bold text-slate-500 italic">
                          Tidak Ada Pemilihan (Dilewati)
                        </span>
                      ) : (
                        <span className="font-bold text-slate-900 font-mono">
                          Paslon {selectedHimaCandidate?.candidate_number ?? selectedHimaCandidate?.candidateNumber ?? selectedHimaCandidate?.number ?? '01'} ({selectedHimaCandidate?.leader_name || selectedHimaCandidate?.leaderName || '-'})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold flex items-center gap-2 text-left">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Pilihan bersifat RAHASIA dan TIDAK DAPAT diubah setelah tombol kirim ditekan.</span>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || electionStatus === 'JEDA'}
                      onClick={() => {
                        if (electionStatus === 'JEDA') {
                          showToast?.('Pemilihan Sedang Dijeda / Istirahat oleh KPUM. Formulir suara terkunci sementara.', 'warning');
                          return;
                        }
                        handleFinalSubmit();
                      }}
                      className="w-1/2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/15 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting
                        ? 'Merekam Suara...'
                        : electionStatus === 'JEDA'
                        ? 'PEMILIHAN DIJEDA'
                        : 'KIRIM SUARA SAH'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: HALAMAN SELESAI (FORMAL, HENING, TEGAS TANPA ANIMASI CONFETTI) */}
              {currentStep === 5 && (
                <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-2xl max-w-lg mx-auto text-center space-y-6 animate-in fade-in">
                  {/* Ikon Gembok Solid Deep Navy */}
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg mx-auto">
                    <Lock className="w-8 h-8 text-white" />
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Suara Anda Sudah Sah Terekam ke Dalam Sistem.
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2">
                      Terima kasih atas partisipasi aktif Anda dalam Pemilihan Raya Mahasiswa Universitas BTH 2026.
                    </p>
                  </div>

                  {/* Audio Status Alert */}
                  <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => setIsAudioMuted(!isAudioMuted)}
                      className="hover:text-slate-900 cursor-pointer"
                      title={isAudioMuted ? 'Bunyikan audio alert' : 'Matikan audio alert'}
                    >
                      {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                    <span>ALARM BILIK AKTIF HINGGA SELESAI</span>
                  </div>

                  {/* Hitung Mundur Timer Bilik (03:00 ke 00:00) */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-xs text-slate-500 block">Silakan meninggalkan bilik suara</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Waktu Meninggalkan Bilik:
                    </span>
                    <div className="text-3xl font-black text-slate-900 font-mono tracking-tight mt-1 flex items-center justify-center gap-2">
                      <Clock className="w-6 h-6 text-slate-700" />
                      <span>{formatTimer(postSubmitSeconds)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push('/qr-screen')}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    Selesai &amp; Keluar Bilik Suara
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="relative z-20 py-3 text-center text-[11px] font-medium text-slate-400 border-t border-slate-200/60 bg-white">
        KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
      </footer>

      {/* Visi Misi Modal */}
      <VisiMisiModal
        candidate={detailModalCandidate}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSelectCandidate={() => {
          if (detailModalCandidate?.id) {
            if (detailModalCandidate?.type === 'BEM') {
              setSelectedBemId(String(detailModalCandidate.id));
            } else {
              setSelectedHimaId(String(detailModalCandidate.id));
            }
          }
        }}
        isSelected={
          detailModalCandidate?.id
            ? (detailModalCandidate?.type === 'BEM' && String(selectedBemId) === String(detailModalCandidate.id)) ||
              (detailModalCandidate?.type === 'HIMA' && String(selectedHimaId) === String(detailModalCandidate.id))
            : false
        }
      />
    </div>
  );
}

class VoteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error('[VOTE_INIT_ERROR]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6 text-center bg-slate-50 font-sans">
          <div className="max-w-md p-8 bg-white rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Menyinkronkan Sesi Bilik Suara</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Terjadi penyesuaian jaringan pada sesi pemilihan. Silakan tekan tombol di bawah untuk memuat ulang formulir bilik suara.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function VotingPage() {
  return (
    <VoteErrorBoundary>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
              <p className="mt-3 text-xs font-bold text-slate-600">Menyiapkan Bilik Suara Digital...</p>
            </div>
          </div>
        }
      >
        <VoteContent />
      </Suspense>
    </VoteErrorBoundary>
  );
}
