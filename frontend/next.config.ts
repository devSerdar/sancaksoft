import type { NextConfig } from "next";

// API URL - Docker içinde sancaksoft-backend, lokal geliştirmede localhost
const API_URL = process.env.API_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // API proxy - forward /api requests to backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
