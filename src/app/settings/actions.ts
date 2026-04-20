"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { EventType } from "@/generated/prisma/client";

export type SettingsData = {
  // Event types
  solarSystem: boolean;
  nightSky: boolean;
  lunarEvents: boolean;
  deepSpace: boolean;
  // Location
  locationCity: string;
  locationLat: number;
  locationLng: number;
  timezone: string;
  // Notification timing
  notifyWeekBefore: boolean;
  notify48h: boolean;
  notify4h: boolean;
};

const TYPE_TO_PREF: Record<EventType, keyof Pick<SettingsData, "solarSystem" | "nightSky" | "lunarEvents" | "deepSpace">> = {
  SOLAR_SYSTEM: "solarSystem",
  NIGHT_SKY:    "nightSky",
  LUNAR:        "lunarEvents",
  DEEP_SPACE:   "deepSpace",
};

const LEAD_TO_PREF: Record<"7d" | "48h" | "4h", keyof Pick<SettingsData, "notifyWeekBefore" | "notify48h" | "notify4h">> = {
  "7d":  "notifyWeekBefore",
  "48h": "notify48h",
  "4h":  "notify4h",
};

const LEAD_OFFSETS: { leadTime: "7d" | "48h" | "4h"; ms: number }[] = [
  { leadTime: "7d",  ms: 7 * 24 * 3600_000 },
  { leadTime: "48h", ms: 48  * 3600_000 },
  { leadTime: "4h",  ms: 4   * 3600_000 },
];

/**
 * After preferences change, cancel stale notifications and create new ones
 * for events the user is now subscribed to.
 */
async function regenerateNotifications(userId: string, prefs: SettingsData) {
  const now = new Date();

  // Cancel all future PENDING notifications for this user
  await db.notification.updateMany({
    where: {
      userId,
      status:      "PENDING",
      scheduledFor: { gt: now },
    },
    data: { status: "SKIPPED" },
  });

  // Find upcoming events that match the user's new preferences
  const activeTypes: EventType[] = [];
  if (prefs.solarSystem) activeTypes.push("SOLAR_SYSTEM");
  if (prefs.nightSky)    activeTypes.push("NIGHT_SKY");
  if (prefs.lunarEvents) activeTypes.push("LUNAR");
  if (prefs.deepSpace)   activeTypes.push("DEEP_SPACE");

  if (activeTypes.length === 0) return;

  const events = await db.astroEvent.findMany({
    where: {
      type:    { in: activeTypes },
      startAt: { gt: now },
    },
    select: { id: true, type: true, startAt: true },
  });

  for (const event of events) {
    for (const { leadTime, ms } of LEAD_OFFSETS) {
      const prefKey = LEAD_TO_PREF[leadTime];
      if (!prefs[prefKey]) continue;

      const scheduledFor = new Date(event.startAt.getTime() - ms);
      if (scheduledFor <= now) continue;

      await db.notification.upsert({
        where: {
          userId_eventId_leadTime: { userId, eventId: event.id, leadTime },
        },
        create: {
          userId,
          eventId: event.id,
          leadTime,
          scheduledFor,
          status: "PENDING",
        },
        update: {
          scheduledFor,
          status: "PENDING",
          sentAt: null,
        },
      });
    }
  }
}

export async function saveSettings(data: SettingsData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const userId = session.user.id;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        locationCity: data.locationCity,
        locationLat:  data.locationLat,
        locationLng:  data.locationLng,
        timezone:     data.timezone,
      },
    }),
    db.preferences.upsert({
      where:  { userId },
      create: {
        userId,
        solarSystem:      data.solarSystem,
        nightSky:         data.nightSky,
        lunarEvents:      data.lunarEvents,
        deepSpace:        data.deepSpace,
        notifyWeekBefore: data.notifyWeekBefore,
        notify48h:        data.notify48h,
        notify4h:         data.notify4h,
      },
      update: {
        solarSystem:      data.solarSystem,
        nightSky:         data.nightSky,
        lunarEvents:      data.lunarEvents,
        deepSpace:        data.deepSpace,
        notifyWeekBefore: data.notifyWeekBefore,
        notify48h:        data.notify48h,
        notify4h:         data.notify4h,
      },
    }),
  ]);

  // Re-generate notifications to reflect new preferences
  await regenerateNotifications(userId, data);

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
