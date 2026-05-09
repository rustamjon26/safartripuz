/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "safartrip.uz", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
