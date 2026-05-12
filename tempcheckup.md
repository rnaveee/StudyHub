# StudyHub App Review — 2026-05-12

Full app review checklist. Items grouped by priority. File:line references included where applicable.

## Real bugs (affect actual users today)

- [ ] **Two-tab realtime drops messages** — `ChatMessages.tsx:34` dedups by `user_id` instead of message id. If the same user has two tabs open, tab #2 silently drops every message tab #1 sends. Fix: dedup by id, not user_id.
- [ ] **N+1 query on every incoming message** — `ChatMessages.tsx:38-42` fetches `profiles.avatar_url` per incoming real-time message. Fix: cache avatars client-side in a `Map<userId, avatarUrl>`, or denormalize avatar_url onto messages.
- [ ] **Optimistic message keeps fake UUID forever** — `ChatMessages.tsx:83` uses `crypto.randomUUID()` for temp id; never gets replaced with the server's real id after insert succeeds. Breaks any future feature that references messages by id (reactions, replies, delete).
- [ ] **`upsertCurrentUser` can crash for SSO-only users with no email** — `uploadHelpers.ts:108` falls back to `null`, but schema is `email text NOT NULL`. Fix: nullable column, or block signup without email.
- [ ] **`upsertCurrentUser` can crash when both username and fullName are null** — `uploadHelpers.ts:107`. Same pattern as above.
- [ ] **PostgREST injection risk in `searchChatrooms`** — `dashboard/actions.tsx:158` interpolates user input into `.or("class_id.ilike.%${query}%,...")`. Commas/periods in input could malform the filter. Fix: escape PostgREST special chars, or use `.or()` builder syntax.

## Architecture issues (pain at scale)

- [ ] **`searchChatrooms` calls `upsertCurrentUser()` per query** — `dashboard/actions.tsx:134`. Heavy (Clerk API + Supabase select) for a hot path. Swap for `auth().userId` — same value, no DB roundtrip.
- [ ] **Messages hard-capped at 50, no pagination** — `chatrooms/[chatroomId]/page.tsx:72`. No "load older" affordance. Older messages become unreachable.
- [ ] **Hero is a client component for one boolean** — `Hero.tsx`. Hydrates fully to toggle one href. Should be a server component using `currentUser()`. Same for `Header.tsx`.
- [ ] **Realtime payload typed by assertion, not validation** — `ChatMessages.tsx:32`: `payload.new as Message`. Fix: Zod-validate the payload at the boundary.

## UX gaps (annoying but not broken)

- [ ] **Chatroom UUID leaks to user** — `SearchedChatroomCard.tsx:43` renders `chatroomId` to the user. Looks like leftover debug output.
- [ ] **Fake default props on SearchedChatroomCard** — `SearchedChatroomCard.tsx:15-21`: `classId = "MATH251"`, `className = "Linear Algebra"`, etc. If a real call ever passes undefined, user sees fake sample data instead of an error.
- [ ] **No "leave chatroom" UI** — DELETE policy on `chatroom_members` exists but is unreachable from the frontend.
- [ ] **No "edit message" UI** — UPDATE policy on `messages` exists but is unreachable.
- [ ] **No way to delete a chatroom** — no UI, no DELETE policy on `chatrooms`. Once created, forever.
- [ ] **`update-profile` doesn't show email** — should display read-only.
- [ ] **No "exam date is future" validation** in CreateClass. Can create a chatroom for a class that ended last year.
- [ ] **`year: 0` placeholder shown to user as "0"** — `profile/page.tsx:50`. Confusing; should be null + "Not set" UI fallback.
- [ ] **No way to recover from "couldn't send message" long-term** — error state shows briefly but isn't persisted.

## Code quality / consistency

- [ ] **Three names for the same thing** — `upsertCourse` parameter is `classID` (caps), Zod schema is `classId` (camel), DB column is `class_id` (snake). Pick one.
- [ ] **Inconsistent type casing** — `Course` type uses `classID`, `finalsDate` (camelCase); `Message` uses `created_at` (snake_case). No consistent DB↔frontend translation pattern.
- [ ] **`Message.profiles` union type is ugly** — `{...}[] | {...} | null` (Postgres-quirk leaking into frontend types). Normalize at the data boundary.
- [ ] **Hardcoded placeholder strings** — `uploadHelpers.ts:110-111`: `school: 'Not set yet.'`, `major: 'Not set yet.'`. Better as null with UI handling the display.
- [ ] **Hero and Header render `null` during hydration** — slight FOUC. Server components would avoid this.

## Missing infrastructure

- [ ] **Zero tests** — nothing catches logic bugs. Even one test flips the perception.
- [ ] **No CI** — no protection against pushing a broken build.
- [ ] **No README beyond Next.js boilerplate** — CLAUDE.md is for AI, not humans.
- [ ] **No deployment story** — where does this run?
- [ ] **No error tracking (Sentry, etc.)** — production errors are invisible.
- [ ] **No analytics** — no visibility into usage.

## Suggested order

### Tier 1 — fix real bugs (~1 hour)

- [ ] Fix duplicate-tab realtime bug (dedup by id)
- [ ] Cache avatars client-side (kill the N+1)
- [ ] Allow nullable username/email OR refuse signup without them
- [ ] Escape PostgREST special chars in `searchChatrooms`
- [ ] Drop the chatroom UUID from SearchedChatroomCard
- [ ] Remove the misleading default props from SearchedChatroomCard

### Tier 2 — quick polish (~30 min)

- [ ] Replace `0` year and `Not set yet.` placeholders with null + UI fallback
- [ ] Server-render Hero and Header (drop `"use client"`)
- [ ] Validate final exam date is in the future

### Tier 3 — features (when ready)

- [ ] Pagination on messages (infinite scroll or "load older")
- [ ] Leave chatroom UI (policy already exists)
- [ ] Message reactions
- [ ] Edit/delete own messages (policies exist)

### Tier 4 — infrastructure (eventually)

- [ ] One real test
- [ ] A README written in your own words
- [ ] GitHub Actions CI running `npm run lint && npm run build` on every PR