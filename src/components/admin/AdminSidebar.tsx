'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/common/AppLogo';
import { useAdmin } from '@/context/AdminContext';
import {
  LayoutGrid,
  Clock,
  Users,
  UserCheck,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { voters, logout } = useAdmin();

  // Bilik token countdown timer for the bottom status card
  const [windowTimer, setWindowTimer] = useState(165);

  useEffect(() => {
    const timer = setInterval(() => {
      setWindowTimer((prev) => (prev <= 1 ? 180 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatWindowTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const MENU_ITEMS = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/admin/rekap', label: 'Rekap Suara', icon: Clock },
    { href: '/admin/dpt', label: 'DPT & Pemilih', icon: Users, badge: voters.length.toString() },
    { href: '/admin/paslon', label: 'Kelola Paslon', icon: UserCheck },
    { href: '/admin/pengaturan', label: 'Pengaturan & Reset', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-50/70 border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Top Section */}
      <div className="p-4">
        {/* App Logo */}
        <div className="h-14 px-2 flex items-center mb-6">
          <AppLogo size={38} showText={true} subtitle="ADMIN KPUM" />
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {MENU_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/admin/dashboard' && pathname === '/admin');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0284c7] text-white shadow-md shadow-sky-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Status Card & Bilik Link */}
      <div className="p-4 space-y-3">
        {/* Bilik QR Screen External Shortcut */}
        <Link
          href="/qr-screen"
          target="_blank"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white border border-slate-200/80 transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Layar Bilik QR</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </Link>

        {/* Bilik Suara (Vote) Direct Shortcut */}
        <Link
          href="/vote"
          target="_blank"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#0284c7] hover:text-sky-700 bg-sky-50/70 hover:bg-sky-50 border border-sky-200/80 transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
            <span>Layar Bilik Suara (Vote)</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
        </Link>

        {/* Bottom Card: Pemilihan Aktif & Token Bilik Window */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Pemilihan Aktif</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-2.5">
            Sisa Waktu Token Bilik:
          </p>
          <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-sky-50 text-sky-800 border border-sky-100 text-xs font-bold font-mono">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>{formatWindowTimer(windowTimer)} (Window Aktif)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
