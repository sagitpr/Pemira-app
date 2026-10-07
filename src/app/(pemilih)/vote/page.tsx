'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { Candidate } from '@/data/voteMockData';
import AppLogo from '@/components/common/AppLogo';
import VisiMisiModal from '@/components/vote/VisiMisiModal';
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
  RefreshCw,
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
  } = useAdmin();

  // Current Step: 0 = Penugasan Bilik, 1 = Validasi Pemilih, 2 = BEM, 3 = HIMA, 4 = Konfirmasi, 5 = Selesai
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [assignedBoothName, setAssignedBoothName] = useState<string>('Bilik 01');
  const [assignedBoothNumber, setAssignedBoothNumber] = useState<number>(1);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Form State
  const [inputNim, setInputNim] = useState<string>('24030112'); // Default Dimas
  const [detectedVoter, setDetectedVoter] = useState<any>(null);

  // Selections
  const [selectedBemId, setSelectedBemId] = useState<string>('bem-01');
  const [selectedHimaId, setSelectedHimaId] = useState<string>('hima-ftb-01');

  // Modal
  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Timers
  const [timerSeconds, setTimerSeconds] = useState(130); // 02:10 default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postSubmitSeconds, setPostSubmitSeconds] = useState(170); // 02:50 default
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioIntervalRef = useRef<any>(null);

  // 1. Initial Booth Assignment & URL Token Burn (Safe Execution)
  useEffect(() => {
    let rawToken: string | null = null;
    let rawBooth = 'Bilik 01';

    try {
      rawToken = searchParams?.get('token') || null;
      rawBooth = searchParams?.get('booth') || 'Bilik 01';

      if (rawBooth && searchParams?.has('booth')) {
        const match = rawBooth.match(/\d+/);
        const num = match ? parseInt(match[0], 10) : 1;
        setAssignedBoothNumber(num);
        setAssignedBoothName(`Bilik 0${num}`);
        setCurrentStep(0);
      }

      // Purge token from address bar cleanly
      if (typeof window !== 'undefined' && (rawToken || searchParams?.has('token'))) {
        window.history.replaceState(null, '', '/vote');
      }
    } catch (e) {
      console.warn('Parameter read error:', e);
    }

    const initBooth = async () => {
      try {
        const res = await fetch('/api/vote/assign-booth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: rawToken, preferredBooth: rawBooth }),
        });
        const data = await res.json();
        if (data?.waiting) {
          setSessionError('Seluruh bilik suara sedang penuh. Mohon menunggu antrean atau scan ulang proyektor.');
        } else if (data?.success) {
          setAssignedBoothName(data.boothName || rawBooth);
          setAssignedBoothNumber(data.boothNumber || 1);
        }
      } catch (err) {
        setAssignedBoothName(rawBooth);
      }
    };

    initBooth();
  }, [searchParams]);

  // 2. Real-time NIM detection with Safe Optional Chaining
  useEffect(() => {
    if (!inputNim) {
      setDetectedVoter(null);
      return;
    }
    const safeVoters = voters || [];
    const found = safeVoters.find((v) => v?.nim?.trim() === inputNim?.trim());
    if (found) {
      setDetectedVoter(found);
    } else {
      setDetectedVoter({
        nim: inputNim,
        name: 'Mahasiswa UBTH',
        facultyId: 'FTB',
        prodiName: 'Bisnis Digital',
        status: 'belum',
      });
    }
  }, [inputNim, voters]);

  // 3. Voting Session Countdown (Steps 2 - 4)
  useEffect(() => {
    if (currentStep < 2 || currentStep >= 5 || sessionError) return;
    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          showToast?.('Waktu sesi bilik habis. Bilik dikembalikan ke awal.', 'warning');
          router.push('/qr-screen');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep, sessionError, router, showToast]);

  // 4. Post-Submit Step 5 (Safe Web Audio & Countdown)
  useEffect(() => {
    if (currentStep !== 5) return;

    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', window.location.href);
      } catch (e) {}

      const handlePopState = () => {
        try {
          window.history.pushState(null, '', window.location.href);
          showToast?.('Sesi pemungutan suara telah selesai dan terkunci.', 'info');
        } catch (e) {}
      };

      window.addEventListener('popstate', handlePopState);

      const playBeep = () => {
        if (isAudioMuted) return;
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch (e) {}
      };

      playBeep();
      audioIntervalRef.current = setInterval(playBeep, 4000);

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

  // Step 1 -> 2
  const handleProceedToStep2 = async () => {
    if (!detectedVoter) {
      showToast?.('Masukkan NIM mahasiswa yang valid.', 'error');
      return;
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
    } catch (e) {}

    try {
      updateBoothStatus?.(
        `b-0${assignedBoothNumber}`,
        'Sedang Memilih',
        { voterNim: detectedVoter?.nim, voterName: detectedVoter?.name, prodiName: detectedVoter?.prodiName }
      );
    } catch (e) {}

    if (!selectedBemId && (bemCandidates || []).length > 0) {
      setSelectedBemId(bemCandidates[0]?.id || 'bem-01');
    }
    if (!selectedHimaId && (himaCandidates || []).length > 0) {
      setSelectedHimaId(himaCandidates[0]?.id || 'hima-ftb-01');
    }

    setCurrentStep(2);
  };

  // Step 4 -> 5: Final atomic vote
  const handleFinalSubmit = async () => {
    if (!selectedBemId || !selectedHimaId) {
      showToast?.('Wajib memilih Paslon BEM dan Paslon HIMA.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await fetch('/api/vote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim: detectedVoter?.nim || '24030112',
          boothNumber: assignedBoothNumber,
          bemCandidateId: selectedBemId,
          himaCandidateId: selectedHimaId,
        }),
      });

      castVote?.(detectedVoter?.nim || '24030112', selectedBemId, selectedHimaId);
      updateBoothStatus?.(`b-0${assignedBoothNumber}`, 'Selesai');
      setIsSubmitting(false);
      setCurrentStep(5);
    } catch (err) {
      castVote?.(detectedVoter?.nim || '24030112', selectedBemId, selectedHimaId);
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

  const safeBemList = bemCandidates || [];
  const safeHimaList = himaCandidates || [];
  const selectedBemCandidate = safeBemList.find((c) => c?.id === selectedBemId) || safeBemList[0] || null;
  const selectedHimaCandidate = safeHimaList.find((c) => c?.id === selectedHimaId) || safeHimaList[0] || null;

  // Friendly Error Card if session is invalid or booth is occupied
  if (sessionError) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Sesi Tidak Valid atau Bilik Penuh
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {sessionError}
            </p>
          </div>

          <button
            onClick={() => {
              setSessionError(null);
              router.push('/qr-screen');
            }}
            className="w-full py-3 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Scan Ulang QR Proyektor</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FAF9F5] flex flex-col justify-between overflow-hidden font-sans text-slate-800 select-none">
      {/* Decorative Wave Graphic */}
      <div className="pointer-events-none absolute -bottom-24 -left-20 w-[420px] h-[340px] opacity-75 z-0">
        <svg viewBox="0 0 400 320" fill="none" className="w-full h-full">
          <path
            d="M -50 200 C 50 120, 180 320, 320 220 C 380 180, 420 280, 420 350 L -50 350 Z"
            fill="url(#waveGrad1)"
          />
          <path
            d="M -50 260 C 80 160, 220 300, 350 240 L -50 350 Z"
            fill="url(#waveGrad2)"
            opacity="0.8"
          />
          <defs>
            <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="pointer-events-none absolute -bottom-28 -right-20 w-[420px] h-[340px] opacity-75 z-0">
        <svg viewBox="0 0 400 320" fill="none" className="w-full h-full">
          <path
            d="M 450 200 C 350 120, 220 320, 80 220 C 20 180, -20 280, -20 350 L 450 350 Z"
            fill="url(#waveGrad3)"
          />
          <defs>
            <linearGradient id="waveGrad3" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* TOP HEADER */}
      <header className="relative z-20 px-6 sm:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo size={36} showText={false} />
          <span className="text-base sm:text-lg font-black tracking-tight text-slate-900">
            PEMIRA 2026
          </span>
        </div>

        <div className="flex items-center gap-3">
          {currentStep >= 2 && currentStep <= 4 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-rose-200 text-rose-600 font-bold font-mono text-xs shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span>Time: {formatTimer(timerSeconds)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/90 text-xs font-bold text-slate-700 shadow-2xs">
            <span>Bilik Suara Digital</span>
            <Monitor className="w-3.5 h-3.5 text-sky-600" />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-4 sm:py-6 flex items-center">
        {/* TAHAP 0: PENUGASAN BILIK SUARA */}
        {currentStep === 0 && (
          <div className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95">
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

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs text-slate-600 space-y-1">
              <strong className="text-slate-800 block">Petunjuk Bilik:</strong>
              <p>
                Silakan menuju ke <strong>{assignedBoothName.toUpperCase()}</strong>. Pastikan Anda berada di bilik fisik yang tepat sebelum membuka surat suara digital.
              </p>
            </div>

            <button
              onClick={() => setCurrentStep(1)}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-900/20 cursor-pointer"
            >
              <span>Saya Sudah di Bilik, Mulai Memilih</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAHAP 1 - 5: 5-STEP BALLET FLOW WITH LEFT VERTICAL STEPPER */}
        {currentStep >= 1 && (
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Column: Vertical Stepper Indicator (Steps 1 to 5) */}
            <div className="hidden md:flex md:col-span-1 flex-col items-center justify-center py-6">
              {[1, 2, 3, 4, 5].map((step, idx) => {
                const isPassed = currentStep > step;
                const isCurrent = currentStep === step;

                return (
                  <React.Fragment key={step}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? 'bg-[#0284c7] text-white shadow-xs'
                          : isCurrent
                          ? 'bg-[#0284c7] text-white ring-4 ring-sky-100 shadow-md'
                          : 'border-2 border-slate-300 text-slate-400 bg-white'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : step}
                    </div>

                    {idx < 4 && (
                      <div
                        className={`w-0.5 h-12 transition-colors ${
                          currentStep > step ? 'bg-[#0284c7]' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Right Column: Main Voting Card */}
            <div className="md:col-span-11 w-full">
              {/* STEP 1: VALIDASI PEMILIH */}
              {currentStep === 1 && (
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl max-w-2xl mx-auto space-y-6 animate-in fade-in">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Validasi Pemilih
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Masukkan NIM Anda untuk memulai.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="NIM (Contoh: 210401xx)"
                        value={inputNim}
                        onChange={(e) => setInputNim(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-[#0284c7] focus:ring-4 focus:ring-sky-100 transition-all"
                      />
                    </div>

                    {/* Live Detection Info Box */}
                    {detectedVoter ? (
                      <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs text-sky-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>
                            Mahasiswa Terdeteksi: <strong>{detectedVoter?.name || 'Mahasiswa'}</strong> ({detectedVoter?.prodiName || '-'})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-200 text-sky-800">
                          {detectedVoter?.facultyId || 'UBTH'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-sky-600 bg-sky-50 px-3.5 py-2.5 rounded-xl border border-sky-100">
                        <Info className="w-4 h-4 shrink-0 text-sky-500" />
                        <span>Prodi akan terdeteksi setelah NIM diisi.</span>
                      </div>
                    )}

                    {/* Quick Demo NIMs */}
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                        Pilih Cepat Sampel Demo:
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
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
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
                      className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                    >
                      ← Kembali
                    </button>

                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      className="px-6 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/25 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Mulai</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PILIHAN KETUA & WAKIL BEM */}
              {currentStep === 2 && (
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Tahap 1: Ketua &amp; Wakil BEM
                    </h3>
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="w-1/2 bg-[#0284c7] h-full rounded-full" />
                    </div>
                  </div>

                  {/* 2 Candidate Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {safeBemList.slice(0, 2).map((cand) => {
                      const isSelected = selectedBemId === cand?.id;

                      return (
                        <div
                          key={cand?.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#0284c7] ring-2 ring-sky-200 bg-sky-50/20 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="h-32 sm:h-36 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-between p-3 text-white relative overflow-hidden shadow-xs mb-3">
                              <span className="text-xs font-mono font-bold bg-black/20 px-2 py-0.5 rounded-md backdrop-blur-xs">
                                {cand?.number}
                              </span>
                              <div className="text-right">
                                <span className="text-[11px] opacity-80 block">Kandidat BEM</span>
                                <span className="text-xs font-bold">UBTH 2026</span>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold text-slate-400 block uppercase">
                              No. {cand?.number}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">
                              Paslon {cand?.number}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                              {cand?.leaderName} &amp; {cand?.viceLeaderName}
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                setDetailModalCandidate(cand);
                                setIsDetailModalOpen(true);
                              }}
                              className="mt-2 text-[11px] font-bold text-[#0284c7] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Visi Misi</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedBemId(cand?.id)}
                            className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#0284c7] text-white shadow-sm flex items-center justify-center gap-1.5'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Pilih {cand?.number}</span>
                              </>
                            ) : (
                              `Pilih ${cand?.number}`
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={!selectedBemId}
                      onClick={() => setCurrentStep(3)}
                      className="px-6 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>Lanjut ke Himpunan</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PILIHAN KETUA & WAKIL HIMPUNAN */}
              {currentStep === 3 && (
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Tahap 2: Ketua &amp; Wakil Himpunan
                    </h3>
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="w-full bg-[#0284c7] h-full rounded-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {safeHimaList.slice(0, 2).map((cand) => {
                      const isSelected = selectedHimaId === cand?.id;

                      return (
                        <div
                          key={cand?.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#0284c7] ring-2 ring-sky-200 bg-sky-50/20 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="h-32 sm:h-36 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-between p-3 text-white relative overflow-hidden shadow-xs mb-3">
                              <span className="text-xs font-mono font-bold bg-black/20 px-2 py-0.5 rounded-md backdrop-blur-xs">
                                {cand?.number}
                              </span>
                              <div className="text-right">
                                <span className="text-[11px] opacity-80 block">Kandidat HIMA</span>
                                <span className="text-xs font-bold">{cand?.facultyId || 'UBTH'}</span>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold text-slate-400 block uppercase">
                              No. {cand?.number}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">
                              Paslon {cand?.number}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                              {cand?.leaderName} &amp; {cand?.viceLeaderName}
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                setDetailModalCandidate(cand);
                                setIsDetailModalOpen(true);
                              }}
                              className="mt-2 text-[11px] font-bold text-[#0284c7] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Visi Misi</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedHimaId(cand?.id)}
                            className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#0284c7] text-white shadow-sm flex items-center justify-center gap-1.5'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Pilih {cand?.number}</span>
                              </>
                            ) : (
                              `Pilih ${cand?.number}`
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      ← Kembali ke BEM
                    </button>

                    <button
                      type="button"
                      disabled={!selectedHimaId}
                      onClick={() => setCurrentStep(4)}
                      className="px-6 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>Lanjut ke Verifikasi</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: KONFIRMASI PILIHAN */}
              {currentStep === 4 && (
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl max-w-lg mx-auto text-center space-y-6 animate-in fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#0284c7] mx-auto flex items-center justify-center border border-sky-200">
                    <ShieldCheck className="w-7 h-7" />
                  </div>

                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    KONFIRMASI PILIHAN
                  </h3>

                  <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 text-left space-y-3 text-xs font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">BEM :</span>
                      <span className="font-bold text-slate-900 font-mono">
                        Paslon {selectedBemCandidate?.number || '01'} ({selectedBemCandidate?.leaderName || '-'})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">HIMA :</span>
                      <span className="font-bold text-slate-900 font-mono">
                        Paslon {selectedHimaCandidate?.number || '01'} ({selectedHimaCandidate?.leaderName || '-'})
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold flex items-center gap-2 text-left">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Pilihan TIDAK DAPAT diubah setelah ini.</span>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleFinalSubmit}
                      className="w-1/2 py-2.5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/25 transition-all cursor-pointer"
                    >
                      {isSubmitting ? 'Memproses...' : 'YA, SUBMIT!'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: HALAMAN BERHASIL SUBMIT */}
              {currentStep === 5 && (
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xl max-w-lg mx-auto text-center space-y-6 animate-in fade-in">
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-sky-100 animate-ping opacity-30" />
                    <div className="absolute inset-2 rounded-full bg-sky-100/60" />
                    <div className="relative w-16 h-16 rounded-2xl bg-[#0284c7] text-white flex items-center justify-center shadow-lg">
                      <Lock className="w-8 h-8" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      TERIMA KASIH TELAH MEMILIH!
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Suara Anda Sudah Sah Terrekam.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => setIsAudioMuted(!isAudioMuted)}
                      className="hover:text-slate-900"
                    >
                      {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                    <span>NYALA HINGGA TIMER SELESAI</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-xs text-slate-500 block">Silakan keluar bilik</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Meninggalkan Bilik Dalam:
                    </span>
                    <div className="text-3xl font-black text-rose-600 font-mono tracking-tight">
                      ⏱️ {formatTimer(postSubmitSeconds)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push('/qr-screen')}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Selesai &amp; Keluar Bilik Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Visi Misi Modal */}
      <VisiMisiModal
        candidate={detailModalCandidate}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSelectCandidate={() => {
          if (detailModalCandidate) {
            if (detailModalCandidate?.type === 'BEM') {
              setSelectedBemId(detailModalCandidate?.id);
            } else {
              setSelectedHimaId(detailModalCandidate?.id);
            }
          }
        }}
        isSelected={
          detailModalCandidate
            ? (detailModalCandidate?.type === 'BEM' && selectedBemId === detailModalCandidate?.id) ||
              (detailModalCandidate?.type === 'HIMA' && selectedHimaId === detailModalCandidate?.id)
            : false
        }
      />
    </div>
  );
}

export default function VotingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF9F5]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#0284c7] border-t-transparent" />
            <p className="mt-3 text-xs font-bold text-slate-600">Menyiapkan Bilik Suara...</p>
          </div>
        </div>
      }
    >
      <VoteContent />
    </Suspense>
  );
}
