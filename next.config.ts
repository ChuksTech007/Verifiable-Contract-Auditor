import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@0glabs/0g-serving-broker",
    "ethers",
    "ffjavascript",
    "circomlibjs",
    "web-worker",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // The 0G SDK's ESM build (index.mjs) re-exports named symbols from a CJS
      // bundle — Node.js can't resolve named exports from CJS in an ESM import
      // chain. Alias directly to the CJS entry so webpack always bundles the
      // CommonJS version and never touches the broken ESM chain.
      config.resolve.alias = {
        ...config.resolve.alias,
        "@0gfoundation/0g-compute-ts-sdk": path.resolve(
          process.cwd(),
          "node_modules/@0gfoundation/0g-compute-ts-sdk/lib.commonjs/index.js"
        ),
      };
    }
    return config;
  },
};

export default nextConfig;
