import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /**
   * MusicKit `authorize()` talks to Apple cross-origin. A strict Referrer-Policy
   * (e.g. `no-referrer` or `same-origin`) can strip Referer and cause 403 /
   * "network" errors on `webPlayerLogout` during cleanup — see Apple Dev Forums
   * (MusicKit web 403 / referrer-policy). Using `origin` matches the fix from
   * Apple Developer Forums (stricter policies like `no-referrer` break auth).
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
