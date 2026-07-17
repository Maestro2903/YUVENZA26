import { ImageResponse } from "next/og";

/**
 * Branded Open Graph card for every public page (event pages with an
 * uploaded image override this via generateMetadata). WhatsApp/Instagram
 * link shares are the fest's main promo channel - never unfurl as a bare
 * text stub.
 */
export const alt = "Yuvenza · The Youth Club of Chennai Institute of Technology";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1d1d1b",
          color: "#cdc6be",
          padding: "64px 72px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, letterSpacing: 6, textTransform: "uppercase", opacity: 0.85 }}>
          <span>The Youth Club · CIT</span>
          <span>Est. 2023</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 190, fontWeight: 700, letterSpacing: -4, lineHeight: 0.9 }}>
            YUVENZA
          </div>
          <div style={{ fontSize: 40, marginTop: 28, opacity: 0.9 }}>
            Igniting passion, creativity &amp; unity.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, opacity: 0.75 }}>
          <span>What we create, we contribute.</span>
          <span>The Flagship Fest</span>
        </div>
      </div>
    ),
    size
  );
}
