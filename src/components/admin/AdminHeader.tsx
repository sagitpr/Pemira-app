'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/context/AdminContext';
import {
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  User,
  ChevronDown,
  LogOut,
} from 'lucide-react';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export default function AdminHeader({
  title = 'Selamat Datang, Admin KPUM',
  subtitle = 'Pusat kendali bilik suara, data pemilih, dan rekapitulasi real-time.',
  actionButton,
}: AdminHeaderProps) {
  const { currentAdmin, logout } = useAdmin();
  const [isSensorActive, setIsSensorActive] = useState(false);
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
    <header className="h-20 bg-white/60 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Title & Subtitle */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {title}
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Pemilihan Aktif</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {actionButton}

        {/* Sensor Suara Button */}
        <button
          onClick={() => setIsSensorActive(!isSensorActive)}
          className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
            isSensorActive
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
          }`}
          title="Sensor/Sensor Tampilan Suara"
        >
          {isSensorActive ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
          <span>{isSensorActive ? 'Suara Disensor' : 'Sensor Suara'}</span>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          title="Layar Penuh"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs"
          >
            <div className="w-7 h-7 rounded-full bg-[#0284c7] text-white flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">
              {currentAdmin?.name || 'Admin KPUM'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 text-xs">
                <p className="font-bold text-slate-900">{currentAdmin?.name || 'Admin KPUM'}</p>
                <p className="text-[10px] text-slate-500 font-mono">{currentAdmin?.email || 'admin@pemira2026.ac.id'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
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
