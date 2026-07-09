/**
 * Work content for /work and /work/[slug].
 *
 * These are Yuvenza's own initiatives, campaigns and events (the youth club of
 * Chennai Institute of Technology). A single data set drives one shared template
 * (components/CaseStudy.tsx), so every project page is laid out identically.
 *
 * Cover imagery is currently drawn from the site's local paper-blended image
 * library as placeholders; swap the `cover` paths for real event photography
 * when it is available.
 */

export const CDN_ROOT = "/cdn/";
const T = "5f9085a4041dd5427c5ac8ae/";

export type CaseStudy = {
  slug: string;
  title: string;
  cover: string; // path after CDN_ROOT
  desc: string;
  /** Short label shown in the meta bar (e.g. "Community"). */
  category: string;
  /** Year label shown in the meta bar. */
  year: string;
  /** Optional partner / collaborator credit. */
  client?: string;
  /** Optional long-form "Work Story" paragraph; falls back to a templated line. */
  story?: string;
  liveSite?: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "blind-school-visit",
    title: "Blind School Visit",
    cover: T + "621f2de58c0579490e2c5a94_thumbnail-big.jpeg",
    category: "Community",
    year: "2024",
    client: "Victoria Memorial Blind School",
    desc: "A morning spent with the students of Victoria Memorial Blind School. We arrived with supplies, essentials and, most of all, our time, sitting with the children, listening to their stories and sharing an afternoon of music, games and companionship.",
    story:
      "We wanted this to be more than a donation drop. The team pooled funds raised at our own events, put together everyday essentials the school had asked for and simply showed up to spend the day. What the students remembered was not the supplies but the company, and that is exactly the point of everything Yuvenza does.",
  },
  {
    slug: "girl-child-home",
    title: "Girl Child Home",
    cover: T + "61cdc50bf311324e64ce0dcb_thumbnail-big.jpeg",
    category: "Care",
    year: "2023",
    desc: "A Christmas with the girls of a local child home shelter. We turned a season of giving into a day of belonging, decorations, gifts, a shared meal and a room full of laughter for children who deserve every bit of it.",
    story:
      "Christmas can feel very far away when you do not have a home to celebrate it in. So the club adopted a girl child home for the season, funded gifts and a festive spread from our event proceeds, and spent the day making sure every child felt seen. Small acts of kindness, we keep learning, make the biggest difference.",
  },
  {
    slug: "poverty-awareness",
    title: "Poverty Awareness",
    cover: T + "615d9662fbb2467631e07c72_thumbnail-big.jpeg",
    category: "Campaign",
    year: "2024",
    desc: "A campus wide campaign confronting poverty eradication head on. Through talks, drives and student led fundraising, we turned awareness into action and channelled every rupee raised straight back to the people who need it.",
    story:
      "Awareness only matters when it moves. We built the campaign around simple, honest conversations, then paired them with a fundraising push across campus. The money we gathered went directly to relief, and the volunteers we recruited stayed on for the drives that followed.",
  },
  {
    slug: "braille-awareness",
    title: "Braille Awareness",
    cover: T + "62220c9574d2ddf1fd74e6fe_thumbnail-big.jpeg",
    category: "Inclusion",
    year: "2024",
    desc: "An accessibility and Braille awareness initiative built to make the world a little more reachable for everyone. Workshops, hands on demos and student volunteers came together to put inclusion on the campus agenda.",
    story:
      "Most students had never touched a line of Braille. We changed that with hands on sessions, guest speakers and a campaign that reframed accessibility as everyone's responsibility. By the end, inclusion was not a topic we talked about once, it was a habit the campus carried forward.",
  },
  {
    slug: "green-drive",
    title: "Green Campus Drive",
    cover: T + "615d9670b144655ffd217ac6_thumbnail-big.jpeg",
    category: "Environment",
    year: "2024",
    desc: "An environmental responsibility drive that started on campus and carried into the city. From clean ups to planting to waste awareness, we rallied students behind a greener, more conscious Chennai.",
    story:
      "We treated the environment like any other cause worth fighting for, with people and momentum. Students signed up in numbers, we organised clean ups and green sessions, and the energy spilled well beyond the college gates. What we create, we contribute, and here what we created was a cleaner shared space.",
  },
  {
    slug: "youth-mentoring",
    title: "Youth Mentoring",
    cover: T + "616ec18d17d26b81ac1203c6_thumbnail-big.jpeg",
    category: "Empowerment",
    year: "2023",
    desc: "A mentoring programme guiding fellow students through leadership, growth and personal development. Peer to peer, honest and hands on, built to turn potential into purpose.",
    story:
      "The best mentors are often just a few steps ahead. We paired students with peers and seniors, ran sessions on leadership and personal growth, and created a space where asking for guidance felt normal. Empowering young people to lead is how this club renews itself every single year.",
  },
  {
    slug: "flagship-fest",
    title: "Flagship Fest",
    cover: T + "647dc0753912d7cfbd50fe17_thumbnail-big.webp",
    category: "Event",
    year: "2024",
    desc: "Our flagship fest, the loudest expression of igniting passion, creativity and unity. A campus wide celebration whose every ticket, stall and performance fuels the causes we back all year round.",
    story:
      "The fest is where the whole club comes alive. Months of planning turn into a few unforgettable days of performances, stalls and community, and behind the celebration is a purpose, every bit of what the fest raises flows straight into our social initiatives. Create, and contribute.",
  },
  {
    slug: "community-fundraiser",
    title: "Community Fundraiser",
    cover: T + "6160264b7d4ffe664c07fbde_thumbnail-big.jpeg",
    category: "Fundraising",
    year: "2023",
    desc: "The engine behind it all. A student run fundraiser that gathers the resources for every visit, drive and campaign we take on, proof that a campus united can back real causes.",
    story:
      "Nothing we do happens without funds, and we refuse to let that be a barrier. Students organised, promoted and ran the whole thing, and the community showed up. Every rupee raised was accounted for and directed to a cause, because what we create, we contribute.",
  },
];

export const CASE_BY_SLUG: Record<string, CaseStudy> = Object.fromEntries(
  CASE_STUDIES.map((c) => [c.slug, c])
);

export function nextCase(slug: string): CaseStudy {
  const i = CASE_STUDIES.findIndex((c) => c.slug === slug);
  return CASE_STUDIES[(i + 1) % CASE_STUDIES.length];
}

export function prevCase(slug: string): CaseStudy {
  const i = CASE_STUDIES.findIndex((c) => c.slug === slug);
  return CASE_STUDIES[(i - 1 + CASE_STUDIES.length) % CASE_STUDIES.length];
}
