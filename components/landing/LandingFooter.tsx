'use client';

import Link from 'next/link';
import { HERO_SLIDES, UNSPLASH_ATTRIBUTION } from '@/lib/landingImages';

export default function LandingFooter() {
  const photographers = [...new Set(HERO_SLIDES.map((s) => s.photographer))];

  return (
    <footer className="border-t border-gray-200 bg-white py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <p className="font-semibold text-gray-900">EvacTrack</p>
            <p className="text-sm text-gray-600">NUS Hostel Evacuation System</p>
          </div>
          <div className="flex gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              Sign Up
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-xs text-gray-500">
            Photos by {photographers.join(', ')} on{' '}
            <a
              href={UNSPLASH_ATTRIBUTION}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 underline hover:text-gray-900"
            >
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
