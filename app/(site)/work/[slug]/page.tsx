import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CaseStudy from "@/components/CaseStudy";
import { getWorkItem, getWorkItems, getWorkNeighbors } from "@/lib/content/queries";

export const revalidate = 300;
// Slugs created later through the admin panel are rendered on demand.
export const dynamicParams = true;

export async function generateStaticParams() {
  const work = await getWorkItems();
  return work.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = await getWorkItem(slug);
  if (!study) return { title: "Yuvenza | Work" };
  return {
    title: `Yuvenza | ${study.title}`,
    description: study.description,
  };
}

export default async function WorkCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [study, neighbors] = await Promise.all([getWorkItem(slug), getWorkNeighbors(slug)]);
  if (!study || !neighbors) notFound();
  return <CaseStudy study={study} prev={neighbors.prev} next={neighbors.next} />;
}
