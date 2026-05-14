# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # ESLint
```

No test suite is configured.

## User

I am a user who is trying to learn and delve into Software Development (not hobbyist/vibecoding). When implementing/suggesting/planning, teach me like I am learning and explain every function, and ask before implementing. I want to learn as I build this project.

## Explanations

Explain everything ELI5 (Explain Like I'm 5):
- Use plain words, not jargon. If a technical term is unavoidable, define it in one short sentence first.
- Lead with everyday analogies (phone book, librarian, recipe, lego bricks) before code or formal definitions.
- Short sentences. One idea at a time. Don't stack three concepts in one paragraph.
- When introducing a new concept (API, promise, index, join, etc.): give the analogy first, then the technical name, then a tiny example.

## Who writes the code (default rule)

**By default, the user writes the code. Claude gives instructions detailed enough to type.**

- If the user does not explicitly say "you do it" / "you write it" / "make the edit," Claude must NOT use Edit / Write / NotebookEdit on `src/**` or `db/**` files. Instead, Claude lays out the exact change (file, line, before/after blocks) and lets the user apply it.
- Claude may always edit non-code project artifacts (README.md, ROADMAP.md, tempcheckup.md, CLAUDE.md) without asking.
- If a change touches >3 files of similar boilerplate, Claude should propose: "you write file 1, I'll do the rest." Lesson concentrates in the first one.
- Verifying the user's edits (Read + diff check) is always Claude's job.
- This rule exists because the user is here to learn engineering, not to watch.

## Required environment variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Architecture

**Stack**: Next.js 16 (App Router) · React 19 · Clerk v7 (auth) · Supabase v2 (database + realtime) · Tailwind CSS v4

### Two Supabase clients

- `src/app/lib/supabase.ts` — anon/public client, used client-side only (real-time subscriptions in `ChatMessages.tsx`)
- `src/app/lib/supabaseAdmin.ts` — service role client (`"server-only"`), used in Server Actions and server components for all privileged reads/writes

Always use `getSupabaseAdmin()` for mutations and anything that requires bypassing RLS. Use the public `supabase` client only for client-side real-time listeners.

### Auth pattern

Clerk is the identity layer. `upsertCurrentUser()` in `src/app/utils/uploadHelpers.ts` is the canonical way to get-or-create a Supabase `profiles` row for the signed-in Clerk user. Call it at the top of any server action or page that needs the profile. It redirects to `/signin` if no session exists.

Because we use Clerk (not Supabase Auth), RLS policies use a custom Postgres function `current_user_id()` that reads `auth.jwt() ->> 'sub'` instead of `auth.uid()`. See `db/migrations/001_initial.sql`.

### Server actions

Each route segment has a co-located `actions.tsx` or `actions.ts` with `"use server"` functions. Errors surface in two equivalent ways:
- **Redirect-based** (`joinChatroom`, `updateProfile`): action `redirect(\`...?error=<encoded>\`)`; page reads `searchParams.error` and passes it to `<ErrorMsg>`.
- **State-based** (`createChatroom`): action returns `{ error: string | null }` via `useActionState`; form renders `<ErrorMsg message={state.error} />`.

`<ErrorMsg>` is a single toast component (fixed bottom-right) used in both flows. It resets visibility via `useEffect` when `message` changes so dismissed errors reappear on the next bad submit.

### Database schema (key tables)

| Table | Purpose |
|---|---|
| `schools` | Canonical school list; admin-managed (no INSERT/UPDATE/DELETE RLS policy). Has `name` (unique), `color` (hex). |
| `profiles` | One row per Clerk user; stores username, `school_id` (FK to schools, nullable), major, year, bio, avatar_url |
| `courses` | Unique on `(school_id, class_id)`; stores class metadata; `school_id` is NOT NULL FK to schools |
| `chatrooms` | One per course; unique on `course_id` |
| `chatroom_members` | Join table, unique on `(chatroom_id, user_id)` |
| `messages` | Chat messages; foreign keys to chatrooms and profiles |

School is normalized into its own table. `profiles.school_id` and `courses.school_id` reference `schools.id` (UUID). Filters that used to do `lower(school) = lower(school)` are now exact UUID equality.

### Real-time chat

`ChatMessages.tsx` is a client component that:
1. Seeds its state from `initialMessages` (fetched server-side)
2. Subscribes to `postgres_changes` INSERT events on `messages` filtered by `chatroom_id`
3. Sends messages optimistically via the `sendMessage` server action, deduplicating against the real-time feed using message `id`

### Routes

| Route | Notes |
|---|---|
| `/` | Marketing landing page |
| `/signin/[[...signin]]` | Clerk-hosted sign-in |
| `/dashboard` | Lists joined chatrooms; includes search (in progress) and create-chatroom form |
| `/chatrooms/[chatroomId]` | Real-time chat; membership-gated |
| `/profile` | View own profile |
| `/profile/update-profile` | Edit username, school, major, year, bio |

### In-progress work

See `ROADMAP.md` for the full plan. Currently mid-**Tier 2A** (school-gated join). Phases 1–4 of the schools refactor are complete:

1. ✅ Migration `003_schools_table.sql` — schools as its own table
2. ✅ Profile flow — `<datalist>`-driven school picker; server resolves name → UUID via case-insensitive ilike
3. ✅ `createChatroom` pulls `school_id` from creator's profile (form no longer takes school)
4. ✅ Search + render — joined queries return `{ id, name, color }` shape; UI badges use the color
5. ⬜ **Phase 5 pending**: `004_school_gated_join.sql` (RLS policy `chatroom_members` INSERT requires `profile.school_id = course.school_id`) + UI button states (Joined / Different school / Join)

## Learning Log

Concepts the user has covered and understands. Don't re-explain from scratch unless asked.

### Roadmap progress

Tier 0 foundations all done — RLS (F1), search-to-DB (F2), Zod validation (F3), indexes (F4), migrations (B2), env validation (B3). Tier 1 polish all done — exam-date refine, placeholder cleanup, Header server-rendered. Mid-Tier 2A (school gating) — see "In-progress work" above.

Open future work: B1 (pg_trgm + GIN) needed before search performs well at scale, since B-trees don't help `%foo%` ILIKE patterns.

### Database concepts covered

- Indexes = pre-sorted lookup. Trade disk + small write cost for fast reads. Index columns you filter on, not columns you only store.
- B-tree (default) handles `=`, `<`, `>`, `ORDER BY`, `LIKE 'prefix%'`. Does NOT handle `LIKE '%middle%'` — that's GIN + pg_trgm territory.
- Multi-column indexes are left-to-right. `(a, b)` helps queries on `a` alone or `(a, b)`, not `b` alone.
- UNIQUE constraints auto-create an index — don't duplicate.
- `EXPLAIN ANALYZE` shows the query plan. `Seq Scan` on tiny tables is normal/optimal; once tables grow, planner switches to `Index Scan`.
- `SET enable_seqscan = OFF` is for testing only — forces an index scan to verify the index exists.
- **Normalization (3NF)** — if data describes a *thing*, give it its own table and reference by FK. Schools was the canonical example.
- **Foreign-key behaviors:** `ON DELETE SET NULL` (soft — child becomes orphaned but lives), `ON DELETE RESTRICT` (block parent delete while children exist), `ON DELETE CASCADE` (delete children too).
- **TRUNCATE vs DELETE** — TRUNCATE is faster (no row-by-row processing); CASCADE handles dependent tables.
- **Forward-only migrations** — no rollback scripts. Simpler, fits dev-scale projects.
- **Idempotent seeds** — `INSERT ... ON CONFLICT (col) DO NOTHING` makes re-runs safe.

### Supabase / PostgREST concepts covered

- Builder pattern: each method returns a new query object; no network call until `await`. Build conditionally with `let q = ...; if (cond) q = q.x(...)`.
- `!inner` modifier forces an inner join (drops rows with missing related rows). Works at multiple levels: `parent!inner(child!inner(...))`.
- `.or("col1.op.val,col2.op.val", { foreignTable: "tableName" })` for OR across joined-table columns.
- `.ilike("foreign.column", "%val%")` works with a dotted column path for single-column filters on joined tables.
- ILIKE wildcards: `%x%` = contains, `x%` = starts with, `%x` = ends with. ILIKE *without* `%` = case-insensitive equality.
- `.in()` is the one filter method that does **not** accept the `{ foreignTable }` option. Workaround: use a dotted column path — `.in("courses.school_id", ids)`.
- **Pre-resolve foreign keys** when filter syntax gets awkward. E.g., name → UUID lookup, then filter by ID.

### React / Next.js concepts covered

- Server components vs client components. Server: `currentUser()` from `@clerk/nextjs/server`, fetches data via `await`. Client: `useUser()` hook, must have `"use client"`. Server components can freely render client components as children.
- `useActionState` for form actions that return state to render inline (vs redirect-based actions).
- `useRef<Map<...>>(new Map())` for client-side caching that persists across renders without triggering re-renders.
- `useEffect(..., [dep])` — runs on first render and whenever a dep changes. Used to reset state when props change (e.g., `<ErrorMsg>` re-showing dismissed toast).
- `<datalist>` + `<input list="...">` for type-with-suggestions UX, no React state needed. Input submits whatever text is in it.
- `form.requestSubmit()` for programmatic form submission from a keydown handler (Enter-to-send pattern).
- `event.preventDefault()` to override default keypress/event behavior.
- `field-sizing: content` (Tailwind: `field-sizing-content`) auto-grows form elements to fit content.

### Engineering practices internalized

- Push filtering to the data layer, not the app layer.
- Cheap paths run before expensive paths (empty-input early-return before auth).
- UI `disabled` is a hint, not security — real authz happens server-side.
- Verify-before-delete pattern when swapping old logic for new.
- Decide product questions before writing code.
- Don't bundle refactors with features.
- Builder pattern: never `await` until all conditional filters are added.
- **YAGNI** — remove abstraction the moment it goes unused (we did this with `ErrorMsg` `variant` prop).
- **Defense in depth** — enforce rules in both app code (friendly errors) and database (RLS, FK constraints).
- **Normalize the data model before piling on features** — schools refactor was a 4-6 hour detour that made everything downstream trivially correct.
- **Wipe + reseed beats backfill** for dev-stage migrations with no real users.
