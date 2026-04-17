import type { RawAstroEvent } from "./types";

const NASA_API_KEY = process.env.NASA_API_KEY ?? "DEMO_KEY";
const NASA_BASE = "https://api.nasa.gov";

// ─── DONKI: Solar Flares & Geomagnetic Storms (aurora potential) ─────────────

type DonkiGst = {
  gstID: string;
  startTime: string;
  allKpIndex?: { observedTime: string; kpIndex: number }[];
  link: string;
};

type DonkiFlr = {
  flrID: string;
  beginTime: string;
  peakTime?: string;
  endTime?: string;
  classType: string;
  sourceLocation?: string;
  link: string;
};

export async function fetchDonkiEvents(lookAheadDays = 90): Promise<RawAstroEvent[]> {
  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + lookAheadDays * 86_400_000)
    .toISOString()
    .split("T")[0];

  const events: RawAstroEvent[] = [];

  // Geomagnetic storms — high Kp index = aurora visible at lower latitudes
  try {
    const res = await fetch(
      `${NASA_BASE}/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data: DonkiGst[] = await res.json();
      for (const storm of data) {
        const maxKp = Math.max(...(storm.allKpIndex?.map((k) => k.kpIndex) ?? [0]));
        if (maxKp < 5) continue; // Only G1+ storms (Kp ≥ 5)

        const severity = maxKp >= 8 ? "severe" : maxKp >= 6 ? "moderate" : "minor";
        const startAt = new Date(storm.startTime);
        const endAt = new Date(startAt.getTime() + 24 * 3600_000);

        events.push({
          slug: `geomagnetic-storm-${storm.gstID}`,
          title: `Geomagnetic Storm (Kp ${maxKp}) — Aurora Alert`,
          type: "NIGHT_SKY",
          description: `A ${severity} geomagnetic storm (Kp index ${maxKp}) is forecast, raising the possibility of aurora borealis visible at lower latitudes than usual. During strong storms, the Northern Lights have been seen as far south as the northern United States and central Europe. Check local sky conditions and face north after dark.`,
          source: "NASA DONKI",
          startAt,
          endAt,
          links: [
            { label: "NASA DONKI Report", url: storm.link },
            { label: "NOAA Space Weather", url: "https://www.swpc.noaa.gov/products/planetary-k-index" },
            { label: "Wikipedia: Aurora", url: "https://en.wikipedia.org/wiki/Aurora" },
          ],
          isLocationSpecific: true,
        });
      }
    }
  } catch {
    // Non-fatal — log and continue
    console.warn("[NASA] Failed to fetch DONKI GST events");
  }

  // Solar flares — X-class are significant
  try {
    const res = await fetch(
      `${NASA_BASE}/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data: DonkiFlr[] = await res.json();
      for (const flare of data) {
        if (!flare.classType.startsWith("X")) continue; // Only X-class flares

        const startAt = new Date(flare.beginTime);
        events.push({
          slug: `solar-flare-${flare.flrID}`,
          title: `${flare.classType} Solar Flare`,
          type: "DEEP_SPACE",
          description: `A powerful ${flare.classType} solar flare has been detected${flare.sourceLocation ? ` from active region ${flare.sourceLocation}` : ""}. X-class flares are the most intense category and can cause radio blackouts on Earth's sunlit side. If directed at Earth, they may trigger geomagnetic storms and enhanced aurora activity in the days following.`,
          source: "NASA DONKI",
          startAt,
          endAt: flare.endTime ? new Date(flare.endTime) : undefined,
          links: [
            { label: "NASA DONKI Report", url: flare.link },
            { label: "Wikipedia: Solar Flare", url: "https://en.wikipedia.org/wiki/Solar_flare" },
            { label: "NOAA Space Weather", url: "https://www.swpc.noaa.gov" },
          ],
          isLocationSpecific: false,
        });
      }
    }
  } catch {
    console.warn("[NASA] Failed to fetch DONKI FLR events");
  }

  return events;
}

// ─── Close Near-Earth Object Approaches ──────────────────────────────────────

type NeoFeedEntry = {
  id: string;
  name: string;
  close_approach_data: {
    close_approach_date: string;
    close_approach_date_full: string;
    miss_distance: { lunar: string; kilometers: string };
    relative_velocity: { kilometers_per_hour: string };
  }[];
  is_potentially_hazardous_asteroid: boolean;
  nasa_jpl_url: string;
  estimated_diameter: {
    meters: { estimated_diameter_max: number };
  };
};

export async function fetchNeoEvents(lookAheadDays = 7): Promise<RawAstroEvent[]> {
  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + Math.min(lookAheadDays, 7) * 86_400_000)
    .toISOString()
    .split("T")[0];

  const events: RawAstroEvent[] = [];

  try {
    const res = await fetch(
      `${NASA_BASE}/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return events;

    const data = await res.json();
    const allNeos: NeoFeedEntry[] = Object.values(data.near_earth_objects).flat() as NeoFeedEntry[];

    for (const neo of allNeos) {
      const approach = neo.close_approach_data[0];
      const lunarDist = parseFloat(approach.miss_distance.lunar);
      const kmDist = parseFloat(approach.miss_distance.kilometers);
      const diameterM = neo.estimated_diameter.meters.estimated_diameter_max;

      // Only surface notable approaches: within 10 lunar distances OR hazardous
      if (lunarDist > 10 && !neo.is_potentially_hazardous_asteroid) continue;
      // Skip tiny objects (< 50m) unless PHA
      if (diameterM < 50 && !neo.is_potentially_hazardous_asteroid) continue;

      const startAt = new Date(approach.close_approach_date);
      const velocityKph = parseFloat(approach.relative_velocity.kilometers_per_hour).toLocaleString();
      const hazardNote = neo.is_potentially_hazardous_asteroid
        ? " NASA has classified this as a Potentially Hazardous Asteroid (PHA) based on its size and orbit, though no impact risk is forecast."
        : "";

      events.push({
        slug: `neo-${neo.id}-${approach.close_approach_date}`,
        title: `Asteroid ${neo.name} Close Approach`,
        type: "DEEP_SPACE",
        description: `Asteroid ${neo.name} will make its closest approach to Earth at a distance of ${(kmDist / 1_000_000).toFixed(2)} million km (${lunarDist.toFixed(1)} lunar distances), travelling at ${velocityKph} km/h. The object is estimated to be up to ${Math.round(diameterM)} metres in diameter.${hazardNote} No threat to Earth is posed.`,
        source: "NASA NeoWs",
        startAt,
        links: [
          { label: "NASA JPL Close Approach Data", url: neo.nasa_jpl_url },
          { label: "NASA NEO Program", url: "https://cneos.jpl.nasa.gov/" },
          { label: "Wikipedia: Near-Earth object", url: "https://en.wikipedia.org/wiki/Near-Earth_object" },
        ],
        isLocationSpecific: false,
      });
    }
  } catch {
    console.warn("[NASA] Failed to fetch NeoWs events");
  }

  return events;
}
