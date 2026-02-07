'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';

const SIDEBAR_ROUTES = ['/office', '/ra', '/resident'];

function shouldShowSidebar(pathname: string): boolean {
  return SIDEBAR_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <motion.div
          className="h-12 w-12 rounded-full border-2 border-blue-600 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!user || !profile || !shouldShowSidebar(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <motion.main
        className="flex-1 pl-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="min-h-screen p-6">{children}</div>
      </motion.main>
    </div>
  );
}
