'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Candidate, BEM_CANDIDATES, HIMA_CANDIDATES } from '@/data/voteMockData';
import VisiMisiModal from '@/components/vote/VisiMisiModal';
import { createClient, supabase } from '@/lib/supabase/client';
import {
  Check,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Volume2,
  Clock,
  Eye,
  User,
  Monitor,
  Info,
  AlertCircle,
  GraduationCap,
  BookOpen,
} from 'lucide-react';

const MASTER_PRODI = [
  'S1 Farmasi',
  'Pendidikan Profesi Apoteker',
  'S1 Rekayasa Kosmetika',
  'S2 Farmasi',
  'S1 Keperawatan',
  'D3 Keperawatan',
  'Pendidikan Profesi Ners',
  'S1 Administrasi Rumah Sakit',
  'D3 Teknologi Laboratorium Medis',
  'D3 Optometri',
  'S1 Gizi',
  'S1 Sistem Informasi',
  'S1 Bisnis Digital',
  'S1 Kewirausahaan',
];

function VoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const [assignedBooth, setAssignedBooth] = useState<any>(null);
  const [assignedBoothName, setAssignedBoothName] = useState<string>('Bilik 01');
  const [assignedBoothNumber, setAssignedBoothNumber] = useState<number>(1);
  const [assignedBoothId, setAssignedBoothId] = useState<string>('');

  const [isWaitingQueue, setIsWaitingQueue] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Arahan Bilik, 2: DPT, 3: Surat Suara, 4: Modal, 5: Selesai
  const [electionStatus, setElectionStatus] = useState<'AKTIF' | 'JEDA' | 'TUTUP'>('AKTIF');

  // Candidate Data
  const [dbCandidatesLoaded, setDbCandidatesLoaded] = useState<boolean>(false);
  const [dbBemCandidates, setDbBemCandidates] = useState<Candidate[]>([]);
  const [dbHimaCandidates, setDbHimaCandidates] = useState<Candidate[]>([]);

  // Form State (Hanya NIM, Nama, Prodi - Angkatan Dihapus Sesuai Revisi)
  const [inputNim, setInputNim] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [inputProdi, setInputProdi] = useState<string>('');
  const [detectedVoter, setDetectedVoter] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Selections
  const [selectedBemId, setSelectedBemId] = useState<string>('');
  const [selectedHimaId, setSelectedHimaId] = useState<string>('');

  // Modals
  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isJedaModalDismissed, setIsJedaModalDismissed] = useState(false);

  // Timers & Audio
  const [timerSeconds, setTimerSeconds] = useState(180); // 03:00 sesi bilik
  const [startVoteAt, setStartVoteAt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postSubmitSeconds, setPostSubmitSeconds] = useState(60); // 60 detik (1 menit) countdown apresiasi
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // 0. Polling Status Pemilihan
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
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Helper Penguncian Bilik Otomatis
  const assignAndLockBooth = useCallback(async (booth: any, token: string | null) => {
    try {
      const bNum = Number(booth.booth_number) || 1;
      setAssignedBooth(booth);
      setAssignedBoothId(booth.id || '');
      setAssignedBoothNumber(bNum);
      setAssignedBoothName(booth.name || `Bilik ${String(bNum).padStart(2, '0')}`);
      setIsWaitingQueue(false);

      // Kunci bilik di Supabase
      await supabase
        .from('booths')
        .update({
          status: 'OCCUPIED',
          session_token: token || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booth.id);

      if (typeof window !== 'undefined') {
        localStorage.setItem('pemira_booth', String(bNum));
      }
    } catch (lockErr) {
      console.warn('Gagal mengunci bilik:', lockErr);
    }
  }, []);

  // 1. Initial Session Check & Auto-Booth Allocation
  useEffect(() => {
    setMounted(true);
    let isCancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        // Ambil token dari query atau sessionStorage
        const urlToken =
          searchParams?.get('session') ||
          searchParams?.get('token') ||
          searchParams?.get('session_token') ||
          null;

        let storedToken: string | null = null;
        let isAlreadyCompleted = false;

        if (typeof window !== 'undefined') {
          isAlreadyCompleted = sessionStorage.getItem('pemira_session_completed') === 'true';
          storedToken = sessionStorage.getItem('pemira_session_token');

          if (urlToken) {
            sessionStorage.setItem('pemira_session_token', urlToken);
            storedToken = urlToken;
          }
        }

        // Cegah akses ulang jika pemilih sudah menyelesaikan pemilihan
        if (isAlreadyCompleted) {
          setIsSessionExpired(true);
          setLoading(false);
          return;
        }

        // Guard: Jika tidak ada token resmi dari QR meja registrasi
        if (!urlToken && !storedToken) {
          setIsAccessDenied(true);
          setLoading(false);
          return;
        }

        // Load Kandidat dari Supabase
        try {
          const { data: dbData } = await supabase.from('candidates').select('*');
          if (Array.isArray(dbData) && dbData.length > 0) {
            const bem = dbData.filter((c: any) => c.type === 'BEM' || c.category === 'BEM');
            const hima = dbData.filter((c: any) => c.type === 'HIMA' || c.category === 'HIMA');
            setDbBemCandidates(bem);
            setDbHimaCandidates(hima);
            setDbCandidatesLoaded(true);
          }
        } catch (candErr) {
          console.warn('Kandidat fallback note:', candErr);
        }

        // Cari bilik yang berstatus 'AVAILABLE' (diurutkan berdasarkan booth_number asc)
        const { data: availableBooths, error: boothErr } = await supabase
          .from('booths')
          .select('*')
          .or('status.eq.AVAILABLE,status.eq.TERSEDIA,status.eq.KOSONG')
          .order('booth_number', { ascending: true });

        if (boothErr) {
          console.warn('Error fetching booths:', boothErr);
        }

        if (availableBooths && availableBooths.length > 0) {
          // ADA BILIK KOSONG -> Alokasikan bilik terdepan
          const target = availableBooths[0];
          await assignAndLockBooth(target, urlToken || storedToken);
        } else {
          // SEMUA BILIK PENUH -> Masuk antrean otomatis
          setIsWaitingQueue(true);
        }
      } catch (err) {
        console.error('Inisialisasi sesi error:', err);
        setIsWaitingQueue(true);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    init();

    return () => {
      isCancelled = true;
    };
  }, [searchParams, assignAndLockBooth]);

  // 2. Realtime Listener Antrean Bilik Kosong (Supabase Channel)
  useEffect(() => {
    if (!isWaitingQueue) return;

    const channel = supabase
      .channel('booth-queue')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'booths' },
        (payload: any) => {
          const newStatus = (payload?.new?.status || '').toUpperCase();
          if (newStatus === 'AVAILABLE' || newStatus === 'TERSEDIA' || newStatus === 'KOSONG') {
            const token = typeof window !== 'undefined' ? sessionStorage.getItem('pemira_session_token') : null;
            assignAndLockBooth(payload.new, token);
            showToast(`Bilik 0${payload.new.booth_number} telah tersedia untuk Anda!`, 'success');
          }
        }
      )
      .subscribe();

    // Fallback polling setiap 3 detik jika realtime terkendala
    const pollInterval = setInterval(async () => {
      try {
        const { data: booths } = await supabase
          .from('booths')
          .select('*')
          .or('status.eq.AVAILABLE,status.eq.TERSEDIA,status.eq.KOSONG')
          .order('booth_number', { ascending: true })
          .limit(1);

        if (booths && booths.length > 0) {
          const token = typeof window !== 'undefined' ? sessionStorage.getItem('pemira_session_token') : null;
          assignAndLockBooth(booths[0], token);
          showToast(`Bilik 0${booths[0].booth_number} telah tersedia untuk Anda!`, 'success');
        }
      } catch {}
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [isWaitingQueue, assignAndLockBooth, showToast]);

  // 3. Penanganan Waktu Sesi Habis (Reset DPT ke "BELUM" & Pengosongan Bilik - Tanpa Redirect ke /qr-screen)
  const handleSessionTimeout = useCallback(async () => {
    try {
      // 1. KEMBALIKAN status DPT pemilih ke "BELUM" jika belum pernah submit
      const currentVoterNim = detectedVoter?.nim || inputNim.trim();
      if (currentVoterNim) {
        await supabase
          .from('voters')
          .update({
            voting_status: 'BELUM',
            has_voted: false,
          })
          .eq('nim', currentVoterNim)
          .eq('has_voted', false); // Hanya rollback jika belum submit sah
      }

      // 2. Kosongkan kembali bilik fisik di Supabase
      if (assignedBoothId || assignedBooth?.id || assignedBoothNumber) {
        await supabase
          .from('booths')
          .update({
            status: 'AVAILABLE',
            current_voter_name: null,
            current_voter_nim: null,
            current_voter_prodi: null,
            voter_name: null,
            voter_nim: null,
            voter_prodi: null,
            session_token: null,
            started_at: null,
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${assignedBoothId || assignedBooth?.id || '0'},booth_number.eq.${assignedBoothNumber || 1}`);
      }

      // Hanguskan token di penyimpanan perangkat pemilih
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        localStorage.removeItem('pemira_voter_session');
        localStorage.removeItem('pemira_session_token');
      }

      // Pindahkan state ke Layar Sesi Berakhir (DEAD-END SCREEN MERAH)
      setIsSessionExpired(true);
    } catch (err) {
      console.error('Error saat timeout:', err);
      setIsSessionExpired(true);
    }
  }, [assignedBoothId, assignedBooth, assignedBoothNumber, detectedVoter, inputNim]);

  // Timer Countdown Sesi Bilik (Langkah 2 - 4)
  useEffect(() => {
    if (currentStep < 2 || currentStep >= 5 || isSessionExpired) return;

    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSessionTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStep, isSessionExpired, handleSessionTimeout]);

  // 4. Audio Ucapan Terima Kasih Resmi (Loop 60 Detik di Langkah 5)
  const playThankYouAudio = useCallback(() => {
    if (isAudioMuted || typeof window === 'undefined') return;

    // A. Web Audio Harmonic Chime
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const frequencies = [523.25, 659.25, 783.99, 1046.50];
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 1.25);
        });
      }
    } catch (audioErr) {
      console.warn('Web Audio note:', audioErr);
    }

    // B. SpeechSynthesis Bahasa Indonesia
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const speechText =
          'Terima kasih atas partisipasi Anda dalam Pemilihan Raya Mahasiswa Universitas Bakti Tunas Husada 2026. Suara Anda telah berhasil direkapitulasi secara sah, aman, dan rahasia. Silakan meninggalkan bilik suara.';
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'id-ID';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find((v) => v.lang.startsWith('id'));
        if (idVoice) utterance.voice = idVoice;

        window.speechSynthesis.speak(utterance);
      }
    } catch (speechErr) {
      console.warn('SpeechSynthesis note:', speechErr);
    }
  }, [isAudioMuted]);

  // Efek Countdown Pasca-Submit (Langkah 5)
  useEffect(() => {
    if (currentStep !== 5) return;

    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', window.location.href);
      } catch {}

      const handlePopState = () => {
        try {
          window.history.pushState(null, '', window.location.href);
        } catch {}
      };

      window.addEventListener('popstate', handlePopState);
      playThankYouAudio();

      const audioLoop = setInterval(() => {
        playThankYouAudio();
      }, 20000);

      const countdown = setInterval(() => {
        setPostSubmitSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            clearInterval(audioLoop);
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            // Selesai countdown 1 menit -> Kunci total perangkat
            sessionStorage.clear();
            localStorage.removeItem('pemira_voter_session');
            localStorage.removeItem('pemira_session_token');
            setIsSessionExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        clearInterval(countdown);
        clearInterval(audioLoop);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [currentStep, playThankYouAudio]);

  // TAHAP 1 -> TAHAP 2: Tombol Tunggal "Saya Sudah Berada di Bilik"
  const handleArrivedAtBooth = async () => {
    try {
      if (assignedBoothId) {
        await supabase
          .from('booths')
          .update({
            status: 'OCCUPIED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', assignedBoothId);
      }
    } catch (e) {
      console.warn('Update booth note:', e);
    }
    setCurrentStep(2);
  };

  // TAHAP 2: VALIDASI KETAT DPT (HANYA NIM, NAMA, PRODI - ANGKATAN DIHAPUS)
  const handleVerifyDPT = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanNim = inputNim.trim();
    const cleanName = inputName.trim();
    const selectedProdi = inputProdi.trim();

    if (!cleanNim) {
      setVerifyError('Silakan masukkan NIM Anda.');
      return;
    }
    if (!cleanName) {
      setVerifyError('Silakan masukkan Nama Lengkap Anda sesuai DPT.');
      return;
    }
    if (!selectedProdi) {
      setVerifyError('Silakan pilih Program Studi Anda.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      // 1. Query langsung ke tabel 'voters' Supabase
      const { data: voter, error } = await supabase
        .from('voters')
        .select('*')
        .eq('nim', cleanNim)
        .maybeSingle();

      if (error) {
        console.error('Error fetching voter:', error);
      }

      // * Jika voter tidak ditemukan:
      if (!voter) {
        setIsVerifying(false);
        setVerifyError('NIM tidak terdaftar di DPT Pemira UBTH 2026!');
        return;
      }

      // * Jika voter.has_voted === true:
      const isVoted =
        voter.has_voted === true ||
        String(voter.voting_status || '').toUpperCase() === 'SUDAH' ||
        String(voter.voting_status || '').toUpperCase() === 'SELESAI';

      if (isVoted) {
        setIsVerifying(false);
        setVerifyError('Hak suara untuk NIM ini sudah digunakan!');
        return;
      }

      // * Validasi Nama (case-insensitive & kemiripan):
      const normInputName = cleanName.toLowerCase().replace(/\s+/g, ' ');
      const normDbName = String(voter.name || voter.nama || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (normInputName !== normDbName && !normDbName.includes(normInputName) && !normInputName.includes(normDbName)) {
        setIsVerifying(false);
        setVerifyError('Nama lengkap tidak sesuai dengan data DPT!');
        return;
      }

      // * Validasi Prodi (Cocokkan pilihan dropdown pemilih dengan kolom voter.prodi / voter.prodi_name):
      const normSelectedProdi = selectedProdi.toLowerCase().replace(/\s+/g, '');
      const normDbProdi = String(voter.prodi || voter.prodi_name || '').trim().toLowerCase().replace(/\s+/g, '');
      if (
        normSelectedProdi !== normDbProdi &&
        !normDbProdi.includes(normSelectedProdi) &&
        !normSelectedProdi.includes(normDbProdi)
      ) {
        setIsVerifying(false);
        setVerifyError('Program studi yang Anda pilih tidak sesuai dengan data DPT Anda!');
        return;
      }

      // * Jika lolos semua validasi:
      const nowIso = new Date().toISOString();
      setStartVoteAt(nowIso);
      setDetectedVoter(voter);

      // Update 'voters': set voting_status = 'SEDANG_MEMILIH'
      await supabase
        .from('voters')
        .update({
          voting_status: 'SEDANG_MEMILIH',
          start_vote_at: nowIso,
          updated_at: nowIso,
        })
        .eq('nim', cleanNim);

      // Update 'booths': set status = 'VOTING', current_voter_name, current_voter_nim, current_voter_prodi
      const voterProdiVal = voter.prodi || voter.prodi_name || selectedProdi;
      await supabase
        .from('booths')
        .update({
          status: 'VOTING',
          current_voter_name: voter.name || voter.nama || cleanName,
          current_voter_nim: voter.nim || cleanNim,
          current_voter_prodi: voterProdiVal,
          voter_name: voter.name || voter.nama || cleanName,
          voter_nim: voter.nim || cleanNim,
          voter_prodi: voterProdiVal,
          started_at: nowIso,
          updated_at: nowIso,
        })
        .eq('booth_number', assignedBoothNumber);

      // Catat log aktivitas
      try {
        await supabase.from('activity_logs').insert([
          {
            booth_number: assignedBoothNumber,
            message: `Mahasiswa ${cleanName} (${voterProdiVal}) membuka surat suara`,
            event_type: 'VOTING_STARTED',
            created_at: nowIso,
          },
        ]);
      } catch {}

      // Otomatis pilih paslon pertama jika tersedia
      const bList = dbCandidatesLoaded && dbBemCandidates.length > 0 ? dbBemCandidates : BEM_CANDIDATES;
      if (!selectedBemId && bList.length > 0) {
        setSelectedBemId(String(bList[0].id));
      }

      const hList = dbCandidatesLoaded && dbHimaCandidates.length > 0 ? dbHimaCandidates : HIMA_CANDIDATES;
      const matchedHima = hList.filter(
        (c: any) =>
          (c.category === 'HIMA' || c.type === 'HIMA') &&
          String(c.prodi || '').toLowerCase().replace(/\s+/g, '') === normSelectedProdi
      );
      if (!selectedHimaId && matchedHima.length > 0) {
        setSelectedHimaId(String(matchedHima[0].id));
      }

      setIsVerifying(false);
      setCurrentStep(3); // Lanjut ke TAHAP 3 (Surat Suara)
    } catch (err: any) {
      console.error('Error saat verifikasi DPT:', err);
      setIsVerifying(false);
      setVerifyError('Terjadi kendala jaringan saat memverifikasi DPT. Silakan coba lagi.');
    }
  };

  // TAHAP 3: Buka Modal Konfirmasi Pilihan
  const handleOpenConfirmation = () => {
    if (!selectedBemId) {
      showToast('Silakan pilih salah satu pasangan calon BEM.', 'error');
      return;
    }
    if (matchingHimaCandidates.length > 0 && !selectedHimaId) {
      showToast('Silakan pilih salah satu pasangan calon HIMA untuk program studi Anda.', 'error');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // TAHAP 4 & 5: SUBMIT SUARA, RESET BILIK OTOMATIS, & AUDIO TERIMA KASIH
  const handleFinalConfirmVote = async () => {
    if (!selectedBemId) return;

    setIsSubmitting(true);
    setIsConfirmModalOpen(false);

    const voterNim = detectedVoter?.nim || inputNim.trim();
    const voterName = detectedVoter?.name || inputName.trim() || 'Pemilih';
    const voterProdi = detectedVoter?.prodi || detectedVoter?.prodi_name || inputProdi.trim();
    let durationSeconds = 0;
    if (startVoteAt) {
      durationSeconds = Math.max(1, Math.round((Date.now() - new Date(startVoteAt).getTime()) / 1000));
    }

    try {
      const nowIso = new Date().toISOString();

      // 1. Catat suara ke tabel 'votes' (Secara anonim)
      const votesToInsert: any[] = [];
      if (selectedBemId) {
        votesToInsert.push({
          candidate_id: selectedBemId,
          category: 'BEM',
          type: 'BEM',
          created_at: nowIso,
        });
      }
      if (selectedHimaId && selectedHimaId !== 'none') {
        votesToInsert.push({
          candidate_id: selectedHimaId,
          category: 'HIMA',
          type: 'HIMA',
          prodi: voterProdi,
          created_at: nowIso,
        });
      }

      if (votesToInsert.length > 0) {
        const { error: directVoteErr } = await supabase.from('votes').insert(votesToInsert);
        if (directVoteErr) {
          console.warn('Direct votes insert note, fallback to API:', directVoteErr);
          await fetch('/api/vote/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nim: voterNim,
              name: voterName,
              boothNumber: assignedBoothNumber,
              bemCandidateId: selectedBemId,
              himaCandidateId: selectedHimaId || 'none',
              durationSeconds,
            }),
          });
        }
      }

      // 2. Kunci DPT pemilih menjadi "SUDAH":
      await supabase
        .from('voters')
        .update({
          has_voted: true,
          voting_status: 'SUDAH',
          completed_at: nowIso,
          updated_at: nowIso,
        })
        .eq('nim', voterNim);

      // 3. Kosongkan bilik:
      await supabase
        .from('booths')
        .update({
          status: 'AVAILABLE',
          current_voter_name: null,
          current_voter_nim: null,
          current_voter_prodi: null,
          voter_name: null,
          voter_nim: null,
          voter_prodi: null,
          started_at: null,
          session_token: null,
          updated_at: nowIso,
        })
        .or(`id.eq.${assignedBoothId || assignedBooth?.id || '0'},booth_number.eq.${assignedBoothNumber || 1}`);

      // 4. Hanguskan token di sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pemira_session_token');
        sessionStorage.setItem('pemira_session_completed', 'true');
      }

      // 5. Pindah ke TAHAP 5 (Layar Sukses & Audio Loop 60 Detik)
      setIsSubmitting(false);
      setPostSubmitSeconds(60);
      setCurrentStep(5);
      playThankYouAudio();
    } catch (err: any) {
      console.error('Error fatal submit suara:', err);
      setIsSubmitting(false);
      showToast('Kendala jaringan saat mengirim suara. Silakan coba lagi.', 'error');
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Safe Candidate Lists
  const safeBemList = dbCandidatesLoaded && dbBemCandidates.length > 0 ? dbBemCandidates : BEM_CANDIDATES;
  const safeHimaList = dbCandidatesLoaded && dbHimaCandidates.length > 0 ? dbHimaCandidates : HIMA_CANDIDATES;

  // Filter HIMA Sesuai Prodi Pemilih yang Terverifikasi
  const verifiedProdi = detectedVoter?.prodi || detectedVoter?.prodi_name || inputProdi.trim();
  const normProdi = verifiedProdi.toLowerCase().replace(/\s+/g, '');
  const matchingHimaCandidates = safeHimaList.filter(
    (c: any) =>
      (c.category === 'HIMA' || c.type === 'HIMA') &&
      String(c.prodi || '').toLowerCase().replace(/\s+/g, '') === normProdi
  );

  const selectedBemCandidate = safeBemList.find((c) => String(c?.id) === String(selectedBemId)) || safeBemList[0] || null;
  const selectedHimaCandidate = matchingHimaCandidates.find((c) => String(c?.id) === String(selectedHimaId)) || matchingHimaCandidates[0] || null;

  // Loading State
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans select-none">
        <div className="text-center p-6">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-sm">Menghubungkan ke Bilik Suara...</p>
        </div>
      </div>
    );
  }

  // SCREEN: SESI BILIK HABIS (DEAD-END SCREEN PERMANEN DI HP PEMILIH)
  if (isSessionExpired) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center select-none font-sans">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-red-500/30 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-extrabold text-red-400 mb-3">
            Waktu Sesi Bilik Telah Habis
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Batas waktu sesi Anda di Bilik {assignedBoothNumber || ''} telah berakhir demi menjaga kelancaran antrean pemilihan. Akses bilik ini telah ditutup dan sistem bilik telah dikosongkan.
          </p>

          <div className="bg-slate-900/60 rounded-xl p-4 text-xs text-amber-300 border border-amber-500/20 mb-6">
            Silakan tinggalkan bilik suara dan hubungi petugas KPUM di meja registrasi jika membutuhkan verifikasi ulang.
          </div>

          <button
            onClick={() => {
              window.close();
              window.location.href = 'about:blank';
            }}
            className="w-full py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition text-sm cursor-pointer"
          >
            Keluar dari Sistem Pemira
          </button>
        </div>
      </div>
    );
  }

  // SCREEN: AKSES DITOLAK (DIBUKA TANPA TOKEN RESMI)
  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center select-none font-sans">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-amber-500/30 shadow-2xl space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-amber-400">
            Akses Pemilihan Ditolak
          </h2>
          <p className="text-slate-300 text-xs leading-relaxed">
            Sesi pemilihan bilik suara memerlukan otentikasi token sah. Silakan lakukan scan QR di gerbang registrasi bilik suara untuk memulai.
          </p>
          <button
            onClick={() => {
              window.close();
              window.location.href = 'about:blank';
            }}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition text-xs cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  // SCREEN: ANTREAN BILIK PENUH
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
              Semua Bilik Suara Sedang Terisi
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
              Mohon menunggu sejenak di area tunggu. Layar ini akan otomatis mengarahkan Anda begitu bilik kosong tersedia.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
            <span className="text-xs font-bold text-slate-700 ml-1">Menunggu bilik kosong...</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Sistem secara otomatis tersinkronisasi via Supabase Realtime
          </p>
        </div>
      </div>
    );
  }

  // SCREEN: PEMILIHAN DITUTUP
  if (currentStep !== 5 && electionStatus === 'TUTUP') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center bg-slate-50 font-sans select-none">
        <div className="max-w-md p-8 bg-white rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase">Pemilihan Telah Ditutup</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pemilihan telah resmi ditutup oleh panitia KPUM. Terima kasih atas partisipasi Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-between overflow-x-hidden font-sans text-slate-800 select-none">
      {/* FLOATING TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* JEDA BANNER & MODAL */}
      {electionStatus === 'JEDA' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 sticky top-0 z-30">
          <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
          <span>Pemilihan Sedang Dijeda oleh KPUM. Formulir suara terkunci sementara.</span>
        </div>
      )}

      {/* =========================================================================
          1. HEADER: GANTI TERMINAL DENGAN WATERMARK RESMI
          ========================================================================= */}
      <header className="relative z-20 px-6 sm:px-12 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white shadow-2xs">
        <div className="flex items-center gap-3">
          <img
            src="/candidate/image/logo-pemira.png"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            alt="Logo Pemira"
            className="h-10 w-auto object-contain"
          />
          <div>
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 block leading-tight">
              PEMIRA UBTH 2026
            </span>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
              Universitas Bakti Tunas Husada
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sesi Bilik Timer (Hanya tampil di Tahap 2 - 4) */}
          {currentStep >= 2 && currentStep <= 4 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold font-mono text-xs shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span>Sesi Bilik: {formatTimer(timerSeconds)}</span>
            </div>
          )}

          {/* WATERMARK RESMI SISTEM */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System by Sagit Faturrakhman
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 flex items-center justify-center">
        {/* =========================================================================
            2. TAHAP 1: KUNCI ALOKASI SISTEM (HAPUS PILIH MANUAL) & TOMBOL TUNGGAL
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="w-full max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>ALOKASI BILIK PEMILIH RESMI</span>
            </div>

            <div className="space-y-3 py-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                ARAHAN BILIK SUARA FISIK
              </p>
              <div className="relative py-6 px-6 rounded-3xl bg-linear-to-b from-blue-50/80 to-slate-50 border-2 border-blue-300 shadow-inner">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                  Silakan Segera Menuju <span className="text-blue-600">BILIK {assignedBoothNumber}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
                  Bilik nomor {assignedBoothNumber} telah dikunci sementara khusus untuk sesi Anda.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-left text-xs text-amber-800 space-y-1">
              <strong className="text-amber-900 block font-bold">Petunjuk Pemilih:</strong>
              <p>
                Segera berjalan menuju <strong>Bilik {assignedBoothNumber}</strong>. Setelah Anda berada di depan bilik fisik, tekan tombol di bawah untuk membuka formulir verifikasi DPT.
              </p>
            </div>

            {/* TOMBOL TUNGGAL: [ Saya Sudah Berada di Bilik ] */}
            <button
              onClick={handleArrivedAtBooth}
              className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 cursor-pointer active:scale-95"
            >
              <span>Saya Sudah Berada di Bilik</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            3. TAHAP 2 - 4: VOTING FLOW CONTAINER
            ========================================================================= */}
        {currentStep >= 2 && currentStep !== 5 && (
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Stepper Indikator Vertikal */}
            <div className="hidden md:flex md:col-span-1 flex-col items-center justify-center py-6">
              {[2, 3, 4].map((step, idx) => {
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
                      {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : step - 1}
                    </div>

                    {idx < 2 && (
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

            <div className="md:col-span-11 w-full">
              {/* =========================================================================
                  TAHAP 2: VERIFIKASI DPT (HAPUS ANGKATAN & MASTER 14 PRODI UBTH)
                  ========================================================================= */}
              {currentStep === 2 && (
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl max-w-2xl mx-auto space-y-6 animate-in fade-in">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      TAHAP 2 DARI 4
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Verifikasi Hak Suara DPT
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Masukkan data diri resmi Anda sesuai Daftar Pemilih Tetap (DPT) Universitas Bakti Tunas Husada.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Bilik Aktif
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          Bilik {assignedBoothNumber}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Terkunci Khusus Anda
                    </span>
                  </div>

                  <form onSubmit={handleVerifyDPT} className="space-y-4">
                    {/* 1. NIM (Wajib) */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Nomor Induk Mahasiswa (NIM) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="Contoh: 202601001"
                          value={inputNim}
                          onChange={(e) => {
                            setInputNim(e.target.value);
                            setVerifyError(null);
                          }}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                        />
                      </div>
                    </div>

                    {/* 2. Nama Lengkap Sesuai DPT (Wajib) */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Nama Lengkap (Sesuai DPT) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="Masukkan nama lengkap Anda..."
                          value={inputName}
                          onChange={(e) => {
                            setInputName(e.target.value);
                            setVerifyError(null);
                          }}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                        />
                      </div>
                    </div>

                    {/* 3. Program Studi (Dropdown dari 14 Master Prodi - Wajib) */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Program Studi <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <GraduationCap className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          required
                          value={inputProdi}
                          onChange={(e) => {
                            setInputProdi(e.target.value);
                            setVerifyError(null);
                          }}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer"
                        >
                          <option value="">-- Pilih Salah Satu dari 14 Program Studi --</option>
                          {MASTER_PRODI.map((prodi) => (
                            <option key={prodi} value={prodi}>
                              {prodi}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Alert Error Verifikasi */}
                    {verifyError && (
                      <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-rose-900">Verifikasi Ditolak:</span>
                          <span className="text-rose-700">{verifyError}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                      >
                        ← Kembali ke Panduan Bilik
                      </button>

                      {/* Tombol: [ Verifikasi & Buka Surat Suara ] */}
                      <button
                        type="submit"
                        disabled={isVerifying || !inputNim.trim() || !inputName.trim() || !inputProdi.trim()}
                        className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                          isVerifying || !inputNim.trim() || !inputName.trim() || !inputProdi.trim()
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 cursor-pointer active:scale-95'
                        }`}
                      >
                        {isVerifying ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            <span>Memverifikasi DPT...</span>
                          </>
                        ) : (
                          <>
                            <span>Verifikasi &amp; Buka Surat Suara</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* =========================================================================
                  TAHAP 3: SURAT SUARA (BEM SEMUA + HIMA SPESIFIK PRODI PEMILIH)
                  ========================================================================= */}
              {currentStep === 3 && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-8 animate-in fade-in">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      TAHAP 3 DARI 4
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Surat Suara Digital PEMIRA UBTH 2026
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pemilih Sah: <strong>{detectedVoter?.name || inputName}</strong> ({detectedVoter?.nim || inputNim}) • Prodi: <strong>{verifiedProdi}</strong>
                    </p>
                  </div>

                  {/* SEKSI 1: PEMILIHAN BEM UNIVERSITAS */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          1. Pemilihan Presiden &amp; Wakil Presiden BEM
                        </h4>
                        <p className="text-xs text-slate-500">
                          Seluruh mahasiswa dari semua program studi berhak memilih pasangan calon BEM.
                        </p>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-900 text-white uppercase tracking-wider">
                        BEM-U
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {safeBemList.map((cand) => {
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
                              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                                <div>
                                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide block">
                                    Nomor Urut {displayNumber}
                                  </span>
                                  <h4 className="text-base font-black text-slate-900 mt-0.5">
                                    {displayName} {displayVice ? `& ${displayVice}` : ''}
                                  </h4>
                                  <p className="text-xs text-slate-500 italic mt-0.5">
                                    &ldquo;{cand?.tagline || 'Inovatif, Transparan, dan Berdaya Saing'}&rdquo;
                                  </p>
                                </div>
                                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                  {displayNumber}
                                </div>
                              </div>

                              <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[140px] w-full mx-auto bg-slate-100 flex items-center justify-center relative shadow-xs mb-4">
                                {displayPhoto ? (
                                  <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover" />
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
                  </div>

                  {/* SEKSI 2: PEMILIHAN HIMA SESUAI HAK SUARA PRODI */}
                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          2. Rekomendasi Surat Suara HIMA ({verifiedProdi})
                        </h4>
                        <p className="text-xs text-slate-500">
                          Hanya menampilkan pasangan calon HIMA resmi untuk Program Studi <strong>{verifiedProdi}</strong>.
                        </p>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                        HIMA
                      </span>
                    </div>

                    {matchingHimaCandidates.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-blue-50/60 border border-blue-200 text-center space-y-2">
                        <Info className="w-8 h-8 text-blue-600 mx-auto" />
                        <h5 className="text-sm font-bold text-slate-900">
                          Pemilihan HIMA belum tersedia untuk Program Studi Anda ({verifiedProdi}).
                        </h5>
                        <p className="text-xs text-slate-500">
                          Anda dapat langsung melanjutkan pengiriman surat suara untuk pemilihan Presiden BEM.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {matchingHimaCandidates.map((cand) => {
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
                                  ? 'border-blue-600 bg-blue-50/40 ring-4 ring-blue-600/10 shadow-lg'
                                  : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                                  <div>
                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide block">
                                      Nomor Urut {displayNumber}: Paslon HIMA
                                    </span>
                                    <h4 className="text-base font-black text-slate-900 mt-0.5">
                                      {displayName} {displayVice ? `& ${displayVice}` : ''}
                                    </h4>
                                    <p className="text-xs text-slate-500 italic mt-0.5">
                                      &ldquo;{cand?.tagline || 'Sinergi dan Prestasi untuk Program Studi'}&rdquo;
                                    </p>
                                  </div>
                                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                    {displayNumber}
                                  </div>
                                </div>

                                <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[140px] w-full mx-auto bg-slate-100 flex items-center justify-center relative shadow-xs mb-4">
                                  {displayPhoto ? (
                                    <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover" />
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

                              <div className="mt-5">
                                {isSelected ? (
                                  <div className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-full shadow-md flex items-center justify-center gap-2 text-xs">
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    <span>Terpilih sebagai Pilihan Anda</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => cand?.id && setSelectedHimaId(String(cand.id))}
                                    className="w-full bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-600 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-full text-xs transition-colors cursor-pointer"
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
                  </div>

                  {/* Tombol Aksi Bawah */}
                  <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      ← Ubah Data Pemilih
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenConfirmation}
                      disabled={!selectedBemId || (matchingHimaCandidates.length > 0 && !selectedHimaId)}
                      className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <span>Kirim Pilihan Suara</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            5. TAHAP 5: LAYAR SUKSES + AUDIO TERIMA KASIH (LOOP 1 MENIT)
            ========================================================================= */}
        {currentStep === 5 && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-2xl max-w-lg mx-auto text-center space-y-6 animate-in fade-in zoom-in-95">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
              <div className="w-24 h-24 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30">
                <Check className="w-12 h-12 stroke-[3]" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Hak Suara Anda Berhasil Digunakan!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                Terima Kasih Telah Berpartisipasi dalam PEMIRA UBTH 2026. Suara Anda telah berhasil direkapitulasi secara sah, aman, dan rahasia.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-700 animate-pulse" />
                <span className="font-bold">Audio Apresiasi Aktif</span>
              </div>
              <button
                type="button"
                onClick={playThankYouAudio}
                className="px-3 py-1 rounded-xl bg-white border border-emerald-300 font-bold hover:bg-emerald-100 transition-colors cursor-pointer text-[11px]"
              >
                Putar Ulang
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 block font-medium">Silakan meninggalkan bilik suara dalam waktu:</span>
              <div className="text-4xl font-black text-slate-900 font-mono tracking-tight pt-1 flex items-center justify-center gap-2">
                <Clock className="w-7 h-7 text-slate-700" />
                <span>{formatTimer(postSubmitSeconds)}</span>
              </div>
              <span className="text-[10px] text-slate-400 block pt-1">
                Bilik otomatis dikosongkan dan dialokasikan untuk pemilih berikutnya.
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                sessionStorage.clear();
                localStorage.removeItem('pemira_voter_session');
                localStorage.removeItem('pemira_session_token');
                window.close();
                window.location.href = 'about:blank';
              }}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md active:scale-95"
            >
              Keluar dari Sistem Pemira
            </button>
          </div>
        )}
      </main>

      {/* MODAL KONFIRMASI PILIHAN SUARA */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200 shadow-xs">
              <ShieldCheck className="w-8 h-8 text-amber-600" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Konfirmasi Pilihan Suara
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                Apakah Anda yakin dengan pilihan Anda? Pilihan yang sudah dikirim tidak dapat diubah kembali.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Pilihan BEM-U:</span>
                <span className="font-bold text-slate-900 font-mono">
                  Paslon {selectedBemCandidate?.candidate_number ?? selectedBemCandidate?.candidateNumber ?? selectedBemCandidate?.number ?? '01'} ({selectedBemCandidate?.leader_name || selectedBemCandidate?.leaderName || '-'})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 font-semibold">Pilihan HIMA:</span>
                {matchingHimaCandidates.length === 0 ? (
                  <span className="font-bold text-slate-500 italic">Dilewati (Tidak ada paslon)</span>
                ) : (
                  <span className="font-bold text-slate-900 font-mono">
                    Paslon {selectedHimaCandidate?.candidate_number ?? selectedHimaCandidate?.candidateNumber ?? selectedHimaCandidate?.number ?? '01'} ({selectedHimaCandidate?.leader_name || selectedHimaCandidate?.leaderName || '-'})
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="w-1/2 py-3 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalConfirmVote}
                className="w-1/2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/15 transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Merekam Suara...' : 'Ya, Kirim Suara Sah'}
              </button>
            </div>
          </div>
        </div>
      )}

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

// Suspense Boundary Wrapper untuk Next.js 14
export default function VotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
          <div className="text-center p-6">
            <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium text-sm">Memuat Sesi Pemilihan...</p>
          </div>
        </div>
      }
    >
      <VoteContent />
    </Suspense>
  );
}
