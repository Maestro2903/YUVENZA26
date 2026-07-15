"use client";

/**
 * Image upload field backed by Supabase Storage.
 *
 * Flow: pick/drop a file -> client-side validation -> server action issues a
 * short-lived signed upload URL (after a media.upload permission check) ->
 * the browser PUTs the file straight to storage (XHR, so we get real upload
 * progress) -> a second server action records it in the media library.
 *
 * In form mode it maintains hidden inputs (url + alt) for the enclosing
 * entity form; in standalone mode (media library) it just refreshes the page.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finalizeUploadAction, prepareUploadAction } from "@/app/(admin)/admin/actions/media";
import { MEDIA_ALLOWED_TYPES, MEDIA_MAX_BYTES, type MediaFolder } from "@/lib/media";

type Props = {
  folder: MediaFolder;
  /** Hidden input names for form mode; omit for standalone (media library). */
  urlFieldName?: string;
  altFieldName?: string;
  initialUrl?: string;
  initialAlt?: string;
  label?: string;
  standalone?: boolean;
};

export default function ImageField({
  folder,
  urlFieldName,
  altFieldName,
  initialUrl = "",
  initialAlt = "",
  label = "Image",
  standalone = false,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [alt, setAlt] = useState(initialAlt);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const uploading = progress !== null;

  async function handleFile(file: File) {
    setError(null);
    setDone(null);

    if (!(MEDIA_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      setError("Only JPEG, PNG, WebP, GIF, AVIF or SVG images are allowed.");
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      setError("Images must be smaller than 10 MB.");
      return;
    }

    setProgress(0);
    try {
      const prep = await prepareUploadAction({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        folder,
      });
      if (!prep.ok) {
        setError(prep.error);
        setProgress(null);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", prep.signedUrl);
        xhr.setRequestHeader("content-type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.send(file);
      });

      const fin = await finalizeUploadAction({
        path: prep.path,
        alt,
        caption,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!fin.ok) {
        setError(fin.error);
        setProgress(null);
        return;
      }

      setProgress(null);
      setUrl(fin.publicUrl);
      setDone("Uploaded ✓");
      if (standalone) {
        setCaption("");
        setAlt("");
        router.refresh();
      }
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="adm-uploader">
      {urlFieldName && <input type="hidden" name={urlFieldName} value={url} />}
      {altFieldName && <input type="hidden" name={altFieldName} value={alt} />}

      {url && !standalone && (
         
        <img src={url} alt={alt || "Current image"} className="adm-uploader-preview" />
      )}

      <div
        className="adm-uploader-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && !uploading) void handleFile(file);
        }}
      >
        <p style={{ margin: "0 0 0.5rem" }}>
          {label}: drag &amp; drop, or{" "}
          <button
            type="button"
            className="adm-btn ghost small"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            browse…
          </button>
        </p>
        <p style={{ margin: 0, fontSize: "0.78rem" }}>JPEG, PNG, WebP, GIF, AVIF or SVG · max 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={(MEDIA_ALLOWED_TYPES as readonly string[]).join(",")}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {uploading && (
        <div>
          <div className="adm-progress" role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress ?? 0}%` }} />
          </div>
          <p className="adm-help" style={{ marginTop: "0.3rem" }}>
            Uploading… {progress}%
          </p>
        </div>
      )}

      <div className="adm-field">
        <label htmlFor={`alt-${folder}-${urlFieldName ?? "standalone"}`}>Alt text</label>
        <input
          id={`alt-${folder}-${urlFieldName ?? "standalone"}`}
          className="adm-input"
          value={alt}
          maxLength={300}
          placeholder="Describe the image for screen readers"
          onChange={(e) => setAlt(e.target.value)}
        />
      </div>
      {standalone && (
        <div className="adm-field">
          <label htmlFor={`caption-${folder}`}>Caption (optional)</label>
          <input
            id={`caption-${folder}`}
            className="adm-input"
            value={caption}
            maxLength={300}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
      )}

      {url && !standalone && (
        <div className="adm-form-actions">
          <button type="button" className="adm-btn ghost small" onClick={() => setUrl("")}>
            Remove image
          </button>
          <span className="adm-help">Removing only detaches it here; the file stays in the media library.</span>
        </div>
      )}

      {error && (
        <p className="adm-flash err" style={{ margin: 0 }} role="alert">
          {error}
        </p>
      )}
      {done && !error && (
        <p className="adm-flash ok" style={{ margin: 0 }} role="status">
          {done}
        </p>
      )}
    </div>
  );
}
