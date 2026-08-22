import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Vinext pre-reads multipart POST bodies through the Server Actions path.
    // Leave 1 MiB for multipart metadata above the 100 MiB ZIP limit.
    serverActions: { bodySizeLimit: "101mb" },
  },
};

export default nextConfig;
