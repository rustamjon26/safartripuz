import type { Metadata } from "next";
import { Source_Serif_4, Space_Mono } from "next/font/google";
import type { ReactElement, ReactNode } from "react";

const sourceSerif = Source_Serif_4({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SafarTrip — sayohat uchun bitta ilova",
  description:
    "Mehmonxona, dacha, gid, taksi va AI tur rejasini bir ilovada. Payme, Click, Uzcard, Humo, Visa orqali to'lov. SafarTrip — O'zbekiston bo'ylab sayohat uchun super-ilova.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function V2Layout({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className={`${sourceSerif.variable} ${spaceMono.variable}`} data-landing="v2">
      {children}
    </div>
  );
}
