/**
 * Yuvenza registration-confirmation email template.
 *
 * Table-based HTML with inline styles (the only markup email clients agree
 * on), in the site's paper design language: ink (#1d1d1b) on paper (#cdc6be),
 * the club stamp as the logo, the signed QR pass inline, and a button to the
 * site where the PDF ticket download lives.
 *
 * Used by the Cloud Function (index.js) and by scripts/email-demo.mjs.
 */

const INK = "#1d1d1b";
const PAPER = "#cdc6be";
const CARD = "#f2efe9";
const MUTED = "#6d675f";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function eventRow(e) {
  const time =
    e.startTime && e.endTime ? ` &middot; ${formatTime(e.startTime)} &ndash; ${formatTime(e.endTime)}` : "";
  const venue = e.venue ? ` &middot; ${esc(e.venue)}` : "";
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px dashed rgba(29,29,27,0.3);">
        <div style="font-size:16px;font-weight:bold;color:${INK};">${esc(e.title)}</div>
        <div style="font-size:13px;color:${MUTED};padding-top:2px;">${esc(e.dateLabel)}${time}${venue}</div>
      </td>
    </tr>`;
}

/**
 * @param {object} p
 * @param {string} p.name          attendee name
 * @param {string} p.orderId       order UUID (pass id)
 * @param {number} p.amountPaise   total paid, in paise (0 = free)
 * @param {boolean} p.demo         demo order (no real payment)
 * @param {{title:string,dateLabel:string,startTime?:string|null,endTime?:string|null}[]} p.events
 * @param {string} p.siteUrl       absolute site URL
 * @param {string} p.qrSrc         img src for the QR (cid:... in email, data: in demo)
 * @param {string} p.logoSrc       img src for the stamp logo (cid:... or data:)
 */
export function renderConfirmationEmail(p) {
  const amount =
    p.amountPaise === 0
      ? "Free entry"
      : `&#8377;${Math.round(p.amountPaise / 100).toLocaleString("en-IN")} paid`;
  const firstName = esc((p.name || "there").trim().split(/\s+/)[0]);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your Yuvenza entry pass</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};font-family:Georgia,'Times New Roman',serif;">
  <!-- preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;">You're in, ${firstName} - your Yuvenza entry pass is inside.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:24px 12px;">
    <tr><td align="center">

      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header: stamp logo -->
        <tr><td align="center" style="padding:12px 0 20px;">
          <img src="${p.logoSrc}" width="92" height="92" alt="Yuvenza" style="display:block;" />
        </td></tr>

        <!-- Card -->
        <tr><td style="background:${CARD};border:1px solid ${INK};border-radius:14px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

            <!-- Ink band -->
            <tr><td style="background:${INK};padding:26px 32px;">
              <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${PAPER};opacity:0.8;">Yuvenza &middot; The Youth Club of CIT</div>
              <div style="font-size:34px;font-weight:bold;color:${PAPER};padding-top:6px;letter-spacing:1px;">YOU&rsquo;RE IN${p.demo ? " (DEMO)" : ""}!</div>
            </td></tr>

            <!-- Body -->
            <tr><td style="padding:28px 32px 8px;">
              <p style="margin:0;font-size:16px;line-height:1.6;color:${INK};">
                See you at the fest, <strong>${firstName}</strong>. Your registration is confirmed
                &mdash; show the QR below at the venue and you&rsquo;re through the gate.
              </p>
            </td></tr>

            <!-- QR pass -->
            <tr><td align="center" style="padding:22px 32px 6px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr><td style="background:#ffffff;border:1px solid ${INK};border-radius:12px;padding:14px;">
                  <img src="${p.qrSrc}" width="220" height="220" alt="Entry pass QR code for ${esc(p.name)}" style="display:block;" />
                </td></tr>
              </table>
              <div style="font-size:14px;color:${INK};padding-top:10px;font-weight:bold;">${esc(p.name)}</div>
              <div style="font-size:12px;color:${MUTED};padding-top:2px;">Pass ID: ${esc(p.orderId)}</div>
            </td></tr>

            <!-- Events -->
            <tr><td style="padding:18px 32px 0;">
              <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${MUTED};border-bottom:1px solid ${INK};padding-bottom:6px;">Your entries</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${p.events.map(eventRow).join("")}
              </table>
              <div style="font-size:15px;font-weight:bold;color:${INK};padding:12px 0 0;">${amount}${p.demo ? " &middot; demo, no real payment" : ""}</div>
            </td></tr>

            <!-- CTA -->
            <tr><td align="center" style="padding:26px 32px 30px;">
              <a href="${esc(p.siteUrl)}/registration" style="display:inline-block;background:${INK};color:${PAPER};text-decoration:none;font-size:15px;font-weight:bold;letter-spacing:1px;padding:14px 34px;border-radius:40px;">
                DOWNLOAD TICKET (PDF) &nearr;
              </a>
              <div style="font-size:12px;color:${MUTED};padding-top:10px;">
                Sign in with the same Google account to view your passes any time.
              </div>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:22px 12px 8px;">
          <div style="font-size:13px;color:${INK};letter-spacing:1px;">What we create, we contribute.</div>
          <div style="font-size:12px;color:${MUTED};padding-top:6px;">
            Yuvenza &middot; Chennai Institute of Technology &middot;
            <a href="${esc(p.siteUrl)}" style="color:${MUTED};">${esc(p.siteUrl.replace(/^https?:\/\//, ""))}</a>
          </div>
          <div style="font-size:11px;color:${MUTED};padding-top:8px;">
            This QR is cryptographically signed and verified at the gate &mdash; keep it to yourself.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
