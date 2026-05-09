# StudyHub — Codebase Review

## Context

You asked for a scan of your whole codebase: what's good, what's bad, what's still in-progress. Since you're learning, I've grouped findings by *concept* (auth, data flow, UI wiring, etc.) and tried to explain *why* something matters, not just point at lines. Citations are `file:line` so you can jump straight to the code.

This is a review, not an implementation plan — there's nothing for me to "execute" at the end. The "next steps" section at the bottom is just a suggested order if you want to start fixing things.

---

## What you've built so far

A Next.js 16 (App Router) study-group app where signed-in students can:

1. Create a chatroom for a class (`/dashboard` → `CreateClass.tsx` → `createChatroom` server action).
2. View their joined chatrooms (`/dashboard`).
3. Open a chatroom and chat in real time (`/chatrooms/[chatroomId]` + `ChatMessages.tsx` + Supabase realtime).
4. View and edit their own profile (`/profile`, `/profile/update-profile`).

**Stack:** Next.js 16, React 19, Clerk v7 (auth), Supabase v2 (Postgres + realtime), Tailwind v4. No tests. No CI.

The data model is sensible:
- `profiles` (1 per Clerk user)
- `courses` (unique per `school + class_id`)
- `chatrooms` (1 per course)
- `chatroom_members` (join table)
- `messages`

---

## The Good

These are patterns you got right. Worth understanding *why* so you keep using them.

1. **Two Supabase clients, separated by trust level** — `lib/supabase.ts:1` is the public anon client; `lib/supabaseAdmin.ts:1` is the service-role client and uses `import "server-only"`. The `"server-only"` directive is a Next.js feature that makes the build *fail* if a client component imports the file. That's how you keep the service-role key from ever reaching the browser. This is one of the most important security boundaries in the app and you got it right.

2. **Auth check before mutation** — `chatrooms/[chatroomId]/actions.tsx:11-13` calls `auth()` and throws if no user. Then `:21-34` checks the `chatroom_members` table to confirm the user is a member of *this* chatroom before inserting a message. This is the "authentication vs. authorization" distinction: knowing *who you are* (auth) is not the same as knowing *what you can do* (authz).

3. **Idempotent upserts with `onConflict`** — `utils/uploadHelpers.tsx:14, 35, 66`. Using `.upsert(..., { onConflict: "chatroom_id,user_id" })` means re-running the same operation doesn't create duplicates or throw a unique-constraint error. This matters because `upsertCurrentUser()` runs on *every* page load — if it weren't idempotent, you'd get errors on the second visit.

4. **`upsertCurrentUser()` as a single canonical entry point** — `utils/uploadHelpers.tsx:78`. Every server action and protected page calls this one function. That gives you one place to enforce the Clerk → Supabase profile mapping. If you ever change how profiles are created (e.g., add a "school" prompt before first message), you change it once here.

5. **Async `params` and `searchParams` are awaited** — `chatrooms/[chatroomId]/page.tsx:8`, `dashboard/page.tsx:18`. In Next.js 16 these are Promises (breaking change from 14). You handled it correctly. This is exactly the kind of thing the AGENTS.md note warns about.

6. **`await connection()` in the dashboard** — `dashboard/page.tsx:16`. This opts out of static prerendering for the page. Without it, Next might try to render the dashboard at build time, which would fail because you need the signed-in user's data.

7. **Optimistic UI + dedup in chat** — `ChatMessages.tsx:81-91` adds the message locally before the server confirms, and `:49-54` checks `id` so the realtime echo doesn't duplicate it. That's the right pattern: feels instant, stays consistent.

8. **Tailwind classes are reasonably consistent** — same color palette (purple/slate/red), same border-radius, same shadow tokens. You haven't drifted into ad-hoc styling, which makes the UI feel cohesive.

9. **`type="server-only"` import + lazy singleton** — `lib/supabaseAdmin.ts:5-26`. You only build the client once (`supabaseAdmin ??= ...`) and only when needed. Small thing, but it's the kind of pattern senior devs notice.

---

## The Bad

These are real problems — bugs, dead code, or patterns that will bite you. Most are small.

### Broken / non-functional

1. **`ClassSearch.tsx` form is not wired up** — `ClassSearch.tsx:35-59`. The `<form>` has no `action={...}` and no `onSubmit`. `handleSearch` is defined on line 21 but never called. Compare with `CreateClass.tsx:12` where you correctly used `action={createChatroom}` — same pattern is missing here. **The search form does nothing when submitted.**

