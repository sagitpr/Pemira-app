'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, UserPlus } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imgError, setImgError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data: user, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error:', error);
      }

      if (!user) {
        alert('Email atau akun tidak ditemukan di database!');
        setErrorMessage('Email atau akun tidak ditemukan di database!');
        return;
      }

      // Validasi kata sandi dengan memeriksa kolom 'password' maupun 'password_hash'
      const validPassword = user.password === password || user.password_hash === password;
      if (!validPassword) {
        alert('Kata sandi salah!');
        setErrorMessage('Kata sandi salah!');
        return;
      }

      localStorage.setItem('pemira_admin_session', JSON.stringify(user));
      document.cookie = `pemira_admin_session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=28800; SameSite=Lax`;

      alert(`Selamat datang, ${user.name || user.full_name || 'Admin'}!`);
      window.location.href = '/admin/dashboard';
    } catch (err: any) {
      console.error('Error saat login:', err);
      alert('Terjadi kesalahan: ' + (err.message || 'Gagal masuk.'));
      setErrorMessage(err.message || 'Gagal masuk.');
    } finally {
      setIsLoading(false);
    }
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

          {/* Tautan Pendaftaran Akun */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/admin/register"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Belum punya akun panitia atau saksi? Daftar di sini</span>
            </Link>
          </div>
        </div>

        {/* Footer Info Keamanan Sesi (Tanpa Emoji) */}
        <div className="mt-6 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sesi terenkripsi dan terlindungi sistem resmi KPR UBTH 2026</span>
        </div>
      </div>
    </div>
  );
}
