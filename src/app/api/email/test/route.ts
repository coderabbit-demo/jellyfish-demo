import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/email/sendNotification";

/**
 * POST /api/email/test
 *
 * Sends a real test notification email to the signed-in user.
 * Uses a sample Perseids meteor shower event.
 *
 * Only available in development (NODE_ENV !== "production").
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Parse optional leadTime from body
  const body = await req.json().catch(() => ({}));
  const leadTime: "7d" | "48h" | "4h" = ["7d", "48h", "4h"].includes(body.leadTime)
    ? body.leadTime
    : "48h";

  // Use a real event from DB if available, otherwise use a stub
  const sampleEvent = await db.astroEvent.findFirst({
    where: { startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
  });

  const event = sampleEvent ?? {
    id:                 "sample-id",
    slug:               "perseids-2026",
    title:              "Perseids Meteor Shower 2026",
    type:               "NIGHT_SKY" as const,
    description:
      "The Perseids are the most popular meteor shower of the year, producing up to 100 meteors per hour under ideal conditions. They streak from debris left by Comet Swift-Tuttle. This year's peak is around August 12 — warm nights make them perfect for backyard watching.",
    source:             "catalog",
    startAt:            new Date(Date.now() + 7 * 86_400_000),
    endAt:              new Date(Date.now() + 11 * 86_400_000),
    links: [
      { label: "NASA Guide", url: "https://solarsystem.nasa.gov/asteroids-comets-and-meteors/meteors-and-meteorites/perseids/in-depth/" },
      { label: "Wikipedia",  url: "https://en.wikipedia.org/wiki/Perseids" },
    ],
    isLocationSpecific: false,
    createdAt:          new Date(),
    updatedAt:          new Date(),
  };

  try {
    await sendNotification({ user, event, leadTime });
    return NextResponse.json({
      ok: true,
      sentTo: user.email,
      event: event.title,
      leadTime,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
