'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import AdminSidebar from '@/components/admin/AdminSidebar';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const profile = sessionStorage.getItem('pemira_admin_profile');
      if (profile) {
        try {
          const parsed = JSON.parse(profile);
          const role = (parsed.role || 'admin').toLowerCase();
          const isSuperAdmin = role === 'superadmin';
          const isSaksi = role === 'saksi';
          const isOperator = role === 'admin';

          if (isSaksi) {
            const forbiddenForSaksi = ['/admin/dpt', '/admin/paslon', '/admin/pengaturan'];
            if (forbiddenForSaksi.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
              alert('Akses Dibatasi: Halaman ini tidak dapat diakses oleh Saksi.');
              window.location.replace('/admin/dashboard');
              return;
            }
          }

          if (isOperator) {
            const forbiddenForOperator = ['/admin/rekap', '/admin/paslon', '/admin/pengaturan'];
            if (forbiddenForOperator.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
              alert('Akses Dibatasi: Halaman ini hanya dapat diakses oleh Super Admin.');
              window.location.replace('/admin/dashboard');
              return;
            }
          }

          if (!isSuperAdmin) {
            const superAdminOnly = ['/admin/paslon', '/admin/pengaturan'];
            if (superAdminOnly.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
              alert('Akses Dibatasi: Halaman ini hanya dapat diakses oleh Super Admin.');
              window.location.replace('/admin/dashboard');
              return;
            }
          }
        } catch (e) {}
      }
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 w-full relative">
      <AdminSidebar />
      <div className="pl-0 md:pl-64 w-full flex flex-col min-h-screen min-w-0 bg-slate-50">
        {children}
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/admin/login' || pathname === '/admin/register';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <AdminProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminProvider>
  );
}
