import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // All imagery, fonts, JS libraries and the WebGL paper-curtain module are
  // self-hosted under public/cdn and public/vendor, so the app runs fully
  // offline. Plain <img> tags are used throughout (matching the source markup)
  // instead of next/image.
  // Pin the workspace root to this folder (multiple lockfiles exist on the machine).
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};

export default nextConfig;
