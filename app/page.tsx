import type { Metadata } from 'next';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import HeroSection from '@/components/landing/HeroSection';
import QuickSearchBar from '@/components/landing/QuickSearchBar';
import StatsSection from '@/components/landing/StatsSection';
import DestinationCards from '@/components/landing/DestinationCards';
import DestinationHighlight from '@/components/landing/DestinationHighlight';
import HowItWorks from '@/components/landing/HowItWorks';
import PackageCards from '@/components/landing/PackageCards';
import RecommendedProviders from '@/components/landing/RecommendedProviders';
import ReviewsCarousel from '@/components/landing/ReviewsCarousel';
import FinalCTA from '@/components/landing/FinalCTA';

const pageTitle = "SafarTrip.uz — O'zbekistonda sayohat rejalashtiring";
const pageDescription =
  "Zomin, Jizzax va boshqa yo'nalishlarda mehmonxona, transport va gid xizmatlarini bir joydan bron qiling.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    "sayohat",
    "uzbekistan",
    "zomin",
    "jizzax",
    "mehmonxona",
    "taxi",
    "gid",
  ],
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    images: [{ url: "/hero-bg.png", width: 1200, height: 630, alt: "SafarTrip" }],
  },
};

export default function Home() {
  return (
    <div id="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <div style={{ backgroundColor: 'var(--bg-main)' }}>
          <HeroSection />

          <QuickSearchBar />

          <StatsSection />

          <span id="destinations"></span>
          <DestinationCards />

          <DestinationHighlight />

          <HowItWorks />

          <span id="packages"></span>
          <PackageCards />

          <RecommendedProviders />

          <ReviewsCarousel />

          <FinalCTA />
        </div>
      </main>
      <Footer />
    </div>
  );
}
