'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/session';
import { Home, PlusCircle, FileText, Compass, CheckSquare, Banknote } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { session } = useSession();

  if (!session) return null;

  const isOwner = session.role === 'owner';

  const ownerLinks = [
    { label: 'My Plot', href: '/owner/dashboard', icon: Home },
    { label: 'Construction', href: '/owner/construction-noc', icon: PlusCircle },
    { label: 'Re-Measure', href: '/owner/remeasurement-noc', icon: Compass },
    { label: 'Transfer/Merge', href: '/owner/amalgamation', icon: FileText },
  ];

  // Removed Plot Directory per requirement 1
  const adminLinks = [
    { label: 'Pending Queue', href: '/admin/dashboard', icon: CheckSquare },
    { label: 'Refund Ledger', href: '/admin/refunds', icon: Banknote },
  ];

  const links = isOwner ? ownerLinks : adminLinks;

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-100 py-1.5 px-3 shadow-lg">
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                isActive ? 'text-emerald-700 font-bold' : 'text-gray-500 hover:text-emerald-600'
              }`}
            >
              <div
                className={`p-1 rounded-lg ${
                  isActive ? 'bg-emerald-100/80 text-emerald-800' : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
