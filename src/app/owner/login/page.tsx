'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setClientSession } from '@/lib/session';
import { Building2, User, Phone, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function OwnerLoginPage() {
  const router = useRouter();
  const [plotNumber, setPlotNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!plotNumber.trim() || !ownerName.trim() || !phone.trim()) {
      setError('Please fill in Plot Number, Your Name, and Phone Number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotNumber, ownerName, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setClientSession({
        role: 'owner',
        plotNumber: plotNumber.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
      });

      router.push('/owner/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4 sm:pt-8 animate-in fade-in duration-200">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          Resident / Owner Sign-In
        </h1>
        <p className="text-xs text-gray-500">
          Enter your plot number and contact details to raise requests and monitor status badges.
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Plot Number *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 42 or 108"
                value={plotNumber}
                onChange={(e) => setPlotNumber(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Full Owner Name *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Anand Kumar Hegde"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Registered Phone Number *
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Validating...' : 'Continue to Plot Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Strict Privacy Reminder */}
        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-900 leading-tight">
            <strong>Strict Privacy Guarantee:</strong> You will only see status badges and timelines.
            Uploaded documents and generated certificates are kept confidential for Association Admin
            verification.
          </p>
        </div>
      </div>
    </div>
  );
}
