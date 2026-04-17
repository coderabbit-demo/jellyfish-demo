import type { RawAstroEvent } from "./types";

type ShowerDef = {
  name: string;
  slug: string;
  /** MM-DD peak date — we compute the actual year at runtime */
  peakMD: string;
  /** Duration window in days either side of peak */
  windowDays: number;
  zenithalHourlyRate: number;
  description: string;
  links: { label: string; url: string }[];
};

const SHOWERS: ShowerDef[] = [
  {
    name: "Quadrantids",
    slug: "quadrantids",
    peakMD: "01-03",
    windowDays: 1,
    zenithalHourlyRate: 120,
    description:
      "One of the strongest annual meteor showers, the Quadrantids can produce up to 120 meteors per hour at peak. They originate from debris left by asteroid 2003 EH1. The shower has a sharp peak lasting only a few hours, so timing is crucial.",
    links: [
      { label: "NASA Guide", url: "https://solarsystem.nasa.gov/asteroids-comets-and-meteors/meteors-and-meteorites/quadrantids/in-depth/" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Quadrantids" },
    ],
  },
  {
    name: "Lyrids",
    slug: "lyrids",
    peakMD: "04-22",
    windowDays: 2,
    zenithalHourlyRate: 20,
    description:
      "The Lyrids are one of the oldest known meteor showers, with records dating back 2,700 years. They originate from Comet Thatcher and can occasionally produce bright fireballs. Best viewed after midnight in a dark location.",
    links: [
      { label: "NASA Guide", url: "https://solarsystem.nasa.gov/asteroids-comets-and-meteors/meteors-and-meteorites/lyrids/in-depth/" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Lyrids" },
    ],
  },
  {
    name: "Eta Aquariids",
    slug: "eta-aquariids",
    peakMD: "05-05",
    windowDays: 3,
    zenithalHourlyRate: 50,
    description:
      "The Eta Aquariids are fragments of Halley's Comet — one of the most famous comets in history. At peak, this shower can produce up to 50 meteors per hour. It's especially spectacular from the Southern Hemisphere.",
    links: [
      { label: "NASA Guide", url: "https://solarsystem.nasa.gov/asteroids-comets-and-meteors/meteors-and-meteorites/eta-aquariids/in-depth/" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Eta_Aquariids" },
    ],
  },
  {
    name: "Perseids",
    slug: "perseids",
    peakMD: "08-12",
    windowDays: 4,
    zenithalHourlyRate: 100,
    description:
      "The Perseids are the most popular meteor shower of the year, producing up to 100 meteors per hour under ideal conditions. They streak from debris left by Comet Swift-Tuttle. Warm August nights make them perfect for backyard watching.",
    links: [
      { label: "NASA Guide", url: "https://solarsystem.nasa.gov/asteroids-comets-and-meteors/meteors-and-meteorites/perseids/in-depth/" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Perseids" },
      { label: "YouTube: How to watch Perseids", url: "https://www.youtube.com/results?search_query=perseids+meteor+shower+guide" },
    ],
  },
  {
    name: "Orionids",
    slug: "orionids",
    peakMD: "10-21",
    windowDays: 3,
    zenithalHourlyRate: 20,
    description:
      "Like the Eta Aquariids, the Orionids are debris from Halley's Comet visiting Earth from the other orbital intersection. They produce swift, bright meteors — sometimes with persistent trains — at up to 20 per hour.",
    links: [
      { label: "NASA Guide", url: "https://solarsystem.nasa.gov/asteroids-comets-and-meteors/meteors-and-meteorites/orionids/in-depth/" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Orionids" },
    ],
  },
  {
    name: "Leonids",
    slug: "leonids",
    peakMD: "11-17",
    windowDays: 2,
    zenithalHourlyRate: 15,
    description:
      "The Leonids originate from Comet Tempel-Tuttle. While typically producing 15 meteors per hour, the Leonids are historically famous for spectacular meteor storms — in 1966 they produced 40–50 meteors per second. Every 33 years, exceptional storms can occur.",
    links: [
      { label: "NASA Guide", url: "https://solarsystem.nasa.gov/asteroids-comets-and-meteors/meteors-and-meteorites/leonids/in-depth/" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Leonids" },
    ],
  },
  {
    name: "Geminids",
    slug: "geminids",
    peakMD: "12-13",
    windowDays: 3,
    zenithalHourlyRate: 150,
    description:
      "The Geminids are arguably the best meteor shower of the year, producing up to 150 multicoloured meteors per hour. Unusually, they originate from an asteroid (3200 Phaethon) rather than a comet, making them a scientific curiosity. Visible even from light-polluted skies.",
    links: [
      { label: "NASA Guide", url: "https://solarsystem.nasa.gov/asteroids-comets-and-meteors/meteors-and-meteorites/geminids/in-depth/" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Geminids" },
      { label: "YouTube: Geminid guide", url: "https://www.youtube.com/results?search_query=geminids+meteor+shower+how+to+watch" },
    ],
  },
  {
    name: "Ursids",
    slug: "ursids",
    peakMD: "12-22",
    windowDays: 2,
    zenithalHourlyRate: 10,
    description:
      "The Ursids cap the year's meteor shower calendar near the winter solstice. Originating from Comet 8P/Tuttle, they produce a modest 10 meteors per hour but are circumpolar — the radiant never sets from northern latitudes.",
    links: [
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Ursids" },
    ],
  },
];

function peakDateForYear(peakMD: string, year: number): Date {
  const [month, day] = peakMD.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 22, 0, 0)); // 10 PM UTC on peak night
}

/** Returns meteor shower events for the next `lookAheadDays` days */
export function getMeteorShowerEvents(lookAheadDays = 180): RawAstroEvent[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + lookAheadDays * 86_400_000);
  const events: RawAstroEvent[] = [];

  for (const shower of SHOWERS) {
    for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
      const peak = peakDateForYear(shower.peakMD, year);
      const startAt = new Date(peak.getTime() - shower.windowDays * 86_400_000);
      const endAt = new Date(peak.getTime() + shower.windowDays * 86_400_000);

      if (endAt < now || startAt > cutoff) continue;

      events.push({
        slug: `${shower.slug}-${year}`,
        title: `${shower.name} Meteor Shower ${year}`,
        type: "NIGHT_SKY",
        description: `${shower.description} This year's peak is around ${peak.toLocaleDateString("en-US", { month: "long", day: "numeric" })}, with up to ${shower.zenithalHourlyRate} meteors per hour under dark skies.`,
        source: "catalog",
        startAt,
        endAt,
        links: shower.links,
        isLocationSpecific: false,
      });
    }
  }

  return events;
}
