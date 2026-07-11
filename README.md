# Meridian

**Train with precision.** A fitness training planner and analytics tool. Create
structured workout plans, log what you actually completed, and let Meridian
compare **plan versus reality** to surface insights about your training over time.

This is a training analytics platform, not a simple logger. The visual identity
is _precision instrument_: quiet, dark, typographically driven. Colour signals
information, never decoration.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + custom shadcn/ui primitives
- **Supabase** — PostgreSQL, Auth, RLS
- **Recharts** for charts, **Lucide** for icons
- Fonts: **Manrope** (display), **Inter** (body), **JetBrains Mono** (numbers)
- **React Hook Form + Zod**, **Framer Motion** (minimal)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a project at [supabase.com](https://supabase.com), then copy your URL and
anon key into `.env.local`:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the database migrations

In the Supabase SQL editor, run the files in `supabase/migrations/` in order:

1. `0001_init.sql` — tables, indexes, and the new-user profile trigger
2. `0002_rls.sql` — Row Level Security policies
3. `0003_seed.sql` — global exercise catalogue

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and you'll be
routed to the dashboard.

## Project structure

```
app/
  (auth)/          login & signup
  (app)/           dashboard, calendar, plans, session, analytics, settings
  actions/         server actions (auth, plans, sessions, exercises, analytics)
components/
  ui/              shadcn-style primitives (customised palette)
  layout/          BottomNav, PageHeader, Wordmark
  thread/          WeekThread — the signature week-line component
  session/         ExerciseRow, SetInput, PlanBuilder, SessionRunner, QuickAdd
  insight/         InsightCard
  charts/          VolumeChart, ExerciseProgressChart
lib/
  supabase/        browser, server, and middleware clients
  types/           hand-written Supabase database types
  utils/           volume, delta, insights (rule engine), dates
  data/            analytics aggregation
supabase/
  migrations/      SQL schema, RLS, and seed
```

## Design system

| Token      | Value                    | Use                              |
| ---------- | ------------------------ | -------------------------------- |
| `carbon`   | `#101113`                | page background                  |
| `graphite` | `#1A1B1F`                | card / panel background          |
| `bone`     | `#EDEAE3`                | primary text                     |
| `bone-dim` | `rgba(237,234,227,0.42)` | secondary text                   |
| `steel`    | `#9BA7B4`                | the only accent (active, thread) |
| `clay`     | `#BD5B3F`                | negative deviation signal only   |
| `moss`     | `#6F8F6A`                | positive deviation signal only   |

`clay` and `moss` appear **only** as plan-vs-actual deviation signals. All
numbers use JetBrains Mono with `tabular-nums` (`font-num` utility).

## Roadmap (placeholders only)

These appear as disabled "Coming soon" entries in Settings:

- Google / Apple Calendar sync
- Apple Health integration
- AI coaching — progression suggestions from your plan-vs-reality history
