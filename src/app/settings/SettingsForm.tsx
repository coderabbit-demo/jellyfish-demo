"use client";

import { useState, useTransition } from "react";
import { saveSettings, type SettingsData } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const EVENT_TYPE_OPTIONS = [
  { id: "solarSystem" as const, emoji: "🪐", label: "Solar System Events", description: "Eclipses, planetary alignments, conjunctions, oppositions" },
  { id: "nightSky"    as const, emoji: "☄️", label: "Night Sky & Observing",  description: "Meteor showers, comets, ISS passes, aurora alerts" },
  { id: "lunarEvents" as const, emoji: "🌒", label: "Lunar Events",            description: "Lunar eclipses and supermoons" },
  { id: "deepSpace"   as const, emoji: "🚀", label: "Deep Space & Science",    description: "NASA missions, space launches, telescope discoveries" },
];

const NOTIFICATION_OPTIONS = [
  { id: "notifyWeekBefore" as const, label: "1 week before",  description: "Plan ahead" },
  { id: "notify48h"        as const, label: "48 hours before", description: "Final reminder" },
  { id: "notify4h"         as const, label: "4 hours before",  description: "Day-of alert" },
];

type EventTypeKey  = "solarSystem" | "nightSky" | "lunarEvents" | "deepSpace";
type NotifyKey     = "notifyWeekBefore" | "notify48h" | "notify4h";

type Props = {
  initial: SettingsData;
  savedParam: boolean;
};

export function SettingsForm({ initial, savedParam }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(savedParam);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [eventTypes, setEventTypes] = useState<Record<EventTypeKey, boolean>>({
    solarSystem: initial.solarSystem,
    nightSky:    initial.nightSky,
    lunarEvents: initial.lunarEvents,
    deepSpace:   initial.deepSpace,
  });

  const [location, setLocation] = useState({
    locationCity: initial.locationCity,
    locationLat:  initial.locationLat,
    locationLng:  initial.locationLng,
    timezone:     initial.timezone,
  });

  const [notifications, setNotifications] = useState<Record<NotifyKey, boolean>>({
    notifyWeekBefore: initial.notifyWeekBefore,
    notify48h:        initial.notify48h,
    notify4h:         initial.notify4h,
  });

  function toggle<T extends string>(
    setter: React.Dispatch<React.SetStateAction<Record<T, boolean>>>,
    key: T
  ) {
    setSaved(false);
    setter((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function detectLocation() {
    setIsLocating(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const city =
        data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Unknown";
      setSaved(false);
      setLocation({ locationCity: city, locationLat: latitude, locationLng: longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    } catch {
      setError("Could not detect location. Try typing your city.");
    } finally {
      setIsLocating(false);
    }
  }

  async function searchCity(city: string) {
    if (!city.trim()) return;
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setSaved(false);
        setLocation({
          locationCity: data[0].display_name.split(",")[0],
          locationLat:  parseFloat(data[0].lat),
          locationLng:  parseFloat(data[0].lon),
          timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } else {
        setError("City not found.");
      }
    } catch {
      setError("Location search failed.");
    }
  }

  function handleSave() {
    if (!Object.values(eventTypes).some(Boolean)) {
      setError("Select at least one event type.");
      return;
    }
    if (!Object.values(notifications).some(Boolean)) {
      setError("Select at least one notification time.");
      return;
    }
    setError(null);
    const data: SettingsData = { ...eventTypes, ...location, ...notifications };
    startTransition(async () => {
      await saveSettings(data);
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/30 border border-green-700/50 text-green-300 text-sm">
          ✓ Preferences saved — your notifications have been updated.
        </div>
      )}

      {/* Event types */}
      <Card className="border-border bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Event types</CardTitle>
          <CardDescription>Choose which astronomical events you want to track.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {EVENT_TYPE_OPTIONS.map(({ id, emoji, label, description }) => (
            <div
              key={id}
              className={`flex items-start gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                eventTypes[id] ? "border-indigo-600 bg-indigo-600/10" : "border-border hover:border-border/80"
              }`}
              onClick={() => toggle(setEventTypes, id)}
            >
              <Checkbox id={`et-${id}`} checked={eventTypes[id]} onCheckedChange={() => toggle(setEventTypes, id)} className="mt-0.5" />
              <div>
                <Label htmlFor={`et-${id}`} className="cursor-pointer font-medium">{emoji} {label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator className="bg-border" />

      {/* Location */}
      <Card className="border-border bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
          <CardDescription>Used for ISS passes, eclipse visibility, and timezone-aware alerts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="outline" className="w-full" onClick={detectLocation} disabled={isLocating}>
            {isLocating ? "Detecting…" : "📍 Use my current location"}
          </Button>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. San Francisco"
              value={location.locationCity}
              onChange={(e) => { setSaved(false); setLocation((p) => ({ ...p, locationCity: e.target.value })); }}
              onKeyDown={(e) => { if (e.key === "Enter") searchCity(location.locationCity); }}
              className="bg-slate-800 border-border"
            />
            <Button type="button" variant="outline" onClick={() => searchCity(location.locationCity)}>Search</Button>
          </div>
          {location.locationCity && location.locationLat !== 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-600/10 border border-indigo-600 text-sm">
              <span>📍</span>
              <span className="font-medium">{location.locationCity}</span>
              <span className="text-muted-foreground ml-auto">{location.locationLat.toFixed(2)}, {location.locationLng.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-border" />

      {/* Notification timing */}
      <Card className="border-border bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Notification timing</CardTitle>
          <CardDescription>Choose how far in advance you want email reminders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {NOTIFICATION_OPTIONS.map(({ id, label, description }) => (
            <div
              key={id}
              className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                notifications[id] ? "border-indigo-600 bg-indigo-600/10" : "border-border hover:border-border/80"
              }`}
              onClick={() => toggle(setNotifications, id)}
            >
              <Checkbox id={`nt-${id}`} checked={notifications[id]} onCheckedChange={() => toggle(setNotifications, id)} />
              <div>
                <Label htmlFor={`nt-${id}`} className="cursor-pointer font-medium">{label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pb-8">
        <a href="/dashboard">
          <Button variant="outline">← Back to dashboard</Button>
        </a>
        <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
