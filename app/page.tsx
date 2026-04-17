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

export default function Home() {
  return (
    <div id="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <div style={{ backgroundColor: 'var(--bg-main)' }}>
          {/* 2. Hero Section */}
          <HeroSection />

          {/* 3. Quick Search Bar */}
          <QuickSearchBar />

          {/* 4. Stats Section */}
          <StatsSection />

          {/* 5. Destination Cards (Zomin & Jizzax main entry) */}
          <span id="destinations"></span>
          <DestinationCards />

          {/* 6 & 7. Detailed Destination Highlights */}
          <DestinationHighlight />

          {/* 8. How It Works (3 Steps) */}
          <HowItWorks />

          {/* 9. Packages */}
          <span id="packages"></span>
          <PackageCards />

          {/* Recommended Taxi / Guide from real providers */}
          <RecommendedProviders />

          {/* 10. Reviews Carousel */}
          <ReviewsCarousel />

          {/* 11. Final Call To Action */}
          <FinalCTA />
        </div>
      </main>
      <Footer />
    </div>
  );
}
