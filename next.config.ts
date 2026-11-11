import type { NextConfig } from "next";
import { odimModernRedirects, odimModernRewrites } from "./odim-modern-routing.config";

const nextConfig: NextConfig = {
  async redirects() { return odimModernRedirects; },
  async rewrites() { return { beforeFiles: odimModernRewrites, afterFiles: [], fallback: [] }; },
};

export default nextConfig;
