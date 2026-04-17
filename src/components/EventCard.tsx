import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AstroEvent, EventType } from "@/generated/prisma/client";

type EventLink = { label: string; url: string };

const TYPE_CONFIG: Record<
  EventType,
  { label: string; emoji: string; badgeClass: string }
> = {
  SOLAR_SYSTEM: {
    label: "Solar System",
    emoji: "🪐",
    badgeClass: "bg-amber-900/50 text-amber-300 border-amber-700/50",
  },
  NIGHT_SKY: {
    label: "Night Sky",
    emoji: "☄️",
    badgeClass: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  },
  LUNAR: {
    label: "Lunar",
    emoji: "🌒",
    badgeClass: "bg-slate-700/50 text-slate-300 border-slate-600/50",
  },
  DEEP_SPACE: {
    label: "Deep Space",
    emoji: "🚀",
    badgeClass: "bg-purple-900/50 text-purple-300 border-purple-700/50",
  },
};

function getCountdown(startAt: Date): string {
  const now = Date.now();
  const diff = startAt.getTime() - now;
  if (diff < 0) return "Happening now";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `in ${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `in ${hours} hour${hours !== 1 ? "s" : ""}`;
  return "in less than an hour";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EventCard({ event }: { event: AstroEvent }) {
  const config = TYPE_CONFIG[event.type];
  const links = event.links as EventLink[];
  const startAt = new Date(event.startAt);
  const countdown = getCountdown(startAt);
  const isImminent = startAt.getTime() - Date.now() < 86_400_000 * 3;

  return (
    <Card className="border-border bg-slate-900 hover:border-white/20 transition-colors flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-xs font-medium ${config.badgeClass}`}
            >
              {config.emoji} {config.label}
            </Badge>
            {isImminent && (
              <Badge
                variant="outline"
                className="text-xs font-medium bg-red-900/40 text-red-300 border-red-700/50 animate-pulse"
              >
                Soon
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {countdown}
          </span>
        </div>
        <CardTitle className="text-base font-semibold leading-snug mt-2">
          {event.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {formatDate(startAt)}
          {event.endAt && ` — ${formatDate(new Date(event.endAt))}`}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between gap-4">
        <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
          {event.description}
        </p>

        {links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
