import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, Pirata_One } from "next/font/google";
import "./globals.css";

// Fraunces  → high-contrast display serif (Editorial New / Domaine Display feel)
// Space Grotesk → geometric grotesque (Canopee feel)
// Pirata One → blackletter numerals (Germgoth feel)
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const pirata = Pirata_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-black",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YUVENZA — Paper Portfolio",
  description:
    "YUVENZA is an award-winning interactive studio passionate about creating iconic digital experiences through motion, typography and creative coding.",
  icons: { icon: "/assets/favicon.svg" },
  openGraph: {
    title: "YUVENZA — Paper Portfolio",
    description:
      "An award-winning interactive studio crafting iconic digital experiences through motion, typography and creative coding.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${grotesk.variable} ${pirata.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
