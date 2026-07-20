import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: true,
  },
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  turbopack: {},

  async rewrites() {
    return [
      {
        source: "/apple-touch-icon.png",
        destination: "/apple-icon",
      },
      {
        source: "/apple-touch-icon-precomposed.png",
        destination: "/apple-icon",
      },
    ];
  },
};

export default withPWA(nextConfig);
