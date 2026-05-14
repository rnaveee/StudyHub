# StudyHub Roadmap

A learning-oriented checklist aligned with the product vision in `README.md`. Items grouped by tier — finish a tier before moving on.

**Product north star.** StudyHub is a class-specific group-chat tool, scoped to a school. The two things that make it different from Instagram DMs or Discord are: (1) you can only join a class chatroom if your declared school matches, and (2) duplicate chatrooms can't exist — one per (class, school), and the creator owns it. Everything below either supports those rules or adds the chat features students actually want.

---

## Tier 0 — Foundations (✅ complete)

These aren't user-visible but they enable everything else. All done — leaving them here as a learning record.

- [x] **F4. Database indexes** — B-tree indexes on hot filter columns (`chatroom_members.user_id`, `chatroom_members.chatroom_id`, `messages(chatroom_id, created_at DESC)`, `courses(school, class_id)`).
- [x] **F2. Push search filtering into the database** — `searchChatrooms` now uses `.or()` + `.ilike()` with `foreignTable: "courses"` and `.limit(20)`. No more fetch-all-and-filter-in-JS.
- [x] **F3. Input validation with Zod** — every server action (`createChatroom`, `joinChatroom`, `searchChatrooms`, `sendMessage`, `updateProfile`) parses `formData` through a schema before doing any work. Cheap path (parse) runs before expensive path (auth).
- [x] **F1. Row Level Security (RLS) policies** — RLS enabled on all tables. Custom Postgres function `current_user_id()` reads the Clerk JWT (`auth.jwt() ->> 'sub'`) since we use Clerk, not Supabase Auth. Policies cover SELECT/INSERT/UPDATE/DELETE per table.
- [x] **B2. Database migrations** — `db/migrations/001_initial.sql` captures the full baseline (5 tables, indexes, `current_user_id()` function, 14 RLS policies). Wrapped in `BEGIN`/`COMMIT` for atomicity.
- [x] **B3. Environment variable validation** — `src/app/lib/env.ts` (public) and `env.server.ts` (server-only, with `import "server-only"`) parse `process.env` through Zod at module load. Catches missing keys at boot, not at first user action. Uses explicit key references so Next.js can do build-time replacement on the client.

---

## Tier 1 — Quick polish (~30 min, in progress)

Small wins from the recent app review. The kind of papercuts users won't file a bug for but quietly notice.

- [ ] **Validate final exam date is in the future.** One `.refine()` on the Zod `courseSchema`. Stops chatrooms being created for classes that ended last year. *(currently up next)*
- [ ] **Replace `0` and `"Not set yet."` placeholders with `null` + UI fallback.** Right now new profiles write fake-looking data (`year: 0`, `school: 'Not set yet.'`) to the DB. Cleaner: leave the column empty and let the UI render "Not set" or an edit prompt.
- [ ] **Server-render `Hero` and `Header`.** Both have `"use client"` for one boolean (signed-in or not). Move to server components via Clerk's `currentUser()` — drops JS bundle weight and removes a brief hydration flash.

---

## Tier 2 — Core product features (the things in README "Users")

These are what makes StudyHub *StudyHub* and not just a generic chat app. None of them are optional for the product vision.

### 2A. School-gated join

**Why this is a flagship feature.** The README's whole pitch is "the whole class stays unified" — that only works if outsiders can't lurk. Right now anyone can `joinChatroom` if they know the chatroom id.

**Concept (ELI5).** A class chatroom belongs to a school. To join, your profile's `school` field has to match. Think of it like flashing your student ID at the door of a study room — the door doesn't care who you are, just that the school on the card matches.

**How.**
1. New RLS policy on `chatroom_members` for INSERT: `EXISTS (SELECT 1 FROM chatrooms c JOIN courses co ON co.id = c.course_id JOIN profiles p ON p.id = current_user_id() WHERE c.id = chatroom_id AND co.school = p.school)`.
2. Same check duplicated in the `joinChatroom` server action for a clean error message (RLS would just reject silently otherwise).
3. UI: if a search result is a different school, show "Different school" instead of a "Join" button.

**Concepts to learn:**
- Defense in depth — server action *and* RLS, not one or the other.
- The difference between *authentication* (you're signed in) and *authorization* (you're allowed to do this thing).

