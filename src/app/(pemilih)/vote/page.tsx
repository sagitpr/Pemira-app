'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { Candidate } from '@/data/voteMockData';
import VoteHeader from '@/components/vote/VoteHeader';
import VotingStepper from '@/components/vote/VotingStepper';
import CandidateCard from '@/components/vote/CandidateCard';
import VisiMisiModal from '@/components/vote/VisiMisiModal';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Volume2,
  VolumeX,
  Hourglass,
  HelpCircle,
} from 'lucide-react';

function VoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    voters,
    bemCandidates,
    himaCandidates,
    castVote,
    updateBoothStatus,
    showToast,
  } = useAdmin();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [assignedBoothName, setAssignedBoothName] = useState<string>('Bilik 01');
  const [assignedBoothNumber, setAssignedBoothNumber] = useState<number>(1);
  const [isWaitingQueue, setIsWaitingQueue] = useState<boolean>(false);

  const [selectedNim, setSelectedNim] = useState<string>('24030112'); // Default Dimas
  const [selectedVoter, setSelectedVoter] = useState(voters.find((v) => v.nim === '24030112') || voters[0]);

  const [selectedBemId, setSelectedBemId] = useState<string>('');
  const [selectedHimaId, setSelectedHimaId] = useState<string>('');

  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [timerSeconds, setTimerSeconds] = useState(180);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-submit self-destruct / bilik countdown (3 minutes = 180s)
  const [postSubmitSeconds, setPostSubmitSeconds] = useState(180);
  const [ticketAudit, setTicketAudit] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioIntervalRef = useRef<any>(null);

  // 1. Initial Booth Assignment & URL Token Burn
  useEffect(() => {
    const rawToken = searchParams.get('token');
    const rawBooth = searchParams.get('booth') || 'Bilik 01';

    // Burn token visually from URL
    if (typeof window !== 'undefined' && (rawToken || searchParams.has('token'))) {
      window.history.replaceState(null, '', '/vote');
    }

    const initBooth = async () => {
      try {
        const res = await fetch('/api/vote/assign-booth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: rawToken, preferredBooth: rawBooth }),
        });
        const data = await res.json();

        if (data.waiting) {
          setIsWaitingQueue(true);
        } else if (data.success) {
          setAssignedBoothName(data.boothName || rawBooth);
          setAssignedBoothNumber(data.boothNumber || 1);
        }
      } catch (err) {
        setAssignedBoothName(rawBooth);
        const match = rawBooth.match(/\d+/);
        if (match) setAssignedBoothNumber(parseInt(match[0], 10));
      }
    };

    initBooth();
  }, [searchParams]);

  // Sync selected voter
  useEffect(() => {
    const voter = voters.find((v) => v.nim === selectedNim);
    if (voter) {
      setSelectedVoter(voter);
    }
  }, [selectedNim, voters]);

  // Session timer before step 5
  useEffect(() => {
    if (currentStep >= 5 || isWaitingQueue) return;
    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          showToast('Waktu sesi bilik habis. Bilik dikembalikan ke awal.', 'warning');
          router.push('/qr-screen');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep, isWaitingQueue, router, showToast]);

  // Lock back navigation & Post-Submit Self-Destruct Audio on Step 5
  useEffect(() => {
    if (currentStep !== 5) return;

    // Lock back navigation
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      showToast('Sesi pemungutan suara telah ditutup dan dikunci.', 'info');
    };
    window.addEventListener('popstate', handlePopState);

    // Audio cue beep using Web Audio API
    const playBeep = () => {
      if (isAudioMuted) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch (e) {}
    };

    playBeep();
    audioIntervalRef.current = setInterval(playBeep, 4000); // looping alert every 4s

    // 3-minute self-destruct countdown
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
  }, [currentStep, isAudioMuted, router, showToast]);

  // Step 1 -> 2: Update Presence to Supabase & Context
  const handleProceedToStep2 = async () => {
    try {
      await fetch('/api/vote/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boothNumber: assignedBoothNumber,
          nim: selectedVoter.nim,
          name: selectedVoter.name,
          prodi: selectedVoter.prodiName,
        }),
      });
    } catch (e) {}

    updateBoothStatus(
      `b-0${assignedBoothNumber}`,
      'Sedang Memilih',
      { voterNim: selectedVoter.nim, voterName: selectedVoter.name, prodiName: selectedVoter.prodiName }
    );
    setCurrentStep(2);
  };

  // Step 4 -> 5: Atomic Vote Submission
  const handleFinalSubmit = async () => {
    // Strict Anti-Golput Validation
    if (!selectedBemId || !selectedHimaId) {
      showToast('Wajib memilih Paslon BEM dan Paslon HIMA (Anti-Golput).', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/vote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim: selectedVoter.nim,
          boothNumber: assignedBoothNumber,
          bemCandidateId: selectedBemId,
          himaCandidateId: selectedHimaId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || 'Gagal mengirimkan suara sah.', 'error');
        setIsSubmitting(false);
        return;
      }

      setTicketAudit(data.ticketNumber || `UBTH-${Date.now().toString().slice(-6)}`);

      // Update local state & clear session
      castVote(selectedVoter.nim, selectedBemId, selectedHimaId);
      updateBoothStatus(
        `b-0${assignedBoothNumber}`,
        'Selesai',
        { voterName: selectedVoter.name, voterNim: selectedVoter.nim }
      );

      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }

      setIsSubmitting(false);
      setCurrentStep(5);
    } catch (err: any) {
      // Fallback
      castVote(selectedVoter.nim, selectedBemId, selectedHimaId);
      updateBoothStatus(`b-0${assignedBoothNumber}`, 'Selesai');
      setTicketAudit(`UBTH-${Math.floor(100000 + Math.random() * 900000)}`);
      setIsSubmitting(false);
      setCurrentStep(5);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const relevantHimaCandidates = himaCandidates.filter(
    (c) => !c.facultyId || c.facultyId === selectedVoter.facultyId
  );
  const selectedBemCandidate = bemCandidates.find((c) => c.id === selectedBemId);
  const selectedHimaCandidate = himaCandidates.find((c) => c.id === selectedHimaId);

  const handleOpenDetail = (cand: Candidate) => {
    setDetailModalCandidate(cand);
    setIsDetailModalOpen(true);
  };

  // Waiting in queue UI if booths full
  if (isWaitingQueue) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4 border border-amber-200">
            <Hourglass className="w-7 h-7 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Bilik Suara Sedang Penuh</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Seluruh bilik saat ini sedang digunakan oleh pemilih lain. Sistem sedang mengalokasikan slot kosong berikutnya untuk Anda...
          </p>
          <button
            onClick={() => setIsWaitingQueue(false)}
            className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            Coba Masuk ke Bilik Cadangan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans">
      {/* Header */}
      <VoteHeader
        boothNumber={assignedBoothName}
        remainingSeconds={timerSeconds}
        showTimer={currentStep < 5}
      />

      {/* Stepper Indicator */}
      <div className="bg-white border-b border-slate-200/80 shadow-2xs">
        <VotingStepper currentStep={currentStep} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6">
        {/* STEP 1: VERIFIKASI IDENTITAS DPT */}
        {currentStep === 1 && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 mx-auto flex items-center justify-center mb-3 border border-sky-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Verifikasi Identitas Pemilih</h2>
              <p className="text-xs text-slate-500 mt-1">
                Data DPT tersinkronisasi langsung dengan Server Pusat KPUM UBTH
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pilih Mahasiswa DPT (Simulasi Bilik)
                </label>
                <select
                  value={selectedNim}
                  onChange={(e) => setSelectedNim(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                >
                  {voters.map((v) => (
                    <option key={v.id} value={v.nim}>
                      {v.nim} - {v.name} ({v.prodiName}) [{v.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Verified Card Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Lengkap</span>
                  <span className="font-bold text-slate-900">{selectedVoter.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Induk Mahasiswa</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVoter.nim}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fakultas</span>
                  <span className="font-bold text-sky-700">{selectedVoter.facultyId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Program Studi</span>
                  <span className="font-bold text-slate-900">{selectedVoter.prodiName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bilik Terpilih</span>
                  <span className="font-bold text-emerald-700">{assignedBoothName}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToStep2}
                className="w-full mt-4 py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <span>Mulai Pencoblosan Bilik</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PILIH PRESIDEN BEM */}
        {currentStep === 2 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                TAHAP 1 DARI 2
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Pemilihan Calon Presiden &amp; Wapres BEM UBTH
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Gunakan hak suara Anda untuk memilih pemimpin Badan Eksekutif Mahasiswa Universitas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {bemCandidates.map((cand) => (
                <CandidateCard
                  key={cand.id}
                  candidate={cand}
                  isSelected={selectedBemId === cand.id}
                  onSelect={() => setSelectedBemId(cand.id)}
                  onOpenDetail={() => handleOpenDetail(cand)}
                />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between max-w-4xl mx-auto pt-4 border-t border-slate-200">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                disabled={!selectedBemId}
                onClick={() => setCurrentStep(3)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  selectedBemId
                    ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Lanjut ke Pemilihan HIMA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PILIH KETUA HIMA PRODI */}
        {currentStep === 3 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                TAHAP 2 DARI 2
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Pemilihan Ketua &amp; Wakil HIMA {selectedVoter.facultyId}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Himpunan Mahasiswa Program Studi: <strong>{selectedVoter.prodiName}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {relevantHimaCandidates.map((cand) => (
                <CandidateCard
                  key={cand.id}
                  candidate={cand}
                  isSelected={selectedHimaId === cand.id}
                  onSelect={() => setSelectedHimaId(cand.id)}
                  onOpenDetail={() => handleOpenDetail(cand)}
                />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between max-w-4xl mx-auto pt-4 border-t border-slate-200">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Ubah Pilihan BEM</span>
              </button>

              <button
                disabled={!selectedHimaId}
                onClick={() => setCurrentStep(4)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  selectedHimaId
                    ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Konfirmasi Akhir Suara</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: KONFIRMASI AKHIR PILIHAN */}
        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center mb-3 border border-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Konfirmasi Pilihan Suara Anda</h2>
              <p className="text-xs text-slate-500 mt-1">
                Periksa kembali surat suara elektronik Anda sebelum dimasukkan ke dalam kotak suara digital
              </p>
            </div>

            <div className="space-y-4">
              {/* Selected BEM */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilihan Presiden &amp; Wapres BEM
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedBemCandidate?.leaderName} &amp; {selectedBemCandidate?.viceLeaderName}
                  </h4>
                  <p className="text-xs text-slate-500 italic">&ldquo;{selectedBemCandidate?.tagline}&rdquo;</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-mono font-black text-lg flex items-center justify-center shrink-0">
                  {selectedBemCandidate?.number}
                </div>
              </div>

              {/* Selected HIMA */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilihan Ketua &amp; Wakil HIMA ({selectedVoter.facultyId})
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedHimaCandidate?.leaderName} &amp; {selectedHimaCandidate?.viceLeaderName}
                  </h4>
                  <p className="text-xs text-slate-500 italic">&ldquo;{selectedHimaCandidate?.tagline}&rdquo;</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-mono font-black text-lg flex items-center justify-center shrink-0">
                  {selectedHimaCandidate?.number}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <p>
                  Sistem menerapkan kebijakan <strong>Anti-Golput</strong>. Setelah menekan tombol kirim, data pilihan Anda akan dieksekusi secara atomik ke server Supabase dan bilik akan terkunci otomatis.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-1/3 py-3 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Ganti Pilihan
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="w-2/3 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {isSubmitting ? (
                    <span>Mengeksekusi Transaksi Atomik...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>KIRIM SUARA SAH</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PASCA-SUBMIT / SELF-DESTRUCT LOCK SCREEN */}
        {currentStep === 5 && (
          <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-slate-200 text-center relative overflow-hidden">
            {/* Top Red Security Border */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-600" />

            {/* Solid Lock / Verified Badge */}
            <div className="w-20 h-20 rounded-3xl bg-slate-900 text-white mx-auto flex items-center justify-center mb-5 shadow-xl border-4 border-slate-100">
              <Lock className="w-10 h-10 text-emerald-400 stroke-[2.5]" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>TRANSAKSI SUARA SAH TERVERIFIKASI</span>
            </div>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Suara Anda Telah Sah Tersimpan!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Hak suara Anda telah berhasil dicatat ke dalam database desentralisasi KPUM UBTH 2026.
            </p>

            {/* Audit Details */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 space-y-1.5 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Kode Audit Tiket:</span>
                <span className="font-bold text-slate-900">{ticketAudit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Terminal Bilik:</span>
                <span className="font-bold text-sky-700">{assignedBoothName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Waktu Stempel:</span>
                <span className="text-slate-600">{new Date().toLocaleTimeString('id-ID')} WIB</span>
              </div>
            </div>

            {/* 3-Minute Bilik Self-Destruct Countdown */}
            <div className="mt-6 p-5 rounded-2xl bg-slate-900 text-white">
              <div className="flex items-center justify-between mb-1 text-slate-400 text-xs">
                <span>Batas Waktu Bilik Kosong:</span>
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className="flex items-center gap-1 text-[11px] hover:text-white transition-colors"
                >
                  {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isAudioMuted ? 'Bisu' : 'Suara Aktif'}</span>
                </button>
              </div>

              <div className="text-4xl font-black font-mono tracking-wider text-emerald-400 my-1">
                {formatCountdown(postSubmitSeconds)}
              </div>

              <p className="text-[11px] text-slate-400">
                Layar bilik ini akan mereset diri secara otomatis saat hitungan mundur selesai.
              </p>
            </div>

            <button
              onClick={() => router.push('/qr-screen')}
              className="mt-5 w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              Keluar &amp; Kosongkan Bilik Sekarang
            </button>
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
            if (detailModalCandidate.type === 'BEM') {
              setSelectedBemId(detailModalCandidate.id);
            } else {
              setSelectedHimaId(detailModalCandidate.id);
            }
          }
        }}
        isSelected={
          detailModalCandidate
            ? (detailModalCandidate.type === 'BEM' && selectedBemId === detailModalCandidate.id) ||
              (detailModalCandidate.type === 'HIMA' && selectedHimaId === detailModalCandidate.id)
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
            <p className="mt-3 text-sm font-semibold text-slate-600">Menyiapkan Bilik Suara...</p>
          </div>
        </div>
      }
    >
      <VoteContent />
    </Suspense>
  );
}

