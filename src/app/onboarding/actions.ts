"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type OnboardingData = {
  // Step 1 — event types
  solarSystem: boolean;
  nightSky: boolean;
  lunarEvents: boolean;
  deepSpace: boolean;
  // Step 2 — location
  locationCity: string;
  locationLat: number;
  locationLng: number;
  timezone: string;
  // Step 3 — notification timing
  notifyWeekBefore: boolean;
  notify48h: boolean;
  notify4h: boolean;
};

export async function saveOnboarding(data: OnboardingData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const userId = session.user.id;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        locationCity: data.locationCity,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        timezone: data.timezone,
        onboardingComplete: true,
      },
    }),
    db.preferences.upsert({
      where: { userId },
      create: {
        userId,
        solarSystem: data.solarSystem,
        nightSky: data.nightSky,
        lunarEvents: data.lunarEvents,
        deepSpace: data.deepSpace,
        notifyWeekBefore: data.notifyWeekBefore,
        notify48h: data.notify48h,
        notify4h: data.notify4h,
      },
      update: {
        solarSystem: data.solarSystem,
        nightSky: data.nightSky,
        lunarEvents: data.lunarEvents,
        deepSpace: data.deepSpace,
        notifyWeekBefore: data.notifyWeekBefore,
        notify48h: data.notify48h,
        notify4h: data.notify4h,
      },
    }),
  ]);

  redirect("/dashboard");
}
