import { notFound } from "next/navigation";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import ImageField from "@/components/admin/ImageField";
import { saveEventAction } from "@/app/(admin)/admin/actions/content";
import { identityHasPermission, requirePagePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminEventEdit({
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

  let event: EventRow | null = null;
  if (!isNew) {
    const supabase = await getServerSupabase();
    if (!supabase) return <p className="adm-flash err">Supabase is not configured.</p>;
    const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    event = data;
  }

  return (
    <>
      <header className="adm-header">
        <div>
          <h1 className="adm-title">{isNew ? "New event" : `Edit: ${event?.title}`}</h1>
          <p className="adm-sub">Registration fee is in INR; 0 makes the entry free.</p>
        </div>
      </header>
      <Flash ok={ok} err={err} />

      <div className="adm-card">
        <form action={saveEventAction} className="adm-form">
          {!isNew && <input type="hidden" name="id" value={event!.id} />}

          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="ev-title">Title *</label>
              <input id="ev-title" name="title" required maxLength={150} defaultValue={event?.title ?? ""} />
            </div>
            <div className="adm-field">
              <label htmlFor="ev-slug">Slug *</label>
              <input
                id="ev-slug"
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Lowercase letters, numbers and dashes"
                maxLength={100}
                defaultValue={event?.slug ?? ""}
                placeholder="hackathon"
              />
            </div>
          </div>

          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="ev-category">Category *</label>
              <input id="ev-category" name="category" required maxLength={60} defaultValue={event?.category ?? ""} placeholder="Technology" />
            </div>
            <div className="adm-field">
              <label htmlFor="ev-date">Date label (shown on cards) *</label>
              <input id="ev-date" name="date_label" required maxLength={60} defaultValue={event?.date_label ?? ""} placeholder="Aug 11-12" />
            </div>
          </div>

          <div className="adm-field">
            <label>Schedule</label>
            <div className="adm-field-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div className="adm-field">
                <label htmlFor="ev-cal">Event date</label>
                <input
                  id="ev-cal"
                  name="event_date"
                  type="date"
                  defaultValue={event?.event_date ?? ""}
                />
              </div>
              <div className="adm-field">
                <label htmlFor="ev-start">Start time</label>
                <input
                  id="ev-start"
                  name="start_time"
                  type="time"
                  defaultValue={event?.start_time?.slice(0, 5) ?? ""}
                />
              </div>
              <div className="adm-field">
                <label htmlFor="ev-end">End time</label>
                <input
                  id="ev-end"
                  name="end_time"
                  type="time"
                  defaultValue={event?.end_time?.slice(0, 5) ?? ""}
                />
              </div>
            </div>
            <p className="adm-help">
              The registration page uses these to stop visitors from picking two events that
              overlap. Leave the times empty for open-format entries (multi-day sprints, open
              submissions) - they never clash.
            </p>
          </div>

          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="ev-price">Fee (INR) *</label>
              <input id="ev-price" name="price" type="number" min={0} max={1000000} required defaultValue={event?.price ?? 0} />
            </div>
            <div className="adm-field">
              <label htmlFor="ev-capacity">Capacity (max registrations)</label>
              <input
                id="ev-capacity"
                name="capacity"
                type="number"
                min={0}
                max={100000}
                defaultValue={event?.capacity ?? ""}
                placeholder="Leave empty for unlimited"
              />
              <p className="adm-help">
                Live remaining slots show on the site and update in real time; sold-out events
                can&#x27;t be registered.
              </p>
            </div>
          </div>

          <div className="adm-field">
            <label htmlFor="ev-slots">Slots label (only shown when no capacity is set)</label>
            <input id="ev-slots" name="slots" maxLength={60} defaultValue={event?.slots ?? ""} placeholder="Open entry" />
          </div>

          <div className="adm-field">
            <label htmlFor="ev-desc">Short description *</label>
            <textarea id="ev-desc" name="description" required maxLength={1000} defaultValue={event?.description ?? ""} />
          </div>

          <div className="adm-field">
            <label htmlFor="ev-details">Full details (events page)</label>
            <textarea
              id="ev-details"
              name="details"
              maxLength={5000}
              rows={6}
              defaultValue={event?.details ?? ""}
              placeholder="Everything a visitor should know - format, rules, judging, prizes, what to bring…"
            />
          </div>

          <div className="adm-field">
            <label htmlFor="ev-rules">Rules (one per line)</label>
            <textarea
              id="ev-rules"
              name="rules"
              maxLength={5000}
              rows={6}
              defaultValue={event?.rules ?? ""}
              placeholder={"Teams of 2-4 members\nBring your college ID\nJudges' decision is final"}
            />
            <p className="adm-help">
              Shown as a numbered list on the event&#x27;s own page (/events/&lt;slug&gt;) and
              linked from every attendee&#x27;s registration.
            </p>
          </div>

          <div className="adm-field">
            <label>Showcase image (shown 4:3 on the events page)</label>
            <ImageField
              folder="events"
              urlFieldName="image_url"
              altFieldName="image_alt"
              initialUrl={event?.image_url ?? ""}
              initialAlt={event?.image_alt ?? ""}
              label="Event image"
            />
          </div>

          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="ev-badge">Badge</label>
              <select id="ev-badge" name="badge" defaultValue={event?.badge ?? ""}>
                <option value="">None</option>
                <option value="Popular">Popular</option>
                <option value="New">New</option>
                <option value="Free">Free</option>
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="ev-sort">Sort order</label>
              <input id="ev-sort" name="sort_order" type="number" defaultValue={event?.sort_order ?? 0} />
            </div>
          </div>

          <label className="adm-check">
            <input
              type="checkbox"
              name="published"
              defaultChecked={event?.published ?? false}
              disabled={!canPublish}
            />
            Published{!canPublish && " (needs the publish permission)"}
          </label>

          <div className="adm-form-actions">
            <SubmitButton>{isNew ? "Create event" : "Save changes"}</SubmitButton>
            <a href="/admin/events" className="adm-btn ghost">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
