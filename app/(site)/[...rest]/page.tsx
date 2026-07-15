import { notFound } from "next/navigation";

/**
 * Global 404 catch-all. With two root layouts (site/admin route groups) there
 * is no app-level not-found.tsx, so this catch-all routes every unmatched URL
 * to the site group's styled not-found page. Real routes always win over a
 * catch-all, so this never shadows actual pages.
 */
export default function CatchAllNotFound() {
  notFound();
}
