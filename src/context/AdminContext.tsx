'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BEM_CANDIDATES, HIMA_CANDIDATES, FACULTIES_DATA, Candidate } from '@/data/voteMockData';
import { createClient } from '@/lib/supabase/client';
import {
  GLOBAL_REKAP_SUMMARY,
  BEM_REKAP_RESULTS,
  PRODI_REKAP_LIST,
  PaslonResult,
  ProdiRekap,
  GlobalRekapSummary,
} from '@/data/mockRekapData';

export interface Voter {
  id: string;
  nim: string;
  name: string;
  facultyId: 'FTB' | 'FIKES' | 'FARMASI';
  prodiId: string;
  prodiName: string;
  angkatan: string;
  status: 'belum' | 'memilih' | 'selesai';
  voting_status?: 'BELUM' | 'MENGERJAKAN' | 'SELESAI';
  start_vote_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  votedAt?: string;
  boothId?: string;
}

export interface BoothStatus {
  id: string;
  name: string;
  status: 'Tersedia' | 'Sedang Memilih' | 'Selesai' | 'Offline';
  voterNim?: string;
  voterName?: string;
  prodiName?: string;
  startedAt?: string;
  durationSeconds?: number;
  ipAddress: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: 'KPUM Utama' | 'Saksi Paslon 01' | 'Saksi Paslon 02' | 'Operator Bilik';
  status: 'Aktif' | 'Nonaktif';
  lastActive: string;
}

