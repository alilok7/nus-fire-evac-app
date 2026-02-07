'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { HERO_SLIDES } from '@/lib/landingImages';

const AUTOPLAY_INTERVAL = 5000;

export default function LandingHeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 20 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div className="embla h-full" ref={emblaRef}>
        <div className="embla__container flex h-full">
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={i}
              className="embla__slide relative min-w-0 flex-[0_0_100%]"
            >
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${slide.url})` }}
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"
                aria-hidden
              />
              <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                <motion.div
                  className="max-w-4xl"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                    NUSNextAlert
                  </h1>
                  <p className="mt-4 text-lg text-white/95 drop-shadow sm:text-xl md:text-2xl">
                    Real-Time Evacuation Tracking for NUS Hostels
                  </p>
                  <p className="mt-2 text-base text-white/80 sm:text-lg">
                    Keep residents safe. Track attendance. Respond quickly.
                  </p>
                </motion.div>
                <motion.div
                  className="mt-10 flex flex-wrap items-center justify-center gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <Link
                    href="/login"
                    className="rounded-lg bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg border-2 border-white bg-white/10 px-8 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              i === selectedIndex
                ? 'scale-125 bg-white'
                : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
