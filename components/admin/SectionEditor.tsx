"use client";

/**
 * Schema-less editor for the JSON site sections (site_content). It renders a
 * friendly form from the section's current shape - strings become inputs or
 * textareas, arrays get add/remove controls - so non-technical admins never
 * see raw JSON. Submission posts the whole object to saveSectionAction, which
 * re-checks permissions and validates the payload.
 */
import { useState } from "react";
import { saveSectionAction } from "@/app/(admin)/admin/actions/content";
import SubmitButton from "@/components/admin/SubmitButton";

type JsonValue = string | number | boolean | JsonValue[] | { [k: string]: JsonValue };

function labelize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function setAtPath(root: JsonValue, path: (string | number)[], value: JsonValue): JsonValue {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const copy = [...root];
    copy[head as number] = setAtPath(copy[head as number], rest, value);
    return copy;
  }
  if (root && typeof root === "object") {
    const copy = { ...(root as Record<string, JsonValue>) };
    copy[head as string] = setAtPath(copy[head as string], rest, value);
    return copy;
  }
  return root;
}

/** Blank clone of a value, used when adding array items. */
function blankOf(value: JsonValue): JsonValue {
  if (typeof value === "string") return "";
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return [];
  const out: Record<string, JsonValue> = {};
  for (const [k, v] of Object.entries(value as Record<string, JsonValue>)) out[k] = blankOf(v);
  return out;
}

export default function SectionEditor({
  sectionKey,
  initialData,
}: {
  sectionKey: string;
  initialData: Record<string, JsonValue>;
}) {
  const [data, setData] = useState<JsonValue>(initialData);

  const update = (path: (string | number)[], value: JsonValue) =>
    setData((d) => setAtPath(d, path, value));

  function renderValue(value: JsonValue, path: (string | number)[], key: string): React.ReactNode {
    const id = `sec-${sectionKey}-${path.join("-")}`;

    if (typeof value === "string") {
      const long = value.length > 70 || value.includes("\n");
      return (
        <div className="adm-field" key={id}>
          <label htmlFor={id}>{labelize(key)}</label>
          {long ? (
            <textarea id={id} value={value} onChange={(e) => update(path, e.target.value)} />
          ) : (
            <input id={id} value={value} onChange={(e) => update(path, e.target.value)} />
          )}
        </div>
      );
    }
    if (typeof value === "number") {
      return (
        <div className="adm-field" key={id}>
          <label htmlFor={id}>{labelize(key)}</label>
          <input
            id={id}
            type="number"
            value={value}
            onChange={(e) => update(path, Number(e.target.value))}
          />
        </div>
      );
    }
    if (typeof value === "boolean") {
      return (
        <label className="adm-check" key={id} htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={value}
            onChange={(e) => update(path, e.target.checked)}
          />
          {labelize(key)}
        </label>
      );
    }
    if (Array.isArray(value)) {
      return (
        <fieldset key={id} style={{ border: "1px solid var(--adm-line)", borderRadius: 12, padding: "1rem", display: "grid", gap: "1rem" }}>
          <legend style={{ fontWeight: 650, padding: "0 0.4rem" }}>{labelize(key)}</legend>
          {value.map((item, i) => (
            <div key={`${id}-${i}`} style={{ display: "grid", gap: "0.6rem", borderBottom: i < value.length - 1 ? "1px dashed var(--adm-line)" : "none", paddingBottom: "0.8rem" }}>
              {typeof item === "object" && item !== null && !Array.isArray(item) ? (
                Object.entries(item).map(([k, v]) => renderValue(v, [...path, i, k], k))
              ) : (
                renderValue(item, [...path, i], `${key} ${i + 1}`)
              )}
              <button
                type="button"
                className="adm-btn danger small"
                style={{ justifySelf: "start" }}
                onClick={() => update(path, value.filter((_, j) => j !== i))}
              >
                Remove item
              </button>
            </div>
          ))}
          <button
            type="button"
            className="adm-btn ghost small"
            style={{ justifySelf: "start" }}
            onClick={() => update(path, [...value, blankOf(value[0] ?? "")])}
          >
            + Add item
          </button>
        </fieldset>
      );
    }
    if (value && typeof value === "object") {
      return (
        <fieldset key={id} style={{ border: "1px solid var(--adm-line)", borderRadius: 12, padding: "1rem", display: "grid", gap: "0.8rem" }}>
          <legend style={{ fontWeight: 650, padding: "0 0.4rem" }}>{labelize(key)}</legend>
          {Object.entries(value).map(([k, v]) => renderValue(v, [...path, k], k))}
        </fieldset>
      );
    }
    return null;
  }

  return (
    <form action={saveSectionAction} className="adm-form" style={{ maxWidth: "52rem" }}>
      <input type="hidden" name="key" value={sectionKey} />
      <input type="hidden" name="data" value={JSON.stringify(data)} />
      {Object.entries(data as Record<string, JsonValue>).map(([k, v]) => renderValue(v, [k], k))}
      <p className="adm-help">
        Tip: wrap a letter in asterisks to give it the serif accent - e.g.{" "}
        <code>W*_o*rk</code> renders the &quot;o&quot; in the display style. A line break in a
        heading is a real new line.
      </p>
      <div className="adm-form-actions">
        <SubmitButton>Save section</SubmitButton>
      </div>
    </form>
  );
}
