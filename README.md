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
| Database    | Prisma 7 with SQLite (dev) — swap adapter for production  |
| Email       | EmailJS (optional, for invites + request status)          |
| Icons       | lucide-react                                              |
| Tests       | Jest                                                      |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# fill in NEXTAUTH_SECRET and any optional EmailJS keys

# 3. Set up the database (creates dev.db locally)
npx prisma migrate dev

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

## Deploy on Netlify

The repo ships with `netlify.toml` and works with Netlify's Next.js plugin
out of the box.

### 1 · Pick a database

Local dev uses SQLite (`dev.db`). Netlify (and any serverless host) has an
ephemeral filesystem, so you need a hosted database for production:

| Option                             | Why                                                            |
| ---------------------------------- | -------------------------------------------------------------- |
| **Turso / libSQL** *(recommended)* | SQLite-compatible — schema works as-is, just swap the Prisma adapter to `@prisma/adapter-libsql`. |
| **Neon Postgres**                  | Battle-tested. Change `provider = "postgresql"` in `prisma/schema.prisma` and re-run `prisma migrate dev`. |
| **Supabase Postgres**              | Same as Neon, plus a UI to inspect data.                       |

### 2 · Set environment variables in Netlify

In the site dashboard → **Site configuration → Environment variables**, add:

```
DATABASE_URL          = <your hosted DB URL>
NEXTAUTH_SECRET       = <openssl rand -base64 32>
NEXTAUTH_URL          = https://your-app.netlify.app

# Optional — invitation + status emails
NEXT_PUBLIC_EMAILJS_SERVICE_ID
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
NEXT_PUBLIC_EMAILJS_INVITE_TEMPLATE_ID
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
```

### 3 · Run migrations on the hosted DB

Run once, locally, against the production DB URL:

```bash
DATABASE_URL="<your hosted db url>" npx prisma migrate deploy
DATABASE_URL="<your hosted db url>" npm run db:seed   # only if you want demo data
```

### 4 · Deploy

```bash
git push
```

Netlify picks up `netlify.toml`, runs `npm run build`, and deploys.

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
└── netlify.toml               # Netlify build config
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
