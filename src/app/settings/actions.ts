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

export async function saveSettings(data: SettingsData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const userId = session.user.id;

  // Server-side validation
  const hasEventType = data.solarSystem || data.nightSky || data.lunarEvents || data.deepSpace;
  if (!hasEventType) {
    throw new Error("At least one event type must be enabled");
  }

  const hasNotifyTime = data.notifyWeekBefore || data.notify48h || data.notify4h;
  if (!hasNotifyTime) {
    throw new Error("At least one notification time must be enabled");
  }

  if (data.locationLat != null && (typeof data.locationLat !== "number" || isNaN(data.locationLat) || data.locationLat < -90 || data.locationLat > 90)) {
    throw new Error("Invalid latitude: must be a number between -90 and 90");
  }

  if (data.locationLng != null && (typeof data.locationLng !== "number" || isNaN(data.locationLng) || data.locationLng < -180 || data.locationLng > 180)) {
    throw new Error("Invalid longitude: must be a number between -180 and 180");
  }

  if (data.timezone != null && (typeof data.timezone !== "string" || data.timezone.trim() === "")) {
    throw new Error("Invalid timezone: must be a non-empty string");
  }

  // Perform all DB operations in a single atomic transaction
  await db.$transaction(async (tx) => {
    // Update user location and timezone
    await tx.user.update({
      where: { id: userId },
      data: {
        locationCity: data.locationCity,
        locationLat:  data.locationLat,
        locationLng:  data.locationLng,
        timezone:     data.timezone,
      },
    });

    // Upsert preferences
    await tx.preferences.upsert({
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
    });

    // Regenerate notifications within the same transaction
    const now = new Date();

    // Cancel all future PENDING notifications for this user
    await tx.notification.updateMany({
      where: {
        userId,
        status:      "PENDING",
        scheduledFor: { gt: now },
      },
      data: { status: "SKIPPED" },
    });

    // Find upcoming events that match the user's new preferences
    const activeTypes: EventType[] = [];
    if (data.solarSystem) activeTypes.push("SOLAR_SYSTEM");
    if (data.nightSky)    activeTypes.push("NIGHT_SKY");
    if (data.lunarEvents) activeTypes.push("LUNAR");
    if (data.deepSpace)   activeTypes.push("DEEP_SPACE");

    if (activeTypes.length > 0) {
      const events = await tx.astroEvent.findMany({
        where: {
          type:    { in: activeTypes },
          startAt: { gt: now },
        },
        select: { id: true, type: true, startAt: true },
      });

      for (const event of events) {
        for (const { leadTime, ms } of LEAD_OFFSETS) {
          const prefKey = LEAD_TO_PREF[leadTime];
          if (!data[prefKey]) continue;

          const scheduledFor = new Date(event.startAt.getTime() - ms);
          if (scheduledFor <= now) continue;

          await tx.notification.upsert({
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
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}