import Flash from "@/components/admin/Flash";
import Pagination from "@/components/admin/Pagination";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CopyButton from "@/components/admin/CopyButton";
import ImageField from "@/components/admin/ImageField";
import SubmitButton from "@/components/admin/SubmitButton";
import { deleteMediaAction, updateMediaMetaAction } from "@/app/(admin)/admin/actions/media";
import { identityHasPermission, requirePagePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/env";
import { formatBytes, publicMediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; ok?: string; err?: string }>;
}) {
  const identity = await requirePagePermission("media.view");
  const { q = "", page: pageParam, ok, err } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const supabase = await getServerSupabase();
  if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;

  let query = supabase
    .from("media")
    .select("id, path, alt, caption, mime_type, size_bytes, created_at", { count: "exact" });
  if (q) query = query.or(`path.ilike.%${q}%,alt.ilike.%${q}%,caption.ilike.%${q}%`);

  const from = (page - 1) * PAGE_SIZE;
  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const canUpload = identityHasPermission(identity, "media.upload");
  const canDelete = identityHasPermission(identity, "media.delete");
  const baseUrl = getSupabaseUrl() ?? "";

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Media library</h1>
          <p className="adm-sub">
            Images stored in the Supabase &quot;media&quot; bucket. Copy a URL to use it anywhere,
            or attach covers directly from the case-study and event editors.
          </p>
        </div>
      </header>
      <Flash ok={ok} err={err ?? error?.message} />

      {canUpload && (
        <div className="adm-card">
          <h2 className="adm-card-title">Upload image</h2>
          <ImageField folder="general" standalone label="New image" />
        </div>
      )}

      <div className="adm-toolbar" style={{ marginTop: "1.25rem" }}>
        <form method="get">
          <input type="search" name="q" placeholder="Search path, alt text…" defaultValue={q} />
          <button type="submit" className="adm-btn ghost small">
            Search
          </button>
        </form>
      </div>

      {!rows || rows.length === 0 ? (
        <div className="adm-card">
          <p className="adm-empty">No media yet.</p>
        </div>
      ) : (
        <div className="adm-media-grid">
          {rows.map((m) => {
            const url = publicMediaUrl(baseUrl, m.path);
            return (
              <div className="adm-media-card" key={m.id}>
                { }
                <img src={url} alt={m.alt ?? ""} loading="lazy" className="adm-media-thumb" />
                <div className="adm-media-body">
                  <span className="adm-media-path">
                    {m.path} · {formatBytes(m.size_bytes)}
                  </span>
                  {canUpload ? (
                    <form action={updateMediaMetaAction} style={{ display: "grid", gap: "0.4rem" }}>
                      <input type="hidden" name="id" value={m.id} />
                      <input
                        className="adm-input"
                        name="alt"
                        defaultValue={m.alt ?? ""}
                        placeholder="Alt text"
                        maxLength={300}
                        aria-label="Alt text"
                      />
                      <input
                        className="adm-input"
                        name="caption"
                        defaultValue={m.caption ?? ""}
                        placeholder="Caption"
                        maxLength={300}
                        aria-label="Caption"
                      />
                      <div className="adm-row-actions">
                        <SubmitButton className="adm-btn ghost small" pendingLabel="Saving…">
                          Save
                        </SubmitButton>
                        <CopyButton value={url} />
                      </div>
                    </form>
                  ) : (
                    <div className="adm-row-actions">
                      <CopyButton value={url} />
                    </div>
                  )}
                  {canDelete && (
                    <form action={deleteMediaAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmButton confirmText="Delete this image? Pages still referencing it will show a broken image.">
                        Delete
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination basePath="/admin/media" page={page} pageSize={PAGE_SIZE} total={count ?? 0} params={{ q }} />
    </>
  );
}
