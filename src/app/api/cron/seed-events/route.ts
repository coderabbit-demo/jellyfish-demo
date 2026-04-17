import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchUpcomingEvents } from "@/lib/astro/aggregator";

/** Verifies the request carries the correct CRON_SECRET header */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/**
 * GET /api/cron/seed-events
 *
 * Fetches upcoming astronomical events from all sources and upserts them
 * into the database. Idempotent — safe to call multiple times.
 *
 * Requires: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Seed with all event types enabled — individual user filtering happens at query time
  const rawEvents = await fetchUpcomingEvents({
    eventTypes: {
      solarSystem: true,
      nightSky: true,
      lunarEvents: true,
      deepSpace: true,
    },
    lookAheadDays: 180,
  });

  let upserted = 0;
  let skipped = 0;

  for (const event of rawEvents) {
    try {
      await db.astroEvent.upsert({
        where: { slug: event.slug },
        create: {
          slug: event.slug,
          title: event.title,
          type: event.type,
          description: event.description,
          source: event.source,
          startAt: event.startAt,
          endAt: event.endAt,
          links: event.links,
          isLocationSpecific: event.isLocationSpecific,
        },
        update: {
          title: event.title,
          description: event.description,
          source: event.source,
          startAt: event.startAt,
          endAt: event.endAt,
          links: event.links,
          isLocationSpecific: event.isLocationSpecific,
        },
      });
      upserted++;
    } catch (err) {
      console.error(`[seed-events] Failed to upsert ${event.slug}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    total: rawEvents.length,
    upserted,
    skipped,
    seededAt: new Date().toISOString(),
  });
}
