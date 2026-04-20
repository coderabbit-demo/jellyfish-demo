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

### Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) and create a new project
2. Add a **PostgreSQL** database service
3. Copy the `DATABASE_URL` from the PostgreSQL service's **Variables** tab

### Step 2 — Set environment variables

In your Railway app service → **Variables**, add every key from `.env.example`:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Railway PostgreSQL → Variables |
| `AUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Railway public domain (e.g. `https://starwatch.up.railway.app`) |
| `AUTH_GOOGLE_ID` | [console.cloud.google.com](https://console.cloud.google.com) → Credentials |
| `AUTH_GOOGLE_SECRET` | Same as above |
| `SENDGRID_API_KEY` | [app.sendgrid.com](https://app.sendgrid.com/settings/api_keys) |
| `SENDGRID_FROM_EMAIL` | A verified sender in SendGrid |
| `SENDGRID_FROM_NAME` | `StarWatch` |
| `NASA_API_KEY` | [api.nasa.gov](https://api.nasa.gov/) (free) |
| `ASTRONOMY_API_APP_ID` | [astronomyapi.com](https://astronomyapi.com) (free tier) |
| `ASTRONOMY_API_APP_SECRET` | Same as above |
| `N2YO_API_KEY` | [n2yo.com/api](https://www.n2yo.com/api/) (free tier) |
| `CRON_SECRET` | Run: `openssl rand -hex 32` |

> **Google OAuth redirect URI** — add `https://your-app.up.railway.app/api/auth/callback/google` to your Google OAuth client's authorised redirect URIs.

### Step 3 — Deploy

Connect your GitHub repo to Railway and push. Railway auto-detects Next.js via `railway.json`:
- **Build**: `npm run build` (includes `postbuild` to copy static files into standalone output)
- **Start**: `npx prisma db push && npm run start:prod`

### Step 4 — First run (seed events)

After the first deploy, trigger the event seeder once to populate the database:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.up.railway.app/api/cron/seed-events
```

### Step 5 — Configure cron jobs (Railway Dashboard → Cron)

| Job | Schedule | Command |
|---|---|---|
| Seed events | `0 2 * * *` (daily 2 AM) | `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.up.railway.app/api/cron/seed-events` |
| Send notifications | `0 * * * *` (every hour) | `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.up.railway.app/api/cron/notify` |

### Production smoke test checklist

- [ ] `GET /api/health` returns `{ "status": "ok", "db": "connected" }`
- [ ] Landing page loads at your Railway domain
- [ ] Google OAuth sign-in completes and redirects to `/onboarding`
- [ ] Onboarding saves preferences and redirects to `/dashboard`
- [ ] `/api/cron/seed-events` returns `upserted > 0`
- [ ] Dashboard shows events filtered by your preferences
- [ ] `/api/email/test` (POST, dev only) sends an email to your inbox
- [ ] `/api/cron/notify` returns `processed >= 0` without errors
- [ ] `/settings` saves changes and shows success banner
