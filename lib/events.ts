/**
 * Events / entries people can register for at Yuvenza's flagship fest.
 * Frontend data only. Prices are registration fees in INR, and every fee
 * feeds the social causes the club backs. Wire a real payment provider to the
 * checkout in components/EventsClient.tsx when it's ready.
 */

export type YuvenzaEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  /** Registration fee in INR. 0 means free entry. */
  price: number;
  desc: string;
  slots: string;
  badge?: "Popular" | "New" | "Free";
};

export const EVENTS: YuvenzaEvent[] = [
  {
    id: "hackathon",
    title: "Hackathon 24",
    category: "Technology",
    date: "Feb 14-15",
    price: 299,
    desc: "A 24-hour build sprint where teams ship something that matters. Mentors on tap, midnight chai included.",
    slots: "120 slots",
    badge: "Popular",
  },
  {
    id: "battle-of-bands",
    title: "Battle of Bands",
    category: "Culture",
    date: "Feb 15",
    price: 199,
    desc: "The loudest night of the fest. Bring your band, own the stage and play for the crowd.",
    slots: "16 bands",
  },
  {
    id: "design-sprint",
    title: "Design Sprint",
    category: "Workshop",
    date: "Feb 14",
    price: 149,
    desc: "A hands-on studio session on brand, type and interface, run by working designers.",
    slots: "60 seats",
    badge: "New",
  },
  {
    id: "frame-by-frame",
    title: "Frame by Frame",
    category: "Photography",
    date: "Feb 14-15",
    price: 99,
    desc: "A campus-wide photography contest on the theme of kindness. Shoot, submit, get exhibited.",
    slots: "Open entry",
  },
  {
    id: "arena",
    title: "The Arena",
    category: "eSports",
    date: "Feb 15",
    price: 149,
    desc: "Squad up for the fest gaming tournament. Brackets, big screens and bragging rights.",
    slots: "32 teams",
  },
  {
    id: "canvas",
    title: "Canvas",
    category: "Art & Craft",
    date: "Feb 14",
    price: 79,
    desc: "A live art and craft contest. Paints, paper and a few hours to make something beautiful.",
    slots: "80 seats",
  },
  {
    id: "the-great-debate",
    title: "The Great Debate",
    category: "Literary",
    date: "Feb 15",
    price: 0,
    desc: "Free and open floor. Take a side, make your case and change a few minds.",
    slots: "48 speakers",
    badge: "Free",
  },
  {
    id: "run-for-kindness",
    title: "Run for Kindness",
    category: "Fundraiser",
    date: "Feb 16",
    price: 249,
    desc: "A 5K charity run to close the fest. Every rupee raised goes straight to our community drives.",
    slots: "300 runners",
  },
];

export const INR = (n: number) =>
  n === 0 ? "Free" : "₹" + n.toLocaleString("en-IN");
