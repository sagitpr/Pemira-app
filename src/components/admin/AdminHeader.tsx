'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/context/AdminContext';
import AppLogo from '@/components/common/AppLogo';
import {
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  User,
  ChevronDown,
  LogOut,
  Menu,
} from 'lucide-react';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export default function AdminHeader({
  title,
  subtitle,
  actionButton,
}: AdminHeaderProps) {
  const { currentAdmin, logout, isSensorActive, toggleSensor, electionStatus, toggleMobileSidebar } = useAdmin();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {}
    logout();
    window.location.href = '/admin/login';
  };

  return (
    <header className="h-18 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#EBE7DF] px-3 sm:px-8 flex items-center justify-between sticky top-0 z-20 font-sans max-w-full overflow-hidden">
      {/* Left: Mobile Toggle, Emblem, Title & AKTIF/JEDA/TUTUP Badge */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="md:hidden p-1.5 sm:p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-colors cursor-pointer shrink-0"
          aria-label="Buka navigasi menu"
        >
          <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
        </button>
        <img
          src="/candidate/image/logo-pemira.png"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('/candidates/image/Image-logo-Pemira.png')) {
              target.src = '/candidates/image/Image-logo-Pemira.png';
            } else {
              target.style.display = 'none';
            }
          }}
          alt="Logo Pemira"
          className="h-8 sm:h-12 w-auto object-contain drop-shadow-sm shrink-0"
        />
        <h1 className="text-xs sm:text-base font-black text-slate-900 tracking-tight truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
          {title || 'PEMIRA 2026 – KPR UBTH'}
        </h1>
        <span
          className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold text-white shadow-2xs shrink-0 ${
            electionStatus === 'AKTIF'
              ? 'bg-[#10B981]'
              : electionStatus === 'JEDA'
              ? 'bg-amber-500'
              : 'bg-rose-600'
          }`}
        >
          {electionStatus}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {actionButton}

        {/* Sensor Button */}
        <button
          onClick={toggleSensor}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            isSensorActive
              ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-200'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs'
          }`}
          title="Sensor Tampilan Suara"
        >
          {isSensorActive ? <EyeOff className="h-4 w-4 text-amber-600 shrink-0" /> : <Eye className="h-4 w-4 text-slate-500 shrink-0" />}
          <span className="hidden sm:inline">Sensor Suara</span>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
          title="Layar Penuh"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-2 sm:pr-2.5 py-1 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 transition-colors shadow-2xs cursor-pointer"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="hidden sm:inline text-xs font-bold text-slate-800 truncate max-w-[100px]">
              {currentAdmin?.name || 'Admin KPUM'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 text-xs">
                <p className="font-bold text-slate-900">{currentAdmin?.name || 'Admin KPUM'}</p>
                <p className="text-[10px] text-slate-500 font-mono">{currentAdmin?.email || 'Akun tidak dikenali'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Sistem</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
