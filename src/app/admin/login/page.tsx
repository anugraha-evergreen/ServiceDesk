'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setClientSession } from '@/lib/session';
import { ShieldCheck, Lock, ArrowRight, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [name, setName] = useState('MC Executive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid passcode');

      setClientSession({
        role: 'admin',
        name,
      });

      router.push('/admin/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid Admin Passcode';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pt-6 sm:pt-12 animate-in fade-in duration-200">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-emerald-100 flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          Association Admin Sign-In
        </h1>
        <p className="text-xs text-gray-500">
          Authorized Management Committee (MC) access for compliance verification & PDF issuance.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Admin Passcode *
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Enter Association Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Default development passcode: <code className="text-emerald-700 font-bold">evergreen2026</code>
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Your Name / Designation
            </label>
            <input
              type="text"
              placeholder="e.g. Secretary / Estate Manager"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Verifying...' : 'Unlock Admin Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-500 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Passcode is configurable via <code className="font-mono text-gray-700">ADMIN_PASSCODE</code> in <code className="font-mono text-gray-700">.env.local</code>.
          </span>
        </div>
      </div>
    </div>
  );
}
