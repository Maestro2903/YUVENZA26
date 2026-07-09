import type { Metadata, Viewport } from "next";
// Self-hosted Webflow stylesheet (base), then our overrides.
import "./webflow.css";
import "./globals.css";
import SiteScripts from "@/components/SiteScripts";

const DESCRIPTION =
  "Yuvenza is the youth club of Chennai Institute of Technology, igniting passion, creativity and unity, and channelling every event and campaign we create into real social impact for the community.";

export const metadata: Metadata = {
  title: "Yuvenza · The Youth Club",
  description: DESCRIPTION,
  openGraph: {
    title: "Yuvenza · The Youth Club",
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yuvenza · The Youth Club",
    description: DESCRIPTION,
  },
  // Inline SVG favicon (letter "Y") so there's no dependency on an image file.
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%231d1d1b'/%3E%3Ctext x='16' y='23' font-family='Georgia,serif' font-size='22' fill='%23cdc6be' text-anchor='middle'%3EY%3C/text%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="body">
        {/* Below-fold WebGL paper curtain canvas (page-enter transitions) */}
        <div className="gl-canvas below w-embed">
          <canvas id="below-canvas" />
        </div>

        {/* Landscape hint on small devices */}
        <div className="rotate">
          <div className="rotate-desc">
            Please rotate your device
            <br />
            to ensure a better experience.
          </div>
        </div>

        {children}

        <SiteScripts />
      </body>
    </html>
  );
}
