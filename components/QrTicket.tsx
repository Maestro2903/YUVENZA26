"use client";

/**
 * Entry-pass QR code with the visitor's name in the middle.
 *
 * The QR encodes "YUV26|<order-id>|<name>" - the order id is an unguessable
 * UUID that staff can look up in Admin -> Orders & payments to verify a
 * ticket. Error-correction level H tolerates ~30% damage, and the centre
 * name pill covers well under that, so the code stays reliably scannable.
 */
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

const SIZE = 260;

function drawNamePill(canvas: HTMLCanvasElement, name: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const label = name.trim().split(/\s+/)[0].slice(0, 14) || "Guest";
  const w = canvas.width;
  const h = canvas.height;

  // Shrink the font until the label fits inside a pill that stays small
  // enough (<~8% of the code area) to keep the QR scannable.
  let fontSize = Math.round(w * 0.085);
  const maxPillWidth = w * 0.5;
  let textWidth = 0;
  do {
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    textWidth = ctx.measureText(label).width;
    if (textWidth + fontSize * 1.2 <= maxPillWidth) break;
    fontSize -= 1;
  } while (fontSize > 9);

  const pillW = Math.min(textWidth + fontSize * 1.2, maxPillWidth);
  const pillH = fontSize * 1.9;
  const x = (w - pillW) / 2;
  const y = (h - pillH) / 2;
  const r = pillH / 2;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + pillW, y, x + pillW, y + pillH, r);
  ctx.arcTo(x + pillW, y + pillH, x, y + pillH, r);
  ctx.arcTo(x, y + pillH, x, y, r);
  ctx.arcTo(x, y, x + pillW, y, r);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, w * 0.008);
  ctx.strokeStyle = "#1d1d1b";
  ctx.stroke();

  ctx.fillStyle = "#1d1d1b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, h / 2 + fontSize * 0.05);
}

export default function QrTicket({
  orderId,
  name,
  caption,
}: {
  orderId: string;
  name: string;
  caption?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const payload = `YUV26|${orderId}|${name.trim().slice(0, 60)}`;
    QRCode.toCanvas(
      canvas,
      payload,
      {
        errorCorrectionLevel: "H",
        width: SIZE,
        margin: 2,
        color: { dark: "#1d1d1b", light: "#ffffff" },
      },
      (err) => {
        if (err) {
          console.warn("[qr] render failed:", err);
          return;
        }
        drawNamePill(canvas, name);
      }
    );
  }, [orderId, name]);

  return (
    <figure className="ev-qr">
      <canvas
        ref={canvasRef}
        className="ev-qr-canvas"
        role="img"
        aria-label={`Entry pass QR code for ${name}`}
      />
      <figcaption className="ev-qr-caption">
        {caption ?? "Your entry pass - show this QR at the venue."}
      </figcaption>
    </figure>
  );
}
