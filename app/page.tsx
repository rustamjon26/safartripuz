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

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://safartrip.uz";

const pageTitle = "SafarTrip — O'zbekistonda safar va sayohat rejalashtiring";
const pageDescription =
  "SafarTrip.uz orqali Zomin, Jizzax, Samarqand, Buxoro va boshqa yo'nalishlarda mehmonxona, homestay, taxi, gid va tur paketlarini bir joydan bron qiling. Tezkor, qulay va xavfsiz safar platformasi.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/",
  },
  keywords: [
    "safar",
    "SafarTrip",
    "safartrip",
    "safartrip.uz",
    "sayohat",
    "O'zbekiston sayohat",
    "uzbekistan",
    "zomin",
    "jizzax",
    "samarqand",
    "buxoro",
    "mehmonxona bron",
    "homestay",
    "taxi",
    "gid",
    "tur paket",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: pageTitle,
    description: pageDescription,
    siteName: "SafarTrip",
    images: [{ url: "/hero-bg.png", width: 1200, height: 630, alt: "SafarTrip" }],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/hero-bg.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "SafarTrip",
      alternateName: ["SafarTrip.uz", "Safar Trip", "Safar"],
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.ico`,
      description:
        "O'zbekiston bo'ylab safar va sayohat xizmatlarini bir joydan bron qilish platformasi.",
      areaServed: {
        "@type": "Country",
        name: "Uzbekistan",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "SafarTrip",
      alternateName: "SafarTrip.uz",
      inLanguage: "uz-UZ",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/hotels?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "TravelAgency",
      "@id": `${SITE_URL}/#travelagency`,
      name: "SafarTrip",
      url: SITE_URL,
      image: `${SITE_URL}/hero-bg.png`,
      description:
        "Mehmonxona, homestay, taxi, gid va tur paketlarini bron qilish uchun O'zbekistondagi safar platformasi.",
      areaServed: {
        "@type": "Country",
        name: "Uzbekistan",
      },
    },
  ],
};

export default function Home() {
  return (
    <div id="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
