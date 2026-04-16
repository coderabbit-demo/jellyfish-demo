import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const EVENT_TYPES = [
  { emoji: "🌒", label: "Lunar Eclipses & Supermoons" },
  { emoji: "☄️", label: "Comets & Meteor Showers" },
  { emoji: "🪐", label: "Planetary Alignments" },
  { emoji: "🌑", label: "Solar Eclipses" },
  { emoji: "🛸", label: "ISS Passes & Aurora" },
  { emoji: "🚀", label: "Space Missions & Launches" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">
          ✦ StarWatch
        </span>
        <Link href="/auth/signin">
          <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
            Sign in
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <Badge variant="secondary" className="bg-indigo-900/60 text-indigo-300 border-indigo-700/50 text-sm px-3 py-1">
          Powered by NASA · AstronomyAPI · Open-Notify
        </Badge>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
          Never miss a{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            sky event
          </span>{" "}
          again
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-xl leading-relaxed">
          StarWatch tracks upcoming astronomical events and sends you
          personalized email reminders — 1 week, 48 hours, and 4 hours before
          each event.
        </p>

        <Link href="/auth/signin">
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 text-base rounded-full">
            Get started — it&apos;s free
          </Button>
        </Link>

        {/* Event type chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 max-w-2xl">
          {EVENT_TYPES.map(({ emoji, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-300"
            >
              {emoji} {label}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-slate-600 text-sm py-6 border-t border-white/5">
        StarWatch · Built with Next.js, Prisma, and public scientific APIs
      </footer>
    </div>
  );
}
