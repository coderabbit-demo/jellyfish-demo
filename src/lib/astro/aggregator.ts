import { getMeteorShowerEvents } from "./meteorShowers";
import { fetchDonkiEvents, fetchNeoEvents } from "./nasa";
import { getEclipseEvents, getSupermoonEvents, fetchPlanetaryEvents } from "./astronomyApi";
import { fetchIssPassEvents } from "./iss";
import type { RawAstroEvent } from "./types";

export type AggregatorOptions = {
  /** Which event type categories to fetch */
  eventTypes: {
    solarSystem: boolean;
    nightSky: boolean;
    lunarEvents: boolean;
    deepSpace: boolean;
  };
  /** User location — required for ISS passes */
  location?: { lat: number; lng: number };
  /** How many days ahead to look (default 90) */
  lookAheadDays?: number;
};

/** Fetch all upcoming events matching the given options */
export async function fetchUpcomingEvents(
  options: AggregatorOptions
): Promise<RawAstroEvent[]> {
  const { eventTypes, location, lookAheadDays = 90 } = options;

  const fetchers: Promise<RawAstroEvent[]>[] = [];

  if (eventTypes.nightSky) {
    fetchers.push(
      Promise.resolve(getMeteorShowerEvents(lookAheadDays)),
      fetchDonkiEvents(lookAheadDays),
      location
        ? fetchIssPassEvents(location.lat, location.lng)
        : Promise.resolve([])
    );
  }

  if (eventTypes.solarSystem) {
    fetchers.push(
      Promise.resolve(getEclipseEvents(lookAheadDays).filter((e) => e.type === "SOLAR_SYSTEM")),
      fetchPlanetaryEvents(lookAheadDays)
    );
  }

  if (eventTypes.lunarEvents) {
    fetchers.push(
      Promise.resolve(getEclipseEvents(lookAheadDays).filter((e) => e.type === "LUNAR")),
      Promise.resolve(getSupermoonEvents(lookAheadDays))
    );
  }

  if (eventTypes.deepSpace) {
    fetchers.push(fetchNeoEvents(Math.min(lookAheadDays, 7)));
  }

  const results = await Promise.allSettled(fetchers);

  const events: RawAstroEvent[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      events.push(...result.value);
    }
  }

  // Deduplicate by slug, keep earliest occurrence
  const seen = new Set<string>();
  return events
    .filter((e) => {
      if (seen.has(e.slug)) return false;
      seen.add(e.slug);
      return true;
    })
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
