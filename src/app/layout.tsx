import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export const metadata: Metadata = {
  title: 'Anugraha Evergreen Owners Welfare Association (AEOWA)',
  description:
    'Portal for plot-specific NOCs, construction compliance checklists, security deposits, and document management.',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 pb-20 sm:pb-10 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {children}
        </main>
        <MobileBottomNav />
      </body>
    </html>
  );
}
