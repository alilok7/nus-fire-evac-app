'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { UserRole } from '@/lib/types';
import { motion } from 'framer-motion';

const ICONS = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (path: string) => boolean;
}

function getNavItems(role: UserRole): NavItem[] {
  if (role === 'office') {
    return [
      { href: '/office', label: 'Residences', icon: ICONS.dashboard, match: (p) => p === '/office' || p.startsWith('/office/') },
      { href: '/office#ra-access', label: 'RA Access', icon: ICONS.users, match: (p) => p === '/office' },
    ];
  }
  if (role === 'ra') {
    return [{ href: '/ra', label: 'Dashboard', icon: ICONS.shield }];
  }
  if (role === 'resident') {
    return [{ href: '/resident', label: 'Dashboard', icon: ICONS.user }];
  }
  return [];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  const navItems = getNavItems(profile.role);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white flex flex-col">
      {/* Branding */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900">EvacTrack</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item, i) => {
          const isActive = item.match ? item.match(pathname) : pathname === item.href;
          return (
            <Link key={item.href + i} href={item.href}>
              <motion.div
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                {item.icon}
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-gray-200 p-4">
        <p className="mb-2 truncate px-3 text-xs text-gray-500">{profile.studentId}</p>
        <motion.button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          {ICONS.logout}
          Sign Out
        </motion.button>
      </div>
    </aside>
  );
}
