import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingComplete: true,
      locationCity:       true,
      locationLat:        true,
      locationLng:        true,
      timezone:           true,
      email:              true,
      preferences:        true,
    },
  });

  if (!user?.onboardingComplete) redirect("/onboarding");

  const prefs = user.preferences;
  const params = await searchParams;

  const initial = {
    // Event types — default true if no preferences yet
    solarSystem:      prefs?.solarSystem      ?? true,
    nightSky:         prefs?.nightSky         ?? true,
    lunarEvents:      prefs?.lunarEvents      ?? true,
    deepSpace:        prefs?.deepSpace        ?? true,
    // Location
    locationCity:     user.locationCity       ?? "",
    locationLat:      user.locationLat        ?? 0,
    locationLng:      user.locationLng        ?? 0,
    timezone:         user.timezone           ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Notification timing
    notifyWeekBefore: prefs?.notifyWeekBefore ?? true,
    notify48h:        prefs?.notify48h        ?? true,
    notify4h:         prefs?.notify4h         ?? true,
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="text-xl font-bold tracking-tight">✦ StarWatch</span>
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </nav>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Update your event preferences, location, and notification timing at any time.
            Changes take effect immediately — your future notifications will be rescheduled.
          </p>
          <SettingsForm initial={initial} savedParam={params.saved === "1"} />
        </div>
      </main>
    </div>
  );
}
