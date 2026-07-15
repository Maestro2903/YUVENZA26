import type { Metadata, Viewport } from "next";
// The admin panel is fully isolated from the public site: its own root
// layout, its own stylesheet (system fonts, no webflow/globals.css), no
// GSAP/WebGL vendor scripts. This also lets the panel be deployed as a
// separate Vercel project (see docs/SETUP.md - "Separate admin deployment").
import "./admin.css";

export const metadata: Metadata = {
  title: "Yuvenza Admin",
  robots: { index: false, follow: false },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231d1d1b'/%3E%3Ctext x='16' y='22' font-family='system-ui,sans-serif' font-size='16' fill='%23f2efe9' text-anchor='middle'%3E⚙%3C/text%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="adm-body">{children}</body>
    </html>
  );
}
