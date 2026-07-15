/**
 * Renders the confirmation-email template with sample data and exports it as
 * HTML + PDF (via headless Chrome) so the design can be reviewed offline.
 *
 *   node scripts/email-demo.mjs [output-dir]   (default: ~/Downloads)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import QRCode from "qrcode";
import { renderConfirmationEmail } from "../google-cloud/email-function/template.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.argv[2] ?? join(homedir(), "Downloads");
mkdirSync(outDir, { recursive: true });

const SAMPLE = {
  name: "Asha Kumar",
  orderId: "7f3e9d2a-1b4c-4e5f-8a6b-9c0d1e2f3a4b",
  amountPaise: 44800,
  demo: false,
  events: [
    { title: "Hackathon 24", dateLabel: "Aug 11-12" },
    { title: "Design Sprint", dateLabel: "Aug 11", startTime: "10:00", endTime: "13:00" },
    { title: "Run for Kindness", dateLabel: "Aug 13", startTime: "06:00", endTime: "09:00" },
  ],
  siteUrl: "https://yuvenza.vercel.app",
};

const qrSrc = await QRCode.toDataURL(`YUV26|v1|${SAMPLE.orderId}|c2FtcGxlLXNpZ25hdHVyZQ`, {
  errorCorrectionLevel: "H",
  width: 440,
  margin: 2,
  color: { dark: "#1d1d1b", light: "#ffffff" },
});
const logoSrc =
  "data:image/png;base64," +
  readFileSync(join(root, "public/images/stamp.png")).toString("base64");

const html = renderConfirmationEmail({ ...SAMPLE, qrSrc, logoSrc });

const htmlPath = join(outDir, "yuvenza-email-template.html");
const pdfPath = join(outDir, "yuvenza-email-template.pdf");
writeFileSync(htmlPath, html);
console.log("HTML written:", htmlPath);

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
try {
  execFileSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      `--print-to-pdf=${pdfPath}`,
      "--no-pdf-header-footer",
      "--virtual-time-budget=2000",
      htmlPath,
    ],
    { stdio: "pipe", timeout: 60000 }
  );
  console.log("PDF written: ", pdfPath);
} catch (err) {
  console.error("PDF export needs Chrome at", CHROME, "- open the HTML file instead.", err.message);
  process.exitCode = 1;
}
