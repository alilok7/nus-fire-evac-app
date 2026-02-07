'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in: show landing with RA | Resident | Office selection (before login)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">EvacTrack</h1>
          <p className="text-sm text-gray-600 mb-6">NUS Hostel Evacuation System</p>

          <h2 className="font-semibold text-gray-800 mb-3">Select your role to sign in</h2>
          <nav className="space-y-2">
            <Link
              href="/login?redirect=/ra"
              className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium rounded-lg"
            >
              RA
            </Link>
            <Link
              href="/login?redirect=/resident"
              className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium rounded-lg"
            >
              Resident
            </Link>
            <Link
              href="/login?redirect=/office"
              className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium rounded-lg"
            >
              Office
            </Link>
          </nav>
        </div>
      </div>
    );
  }

  // Logged in: show hub with role-based links
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">EvacTrack</h1>
        <p className="text-sm text-gray-600 mb-6">NUS Hostel Evacuation System</p>

        <h2 className="font-semibold text-gray-800 mb-3">Navigation</h2>
        <nav className="space-y-2">
          {profile?.role === 'ra' && (
            <>
              <Link
                href="/ra"
                className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium rounded-lg"
              >
                RA Dashboard
              </Link>
              <Link
                href="/resident"
                className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium rounded-lg"
              >
                Resident
              </Link>
              <Link
                href="/office"
                className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium rounded-lg"
              >
                Office
              </Link>
            </>
          )}
          {profile?.role === 'resident' && (
            <Link
              href="/resident"
              className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium rounded-lg"
            >
              Resident Dashboard
            </Link>
          )}
          {profile?.role === 'admin' && (
            <>
              <Link
                href="/admin"
                className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium rounded-lg"
              >
                Admin Dashboard
              </Link>
              <Link
                href="/office"
                className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium rounded-lg"
              >
                Office
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
