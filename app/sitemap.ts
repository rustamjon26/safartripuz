import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://safartrip.uz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/hotels", changeFrequency: "daily", priority: 0.9 },
    { path: "/homestay", changeFrequency: "daily", priority: 0.9 },
    { path: "/tours", changeFrequency: "daily", priority: 0.9 },
    { path: "/packages", changeFrequency: "daily", priority: 0.9 },
    { path: "/taxi", changeFrequency: "daily", priority: 0.8 },
    { path: "/taxi/home", changeFrequency: "daily", priority: 0.7 },
    { path: "/guide", changeFrequency: "daily", priority: 0.8 },
    { path: "/restaurant", changeFrequency: "weekly", priority: 0.6 },
    { path: "/trip-builder", changeFrequency: "weekly", priority: 0.7 },
  ];

  return staticRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