**Difficulty:** Small-medium.

### 2B. Change-school cascade

**Why.** README: "If they change their declared school, it kicks them out of all the chatrooms they are in that school for." Without this, school-gating has a giant hole — change school once, stay in the old chatrooms forever.

**How.**
1. In `updateProfile`, when `school` changes, run a `DELETE FROM chatroom_members WHERE user_id = $me AND chatroom_id IN (SELECT c.id FROM chatrooms c JOIN courses co ON co.id = c.course_id WHERE co.school = $old_school)`.
2. Wrap the profile update + delete in a transaction (use an `rpc` Postgres function for atomicity).
3. Confirm in UI: "Changing schools will remove you from N chatrooms. Continue?"

**Concepts to learn:**
- Transactions — either both changes happen or neither does.
- Cascading side-effects vs surprising the user. The confirm modal is product, not code.

**Difficulty:** Medium.

### 2C. Owner / Moderator roles

**Why.** README: chatroom creator owns it; owners can pick moderators with the same privileges except they can't remove the owner or each other.

**Data model.** Already have `chatrooms.created_by`. Add a `chatroom_moderators(chatroom_id, user_id, added_by, created_at)` table with `PRIMARY KEY (chatroom_id, user_id)`.

**Permissions table.** Owners and mods can: edit chatroom settings, pin messages, delete others' messages, kick members. Owners only: add/remove moderators, delete the chatroom.

**Implementation outline:**
1. Migration for `chatroom_moderators`.
2. Helper function in Postgres: `is_owner_or_mod(chatroom_id, user_id)` for reuse in RLS policies.
3. RLS policies on `messages` for moderator-delete.
4. Owner-only UI panel: "Manage chatroom" → add/remove mods, edit class metadata.

**Concepts to learn:**
- Role-based access control (RBAC) at the row level.
- Why "everyone with a role flag" is simpler than per-action permission tables — until it isn't.

**Difficulty:** Medium.

### 2D. Report-and-remove a chatroom

**Why.** README: if an owner is inactive or misbehaving and someone wants to "claim" the chatroom for that class, they can report it and have it removed.

**Data model.**
```sql
CREATE TABLE chatroom_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatroom_id  UUID NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
  reporter_id  UUID NOT NULL REFERENCES profiles(id),
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('pending','resolved','dismissed')) DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation outline:**
1. Migration.
2. Server action `reportChatroom(chatroomId, reason)`. Rate-limit: max one open report per user per chatroom.
3. Admin surface — for now, a `/admin` page gated to a hardcoded admin email; reviews open reports and can soft-delete a chatroom (add `deleted_at` column to `chatrooms`).
4. Notify the original owner before removal (cooldown period — "responds within 7 days or chatroom is reassigned").

**Concepts to learn:**
- Soft delete vs hard delete (soft preserves history; you want it here).
- Moderation workflows are mostly product design, not code.
- "Trust + safety" features get abused — rate-limit reports.

**Difficulty:** Medium. Mostly product decisions.

### 2E. Profile: social media links + school email

**Why.** README explicitly: profiles include "social media links so other users can connect with them" and "school email."

**Data model.** Either:
- **Option A:** `social_links JSONB` column on `profiles` — flexible, no migrations for new platforms.
- **Option B:** `profile_social_links(profile_id, platform, url)` table — queryable, easier validation per platform.

**Recommendation:** A — small data, never queried independently, JSON is fine.

**Schools-email field.** Add `school_email TEXT NULL` to `profiles`. Validate with a Zod refinement that ends in a `.edu` (or domain matching the declared school — fancier).

**Implementation outline:**
1. Migration: add `social_links JSONB NOT NULL DEFAULT '{}'::jsonb`, `school_email TEXT NULL`.
2. Update `update-profile` form + Zod schema.
3. Render on profile page as icon links.

**Difficulty:** Small.

---

## Tier 3 — Chatroom feature suite (the things in README "Chatrooms")

These are the in-chatroom features the README commits to. Order is mine, sized by "smallest first."

### 3A. Message reactions

**Why first.** Smallest. Already had it queued as R1.

**Data model:**
```sql
CREATE TABLE message_reactions (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id),
  emoji      TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);
