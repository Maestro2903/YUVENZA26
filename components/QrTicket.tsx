"use client";

/**
 * Entry-pass QR code with the visitor's name in the middle, plus a one-click
 * PDF download of the full ticket.
 *
 * The QR content is a SERVER-SIGNED payload fetched from
 * /api/ticket/[orderId] - it is issued only for paid orders and only to the
 * order's owner (or an admin), and carries an HMAC signature that check-in
 * verification requires. Nothing scannable can be produced client-side, so
 * passes cannot be forged. Error-correction level H tolerates ~30% damage,
 * so the centre name pill never breaks scanning.
 */
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { formatTimeRange } from "@/lib/events/clash";
import { INR } from "@/lib/content/types";

const SIZE = 260;

type TicketEvent = {
  title: string;
  dateLabel: string;
  startTime: string | null;
  endTime: string | null;
  venue?: string | null;
};

type TicketData = {
  payload: string;
  orderId: string;
  name: string;
  email: string;
  phone: string;
  college: string | null;
  amountPaise: number;
  createdAt: string;
  events: TicketEvent[];
  demo: boolean;
};

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

function eventLine(e: TicketEvent): string {
  const time = formatTimeRange(e.startTime ?? undefined, e.endTime ?? undefined);
  return `${e.title} — ${e.dateLabel}${time ? ` · ${time}` : ""}${e.venue ? ` · ${e.venue}` : ""}`;
}

/** Draw the full A4 ticket and trigger the download (jsPDF loaded on demand). */
async function downloadPdf(ticket: TicketData, canvas: HTMLCanvasElement | null) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 18;
  const ink = "#1d1d1b";
  const paper = "#f2efe9";

  // Header band
  doc.setFillColor(ink);
  doc.rect(0, 0, pageW, 34, "F");
  doc.setTextColor(paper);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("YUVENZA", margin, 15);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Entry Pass · The Youth Club of Chennai Institute of Technology", margin, 23);
  doc.setFontSize(9);
  doc.text(`Pass ID: ${ticket.orderId}`, margin, 29);

  // QR (canvas already contains the name pill)
  const y = 48;
  if (canvas) {
    const qr = canvas.toDataURL("image/png");
    doc.addImage(qr, "PNG", pageW - margin - 62, y, 62, 62);
  }

  // Attendee details
  doc.setTextColor(ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(ticket.name, margin, y + 6, { maxWidth: pageW - margin * 2 - 66 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const details = [
    ticket.email,
    ticket.phone,
    ticket.college ?? undefined,
    `Issued ${new Date(ticket.createdAt).toLocaleString("en-IN")}`,
  ].filter(Boolean) as string[];
  let dy = y + 16;
  for (const line of details) {
    doc.text(line, margin, dy, { maxWidth: pageW - margin * 2 - 66 });
    dy += 6.5;
  }

  // Events
  dy = Math.max(dy + 8, y + 70);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Registered events", margin, dy);
  doc.setDrawColor(ink);
  doc.setLineWidth(0.4);
  doc.line(margin, dy + 2, pageW - margin, dy + 2);
  dy += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  for (const e of ticket.events) {
    doc.text(`•  ${eventLine(e)}`, margin, dy, { maxWidth: pageW - margin * 2 });
    dy += 7;
  }

  // Amount
  dy += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const amount =
    ticket.amountPaise === 0 ? "Free entry" : `Paid: ${INR(Math.round(ticket.amountPaise / 100))}`;
  doc.text(`${amount}${ticket.demo ? "  (DEMO - no real payment)" : ""}`, margin, dy);

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#6d675f");
  doc.text(
    "Show the QR at the venue. The code is cryptographically signed and verified at check-in - screenshots work,\nbut edits don't. Every fee funds the community causes we back. What we create, we contribute.",
    margin,
    285 - 10
  );

  if (ticket.demo) {
    doc.setTextColor("#c0392b");
    doc.setFontSize(48);
    doc.setFont("helvetica", "bold");
    doc.text("DEMO", pageW / 2, 160, { angle: 30, align: "center" });
  }

  doc.save(`yuvenza-pass-${ticket.orderId.slice(0, 8)}.pdf`);
}

export default function QrTicket({ orderId }: { orderId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTicket(null);
    setError(null);
    fetch(`/api/ticket/${orderId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setError(data?.error ?? "Could not load your pass. Please try again.");
          return;
        }
        setTicket(data as TicketData);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your pass. Check your connection.");
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ticket) return;
    QRCode.toCanvas(
      canvas,
      ticket.payload,
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
        drawNamePill(canvas, ticket.name);
      }
    );
  }, [ticket]);

  if (error) {
    return (
      <p className="ev-status error" role="alert">
        {error}
      </p>
    );
  }
  if (!ticket) {
    return <p className="ev-qr-caption">Loading your entry pass…</p>;
  }

  return (
    <figure className="ev-qr">
      <canvas
        ref={canvasRef}
        className="ev-qr-canvas"
        role="img"
        aria-label={`Entry pass QR code for ${ticket.name}`}
      />
      <figcaption className="ev-qr-caption">
        {ticket.events.map((e) => e.title).join(" · ")}
        {ticket.demo ? " (demo)" : ""} — show this QR at the venue.
      </figcaption>
      <button
        type="button"
        className="ev-qr-download"
        disabled={downloading}
        onClick={async () => {
          setDownloading(true);
          try {
            await downloadPdf(ticket, canvasRef.current);
          } catch (err) {
            console.warn("[qr] pdf failed:", err);
            setError("Could not build the PDF. Please try again.");
          } finally {
            setDownloading(false);
          }
        }}
      >
        {downloading ? "Preparing PDF…" : "Download ticket (PDF)"}
      </button>
    </figure>
  );
}
