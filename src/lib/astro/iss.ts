import type { RawAstroEvent } from "./types";

const N2YO_BASE = "https://api.n2yo.com/rest/v1/satellite";

type N2yoPass = {
  startAz: number;
  startAzCompass: string;
  startEl: number;
  startUTC: number; // Unix timestamp
  maxAz: number;
  maxAzCompass: string;
  maxEl: number;
  maxUTC: number;
  endAz: number;
  endAzCompass: string;
  endEl: number;
  endUTC: number;
  mag: number;
  duration: number; // seconds
};

type N2yoResponse = {
  info: {
    satid: number;
    satname: string;
    transactionscount: number;
    passescount: number;
  };
  passes: N2yoPass[];
};

/** Returns ISS pass events for a specific location over the next ~7 days */
export async function fetchIssPassEvents(
  lat: number,
  lng: number,
  passes = 5
): Promise<RawAstroEvent[]> {
  const events: RawAstroEvent[] = [];
  const apiKey = process.env.N2YO_API_KEY;

  if (!apiKey) {
    console.error("[ISS] N2YO_API_KEY environment variable is not set");
    return events;
  }

  try {
    // ISS NORAD ID is 25544
    // elevation in meters (default to 0), days to look ahead, min visibility in seconds (0 = all passes)
    const elevation = 0;
    const days = 10;
    const minVisibility = 300; // 5 minutes minimum visibility

    const url = `${N2YO_BASE}/visualpasses/25544/${lat}/${lng}/${elevation}/${days}/${minVisibility}/?apiKey=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unable to read response");
      console.error("[ISS] N2YO API request failed:", {
        status: res.status,
        statusText: res.statusText,
        response: errorText,
      });
      return events;
    }

    const data: N2yoResponse = await res.json();

    if (!data.passes || data.passes.length === 0) {
      console.warn("[ISS] No visible passes found for location:", { lat, lng });
      return events;
    }

    for (const pass of data.passes.slice(0, passes)) {
      const startAt = new Date(pass.startUTC * 1000);
      const endAt = new Date(pass.endUTC * 1000);
      const durationMin = Math.round(pass.duration / 60);
      const maxElevation = Math.round(pass.maxEl);

      const dateStr = startAt.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
      const timeStr = startAt.toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit",
      });

      events.push({
        slug: `iss-pass-${pass.startUTC}`,
        title: `ISS Pass Visible — ${dateStr} at ${timeStr}`,
        type: "NIGHT_SKY",
        description: `The International Space Station will be visible from your location on ${dateStr} at approximately ${timeStr}, lasting about ${durationMin} minute${durationMin !== 1 ? "s" : ""}. Maximum elevation: ${maxElevation}°. Look for a steady, fast-moving point of light crossing the sky — brighter than most stars. No telescope needed. The ISS orbits Earth at 28,000 km/h, completing a lap every 90 minutes, with a crew of up to 7 astronauts on board.`,
        source: "N2YO",
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
  } catch (error) {
    console.error("[ISS] Failed to fetch ISS pass data:", {
      error: error instanceof Error ? error.message : String(error),
      lat,
      lng,
    });
  }

  return events;
}