```

**Concepts:** join tables, three-column primary key, Realtime UPDATE events.

**Difficulty:** Small.

### 3B. Emojis in messages

**Why README calls it out separately.** README lists "Emojis" as its own bullet — so the user-facing affordance (an emoji picker button) is the feature, not just "you can type emojis already, it's Unicode." Use `emoji-mart` or similar; render via the user's system font.

**Difficulty:** Tiny.

### 3C. Pinned messages

**Why.** README explicit. Class chatrooms accumulate office hours, syllabus links, exam dates. Pinning surfaces them.

**How:** `pinned_at TIMESTAMPTZ NULL` on `messages`. Authorization: owner + mods only (Tier 2C prerequisite).

**Difficulty:** Tiny after 2C.

### 3D. Mentioning other users (@username)

**Why.** README explicit. Critical for big class chatrooms to feel useful.

**How:**
1. Parse message body server-side for `@username` patterns. Look up matching profile IDs.
2. `mentions(message_id, mentioned_user_id)` table.
3. UI: render mentions as chips.
4. Notification surface: badge on Header, list at `/notifications`.

**Concepts:** parsing user-generated text, denormalized notification state, notification fan-out.

**Difficulty:** Medium.

### 3E. Edit / delete own messages (soft delete)

**Already in the database** — UPDATE/DELETE RLS policies exist on `messages`. Just no UI.

**Soft delete preferred.** Add `deleted_at TIMESTAMPTZ NULL`; render "[deleted]" placeholder. Preserves reply context if you ever add replies.

**Implementation:**
1. Migration for `deleted_at`.
2. UI: hover on own message → edit/delete icons → confirm → submit.
3. Extend realtime subscription to listen for `UPDATE` events (currently only `INSERT`).

**Difficulty:** Small.

### 3F. Image sharing

**Architecture:** Postgres for metadata, Supabase Storage for bytes. Don't put image binaries in the DB.

**Data model:** new `attachments(id, message_id, kind, url, mime_type, size_bytes)` table. Many-to-one with messages (lets you do "multiple images per message" later for free).

**Implementation outline:**
1. Create private Storage bucket `chat-attachments` with signed-URL-only policies.
2. Migration for `attachments`.
3. Client: `<input type="file" accept="image/*">` → upload → get path back.
4. Server action: insert `messages` row + `attachments` row atomically.
5. Render via `next/image` with a signed URL (`createSignedUrl`).

**Concepts to learn:**
- Object storage vs DB storage.
- Signed URLs (time-limited access tokens).
- Server-side MIME validation — never trust the client's `Content-Type`.
- Optimistic UI for uploads (show preview while uploading).

**Difficulty:** Medium. The Storage learning curve is most of it.

### 3G. File sharing

**Reuses the `attachments` table from 3F.** Different rendering: filename, size, MIME, click-to-download.

**Critical rule.** Allowlist MIME types server-side. Block executables. Never blocklist — attackers find new extensions faster than you add them.

**Difficulty:** Small after 3F.

---

## Tier 4 — Sharing (README explicit)

### 4A. Chatroom invite links

**Why.** README: "Users can also share the chatroom link with people via link / QR code." This is the link half.

**Data model.**
```sql
CREATE TABLE chatroom_invites (
  code         TEXT PRIMARY KEY,
  chatroom_id  UUID REFERENCES chatrooms(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES profiles(id),
  expires_at   TIMESTAMPTZ NULL,
  max_uses     INTEGER NULL,
  uses         INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation outline:**
1. Migration. `npm install nanoid` for short codes.
2. `createInvite(chatroomId, options)` action.
3. `/invite/[code]/page.tsx`:
   - Look up code; reject expired / maxed-out.
   - Sign in if needed (preserve destination via cookie).
   - **School-gate** the join (Tier 2A applies here too).
   - Increment `uses`, redirect to chatroom.

**Concepts:** URL-as-token security, atomic increment-and-check, sign-in redirect pattern.

**Difficulty:** Medium.

### 4B. QR-code sharing

**Why.** README explicit: "share via link / QR code." Tiny addition after 4A: same invite URL, rendered as a QR.

**How.** `qrcode` npm package, render in the same modal as the invite link.

**Difficulty:** Tiny.

---

## Tier 5 — Backend / infrastructure

### 5A. Fuzzy search for class names

**Why.** "claud" should find "claude". Right now `.ilike('%foo%')` falls off a cliff once `courses` grows — B-tree indexes don't help middle-substring matches.

**How: Postgres trigram similarity** (`pg_trgm` extension + GIN indexes).
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_courses_class_name_trgm ON courses USING GIN (class_name gin_trgm_ops);
CREATE INDEX idx_courses_class_id_trgm   ON courses USING GIN (class_id   gin_trgm_ops);
```

Then either keep `.ilike()` (indexes now help) or use the `<->` similarity operator via an RPC for ranked results.

**Concepts:** Postgres extensions, trigram similarity, GIN indexes, RPC functions.

**Difficulty:** Small.

### 5B. Message search

**Why.** Once a chatroom has hundreds of messages, "what did the prof say about midterms?" is unfindable.

**How.** Postgres full-text search.
```sql
ALTER TABLE messages ADD COLUMN body_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', body)) STORED;
CREATE INDEX idx_messages_body_tsv ON messages USING GIN (body_tsv);
```
Query with `.textSearch('body_tsv', 'midterm')`.

**Difficulty:** Small once you understand the syntax.

### 5C. Rate limiting

**Why.** Without it, one malicious user can spam thousands of messages per second. Or one bug in your retry logic loops forever.

**How:** Upstash Redis (free tier) + middleware in `proxy.ts`.

**Difficulty:** Medium.

### 5D. Error tracking (Sentry)

**Why.** Production errors should land in your inbox, not a user's console.

**How:** `@sentry/nextjs` is one `npx` command.

**Difficulty:** Tiny.

### 5E. Tests + CI

- One real integration test against a real Supabase test project.
- GitHub Actions running `npm run lint && npm run build` on every PR.

**Why.** Even one test flips the perception of "is this a real project?"

**Difficulty:** Small for the first test; the habit is the hard part.

---

## Tier 6 — Stretch / polish (nice-to-have, not in README's core pitch)

These aren't promised by the README but commonly expected from chat apps. Add if the time's there.

- [ ] **Pagination on messages.** Currently hard-capped at 50, no "load older" affordance. Older messages become unreachable in active chatrooms.
- [ ] **Leave-chatroom UI.** DELETE policy on `chatroom_members` exists but is unreachable from the frontend.
- [ ] **Profile customization** — banner image, status. Storage bucket + new `profiles` columns. Same pattern as 3F.
- [ ] **Read receipts.** Simplest version: `last_read_message_id` column on `chatroom_members`. "Seen by N" by counting members past a message id.
- [ ] **Typing indicators.** Supabase Realtime presence (broadcast, not Postgres). Auto-expire after 3s.
- [ ] **Course wiki.** Markdown doc per course that anyone in the chatroom can edit (TA hours, exam schedule, links). Pinned at the top.
- [ ] **Dark mode.** Tailwind `dark:` + a toggle persisted to localStorage. Read cookie server-side to avoid theme flash.

---

## Not in current vision (out of scope unless README changes)

Keeping these here so future-you remembers they were considered and intentionally deferred.

- **Friends graph + direct messages.** README scopes StudyHub to *class* group chats, not a social network. Adding friends/DMs would change the product. Park indefinitely.
- **Voice/video calling.** Mentioned in earlier roadmap drafts as "future"; not in README. WebRTC + signaling + TURN is an order of magnitude more work than the rest. Skip unless the product expands.

---

## Meta-suggestions

- **Don't add features faster than you can RLS them.** Tier 2A (school gating) isn't optional — you cannot ship "only your school can join" on trust alone.
- **Pick one tier, finish it, then move on.** Switching tiers mid-feature is how half-built code accumulates.
- **Each feature needs a manual test plan and a PR description before it merges.** Even solo. Habit that scales when you join a team.
- **The hardest features here aren't technical — they're product decisions.** "What happens to messages when an owner is removed?" "Can a kicked moderator see history?" "Does changing schools delete your messages or just kick you?" None of these have universal right answers. Decide *before* coding.