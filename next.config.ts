import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...buildSecurityHeaders({ isDev: process.env.NODE_ENV !== "production" })],
      },
    ];
  },
};

export default nextConfig;
