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

Clerk is the identity layer. `upsertCurrentUser()` in `src/app/utils/uploadHelpers.tsx` is the canonical way to get-or-create a Supabase `profiles` row for the signed-in Clerk user. Call it at the top of any server action or page that needs the profile. It redirects to `/signin` if no session exists.

### Server actions

Each route segment has a co-located `actions.tsx` or `actions.ts` with `"use server"` functions. Errors are surfaced by redirecting to the current path with `?error=<encoded message>` and rendered by the `<ErrorMsg>` component.

### Database schema (key tables)

| Table | Purpose |
|---|---|
| `profiles` | One row per Clerk user; stores username, school, major, year, bio, avatar_url |
| `courses` | Unique on `(school, class_id)`; stores class metadata |
| `chatrooms` | One per course; unique on `course_id` |
| `chatroom_members` | Join table, unique on `(chatroom_id, user_id)` |
| `messages` | Chat messages; foreign keys to chatrooms and profiles |

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

`ClassSearch.tsx` is wired up to `searchChatrooms` and renders real results. Search filtering now happens in the database (F2 done, F4 indexes done).

## Learning Log

Concepts the user has covered and understands. Don't re-explain from scratch unless asked.

### Roadmap progress

- ✅ F2 — search filtering pushed into the database (`searchChatrooms` uses `.or()` with `foreignTable: "courses"` + `.ilike()` + `.limit(20)`)
- ✅ F4 — B-tree indexes on `chatroom_members(user_id)`, `chatroom_members(chatroom_id)`, `messages(chatroom_id, created_at DESC)`, `courses(school, class_id)` (last one may be a duplicate of the unique-constraint index)
- ⬜ Remaining Tier 1: B2 (migrations), F1 (RLS), F3 (Zod), B3 (env validation)
- ⬜ Open question: B1 (pg_trgm + GIN) needed before search performs well at scale, since B-trees don't help `%foo%` ILIKE patterns

### Database concepts covered

- Indexes = pre-sorted lookup. Trade disk + small write cost for fast reads. Index columns you filter on, not columns you only store.
- B-tree (default) handles `=`, `<`, `>`, `ORDER BY`, `LIKE 'prefix%'`. Does NOT handle `LIKE '%middle%'` — that's GIN + pg_trgm territory.
- Multi-column indexes are left-to-right. `(a, b)` helps queries on `a` alone or `(a, b)`, not `b` alone.
- UNIQUE constraints auto-create an index — don't duplicate.
- `EXPLAIN ANALYZE` shows the query plan. `Seq Scan` on tiny tables is normal/optimal; once tables grow, planner switches to `Index Scan`.
- `SET enable_seqscan = OFF` is for testing only — forces an index scan to verify the index exists.

### Supabase / PostgREST concepts covered

- Builder pattern: each method returns a new query object; no network call until `await`. Build conditionally with `let q = ...; if (cond) q = q.x(...)`.
- `!inner` modifier forces an inner join (drops rows with missing related rows).
- `.or("col1.op.val,col2.op.val", { foreignTable: "tableName" })` for OR across joined-table columns.
- `.ilike("foreign.column", "%val%")` works with a dotted column path for single-column filters on joined tables.
- ILIKE wildcards: `%x%` = contains, `x%` = starts with, `%x` = ends with.

### Engineering practices internalized

- Push filtering to the data layer, not the app layer.
- Cheap paths run before expensive paths (empty-input early-return before auth).
- UI `disabled` is a hint, not security — real authz happens server-side.
- Verify-before-delete pattern when swapping old logic for new.
- Decide product questions before writing code.
- Don't bundle refactors with features.
- Builder pattern: never `await` until all conditional filters are added.
