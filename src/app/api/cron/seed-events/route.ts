import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchUpcomingEvents } from "@/lib/astro/aggregator";
import type { AstroEvent, EventType } from "@/generated/prisma/client";

/** Verifies the request carries the correct CRON_SECRET header */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

const LEAD_OFFSETS: { leadTime: "7d" | "48h" | "4h"; ms: number }[] = [
  { leadTime: "7d",  ms: 7 * 24 * 3600_000 },
  { leadTime: "48h", ms: 48  * 3600_000 },
  { leadTime: "4h",  ms: 4   * 3600_000 },
];

/** Maps Prisma EventType to the Preferences boolean field name */
const TYPE_TO_PREF: Record<EventType, "solarSystem" | "nightSky" | "lunarEvents" | "deepSpace"> = {
  SOLAR_SYSTEM: "solarSystem",
  NIGHT_SKY:    "nightSky",
  LUNAR:        "lunarEvents",
  DEEP_SPACE:   "deepSpace",
};

const LEAD_TO_PREF: Record<"7d" | "48h" | "4h", "notifyWeekBefore" | "notify48h" | "notify4h"> = {
  "7d":  "notifyWeekBefore",
  "48h": "notify48h",
  "4h":  "notify4h",
};

/**
 * Schedule notifications for a newly upserted event for all matching users.
 * Idempotent — the unique constraint on (userId, eventId, leadTime) prevents duplicates.
 */
async function scheduleNotificationsForEvent(event: AstroEvent): Promise<number> {
  const prefField = TYPE_TO_PREF[event.type];
  const now = new Date();
  let scheduled = 0;

  // Find users who have this event type enabled
  const users = await db.user.findMany({
    where: {
      onboardingComplete: true,
      preferences: { [prefField]: true },
    },
    select: {
      id: true,
      preferences: {
        select: {
          notifyWeekBefore: true,
          notify48h: true,
          notify4h: true,
        },
      },
    },
  });

  for (const user of users) {
    if (!user.preferences) continue;

    for (const { leadTime, ms } of LEAD_OFFSETS) {
      const prefKey = LEAD_TO_PREF[leadTime];
      if (!user.preferences[prefKey]) continue;

      const scheduledFor = new Date(event.startAt.getTime() - ms);
      // Skip notifications already in the past
      if (scheduledFor <= now) continue;

      try {
        await db.notification.upsert({
          where: {
            userId_eventId_leadTime: {
              userId:  user.id,
              eventId: event.id,
              leadTime,
            },
          },
          create: {
            userId:      user.id,
            eventId:     event.id,
            leadTime,
            scheduledFor,
            status:      "PENDING",
          },
          update: {
            // If event startAt changed, update scheduledFor and re-queue
            scheduledFor,
            status: "PENDING",
            sentAt: null,
          },
        });
        scheduled++;
      } catch (err) {
        console.error(`[seed-events] Failed to schedule notification for user ${user.id} event ${event.id} ${leadTime}:`, err);
      }
    }
  }

  return scheduled;
}

/**
 * GET /api/cron/seed-events
 *
 * 1. Fetches upcoming astronomical events from all sources and upserts them into the DB.
 * 2. Schedules notification rows for all users whose preferences match each event.
 *
 * Idempotent — safe to call multiple times.
 * Requires: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawEvents = await fetchUpcomingEvents({
    eventTypes: { solarSystem: true, nightSky: true, lunarEvents: true, deepSpace: true },
    lookAheadDays: 180,
  });

  let upserted = 0;
  let skipped = 0;
  let notificationsScheduled = 0;

  for (const raw of rawEvents) {
    try {
      const event = await db.astroEvent.upsert({
        where: { slug: raw.slug },
        create: {
          slug:               raw.slug,
          title:              raw.title,
          type:               raw.type,
          description:        raw.description,
          source:             raw.source,
          startAt:            raw.startAt,
          endAt:              raw.endAt,
          links:              raw.links,
          isLocationSpecific: raw.isLocationSpecific,
        },
        update: {
          title:              raw.title,
          description:        raw.description,
          source:             raw.source,
          startAt:            raw.startAt,
          endAt:              raw.endAt,
          links:              raw.links,
          isLocationSpecific: raw.isLocationSpecific,
        },
      });
      upserted++;
      notificationsScheduled += await scheduleNotificationsForEvent(event);
    } catch (err) {
      console.error(`[seed-events] Failed to upsert ${raw.slug}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    total: rawEvents.length,
    upserted,
    skipped,
    notificationsScheduled,
    seededAt: new Date().toISOString(),
  });
}
