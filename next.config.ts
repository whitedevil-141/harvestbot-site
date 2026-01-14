import type { NextConfig } from "next";

const repo = "harvestbot-site"; // <-- your repo name
const nextConfig: NextConfig = {
  output: "export",            // static export
  trailingSlash: true,         // /about/ works on static hosting
  images: { unoptimized: true }, // required for static export with next/image
  basePath: `/${repo}`,        // required for project pages
  assetPrefix: `/${repo}/`,    // required for assets
};

export default nextConfig;
