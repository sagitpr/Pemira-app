import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Bilik Suara - PEMIRA 2026',
  description: 'Layar Proyektor Bilik Suara Resmi Pemilihan Raya Mahasiswa 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={fontSans.variable}>
      <body className="font-sans antialiased bg-slate-100 text-slate-900 selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
