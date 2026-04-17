import type { RawAstroEvent } from "./types";

const OPEN_NOTIFY_BASE = "http://api.open-notify.org";

type IssPass = {
  risetime: number; // Unix timestamp
  duration: number; // seconds
};

type OpenNotifyResponse = {
  message: string;
  request: { latitude: number; longitude: number; altitude: number; passes: number; datetime: number };
  response: IssPass[];
};

/** Returns ISS pass events for a specific location over the next ~7 days */
export async function fetchIssPassEvents(
  lat: number,
  lng: number,
  passes = 5
): Promise<RawAstroEvent[]> {
  const events: RawAstroEvent[] = [];

  try {
    const res = await fetch(
      `${OPEN_NOTIFY_BASE}/iss-pass.json?lat=${lat}&lon=${lng}&n=${passes}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.warn("[ISS] Open-Notify request failed:", res.status);
      return events;
    }

    const data: OpenNotifyResponse = await res.json();
    if (data.message !== "success") return events;

    for (const pass of data.response) {
      const startAt = new Date(pass.risetime * 1000);
      const endAt = new Date((pass.risetime + pass.duration) * 1000);
      const durationMin = Math.round(pass.duration / 60);

      const dateStr = startAt.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
      const timeStr = startAt.toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit",
      });

      events.push({
        slug: `iss-pass-${lat.toFixed(2)}-${lng.toFixed(2)}-${pass.risetime}`,
        title: `ISS Pass Visible — ${dateStr} at ${timeStr}`,
        type: "NIGHT_SKY",
        description: `The International Space Station will be visible from your location on ${dateStr} at approximately ${timeStr}, lasting about ${durationMin} minute${durationMin !== 1 ? "s" : ""}. Look for a steady, fast-moving point of light crossing the sky — brighter than most stars. No telescope needed. The ISS orbits Earth at 28,000 km/h, completing a lap every 90 minutes, with a crew of up to 7 astronauts on board.`,
        source: "Open-Notify",
        startAt,
        endAt,
        links: [
          { label: "NASA: Spot the Station", url: "https://spotthestation.nasa.gov/" },
          { label: "Wikipedia: ISS", url: "https://en.wikipedia.org/wiki/International_Space_Station" },
          { label: "YouTube: ISS explained", url: "https://www.youtube.com/results?search_query=how+to+spot+the+ISS" },
        ],
        isLocationSpecific: true,
      });
    }
  } catch {
    console.warn("[ISS] Failed to fetch ISS pass data");
  }

  return events;
}
