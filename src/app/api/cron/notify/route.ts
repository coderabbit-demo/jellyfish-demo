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
 * sends the email for each, and marks them SENT or FAILED.
 *
 * Designed to be called by a Railway cron job every hour.
 * Requires: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Fetch all due notifications in one query, with user + event data
  const due = await db.notification.findMany({
    where: {
      status:      "PENDING",
      scheduledFor: { lte: now },
    },
    include: {
      user:  { select: { email: true, name: true } },
      event: true,
    },
    // Process in chronological order; cap batch at 100 per run to avoid timeout
    orderBy: { scheduledFor: "asc" },
    take: 100,
  });

  let sent = 0;
  let failed = 0;

  for (const notification of due) {
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
    processed: due.length,
    sent,
    failed,
    skipped:   due.length - sent - failed,
    ranAt:     now.toISOString(),
  });
}
