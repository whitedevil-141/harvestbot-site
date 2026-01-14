import type { NextConfig } from "next";

const repo = "harvestbot-site"; // <-- your repo name
const isProd = process.env.NODE_ENV === "production";
const nextConfig: NextConfig = {
  output: "export",            // static export
  trailingSlash: true,         // /about/ works on static hosting
  images: { unoptimized: true }, // required for static export with next/image
  ...(isProd ? { basePath: `/${repo}`, assetPrefix: `/${repo}/` } : {}),
};

module.exports = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isProd
    ? { basePath: `/${repo}`, assetPrefix: `/${repo}/` }
    : {}),
};
export default nextConfig;
