'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import {
  LayoutGrid,
  Clock,
  Users,
  UserCheck,
  Settings,
  ExternalLink,
  X,
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { voters, isMobileSidebarOpen, setIsMobileSidebarOpen } = useAdmin();

  const MENU_ITEMS = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/admin/rekap', label: 'Rekap Suara', icon: Clock },
    { href: '/admin/dpt', label: 'DPT & Pemilih', icon: Users, badge: voters.length.toString() },
    { href: '/admin/paslon', label: 'Kelola Paslon', icon: UserCheck },
    { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  const renderNavContent = (isMobile = false) => (
    <>
      {/* Top Section */}
      <div className="p-4">
        {/* App Logo */}
        <div className="h-16 px-2 flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
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

          {isMobile && (
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 md:hidden transition-colors"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
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
                onClick={() => {
                  if (isMobile) setIsMobileSidebarOpen(false);
                }}
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

      {/* Bottom Section: Shortcuts */}
      <div className="p-4">
        <div className="space-y-1.5">
          <Link
            href="/qr-screen"
            target="_blank"
            onClick={() => {
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
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
            onClick={() => {
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white/70 hover:bg-white border border-blue-200/80 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Layar Bilik Suara</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, fixed on desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#F8F6F0]/80 border-r border-[#EBE7DF] justify-between h-screen z-30 select-none font-sans">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer (Visible only when isMobileSidebarOpen is true on mobile) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex select-none font-sans">
          {/* Overlay Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-[#FAF9F5] border-r border-[#EBE7DF] h-full flex flex-col justify-between shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
