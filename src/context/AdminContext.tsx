'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BEM_CANDIDATES, HIMA_CANDIDATES, FACULTIES_DATA, Candidate } from '@/data/voteMockData';
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
  login: (email: string, pass: string) => boolean;
  logout: () => void;

  // DPT
  voters: Voter[];
  addVoter: (voter: Omit<Voter, 'id'>) => void;
  deleteVoter: (id: string) => void;
  updateVoterStatus: (id: string, status: Voter['status'], boothId?: string) => void;
  resetAllVoters: () => void;

  // Paslon
  bemCandidates: Candidate[];
  himaCandidates: Candidate[];
  addCandidate: (candidate: Candidate) => void;
  updateCandidate: (candidate: Candidate) => void;
  deleteCandidate: (id: string | number) => void;

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
}

export const MOCK_VOTERS: Voter[] = [];
const INITIAL_VOTERS: Voter[] = [];

const INITIAL_BOOTHS: BoothStatus[] = [
  { id: 'b-01', name: 'Bilik 01 (Auditorium)', status: 'Tersedia', ipAddress: '192.168.1.101' },
  { id: 'b-02', name: 'Bilik 02 (Auditorium)', status: 'Tersedia', ipAddress: '192.168.1.102' },
  { id: 'b-03', name: 'Bilik 03 (Gedung B)', status: 'Tersedia', ipAddress: '192.168.1.103' },
  { id: 'b-04', name: 'Bilik 04 (Gedung B)', status: 'Tersedia', ipAddress: '192.168.1.104' },
];

const INITIAL_ADMINS: AdminAccount[] = [
  {
    id: 'adm-01',
    name: 'Admin KPUM Utama',
    email: 'admin@pemira2026.ac.id',
    role: 'KPUM Utama',
    status: 'Aktif',
    lastActive: 'Baru saja',
  },
];

const INITIAL_CONFIG: SystemConfig = {
  electionName: 'PEMIRA UNIVERSITAS BAKTI TUNAS HUSADA 2026',
  universityName: 'Universitas Bakti Tunas Husada',
  electionYear: '2026',
  electionStatus: 'Dibuka',
  totalBooths: 10,
  sessionTimeoutSeconds: 180,
  allowAbstain: false,
  showLiveCountToPublic: true,
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(INITIAL_ADMINS[0]);
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

  const toggleSensor = () => setIsSensorActive((prev) => !prev);

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

  const login = (email: string, pass: string): boolean => {
    // Official admin credentials check
    const cleanEmail = email.trim().toLowerCase();
    const found = adminAccounts.find((a) => a.email.toLowerCase() === cleanEmail && a.status === 'Aktif');

    if (
      (cleanEmail === 'admin@pemira2026.ac.id' && (pass === 'kpum2026#secure' || pass === 'password123' || pass === 'admin123')) ||
      (found && (pass === 'kpum2026#secure' || pass === 'password123' || pass === 'admin123'))
    ) {
      setCurrentAdmin(found || INITIAL_ADMINS[0]);
      showToast(`Selamat datang, ${found ? found.name : 'Admin KPUM Utama'}!`, 'success');
      return true;
    }

    showToast('Kredensial tidak valid. Silakan gunakan akun resmi KPUM.', 'error');
    return false;
  };

  const logout = () => {
    setCurrentAdmin(null);
    showToast('Berhasil keluar dari sistem.', 'info');
  };

  const addVoter = (newVoter: Omit<Voter, 'id'>) => {
    const id = `v-${Date.now()}`;
    setVoters((prev) => [ { ...newVoter, id }, ...prev ]);
    showToast(`DPT ${newVoter.name} (${newVoter.nim}) berhasil ditambahkan.`, 'success');
  };

  const deleteVoter = (id: string) => {
    setVoters((prev) => prev.filter((v) => v.id !== id));
    showToast('Data pemilih berhasil dihapus.', 'info');
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

  const addCandidate = (cand: Candidate) => {
    if (cand.type === 'BEM') {
      setBemCandidates((prev) => [...prev, cand]);
    } else {
      setHimaCandidates((prev) => [...prev, cand]);
    }
    showToast(`Paslon ${cand.number} (${cand.leaderName}) berhasil ditambahkan.`, 'success');
  };

  const updateCandidate = (cand: Candidate) => {
    if (cand.type === 'BEM') {
      setBemCandidates((prev) => prev.map((c) => (c.id === cand.id ? cand : c)));
    } else {
      setHimaCandidates((prev) => prev.map((c) => (c.id === cand.id ? cand : c)));
    }
    showToast(`Data paslon ${cand.number} diperbarui.`, 'success');
  };

  const deleteCandidate = (id: string | number) => {
    setBemCandidates((prev) => prev.filter((c) => String(c.id) !== String(id)));
    setHimaCandidates((prev) => prev.filter((c) => String(c.id) !== String(id)));
    showToast('Paslon berhasil dihapus.', 'info');
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
