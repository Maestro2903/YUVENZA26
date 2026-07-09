import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CaseStudy from "@/components/CaseStudy";
import { CASE_STUDIES, CASE_BY_SLUG } from "@/lib/caseStudies";

export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = CASE_BY_SLUG[slug];
  if (!study) return { title: "Yuvenza | Work" };
  return {
    title: `Yuvenza | ${study.title}`,
    description: study.desc,
  };
}

export default async function WorkCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = CASE_BY_SLUG[slug];
  if (!study) notFound();
  return <CaseStudy study={study} />;
}
