'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/common/AppLogo';
import { useAdmin } from '@/context/AdminContext';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Vote,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

const MENU_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/rekap', label: 'Rekap Suara', icon: BarChart3 },
  { href: '/admin/dpt', label: 'DPT & Pemilih', icon: Users },
  { href: '/admin/paslon', label: 'Kelola Paslon', icon: Vote },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { currentAdmin, logout } = useAdmin();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30">
      {/* Top Header */}
      <div>
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <AppLogo size={36} showText={true} />
        </div>

        {/* Section Title */}
        <div className="px-5 pt-5 pb-2">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Menu Utama KPUM
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 space-y-1">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href === '/admin/dashboard' && pathname === '/admin');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold border-r-4 border-sky-600 rounded-r-none'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-sky-700'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Links */}
        <div className="px-5 pt-6 pb-2">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Akses Layar Bilik
          </span>
        </div>
        <div className="px-3">
          <Link
            href="/qr-screen"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-dashed border-slate-200 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Layar Bilik QR
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Bottom Profile & Logout */}
      <div className="p-3 border-t border-slate-100">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentAdmin?.name || 'Admin KPUM'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {currentAdmin?.role || 'KPUM Utama'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              await fetch('/api/admin/logout', { method: 'POST' });
            } catch (e) {}
            logout();
            window.location.href = '/admin/login';
          }}
          className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Sistem</span>
        </button>
      </div>
    </aside>
  );
}
