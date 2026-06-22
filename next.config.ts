import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages use Node.js-specific APIs (web workers, ZK libs, native crypto)
  // that webpack can't bundle correctly — load them natively at runtime instead.
  serverExternalPackages: [
    "@0gfoundation/0g-compute-ts-sdk",
    "@0glabs/0g-serving-broker",
    "ethers",
    "ffjavascript",
    "circomlibjs",
    "web-worker",
  ],
};

export default nextConfig;
