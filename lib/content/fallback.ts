/**
 * Static fallback content. The public site renders from Supabase when it is
 * configured; without it (local dev, misconfiguration, outage) these values
 * keep every page working. They mirror supabase/seed.sql - if you edit one,
 * edit the other.
 */
import type {
  EventItem,
  GeneralSettings,
  SiteSections,
  WorkItem,
} from "@/lib/content/types";

export const FALLBACK_WORK: WorkItem[] = [
  {
    slug: "blind-school-visit",
    title: "Blind School Visit",
    category: "Community",
    year: "2024",
    client: "Victoria Memorial Blind School",
    description:
      "A morning spent with the students of Victoria Memorial Blind School. We arrived with supplies, essentials and, most of all, our time, sitting with the children, listening to their stories and sharing an afternoon of music, games and companionship.",
    story:
      "We wanted this to be more than a donation drop. The team pooled funds raised at our own events, put together everyday essentials the school had asked for and simply showed up to spend the day. What the students remembered was not the supplies but the company, and that is exactly the point of everything Yuvenza does.",
  },
  {
    slug: "girl-child-home",
    title: "Girl Child Home",
    category: "Care",
    year: "2023",
    description:
      "A Christmas with the girls of a local child home shelter. We turned a season of giving into a day of belonging, decorations, gifts, a shared meal and a room full of laughter for children who deserve every bit of it.",
    story:
      "Christmas can feel very far away when you do not have a home to celebrate it in. So the club adopted a girl child home for the season, funded gifts and a festive spread from our event proceeds, and spent the day making sure every child felt seen. Small acts of kindness, we keep learning, make the biggest difference.",
  },
  {
    slug: "poverty-awareness",
    title: "Poverty Awareness",
    category: "Campaign",
    year: "2024",
    description:
      "A campus wide campaign confronting poverty eradication head on. Through talks, drives and student led fundraising, we turned awareness into action and channelled every rupee raised straight back to the people who need it.",
    story:
      "Awareness only matters when it moves. We built the campaign around simple, honest conversations, then paired them with a fundraising push across campus. The money we gathered went directly to relief, and the volunteers we recruited stayed on for the drives that followed.",
  },
  {
    slug: "braille-awareness",
    title: "Braille Awareness",
    category: "Inclusion",
    year: "2024",
    description:
      "An accessibility and Braille awareness initiative built to make the world a little more reachable for everyone. Workshops, hands on demos and student volunteers came together to put inclusion on the campus agenda.",
    story:
      "Most students had never touched a line of Braille. We changed that with hands on sessions, guest speakers and a campaign that reframed accessibility as everyone's responsibility. By the end, inclusion was not a topic we talked about once, it was a habit the campus carried forward.",
  },
  {
    slug: "green-drive",
    title: "Green Campus Drive",
    category: "Environment",
    year: "2024",
    description:
      "An environmental responsibility drive that started on campus and carried into the city. From clean ups to planting to waste awareness, we rallied students behind a greener, more conscious Chennai.",
    story:
      "We treated the environment like any other cause worth fighting for, with people and momentum. Students signed up in numbers, we organised clean ups and green sessions, and the energy spilled well beyond the college gates. What we create, we contribute, and here what we created was a cleaner shared space.",
  },
  {
    slug: "youth-mentoring",
    title: "Youth Mentoring",
    category: "Empowerment",
    year: "2023",
    description:
      "A mentoring programme guiding fellow students through leadership, growth and personal development. Peer to peer, honest and hands on, built to turn potential into purpose.",
    story:
      "The best mentors are often just a few steps ahead. We paired students with peers and seniors, ran sessions on leadership and personal growth, and created a space where asking for guidance felt normal. Empowering young people to lead is how this club renews itself every single year.",
  },
  {
    slug: "flagship-fest",
    title: "Flagship Fest",
    category: "Event",
    year: "2024",
    description:
      "Our flagship fest, the loudest expression of igniting passion, creativity and unity. A campus wide celebration whose every ticket, stall and performance fuels the causes we back all year round.",
    story:
      "The fest is where the whole club comes alive. Months of planning turn into a few unforgettable days of performances, stalls and community, and behind the celebration is a purpose, every bit of what the fest raises flows straight into our social initiatives. Create, and contribute.",
  },
  {
    slug: "community-fundraiser",
    title: "Community Fundraiser",
    category: "Fundraising",
    year: "2023",
    description:
      "The engine behind it all. A student run fundraiser that gathers the resources for every visit, drive and campaign we take on, proof that a campus united can back real causes.",
    story:
      "Nothing we do happens without funds, and we refuse to let that be a barrier. Students organised, promoted and ran the whole thing, and the community showed up. Every rupee raised was accounted for and directed to a cause, because what we create, we contribute.",
  },
];

