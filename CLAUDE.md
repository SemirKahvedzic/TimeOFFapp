@AGENTS.md
# CLAUDE.md

Context for Claude Code working in this repo. Read before making non-trivial changes.

## What this is

TimeOff is a white-label attendance and time-off platform for small-to-mid-sized teams. **One install = one company.** Branding, leave types, holidays, work week, time zone, and language all live in a single `Company` row and are read at runtime — never hardcode them.

## Stack

- **Next.js 16** — App Router, Turbopack
- **TypeScript** — strict mode; avoid `any` without a comment explaining why
- **Tailwind CSS v4** — CSS-first config (`@theme` in `globals.css`)
- **NextAuth v4** — credentials provider, JWT sessions (use `getServerSession`)
- **Prisma 7 + Postgres** via `@prisma/adapter-pg`, hosted on Supabase, deployed on Vercel
- **lucide-react** for icons
- **Jest** for unit tests
- **Resend** for transactional mail (meeting invites, RSVPs, notifications)

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run lint         # ESLint — run after meaningful edits
npm run test         # Jest
npm run db:migrate   # prisma migrate dev — use whenever schema.prisma changes
npm run db:push      # quick prototyping only, do not use for tracked changes
npm run db:seed      # reseed demo data
```

After editing TS/TSX, run `npm run lint`. After editing `schema.prisma`, run `db:migrate` with a descriptive migration name — not `db:push`.

## Architecture rules

**Never call Prisma directly from components or pages.** Go through `src/lib/`: `db.ts` exports the client, and domain helpers (`company.ts`, `audit.ts`, …) wrap queries. Route handlers and components consume those helpers.

**Theming comes from the `Company` row.** Brand color, accent, logo, tagline, etc. are injected as CSS variables by `getCompany()` and the theme helper in `lib/company.ts`. If you're typing a hex color into a component, stop — use a CSS var.

**Every admin mutation writes to `AuditLog`.** Approvals, rejections, deletions, settings changes, and CRUD on leave types / holidays / departments all go through `lib/audit.ts`. A new admin action without an audit row is a bug.

**i18n keys live in `src/lib/i18n/messages.ts`** with EN / DE / IT variants. Don't hardcode user-facing strings. When you add a key, add it to all three locales (or EN with a `// TODO de/it` if you genuinely can't translate it yet).

**Soft-UI design tokens** — pillowy cards, neumorphic shadows, brand-glow accents — are defined as CSS vars and Tailwind utilities. Don't reinvent shadows or reach for a third-party UI kit. Mobile drawer breakpoint is `md` (768px).

## Data-model touchpoints

Tables: `Company`, `Department`, `LeaveType`, `Holiday`, `LeaveBalance`, `AuditLog`, `User`, `TimeOffRequest`, `Attendance`.

Things that are easy to break, watch for them:
- `LeaveBalance` is per (User, LeaveType, Year). Adding or removing a leave type means creating or archiving balances for affected users — don't just delete the `LeaveType` row.
- Approving a `TimeOffRequest` should decrement the matching `LeaveBalance.used`. Rejection or deletion of a previously approved request should restore it. Keep this logic in one place in `lib/`.
- Non-working days come from `Company.workWeek` + `Holiday`. The calendar's disabled-day logic must use a shared util — don't reimplement it per view.

## Conventions

- Server components by default. Add `"use client"` only when you need state, effects, or browser APIs.
- API routes under `src/app/api/` stay thin; logic lives in `lib/`.
- Tests live next to the unit, named `*.test.ts`. Balance/accrual math and date utilities should always have tests.
- Naming: components `PascalCase.tsx`, utilities `camelCase.ts`, route segments lowercase.
- Imports: absolute `@/…` for anything in `src/`, relative for sibling files.

## Things not to do

- Don't bypass `getCompany()` to read the `Company` table directly.
- Don't add a UI library (shadcn, Radix wholesale, MUI). The design system is custom — match it.
- Don't add dependencies without a clear reason. Prefer what's already in `package.json`.
- Don't use `localStorage`/`sessionStorage` for auth or company state — that's NextAuth + DB territory.
- Don't restructure `prisma/schema.prisma` casually — migrations are linear and shipped.

## Known quirks

- **Tailwind v4** — utility classes work as expected, but config is CSS via `@theme`. Don't add a `tailwind.config.js` unless you've checked it's actually needed.
- **NextAuth v4 + App Router** — `getServerSession(authOptions)` is the pattern. Don't introduce v5 (`auth()`) syntax without migrating the whole app.
- **Supabase + Vercel pooling** — runtime `DATABASE_URL` must use the **transaction pooler** (port 6543) with `?pgbouncer=true&connection_limit=1`. The session pooler exhausts connections (`EMAXCONNSESSION`) under serverless fan-out. Migrations use the direct/session URL — keep them as separate env vars.
- **Layout-state mutations need a full reload.** In Next 16, settings that flow through the root layout (theme, language, brand colors, logo) don't update on `router.refresh()` alone. After saving, call `revalidatePath` on the server and `window.location.reload()` on the client.
- **Language is per-user only.** The layout reads `userPrefs?.language ?? "en"` — never let `Company.language` cascade. `/api/company` PATCH rejects `language` and there is no admin UI for it.
- **Email sending on serverless.** Use Next 16's `after()` so the response returns before fan-out completes (otherwise Vercel kills the function mid-send). Resend has rate limits — send invites sequentially, not in `Promise.all`.

## When in doubt

Ask before: changing the schema non-additively, swapping auth providers, replacing the styling system, or removing an existing feature. Additive changes that match the existing patterns don't need a check-in.