2. **`searchChatrooms` returns `undefined`** — `dashboard/actions.tsx:55-132`. The function fetches all chatrooms but the entire filter + return block is inside a `/* IMPLEMENT LATER */` comment. Even if you fixed the form (#1), there's nothing to display.

3. **`SearchedChatroomCard` is a stub with a hardcoded UUID** — `ClassSearch.tsx:63` passes `chatroomId="aa0b0d53-..."`. Until search is wired up end-to-end, this card is just placeholder furniture.

4. **Join button does nothing** — `SearchedChatroomCard.tsx:46-52`. No `onClick`, no form, no server action. The `disabled={isJoined}` is the only behavior on it.

5. **"WORK ON THIS" placeholder shipped to prod** — `profile/page.tsx:145`. That string is rendered to users.

### Error handling

6. **Send-message failure is swallowed** — `ChatMessages.tsx:94-96`: `.catch(() => { console.log("error with sendMessage"); })`. The optimistic message stays on screen even though it never persisted. The user thinks it sent. At minimum you want to mark the message as "failed" or remove it.

7. **Errors surfaced via URL query param** — `dashboard/actions.tsx:20, 32, 36` redirect with `?error=...`. This works but: (a) error text ends up in the user's browser history, (b) someone could craft a link with a fake error and trick a user, (c) it's a mild XSS risk if `<ErrorMsg>` ever switches from rendering text to rendering HTML. Better long-term: pass errors back via `useActionState` (React 19 hook) or store transient errors in a server-side flash mechanism.

8. **`profile/update-profile/page.tsx:9-11` early-returns on no profile** — but `upsertCurrentUser()` already redirects to `/signin` if there's no Clerk user, so this branch is unreachable. Either delete the dead check or replace it with an actual fallback UI.

9. **Unused `error` import** — `dashboard/actions.tsx:7`: `import { error } from "console"`. Never used. ESLint should flag this; worth running `npm run lint` and clearing warnings.

### Type-safety / null handling

10. **`ChatMessages.tsx:45` assumes `profile` is non-null** — `profiles: profile` will set the field to whatever `.maybeSingle()` returned, which can be `null`. Later (`:104-106`) you handle that, so it doesn't crash today, but the type assertion `as Message` on `:31` is also unsafe — Supabase's payload type is `Record<string, any>`, not `Message`.

11. **`Number("")` is `0`, not `NaN`** — `profile/update-profile/actions.ts:15, 24`. So an empty year input silently becomes `0`. If you want "not set", you need to detect empty string *before* calling `Number()`. Same shape as your `String(...).trim() || null` pattern — apply it here too.

12. **No length / format validation** — every server action just calls `.trim()` on free-text inputs. Nothing stops a 10MB `bio` or a `username` of 5,000 emojis. For a learning project this is fine; for production you'd want `zod` or similar at the server-action boundary.

### Real-time / subscription

13. **`ChatMessages.tsx:37-41` queries `profiles` with the anon client** — this only works if you have a Supabase RLS policy that allows anonymous reads on `profiles.avatar_url`. If you don't, the query silently returns no rows and avatars never appear. Worth checking your RLS in the Supabase dashboard. (Side note: every read against the anon client is implicitly trusting whatever policies are on that table — make sure you actually have policies, not "RLS disabled".)

14. **Hardcoded school "SFU"** — `chatrooms/[chatroomId]/page.tsx:93`. The course's school is fetched into `course.school` (`:42`) but never rendered; instead the JSX hardcodes the string. Cosmetic but it'll bite the moment you add a second school.

### Setup / docs

15. **No `.env.example`** — a new contributor (or future-you on a new machine) has no list of required env vars. The README also doesn't mention them.

16. **README is the Next.js default** — no description of the app, schema, or how to set up Supabase + Clerk locally.

---

## In-progress / unfinished

These aren't bugs so much as known-incomplete features:

- Class search end-to-end (`ClassSearch.tsx` form + `searchChatrooms` action + `SearchedChatroomCard` join button).
- Profile "Classes Taking" count (`profile/page.tsx:145` placeholder).
- Year input is `type="text"` instead of `type="number"` — `profile/update-profile/page.tsx:44`.
- Message pagination — `chatrooms/[chatroomId]/page.tsx:72` hardcodes `.limit(50)`. Fine for now; real apps would add cursor-based scroll-back.

---

## Suggested order if you want to fix things

You don't have to do these in this order, but it's roughly easiest → hardest and prioritizes user-visible bugs:

1. Delete the unused `error` import (`dashboard/actions.tsx:7`) and the dead `if (!profile)` check (`profile/update-profile/page.tsx:9-11`).
2. Wire `ClassSearch` form (`action={searchChatrooms}` or an `onSubmit` that calls it via `useTransition`).
3. Uncomment + finish `searchChatrooms` so it returns filtered results.
4. Make `SearchedChatroomCard` accept real data (drop the hardcoded UUID) and add a `joinChatroom` server action behind the Join button.
5. Show send-message errors in the chat UI instead of `console.log`.
6. Fix the year field: input `type="number"`, and let empty year stay null.
7. Render `course.school` instead of hardcoded "SFU" in the chatroom header.
8. Fill in the "Classes Taking" sidebar.
9. Add `.env.example` and a real README.
10. (Stretch) replace URL-param errors with `useActionState`.

---

## Verification

To verify any individual finding, just open the file at the cited line — every claim above is a single-file check. To verify the search-flow bugs (#1–#4) end-to-end: `npm run dev`, sign in, go to `/dashboard`, type in the search box, submit. Nothing happens. That's #1.