export const FALLBACK_EVENTS: EventItem[] = [
  {
    slug: "hackathon",
    title: "Hackathon 24",
    category: "Technology",
    dateLabel: "Aug 11-12",
    eventDate: "2026-08-11",
    price: 299,
    venue: "Innovation Lab, Block C",
    capacity: 120,
    description:
      "A 24-hour build sprint where teams ship something that matters. Mentors on tap, midnight chai included.",
    slots: "120 slots",
    badge: "Popular",
  },
  {
    slug: "battle-of-bands",
    title: "Battle of Bands",
    category: "Culture",
    dateLabel: "Aug 12",
    eventDate: "2026-08-12",
    startTime: "18:00",
    endTime: "21:00",
    price: 199,
    venue: "Main Stage, Open Grounds",
    capacity: 16,
    description:
      "The loudest night of the fest. Bring your band, own the stage and play for the crowd.",
    slots: "16 bands",
  },
  {
    slug: "design-sprint",
    title: "Design Sprint",
    category: "Workshop",
    dateLabel: "Aug 11",
    eventDate: "2026-08-11",
    startTime: "10:00",
    endTime: "13:00",
    price: 149,
    venue: "Design Studio, Block B",
    capacity: 60,
    description:
      "A hands-on studio session on brand, type and interface, run by working designers.",
    slots: "60 seats",
    badge: "New",
  },
  {
    slug: "frame-by-frame",
    title: "Frame by Frame",
    category: "Photography",
    dateLabel: "Aug 11-12",
    eventDate: "2026-08-11",
    price: 99,
    venue: "Exhibition Hall",
    description:
      "A campus-wide photography contest on the theme of kindness. Shoot, submit, get exhibited.",
    slots: "Open entry",
  },
  {
    slug: "arena",
    title: "The Arena",
    category: "eSports",
    dateLabel: "Aug 12",
    eventDate: "2026-08-12",
    startTime: "10:00",
    endTime: "14:00",
    price: 149,
    venue: "E-Sports Arena, Block A",
    capacity: 32,
    description:
      "Squad up for the fest gaming tournament. Brackets, big screens and bragging rights.",
    slots: "32 teams",
  },
  {
    slug: "canvas",
    title: "Canvas",
    category: "Art & Craft",
    dateLabel: "Aug 11",
    eventDate: "2026-08-11",
    startTime: "14:00",
    endTime: "17:00",
    price: 79,
    venue: "Art Room, Block B",
    capacity: 80,
    description:
      "A live art and craft contest. Paints, paper and a few hours to make something beautiful.",
    slots: "80 seats",
  },
  {
    slug: "the-great-debate",
    title: "The Great Debate",
    category: "Literary",
    dateLabel: "Aug 12",
    eventDate: "2026-08-12",
    startTime: "15:00",
    endTime: "17:00",
    price: 0,
    venue: "Seminar Hall 1",
    capacity: 48,
    description:
      "Free and open floor. Take a side, make your case and change a few minds.",
    slots: "48 speakers",
    badge: "Free",
  },
  {
    slug: "run-for-kindness",
    title: "Run for Kindness",
    category: "Fundraiser",
    dateLabel: "Aug 13",
    eventDate: "2026-08-13",
    startTime: "06:00",
    endTime: "09:00",
    price: 249,
    venue: "Campus Main Gate (start)",
    capacity: 300,
    description:
      "A 5K charity run to close the fest. Every rupee raised goes straight to our community drives.",
    slots: "300 runners",
  },
];

