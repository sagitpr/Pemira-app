'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Candidate, BEM_CANDIDATES, HIMA_CANDIDATES } from '@/data/voteMockData';
import VisiMisiModal from '@/components/vote/VisiMisiModal';
import { parseListItems } from '@/lib/formatList';
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

const getFacultyByProdi = (prodi: string = ''): 'FTB' | 'FIKES' | 'FARMASI' => {
  const p = prodi.toLowerCase();
  if (p.includes('farmasi') || p.includes('apoteker') || p.includes('kosmetik') || p.includes('s2 farmasi')) {
    return 'FARMASI';
  }
  if (
    p.includes('keperawatan') ||
    p.includes('administrasi rumah sakit') ||
    p.includes('ars') ||
    p.includes('gizi') ||
    p.includes('optometri') ||
    p.includes('refraksi') ||
    p.includes('optisi') ||
    p.includes('laboratorium') ||
    p.includes('tlm')
  ) {
    return 'FIKES';
  }
  return 'FTB';
};

const MASTER_PRODI = [
  'S1 Farmasi',
  'Pendidikan Profesi Apoteker',
  'S1 Rekayasa Kosmetika',
  'S2 Farmasi',
  'S1 Keperawatan',
  'D3 Keperawatan',
  'S1 Administrasi Rumah Sakit',
  'D3 Teknologi Laboratorium Medis',
  'D3 Optometri',
  'S1 Gizi',
  'S1 Sistem Informasi',
  'S1 Bisnis Digital',
  'S1 Kewirausahaan',
  'S1 Teknologi Pangan'
];


// Helper Normalisasi Program Studi & HIMA Resmi (Pemisahan Ketat Jenjang S1, D3, S2, dan Profesi Apoteker)
const getCanonicalProdiKey = (str: string = ''): string => {
  const s = str.toLowerCase().trim();
  if (!s) return '';

  // 1. S2 Farmasi / Magister Farmasi
  if ((s.includes('s2') || s.includes('magister')) && s.includes('farmasi')) {
    return 's2_farmasi';
  }

  // 2. Pendidikan Profesi Apoteker
  if (s.includes('apoteker') || s.includes('psppa') || s.includes('profesi apoteker')) {
    return 'profesi_apoteker';
  }

  // 3. S1 Rekayasa Kosmetik / Kosmetika
  if (s.includes('kosmetik') || s.includes('rekos')) {
    return 's1_rekayasa_kosmetika';
  }

  // 4. S1 Farmasi (Pastikan bukan S2, bukan Apoteker, bukan Kosmetik)
  if (s.includes('farmasi') || s.includes('himafarma')) {
    return 's1_farmasi';
  }

  // 5. D3 Keperawatan
  if (s.includes('d3') && (s.includes('keperawatan') || s.includes('perawat'))) {
    return 'd3_keperawatan';
  }

  // 6. S1 Keperawatan
  if (s.includes('s1') && (s.includes('keperawatan') || s.includes('perawat'))) {
    return 's1_keperawatan';
  }
  if (s.includes('keperawatan') || s.includes('perawat')) {
    return s.includes('d3') ? 'd3_keperawatan' : 's1_keperawatan';
  }

  // 7. S1 Administrasi Rumah Sakit (ARS)
  if (s.includes('administrasi rumah sakit') || s.includes('ars')) {
    return 's1_ars';
  }

  // 8. D3 TLM (Teknologi Laboratorium Medis / Analis Kesehatan)
  if (s.includes('laboratorium') || s.includes('tlm') || s.includes('analis kesehatan')) {
    return 'd3_tlm';
  }

  // 9. D3 Refraksi Optisi / Optometri (RO)
  if (s.includes('optometri') || s.includes('refraksi') || s.includes('optisi')) {
    return 'd3_optometri';
  }

  // 10. S1 Gizi
  if (s.includes('gizi')) {
    return 's1_gizi';
  }

  // 11. S1 Sistem Informasi
  if (s.includes('sistem informasi') || s.includes('himasi')) {
    return 's1_sistem_informasi';
  }

  // 12. S1 Bisnis Digital
  if (s.includes('bisnis digital') || s.includes('himabid')) {
    return 's1_bisnis_digital';
  }

  // 13. S1 Teknologi Pangan
  if (s.includes('teknologi pangan') || s.includes('pangan') || s.includes('tekpang')) {
    return 's1_teknologi_pangan';
  }

  // 14. S1 Kewirausahaan
  if (s.includes('kewirausahaan') || s.includes('kwu')) {
    return 's1_kewirausahaan';
  }

  // Fallback: normalisasi teks
  return s
    .replace(/^(program studi|prodi|hima)\s+/i, '')
    .replace(/[\(\)]/g, '')
    .trim();
};

const isProdiMatching = (candidateProdi: string = '', voterProdi: string = ''): boolean => {
  const keyC = getCanonicalProdiKey(candidateProdi);
  const keyV = getCanonicalProdiKey(voterProdi);
  if (!keyC || !keyV) return false;
  return keyC === keyV;
};

type Step =
  | 'BOOTH_ROUTING'
  | 'IDENTITAS'
  | 'VOTE_BEM'
  | 'VOTE_HIMA'
  | 'REVIEW_CONFIRM'
  | 'SUCCESS'
  | 'SESSION_EXPIRED';

function VoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isAccessRevoked, setIsAccessRevoked] = useState(false);
  const [isAccessGranted, setIsAccessGranted] = useState<boolean>(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState<boolean>(true);

  // Penanda status submit berhasil & ref channel realtime bilik
  const isVoteFinishedRef = useRef(false);
  const boothChannelRef = useRef<any>(null);
  const allocationExecutedRef = useRef(false);

  const [assignedBooth, setAssignedBooth] = useState<any>(null);
  const [assignedBoothName, setAssignedBoothName] = useState<string>('Bilik 01');
  const [assignedBoothNumber, setAssignedBoothNumber] = useState<number>(1);
  const [assignedBoothId, setAssignedBoothId] = useState<string>('');

  const [isWaitingQueue, setIsWaitingQueue] = useState<boolean>(false);
  const [queueMessage, setQueueMessage] = useState<string>('');
  const queuePollingRef = useRef<NodeJS.Timeout | null>(null);
  const [step, setStep] = useState<Step>('BOOTH_ROUTING');
  const [electionStatus, setElectionStatus] = useState<'AKTIF' | 'JEDA' | 'TUTUP'>('AKTIF');

  // Candidate Data & Cache
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [candidatePhotos, setCandidatePhotos] = useState<Record<string, string>>({});
  const [isLoadingCandidates, setIsLoadingCandidates] = useState<boolean>(true);
  const [dbCandidatesLoaded, setDbCandidatesLoaded] = useState<boolean>(false);
  const [dbBemCandidates, setDbBemCandidates] = useState<Candidate[]>([]);
  const [dbHimaCandidates, setDbHimaCandidates] = useState<Candidate[]>([]);

  // Form State (Hanya NIM, Nama, Prodi)
  const [inputNim, setInputNim] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [inputProdi, setInputProdi] = useState<string>('');
  const [detectedVoter, setDetectedVoter] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Selections (Object Kandidat Terpilih)
  const [selectedBem, setSelectedBem] = useState<any>(null);
  const [selectedHima, setSelectedHima] = useState<any>(null);
  const [selectedBemId, setSelectedBemId] = useState<string>('');
  const [selectedHimaId, setSelectedHimaId] = useState<string>('');

  // Modals
  const [detailModalCandidate, setDetailModalCandidate] = useState<Candidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isJedaModalDismissed, setIsJedaModalDismissed] = useState(false);

  // Timers & Audio
  const [timerSeconds, setTimerSeconds] = useState(180); // 03:00 sesi bilik
  const timeLeft = timerSeconds;
  const setTimeLeft = setTimerSeconds;
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

  // 0. Realtime Status Pemilihan (Polling Neon)
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

  const isSubmittingVoteRef = useRef(false);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper Pencatatan Event Kunjungan Fisik Bilik ke activity_logs
  const lastLoggedVisitRef = useRef<number>(0);
  const recordBoothVisit = useCallback(async (boothNum: number) => {
    const now = Date.now();
    if (now - lastLoggedVisitRef.current < 4000) return;
    lastLoggedVisitRef.current = now;

    try {
      const bNumber = Number(boothNum) || 1;
      const nowIso = new Date().toISOString();
      const payload = {
        action: 'BOOTH_VISIT',
        event_type: 'BOOTH_VISIT',
        type: 'BOOTH_VISIT',
        booth_number: bNumber,
        details: `Pemilih memasuki Bilik ${bNumber}`,
        message: `Pemilih memasuki Bilik ${bNumber}`,
        text: `Pemilih memasuki Bilik ${bNumber}`,
        created_at: nowIso,
      };

      await fetch('/api/admin/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Catat kunjungan bilik note:', err);
    }
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

      recordBoothVisit(bNum);

      if (typeof window !== 'undefined') {
        localStorage.setItem('pemira_booth', String(bNum));
      }
    } catch (lockErr) {
      console.warn('Gagal mengunci bilik:', lockErr);
    }
  }, [recordBoothVisit]);

  // Helper untuk menyimpan paslon dan memetakan foto
  const setCandidates = useCallback((data: any[]) => {
    setAllCandidates(data);
    setDbCandidatesLoaded(true);
    const photoMap: Record<string, string> = {};
    data.forEach((p: any) => {
      const photo = p.image_url || p.photo_url || p.photoUrl || p.foto;
      if (photo) photoMap[p.id] = photo;
    });
    setCandidatePhotos((prev) => ({ ...prev, ...photoMap }));
  }, []);

  // 1. DATA PASLON DARI NEON ROUTE (/api/candidates)
  useEffect(() => {
    async function loadBallotCandidates() {
      setIsLoadingCandidates(true);
      try {
        const res = await fetch('/api/candidates', { cache: 'no-store' });
        if (!res.ok) throw new Error('Gagal mengambil data paslon');
        const data = await res.json();
        
        const candidateList = Array.isArray(data) ? data : (data.candidates || []);
        setCandidates(candidateList);
      } catch (err) {
        console.error("Gagal load kandidat di bilik:", err);
        setCandidates([]);
      } finally {
        setIsLoadingCandidates(false);
      }
    }

    loadBallotCandidates();
  }, [setCandidates]);

  // Fungsi Masuk Mode Layar Penuh (Menyembunyikan Address Bar HP)
  const triggerFullscreenMode = () => {
    try {
      const elem = document.documentElement as any;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (e) {
      // Abaikan jika browser membatasi gesture
    }
  };

  // 1. Validasi Token Cerdas & Anti-Share (Client-Side Allocation Guard)
  const attemptBoothAllocation = async (targetBoothNum?: number) => {
    // Cegah pemanggilan berulang kali dari mount yang sama
    if (allocationExecutedRef.current) return;
    allocationExecutedRef.current = true;

    try {
      // Siapkan token sesi klien persisten
      let clientSessionToken = sessionStorage.getItem('pemira_client_token');
      if (!clientSessionToken) {
        clientSessionToken = 'UBTH-SES-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        sessionStorage.setItem('pemira_client_token', clientSessionToken);
      }

      const res = await fetch('/api/booths/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booth_number: targetBoothNum,
          session_token: clientSessionToken
        })
      });

      const data = await res.json();

      if (data.success && data.allocated && data.booth) {
        setIsWaitingQueue(false);
        const b = data.booth;
        setAssignedBooth(b);
        setAssignedBoothNumber(b.booth_number);
        setAssignedBoothName(b.name || `Bilik ${String(b.booth_number).padStart(2, '0')}`);
        setAssignedBoothId(b.id || `booth-${b.booth_number}`);

        sessionStorage.setItem('pemira_active_session', JSON.stringify({
          booth_number: b.booth_number,
          token: b.session_token
        }));
        sessionStorage.setItem('pemira_assigned_booth', JSON.stringify(b));
        sessionStorage.setItem('pemira_active_token', b.session_token || '');
        sessionStorage.setItem('pemira_access_verified', 'true');

        setIsAccessGranted(true);
        setIsCheckingAccess(false);
        setLoading(false);
        return true;
      } else if (data.waiting) {
        // Izinkan pemanggilan ulang jika berstatus antrean
        allocationExecutedRef.current = false;
        setIsWaitingQueue(true);
        setQueueMessage(data.message || 'Seluruh bilik fisik sedang terisi.');
        setIsAccessGranted(true);
        setIsCheckingAccess(false);
        setLoading(false);
        return false;
      } else {
        setIsAccessGranted(false);
        setIsCheckingAccess(false);
        setLoading(false);
        window.location.replace('about:blank');
        return false;
      }
    } catch (err) {
      allocationExecutedRef.current = false;
      setIsCheckingAccess(false);
      setLoading(false);
      return false;
    }
  };

  // Jalankan Pengecekan Mount Tepat Satu Kali
  useEffect(() => {
    setMounted(true);

    // Cegah klik kanan & tahan layar untuk menyalin URL/teks
    const blockContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', blockContext);

    const params = new URLSearchParams(window.location.search);
    const boothParam = params.get('booth') || params.get('b');

    // Hapus parameter URL agar tidak dapat disalin
    window.history.replaceState({}, document.title, window.location.pathname);

    // Periksa apakah sudah ada sesi bilik aktif di peramban ini
    const activeSessionRaw = sessionStorage.getItem('pemira_active_session');
    if (activeSessionRaw) {
      try {
        const parsed = JSON.parse(activeSessionRaw);
        if (parsed.booth_number) {
          setAssignedBooth(parsed);
          setAssignedBoothNumber(Number(parsed.booth_number) || 1);
          setAssignedBoothName(`Bilik ${String(parsed.booth_number).padStart(2, '0')}`);
          setIsAccessGranted(true);
          setIsCheckingAccess(false);
          setLoading(false);
          return;
        }
      } catch (e) {}
    }

    // Jika sesi baru, jalankan alokasi tunggal
    attemptBoothAllocation(boothParam ? parseInt(boothParam, 10) : undefined);

    return () => {
      document.removeEventListener('contextmenu', blockContext);
    };
  }, []);

  // Polling Otomatis Saat Berada di Antrean (Mengecek Bilik Kosong Tiap 800ms)
  useEffect(() => {
    if (isWaitingQueue) {
      queuePollingRef.current = setInterval(async () => {
        // Coba ambil bilik kosong yang baru selesai digunakan pemilih lain
        allocationExecutedRef.current = false;
        const success = await attemptBoothAllocation();
        if (success && queuePollingRef.current) {
          clearInterval(queuePollingRef.current);
        }
      }, 800);
    }

    return () => {
      if (queuePollingRef.current) clearInterval(queuePollingRef.current);
    };
  }, [isWaitingQueue]);

  // Pemusnahan Sesi & Navigasi ke about:blank jika dibatalkan admin
  const terminateSessionToBlank = () => {
    sessionStorage.clear();
    localStorage.removeItem('pemira_booth_session');
    localStorage.removeItem('pemira_active_session');
    localStorage.removeItem('pemira_completed_voter');
    window.location.replace('about:blank');
  };

  // Polling Pengecekan Sesi (Heartbeat Monitor)
  useEffect(() => {
    if (!isAccessGranted || !assignedBooth?.booth_number || isWaitingQueue) return;

    // Jalankan pemeriksaan status bilik setiap 2 detik ke database Neon
    heartbeatTimerRef.current = setInterval(async () => {
      // JANGAN JALANKAN HEARTBEAT JIKA SUARA SEDANG/SUDAH DISUBMIT!
      if (isSubmittingVoteRef.current) return;

      try {
        const activeSession = sessionStorage.getItem('pemira_active_session');
        const token = activeSession ? JSON.parse(activeSession).token : null;

        const res = await fetch(`/api/booths/check-session?booth=${assignedBooth.booth_number}&token=${token || ''}`, {
          cache: 'no-store'
        });
        if (!res.ok) return;

        const data = await res.json();

        // Hanya terminate jika benar-benar dibatalkan admin atau sesi kadaluarsa SEBELUM submit suara
        if (!isSubmittingVoteRef.current && data.valid === false && (data.reason === 'CANCELLED_BY_ADMIN' || data.reason === 'SESSION_EXPIRED')) {
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
          terminateSessionToBlank(); // LANGSUNG NGE-BLANK KE about:blank SEKETIKA!
        }
      } catch (e) {
        console.warn("Heartbeat check warning:", e);
      }
    }, 2000);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [isAccessGranted, assignedBooth?.booth_number, isWaitingQueue]);

  // Timer Pengaman Lokal di HP Pemilih (Maksimal 15 Menit = 900 Detik):
  useEffect(() => {
    if (!isAccessGranted) return;

    const maxSessionTimer = setTimeout(() => {
      // Tepat 15 menit, musnahkan sesi dan lempar ke about:blank
      terminateSessionToBlank();
    }, 15 * 60 * 1000); // 15 menit

    return () => clearTimeout(maxSessionTimer);
  }, [isAccessGranted]);

  // 3. Penanganan Waktu Sesi Habis (Reset Bilik di Neon via API)
  const handleSessionTimeout = useCallback(async () => {
    try {
      const bNumber = assignedBoothNumber || assignedBooth?.booth_number || 1;
      const bId = assignedBoothId || assignedBooth?.id;

      await fetch('/api/admin/booths/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boothId: bId, boothNumber: bNumber }),
      });

      // Hanguskan token di penyimpanan perangkat pemilih
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        localStorage.removeItem('pemira_voter_session');
        localStorage.removeItem('pemira_session_token');
      }

      // Pindahkan state ke Layar Sesi Berakhir (DEAD-END SCREEN MERAH)
      setIsSessionExpired(true);
      setStep('SESSION_EXPIRED');
    } catch (err) {
      console.error('Error saat timeout:', err);
      setIsSessionExpired(true);
      setStep('SESSION_EXPIRED');
    }
  }, [assignedBoothId, assignedBooth, assignedBoothNumber]);

  // Timer Countdown Sesi Bilik (BEKUKAN TIMER SAAT MASIH PROSES MEMUAT DATA)
  useEffect(() => {
    // Hanya jalankan timer jika sudah masuk tahap surat suara
    if (step !== 'VOTE_BEM' && step !== 'VOTE_HIMA') return;

    // JANGAN jalankan interval jika paslon masih loading
    if (isLoadingCandidates) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSessionTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, isLoadingCandidates, handleSessionTimeout]);

  // 4. Audio Ucapan Terima Kasih Resmi (Loop 60 Detik di Langkah SUCCESS)
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

  // Efek Countdown Pasca-Submit (Langkah SUCCESS)
  useEffect(() => {
    if (step !== 'SUCCESS') return;

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
            setStep('SESSION_EXPIRED');
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
  }, [step, playThankYouAudio]);

  // TAHAP 1 -> TAHAP 2: Tombol Tunggal "Saya Sudah Berada di Bilik"
  const handleArrivedAtBooth = async () => {
    triggerFullscreenMode();
    try {
      await recordBoothVisit(assignedBoothNumber || assignedBooth?.booth_number || 1);
    } catch (e) {
      console.warn('Update booth note:', e);
    }
    setStep('IDENTITAS');
  };

  // TAHAP 2: VALIDASI KETAT DPT VIA NEON ROUTE (/api/vote/verify)
  const handleVerifyDPT = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerFullscreenMode();

    const cleanNim = inputNim.trim();
    const cleanName = inputName.trim();
    const selectedProdi = inputProdi.trim();

    if (!cleanNim) {
      setVerifyError('Silakan masukkan NIM Anda.');
      return;
    }
    if (!cleanName) {
      setVerifyError('Silakan masukkan Nama Lengkap Anda.');
      return;
    }
    if (!selectedProdi) {
      setVerifyError('Silakan pilih Program Studi Anda.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch('/api/vote/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim: cleanNim,
          name: cleanName,
          prodi: selectedProdi,
          booth_number: assignedBooth?.booth_number || assignedBoothNumber || 1,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsVerifying(false);
        setVerifyError(data.message || 'Verifikasi gagal. Pastikan data Anda sesuai DPT.');
        return;
      }

      const voter = data.voter;
      const nowIso = new Date().toISOString();
      setStartVoteAt(nowIso);
      setDetectedVoter(voter);

      setIsVerifying(false);
      setStep('VOTE_BEM'); // Lanjut ke TAHAP Surat Suara BEM
    } catch (err: any) {
      console.error('Error saat verifikasi DPT:', err);
      setIsVerifying(false);
      setVerifyError('Terjadi kendala server saat memverifikasi DPT. Silakan coba lagi.');
    }
  };

  // TAHAP 4: ULTRA FAST-RESPONSE VOTE INGESTION VIA NEON ROUTE (/api/vote/submit)
  const handleSubmitVote = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsConfirmModalOpen(false);

    // Inisialisasi audio seketika pada gestur klik aktif
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        (window as any).__pemira_audio_ctx = ctx;

        const audio = new Audio('/audio/terimakasih.mp3');
        audio.preload = 'auto';
        audio.volume = 1.0;
        (window as any).__pemira_audio = audio;

        const source = ctx.createMediaElementSource(audio);
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(3.0, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        audio.play().catch(() => {});
      } else {
        const audio = new Audio('/audio/terimakasih.mp3');
        audio.volume = 1.0;
        (window as any).__pemira_audio = audio;
        audio.play().catch(() => {});
      }
    } catch (audioErr) {
      console.warn('Audio pre-trigger error:', audioErr);
    }

    isSubmittingVoteRef.current = true;
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);

    try {
      const voterNim = detectedVoter?.nim || inputNim.trim();

      const res = await fetch('/api/vote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_nim: voterNim,
          bem_candidate_id: selectedBem?.id,
          hima_candidate_id: selectedHima?.id || null,
          booth_number: assignedBooth?.booth_number || assignedBoothNumber || 1,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Gagal menyimpan suara');

      sessionStorage.setItem('pemira_completed_voter', JSON.stringify({
        name: detectedVoter?.name || inputName.trim() || 'Mahasiswa UBTH',
        nim: voterNim || '-',
        prodi: detectedVoter?.prodi || inputProdi.trim() || '-',
        voted_at: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      }));

      sessionStorage.removeItem('pemira_active_session');
      sessionStorage.removeItem('pemira_session_token');
      router.replace('/selesai');

    } catch (err: any) {
      isSubmittingVoteRef.current = false;
      alert(err.message || 'Gagal menyimpan suara.');
      setIsSubmitting(false);
    }
  };

  const handleFinalConfirmVote = handleSubmitVote;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const formatTime = formatTimer;

  // Safe Candidate Lists Fallback
  const safeBemList = dbCandidatesLoaded && dbBemCandidates.length > 0 ? dbBemCandidates : BEM_CANDIDATES;
  const safeHimaList = dbCandidatesLoaded && dbHimaCandidates.length > 0 ? dbHimaCandidates : HIMA_CANDIDATES;

  // Helper Data Pemilih & Program Studi
  const verifiedVoter = detectedVoter;
  const voterProdi = verifiedVoter?.prodi || verifiedVoter?.prodi_name || inputProdi.trim();

  // B. PENYARINGAN PASLON (FUZZY BEM CATEGORY MATCH):
  const candidatesPool = allCandidates.length > 0 ? allCandidates : [...safeBemList, ...safeHimaList];

  // - Paslon BEM (Mencakup 'BEM-U', 'BEM Univ', 'BEM Universitas', atau 'BEM'):
  const bemCandidates = candidatesPool.filter((c: any) => {
    const cat = (c.category || c.type || '').toUpperCase().trim();
    return cat.includes('BEM');
  });

  // - Paslon HIMA Khusus Per-Prodi (Pencocokan Ketat Berbasis getCanonicalProdiKey):
  const prodiHimaCandidates = candidatesPool.filter((c: any) => {
    const cat = (c.category || c.type || '').toUpperCase().trim();
    if (cat.includes('BEM')) return false;

    const candidateProdi = c.prodi || c.hima_name || c.prodi_name || '';
    const voterProdiStr = verifiedVoter?.prodi || voterProdi || '';

    return isProdiMatching(candidateProdi, voterProdiStr);
  });

  const himaCandidates = prodiHimaCandidates;

  // B. Tampilan Jika Akses Ditolak (Alihkan Langsung ke about:blank)
  if (!isCheckingAccess && !isAccessGranted) {
    if (typeof window !== 'undefined') {
      window.location.replace('about:blank');
    }
    return (
      <div 
        className="fixed inset-0 w-screen h-screen bg-black z-[999999] cursor-none select-none pointer-events-none" 
        aria-hidden="true" 
      />
    );
  }

  // Loading State
  if (!mounted || isCheckingAccess || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans select-none">
        <div className="text-center p-6">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-sm">Menghubungkan ke Bilik Suara...</p>
        </div>
      </div>
    );
  }

  // SCREEN: AKSES DICABUT / DIBATALKAN OLEH ADMIN (KILL-SWITCH ACCESS_REVOKED)
  if (isAccessRevoked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-white text-center">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-rose-400 mb-2">
              Akses Sesi Bilik Dibatalkan
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Sesi pemilihan untuk bilik ini telah dibatalkan atau ditarik oleh Panitia KPUM. Anda tidak dapat lagi mengisi identitas ataupun memberikan suara.
            </p>
            <div className="p-3 bg-slate-800/80 rounded-xl text-xs text-amber-300 border border-amber-500/20 mb-6">
              Silakan keluar dari bilik dan hubungi petugas di meja registrasi jika terjadi kesalahan teknis.
            </div>
            <button
              onClick={() => {
                window.location.href = 'about:blank';
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition text-xs cursor-pointer"
            >
              Tutup Halaman
            </button>
          </div>
        </div>
        <footer className="w-full py-4 mt-auto text-center border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <p className="text-[11px] text-slate-500 font-medium tracking-wide">
            KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
          </p>
        </footer>
      </div>
    );
  }

  // SCREEN: SESI BILIK HABIS (DEAD-END SCREEN PERMANEN DI HP PEMILIH)
  if (isSessionExpired) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-white text-center select-none font-sans">
        <div className="flex-1 flex items-center justify-center p-6">
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
        <footer className="w-full py-4 mt-auto text-center border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <p className="text-[11px] text-slate-500 font-medium tracking-wide">
            KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
          </p>
        </footer>
      </div>
    );
  }

  // SCREEN: AKSES DITOLAK (DIBUKA TANPA TOKEN RESMI)
  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-white text-center select-none font-sans">
        <div className="flex-1 flex items-center justify-center p-6">
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
        <footer className="w-full py-4 mt-auto text-center border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <p className="text-[11px] text-slate-500 font-medium tracking-wide">
            KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
          </p>
        </footer>
      </div>
    );
  }

  // SCREEN: ANTREAN BILIK PENUH
  if (isWaitingQueue) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 md:p-6 font-sans antialiased select-none">
        {/* Header Resmi Identik */}
        <header className="w-full max-w-md mx-auto flex items-center justify-between py-3 px-1">
          <div className="flex items-center gap-3">
            <img 
              src="/candidate/image-logo-Pemira.png" 
              alt="Logo Pemira" 
              className="w-9 h-9 object-contain shrink-0"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('image-logo-Pemira.png')) {
                  target.src = '/image-logo-Pemira.png';
                }
              }}
            />
            <div>
              <h1 className="text-xs font-bold text-slate-900 tracking-tight leading-none">
                PEMIRA UBTH 2026
              </h1>
              <p className="text-[10px] font-medium text-slate-500 tracking-wide mt-1">
                KOMISI PEMILIHAN RAYA
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-blue-600 tracking-tight">
            Menunggu Bilik
          </span>
        </header>

        {/* Konten Kartu Utama */}
        <main className="w-full max-w-md mx-auto my-auto py-4">
          <div className="bg-white rounded-3xl border border-[#EFECE6] p-6 shadow-sm flex flex-col">
            
            <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase text-center mb-4">
              STATUS BILIK SUARA FISIK
            </p>

            {/* Kotak Status Antrean (Gaya Identik Kotak Arahan Bilik) */}
            <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-6 text-center mb-4">
              <h2 className="text-xl font-bold text-slate-900 leading-snug">
                Seluruh Bilik Sedang Terisi
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Mohon menunggu sejenak. Sistem sedang memantau ketersediaan bilik fisik secara realtime.
              </p>
            </div>

            {/* Kotak Petunjuk Pemilih */}
            <div className="bg-[#FAF8F4] border border-[#EFECE6] rounded-2xl p-4 text-left mb-6 space-y-1.5">
              <p className="text-xs font-bold text-slate-700">Petunjuk Pemilih:</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda tidak perlu memindai ulang QR Code. Halaman ini akan <strong>otomatis terbuka</strong> dan mengarahkan Anda ke bilik fisik begitu pemilih di dalam bilik menyelesaikan suaranya.
              </p>
            </div>

            {/* Indikator Status Heuristik */}
            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 mb-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>Memeriksa bilik kosong secara otomatis...</span>
            </div>

            {/* Watermark Konsisten */}
            <div className="w-full pt-4 border-t border-[#EFECE6] flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Engineered by <strong className="text-slate-700 font-semibold">Sagit Faturrakhman</strong></span>
            </div>
          </div>
        </main>

        {/* Footer Resmi Identik */}
        <footer className="w-full py-3 text-center">
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
          </p>
        </footer>
      </div>
    );
  }

  // SCREEN: PEMILIHAN DITUTUP
  if (step !== 'SUCCESS' && electionStatus === 'TUTUP') {
    return (
      <div className="flex flex-col justify-between min-h-screen text-center bg-slate-50 font-sans select-none">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase">PEMIRA UBTH 2026 Telah Resmi Ditutup</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              PEMIRA UBTH 2026 Telah Resmi Ditutup. Terima kasih atas partisipasi seluruh civitas akademika.
            </p>
          </div>
        </div>
        <footer className="w-full py-4 mt-auto text-center border-t border-slate-100 bg-white/50 backdrop-blur-sm">
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
          </p>
        </footer>
      </div>
    );
  }

  // SCREEN: PEMILIHAN DIJEDA
  if (step !== 'SUCCESS' && electionStatus === 'JEDA') {
    return (
      <div className="flex flex-col justify-between min-h-screen text-center bg-slate-50 font-sans select-none">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase">Sesi Pemilihan Sedang Dijeda</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Sesi Pemilihan Sedang Dijeda Sementara oleh Panitia KPUM.
            </p>
          </div>
        </div>
        <footer className="w-full py-4 mt-auto text-center border-t border-slate-100 bg-white/50 backdrop-blur-sm">
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
          </p>
        </footer>
      </div>
    );
  }

  // B. TAMPILAN SKELETON LOADING CARD PASLON (CANDIDATE SKELETON)
  function CandidateSkeleton() {
    return (
      <div className="w-full space-y-4 my-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white border border-[#EFECE6] rounded-2xl p-4 shadow-xs animate-pulse flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-7 h-7 bg-slate-200 rounded-lg"></div>
              <div className="w-24 h-4 bg-slate-100 rounded-full"></div>
            </div>
            
            <div className="w-full h-44 bg-slate-200 rounded-xl mb-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            </div>

            <div className="h-5 bg-slate-200 rounded-md w-3/4 mb-2"></div>
            <div className="h-3.5 bg-slate-100 rounded-md w-1/2 mb-4"></div>

            <div className="w-full h-11 bg-slate-200 rounded-xl mt-2"></div>
          </div>
        ))}
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

      {/* HEADER HALAMAN /VOTE */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between py-3 px-1">
        <div className="flex items-center gap-3">
          {/* LOGO MURNI TANPA KOTAK BINGKAI */}
          <img 
            src="/candidate/image-logo-Pemira.png" 
            alt="Logo Pemira" 
            className="w-9 h-9 object-contain shrink-0"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('image-logo-Pemira.png')) {
                target.src = '/image-logo-Pemira.png';
              }
            }}
          />
          <div>
            <h1 className="text-xs font-bold text-slate-900 tracking-tight leading-none">
              PEMIRA UBTH 2026
            </h1>
            <p className="text-[10px] font-medium text-slate-500 tracking-wide mt-1">
              KOMISI PEMILIHAN RAYA
            </p>
          </div>
        </div>

        {/* SESI WAKTU TANPA TITIK LINGKARAN INDIKATOR */}
        <div className="text-right">
          <span className="text-xs font-bold text-rose-600 font-mono">
            Sesi: {formatTime(timeLeft)}
          </span>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 py-6 overflow-x-hidden flex flex-col items-center justify-center">
        {/* =========================================================================
            1. TAHAP: BOOTH_ROUTING (ARAHAN BILIK SUARA FISIK)
            ========================================================================= */}
        {step === 'BOOTH_ROUTING' && (
          <div className="w-full max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95">
            <div>
              <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase text-center mb-4">
                ARAHAN BILIK SUARA FISIK
              </p>
              <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-6 text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  Silakan Segera Menuju <span className="text-blue-600 font-extrabold">BILIK {assignedBooth?.booth_number || 1}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-2">
                  Bilik nomor {assignedBooth?.booth_number || 1} telah dikunci sementara khusus untuk sesi Anda.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-left text-xs text-amber-800 space-y-1">
              <strong className="text-amber-900 block font-bold">Petunjuk Pemilih:</strong>
              <p>
                Segera berjalan menuju <strong>Bilik {assignedBooth?.booth_number || 1}</strong>. Setelah Anda berada di depan bilik fisik, tekan tombol di bawah untuk membuka formulir verifikasi DPT.
              </p>
            </div>

            {/* TOMBOL TUNGGAL: [ Saya Sudah Berada di Bilik ] */}
            <button
              onClick={() => {
                triggerFullscreenMode();
                handleArrivedAtBooth();
              }}
              className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 cursor-pointer active:scale-95"
            >
              <span>Saya Sudah Berada di Bilik</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            2. TAHAP: IDENTITAS (VERIFIKASI DATA DPT RESMI)
            ========================================================================= */}
        {step === 'IDENTITAS' && (
          <div className="w-full max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 animate-in fade-in">
            {/* Header Tahapan */}
            <div className="mb-3">
              <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase">
                TAHAP 1: IDENTITAS PEMILIH
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Verifikasi Hak Suara DPT
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Masukkan data diri resmi Anda Universitas Bakti Tunas Husada.
              </p>
            </div>

            <div className="bg-[#FAF8F4] border border-[#EFECE6] rounded-2xl p-4 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3.5">
                {/* IKON MONITOR MURNI TANPA KOTAK WRAPPER */}
                <svg 
                  className="w-6 h-6 text-slate-700 shrink-0" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={1.8}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                  />
                </svg>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    BILIK AKTIF
                  </span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    Bilik {assignedBooth?.booth_number || 1}
                  </span>
                </div>
              </div>

              {/* ELEMEN KANAN (TITIK HIJAU DAN TEKS TERKUNCI KHUSUS ANDA) DIHAPUS SEPENUHNYA */}
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
                  Nama Lengkap  <span className="text-rose-500">*</span>
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
                  onClick={() => setStep('BOOTH_ROUTING')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  ← Kembali ke Panduan Bilik
                </button>

                <button
                  type="submit"
                  onClick={() => triggerFullscreenMode()}
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

              {/* Opsi Penutup di Bawah Tombol di Dalam Kartu */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Engineered by <strong className="text-slate-600 font-semibold">Sagit Faturrakhman</strong></span>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            3. TAHAP: VOTE_BEM (SURAT SUARA 1 DARI 2: BEM UNIVERSITAS)
            ========================================================================= */}
        {step === 'VOTE_BEM' && (
          <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 animate-in fade-in">
            {/* Header Tahapan */}
            <div className="mb-3">
              <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase">
                SURAT SUARA 1 DARI 2
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Surat Suara 1 dari 2: Pemilihan Presiden BEM Universitas
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pemilih Sah: <strong>{verifiedVoter?.name || inputName}</strong> ({verifiedVoter?.nim || inputNim}) • Silakan tentukan satu pasangan calon Presiden &amp; Wakil Presiden BEM.
                </p>
              </div>
              <span className="self-start sm:self-center text-xs font-black px-3 py-1.5 rounded-full bg-slate-900 text-white uppercase tracking-wider">
                BEM-U
              </span>
            </div>

            {/* DAFTAR PASLON BEM */}
            {isLoadingCandidates ? (
              <div className="w-full">
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-semibold py-3">
                  <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
                  <span>Memuat Surat Suara Resmi...</span>
                </div>
                <CandidateSkeleton />
              </div>
            ) : bemCandidates.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-6 text-center my-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Informasi Pemilihan</p>
                <p className="text-sm font-semibold text-slate-800 mb-1">Pasangan Calon BEM Belum Didaftarkan</p>
                <p className="text-xs text-slate-500">Panitia KPUM belum menginput pasangan calon Presiden BEM ke database sistem.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {bemCandidates.map((cand: any) => {
                  const isSelected = selectedBem && String(selectedBem.id) === String(cand.id);
                  const displayPhoto = candidatePhotos[cand.id] || cand?.photoUrl || cand?.photo_url || cand?.image_url;
                  const displayName = cand?.leaderName || cand?.leader_name || cand?.name || 'Kandidat';
                  const displayVice = cand?.viceLeaderName || cand?.vice_leader_name || '';
                  const displayNumber = cand?.candidate_number ?? cand?.candidateNumber ?? cand?.number ?? '01';

                  return (
                    <div
                      key={String(cand?.id || displayNumber)}
                      onClick={() => {
                        setSelectedBem(cand);
                        setSelectedBemId(String(cand.id));
                      }}
                      className={`rounded-3xl border-2 p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 ring-4 ring-blue-600/15 shadow-xl scale-[1.01]'
                          : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                          <div>
                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-wide block">
                              Nomor Urut {displayNumber}
                            </span>
                            <h4 className="text-base font-black text-slate-900 mt-0.5">
                              {displayName} {displayVice ? `& ${displayVice}` : ''}
                            </h4>
                            <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-2">
                              &ldquo;{cand?.tagline || cand?.slogan || 'Inovatif, Transparan, dan Berdaya Saing'}&rdquo;
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {displayNumber}
                          </div>
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[150px] w-full mx-auto bg-slate-100 flex items-center justify-center relative shadow-xs mb-4">
                          {displayPhoto ? (
                            <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover object-top" />
                          ) : (
                            <div className="text-center p-3 flex flex-col items-center justify-center h-full w-full">
                              <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mb-1.5 font-black text-sm shadow-xs">
                                {displayNumber}
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Paslon {displayNumber}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium animate-pulse mt-0.5">
                                Memuat Foto Resmi...
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const candWithPhoto = {
                                ...cand,
                                image_url: candidatePhotos[cand.id] || cand.image_url,
                                photoUrl: candidatePhotos[cand.id] || cand.photoUrl,
                              };
                              setDetailModalCandidate(candWithPhoto);
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
                          <div className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-full shadow-md flex items-center justify-center gap-2 text-xs">
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Terpilih sebagai Pilihan Anda</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBem(cand);
                              setSelectedBemId(String(cand.id));
                            }}
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
            )}

            {/* FOOTER AKSI VOTE_BEM */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep('IDENTITAS')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                ← Ubah Data Pemilih
              </button>

              {/* WAJIB VALIDASI: disabled={!selectedBem} */}
              <button
                type="button"
                onClick={() => setStep('VOTE_HIMA')}
                disabled={!selectedBem}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${
                  !selectedBem
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 cursor-pointer active:scale-95'
                }`}
              >
                <span>Lanjut ke Pemilihan HIMA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Watermark Penutup di Bawah Tombol di Dalam Kartu */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Engineered by <strong className="text-slate-600 font-semibold">Sagit Faturrakhman</strong></span>
            </div>
          </div>
        )}

        {/* =========================================================================
            4. TAHAP: VOTE_HIMA (SURAT SUARA 2 DARI 2: HIMA LINGKUP FAKULTAS)
            ========================================================================= */}
        {step === 'VOTE_HIMA' && (
          <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 animate-in fade-in">
            {/* Header Tahapan */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase block mb-1">
                SURAT SUARA 2 DARI 2
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Surat Suara 2 dari 2: Pemilihan Himpunan Mahasiswa (HIMA)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Program Studi:{' '}
                    <span className="font-semibold text-slate-700">{verifiedVoter?.prodi || voterProdi}</span>
                  </p>
                </div>
                <span className="self-start sm:self-center text-xs font-bold px-3 py-1.5 rounded-full bg-[#0F172A] text-white tracking-wider">
                  HIMA {verifiedVoter?.prodi || voterProdi}
                </span>
              </div>
            </div>

            {/* JIKA SEDANG LOADING ATAU TIDAK ADA PASLON HIMA TERDAFTAR */}
            {isLoadingCandidates ? (
              <div className="w-full">
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-semibold py-3">
                  <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
                  <span>Memuat Surat Suara Resmi...</span>
                </div>
                <CandidateSkeleton />
              </div>
            ) : prodiHimaCandidates.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center my-6 space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
                  <Info className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase bg-slate-200/60 px-3 py-1 rounded-full inline-block">
                    PEMBERITAHUAN RESMI KPUM
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                    Tidak Ada Pasangan Calon HIMA Terdaftar
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Berdasarkan penetapan resmi Komisi Pemilihan Umum Mahasiswa (KPUM), Program Studi{' '}
                    <strong className="text-slate-900 font-semibold">{verifiedVoter?.prodi || voterProdi}</strong> tidak memiliki pasangan calon Himpunan Mahasiswa (HIMA) yang berkontestasi pada periode pemilihan ini.
                  </p>
                  <p className="text-xs text-slate-500 italic">
                    Hak suara Anda dialihkan secara sah dan penuh untuk Pemilihan Presiden BEM Universitas.
                  </p>
                </div>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHima(null);
                      setSelectedHimaId('');
                      setStep('REVIEW_CONFIRM');
                    }}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-lg shadow-slate-900/20 cursor-pointer active:scale-95 transition-all"
                  >
                    <span>Lanjut ke Konfirmasi Akhir (BEM)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prodiHimaCandidates.map((cand: any) => {
                    const isSelected = selectedHima && String(selectedHima.id) === String(cand.id);
                    const displayPhoto = candidatePhotos[cand.id] || cand?.photoUrl || cand?.photo_url || cand?.image_url;
                    const displayName = cand?.leaderName || cand?.leader_name || cand?.name || 'Kandidat';
                    const displayVice = cand?.viceLeaderName || cand?.vice_leader_name || '';
                    const displayNumber = cand?.candidate_number ?? cand?.candidateNumber ?? cand?.number ?? '01';
                    const candProdi = cand?.prodi || cand?.hima_name || cand?.prodi_name || '';

                    return (
                      <div
                        key={String(cand?.id || displayNumber)}
                        onClick={() => {
                          setSelectedHima(cand);
                          setSelectedHimaId(String(cand.id));
                        }}
                        className={`rounded-3xl border-2 p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 ring-4 ring-blue-600/15 shadow-xl scale-[1.01]'
                            : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
                            <div>
                              <span className="text-[11px] font-black text-blue-600 uppercase tracking-wide block">
                                Nomor Urut {displayNumber}: Paslon HIMA
                              </span>
                              <h4 className="text-base font-black text-slate-900 mt-1">
                                {displayName} {displayVice ? `& ${displayVice}` : ''}
                              </h4>
                              {candProdi && (
                                <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                                  {candProdi}
                                </p>
                              )}
                              <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-2">
                                &ldquo;{cand?.tagline || cand?.slogan || 'Sinergi dan Prestasi untuk Program Studi'}&rdquo;
                              </p>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {displayNumber}
                            </div>
                          </div>

                          <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[3/4] max-w-[150px] w-full mx-auto bg-slate-100 flex items-center justify-center relative shadow-xs mb-3">
                            {displayPhoto ? (
                              <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover object-top" />
                            ) : (
                              <div className="text-center p-3 flex flex-col items-center justify-center h-full w-full">
                                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mb-1.5 font-black text-sm shadow-xs">
                                  {displayNumber}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                  Paslon {displayNumber}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium animate-pulse mt-0.5">
                                  Memuat Foto Resmi...
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const candWithPhoto = {
                                  ...cand,
                                  image_url: candidatePhotos[cand.id] || cand.image_url,
                                  photoUrl: candidatePhotos[cand.id] || cand.photoUrl,
                                };
                                setDetailModalCandidate(candWithPhoto);
                                setIsDetailModalOpen(true);
                              }}
                              className="text-xs font-bold text-slate-700 hover:text-slate-950 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Visi &amp; Misi Resmi</span>
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          {isSelected ? (
                            <div className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-full shadow-md flex items-center justify-center gap-2 text-xs">
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Terpilih sebagai Pilihan Anda</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHima(cand);
                                setSelectedHimaId(String(cand.id));
                              }}
                              className="w-full bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-600 hover:bg-slate-50 font-bold py-2 px-4 rounded-full text-xs transition-colors cursor-pointer"
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
            )}

            {/* FOOTER AKSI VOTE_HIMA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep('VOTE_BEM')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                ← Kembali ke Pemilihan BEM
              </button>

              {/* WAJIB VALIDASI: disabled={!selectedHima} jika paslon ada */}
              <button
                type="button"
                onClick={() => {
                  if (prodiHimaCandidates.length === 0) {
                    setSelectedHima(null);
                    setSelectedHimaId('');
                  }
                  setStep('REVIEW_CONFIRM');
                }}
                disabled={prodiHimaCandidates.length > 0 && !selectedHima}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${
                  prodiHimaCandidates.length > 0 && !selectedHima
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 cursor-pointer active:scale-95'
                }`}
              >
                <span>
                  {prodiHimaCandidates.length === 0 ? 'Lanjut ke Konfirmasi Akhir (BEM)' : 'Lanjut ke Konfirmasi Akhir'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Watermark Penutup di Bawah Tombol di Dalam Kartu */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Engineered by <strong className="text-slate-600 font-semibold">Sagit Faturrakhman</strong></span>
            </div>
          </div>
        )}

        {/* =========================================================================
            5. TAHAP: REVIEW_CONFIRM (TINJAU PILIHAN BERDAMPINGAN & KONFIRMASI)
            ========================================================================= */}
        {step === 'REVIEW_CONFIRM' && (
          <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            {/* Header Tahapan */}
            <div className="mb-3">
              <span className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase">
                KONFIRMASI AKHIR
              </span>
            </div>

            <div className="text-center space-y-1 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Tinjau Pilihan Suara Anda
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Pastikan pilihan Anda telah sesuai sebelum surat suara dimasukkan secara sah ke dalam kotak suara digital.
              </p>
            </div>

            {/* RINGKASAN BERDAMPINGAN: BEM & HIMA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* KARTU 1: PILIHAN BEM */}
              <div className="rounded-3xl border-2 border-slate-900/40 bg-slate-50/60 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      1. Pilihan Presiden BEM
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-white">
                      BEM-U
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-20 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center shadow-xs">
                      {selectedBem?.photoUrl || selectedBem?.photo_url || selectedBem?.image_url ? (
                        <img
                          src={selectedBem?.photoUrl || selectedBem?.photo_url || selectedBem?.image_url}
                          alt="Foto BEM"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs">
                          {selectedBem?.candidate_number ?? selectedBem?.candidateNumber ?? selectedBem?.number ?? '01'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-blue-600 uppercase">
                        Nomor Urut {selectedBem?.candidate_number ?? selectedBem?.candidateNumber ?? selectedBem?.number ?? '01'}
                      </span>
                      <h4 className="text-base font-black text-slate-900 leading-snug">
                        {selectedBem?.leaderName || selectedBem?.leader_name || selectedBem?.name || 'Kandidat BEM'}
                        {selectedBem?.viceLeaderName || selectedBem?.vice_leader_name
                          ? ` & ${selectedBem?.viceLeaderName || selectedBem?.vice_leader_name}`
                          : ''}
                      </h4>
                      <p className="text-xs text-slate-500 italic line-clamp-2">
                        &ldquo;{selectedBem?.tagline || selectedBem?.slogan || 'Inovatif, Transparan, dan Berdaya Saing'}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Siap Dimasukkan ke Kotak Suara</span>
                </div>
              </div>

              {/* KARTU 2: PILIHAN HIMA */}
              <div className={`rounded-3xl border-2 p-6 flex flex-col justify-between shadow-sm ${
                selectedHima
                  ? 'border-blue-600/40 bg-blue-50/40'
                  : 'border-slate-200 bg-slate-50/60'
              }`}>
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      2. Pilihan Ketua Himpunan ({verifiedVoter?.prodi || voterProdi})
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      selectedHima ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
                    }`}>
                      HIMA
                    </span>
                  </div>

                  {selectedHima && selectedHima.id !== 'none' ? (
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-24 rounded-2xl overflow-hidden border border-blue-200 bg-white shrink-0 flex items-center justify-center shadow-xs">
                        {selectedHima?.photoUrl || selectedHima?.photo_url || selectedHima?.image_url ? (
                          <img
                            src={selectedHima?.photoUrl || selectedHima?.photo_url || selectedHima?.image_url}
                            alt="Foto HIMA"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {selectedHima?.candidate_number ?? selectedHima?.candidateNumber ?? selectedHima?.number ?? '01'}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-blue-600 uppercase">
                          Nomor Urut {selectedHima?.candidate_number ?? selectedHima?.candidateNumber ?? selectedHima?.number ?? '01'}
                        </span>
                        <h4 className="text-base font-black text-slate-900 leading-snug">
                          {selectedHima?.leaderName || selectedHima?.leader_name || selectedHima?.name || 'Kandidat HIMA'}
                          {selectedHima?.viceLeaderName || selectedHima?.vice_leader_name
                            ? ` & ${selectedHima?.viceLeaderName || selectedHima?.vice_leader_name}`
                            : ''}
                        </h4>
                        <p className="text-xs text-slate-500 italic line-clamp-2">
                          &ldquo;{selectedHima?.tagline || selectedHima?.slogan || 'Sinergi dan Prestasi untuk Program Studi'}&rdquo;
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/70 border border-slate-200 text-center space-y-1">
                      <p className="text-xs font-medium text-slate-500">
                        HIMA: Tidak ada paslon terdaftar untuk {verifiedVoter?.prodi || voterProdi} (Hak suara dilewati)
                      </p>
                    </div>
                  )}
                </div>
                {selectedHima ? (
                  <div className="mt-4 pt-3 border-t border-blue-200/80 flex items-center gap-1.5 text-xs text-blue-700 font-bold">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Siap Dimasukkan ke Kotak Suara</span>
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Info className="w-4 h-4" />
                    <span>Hak suara dilewati</span>
                  </div>
                )}
              </div>
            </div>

            {/* TEKS PERNYATAAN INTEGRITAS & HAK SUARA */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 flex items-start gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed font-medium">
                <strong>Pernyataan Integritas Pemilih:</strong> Pastikan pilihan Anda telah sesuai. Setelah tombol kirim ditekan, hak suara Anda terekam permanen dan tidak dapat diubah.
              </div>
            </div>

            {/* TOMBOL AKSI: UBAH PILIHAN ATAU KIRIM SUARA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep('VOTE_BEM')}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl border-2 border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ← Ubah Pilihan
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalConfirmVote}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-black shadow-lg shadow-slate-900/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Memasukkan ke Kotak Suara...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Kirim &amp; Masukkan ke Kotak Suara</span>
                  </>
                )}
              </button>
            </div>

            {/* Watermark Penutup di Bawah Tombol di Dalam Kartu */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Engineered by <strong className="text-slate-600 font-semibold">Sagit Faturrakhman</strong></span>
            </div>
          </div>
        )}

        {/* =========================================================================
            6. TAHAP: SUCCESS (LAYAR SUKSES FORMAL TANPA EMOJI)
            ========================================================================= */}
        {step === 'SUCCESS' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xl max-w-md mx-auto animate-in fade-in zoom-in-95">
            <div className="flex flex-col items-center text-center py-6 px-4">
              {/* Ikon Ceklis Minimalis Resmi */}
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <p className="text-[11px] font-bold tracking-widest text-emerald-600 uppercase mb-2">
                Suara Berhasil Direkam
              </p>

              <h2 className="text-lg font-bold text-slate-800 leading-snug mb-3 max-w-xs">
                Terima Kasih Atas Partisipasi Anda
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mb-6">
                Hak suara Anda dalam Pemilihan Raya Mahasiswa Universitas Bakti Tunas Husada Tahun 2026 telah tersimpan secara resmi dan terverifikasi ke dalam sistem tabulasi suara digital.
              </p>

              <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-left mb-6">
                <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200/50">
                  <span className="text-slate-400">Nama Pemilih</span>
                  <span className="font-semibold text-slate-700">{verifiedVoter?.name || inputName || 'Pemilih'}</span>
                </div>
                <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200/50">
                  <span className="text-slate-400">NIM</span>
                  <span className="font-mono text-slate-700">{verifiedVoter?.nim || inputNim || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-slate-400">Program Studi</span>
                  <span className="font-medium text-slate-700">{verifiedVoter?.prodi || voterProdi || '-'}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mb-6">
                Silakan tinggalkan bilik suara dengan tertib. Halaman ini akan tertutup otomatis.
              </p>

              {/* Watermark Konsisten di Bagian Bawah Kartu */}
              <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Engineered by <strong className="text-slate-600 font-semibold">Sagit Faturrakhman</strong></span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER RESMI */}
      <footer className="w-full py-4 mt-auto text-center">
        <p className="text-[11px] text-slate-400 font-medium tracking-wide">
          KOMISI PEMILIHAN RAYA • UNIVERSITAS BAKTI TUNAS HUSADA TASIKMALAYA 2026
        </p>
      </footer>

      {/* Visi Misi Modal */}
      <VisiMisiModal
        candidate={detailModalCandidate}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSelectCandidate={() => {
          if (detailModalCandidate?.id) {
            if (detailModalCandidate?.type === 'BEM' || detailModalCandidate?.category === 'BEM') {
              setSelectedBem(detailModalCandidate);
              setSelectedBemId(String(detailModalCandidate.id));
            } else {
              setSelectedHima(detailModalCandidate);
              setSelectedHimaId(String(detailModalCandidate.id));
            }
          }
        }}
        isSelected={
          detailModalCandidate?.id
            ? (selectedBem && String(selectedBem.id) === String(detailModalCandidate.id)) ||
              (selectedHima && String(selectedHima.id) === String(detailModalCandidate.id))
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
