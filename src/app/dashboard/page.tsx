import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { EventsGrid } from "./EventsGrid";
import type { EventType } from "@/generated/prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingComplete: true,
      name: true,
      locationCity: true,
      preferences: true,
    },
  });

  if (!user?.onboardingComplete) redirect("/onboarding");

  const prefs = user.preferences;

  // Build list of event types the user subscribed to
  const activeTypes: EventType[] = [];
  if (prefs?.solarSystem) activeTypes.push("SOLAR_SYSTEM");
  if (prefs?.nightSky) activeTypes.push("NIGHT_SKY");
  if (prefs?.lunarEvents) activeTypes.push("LUNAR");
  if (prefs?.deepSpace) activeTypes.push("DEEP_SPACE");

  // Fetch events matching user preferences, starting from now, next 180 days
  const events = await db.astroEvent.findMany({
    where: {
      type: { in: activeTypes.length > 0 ? activeTypes : undefined },
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    take: 60,
  });

  const totalUpcoming = events.length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="text-xl font-bold tracking-tight">✦ StarWatch</span>
        <div className="flex items-center gap-4">
          <a
            href="/settings"
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            Settings
          </a>
          <span className="text-muted-foreground text-sm hidden sm:block">
            📍 {user.locationCity ?? session.user.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </nav>

      {/* Header */}
      <div className="px-6 pt-8 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold">
          Upcoming Events
          {user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {totalUpcoming > 0
            ? `${totalUpcoming} event${totalUpcoming !== 1 ? "s" : ""} in the next 6 months matching your preferences`
            : "No events found — run the event seeder or check back soon"}
        </p>
      </div>

      {/* Events grid with filter tabs */}
      <main className="flex-1 px-6 py-6">
        <EventsGrid events={events} activeTypes={activeTypes} />
      </main>
    </div>
  );
}
