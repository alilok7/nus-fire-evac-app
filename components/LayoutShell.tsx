'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import NavBar from './NavBar';
import SidebarLayout from './SidebarLayout';

const SIDEBAR_ROUTES = ['/office', '/ra', '/resident'];

function shouldShowSidebar(pathname: string): boolean {
  return SIDEBAR_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  // Show sidebar layout for authenticated users on dashboard routes
  const useSidebar = !loading && user && profile && shouldShowSidebar(pathname);

  if (useSidebar) {
    return <SidebarLayout>{children}</SidebarLayout>;
  }

  // Unauthenticated or non-dashboard: show NavBar + children
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