export const DEFAULT_SECTIONS: SiteSections = {
  hero: {
    kickerLeft: "The Youth Club · Chennai Institute of Technology",
    kickerRight: "Est. 2023",
    tagline: "Igniting passion, creativity & unity.",
    lead: "Yuvenza is the student-driven youth club of Chennai Institute of Technology. What we create, we contribute. Every event and campaign we run channels real support back to the community around us.",
    primaryCta: { label: "Register for the fest", href: "/registration" },
    secondaryCta: { label: "Our Work", href: "/work" },
    tertiaryCta: { label: "Join the club", href: "https://www.instagram.com/yuvenza_cit/" },
    facts: [
      "Aug 11-13 · CIT Campus, Chennai",
      "8 events · open to all colleges",
      "Every fee funds our social causes",
    ],
  },
  statement: {
    heading: "The Youth\nP*o*wered Club",
    body: "Since 2023, we've rallied students at Chennai Institute of Technology behind social causes, driving real impact and awareness through kindness. From blind-school visits to poverty, Braille and environmental drives.",
  },
  manifesto: {
    body: "We believe in the power of youth to create meaningful change. Every event and initiative we run channels funds and energy straight back into social causes that make a real difference. Small acts of kindness make the biggest difference.",
    tagline: "Create & Contribute",
  },
  pillars: {
    heading: "What we stand f*_o*r",
    items: [
      {
        num: "01",
        title: "Passion",
        body: "Everything starts with students who care. We turn raw energy into events, campaigns and drives that mean something.",
      },
      {
        num: "02",
        title: "Creativity",
        body: "We design our own way of giving back, blending fresh ideas with hands-on work so every initiative feels alive.",
      },
      {
        num: "03",
        title: "Unity",
        body: "Change is a team sport. We rally the campus together and move as one behind the causes that matter.",
      },
    ],
  },
  workSection: {
    kickerLeft: "Selected Work",
    kickerRight: "Scroll to explore →",
    heading: "Our W*_o*rk",
    lead: "The events, campaigns and community initiatives we've shaped so far.",
  },
  eventsSection: {
    kickerLeft: "What's On",
    heading: "Ev*_e*nts",
    lead: "Pick the entries you want, register in one go, and every fee flows straight into the causes we back.",
  },
  quotes: {
    heading: "In their w*_o*rds",
    items: [
      {
        text: "Yuvenza turned our energy into purpose. Every event we run gives straight back to a cause that matters.",
        name: "The Core Team",
        role: "Yuvenza · CIT",
      },
      {
        text: "Igniting passion, creativity and unity, that's the spirit we carry into every campaign and drive.",
        name: "Our Volunteers",
        role: "Community Outreach",
      },
      {
        text: "What we create, we contribute. It isn't just a line, it's how every member shows up.",
        name: "The Council",
        role: "Chennai Institute of Technology",
      },
    ],
  },
  stats: {
    items: [
      { num: "2023", label: "Founded at CIT" },
      { num: "2.1K+", label: "Strong community" },
      { num: "9", label: "Causes backed" },
      { num: "100%", label: "Student led" },
    ],
  },
  join: {
    kicker: "Let's create change together",
    heading: "J*_o*in the movement",
  },
  announcement: {
    enabled: false,
    text: "",
    linkLabel: "",
    linkHref: "",
  },
  fest: {
    name: "The Flagship Fest",
    dateLabel: "Aug 2026",
    venue: "CIT Campus, Chennai",
    countdownTarget: "2026-08-11T00:00:00+05:30",
    countdownDateLabel: "August 11",
  },
};

export const DEFAULT_REGISTRATION_SETTINGS = {
  allowedEmailDomain: "citchennai.net",
  requireLogin: true,
  closesAt: "",
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  siteName: "Yuvenza · The Youth Club",
  siteDescription:
    "Yuvenza is the youth club of Chennai Institute of Technology, igniting passion, creativity and unity, and channelling every event and campaign we create into real social impact for the community.",
  instagramUrl: "https://www.instagram.com/yuvenza_cit/",
  linkedinUrl: "https://www.linkedin.com/company/yuvenza-cit/",
  locationLabel: "Chennai, India",
  contactEmail: "yuvenza@citchennai.net",
};
