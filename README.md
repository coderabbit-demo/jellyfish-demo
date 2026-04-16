# ✦ StarWatch

**Never miss a sky event again.**

StarWatch is a personal astronomical event tracker that pulls public data from NASA, AstronomyAPI, and other trusted scientific sources to surface upcoming space events — eclipses, meteor showers, comets, planetary alignments, supermoons, ISS passes, space missions, and more.

Sign in with Google, set your preferences and location, and receive personalized email notifications 1 week, 48 hours, and 4 hours before each event.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL (Railway) |
| ORM | Prisma 7 |
| Auth | NextAuth.js v5 + Google OAuth |
| Email | SendGrid |
| Styling | Tailwind CSS + shadcn/ui |
| Hosting | Railway |

## Data Sources

- [NASA API](https://api.nasa.gov/) — Near-Earth Objects, Space Weather (DONKI)
- [AstronomyAPI](https://astronomyapi.com/) — Planetary events, supermoons
- [Open-Notify](http://open-notify.org/) — ISS pass times
- Hard-coded annual catalog — Meteor showers (Perseids, Leonids, Geminids, etc.)

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL (local or Railway)
- Accounts for: Google Cloud Console, SendGrid, NASA API, AstronomyAPI

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to database
npx prisma db push

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required Environment Variables

See [`.env.example`](.env.example) for the full list with instructions.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Sign-in page
│   ├── onboarding/      # First-login preference setup
│   ├── dashboard/        # Events dashboard
│   ├── settings/         # Manage preferences
│   └── api/
│       ├── auth/         # NextAuth route handler
│       ├── cron/         # Event seeding + notification dispatch
│       └── email/        # Email preview (dev only)
├── lib/
│   ├── astro/            # Astronomical data fetchers
│   ├── email/            # SendGrid helpers
│   ├── db.ts             # Prisma client singleton
│   └── auth.ts           # NextAuth config
├── components/
│   ├── ui/               # shadcn/ui base components
│   ├── EventCard.tsx
│   ├── PreferencesForm.tsx
│   └── LocationPicker.tsx
prisma/
└── schema.prisma
```

---

## Deployment (Railway)

1. Create a Railway project and provision a PostgreSQL database
2. Add environment variables from `.env.example`
3. Deploy — Railway auto-detects Next.js
4. Add a Railway cron job: `GET /api/cron/notify` every hour with `Authorization: Bearer $CRON_SECRET`
