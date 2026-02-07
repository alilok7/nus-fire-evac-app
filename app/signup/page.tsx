'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NUS_RESIDENCES } from '@/lib/nusResidences';

type HostelDoc = { id: string; name: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const FALLBACK_HOSTELS: HostelDoc[] = NUS_RESIDENCES.map((name) => ({
  id: slugify(name),
  name,
}));

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [hostelId, setHostelId] = useState('');
  const [hostels, setHostels] = useState<HostelDoc[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hostelsLoading, setHostelsLoading] = useState(true);
  const { signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const loadHostels = async () => {
      try {
        const snap = await getDocs(collection(db, 'hostels'));
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as { name?: string }) })) as HostelDoc[];
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setHostels(list.length > 0 ? list : FALLBACK_HOSTELS);
      } catch {
        setHostels(FALLBACK_HOSTELS);
      } finally {
        setHostelsLoading(false);
      }
    };
    loadHostels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!hostelId.trim()) {
        setError('Please select an accommodation');
        return;
      }
      await signUp(email, password, {
        studentId: studentId.trim(),
        role: 'resident',
        hostelId,
      });
      router.push('/login');
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NUSNextAlert</h1>
          <p className="text-gray-600">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              NUS Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@e.ntu.edu.sg"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
              Student ID
            </label>
            <input
              id="studentId"
              type="text"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. A0101001A"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="hostelId" className="block text-sm font-medium text-gray-700 mb-2">
              Accommodation
            </label>
            <select
              id="hostelId"
              required
              value={hostelId}
              onChange={(e) => setHostelId(e.target.value)}
              disabled={hostelsLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
            >
              <option value="">Select accommodation</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name || h.id}
                </option>
              ))}
            </select>
            {hostelsLoading && (
              <p className="text-xs text-gray-500 mt-1">Loading accommodations…</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition duration-200"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
