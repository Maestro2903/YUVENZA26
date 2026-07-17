/**
 * Yuvenza confirmation-email sender - Google Cloud Function (gen2, Node 20).
 *
 * The Next.js app POSTs here after a registration is paid; this function
 * renders the branded template, generates the QR pass PNG and sends the mail
 * through Gmail (Nodemailer + app password). Protected by a shared secret.
 *
 * Environment variables (set at deploy, see README.md):
 *   GMAIL_USER          the Gmail address to send from
 *   GMAIL_APP_PASSWORD  a Google "app password" (requires 2FA on the account)
 *   EMAIL_SHARED_SECRET long random string; must match the app's env
 *   FROM_NAME           display name, e.g. "Yuvenza · The Youth Club"
 */
import functions from "@google-cloud/functions-framework";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderConfirmationEmail } from "./template.js";

const STAMP_PATH = join(dirname(fileURLToPath(import.meta.url)), "stamp.png");

let transporter = null;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transporter;
}

function bad(res, status, error) {
  res.status(status).json({ ok: false, error });
}

functions.http("sendConfirmation", async (req, res) => {
  // Health check (Render pings this; also handy for uptime monitors).
  // No secret required - it reveals nothing and sends nothing.
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "yuvenza-email" });
  }

  // Shared-secret auth - constant shape regardless of failure reason.
  const secret = process.env.EMAIL_SHARED_SECRET;
  if (!secret || req.get("x-email-secret") !== secret) {
    return bad(res, 401, "unauthorized");
  }
  if (req.method !== "POST") return bad(res, 405, "POST only");

  const { to, name, orderId, amountPaise, demo, events, qrPayload, siteUrl } = req.body ?? {};
  if (
    typeof to !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
    typeof name !== "string" ||
    typeof orderId !== "string" ||
    typeof qrPayload !== "string" ||
    !qrPayload.startsWith("YUV26|") ||
    !Array.isArray(events) ||
    events.length === 0 ||
    typeof siteUrl !== "string" ||
    !/^https?:\/\//.test(siteUrl)
  ) {
    return bad(res, 400, "invalid payload");
  }

  try {
    // The QR encodes the same signed payload the site shows - the gate
    // scanner accepts it straight from the email.
    const qrPng = await QRCode.toBuffer(qrPayload, {
      errorCorrectionLevel: "H",
      width: 440,
      margin: 2,
      color: { dark: "#1d1d1b", light: "#ffffff" },
    });

    const html = renderConfirmationEmail({
      name,
      orderId,
      amountPaise: Number(amountPaise) || 0,
      demo: Boolean(demo),
      events: events.slice(0, 20).map((e) => ({
        title: String(e.title ?? ""),
        dateLabel: String(e.dateLabel ?? ""),
        startTime: e.startTime ?? null,
        endTime: e.endTime ?? null,
        venue: e.venue ? String(e.venue) : null,
      })),
      siteUrl,
      qrSrc: "cid:qr-pass",
      logoSrc: "cid:stamp-logo",
    });

    const firstName = name.trim().split(/\s+/)[0] || "there";
    await getTransporter().sendMail({
      from: `"${process.env.FROM_NAME || "Yuvenza"}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `You're in, ${firstName}! Your Yuvenza entry pass 🎟`,
      html,
      attachments: [
        { filename: "yuvenza-stamp.png", path: STAMP_PATH, cid: "stamp-logo" },
        {
          filename: `yuvenza-pass-${orderId.slice(0, 8)}.png`,
          content: qrPng,
          cid: "qr-pass",
        },
      ],
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("send failed:", err);
    bad(res, 500, "send failed");
  }
});
