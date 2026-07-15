import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "public/vendor/**", "next-env.d.ts"],
  },
  {
    rules: {
      // The paper design intentionally uses plain <img> for self-hosted assets.
      "@next/next/no-img-element": "off",
      // Public pages deliberately use full-page <a> navigation: the vendor
      // interaction stack (GSAP intro, paper curtain, butter-slider) re-inits
      // per document load and misbehaves under client-side routing.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default config;
