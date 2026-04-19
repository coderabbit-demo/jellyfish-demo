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

  // Validate and normalize event.links to prevent unsafe data
  let links: { label: string; url: string }[] = [];
  if (Array.isArray(event.links)) {
    links = event.links
      .filter((item): item is { label: unknown; url: unknown } =>
        item !== null && typeof item === "object" && "label" in item && "url" in item
      )
      .map((item) => ({
        label: typeof item.label === "string" ? item.label : String(item.label ?? ""),
        url: typeof item.url === "string" ? item.url : String(item.url ?? ""),
      }))
      .filter((item) => item.label && item.url);
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