export interface SystemConfig {
  electionName: string;
  universityName: string;
  electionYear: string;
  electionStatus: 'Dibuka' | 'Dijeda' | 'Ditutup';
  totalBooths: number;
  sessionTimeoutSeconds: number;
  allowAbstain: boolean;
  showLiveCountToPublic: boolean;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AdminContextType {
  // Auth
  currentAdmin: AdminAccount | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;

  // DPT
  voters: Voter[];
  addVoter: (voter: Omit<Voter, 'id'>) => void | Promise<void>;
  deleteVoter: (id: string) => void | Promise<void>;
  updateVoterStatus: (id: string, status: Voter['status'], boothId?: string) => void;
  resetAllVoters: () => void;

  // Paslon
  bemCandidates: Candidate[];
  himaCandidates: Candidate[];
  addCandidate: (candidate: Candidate) => void | Promise<void>;
  updateCandidate: (candidate: Candidate) => void | Promise<void>;
  deleteCandidate: (id: string | number) => void | Promise<void>;

  // Booths
  booths: BoothStatus[];
  updateBoothStatus: (id: string, status: BoothStatus['status'], voterInfo?: Partial<BoothStatus>) => void;
  resetBooth: (id: string) => void;

  // Rekap
  globalSummary: GlobalRekapSummary;
  bemResults: PaslonResult[];
  prodiRekapList: ProdiRekap[];
  resetAllVotes: () => void;
  castVote: (voterNim: string, bemId: string, himaId: string) => void;

  // Config & Admins
  config: SystemConfig;
  updateConfig: (newConfig: Partial<SystemConfig>) => void;
  adminAccounts: AdminAccount[];
  addAdminAccount: (admin: Omit<AdminAccount, 'id'>) => void;
  toggleAdminStatus: (id: string) => void;
  deleteAdminAccount: (id: string) => void;

  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;

  // Sensor & Status
  isSensorActive: boolean;
  setIsSensorActive: (active: boolean) => void;
  toggleSensor: () => void;
  electionStatus: 'AKTIF' | 'JEDA' | 'TUTUP';
  setElectionStatus: (status: 'AKTIF' | 'JEDA' | 'TUTUP') => void;

  // Mobile Sidebar & Menu
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
}

export const MOCK_VOTERS: Voter[] = [];
const INITIAL_VOTERS: Voter[] = [];

// ZERO DUMMY DATA: booth & admin selalu diambil dari database Supabase.
const INITIAL_BOOTHS: BoothStatus[] = [];

const INITIAL_ADMINS: AdminAccount[] = [];

const INITIAL_CONFIG: SystemConfig = {
  electionName: 'PEMIRA UNIVERSITAS BAKTI TUNAS HUSADA 2026',
  universityName: 'Universitas Bakti Tunas Husada',
  electionYear: '2026',
  electionStatus: 'Dibuka',
  totalBooths: 16,
  sessionTimeoutSeconds: 180,
  allowAbstain: false,
  showLiveCountToPublic: true,
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [bemCandidates, setBemCandidates] = useState<Candidate[]>([]);
  const [himaCandidates, setHimaCandidates] = useState<Candidate[]>([]);
  const [booths, setBooths] = useState<BoothStatus[]>(INITIAL_BOOTHS);
  const [bemResults, setBemResults] = useState<PaslonResult[]>([]);
  const [prodiRekapList, setProdiRekapList] = useState<ProdiRekap[]>(PRODI_REKAP_LIST);
  const [globalSummary, setGlobalSummary] = useState<GlobalRekapSummary>(GLOBAL_REKAP_SUMMARY);
  const [config, setConfig] = useState<SystemConfig>(INITIAL_CONFIG);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(INITIAL_ADMINS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSensorActive, setIsSensorActive] = useState<boolean>(false);
  const [electionStatus, setElectionStatusState] = useState<'AKTIF' | 'JEDA' | 'TUTUP'>('AKTIF');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const toggleMobileSidebar = () => setIsMobileSidebarOpen((prev) => !prev);
  const toggleSensor = () => setIsSensorActive((prev) => !prev);

  // ============================================================
  // FETCH DATA ASLI DARI SUPABASE (ZERO DUMMY)
  // Semua data DPT & paslon yang diinput panitia akan langsung
  // tampil di UI: halaman vote, sidebar admin, berita acara, dll.
  // ============================================================
  const fetchVotersFromDb = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('voters')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped: Voter[] = data.map((d: any) => {
          const rawStatus = (d.voting_status || (d.has_voted ? 'SELESAI' : 'BELUM')).toUpperCase();
          const status = rawStatus === 'SELESAI' ? 'selesai' : rawStatus === 'MENGERJAKAN' ? 'memilih' : 'belum';
          return {
            id: String(d.id || d.nim),
            nim: d.nim,
            name: d.nama || d.name,
            facultyId: (d.faculty_id || d.facultyId || 'FTB') as any,
            prodiId: d.prodi_id || d.prodiId || 'general',
            prodiName: d.prodi_name || d.prodi || d.prodiName || 'Program Studi',
            angkatan: d.angkatan || '2026',
            status,
            voting_status: rawStatus as any,
            start_vote_at: d.start_vote_at,
            completed_at: d.completed_at,
            duration_seconds: d.duration_seconds,
            votedAt: d.completed_at || undefined,
            boothId: d.booth_id || undefined,
          };
        });
        setVoters(mapped);
      }
    } catch (e) {
      console.warn('AdminContext fetch voters note:', e);
    }
  };

  const fetchCandidatesFromDb = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('candidate_number', { ascending: true });

      if (!error && Array.isArray(data)) {
        setBemCandidates(data.filter((c: any) => c.type === 'BEM' || c.category === 'BEM'));
        setHimaCandidates(data.filter((c: any) => c.type === 'HIMA' || c.category === 'HIMA'));
      }
    } catch (e) {
      console.warn('AdminContext fetch candidates note:', e);
    }
  };

  // Muat data awal + realtime saat ada perubahan di tabel voters/candidates
  useEffect(() => {
    fetchVotersFromDb();
    fetchCandidatesFromDb();

    const supabase = createClient();
    const channel = supabase
      .channel('admin_context_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, () => {
        fetchVotersFromDb();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        fetchCandidatesFromDb();
      })
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchVotersFromDb();
      fetchCandidatesFromDb();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  const setElectionStatus = async (newStatus: 'AKTIF' | 'JEDA' | 'TUTUP') => {
    setElectionStatusState(newStatus);
    try {
      await fetch('/api/admin/election-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}
    showToast(`Status pemilihan: ${newStatus}`, newStatus === 'AKTIF' ? 'success' : newStatus === 'JEDA' ? 'warning' : 'error');
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/admin/election-status');
        const data = await res.json();
        if (data?.success && data?.status) {
          setElectionStatusState(data.status);
        }
      } catch {}
    };
    fetchStatus();
  }, []);

  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    // Autentikasi murni lewat API resmi (Supabase admin_users, tanpa kredensial hardcode)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setCurrentAdmin({
          id: `adm-${Date.now()}`,
          name: json.user?.name || email,
          email,
          role: (json.user?.role === 'superadmin' ? 'KPUM Utama' : 'Operator Bilik') as any,
          status: 'Aktif',
          lastActive: 'Baru saja',
        });
        showToast(`Selamat datang, ${json.user?.name || 'Admin'}!`, 'success');
        return true;
      }
      showToast(json?.message || 'Kredensial tidak valid.', 'error');
      return false;
    } catch {
      showToast('Kendala jaringan saat login. Silakan coba lagi.', 'error');
      return false;
    }
  };

  const logout = () => {
    setCurrentAdmin(null);
    showToast('Berhasil keluar dari sistem.', 'info');
  };

  const addVoter = async (newVoter: Omit<Voter, 'id'>) => {
    // Tulis ke Supabase agar data baru langsung tersimpan & tampil di semua UI
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('voters')
        .insert([
          {
            nim: newVoter.nim,
            name: newVoter.name,
            nama: newVoter.name,
            faculty_id: newVoter.facultyId,
            faculty: newVoter.facultyId,
            prodi_id: newVoter.prodiId,
            prodi_name: newVoter.prodiName,
            prodi: newVoter.prodiName,
            angkatan: newVoter.angkatan,
            has_voted: false,
            voting_status: 'BELUM',
          },
        ])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const d = data[0] as any;
        setVoters((prev) => [
          {
            id: String(d.id || d.nim),
            nim: d.nim,
            name: d.nama || d.name || newVoter.name,
            facultyId: newVoter.facultyId,
            prodiId: newVoter.prodiId,
            prodiName: newVoter.prodiName,
            angkatan: newVoter.angkatan,
            status: 'belum',
            voting_status: 'BELUM',
          },
          ...prev,
        ]);
      }
      showToast(`DPT ${newVoter.name} (${newVoter.nim}) berhasil ditambahkan ke database.`, 'success');
    } catch (e: any) {
      console.error('Gagal menambah DPT:', e);
      showToast(`Gagal menambah DPT: ${e?.message || 'kendala database'}`, 'error');
    }
  };

  const deleteVoter = async (id: string) => {
    // Id dari context bisa berupa UUID (dari DB) atau NIM. Coba UUID dulu,
    // lalu fallback ke NIM — tanpa hard failure agar UI tetap berjalan.
    try {
      const supabase = createClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const { error } = await supabase.from('voters').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('voters').delete().eq('nim', id);
        if (error) throw error;
      }
      setVoters((prev) => prev.filter((v) => v.id !== id && v.nim !== id));
      showToast('Data pemilih berhasil dihapus dari database.', 'info');
    } catch (e: any) {
      console.error('Gagal menghapus DPT:', e);
      showToast(`Gagal menghapus DPT: ${e?.message || 'kendala database'}`, 'error');
    }
  };

  const updateVoterStatus = (id: string, status: Voter['status'], boothId?: string) => {
    setVoters((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status,
              boothId: boothId || v.boothId,
              votedAt: status === 'selesai' ? new Date().toLocaleTimeString('id-ID') : v.votedAt,
            }
          : v
      )
    );
  };

  const resetAllVoters = () => {
    setVoters((prev) => prev.map((v) => ({ ...v, status: 'belum', votedAt: undefined, boothId: undefined })));
    showToast('Status semua DPT berhasil di-reset ke "Belum Memilih".', 'warning');
  };

  const addCandidate = async (cand: Candidate) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('candidates')
        .insert([
          {
            type: cand.type,
            category: cand.type,
            candidate_number: cand.candidate_number ?? (typeof cand.number === 'number' ? cand.number : parseInt(String(cand.number || '1'), 10) || 1),
            leader_name: cand.leaderName || cand.leader_name,
            vice_leader_name: cand.viceLeaderName || cand.vice_leader_name,
            faculty_id: cand.facultyId || cand.faculty_id,
            prodi_id: cand.prodiId || cand.prodi_id,
            prodi_name: (cand as any).prodiName || (cand as any).prodi_name || null,
            photo_url: cand.photoUrl || cand.photo_url || null,
            vision: cand.vision || cand.visi || null,
            mission: Array.isArray(cand.mission) ? cand.mission.join('|') : (cand.mission || (Array.isArray(cand.misi) ? cand.misi.join('|') : null)),
            tagline: cand.tagline || cand.slogan || null,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const saved = data[0] as any;
        if (cand.type === 'BEM') {
          setBemCandidates((prev) => [...prev, saved as Candidate]);
        } else {
          setHimaCandidates((prev) => [...prev, saved as Candidate]);
        }
      }
      showToast(`Paslon ${cand.number} (${cand.leaderName || ''}) berhasil ditambahkan ke database.`, 'success');
    } catch (e: any) {
      console.error('Gagal menambah paslon:', e);
      showToast(`Gagal menambah paslon: ${e?.message || 'kendala database'}`, 'error');
    }
  };

  const updateCandidate = async (cand: Candidate) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('candidates')
        .update({
          leader_name: cand.leaderName || cand.leader_name,
          vice_leader_name: cand.viceLeaderName || cand.vice_leader_name,
          tagline: cand.tagline || cand.slogan || null,
          photo_url: cand.photoUrl || cand.photo_url || null,
        })
        .eq('id', String(cand.id))
        .select();

      if (error) throw error;

      const saved = (data?.[0] || cand) as Candidate;
      if (cand.type === 'BEM') {
        setBemCandidates((prev) => prev.map((c) => (String(c.id) === String(cand.id) ? saved : c)));
      } else {
        setHimaCandidates((prev) => prev.map((c) => (String(c.id) === String(cand.id) ? saved : c)));
      }
      showToast(`Data paslon ${cand.number} diperbarui di database.`, 'success');
    } catch (e: any) {
      console.error('Gagal memperbarui paslon:', e);
      showToast(`Gagal memperbarui paslon: ${e?.message || 'kendala database'}`, 'error');
    }
  };

  const deleteCandidate = async (id: string | number) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('candidates').delete().eq('id', String(id));
      if (error) throw error;
      setBemCandidates((prev) => prev.filter((c) => String(c.id) !== String(id)));
      setHimaCandidates((prev) => prev.filter((c) => String(c.id) !== String(id)));
      showToast('Paslon berhasil dihapus dari database.', 'info');
    } catch (e: any) {
      console.error('Gagal menghapus paslon:', e);
      showToast(`Gagal menghapus paslon: ${e?.message || 'kendala database'}`, 'error');
    }
  };

  const updateBoothStatus = (id: string, status: BoothStatus['status'], voterInfo?: Partial<BoothStatus>) => {
    setBooths((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status, ...voterInfo } : b))
    );
  };

  const resetBooth = (id: string) => {
    setBooths((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'Tersedia',
              voterNim: undefined,
              voterName: undefined,
              prodiName: undefined,
              startedAt: undefined,
              durationSeconds: undefined,
            }
          : b
      )
    );
    showToast(`Bilik direset ke status Tersedia.`, 'info');
  };

  const resetAllVotes = () => {
    setBemResults((prev) =>
      prev.map((p) => ({ ...p, votes: 0, percentage: 0, isLeading: false }))
    );
    setProdiRekapList((prev) =>
      prev.map((pr) => ({
        ...pr,
        suaraMasuk: 0,
        partisipasi: 0,
        abstain: 0,
        paslonList: pr.paslonList.map((p) => ({ ...p, votes: 0, percentage: 0, isLeading: false })),
      }))
    );
    setGlobalSummary((prev) => ({
      ...prev,
      suaraMasuk: 0,
      belumMemilih: prev.totalDpt,
      tingkatPartisipasi: 0,
      lastUpdated: new Date().toLocaleTimeString('id-ID'),
    }));
    resetAllVoters();
    showToast('Seluruh suara berhasil dinolkan (Kondisi Awal Pemilihan).', 'warning');
  };

  const castVote = (voterNim: string, bemId: string, himaId: string) => {
    // Increment BEM
    setBemResults((prev) => {
      const next = prev.map((p) => (p.id === bemId ? { ...p, votes: p.votes + 1 } : p));
      const total = next.reduce((sum, item) => sum + item.votes, 0);
      const maxVotes = Math.max(...next.map((p) => p.votes));
      return next.map((p) => ({
        ...p,
        percentage: total > 0 ? Number(((p.votes / total) * 100).toFixed(1)) : 0,
        isLeading: p.votes === maxVotes && maxVotes > 0,
      }));
    });

    // Increment HIMA
    setProdiRekapList((prev) =>
      prev.map((pr) => {
        const hasPaslon = pr.paslonList.some((p) => p.id === himaId);
        if (!hasPaslon) return pr;

        const updatedPaslon = pr.paslonList.map((p) =>
          p.id === himaId ? { ...p, votes: p.votes + 1 } : p
        );
        const newSuaraMasuk = pr.suaraMasuk + 1;
        const totalVotes = updatedPaslon.reduce((s, p) => s + p.votes, 0);
        const maxVotes = Math.max(...updatedPaslon.map((p) => p.votes));

        return {
          ...pr,
          suaraMasuk: newSuaraMasuk,
          partisipasi: Number(((newSuaraMasuk / pr.totalDpt) * 100).toFixed(1)),
          paslonList: updatedPaslon.map((p) => ({
            ...p,
            percentage: totalVotes > 0 ? Number(((p.votes / totalVotes) * 100).toFixed(1)) : 0,
            isLeading: p.votes === maxVotes && maxVotes > 0,
          })),
        };
      })
    );

    // Global
    setGlobalSummary((prev) => {
      const nextSuara = prev.suaraMasuk + 1;
      const nextBelum = Math.max(0, prev.totalDpt - nextSuara);
      return {
        ...prev,
        suaraMasuk: nextSuara,
        belumMemilih: nextBelum,
        tingkatPartisipasi: Number(((nextSuara / prev.totalDpt) * 100).toFixed(1)),
        lastUpdated: new Date().toLocaleTimeString('id-ID'),
      };
    });

    // Update voter status
    const target = voters.find((v) => v.nim === voterNim);
    if (target) {
      updateVoterStatus(target.id, 'selesai');
    }
  };

  const updateConfig = (newConfig: Partial<SystemConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
    showToast('Konfigurasi sistem berhasil disimpan.', 'success');
  };

  const addAdminAccount = (admin: Omit<AdminAccount, 'id'>) => {
    const id = `adm-${Date.now()}`;
    setAdminAccounts((prev) => [...prev, { ...admin, id }]);
    showToast(`Akun admin ${admin.name} berhasil ditambahkan.`, 'success');
  };

  const toggleAdminStatus = (id: string) => {
    setAdminAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === 'Aktif' ? 'Nonaktif' : 'Aktif' } : a))
    );
  };

  const deleteAdminAccount = (id: string) => {
    setAdminAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast('Akun admin berhasil dihapus.', 'info');
  };

  return (
    <AdminContext.Provider
      value={{
        currentAdmin,
        isAuthenticated: !!currentAdmin,
        login,
        logout,
        voters,
        addVoter,
        deleteVoter,
        updateVoterStatus,
        resetAllVoters,
        bemCandidates,
        himaCandidates,
        addCandidate,
        updateCandidate,
        deleteCandidate,
        booths,
        updateBoothStatus,
        resetBooth,
        globalSummary,
        bemResults,
        prodiRekapList,
        resetAllVotes,
        castVote,
        config,
        updateConfig,
        adminAccounts,
        addAdminAccount,
        toggleAdminStatus,
        deleteAdminAccount,
        toasts,
        showToast,
        isSensorActive,
        setIsSensorActive,
        toggleSensor,
        electionStatus,
        setElectionStatus,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toggleMobileSidebar,
        isMobileMenuOpen: isMobileSidebarOpen,
        setIsMobileMenuOpen: setIsMobileSidebarOpen,
        toggleMobileMenu: toggleMobileSidebar,
      }}
    >
      {children}

      {/* Floating Toasts Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all transform animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2.5 ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-700/60'
                : toast.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-700/60'
                : toast.type === 'warning'
                ? 'bg-amber-950 text-amber-100 border-amber-700/60'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                toast.type === 'success'
                  ? 'bg-emerald-400'
                  : toast.type === 'error'
                  ? 'bg-rose-400'
                  : toast.type === 'warning'
                  ? 'bg-amber-400'
                  : 'bg-sky-400'
              }`}
            />
            {toast.message}
          </div>
        ))}
      </div>
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
