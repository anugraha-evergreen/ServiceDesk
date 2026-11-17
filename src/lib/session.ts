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
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(getClientSession());
    setLoading(false);

    const handleSessionChange = () => {
      setSession(getClientSession());
    };

    window.addEventListener('aelra_session_change', handleSessionChange);
    return () => window.removeEventListener('aelra_session_change', handleSessionChange);
  }, []);

  return { session, loading, setSession };
}
