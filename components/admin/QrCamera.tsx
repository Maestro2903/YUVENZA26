"use client";

/**
 * Camera QR reader for gate check-in. Uses the native BarcodeDetector where
 * available (Chrome/Edge/Android) and falls back to jsQR (loaded on demand)
 * elsewhere (Safari/iOS). Emits each decoded payload once (4s dedup window)
 * via onDecode; the parent runs the server-side verification.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

const SCAN_INTERVAL_MS = 250;
const DEDUP_MS = 4000;

export default function QrCamera({
  onDecode,
  paused = false,
}: {
  onDecode: (payload: string) => void;
  /** Pause decoding (e.g. while a verification is in flight). */
  paused?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ payload: string; at: number }>({ payload: "", at: 0 });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      // The <video> only mounts once active - the effect below attaches
      // the stream after render.
      setActive(true);
    } catch (err) {
      console.warn("[scanner] camera failed:", err);
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied - allow camera access and try again."
          : "Could not open the camera on this device. Use the text box below instead."
      );
    }
  }, []);

  useEffect(() => stop, [stop]); // stop camera on unmount

  // Attach the stream once the <video> element has mounted.
  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      void video.play().catch((err) => console.warn("[scanner] play failed:", err));
    }
  }, [active]);

  // Decode loop
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    type JsQrFn = (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
    let detector: BarcodeDetectorLike | null = null;
    let jsqr: JsQrFn | null = null;

    const emit = (payload: string) => {
      const now = Date.now();
      if (payload === lastRef.current.payload && now - lastRef.current.at < DEDUP_MS) return;
      lastRef.current = { payload, at: now };
      onDecode(payload);
    };

    const tick = async () => {
      if (cancelled || pausedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;

      try {
        if (window.BarcodeDetector) {
          detector ??= new window.BarcodeDetector({ formats: ["qr_code"] });
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) emit(codes[0].rawValue);
          return;
        }
        if (!jsqr) {
          jsqr = (await import("jsqr")).default as JsQrFn;
        }
        // Downscale for decode speed; QR modules survive fine at 480px.
        const scale = Math.min(1, 480 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsqr?.(image.data, image.width, image.height);
        if (code?.data) emit(code.data);
      } catch (err) {
        console.warn("[scanner] decode error:", err);
      }
    };

    const id = setInterval(() => void tick(), SCAN_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, onDecode]);

  return (
    <div className="adm-scanner">
      {active ? (
        <>
          <div className="adm-scanner-frame">
            { }
            <video ref={videoRef} playsInline muted className="adm-scanner-video" />
            <div className="adm-scanner-target" aria-hidden="true" />
          </div>
          <div className="adm-form-actions">
            <button type="button" className="adm-btn ghost small" onClick={stop}>
              Stop camera
            </button>
            <span className="adm-help">Point the camera at an entry-pass QR.</span>
          </div>
        </>
      ) : (
        <button type="button" className="adm-btn" onClick={() => void start()}>
          📷 Open camera scanner
        </button>
      )}
      {error && (
        <p className="adm-flash err" style={{ margin: "0.6rem 0 0" }} role="alert">
          {error}
        </p>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
