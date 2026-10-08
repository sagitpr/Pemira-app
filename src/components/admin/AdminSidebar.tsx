'use client';

import React from 'react';
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
  ExternalLink,
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { voters } = useAdmin();

  const MENU_ITEMS = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/admin/rekap', label: 'Rekap Suara', icon: Clock },
    { href: '/admin/dpt', label: 'DPT & Pemilih', icon: Users, badge: voters.length.toString() },
    { href: '/admin/paslon', label: 'Kelola Paslon', icon: UserCheck },
    { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#F8F6F0]/80 border-r border-[#EBE7DF] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none font-sans">
      {/* Top Section */}
      <div className="p-4">
        {/* App Logo */}
        <div className="h-16 px-2 flex items-center gap-3 mb-6">
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
            className="h-14 w-auto object-contain drop-shadow-sm"
          />
          <div>
            <span className="text-sm font-black text-slate-900 tracking-tight block leading-tight">
              PEMIRA 2026
            </span>
            <span className="text-[10px] font-bold text-[#0284c7] tracking-wider uppercase block">
              KPR UBTH
            </span>
          </div>
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
                    ? 'bg-white text-[#0284c7] shadow-xs border-r-4 border-[#0284c7]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#0284c7]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-sky-50 text-[#0284c7]'
                        : 'bg-slate-100 text-slate-500'
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

      {/* Bottom Section: Shortcuts & Status Card */}
      <div className="p-4 space-y-3">
        {/* External Shortcuts */}
        <div className="space-y-1.5">
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

          <Link
            href="/vote"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#0284c7] hover:text-sky-700 bg-white/70 hover:bg-white border border-sky-200/80 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
              <span>Layar Bilik Suara</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
          </Link>
        </div>

        {/* Bottom Card: Status Bilik AKTIF */}
        <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
            <span>Status Bilik</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981] text-white">
              AKTIF
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Token: 180s Dinamis</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
