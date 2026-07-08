// Central content model for the site. Swap these values for your own brand,
// copy and imagery — every string and asset path the UI renders lives here.

export const site = {
  brand: "YUVENZA",
  year: "2026",
  location: "Bengaluru, IN",
  email: "hello@yuvenza.studio",
  role: ["digital art director", "Interactive Designer", "creative developer"],
  intro:
    "As a multidisciplinary studio, we craft iconic digital experiences through motion, typography and creative coding for brands and agencies around the world.",
  collab:
    "A strong project is born from deep collaboration. We design, build and ship websites that drive results and win awards.",
  artisan:
    "Like an artisan, we start from raw matter and give life to an iconic product that makes your brand stand out — starting from a visual strategy that guides the client's vision to reality.",
  awardsBlurb:
    "Over the past 5+ years we've teamed up with high-profile clients and partners globally, earning mentions & awards from digital platforms like The FWA, Awwwards, Communication Arts, Site Inspire, Behance, Codrops and many others.",
  socials: [
    { label: "twitter", href: "https://twitter.com" },
    { label: "instagram", href: "https://instagram.com" },
    { label: "dribbble", href: "https://dribbble.com" },
    { label: "behance", href: "https://behance.net" },
  ],
  awards: [
    { init: "Site of the day", title: "Awards", num: "9" },
    { init: "Site of the month", title: "Winners", num: "1" },
    { init: "FWA of the day", title: "Awards", num: "6" },
    { init: "acclaimed", title: "Mentions", num: "8" },
  ],
};

export type Social = (typeof site.socials)[number];
