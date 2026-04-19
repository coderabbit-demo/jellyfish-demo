import sgMail from "@sendgrid/mail";
import { renderEventEmail } from "./template";
import type { AstroEvent, User } from "@/generated/prisma/client";

const EVENT_EMOJI: Record<string, string> = {
  SOLAR_SYSTEM: "🪐",
  NIGHT_SKY:    "☄️",
  LUNAR:        "🌒",
  DEEP_SPACE:   "🚀",
};

function formatEventDate(startAt: Date, endAt: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  const start = startAt.toLocaleDateString("en-US", opts);
  if (!endAt) return start;
  return `${start} — ${endAt.toLocaleDateString("en-US", opts)}`;
}

export type SendNotificationParams = {
  user: Pick<User, "email" | "name">;
  event: AstroEvent;
  leadTime: "7d" | "48h" | "4h";
};

export async function sendNotification({
  user,
  event,
  leadTime,
}: SendNotificationParams): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY is not configured");

  sgMail.setApiKey(apiKey);

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // Validate and normalize event.links (Prisma Json field) to prevent unsafe data
  const links: { label: string; url: string }[] = [];
  if (Array.isArray(event.links)) {
    for (const item of event.links) {
      if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
      const obj = item as Record<string, unknown>;
      const label = typeof obj["label"] === "string" ? obj["label"] : "";
      const url   = typeof obj["url"]   === "string" ? obj["url"]   : "";
      if (label && url) links.push({ label, url });
    }
  }

  const { subject, html, text } = renderEventEmail({
    userName:         user.name ?? "there",
    eventTitle:       event.title,
    eventType:        event.type,
    eventEmoji:       EVENT_EMOJI[event.type] ?? "✦",
    eventDate:        formatEventDate(new Date(event.startAt), event.endAt ? new Date(event.endAt) : null),
    eventDescription: event.description,
    links,
    leadTime,
    settingsUrl:      `${appUrl}/settings`,
    appUrl,
  });

  await sgMail.send({
    to:      { email: user.email, name: user.name ?? undefined },
    from:    {
      email: process.env.SENDGRID_FROM_EMAIL ?? "noreply@starwatch.app",
      name:  process.env.SENDGRID_FROM_NAME  ?? "StarWatch",
    },
    subject,
    html,
    text,
  });
}