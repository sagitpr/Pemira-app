'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { FACULTIES_DATA, Candidate } from '@/data/voteMockData';
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
  User,
  GraduationCap,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function VotingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boothParam = searchParams.get('booth') || 'Bilik 01';

  const {
    voters,
    bemCandidates,
    himaCandidates,
    castVote,
    updateBoothStatus,
    showToast,
  } = useAdmin();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedNim, setSelectedNim] = useState<string>('24030112'); // default Dimas (S1 Farmasi)
  const [selectedVoter, setSelectedVoter] = useState(voters.find((v) => v.nim === '24030112') || voters[0]);

  const [selectedBemId, setSelectedBemId] = useState<string>('');
  const [selectedHimaId, setSelectedHimaId] = useState<string>('');

  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [timerSeconds, setTimerSeconds] = useState(180);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finishCountdown, setFinishCountdown] = useState(8);

  // Sync selected voter info
  useEffect(() => {
    const voter = voters.find((v) => v.nim === selectedNim);
    if (voter) {
      setSelectedVoter(voter);
    }
  }, [selectedNim, voters]);

  // Session timer
  useEffect(() => {
    if (currentStep >= 5) return;
    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          showToast('Waktu sesi habis. Bilik dikembalikan ke awal.', 'warning');
          router.push('/qr-screen');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep, router, showToast]);

  // Step 5 auto-logout countdown
  useEffect(() => {
    if (currentStep === 5) {
      const exitTimer = setInterval(() => {
        setFinishCountdown((prev) => {
          if (prev <= 1) {
            router.push('/qr-screen');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(exitTimer);
    }
  }, [currentStep, router]);

  // Filter HIMA candidates by voter's faculty
  const relevantHimaCandidates = himaCandidates.filter(
    (c) => !c.facultyId || c.facultyId === selectedVoter.facultyId
  );

  const selectedBemCandidate = bemCandidates.find((c) => c.id === selectedBemId);
  const selectedHimaCandidate = himaCandidates.find((c) => c.id === selectedHimaId);

  const handleOpenDetail = (cand: Candidate) => {
    setDetailModalCandidate(cand);
    setIsDetailModalOpen(true);
  };

  const handleFinalSubmit = () => {
    if (!selectedBemId || !selectedHimaId) {
      showToast('Harap pastikan Anda telah memilih Presiden BEM dan Ketua HIMA.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      castVote(selectedVoter.nim, selectedBemId, selectedHimaId);
      updateBoothStatus(
        boothParam.toLowerCase().replace(' ', '-'),
        'Selesai',
        { voterName: selectedVoter.name, voterNim: selectedVoter.nim }
      );
      setIsSubmitting(false);
      setCurrentStep(5);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans">
      {/* Header */}
      <VoteHeader
        boothNumber={boothParam}
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
                Data DPT tersinkronisasi dengan portal akademik UBTH 2026
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
                  <span className="text-slate-500">Status Hak Suara</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      selectedVoter.status === 'belum'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedVoter.status === 'memilih'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedVoter.status === 'selesai' ? 'Sudah Pernah Memilih' : 'Hak Suara Aktif'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  updateBoothStatus(
                    boothParam.toLowerCase().replace(' ', '-'),
                    'Sedang Memilih',
                    { voterNim: selectedVoter.nim, voterName: selectedVoter.name, prodiName: selectedVoter.prodiName }
                  );
                  setCurrentStep(2);
                }}
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

            {/* Bottom Step Actions */}
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

            {/* Bottom Step Actions */}
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

              {/* Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <p>
                  Setelah menekan tombol <strong>&ldquo;Kirim Suara Sah&rdquo;</strong>, pilihan Anda akan dienkripsi secara anonim dan langsung dicatat ke server rekapitulasi KPUM. Pilihan tidak dapat diubah kembali.
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
                    <span>Mengenkripsi &amp; Menyimpan...</span>
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

        {/* STEP 5: SELESAI (NO CONFETTI) */}
        {currentStep === 5 && (
          <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <h2 className="text-2xl font-black text-slate-900">Suara Anda Telah Sah Tercatat!</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
              Terima kasih telah berpartisipasi dalam Pemilihan Mahasiswa Raya Universitas Bakti Tunas Husada 2026.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <p>Nomor Tiket Audit: <strong>UBTH-{Math.floor(100000 + Math.random() * 900000)}</strong></p>
              <p>Waktu Pencoblosan: <strong>{new Date().toLocaleTimeString('id-ID')} WIB</strong></p>
            </div>

            <div className="mt-6">
              <p className="text-xs text-slate-500">
                Layar bilik ini akan otomatis keluar dalam{' '}
                <strong className="text-slate-900 font-mono text-sm">{finishCountdown} detik</strong>
              </p>
              <button
                onClick={() => router.push('/qr-screen')}
                className="mt-3 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                Selesai &amp; Buka Bilik untuk Pemilih Berikutnya
              </button>
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
