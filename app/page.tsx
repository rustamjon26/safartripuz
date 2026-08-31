import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import DestinationCards from "@/components/landing/DestinationCards";
import HowItWorks from "@/components/landing/HowItWorks";
import PartnerCTA from "@/components/landing/PartnerCTA";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://safartrip.uz";

const pageTitle = "SafarTrip — O'zbekiston bo'ylab orzuingizdagi sayohat";
const pageDescription =
  "AI yordamida O'zbekiston bo'ylab safar tuzing. Mehmonxona, transport, gid va tur paketlarini bir joydan bron qiling.";

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
    images: [
      {
        url: "/landing/hero-registan.jpg",
        width: 1376,
        height: 768,
        alt: "SafarTrip",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/landing/hero-registan.jpg"],
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
      image: `${SITE_URL}/landing/hero-registan.jpg`,
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
    <div
      id="app-shell"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main style={{ flex: 1, background: "var(--bg-main)" }}>
        <HeroSection />
        <StatsSection />
        <DestinationCards />
        <HowItWorks />
        <PartnerCTA />
      </main>
      <Footer />
    </div>
  );
}
