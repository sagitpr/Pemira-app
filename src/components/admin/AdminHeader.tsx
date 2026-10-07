'use client';

import React from 'react';
import { useAdmin } from '@/context/AdminContext';
import { ShieldCheck, Radio, Clock } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export default function AdminHeader({ title, subtitle, actionButton }: AdminHeaderProps) {
  const { config } = useAdmin();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          {title}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
            Sistem {config.electionStatus}
          </span>
        </h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actionButton}

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Real-time Sync</span>
        </div>
      </div>
    </header>
  );
}
