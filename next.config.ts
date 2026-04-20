import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles only what's needed — smaller Railway image
  output: "standalone",
};

export default nextConfig;
