'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setClientSession } from '@/lib/session';
import {
  Building2,
  ShieldCheck,
  User,
  Phone,
  Lock,
  ArrowRight,
  Shield,
  KeyRound,
} from 'lucide-react';

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-gray-400 animate-pulse">
          Loading portal sign-in...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'owner' | 'admin'>(
    tabParam === 'admin' ? 'admin' : 'owner'
  );

  useEffect(() => {
    if (tabParam === 'admin') {
      setActiveTab('admin');
    } else if (tabParam === 'owner') {
      setActiveTab('owner');
    }
  }, [tabParam]);

  // Owner Form State
  const [plotNumber, setPlotNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // Admin Form State
  const [passcode, setPasscode] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError(null);

    if (!plotNumber.trim() || !ownerName.trim() || !phone.trim()) {
      setOwnerError('Please enter Plot Number, Your Name, and Phone Number.');
      return;
    }

    setOwnerLoading(true);
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
      setOwnerError(msg);
    } finally {
      setOwnerLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, name: adminName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid passcode');

      setClientSession({
        role: 'admin',
        name: adminName,
      });

      router.push('/admin/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid Admin Passcode';
      setAdminError(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pt-2 sm:pt-6 animate-in fade-in duration-200">
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center mx-auto">
          <img
            src="/images/aeowa-logo.png"
            alt="AEOWA Logo"
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide mb-1.5">
            AEOWA Resident Services Desk
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Anugraha Evergreen Layout
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto mt-2 leading-relaxed">
            Apply for Construction &amp; Re-Measurement NOCs, upload sale deeds, request plot amalgamation, and track your Association clearance status in one place.
          </p>
        </div>
      </div>

      {/* Login Portal Card */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-md overflow-hidden">
        {/* Tab Toggle: Owner Login vs Admin Login */}
        <div className="grid grid-cols-2 p-1.5 bg-gray-100/80 m-3 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('owner')}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'owner'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>Plot Owner Login</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Association Admin</span>
          </button>
        </div>

        {/* OWNER LOGIN TAB */}
        {activeTab === 'owner' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-gray-900">Resident / Plot Owner Access</h2>
              <p className="text-xs text-gray-500">
                Enter your plot number and contact details to access your dashboard.
              </p>
            </div>

            {ownerError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {ownerError}
              </div>
            )}

            <form onSubmit={handleOwnerLogin} className="space-y-3.5">
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Owner Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Anand Kumar Hegde"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition"
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
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={ownerLoading}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{ownerLoading ? 'Signing In...' : 'Continue to Plot Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Strict Privacy Notice */}
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-900 leading-tight">
                <strong>Strict Privacy Rule:</strong> Owners monitor status badges and raise NOCs.
                All uploaded documents and issued certificates remain strictly confidential for
                Association Admin review.
              </p>
            </div>
          </div>
        )}

        {/* ADMIN LOGIN TAB */}
        {activeTab === 'admin' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-gray-900">Association Admin Sign-In</h2>
              <p className="text-xs text-gray-500">
                Management Committee access for checklist verifications, deposit tracking & PDF issuance.
              </p>
            </div>

            {adminError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Admin Passcode *
                </label>
                <input
                  type="password"
                  placeholder="Enter Passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Designation / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Secretary / Treasurer"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Lock className="w-4 h-4" />
                <span>{adminLoading ? 'Verifying...' : 'Unlock Admin Portal'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
