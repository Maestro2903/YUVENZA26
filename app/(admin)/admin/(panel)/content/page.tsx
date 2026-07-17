import Link from "next/link";
import Flash from "@/components/admin/Flash";
import SectionEditor from "@/components/admin/SectionEditor";
import { requirePagePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_SECTIONS } from "@/lib/content/fallback";
import type { SectionKey } from "@/lib/content/types";

export const dynamic = "force-dynamic";

const SECTION_LABELS: Record<SectionKey, string> = {
  hero: "Hero (landing)",
  statement: "Statement",
  manifesto: "Manifesto",
  pillars: "Pillars",
  workSection: "Work section header",
  eventsSection: "Events section header",
  quotes: "Testimonials",
  stats: "Impact stats",
  join: "Join CTA",
  fest: "Fest & countdown",
  announcement: "Announcement banner",
};

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; ok?: string; err?: string }>;
}) {
  await requirePagePermission("content.view");
  const { section: sectionParam, ok, err } = await searchParams;
  const sectionKey: SectionKey =
    sectionParam && sectionParam in DEFAULT_SECTIONS ? (sectionParam as SectionKey) : "hero";

  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  const { data: row } = await supabase
    .from("site_content")
    .select("data, updated_at")
    .eq("key", sectionKey)
    .maybeSingle();

  const defaults = DEFAULT_SECTIONS[sectionKey] as unknown as Record<string, never>;
  const stored = (row?.data ?? {}) as Record<string, never>;
  const data = { ...defaults, ...stored };

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Site sections</h1>
          <p className="adm-sub">
            The editable copy blocks on the public site. Changes go live within a few seconds of
            saving.
          </p>
        </div>
      </header>
      <Flash ok={ok} err={err} />

      <div className="adm-toolbar" role="tablist" aria-label="Site sections">
        {(Object.keys(DEFAULT_SECTIONS) as SectionKey[]).map((key) => (
          <Link
            key={key}
            href={`/admin/content?section=${key}`}
            className={`adm-btn small ${key === sectionKey ? "" : "ghost"}`}
          >
            {SECTION_LABELS[key]}
          </Link>
        ))}
      </div>

      <div className="adm-card">
        <h2 className="adm-card-title">{SECTION_LABELS[sectionKey]}</h2>
        {row?.updated_at && (
          <p className="adm-help" style={{ marginTop: "-0.5rem", marginBottom: "1rem" }}>
            Last saved {new Date(row.updated_at).toLocaleString("en-IN")}
          </p>
        )}
        <SectionEditor key={sectionKey} sectionKey={sectionKey} initialData={data} />
      </div>
    </>
  );
}
