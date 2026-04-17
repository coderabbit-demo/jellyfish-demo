"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventCard } from "@/components/EventCard";
import type { AstroEvent, EventType } from "@/generated/prisma/client";

type Props = {
  events: AstroEvent[];
  activeTypes: EventType[];
};

const TAB_CONFIG: { value: EventType | "all"; label: string; emoji: string }[] = [
  { value: "all", label: "All Events", emoji: "✦" },
  { value: "SOLAR_SYSTEM", label: "Solar System", emoji: "🪐" },
  { value: "NIGHT_SKY", label: "Night Sky", emoji: "☄️" },
  { value: "LUNAR", label: "Lunar", emoji: "🌒" },
  { value: "DEEP_SPACE", label: "Deep Space", emoji: "🚀" },
];

export function EventsGrid({ events, activeTypes }: Props) {
  const [activeTab, setActiveTab] = useState<EventType | "all">("all");

  const visibleTabs = TAB_CONFIG.filter(
    (t) => t.value === "all" || activeTypes.includes(t.value as EventType)
  );

  const filtered =
    activeTab === "all"
      ? events
      : events.filter((e) => e.type === activeTab);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as EventType | "all")}
    >
      <TabsList className="bg-slate-800 border border-border flex-wrap h-auto gap-1 p-1 mb-6">
        {visibleTabs.map(({ value, label, emoji }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-sm"
          >
            {emoji} {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {visibleTabs.map(({ value }) => (
        <TabsContent key={value} value={value} className="mt-0">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="text-5xl">🔭</div>
      <p className="text-muted-foreground max-w-sm">
        No upcoming events match your preferences for this category. Events are
        refreshed daily — check back soon!
      </p>
      <a
        href="/settings"
        className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
      >
        Manage event preferences →
      </a>
    </div>
  );
}
