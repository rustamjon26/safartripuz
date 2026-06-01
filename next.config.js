/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer"],
  typescript: { ignoreBuildErrors: true },
  experimental: {
    workerThreads: false,
    cpus: 1,
    serverActions: {
      allowedOrigins: [
        "safartrip.uz",
        "https://safartrip.uz",
        "www.safartrip.uz",
        "localhost:3000",
      ],
    },
  },
  /**
   * `unoptimized: true` — `/_next/image` optimizatorisiz to‘g‘ridan-to‘g‘ri `/hero-bg.png` va boshqa
   * `public/` fayllarini beradi. VPSda sharp o‘rnatilmasa yoki nginx `/_next/image` ni noto‘g‘ri
   * proxylasa hero/favicon “ochilib qolgan” ko‘rinadi.
   */
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "safartrip.uz", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
