import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/email/sendNotification";

/** Verifies the request carries the correct CRON_SECRET header */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * GET /api/cron/notify
 *
 * Finds all PENDING notifications whose scheduledFor time has passed,
 * atomically claims them (PENDING -> PROCESSING), sends the email for each,
 * and marks them SENT, FAILED, or SKIPPED.
 *
 * The atomic claim prevents duplicate processing across overlapping cron runs.
 *
 * Designed to be called by a Railway cron job every hour.
 * Requires: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Step 1: Find all due notifications (just IDs)
  const pending = await db.notification.findMany({
    where: {
      status:       "PENDING",
      scheduledFor: { lte: now },
    },
    select: { id: true },
    // Process in chronological order; cap batch at 100 per run to avoid timeout
    orderBy: { scheduledFor: "asc" },
    take: 100,
  });

  if (pending.length === 0) {
    return NextResponse.json({
      ok:        true,
      processed: 0,
      sent:      0,
      failed:    0,
      skipped:   0,
      ranAt:     now.toISOString(),
    });
  }

  const pendingIds = pending.map((n) => n.id);

  // Step 2: Atomically claim these notifications by updating PENDING -> PROCESSING
  // Only rows that are still PENDING will be updated (wins the race)
  const claimResult = await db.notification.updateMany({
    where: {
      id:     { in: pendingIds },
      status: "PENDING",
    },
    data: {
      status: "PROCESSING",
    },
  });

  // Step 3: Fetch the notifications we actually claimed, with user + event data
  const claimed = await db.notification.findMany({
    where: {
      id:     { in: pendingIds },
      status: "PROCESSING",
    },
    include: {
      user:  { select: { email: true, name: true } },
      event: true,
    },
    orderBy: { scheduledFor: "asc" },
  });

  let sent = 0;
  let failed = 0;

  for (const notification of claimed) {
    // Double-check the event type still matches user preferences
    // (user may have changed preferences since notification was scheduled)
    const prefs = await db.preferences.findUnique({
      where: { userId: notification.userId },
    });

    if (prefs) {
      const typeToPrefs: Record<string, boolean> = {
        SOLAR_SYSTEM: prefs.solarSystem,
        NIGHT_SKY:    prefs.nightSky,
        LUNAR:        prefs.lunarEvents,
        DEEP_SPACE:   prefs.deepSpace,
      };
      const leadToPrefs: Record<string, boolean> = {
        "7d":  prefs.notifyWeekBefore,
        "48h": prefs.notify48h,
        "4h":  prefs.notify4h,
      };

      const eventTypeEnabled = typeToPrefs[notification.event.type] ?? false;
      const leadTimeEnabled  = leadToPrefs[notification.leadTime]    ?? false;

      if (!eventTypeEnabled || !leadTimeEnabled) {
        // User opted out — skip silently
        await db.notification.update({
          where: { id: notification.id },
          data:  { status: "SKIPPED", sentAt: now },
        });
        continue;
      }
    }

    try {
      await sendNotification({
        user:     notification.user,
        event:    notification.event,
        leadTime: notification.leadTime as "7d" | "48h" | "4h",
      });

      await db.notification.update({
        where: { id: notification.id },
        data:  { status: "SENT", sentAt: now },
      });
      sent++;
    } catch (err) {
      console.error(
        `[notify] Failed to send notification ${notification.id}:`,
        err instanceof Error ? err.message : err
      );
      await db.notification.update({
        where: { id: notification.id },
        data:  { status: "FAILED" },
      });
      failed++;
    }
  }

  return NextResponse.json({
    ok:        true,
    processed: claimed.length,
    sent,
    failed,
    skipped:   claimed.length - sent - failed,
    ranAt:     now.toISOString(),
  });
}