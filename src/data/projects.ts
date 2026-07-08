// Project entries. `thumb` and `logo` point at the generated placeholder art
// in /public/assets/projects — replace with your own case-study imagery.

export type Project = {
  slug: string;
  name: string;
  desc: string;
  isNew?: boolean;
  href: string;
};

export const projects: Project[] = [
  {
    slug: "books-of-ye",
    name: "Books of Ye",
    desc: "A conceptual NFT web experience reimagining classic scripture through a bold, type-driven interactive narrative.",
    isNew: true,
    href: "#",
  },
  {
    slug: "om-swami",
    name: "Om Swami",
    desc: "A serene editorial platform for a spiritual leader and bestselling author residing in the Himalayan foothills.",
    isNew: true,
    href: "#",
  },
  {
    slug: "avroko",
    name: "AvroKO",
    desc: "An award-winning global design firm and a leader in interior architecture for hospitality, restaurants and bars.",
    isNew: true,
    href: "#",
  },
  {
    slug: "wow-concept",
    name: "WOW Concept",
    desc: "A first-of-its-kind concept store based in Madrid, reinventing retail with a dynamic, interactive shopping experience.",
    isNew: true,
    href: "#",
  },
  {
    slug: "roger-hub",
    name: "Roger Hub",
    desc: "An immersive web experience showcasing tennis-inspired sneakers, born from a partnership with a legendary champion.",
    isNew: true,
    href: "#",
  },
  {
    slug: "prada",
    name: "Prada Employees",
    desc: "An eCommerce outlet gathering previous collection seasons within a restrained, minimalist-driven design.",
    isNew: false,
    href: "#",
  },
  {
    slug: "unexpected-time",
    name: "Unexpected Time",
    desc: "A classic-futuristic gamified web experience exploring lost history and culture in a world ruled by virtual reality.",
    isNew: true,
    href: "#",
  },
];

// Convenience groupings for the split index galleries.
export const indexLeft = projects.slice(0, 3);
export const indexRight = projects.slice(3, 6);
