'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import LandingPage from '@/components/LandingPage';

export default function Home() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  // Logged in: show hub with role-based links
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">NUSNextAlert</h1>
        <p className="text-sm text-gray-600 mb-6">NUS Hostel Evacuation System</p>

        <h2 className="font-semibold text-gray-800 mb-3">Navigation</h2>
        <nav className="space-y-2">
          {profile?.role === 'ra' && (
            <Link
              href="/ra"
              className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium rounded-lg"
            >
              RA Dashboard
            </Link>
          )}
          {profile?.role === 'resident' && (
            <Link
              href="/resident"
              className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium rounded-lg"
            >
              Resident Dashboard
            </Link>
          )}
          {profile?.role === 'office' && (
            <Link
              href="/office"
              className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium rounded-lg"
            >
              Office Dashboard
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
