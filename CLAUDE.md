# CLAUDE.md — Meredian

Guidance for Claude Code (and any AI agent) working in this repository.

## What this is

Meredian is a **workout planning & tracking PWA**. Users build workout plans,
schedule sessions on a calendar, log sets, track body measurements, and view
analytics. Mobile-first, installable PWA with offline shell.

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions) + **strict TypeScript**
- **Supabase** (Postgres + Auth + RLS) — SSR via `@supabase/ssr`
- **Tailwind CSS** + Radix UI primitives (custom design system in `components/ui/`)
- **next-intl** for i18n — 5 locales: `messages/{en,es,nb,ru,uk}.json`
- **recharts** (analytics), **framer-motion** (motion), **zod** (validation)
- **react-hook-form**, **react-muscle-highlighter** (body map)
- Tests: **Vitest**

## Commands

```bash
npm run dev         # start dev server (localhost:3000)
npm run build       # production build
npm run typecheck   # tsc --noEmit  ← run this after changes
npm run lint        # next lint
npm run test        # vitest run
```

Always run `npm run typecheck` after edits. The project is strict TS — no `any`,
no implicit returns.

## Project layout

```
app/
  (app)/            # authenticated app (dashboard, calendar, plans, session,
                    #   analytics, profile, exercise) — shares layout.tsx with
                    #   onboarding redirect guard + BottomNav
  (auth)/           # login / signup / reset / update password
  actions/          # server actions ("use server") — the data-mutation layer
  api/export/       # data export route
  auth/callback/    # OAuth code exchange
  onboarding/       # multi-step wizard (OUTSIDE (app) group)
components/         # feature-grouped React components (+ ui/ design system)
lib/
  supabase/         # server.ts / client.ts / middleware.ts factories
  data/             # server-only data readers (preferences, analytics, planSlug)
  validation/       # zod schemas (schemas.ts) + firstError()
  utils/            # pure helpers (units, dates, errors, recommendations)
  types/database.ts # hand-written Supabase Database types + domain type exports
i18n/               # next-intl config (config.ts, locale.ts, request.ts)
messages/           # locale JSON — EVERY new key must exist in all 5 files
supabase/migrations/# plain SQL, NNNN_name.sql, run MANUALLY in SQL editor
public/             # manifest, sw.js, offline.html
```

## Core conventions (follow these)

### Server actions

Every action file starts with `"use server"` and follows this pattern:

```ts
async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function doThing(...): Promise<{ error?: string; id?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = someSchema.safeParse(input);
    if (!parsed.success) return { error: firstError(parsed) };
    // ...mutate with .eq("user_id", user.id) scoping...
    revalidatePath("/relevant-path");
    return { id };
  } catch (e) {
    return { error: safeActionError("doThing", e) };
  }
}
```

- Validate at the boundary with **zod** (`lib/validation/schemas.ts`), never trust input.
- Wrap DB errors with `safeActionError(context, e)` — never leak raw errors to the client.
- Always scope queries by `user_id` (RLS is on, but scope explicitly too).

### Database & migrations

- Migrations are **plain SQL** in `supabase/migrations/NNNN_*.sql`. The
  `Push Supabase Migrations` GitHub Action (`.github/workflows/supabase-migrations.yml`)
  runs `supabase db push` automatically when a migration file merges to `main` —
  no manual SQL editor step needed. Still tell the user when you add one, so they
  know it'll apply on merge.
- Keep `lib/types/database.ts` in sync by hand when schema changes (Row/Insert/Update).
- Profiles' newer columns are read with **separate `.select()` calls** so an
  unapplied migration (missing column) doesn't break the whole page.

### Units

- Weights are **always stored in kg** (`body_measurements.weight_kg`).
- Convert for display with `toKg` / `toDisplayWeight` from `lib/utils/units`.

### i18n

- Use `getTranslations("namespace")` (server) / `useTranslations("namespace")` (client).
- **Any new key must be added to all 5 locale files** (`en, es, nb, ru, uk`).

### Plan URLs use slugs (recent)

- `workout_plans.slug` (migration 0016), unique per `(user_id, slug)`.
- `lib/data/planSlug.ts`: `slugify(name)` + `uniquePlanSlug(...)` (appends `-2/-3`).
- Route `app/(app)/plans/[id]/page.tsx` resolves by **slug OR uuid** (UUID regex),
  so old bookmarks keep working. Foreign keys still use uuid — slug is URL-only.

## Gotchas (learned the hard way)

- **`revalidatePath` inside an action** re-renders the current route immediately.
  If that page has a redirect guard (e.g. `/onboarding` redirects completed users),
  the user gets yanked mid-flow. Defer to `router.refresh()` on navigation instead.
- **PowerShell**: paths containing `(app)` must be quoted (`"app\(app)\profile"`) —
  unquoted parens are parsed as subexpressions.
- Body-map muscle colors are **fixed hex** values, not CSS vars — SVG presentation
  attributes can't use `var()`.

## Key domain modules

- **Onboarding**: `app/onboarding/OnboardingWizard.tsx`, 7 steps; writes
  `profiles.sex/height_cm/goal_type/goal_weight_kg/training_level/onboarding_completed`;
  redirect guard in `app/(app)/layout.tsx`.
- **Exercise catalog**: `exercises` table has `exercise_type`, `equipment`,
  `location`, `primary_muscle`, `gif_url`. Picker: `components/exercises/ExercisePicker.tsx`.
  Recommendation engine: `lib/utils/recommendations.ts` (pure, level-based targets).
- **Body map**: `components/exercises/BodyMap.tsx` wraps `react-muscle-highlighter`;
  `MUSCLE_TO_SLUGS` / `MUSCLE_COLORS` in `lib/types/database.ts`.
- **Guided tour**: `components/tour/GuidedTour.tsx`, route-aware coach marks,
  state in localStorage `meredian.tour`. Anchors via `data-tour` attrs.
- **Calendar**: `app/(app)/calendar/CalendarView.tsx` — .ics download + Google
  Calendar link per session.

## Working style

- Prefer editing existing files over creating new ones.
- Match the existing code style; don't add comments/docstrings to untouched code.
- Only make the change requested; avoid speculative refactors.
- After schema changes, remind the user a new migration will auto-apply on merge to `main`.

## Before committing

Before running `git commit`, launch the `security-auditor` and `bug-hunter` subagents
(in parallel, foreground) over the staged/unstaged diff and relay any findings to the
user before proceeding. This is a reminder, not a hard gate — if the user says to
commit anyway, do it. Skip this for trivial changes (docs, comments, config-only).
Available on demand as `/security-audit`, `/bug-hunt`, and `/ideas` (feature/UX
brainstorming, not tied to committing).
