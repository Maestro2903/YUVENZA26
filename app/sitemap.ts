import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { getEvents } from "@/lib/content/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const events = await getEvents();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/registration`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/work`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/legal`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const eventPages: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${base}/events/${e.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...eventPages];
}
