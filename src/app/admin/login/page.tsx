'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdmin();

  const [email, setEmail] = useState('admin@pemira2026.ac.id');
  const [password, setPassword] = useState('kpum2026#secure');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imgError, setImgError] = useState(false);

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
    } catch {
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
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-100 via-white to-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Identitas & Logo Resmi UBTH + Badge Tegas */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-16 h-16 shrink-0 flex items-center justify-center drop-shadow-sm">
              {!imgError ? (
                <img
                  src="/candidate/image/logo-pemira.png"
                  alt="Logo Resmi UBTH"
                  className="w-16 h-16 object-contain drop-shadow-sm"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('/candidates/image/Image-logo-Pemira.png')) {
                      target.src = '/candidates/image/Image-logo-Pemira.png';
                    } else if (!target.src.includes('/api/logo')) {
                      target.src = '/api/logo';
                    } else {
                      setImgError(true);
                    }
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-md">
                  UBTH
                </div>
              )}
            </div>
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black tracking-wider uppercase shadow-xs">
              [ KPR UBTH 2026 ]
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Panel Administrator &amp; Saksi
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Masuk untuk mengakses rekapitulasi suara, manajemen DPT, dan bilik suara digital.
          </p>
        </div>

        {/* Card Container Putih Solid */}
        <div className="bg-white border border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-3xl p-8 max-w-md w-full">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Email / Username Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Email / Username Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pemira2026.ac.id"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-colors"
                />
              </div>
            </div>

            {/* Password Input dengan Eye / EyeOff Toggle */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Kata Sandi
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
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Tombol Masuk: Deep Navy Solid */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-slate-900/15 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <span>Memverifikasi Akun...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Akses Cepat Penguji / Demo Quick Login */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-2.5 text-center">
              Akses Cepat Penguji
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin@pemira2026.ac.id', 'kpum2026#secure')}
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-center transition-colors cursor-pointer"
              >
                ⚡ Super Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('saksi01@pemira2026.ac.id', 'kpum2026#secure')}
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-center transition-colors cursor-pointer"
              >
                👁️ Saksi Paslon
              </button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sesi terenkripsi &amp; terlindungi sistem resmi KPR UBTH 2026</span>
        </div>
      </div>
    </div>
  );
}
