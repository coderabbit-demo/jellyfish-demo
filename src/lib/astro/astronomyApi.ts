import type { RawAstroEvent } from "./types";

const APP_ID = process.env.ASTRONOMY_API_APP_ID ?? "";
const APP_SECRET = process.env.ASTRONOMY_API_APP_SECRET ?? "";
const BASE = "https://api.astronomyapi.com/api/v2";

function basicAuth() {
  return Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64");
}

// ─── Solar / Lunar Eclipse catalog (static — eclipses are known far in advance) ─

type EclipseDef = {
  slug: string;
  title: string;
  type: "SOLAR_SYSTEM" | "LUNAR";
  date: string; // ISO date
  description: string;
  links: { label: string; url: string }[];
};

/** Known eclipses 2026–2028. Extend as needed. */
const ECLIPSE_CATALOG: EclipseDef[] = [
  {
    slug: "total-lunar-eclipse-2026-03-03",
    title: "Total Lunar Eclipse — March 2026",
    type: "LUNAR",
    date: "2026-03-03",
    description:
      "A total lunar eclipse turns the Moon a deep red-orange colour — the 'Blood Moon' effect — as Earth's shadow falls fully across its face. Sunlight filtered through Earth's atmosphere bends onto the Moon, creating the striking colour. This eclipse is visible from Europe, Africa, the Americas, and western Asia during the late evening hours.",
    links: [
      { label: "NASA Eclipse Page", url: "https://eclipse.gsfc.nasa.gov/LEplot/LEplot2001/LE2026Mar03T.pdf" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/March_2026_lunar_eclipse" },
      { label: "YouTube: Lunar Eclipse explained", url: "https://www.youtube.com/results?search_query=lunar+eclipse+how+it+works" },
    ],
  },
  {
    slug: "total-solar-eclipse-2026-08-12",
    title: "Total Solar Eclipse — August 2026",
    type: "SOLAR_SYSTEM",
    date: "2026-08-12",
    description:
      "A total solar eclipse will sweep across Greenland, Iceland, Spain, and parts of northern Africa on August 12, 2026. During totality — lasting up to 2 minutes 18 seconds — the Moon completely covers the Sun, revealing the spectacular solar corona. Outside the path of totality, a partial eclipse will be visible across much of Europe and North Africa.",
    links: [
      { label: "NASA Eclipse Page", url: "https://eclipse.gsfc.nasa.gov/SEplot/SEplot2001/SE2026Aug12T.GIF" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Solar_eclipse_of_August_12,_2026" },
      { label: "YouTube: 2026 Solar Eclipse", url: "https://www.youtube.com/results?search_query=2026+solar+eclipse+total" },
    ],
  },
  {
    slug: "partial-lunar-eclipse-2026-08-28",
    title: "Partial Lunar Eclipse — August 2026",
    type: "LUNAR",
    date: "2026-08-28",
    description:
      "A partial lunar eclipse occurs when Earth's shadow covers only part of the Moon. During this eclipse, a noticeable 'bite' will be visible on the lunar surface for several hours. Visible from the Pacific Ocean, Australia, eastern Asia, and the Americas.",
    links: [
      { label: "NASA Eclipse Page", url: "https://eclipse.gsfc.nasa.gov/LEplot/LEplot2001/LE2026Aug28P.pdf" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/August_2026_lunar_eclipse" },
    ],
  },
  {
    slug: "total-lunar-eclipse-2028-12-31",
    title: "Total Lunar Eclipse — December 2028",
    type: "LUNAR",
    date: "2028-12-31",
    description:
      "Ring in the new year with a total lunar eclipse on New Year's Eve 2028. The Moon will pass fully into Earth's umbra, turning deep red for over an hour. Visible from Europe, Africa, the Americas, and Australia.",
    links: [
      { label: "NASA Eclipse Page", url: "https://eclipse.gsfc.nasa.gov/LEplot/LEplot2001/LE2028Dec31T.pdf" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/December_2028_lunar_eclipse" },
    ],
  },
];

export function getEclipseEvents(lookAheadDays = 730): RawAstroEvent[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + lookAheadDays * 86_400_000);

  return ECLIPSE_CATALOG
    .map((e) => ({ ...e, startAtDate: new Date(e.date) }))
    .filter(({ startAtDate }) => startAtDate >= now && startAtDate <= cutoff)
    .map(({ slug, title, type, description, links, startAtDate }) => ({
      slug,
      title,
      type,
      description,
      source: "catalog",
      startAt: startAtDate,
      endAt: new Date(startAtDate.getTime() + 4 * 3600_000),
      links,
      isLocationSpecific: true,
    }));
}

// ─── Supermoons ────────────────────────────────────────────────────────────────

type SupermoonDef = { slug: string; date: string; name: string };

/** Known supermoons 2026 — the Moon at perigee within ~24h of full moon */
const SUPERMOON_CATALOG: SupermoonDef[] = [
  { slug: "supermoon-2026-01-13", date: "2026-01-13", name: "Wolf Moon Supermoon" },
  { slug: "supermoon-2026-10-06", date: "2026-10-06", name: "Harvest Moon Supermoon" },
  { slug: "supermoon-2026-11-05", date: "2026-11-05", name: "Beaver Moon Supermoon" },
  { slug: "supermoon-2026-12-04", date: "2026-12-04", name: "Cold Moon Supermoon" },
  { slug: "supermoon-2027-10-26", date: "2027-10-26", name: "Harvest Moon Supermoon" },
  { slug: "supermoon-2027-11-24", date: "2027-11-24", name: "Beaver Moon Supermoon" },
];

export function getSupermoonEvents(lookAheadDays = 365): RawAstroEvent[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + lookAheadDays * 86_400_000);

  return SUPERMOON_CATALOG
    .map((s) => ({ ...s, startAtDate: new Date(s.date) }))
    .filter(({ startAtDate }) => startAtDate >= now && startAtDate <= cutoff)
    .map(({ slug, name, startAtDate }) => ({
      slug,
      title: name,
      type: "LUNAR" as const,
      description: `A supermoon occurs when the Moon reaches its full phase near perigee — the closest point in its elliptical orbit. This makes the Moon appear up to 14% larger and 30% brighter than a typical full moon. The ${name} is a great opportunity for naked-eye observation and astrophotography, especially just after moonrise when it sits near the horizon.`,
      source: "catalog",
      startAt: startAtDate,
      endAt: new Date(startAtDate.getTime() + 24 * 3600_000),
      links: [
        { label: "NASA: What is a Supermoon?", url: "https://solarsystem.nasa.gov/news/922/what-is-a-supermoon/" },
        { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Supermoon" },
        { label: "YouTube: Supermoon explained", url: "https://www.youtube.com/results?search_query=supermoon+explained" },
      ],
      isLocationSpecific: false,
    }));
}

// ─── Planetary Events via AstronomyAPI ─────────────────────────────────────────

type PlanetaryEventBody = {
  id: string;
  name: string;
  distance: { fromEarth: { au: string } };
};

type AstronomyApiEvent = {
  body: PlanetaryEventBody;
  type: string;
  date: string;
};

const PLANET_EVENT_DESCRIPTIONS: Record<string, string> = {
  opposition:
    "occurs when a planet is directly opposite the Sun as seen from Earth. The planet rises at sunset, sets at sunrise, and is visible all night long — the best time of year to observe it. It's also the closest point in its orbit to Earth, making it appear largest and brightest.",
  conjunction:
    "occurs when a planet passes close to the Sun in our sky. It's generally not observable at this time, but this marks a turning point in its apparition cycle.",
  "greatest elongation":
    "is when an inner planet (Mercury or Venus) reaches its maximum angular separation from the Sun. This is the best window to observe it in twilight skies — either as the 'evening star' after sunset or the 'morning star' before sunrise.",
  quadrature:
    "is when the planet is 90 degrees from the Sun in Earth's sky, making it visible high in the sky at sunset or sunrise.",
};

export async function fetchPlanetaryEvents(lookAheadDays = 90): Promise<RawAstroEvent[]> {
  if (!APP_ID || !APP_SECRET) {
    console.warn("[AstronomyAPI] Credentials not configured — skipping planetary events");
    return [];
  }

  const events: RawAstroEvent[] = [];

  try {
    const res = await fetch(`${BASE}/bodies/events/planets?from_date=${new Date().toISOString().split("T")[0]}&to_date=${new Date(Date.now() + lookAheadDays * 86_400_000).toISOString().split("T")[0]}`, {
      headers: {
        Authorization: `Basic ${basicAuth()}`,
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      console.warn("[AstronomyAPI] Planetary events request failed:", res.status);
      return events;
    }

    const data = await res.json();
    const rawEvents: AstronomyApiEvent[] = data?.data?.events ?? [];

    for (const ev of rawEvents) {
      const typeKey = ev.type.toLowerCase();
      const descSuffix =
        PLANET_EVENT_DESCRIPTIONS[typeKey] ??
        "is a notable astronomical alignment worth observing.";

      const startAt = new Date(ev.date);
      const planet = ev.body.name;
      const auDist = parseFloat(ev.body.distance.fromEarth.au).toFixed(2);

      events.push({
        slug: `planetary-${planet.toLowerCase()}-${typeKey.replace(/\s+/g, "-")}-${ev.date}`,
        title: `${planet} at ${ev.type.charAt(0).toUpperCase() + ev.type.slice(1)}`,
        type: "SOLAR_SYSTEM",
        description: `${planet} ${descSuffix} At this event, ${planet} is approximately ${auDist} AU (${(parseFloat(auDist) * 149.6).toFixed(0)} million km) from Earth.`,
        source: "AstronomyAPI",
        startAt,
        endAt: new Date(startAt.getTime() + 24 * 3600_000),
        links: [
          { label: `Wikipedia: ${planet}`, url: `https://en.wikipedia.org/wiki/${planet}` },
          { label: "NASA Solar System Exploration", url: `https://solarsystem.nasa.gov/planets/${planet.toLowerCase()}/overview/` },
          { label: "YouTube: How to observe planets", url: `https://www.youtube.com/results?search_query=${planet}+planet+observation+guide` },
        ],
        isLocationSpecific: false,
      });
    }
  } catch {
    console.warn("[AstronomyAPI] Failed to fetch planetary events");
  }

  return events;
}
