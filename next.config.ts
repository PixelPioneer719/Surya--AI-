import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for @webcontainer/api (App Builder feature)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },

  // Standalone output for Docker/AWS ECS deployment
  output: "standalone",

  // Allow images from external sources
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  // Required to silence Turbopack config conflict warning in Next.js 16
  turbopack: {},
};

export default nextConfig;
