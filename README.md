# TimeOff

> Modern, white-label attendance and time-off platform you can spin up for any
> small-to-mid-sized team. Pick a brand color, drop in a logo, configure leave
> types — and it's their app.

Built with Next.js 16 (App Router) · Prisma 7 · NextAuth · Tailwind CSS v4.

---

## Highlights

- **White-label out of the box** — every install reads brand color, accent,
  logo, tagline, work week, time zone and language from a single `Company`
  row. Change it in Settings → refresh → the whole app re-skins.
- **Light + Dark theme** — fixed dark palette that complements the brand
  color. Admins flip the switch in Settings.
- **i18n** — English, Deutsch, Italiano. ~95% of visible UI translated.
- **Tactile Soft-UI design** — pillowy cards, neumorphic shadows, brand-glow
  accents. Mobile drawer for screens under 768 px.

### Employee experience
- Dashboard with PTO balance per leave type (allowance / used / remaining).
- One-tap attendance: Present · Sick · Out — appears as a dot on the calendar.
- Request flow with custom leave types, half-day toggles, optional reason.
- Calendar view with non-working days disabled, holidays highlighted.
- Personal request history with filter pills (All / Pending / Approved /
  Rejected) and pagination.

### Admin experience
- Overview with KPI tiles, pending queue, "off this week", team calendar.
- Requests page with filter pills, paginated history (10/page).
- Team page with departments, manager hierarchy, job titles, invite-by-email.
- **Reports** — usage by month, by department, top users, upcoming coverage,
  scoped CSV download (whole team / department / single person).
- Settings: brand identity, logo upload, color pickers + reset-to-defaults,
  theme, language, work week, country, time zone, leave types CRUD, holidays
  CRUD, departments CRUD, public iCal feed for Google/Outlook/Apple.
- Audit log writes on every approval, rejection, deletion, settings change.

---

## Stack

| Layer       | Choice                                                    |
| ----------- | --------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack)                        |
| Language    | TypeScript                                                |
| UI          | Tailwind CSS v4 + custom design tokens (CSS variables)    |
| Auth        | NextAuth v4 (credentials provider, JWT sessions)          |
| Database    | Prisma 7 + Postgres (Neon recommended, any Postgres works)|
| Email       | EmailJS (optional, for invites + request status)          |
| Icons       | lucide-react                                              |
| Tests       | Jest                                                      |

---

## Quick start

You need a Postgres database. Easiest is Neon — free tier, branchable,
takes 30 seconds to provision at <https://neon.tech>.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# - DATABASE_URL: your Neon pooled URL
# - NEXTAUTH_SECRET: openssl rand -base64 32
# - (optional) EmailJS keys

# 3. Push the schema to your database
npx prisma migrate dev --name init

# 4. Seed demo data
npm run db:seed

# 5. Run
npm run dev
# → http://localhost:3000
```

### Demo accounts

| Role      | Email                  | Password      |
| --------- | ---------------------- | ------------- |
| Admin     | `admin@company.com`    | `admin123`    |
| Employee  | `sarah@company.com`    | `employee123` |
| Employee  | `marcus@company.com`   | `employee123` |
| Employee  | `priya@company.com`    | `employee123` |
| Employee  | `tom@company.com`      | `employee123` |

---

## Deploy on Fly.io

The repo ships with a `Dockerfile` and `fly.toml`. The Dockerfile uses
Next.js standalone output and carries the Prisma CLI into the runner
image so migrations can run on every release.

### 1 · Provision Postgres

Either spin up a Fly Postgres cluster colocated with the app:

```bash
fly postgres create --name timeoff-db --region fra
fly postgres attach timeoff-db          # injects DATABASE_URL automatically
```

…or use Neon (or any managed Postgres) and copy the **pooled**
connection string — it'll go in as a Fly secret in the next step.

### 2 · Create the app and set secrets

```bash
fly launch --no-deploy --copy-config    # keeps the committed fly.toml

fly secrets set \
  DATABASE_URL="postgres://…?sslmode=require" \
  NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  NEXTAUTH_URL="https://<your-app>.fly.dev"

# Optional — invitation + request-status emails
fly secrets set \
  NEXT_PUBLIC_EMAILJS_SERVICE_ID=… \
  NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=… \
  NEXT_PUBLIC_EMAILJS_INVITE_TEMPLATE_ID=… \
  NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=…
```

(`fly postgres attach` already set `DATABASE_URL` if you went the Fly
Postgres route — skip it above.)

### 3 · Generate the initial migration

There are no committed migrations yet. Pull the same `DATABASE_URL` into
your local `.env`, then run once:

```bash
npx prisma migrate dev --name init      # creates prisma/migrations/
git add prisma/migrations && git commit -m "Add initial Prisma migration"
```

### 4 · Deploy

```bash
fly deploy
```

Fly builds the Docker image, runs `prisma migrate deploy` as the
release command, and rolls out the new machines. Subsequent `git push`es
to GitHub auto-deploy via the Fly GitHub integration.

To seed demo data into the deployed DB (one-off):

```bash
fly ssh console -C "npm run db:seed"
```

---

## Project layout

```
.
├── prisma/
│   ├── schema.prisma          # Company, Department, LeaveType, Holiday,
│   │                          # LeaveBalance, AuditLog, User, TimeOffRequest,
│   │                          # Attendance
│   ├── migrations/
│   └── seed.ts                # Demo company, users, leave types, holidays
├── src/
│   ├── app/
│   │   ├── login/             # Server + client form, brand-aware
│   │   ├── dashboard/         # Employee home
│   │   ├── calendar/          # Team calendar + attendance dots
│   │   ├── admin/             # Overview · Requests · Team · Reports · Settings
│   │   └── api/               # company, leave-types, holidays, departments,
│   │                          # balances, reports, ical/[token], etc.
│   ├── components/            # AppShell, Sidebar, RequestCard, TeamCalendar,
│   │                          # AttendanceWidget, BalanceCard, … + ui/
│   └── lib/
│       ├── i18n/              # messages.ts (EN/DE/IT) + context.tsx
│       ├── company.ts         # getCompany() + theme injection helper
│       ├── audit.ts           # AuditLog helper
│       ├── auth.ts            # NextAuth config
│       └── db.ts              # Prisma client
├── Dockerfile                 # Next.js standalone + Prisma CLI runtime
└── fly.toml                   # Fly.io app config
```

---

## Scripts

```
npm run dev          # Next dev server
npm run build        # Production build
npm run start        # Start the production build
npm run lint         # ESLint
npm run test         # Jest unit tests
npm run db:migrate   # prisma migrate dev
npm run db:seed      # Reseed demo data
npm run db:push      # prisma db push (skip migration files)
```

---

## License

Proprietary — © Semir Kahvedzic. All rights reserved.
