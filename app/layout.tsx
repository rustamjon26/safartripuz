import type { Metadata } from "next";
import { Playfair_Display, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-playfair",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://safartrip.uz";
const SITE_NAME = "SafarTrip";
const DEFAULT_TITLE = "SafarTrip — O'zbekiston bo'ylab safar va sayohat platformasi";
const DEFAULT_DESCRIPTION =
  "SafarTrip.uz — O'zbekistondagi mehmonxona, homestay, taxi, gid va tur paketlarini bir joydan bron qiling. Zomin, Jizzax, Samarqand, Buxoro va boshqa yo'nalishlar bo'yicha safar rejalashtirish.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | SafarTrip",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "safar",
    "SafarTrip",
    "safartrip",
    "safartrip.uz",
    "sayohat",
    "sayohat O'zbekiston",
    "Uzbekistan travel",
    "tur paket",
    "mehmonxona bron",
    "homestay",
    "taxi buyurtma",
    "gid xizmati",
    "Zomin",
    "Jizzax",
    "Samarqand",
    "Buxoro",
  ],
  authors: [{ name: "SafarTrip" }],
  creator: "SafarTrip",
  publisher: "SafarTrip",
  alternates: {
    canonical: "/",
    languages: {
      "uz-UZ": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/hero-bg.png",
        width: 1200,
        height: 630,
        alt: "SafarTrip — O'zbekiston bo'ylab safar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/hero-bg.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "google71d9a44679e5d46a",
  },
  icons: {
    icon: "/favicon.ico",
  },
  category: "travel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={`${playfair.variable} ${nunito.variable}`}>
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
