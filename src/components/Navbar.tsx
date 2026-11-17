'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, setClientSession } from '@/lib/session';
import { Trees, Shield, User, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { session } = useSession();
  const router = useRouter();

  const handleLogout = () => {
    setClientSession(null);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20 group-hover:bg-emerald-800 transition">
            <Trees className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-emerald-950 flex items-center gap-1">
              ANUGRAHA EVERGREEN
            </span>
            <p className="text-[11px] text-emerald-700 font-bold tracking-wide">
              AEOWA Services Desk
            </p>
          </div>
        </Link>

        {/* Navigation & Role Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <div className="flex items-center gap-2">
              {session.role === 'admin' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Admin Mode</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Plot #{session.plotNumber}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                title="Switch Role or Log out"
                className="p-2 rounded-xl text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 transition border border-transparent hover:border-emerald-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
              >
                Owner Login
              </Link>
              <Link
                href="/admin/login"
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg shadow-xs transition flex items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
