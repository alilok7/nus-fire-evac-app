'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS = [
  { value: '17+', label: 'NUS Residences' },
  { value: 'Real-time', label: 'Tracking' },
  { value: '100%', label: 'Coverage' },
];

export default function LandingStats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="bg-blue-600 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <p className="text-4xl font-bold text-white sm:text-5xl">{stat.value}</p>
              <p className="mt-1 text-lg text-blue-100">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
