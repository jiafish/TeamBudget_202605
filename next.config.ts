import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === "1";
const staticBasePath = process.env.STATIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export" as const,
        basePath: staticBasePath || undefined,
        images: { unoptimized: true },
      }
    : {}),
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
