import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 15 top-level key (replaces experimental.serverComponentsExternalPackages)
  serverExternalPackages: [
    "@0gfoundation/0g-compute-ts-sdk",
    "@0glabs/0g-serving-broker",
    "ethers",
    "ffjavascript",
    "circomlibjs",
    "web-worker",
  ],
  // Belt-and-suspenders: also set the deprecated key so Vercel's bundler
  // recognises the packages as external under both Next.js 14 and 15 resolution.
  experimental: {
    serverComponentsExternalPackages: [
      "@0gfoundation/0g-compute-ts-sdk",
      "@0glabs/0g-serving-broker",
      "ethers",
    ],
  },
};

export default nextConfig;
