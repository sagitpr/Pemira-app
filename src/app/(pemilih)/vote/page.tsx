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
  const [assignedBoothName, setAssignedBoothName] = useState<string>('Bilik 03');
  const [assignedBoothNumber, setAssignedBoothNumber] = useState<number>(3);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Form State
  const [inputNim, setInputNim] = useState<string>('24030112');
  const [detectedVoter, setDetectedVoter] = useState<any>(null);

  // Selections
  const [selectedBemId, setSelectedBemId] = useState<string>('bem-01');
  const [selectedHimaId, setSelectedHimaId] = useState<string>('hima-ftb-01');

  // Modal
  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Timers
  const [timerSeconds, setTimerSeconds] = useState(180); // 03:00 default voting session
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postSubmitSeconds, setPostSubmitSeconds] = useState(180); // 03:00 countdown post-submit
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioIntervalRef = useRef<any>(null);

  // 1. Initial Booth Assignment & URL Token Burn
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
          setAssignedBoothNumber(data.boothNumber || 3);
        }
      } catch {
        setAssignedBoothName(rawBooth);
      }
    };

    initBooth();
  }, [searchParams]);

  // 2. Real-time NIM detection
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
    } catch {}

    try {
      updateBoothStatus?.(
        `b-0${assignedBoothNumber}`,
        'Sedang Memilih',
        { voterNim: detectedVoter?.nim, voterName: detectedVoter?.name, prodiName: detectedVoter?.prodiName }
      );
    } catch {}

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
    } catch {
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
      {/* TOP HEADER */}
      <header className="relative z-20 px-6 sm:px-12 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white shadow-2xs">
        <div className="flex items-center gap-3">
          <AppLogo size={40} showText={false} />
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

                  {/* 2 Candidate Cards Grid (Soft Squircle & Deep Navy Selected State) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {safeBemList.slice(0, 2).map((cand) => {
                      const isSelected = selectedBemId === cand?.id;

                      return (
                        <div
                          key={cand?.id}
                          onClick={() => setSelectedBemId(cand?.id)}
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
                                  Nomor Urut {cand?.number}: Pasangan Calon BEM
                                </span>
                                <h4 className="text-base font-black text-slate-900 mt-0.5">
                                  {cand?.leaderName} &amp; {cand?.viceLeaderName}
                                </h4>
                                <p className="text-xs text-slate-500 italic mt-0.5">
                                  &ldquo;{cand?.tagline || 'Inovatif, Transparan, dan Mengayomi Seluruh Mahasiswa UBTH'}&rdquo;
                                </p>
                              </div>
                              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                {cand?.number}
                              </div>
                            </div>

                            {/* Foto Paslon (Wadah Melengkung Berbingkai Rapi 3:4) */}
                            <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[140px] w-full mx-auto bg-slate-100 flex items-center justify-center relative shadow-xs mb-4">
                              {cand?.photoUrl ? (
                                <img
                                  src={cand.photoUrl}
                                  alt={cand.leaderName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-1 font-black text-sm">
                                    {cand?.number}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                    Paslon {cand?.number}
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
                                onClick={() => setSelectedBemId(cand?.id)}
                                className="w-full bg-white border-2 border-slate-300 text-slate-700 hover:border-slate-900 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-full text-xs transition-colors cursor-pointer"
                              >
                                Pilih Nomor Urut {cand?.number}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {safeHimaList.slice(0, 2).map((cand) => {
                      const isSelected = selectedHimaId === cand?.id;

                      return (
                        <div
                          key={cand?.id}
                          onClick={() => setSelectedHimaId(cand?.id)}
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
                                  Nomor Urut {cand?.number}: Pasangan Calon HIMA
                                </span>
                                <h4 className="text-base font-black text-slate-900 mt-0.5">
                                  {cand?.leaderName} &amp; {cand?.viceLeaderName}
                                </h4>
                                <p className="text-xs text-slate-500 italic mt-0.5">
                                  &ldquo;{cand?.tagline || 'Sinergi Bersama Memajukan Potensi Mahasiswa Jurusan'}&rdquo;
                                </p>
                              </div>
                              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                {cand?.number}
                              </div>
                            </div>

                            {/* Foto Paslon (Wadah Melengkung Berbingkai Rapi 3:4) */}
                            <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[140px] w-full mx-auto bg-slate-100 flex items-center justify-center relative shadow-xs mb-4">
                              {cand?.photoUrl ? (
                                <img
                                  src={cand.photoUrl}
                                  alt={cand.leaderName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-1 font-black text-sm">
                                    {cand?.number}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                    Paslon {cand?.number}
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
                                onClick={() => setSelectedHimaId(cand?.id)}
                                className="w-full bg-white border-2 border-slate-300 text-slate-700 hover:border-slate-900 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-full text-xs transition-colors cursor-pointer"
                              >
                                Pilih Nomor Urut {cand?.number}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

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
                      disabled={!selectedHimaId}
                      onClick={() => setCurrentStep(4)}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md shadow-slate-900/15 flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                        Paslon {selectedBemCandidate?.number || '01'} ({selectedBemCandidate?.leaderName || '-'})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Pilihan HIMA :</span>
                      <span className="font-bold text-slate-900 font-mono">
                        Paslon {selectedHimaCandidate?.number || '01'} ({selectedHimaCandidate?.leaderName || '-'})
                      </span>
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
                      disabled={isSubmitting}
                      onClick={handleFinalSubmit}
                      className="w-1/2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/15 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? 'Merekam Suara...' : 'KIRIM SUARA SAH'}
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
                    <div className="text-3xl font-black text-slate-900 font-mono tracking-tight mt-1">
                      ⏱️ {formatTimer(postSubmitSeconds)}
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
  );
}
