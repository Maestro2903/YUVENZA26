/**
 * View-model types for site content. Client-safe (no server imports).
 *
 * Text convention used across editable copy:
 *   - "*x*" renders the letter(s) in the serif accent style (.f-span)
 *   - a literal "\n" renders as a line break
 * See components/Accents.tsx for the renderer.
 */

export type WorkItem = {
  slug: string;
  title: string;
  category: string;
  year: string;
  client?: string;
  description: string;
  story?: string;
  liveSite?: string;
  coverUrl?: string;
  coverAlt?: string;
};

export type EventBadge = "Popular" | "New" | "Free";

export type EventItem = {
  slug: string;
  title: string;
  category: string;
  dateLabel: string;
  /** Calendar date (YYYY-MM-DD); with start/end times it drives clash checks. */
  eventDate?: string;
  /** "HH:MM" 24h. */
  startTime?: string;
  endTime?: string;
  /** Registration fee in INR (rupees). 0 = free entry. */
  price: number;
  description: string;
  slots?: string;
  /** Maximum paid registrations; undefined = unlimited. */
  capacity?: number;
  /** 4:3 showcase image + alt text (admin-uploaded). */
  imageUrl?: string;
  imageAlt?: string;
  /** Long-form write-up for the public events page. */
  details?: string;
  /** Rules, one per line; rendered on the event's own page. */
  rules?: string;
  /** Where the event happens. */
  venue?: string;
  badge?: EventBadge;
};

export type CtaLink = { label: string; href: string };

export type HeroContent = {
  kickerLeft: string;
  kickerRight: string;
  tagline: string;
  lead: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  tertiaryCta: CtaLink;
  facts: string[];
};

export type StatementContent = { heading: string; body: string };
export type ManifestoContent = { body: string; tagline: string };
export type PillarsContent = {
  heading: string;
  items: { num: string; title: string; body: string }[];
};
export type SectionHeadContent = {
  kickerLeft?: string;
  kickerRight?: string;
  heading: string;
  lead?: string;
};
export type QuotesContent = {
  heading: string;
  items: { text: string; name: string; role: string }[];
};
export type StatsContent = { items: { num: string; label: string }[] };
export type JoinContent = { kicker: string; heading: string };
export type AnnouncementContent = {
  /** Show the banner site-wide when true. */
  enabled: boolean;
  text: string;
  /** Optional call-to-action; both must be set for the link to render. */
  linkLabel: string;
  linkHref: string;
};
export type FestContent = {
  name: string;
  dateLabel: string;
  venue: string;
  /** ISO datetime the countdown ticks toward. */
  countdownTarget: string;
  /** Human label shown next to the countdown (e.g. "August 11"). */
  countdownDateLabel: string;
};

export type SiteSections = {
  hero: HeroContent;
  statement: StatementContent;
  manifesto: ManifestoContent;
  pillars: PillarsContent;
  workSection: SectionHeadContent;
  eventsSection: SectionHeadContent;
  quotes: QuotesContent;
  stats: StatsContent;
  join: JoinContent;
  fest: FestContent;
  announcement: AnnouncementContent;
};

export type SectionKey = keyof SiteSections;

export type GeneralSettings = {
  siteName: string;
  siteDescription: string;
  instagramUrl: string;
  linkedinUrl: string;
  locationLabel: string;
  /** Support inbox shown in the footer and in payment-help copy. */
  contactEmail: string;
};

export type PaymentSettings = {
  enabled: boolean;
};

export type RegistrationSettings = {
  /** Google accounts must belong to this domain; "*" allows any domain. */
  allowedEmailDomain: string;
  /** Checkout requires a signed-in (Google) user. */
  requireLogin: boolean;
  /** ISO datetime after which checkout refuses new registrations ("" = never). */
  closesAt: string;
};

export const INR = (n: number) => (n === 0 ? "Free" : "₹" + n.toLocaleString("en-IN"));
