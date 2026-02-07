'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function LandingCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="bg-gray-50 py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Sign in or create an account to access EvacTrack.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg border-2 border-gray-300 bg-white px-8 py-4 font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Sign Up
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
