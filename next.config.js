/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer"],
  typescript: { ignoreBuildErrors: false },
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
   * Image optimization is ON. It was disabled in 0ce0a8e because `/_next/image`
   * returned broken hero/favicon images on the VPS — either sharp was missing
   * from the standalone bundle or nginx mis-proxied the route.
   *
   * The sharp half is settled: it is a direct dependency, and both
   * `copy:standalone` and the PM2 entry (tsx server.ts, run from the repo root)
   * have the native binaries. The nginx half cannot be checked from here, so
   * this stays one env var away from a rollback: set NEXT_IMAGE_UNOPTIMIZED=true
   * and restart, no redeploy. See docs/DEPLOY.md.
   */
  images: {
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "true",
    remotePatterns: [
      { protocol: "https", hostname: "safartrip.uz", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
