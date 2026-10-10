'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { Candidate } from '@/data/voteMockData';
import AppLogo from '@/components/common/AppLogo';
import VisiMisiModal from '@/components/vote/VisiMisiModal';
import { createClient, supabase } from '@/lib/supabase/client';

const MASTER_PRODI = [
  'Informatika',
  'Sistem Informasi',
  'Teknologi Informasi',
  'Teknik Industri',
  'Teknik Elektro',
  'Teknik Sipil',
  'Arsitektur',
  'Manajemen',
  'Akuntansi',
  'Ilmu Komunikasi',
  'Desain Komunikasi Visual',
  'Hukum',
  'Kewirausahaan',
  'Bioteknologi',
];
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
  AlertCircle,
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
  const [assignedBoothName, setAssignedBoothName] = useState<string>('Bilik 01');
  const [assignedBoothNumber, setAssignedBoothNumber] = useState<number>(1);
  const [assignedBoothId, setAssignedBoothId] = useState<string>('');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(false);
  const [isWaitingQueue, setIsWaitingQueue] = useState<boolean>(false);
  const [startVoteAt, setStartVoteAt] = useState<string>('');
  const [dbCandidatesLoaded, setDbCandidatesLoaded] = useState<boolean>(false);
  const [dbBemCandidates, setDbBemCandidates] = useState<Candidate[]>([]);
  const [dbHimaCandidates, setDbHimaCandidates] = useState<Candidate[]>([]);

  // Form State
  const [inputNim, setInputNim] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [inputProdi, setInputProdi] = useState<string>('');
  const [inputAngkatan, setInputAngkatan] = useState<string>('');
  const [detectedVoter, setDetectedVoter] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Selections
  const [selectedBemId, setSelectedBemId] = useState<string>('');
  const [selectedHimaId, setSelectedHimaId] = useState<string>('');

  // Modal
  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isJedaModalDismissed, setIsJedaModalDismissed] = useState(false);

  // Timers
  const [timerSeconds, setTimerSeconds] = useState(180); // 03:00 default voting session
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postSubmitSeconds, setPostSubmitSeconds] = useState(60); // 60 detik (1 menit) countdown post-submit
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioIntervalRef = useRef<any>(null);

  // 1. Initial Booth Assignment, Token Storage in sessionStorage, & Auto Booth Allocation
  useEffect(() => {
    let rawToken: string | null = null;
    let boothNumberStr = '1';

    try {
      rawToken =
        searchParams?.get('session') ||
        searchParams?.get('token') ||
        searchParams?.get('session_token') ||
        null;

      if (typeof window !== 'undefined') {
        const isCompleted = sessionStorage.getItem('pemira_session_completed') === 'true';
        if (isCompleted) {
          setSessionError('Sesi pemilihan tidak valid atau sudah digunakan.');
          return;
        }

        if (rawToken) {
          sessionStorage.setItem('pemira_session_token', rawToken);
        }
      }

      const boothParam =
        searchParams?.get('booth') ||
        searchParams?.get('id') ||
        (typeof window !== 'undefined' ? localStorage.getItem('pemira_booth') : null) ||
        null;

      if (boothParam) {
        const match = String(boothParam).match(/\d+/);
        const num = match ? parseInt(match[0], 10) : 1;
        boothNumberStr = String(num);
        setAssignedBoothNumber(num);
        setAssignedBoothName(`Bilik ${String(num).padStart(2, '0')}`);
      }

      // Pastikan tampilan langsung mengarah ke arahan bilik suara (Tahap 1)
      setCurrentStep(1);

      if (typeof window !== 'undefined' && (searchParams?.has('token') || searchParams?.has('session'))) {
        const cleanBooth = boothParam || boothNumberStr;
        window.history.replaceState(null, '', `/vote?booth=${cleanBooth}`);
      }
    } catch (e) {
      console.warn('Parameter read error:', e);
    }

    const fetchBoothStatus = async (bNumber: string) => {
      try {
        const { data, error } = await supabase
          .from('booths')
          .select('*')
          .or(`booth_number.eq.${bNumber},id.eq.${bNumber}`)
          .maybeSingle();

        if (error) {
          console.warn('Gagal fetch booth, gunakan fallback lokal:', error);
        }
        return data || { booth_number: bNumber, status: 'AVAILABLE' };
      } catch (e) {
        return { booth_number: bNumber, status: 'AVAILABLE' };
      }
    };

    const initSession = async () => {
      try {
        // Cari bilik kosong otomatis dari tabel 'booths' (status = 'AVAILABLE' atau 'TERSEDIA')
        const boothParam = searchParams?.get('booth') || searchParams?.get('id');
        if (!boothParam) {
          try {
            const { data: availableBooth } = await supabase
              .from('booths')
              .select('*')
              .or('status.eq.AVAILABLE,status.eq.TERSEDIA')
              .order('booth_number', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (availableBooth) {
              const bNum = Number(availableBooth.booth_number) || 1;
              boothNumberStr = String(bNum);
              setAssignedBoothNumber(bNum);
              setAssignedBoothId(availableBooth.id || '');
              setAssignedBoothName(availableBooth.name || `Bilik ${String(bNum).padStart(2, '0')}`);
              if (typeof window !== 'undefined') {
                localStorage.setItem('pemira_booth', String(bNum));
              }
            }
          } catch (bErr) {
            console.warn('Auto search available booth fallback note:', bErr);
          }
        } else {
          // Ambil status bilik suara dari Supabase secara aman
          const boothData = await fetchBoothStatus(boothNumberStr);
          if (boothData) {
            const bNum = boothData.booth_number || boothNumberStr;
            setAssignedBoothNumber(Number(bNum) || 1);
            setAssignedBoothId(boothData.id || '');
            setAssignedBoothName(boothData.name || `Bilik ${String(bNum).padStart(2, '0')}`);
          }
        }

        // Query candidates dari Supabase
        try {
          const supabaseClient = createClient();
          const { data: dbData, error: dbErr } = await supabaseClient
            .from('candidates')
            .select('*');

          if (dbErr) {
            console.warn('[CANDIDATES_QUERY_WARN] Menggunakan fallback kandidat:', dbErr);
          } else if (Array.isArray(dbData) && dbData.length > 0) {
            const bem = dbData.filter((c: any) => c.type === 'BEM' || c.category === 'BEM');
            const hima = dbData.filter((c: any) => c.type === 'HIMA' || c.category === 'HIMA');
            setDbBemCandidates(bem);
            setDbHimaCandidates(hima);
            setDbCandidatesLoaded(true);
          }
        } catch (candFetchErr) {
          console.warn('[CANDIDATES_FETCH_WARN]', candFetchErr);
        }
      } catch (err) {
        console.warn('[VOTE_INIT_ERROR]', err);
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

  // 2. Verifikasi Identitas Pemilih (NIM & Deteksi Otomatis dari DPT)
  const handleVerifyIdentity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanNim = inputNim.trim();
    const cleanName = inputName.trim();

    if (!cleanNim) {
      setVerifyError('Silakan masukkan NIM Anda.');
      setVerifySuccess(null);
      setIsVerified(false);
      setDetectedVoter(null);
      showToast?.('Silakan masukkan NIM Anda.', 'error');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      const res = await fetch('/api/vote/verify-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim: cleanNim, name: cleanName }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setIsVerified(false);
        setDetectedVoter(null);
        setVerifySuccess(null);
        const errMsg = json.message || 'Verifikasi identitas gagal.';
        setVerifyError(errMsg);
        showToast?.(errMsg, 'error');
        return;
      }

      setIsVerified(true);
      setDetectedVoter(json.voter);
      if (json.voter?.name) {
        setInputName(json.voter.name);
      }
      setVerifyError(null);
      setVerifySuccess(json.message || 'Identitas berhasil diverifikasi.');
      showToast?.(json.message || 'Identitas berhasil diverifikasi.', 'success');
    } catch (err: any) {
      setIsVerified(false);
      setDetectedVoter(null);
      setVerifySuccess(null);
      const networkMsg = 'Terjadi kendala jaringan saat memverifikasi identitas. Silakan coba lagi.';
      setVerifyError(networkMsg);
      showToast?.(networkMsg, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset status verifikasi jika pemilih mengubah isi input NIM atau Nama
  const handleNimChange = (val: string) => {
    setInputNim(val);
    if (isVerified || verifyError || verifySuccess) {
      setIsVerified(false);
      setDetectedVoter(null);
      setVerifyError(null);
      setVerifySuccess(null);
    }
  };

  const handleNameChange = (val: string) => {
    setInputName(val);
    if (isVerified || verifyError || verifySuccess) {
      setIsVerified(false);
      setDetectedVoter(null);
      setVerifyError(null);
      setVerifySuccess(null);
    }
  };

  // 3. Voting Session Countdown (Steps 2 - 4)
  const handleSessionTimeout = useCallback(async () => {
    // Lepaskan bilik & pulihkan status pemilih agar tidak terkunci permanen
    // (pemilih keluar via /qr-screen, bilik kembali TERSEDIA untuk antrean berikutnya)
    try {
      await fetch('/api/vote/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boothNumber: assignedBoothNumber,
          nim: detectedVoter?.nim || inputNim || '',
          name: detectedVoter?.name || inputName || '',
          prodi: detectedVoter?.prodi || detectedVoter?.prodiName || '',
          startedAt: startVoteAt || undefined,
          release: true,
        }),
      });
    } catch {}
    router.push('/qr-screen');
  }, [assignedBoothNumber, detectedVoter, inputName, inputNim, router, startVoteAt]);

  useEffect(() => {
    if (currentStep < 2 || currentStep >= 5 || sessionError) return;
    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          showToast?.('Waktu sesi bilik habis. Bilik dikembalikan ke antrean.', 'warning');
          handleSessionTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep, sessionError, handleSessionTimeout, showToast]);

  // 4. Audio Apresiasi Resmi PEMIRA UBTH 2026 (Web Audio API + SpeechSynthesis)
  const playThankYouAudio = useCallback(() => {
    if (isAudioMuted || typeof window === 'undefined') return;

    // A. Web Audio API Harmonic Bell Chime
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // Akor C5, E5, G5, C6
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

    // B. SpeechSynthesis Suara Ucapan Terima Kasih Bahasa Indonesia
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

  // 5. Post-Submit Step 5 (Layar Sukses + Audio Terima Kasih Loop 60 Detik / 1 Menit)
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

      // Mainkan audio apresiasi otomatis
      playThankYouAudio();

      // Loop audio apresiasi setiap 20 detik selama 60 detik countdown
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
            router.push('/qr-screen');
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
  }, [currentStep, playThankYouAudio, router, showToast]);

  // TAHAP 1 -> TAHAP 2: KONFIRMASI TIBA DI BILIK
  const handleArrivedAtBooth = async () => {
    try {
      const supabaseClient = createClient();
      if (assignedBoothId) {
        await supabaseClient
          .from('booths')
          .update({
            status: 'OCCUPIED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', assignedBoothId);
      } else {
        await supabaseClient
          .from('booths')
          .update({
            status: 'OCCUPIED',
            updated_at: new Date().toISOString(),
          })
          .eq('booth_number', assignedBoothNumber);
      }
    } catch (err) {
      console.warn('Update booth OCCUPIED note:', err);
    }
    setCurrentStep(2);
  };

  // TAHAP 2 -> TAHAP 3: INPUT & VERIFIKASI IDENTITAS DPT
  const handleVerifyAndProceedToBallot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanNim = inputNim.trim();
    const cleanName = inputName.trim();
    const selectedProdi = inputProdi.trim();

    if (!cleanNim) {
      setVerifyError('Silakan masukkan NIM Anda.');
      showToast?.('Silakan masukkan NIM Anda.', 'error');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const supabaseClient = createClient();

      // Cocokkan langsung dengan tabel 'voters'. Syarat: NIM cocok dan has_voted === false
      const { data: directVoterCheck } = await supabaseClient
        .from('voters')
        .select('*')
        .eq('nim', cleanNim)
        .maybeSingle();

      if (directVoterCheck && (directVoterCheck.has_voted === true || directVoterCheck.voting_status === 'SELESAI' || directVoterCheck.voting_status === 'SUDAH')) {
        setIsVerifying(false);
        const errMsg = 'NIM ini sudah menggunakan hak suara!';
        setVerifyError(errMsg);
        showToast?.(errMsg, 'error');
        alert(errMsg);
        return;
      }

      const res = await fetch('/api/vote/verify-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim: cleanNim, name: cleanName, prodi: selectedProdi }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setIsVerifying(false);
        const errMsg = json.message || 'Verifikasi identitas gagal.';
        if (errMsg.toLowerCase().includes('sudah digunakan') || errMsg.toLowerCase().includes('sudah pernah')) {
          setVerifyError('NIM ini sudah menggunakan hak suara!');
          showToast?.('NIM ini sudah menggunakan hak suara!', 'error');
          alert('NIM ini sudah menggunakan hak suara!');
        } else {
          setVerifyError(errMsg);
          showToast?.(errMsg, 'error');
        }
        return;
      }

      const voter = json.voter;
      setDetectedVoter(voter);
      setIsVerified(true);
      if (voter?.name) setInputName(voter.name);
      if (voter?.prodi || voter?.prodi_name) setInputProdi(voter.prodi || voter.prodi_name);

      const nowIso = new Date().toISOString();
      setStartVoteAt(nowIso);

      const voterName = voter?.name || cleanName || 'Pemilih';
      const voterNim = voter?.nim || cleanNim;
      const voterProdi = voter?.prodi || voter?.prodi_name || selectedProdi || '-';

      // Update 'voters': set voting_status = 'SEDANG_MEMILIH'
      // Update 'booths': set current_voter_name = voter.name, current_voter_nim = voter.nim, status = 'VOTING'
      try {
        const supabaseClient = createClient();
        await supabaseClient
          .from('voters')
          .update({
            voting_status: 'SEDANG_MEMILIH',
            start_vote_at: nowIso,
            updated_at: nowIso,
          })
          .eq('nim', voterNim);

        await supabaseClient
          .from('booths')
          .update({
            status: 'VOTING',
            current_voter_name: voterName,
            current_voter_nim: voterNim,
            current_voter_prodi: voterProdi,
            voter_name: voterName,
            voter_nim: voterNim,
            voter_prodi: voterProdi,
            started_at: nowIso,
            updated_at: nowIso,
          })
          .eq('booth_number', assignedBoothNumber);

        await supabaseClient.from('activity_logs').insert([
          {
            booth_number: assignedBoothNumber,
            message: `Mahasiswa ${voterName} (${voterProdi}) memulai pemilihan di ${assignedBoothName}`,
            description: `Mahasiswa membuka surat suara`,
            event_type: 'VOTING_STARTED',
            created_at: nowIso,
          },
        ]);
      } catch (updErr) {
        console.warn('Direct booth update note:', updErr);
      }

      try {
        updateBoothStatus?.(
          `b-0${assignedBoothNumber}`,
          'Sedang Memilih',
          { voterNim, voterName, prodiName: voterProdi }
        );
      } catch {}

      if (!selectedBemId && (safeBemList || []).length > 0) {
        setSelectedBemId(String(safeBemList[0]?.id));
      }
      const himaCandidatesForProdi = (safeHimaList || []).filter((c: any) =>
        (c.category === 'HIMA' || c.type === 'HIMA') &&
        norm(c.prodi) === norm(voterProdi)
      );
      if (!selectedHimaId && himaCandidatesForProdi.length > 0) {
        setSelectedHimaId(String(himaCandidatesForProdi[0]?.id));
      }

      setIsVerifying(false);
      setCurrentStep(3);
    } catch (err: any) {
      setIsVerifying(false);
      const networkMsg = 'Terjadi kendala jaringan saat memverifikasi DPT. Silakan coba lagi.';
      setVerifyError(networkMsg);
      showToast?.(networkMsg, 'error');
    }
  };

  // TAHAP 3: BUKA MODAL KONFIRMASI PILIHAN SUARA
  const handleOpenConfirmation = () => {
    if (!selectedBemId) {
      showToast?.('Silakan pilih salah satu pasangan calon BEM.', 'error');
      return;
    }
    if (filteredHimaList.length > 0 && !selectedHimaId) {
      showToast?.('Silakan pilih salah satu pasangan calon HIMA untuk prodi Anda.', 'error');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // TAHAP 4: SUBMIT, REKAPITULASI, & PENGOSONGAN BILIK OTOMATIS
  const handleFinalConfirmVote = async () => {
    if (!selectedBemId) {
      showToast?.('Wajib memilih Paslon BEM.', 'error');
      return;
    }
    if (filteredHimaList.length > 0 && !selectedHimaId) {
      showToast?.('Wajib memilih Paslon HIMA untuk program studi Anda.', 'error');
      return;
    }

    setIsSubmitting(true);
    setIsConfirmModalOpen(false);

    const voterNim = detectedVoter?.nim || inputNim || '';
    const voterName = detectedVoter?.name || inputName.trim() || 'Pemilih';
    let durationSeconds = 0;
    if (startVoteAt) {
      durationSeconds = Math.max(1, Math.round((Date.now() - new Date(startVoteAt).getTime()) / 1000));
    }

    try {
      // 1. Simpan suara ke tabel 'votes'
      const res = await fetch('/api/vote/submit', {
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

      const json = await res.json();
      if (!res.ok || !json.success) {
        setIsSubmitting(false);
        const errMsg = json.message || 'Penyimpanan suara gagal di database.';
        showToast?.(errMsg, 'error');
        alert(`Gagal mengirim suara: ${errMsg}`);
        return;
      }

      const nowIso = new Date().toISOString();

      // 2. Update 'voters': has_voted = true, voting_status = 'SUDAH', completed_at = now()
      // 3. Reset 'booths': status = 'AVAILABLE', current_voter_name = null, current_voter_nim = null
      try {
        const supabaseClient = createClient();
        await supabaseClient
          .from('voters')
          .update({
            has_voted: true,
            voting_status: 'SUDAH',
            completed_at: nowIso,
            updated_at: nowIso,
          })
          .eq('nim', voterNim);

        await supabaseClient
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
            updated_at: nowIso,
          })
          .eq('booth_number', assignedBoothNumber);
      } catch (syncErr) {
        console.warn('Sync reset booth note:', syncErr);
      }

      // 4. Hanguskan token di sessionStorage (kunci agar link tidak bisa dibuka lagi)
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('pemira_session_token');
          sessionStorage.removeItem('pemira_booth');
          sessionStorage.setItem('pemira_session_completed', 'true');
        } catch {}
      }

      // 5. Pindah ke Tahap 5 (Layar Sukses & Audio)
      castVote?.(voterNim, selectedBemId, selectedHimaId || '');
      updateBoothStatus?.(`b-0${assignedBoothNumber}`, 'Tersedia');
      setIsSubmitting(false);
      setPostSubmitSeconds(60); // 1 menit countdown
      setCurrentStep(5);

      // Mainkan audio apresiasi resmi
      playThankYouAudio();
    } catch (err: any) {
      console.error('[VOTE_SUBMIT_FATAL_ERROR]', err);
      setIsSubmitting(false);
      showToast?.('Kendala jaringan: Gagal terhubung ke server pemungutan suara.', 'error');
      alert('Kendala jaringan: Suara belum tersimpan di server. Silakan klik tombol Konfirmasi & Kirim Suara lagi.');
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

  const currentVoter = detectedVoter;
  const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
  const filteredHimaList = (safeHimaList || []).filter((c: any) => 
    (c.category === 'HIMA' || c.type === 'HIMA') && norm(c.prodi) === norm(currentVoter?.prodi || currentVoter?.prodiName)
  );

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
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                setIsWaitingQueue(false);
                setAssignedBoothNumber(1);
                setAssignedBoothName('Bilik 01');
                setCurrentStep(1);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('pemira_booth', '1');
                  window.history.replaceState(null, '', '/vote?booth=1');
                }
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              Masuk sebagai Bilik 1 (Mode Uji Coba)
            </button>
            <p className="text-[11px] text-slate-400">
              Sistem secara otomatis mengecek ketersediaan bilik setiap 3 detik
            </p>
          </div>
        </div>
      </div>
    );
  }



  // 2. EMPTY STATE PASLON KOSONG INFORMATIF (Bukan exception error)
  if (currentStep !== 1 && currentStep !== 5 && safeBemList.length === 0 && safeHimaList.length === 0) {
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
          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                setCurrentStep(1);
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
            >
              Masuk ke Form Validasi Pemilih (Mode Uji Coba)
            </button>
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
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                setSessionError(null);
                setAssignedBoothNumber(1);
                setAssignedBoothName('Bilik 01');
                setCurrentStep(1);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('pemira_booth', '1');
                  window.history.replaceState(null, '', '/vote?booth=1');
                }
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              Masuk sebagai Bilik 1 (Mode Uji Coba)
            </button>
            <button
              onClick={() => router.push('/qr-screen')}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              Kembali ke Layar QR Kiosk
            </button>
          </div>
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

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
            <Monitor className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">Terminal:</span>
            <select
              value={assignedBoothNumber}
              onChange={(e) => {
                const num = parseInt(e.target.value, 10);
                setAssignedBoothNumber(num);
                setAssignedBoothName(`Bilik ${String(num).padStart(2, '0')}`);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('pemira_booth', String(num));
                  window.history.replaceState(null, '', `/vote?booth=${num}`);
                }
              }}
              className="bg-transparent font-black text-blue-700 focus:outline-hidden cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((b) => (
                <option key={b} value={b}>Bilik {String(b).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 flex items-center justify-center">
        {/* TAHAP 1: ARAHAN & KONFIRMASI TIBA DI BILIK */}
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
              <div className="relative py-4 px-6 rounded-3xl bg-linear-to-b from-blue-50/80 to-slate-50 border-2 border-blue-300 shadow-inner">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                  Silakan Segera Menuju <span className="text-blue-600">BILIK {assignedBoothNumber}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2">
                  Bilik nomor {assignedBoothNumber} telah dikunci sementara khusus untuk sesi Anda.
                </p>
              </div>
            </div>

            {/* Quick selector for test mode / verification */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Sesuaikan Nomor Bilik (Bila Perlu):</span>
              <select
                value={assignedBoothNumber}
                onChange={(e) => {
                  const num = parseInt(e.target.value, 10);
                  setAssignedBoothNumber(num);
                  setAssignedBoothName(`Bilik ${String(num).padStart(2, '0')}`);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('pemira_booth', String(num));
                    window.history.replaceState(null, '', `/vote?booth=${num}`);
                  }
                }}
                className="font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-slate-900 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((b) => (
                  <option key={b} value={b}>Bilik {b}</option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-left text-xs text-amber-800 space-y-1">
              <strong className="text-amber-900 block font-bold">Petunjuk Pemilih:</strong>
              <p>
                Segera berjalan menuju <strong>Bilik {assignedBoothNumber}</strong>. Setelah Anda berada di depan bilik fisik, tekan tombol di bawah untuk membuka form verifikasi identitas.
              </p>
            </div>

            <button
              onClick={handleArrivedAtBooth}
              className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 cursor-pointer active:scale-95"
            >
              <span>Saya Sudah Berada di Bilik</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* TAHAP 2 - 5: VOTING FLOW */}
        {currentStep >= 2 && currentStep !== 5 && (
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Column: Vertical Stepper Indicator */}
            <div className="hidden md:flex md:col-span-1 flex-col items-center justify-center py-6">
              {[2, 3, 4, 5].map((step, idx) => {
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

                    {idx < 3 && (
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
              {/* TAHAP 2: INPUT & VERIFIKASI DPT */}
              {currentStep === 2 && (
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl max-w-2xl mx-auto space-y-6 animate-in fade-in">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      TAHAP 2 DARI 4
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Input &amp; Verifikasi DPT
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Masukkan data diri Anda untuk memverifikasi hak suara pada sistem PEMIRA UBTH.
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
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      Status: OCCUPIED
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Input NIM */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Nomor Induk Mahasiswa (NIM) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Masukkan NIM Anda..."
                          value={inputNim}
                          onChange={(e) => handleNimChange(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyAndProceedToBallot(); }}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                        />
                      </div>
                    </div>

                    {/* Input Nama Lengkap */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Nama Lengkap (Otomatis dari DPT)
                      </label>
                      <div className="relative">
                        <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Nama mahasiswa..."
                          value={inputName}
                          onChange={(e) => handleNameChange(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyAndProceedToBallot(); }}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                        />
                      </div>
                    </div>

                    {/* Input Program Studi & Angkatan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                          Program Studi
                        </label>
                        <select
                          value={inputProdi || detectedVoter?.prodi || detectedVoter?.prodi_name || ''}
                          onChange={(e) => setInputProdi(e.target.value)}
                          className="w-full px-3.5 py-3 rounded-2xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer"
                        >
                          <option value="">Pilih Program Studi</option>
                          {MASTER_PRODI.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                          Angkatan Mahasiswa
                        </label>
                        <select
                          value={inputAngkatan || detectedVoter?.angkatan || ''}
                          onChange={(e) => setInputAngkatan(e.target.value)}
                          className="w-full px-3.5 py-3 rounded-2xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer"
                        >
                          <option value="">Pilih Angkatan (Opsional)</option>
                          {['2026', '2025', '2024', '2023', '2022', '2021', '2020'].map((yr) => (
                            <option key={yr} value={yr}>Angkatan {yr}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Alert & Error Message */}
                    {verifyError && (
                      <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-rose-900">Verifikasi Ditolak</span>
                          <span className="text-rose-700">{verifyError}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                    >
                      ← Kembali ke Panduan Bilik
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVerifyAndProceedToBallot()}
                      disabled={isVerifying || !inputNim.trim()}
                      className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                        isVerifying || !inputNim.trim()
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
                </div>
              )}

              {/* TAHAP 3: SURAT SUARA (BEM & HIMA) */}
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
                      Pemilih: <strong>{detectedVoter?.name || inputName || 'Mahasiswa'}</strong> ({detectedVoter?.nim || inputNim}) • Prodi: <strong>{detectedVoter?.prodi || detectedVoter?.prodi_name || inputProdi || '-'}</strong>
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
                              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                                <div>
                                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide block">
                                    Nomor Urut {displayNumber}
                                  </span>
                                  <h4 className="text-base font-black text-slate-900 mt-0.5">
                                    {displayName} {displayVice ? `& ${displayVice}` : ''}
                                  </h4>
                                  <p className="text-xs text-slate-500 italic mt-0.5">
                                    &ldquo;{cand?.tagline || 'Inovatif, Transparan, dan Mengayomi Mahasiswa'}&rdquo;
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

                  {/* SEKSI 2: PEMILIHAN HIMA SESUAI PRODI */}
                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          2. Pemilihan Ketua &amp; Wakil Himpunan Mahasiswa (HIMA)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Hanya menampilkan pasangan calon sesuai Program Studi Anda ({detectedVoter?.prodi || detectedVoter?.prodi_name || inputProdi || '-'}).
                        </p>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                        HIMA
                      </span>
                    </div>

                    {filteredHimaList.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-blue-50/60 border border-blue-200 text-center space-y-2">
                        <Info className="w-8 h-8 text-blue-600 mx-auto" />
                        <h5 className="text-sm font-bold text-slate-900">
                          Pemilihan HIMA belum tersedia untuk Program Studi ini.
                        </h5>
                        <p className="text-xs text-slate-500">
                          Anda dapat langsung melanjutkan pengiriman surat suara untuk pemilihan Presiden BEM.
                        </p>
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
                                      &ldquo;{cand?.tagline || 'Sinergi Bersama Memajukan Potensi Jurusan'}&rdquo;
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

                  {/* Tombol Lanjut ke Modal Konfirmasi */}
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
                      disabled={!selectedBemId || (filteredHimaList.length > 0 && !selectedHimaId)}
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

        {/* TAHAP 5: LAYAR SUKSES + AUDIO TERIMA KASIH (LOOP 1 MENIT) */}
        {currentStep === 5 && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-2xl max-w-lg mx-auto text-center space-y-6 animate-in fade-in zoom-in-95">
            {/* Animasi Centang Hijau */}
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

            {/* Audio Apresiasi Controller */}
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

            {/* 60-Second Countdown Timer Bilik */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 block font-medium">Silakan meninggalkan bilik suara dalam waktu:</span>
              <div className="text-4xl font-black text-slate-900 font-mono tracking-tight pt-1 flex items-center justify-center gap-2">
                <Clock className="w-7 h-7 text-slate-700" />
                <span>{formatTimer(postSubmitSeconds)}</span>
              </div>
              <span className="text-[10px] text-slate-400 block pt-1">
                Bilik akan otomatis dikosongkan dan dialokasikan untuk pemilih berikutnya.
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push('/qr-screen')}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md active:scale-95"
            >
              Selesai &amp; Keluar Bilik Suara
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
                Apakah Anda yakin dengan pilihan Anda? Pilihan yang sudah dikirim tidak dapat diubah.
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
                {filteredHimaList.length === 0 ? (
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

class VoteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: false };
  }

  componentDidCatch(error: any) {
    console.warn('[VOTE_NON_BLOCKING_ERROR]', error);
  }

  render() {
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
