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

Explain things more simply as a junior who is learning. Any concepts used in explanations, explain it shortly (API, promises, etc) and use less advanced language.

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

`searchChatrooms` in `src/app/dashboard/actions.tsx` fetches all chatrooms but the filtering/return logic is commented out. `ClassSearch.tsx` has a form with no action wired up and hardcodes a placeholder `SearchedChatroomCard`.
