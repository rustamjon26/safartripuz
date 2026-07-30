import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://safartrip.uz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/hotel/",
          "/homestay-partner/",
          "/guide-partner/",
          "/taxi-partner/",
          "/profile",
          "/bookings",
          "/payments/",
          "/user/",
          "/login",
          "/register",
          "/forgot-password",
          "/v2/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
