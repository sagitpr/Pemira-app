'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import AppLogo from '@/components/common/AppLogo';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdmin();

  const [email, setEmail] = useState('admin@pemira2026.ac.id');
  const [password, setPassword] = useState('kpum2026#secure');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        login(email, password);
        router.push('/admin/dashboard');
        router.refresh();
      } else {
        setErrorMessage(data.message || 'Email atau kata sandi tidak cocok.');
      }
    } catch (err: any) {
      // Fallback
      const success = login(email, password);
      if (success) {
        router.push('/admin/dashboard');
      } else {
        setErrorMessage('Terjadi gangguan jaringan autentikasi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Header Logo & Badge */}
        <div className="text-center mb-6 flex flex-col items-center">
          <AppLogo size={56} />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold tracking-wide mt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>PORTAL RESMI KPUM UBTH 2026</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Panel Administrator &amp; Saksi
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Masuk untuk mengakses rekapitulasi suara, manajemen DPT, dan bilik
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200/80 shadow-lg shadow-slate-200/60 rounded-3xl p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Alamat Email Resmi KPUM
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pemira2026.ac.id"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Kata Sandi Akses
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-900/10 disabled:opacity-70"
            >
              {isLoading ? (
                <span>Memverifikasi Akun...</span>
              ) : (
                <>
                  <span>Masuk ke Panel Kontrol</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-2">
              Kredensial Default KPUM 2026:
            </span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleFillDemo('admin@pemira2026.ac.id', 'kpum2026#secure')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-900 block">KPUM Utama (Akses Penuh)</span>
                  <span className="text-[11px] text-slate-500 font-mono">admin@pemira2026.ac.id</span>
                </div>
                <KeyRound className="w-4 h-4 text-sky-600" />
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('saksi01@pemira2026.ac.id', 'kpum2026#secure')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <span className="font-bold text-slate-900 block">Saksi Paslon 01 (Monitoring)</span>
                  <span className="text-[11px] text-slate-500 font-mono">saksi01@pemira2026.ac.id</span>
                </div>
                <KeyRound className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p>Hak Akses Dilindungi oleh Komisi Pemilihan Umum Mahasiswa UBTH 2026</p>
        </div>
      </div>
    </div>
  );
}
