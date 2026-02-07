'use client';

import LandingHeroCarousel from '@/components/landing/LandingHeroCarousel';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingStats from '@/components/landing/LandingStats';
import LandingCTA from '@/components/landing/LandingCTA';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingHeroCarousel />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingStats />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
