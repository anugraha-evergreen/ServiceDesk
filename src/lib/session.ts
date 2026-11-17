'use client';

import { useEffect, useState } from 'react';
import { UserRole } from './types';

export interface ClientSession {
  role: UserRole;
  plotNumber?: string;
  ownerName?: string;
  phone?: string;
  name?: string; // admin
  wasAmalgamated?: boolean;
  originalPlotEntered?: string;
}

const SESSION_KEY = 'aelra_active_session';

export function getClientSession(): ClientSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setClientSession(session: ClientSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    window.dispatchEvent(new Event('aelra_session_change'));
  } catch (e) {
    console.warn('Session write error', e);
  }
}

export function useSession() {
  const [session, setSession] = useState<ClientSession | null>(() => getClientSession());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Keep in sync with storage events
    const current = getClientSession();
    if (JSON.stringify(current) !== JSON.stringify(session)) {
      setSession(current);
    }

    const handleSessionChange = () => {
      setSession(getClientSession());
    };

    window.addEventListener('aelra_session_change', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);
    return () => {
      window.removeEventListener('aelra_session_change', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, []);

  return { session, loading, setSession };
}
