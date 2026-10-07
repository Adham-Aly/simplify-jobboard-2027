import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev-tools badge sits on top of the page; the app is only ever run in dev.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
