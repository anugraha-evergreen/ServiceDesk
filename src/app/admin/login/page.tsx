'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?tab=admin');
  }, [router]);

  return (
    <div className="py-20 text-center text-xs text-gray-500 animate-pulse">
      Redirecting to layout sign-in...
    </div>
  );
}
