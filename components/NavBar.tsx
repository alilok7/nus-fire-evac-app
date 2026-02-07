'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-100 text-blue-800'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </Link>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  return (
    <nav className="border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <NavLink href="/" active={pathname === '/' || pathname === ''}>
              Home
            </NavLink>
            {user ? (
              <>
                {profile?.role === 'ra' && (
                  <>
                    <NavLink href="/ra" active={pathname.startsWith('/ra')}>
                      RA
                    </NavLink>
                    <NavLink href="/resident" active={pathname.startsWith('/resident')}>
                      Resident
                    </NavLink>
                    <NavLink href="/office" active={pathname.startsWith('/office')}>
                      Office
                    </NavLink>
                  </>
                )}
                {profile?.role === 'resident' && (
                  <NavLink href="/resident" active={pathname.startsWith('/resident')}>
                    Resident
                  </NavLink>
                )}
                {profile?.role === 'admin' && (
                  <>
                    <NavLink href="/admin" active={pathname.startsWith('/admin')}>
                      Admin
                    </NavLink>
                    <NavLink href="/office" active={pathname.startsWith('/office')}>
                      Office
                    </NavLink>
                  </>
                )}
                {(!profile || !['ra', 'resident', 'admin'].includes(profile?.role ?? '')) && (
                  <>
                    <NavLink href="/ra" active={pathname.startsWith('/ra')}>
                      RA
                    </NavLink>
                    <NavLink href="/resident" active={pathname.startsWith('/resident')}>
                      Resident
                    </NavLink>
                    <NavLink href="/admin" active={pathname.startsWith('/admin')}>
                      Admin
                    </NavLink>
                    <NavLink href="/office" active={pathname.startsWith('/office')}>
                      Office
                    </NavLink>
                  </>
                )}
              </>
            ) : (
              <>
                <NavLink href="/login?redirect=/ra" active={false}>
                  RA
                </NavLink>
                <NavLink href="/login?redirect=/resident" active={false}>
                  Resident
                </NavLink>
                <NavLink href="/login?redirect=/office" active={false}>
                  Office
                </NavLink>
                <NavLink href="/login" active={pathname.startsWith('/login')}>
                  Sign In
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
