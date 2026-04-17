"use client";

import { useState, useTransition } from "react";
import { saveOnboarding, type OnboardingData } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const STEPS = ["Event types", "Your location", "Notifications"] as const;

const EVENT_TYPE_OPTIONS = [
  {
    id: "solarSystem" as const,
    emoji: "🪐",
    label: "Solar System Events",
    description: "Eclipses, planetary alignments, conjunctions, oppositions, equinoxes",
  },
  {
    id: "nightSky" as const,
    emoji: "☄️",
    label: "Night Sky & Observing",
    description: "Meteor showers, comets, ISS passes, aurora alerts",
  },
  {
    id: "lunarEvents" as const,
    emoji: "🌒",
    label: "Lunar Events",
    description: "Lunar eclipses and supermoons",
  },
  {
    id: "deepSpace" as const,
    emoji: "🚀",
    label: "Deep Space & Science",
    description: "NASA missions, space launches, telescope discoveries",
  },
];

const NOTIFICATION_OPTIONS = [
  { id: "notifyWeekBefore" as const, label: "1 week before", description: "Plan ahead" },
  { id: "notify48h" as const, label: "48 hours before", description: "Final reminder" },
  { id: "notify4h" as const, label: "4 hours before", description: "Day-of alert" },
];

type EventTypeKey = "solarSystem" | "nightSky" | "lunarEvents" | "deepSpace";
type NotifyKey = "notifyWeekBefore" | "notify48h" | "notify4h";

export function OnboardingForm({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [eventTypes, setEventTypes] = useState<Record<EventTypeKey, boolean>>({
    solarSystem: true,
    nightSky: true,
    lunarEvents: true,
    deepSpace: true,
  });

  const [location, setLocation] = useState({
    locationCity: "",
    locationLat: 0,
    locationLng: 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [notifications, setNotifications] = useState<Record<NotifyKey, boolean>>({
    notifyWeekBefore: true,
    notify48h: true,
    notify4h: true,
  });

  function toggleEventType(key: EventTypeKey) {
    setEventTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleNotification(key: NotifyKey) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function detectLocation() {
    setIsLocating(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;

      // Reverse geocode with free nominatim API
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        "Unknown location";

      setLocation({
        locationCity: city,
        locationLat: latitude,
        locationLng: longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch {
      setError("Could not detect location. Please type your city instead.");
    } finally {
      setIsLocating(false);
    }
  }

  async function handleCitySearch(city: string) {
    if (!city.trim()) return;
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setLocation({
          locationCity: data[0].display_name.split(",")[0],
          locationLat: parseFloat(data[0].lat),
          locationLng: parseFloat(data[0].lon),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } else {
        setError("City not found. Try a different name.");
      }
    } catch {
      setError("Location search failed. Please try again.");
    }
  }

  function handleSubmit() {
    if (!location.locationCity) {
      setError("Please set your location before continuing.");
      return;
    }
    const atLeastOne = Object.values(eventTypes).some(Boolean);
    if (!atLeastOne) {
      setError("Please select at least one event type.");
      return;
    }
    const atLeastOneNotif = Object.values(notifications).some(Boolean);
    if (!atLeastOneNotif) {
      setError("Please select at least one notification time.");
      return;
    }

    const data: OnboardingData = {
      ...eventTypes,
      ...location,
      ...notifications,
    };

    startTransition(async () => {
      await saveOnboarding(data);
    });
  }

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-colors ${
                i < step
                  ? "bg-indigo-600 text-white"
                  : i === step
                  ? "bg-indigo-600 text-white ring-4 ring-indigo-600/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm hidden sm:block ${
                i === step ? "text-white font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px mx-1 ${i < step ? "bg-indigo-600" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Event types */}
      {step === 0 && (
        <Card className="border-border bg-slate-900">
          <CardHeader>
            <CardTitle>Hey {userName}! What events interest you?</CardTitle>
            <CardDescription>
              Choose the types of astronomical events you want to be notified about.
              You can change these at any time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {EVENT_TYPE_OPTIONS.map(({ id, emoji, label, description }) => (
              <div
                key={id}
                className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  eventTypes[id]
                    ? "border-indigo-600 bg-indigo-600/10"
                    : "border-border hover:border-border/80"
                }`}
                onClick={() => toggleEventType(id)}
              >
                <Checkbox
                  id={id}
                  checked={eventTypes[id]}
                  onCheckedChange={() => toggleEventType(id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor={id} className="flex items-center gap-2 cursor-pointer font-medium">
                    <span>{emoji}</span> {label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
            ))}
            <Button
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500"
              onClick={() => setStep(1)}
              disabled={!Object.values(eventTypes).some(Boolean)}
            >
              Continue →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Location */}
      {step === 1 && (
        <Card className="border-border bg-slate-900">
          <CardHeader>
            <CardTitle>Where are you located?</CardTitle>
            <CardDescription>
              Used to personalise event visibility — e.g., eclipse paths, ISS
              passes, and meteor shower peak times in your timezone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={detectLocation}
              disabled={isLocating}
            >
              {isLocating ? "Detecting…" : "📍 Use my current location"}
            </Button>

            <div className="relative flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or type your city</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="e.g. San Francisco"
                value={location.locationCity}
                onChange={(e) =>
                  setLocation((prev) => ({ ...prev, locationCity: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCitySearch(location.locationCity);
                }}
                className="bg-slate-800 border-border"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCitySearch(location.locationCity)}
              >
                Search
              </Button>
            </div>

            {location.locationCity && location.locationLat !== 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-600/10 border border-indigo-600 text-sm">
                <span>📍</span>
                <span className="font-medium">{location.locationCity}</span>
                <span className="text-muted-foreground ml-auto">
                  {location.locationLat.toFixed(2)}, {location.locationLng.toFixed(2)}
                </span>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                ← Back
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                onClick={() => {
                  if (!location.locationCity || location.locationLat === 0) {
                    setError("Please set your location before continuing.");
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
              >
                Continue →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Notification timing */}
      {step === 2 && (
        <Card className="border-border bg-slate-900">
          <CardHeader>
            <CardTitle>When should we notify you?</CardTitle>
            <CardDescription>
              Choose how far in advance you want email reminders. You can update
              these at any time in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {NOTIFICATION_OPTIONS.map(({ id, label, description }) => (
              <div
                key={id}
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  notifications[id]
                    ? "border-indigo-600 bg-indigo-600/10"
                    : "border-border hover:border-border/80"
                }`}
                onClick={() => toggleNotification(id)}
              >
                <Checkbox
                  id={id}
                  checked={notifications[id]}
                  onCheckedChange={() => toggleNotification(id)}
                />
                <div>
                  <Label htmlFor={id} className="cursor-pointer font-medium">
                    {label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Start watching the sky ✦"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
