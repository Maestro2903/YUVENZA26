import { notFound } from "next/navigation";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import ImageField from "@/components/admin/ImageField";
import { saveCaseStudyAction } from "@/app/(admin)/admin/actions/content";
import { identityHasPermission, requirePagePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import type { CaseStudyRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminWorkEdit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const { ok, err } = await searchParams;
  const isNew = id === "new";
  const identity = await requirePagePermission(isNew ? "content.create" : "content.edit");
  const canPublish = identityHasPermission(identity, "content.publish");

  let study: CaseStudyRow | null = null;
  if (!isNew) {
    const supabase = await getServerSupabase();
    if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;
    const { data } = await supabase.from("case_studies").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    study = data;
  }

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">{isNew ? "New case study" : `Edit: ${study?.title}`}</h1>
          <p className="adm-sub">
            Shown at /work/{study?.slug ?? "…"} and on the home page rail once published.
          </p>
        </div>
        {study?.published && (
          <a href={`/work/${study.slug}`} className="adm-btn ghost small" target="_blank" rel="noopener noreferrer">
            View live ↗&#xFE0E;
          </a>
        )}
      </header>
      <Flash ok={ok} err={err} />

      <div className="adm-card">
        <form action={saveCaseStudyAction} className="adm-form">
          {!isNew && <input type="hidden" name="id" value={study!.id} />}

          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="cs-title">Title *</label>
              <input id="cs-title" name="title" required maxLength={150} defaultValue={study?.title ?? ""} />
            </div>
            <div className="adm-field">
              <label htmlFor="cs-slug">Slug *</label>
              <input
                id="cs-slug"
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Lowercase letters, numbers and dashes"
                maxLength={100}
                defaultValue={study?.slug ?? ""}
                placeholder="my-initiative"
              />
            </div>
          </div>

          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="cs-category">Category *</label>
              <input id="cs-category" name="category" required maxLength={60} defaultValue={study?.category ?? ""} placeholder="Community" />
            </div>
            <div className="adm-field">
              <label htmlFor="cs-year">Year *</label>
              <input id="cs-year" name="year" required maxLength={20} defaultValue={study?.year ?? ""} placeholder="2026" />
            </div>
          </div>

          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="cs-client">Partner / client</label>
              <input id="cs-client" name="client" maxLength={150} defaultValue={study?.client ?? ""} />
            </div>
            <div className="adm-field">
              <label htmlFor="cs-live">Live site URL</label>
              <input id="cs-live" name="live_site" type="url" maxLength={300} defaultValue={study?.live_site ?? ""} placeholder="https://…" />
            </div>
          </div>

          <div className="adm-field">
            <label htmlFor="cs-desc">Description *</label>
            <textarea id="cs-desc" name="description" required maxLength={2000} defaultValue={study?.description ?? ""} />
          </div>
          <div className="adm-field">
            <label htmlFor="cs-story">Work story</label>
            <textarea id="cs-story" name="story" maxLength={4000} defaultValue={study?.story ?? ""} />
            <p className="adm-help">Long-form paragraph for the &quot;Work Story&quot; block. Optional.</p>
          </div>

          <div className="adm-field">
            <label>Cover image</label>
            <ImageField
              folder="case-studies"
              urlFieldName="cover_url"
              altFieldName="cover_alt"
              initialUrl={study?.cover_url ?? ""}
              initialAlt={study?.cover_alt ?? ""}
              label="Cover"
            />
          </div>

          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="cs-sort">Sort order</label>
              <input id="cs-sort" name="sort_order" type="number" defaultValue={study?.sort_order ?? 0} />
            </div>
            <label className="adm-check" style={{ alignSelf: "end" }}>
              <input
                type="checkbox"
                name="published"
                defaultChecked={study?.published ?? false}
                disabled={!canPublish}
              />
              Published{!canPublish && " (needs the publish permission)"}
            </label>
          </div>

          <div className="adm-form-actions">
            <SubmitButton>{isNew ? "Create case study" : "Save changes"}</SubmitButton>
            <a href="/admin/work" className="adm-btn ghost">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
