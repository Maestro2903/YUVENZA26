// Placeholder testimonials. Replace the names, roles and quotes with real
// endorsements you have permission to publish.

export type Testimonial = {
  slug: string;
  quote: string;
  name: string;
  role: string;
  org?: string;
  orgHref?: string;
  hasEnvelope: boolean;
};

export const testimonials: Testimonial[] = [
  {
    slug: "sam-day",
    quote:
      "Blurring the line between design and development, this studio has an unmatched eye for detail and a precise execution that pushes the whole industry forward.",
    name: "Alex Rivera",
    role: "Creative Director & Designer",
    hasEnvelope: true,
  },
  {
    slug: "sofia",
    quote:
      "An eye for detail and impeccable aesthetics make them one of the leaders in today's digital design scene.",
    name: "Sofia Marquez",
    role: "Designer & Art Director",
    hasEnvelope: true,
  },
  {
    slug: "bruno",
    quote:
      "A high-skilled team that creates novel experiences with ease and craft. Their signature grows more vivid with every project they launch.",
    name: "Bruno Alonso",
    role: "Creative Director at",
    org: "Studio BA",
    orgHref: "#",
    hasEnvelope: false,
  },
  {
    slug: "enea",
    quote:
      "A very promising creative practice given its natural aesthetic taste and innate instinct for functionality.",
    name: "Elena Rossi",
    role: "Co-Founder at",
    org: "Adoratorio",
    orgHref: "#",
    hasEnvelope: true,
  },
];
