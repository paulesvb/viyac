import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      {
        source: '/music/albums/:slug',
        destination: '/music/collections/:slug',
        permanent: true,
      },
      {
        source: '/es/music/albums/:slug',
        destination: '/es/music/collections/:slug',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
