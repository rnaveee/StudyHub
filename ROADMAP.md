# StudyHub Roadmap

A learning-oriented checklist for features and backend improvements. Items are organized by tier — finish a tier before moving to the next.

---

## Foundations — do these before piling on features

These aren't user-visible but they enable everything else. Skipping them means rewriting a lot of code in 3 months.

### F1. Row Level Security (RLS) policies

**Why now.** Right now, every server action uses the service-role key, which bypasses Postgres's permission system entirely. That's fine when you only have one developer and a small surface — but the moment you add features like friends, DMs, or message deletion, "user A can only mutate user A's data" needs to be enforced *in the database*, not just trusted in app code. One forgotten check leaks data.

**Concept.** RLS policies are SQL-defined predicates that Postgres applies to every query. Example: `messages` policy "users can SELECT only messages from chatrooms they're a member of" lets you safely use the anon client without writing manual auth checks in every server action.

**How to implement.**
1. In Supabase Studio → Authentication → Policies, enable RLS on each table.
2. Write policies for each operation (SELECT, INSERT, UPDATE, DELETE) using `auth.uid()` to identify the requesting user.
3. Replace `getSupabaseAdmin()` with the anon client for queries that should respect user scope.
4. Keep service-role only for admin-only operations (e.g., onboarding new users).

**Difficulty:** Medium. The first table is hardest; the rest follow patterns.

### F2. Push search filtering into the database

**Why now.** Right now `searchChatrooms` fetches the entire chatrooms table and filters in JavaScript. Once you add fuzzy search and the table grows past a few hundred rows, this is the first thing that gets slow.

**How.** Replace the fetch-all + JS-filter pattern with `.ilike('courses.class_name', '%query%')` (or `pg_trgm` similarity once you add fuzzy — see B1 below).

**Concept:** WHERE-clause filtering uses indexes; in-memory filtering doesn't.

**Difficulty:** Small. ~20 lines.

### F3. Input validation with Zod

**Why now.** Server actions currently use `String(formData.get("foo") ?? "").trim()` everywhere. That's fine for one-off fields but doesn't scale — no length limits, no shape enforcement, no good error messages.

**How.**
1. `npm install zod`.
2. Define a schema per server action: `const CreateChatroomSchema = z.object({ classId: z.string().min(1).max(20), ... })`.
3. Parse FormData via `Object.fromEntries(formData)` then `schema.safeParse(...)`.
4. Map validation errors to the existing `{ error }` state.

**Concept:** schemas are *contracts* you write once and reuse — for runtime validation *and* TypeScript types (via `z.infer<typeof Schema>`).

**Difficulty:** Small once you've done one action; tedious to retrofit all of them.

### F4. Database indexes

**Why now.** A handful of `.eq("user_id", ...)` and `.eq("chatroom_id", ...)` queries run on every page. Without indexes, each one is a full table scan.

**How.** In Supabase Studio → SQL editor:
```sql
CREATE INDEX idx_chatroom_members_user_id ON chatroom_members(user_id);
CREATE INDEX idx_chatroom_members_chatroom_id ON chatroom_members(chatroom_id);
CREATE INDEX idx_messages_chatroom_created ON messages(chatroom_id, created_at DESC);
CREATE INDEX idx_courses_school_class ON courses(school, class_id);
```

**Concept.** Postgres's query planner uses indexes to skip rows it doesn't need. For sorted queries (the messages one), a multi-column index also serves the ordering.

**Difficulty:** Tiny. Five minutes.

---

## Your feature list

### 1. Delete message

**Data model decision: soft vs hard delete.**
- **Hard delete:** remove the row. Simple, but breaks reply context, audit trails, and "X deleted a message" UX.
- **Soft delete:** add `deleted_at TIMESTAMPTZ NULL` column. Show "[deleted]" placeholder in UI. Preserves message thread integrity.

**Recommendation: soft delete.** Industry standard.

**Implementation outline:**
1. Migration: `ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ NULL;`
2. New server action `deleteMessage(formData)`: validate user is the message author *server-side* (don't trust the client), set `deleted_at = NOW()`, never delete the row.
3. UI: hover state on own messages → trash icon → confirm → submit form to action.
4. Render: if `deleted_at !== null`, render greyed-out "[message deleted]" instead of the body.
5. Realtime: extend the subscription in `ChatMessages.tsx` to listen for `UPDATE` events too (currently only `INSERT`), and update the matching message in state.

**Concepts to learn:**
- Authorization vs authentication (auth.uid() === message.user_id)
- Soft delete pattern
- Realtime UPDATE events (different from INSERT)

**Difficulty:** Small.

### 2. Image posting in group chat

**Architecture: Postgres holds metadata, Supabase Storage holds bytes.** Don't put image binaries in your database.

**Data model.**
- Option A: add `image_url TEXT NULL` column to `messages`.
- Option B: separate `attachments(id, message_id, kind, url, mime_type, size_bytes)` table for many files per message.

**Recommendation: B.** Future-proofs for files (#3) and multiple attachments per message.

**Implementation outline:**
1. Create a Supabase Storage bucket `chat-attachments` (private). Set policies: signed URLs only.
2. Migration for `attachments` table.
3. Client: `<input type="file" accept="image/*">` in chat. On change → upload to Storage via `supabase.storage.from('chat-attachments').upload(path, file)` → get the path back.
4. Server action: insert `messages` row + `attachments` row in a transaction. Use a Postgres function (`rpc`) for atomicity if needed.
5. Render: when fetching messages, also fetch attachments. For images, render via Next.js `<Image>` with a signed URL (`createSignedUrl`).

**Concepts to learn:**
- Object storage vs database storage
- Signed URLs (time-limited tokens that grant access)
- MIME type validation server-side (don't trust the client's `Content-Type`)
- Optimistic UI for uploads (show preview while uploading)
- Image optimization via `next/image`

**Difficulty:** Medium. The Storage learning curve is the bulk of it.

### 3. File posting in group chat

**Reuses the `attachments` table from #2.** Different rendering: show filename, size, MIME type, click to download.

**Implementation outline:**
1. Same upload flow as images, but no preview rendering.
2. UI: `📄 lecture-notes.pdf (1.2 MB)` with download button.
3. Type allowlist on the server: define a set of allowed MIME types and reject anything else. Block executables (`.exe`, `.sh`, `.app`, etc).
4. Use `Content-Disposition: attachment` headers on the signed URL so the browser downloads instead of trying to render.

**Concepts to learn:**
- File type whitelisting (always allowlist, never blocklist — attackers find new extensions faster than you can add them)
- The difference between *Content-Type* (what the file claims to be) and what it actually is — never trust user-supplied MIME
- `Content-Disposition` headers for download UX

**Difficulty:** Small if #2 is done.

### 4. Friends and private messaging

This is two features: **friendships** (a graph) and **DMs** (a different kind of chat).

#### Friendships data model

```sql
CREATE TABLE friendships (
  requester_id UUID REFERENCES profiles(id),
  receiver_id  UUID REFERENCES profiles(id),
  status       TEXT NOT NULL CHECK (status IN ('pending','accepted','blocked')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (requester_id, receiver_id)
);
```

**State machine:** `pending` → `accepted` (or `blocked`). Once accepted, the relationship is symmetric (querying needs to handle both directions).

**Concept:** symmetric vs directed relationships. A common alternative is to canonicalize ordering: store `(LEAST(a, b), GREATEST(a, b))` so each pair has exactly one row. Pick one approach and document it.

#### DMs data model

Two options:
- **Reuse chatrooms:** add a `kind TEXT CHECK (kind IN ('class','dm'))` column. DMs have `course_id = NULL`. Simple, but starts overloading the chatrooms table.
- **Separate `direct_message_threads` table:** purer schema, more code to write.

**Recommendation: reuse chatrooms with `kind`.** Migration cost is small; you reuse `messages`, `chatroom_members`, the realtime listener, the UI.

**Implementation outline:**
1. `ALTER TABLE chatrooms ADD COLUMN kind TEXT NOT NULL DEFAULT 'class';`
2. Friend request UI: search users, send request, accept/reject buttons. Friendships server actions for each.
3. "Start DM" button on a friend's profile → server action that finds-or-creates a chatroom of `kind='dm'` with both members → redirect to it.
4. Filter out DMs from the dashboard's "joined chatrooms" list (it should show classes; DMs go in a separate inbox).
5. New `/messages` route showing DM threads.

**Concepts to learn:**
- Graph data modeling
- Request-state machines (pending/accepted/blocked)
- "Find or create" idempotency (don't create duplicate DM threads when both users tap "Start DM")
- Reusing existing schema vs creating new tables

**Difficulty:** Large. This is the biggest item on your list.

### 5. Group chat invite links

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

`code` is a short random string (8-12 chars from `nanoid`). Nullable expiry/max_uses so the inviter can choose "expires in 24h" or "permanent."

**Implementation outline:**
1. Migration for the table.
2. `npm install nanoid`.
3. Server action `createInvite(chatroomId, options)` — generates code, inserts row, returns shareable URL `${origin}/invite/${code}`.
4. New route `/invite/[code]/page.tsx`:
   - Look up code. If missing/expired/used-up → render error.
   - If user not signed in → store the code in a cookie and redirect to `/signin?next=/invite/${code}`.
   - If signed in → call `joinChatroom` (existing action), increment `uses`, redirect to `/chatrooms/${chatroom_id}`.
5. UI in chatroom: "Generate invite link" button → modal with the URL + expiry/usage controls.

**Concepts to learn:**
- URL-as-token security (the code IS the credential)
- `nanoid` for collision-resistant short IDs
- Atomic increment-and-check for `uses < max_uses`
- The "redirect after sign-in" pattern (preserving the original destination)

**Difficulty:** Medium.

### 6. Calling (future)

**Architecture, briefly so you know what you're up against later:**
- WebRTC for peer-to-peer audio/video.
- A "signaling layer" so peers can find each other and exchange SDP offers — Supabase Realtime channels are perfectly suited for this (use them for ephemeral signaling, not persisted state).
- A TURN server for NAT traversal — there are free-tier hosted ones (e.g., Twilio, OpenRelay).
- Presence to show "who's online."

**Skip this for now.** It's an order of magnitude harder than the other features. Get everything else solid first.

---

## My recommended additions

Ranked by "fits a study app + teaches something + small enough to ship."

### R1. Message reactions

**Why:** Tiny feature, high engagement, teaches a clean many-to-many relationship.

**Data model:**
```sql
CREATE TABLE message_reactions (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id),
  emoji      TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);
```

**Concepts:** join tables, primary keys with three columns, Realtime UPDATE events again.

**Difficulty:** Small.

### R2. @Mentions

**Why:** Critical for group conversations to feel useful. "Hey @ryan, did you finish the proof?" Generates a notification.

**How:**
1. Parse message body for `@username` patterns server-side. Look up the matching profile IDs.
2. `mentions(message_id, mentioned_user_id)` table.
3. UI: render mentions as chips in messages.
4. Notification surface: badge on Header, list at `/notifications`.

**Concepts:** parsing user-generated text, denormalized notification state, "notification fan-out" patterns.

**Difficulty:** Medium.

### R3. Message search

**Why:** Once chatrooms have hundreds of messages, "what did the prof say about midterms?" is unfindable.

**How:** Postgres full-text search.
```sql
ALTER TABLE messages ADD COLUMN body_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', body)) STORED;
CREATE INDEX idx_messages_body_tsv ON messages USING GIN (body_tsv);
```
Query with `.textSearch('body_tsv', 'midterm')`.

**Concepts:** `tsvector` and `tsquery`, GIN indexes, generated columns.

**Difficulty:** Small once you understand the syntax.

### R4. Pinned messages

**Why:** Class chatrooms accumulate important info (TA office hours, lecture schedule). Pinning surfaces it.

**How:** `pinned_at TIMESTAMPTZ NULL` column on `messages`. Authorization: only chatroom creator can pin.

**Difficulty:** Tiny.

### R5. File library per chatroom

**Why:** If people are sharing PDFs of lecture notes (#3), you want a "Files" tab to find them all without scrolling.

**How:** Already have the data via `attachments` (R2 prerequisite). Just a new tab in the chatroom UI that queries `attachments` filtered by chatroom.

**Difficulty:** Small after #3.

### R6. Read receipts ("seen by")

**Why:** Lets users know if their question got seen. Common chat-app feature.

**How:** Simplest version — `last_read_message_id` column on `chatroom_members`. On chatroom view, update to the latest message ID. Render "seen by N" by counting members with `last_read_message_id >= this.id`.

**Difficulty:** Small but has surprising complexity around edge cases (what counts as "read" — viewport visibility? mere page load?).

### R7. Typing indicators

**Why:** Realtime polish; teaches presence.

**How:** Supabase Realtime presence (broadcast channel, not Postgres). User sends "I'm typing" → other clients listen. Auto-expire after 3s.

**Difficulty:** Small. Mostly Realtime API learning.

### R8. Profile customization (banner image, status)

**Why:** Gives the social-feature reach you want.

**How:** Storage bucket for banner uploads. New columns on `profiles` for `banner_url`, `status`. Same pattern as image posting (#2).

**Difficulty:** Small after #2.

### R9. Course wiki / pinned info doc

**Why:** Differentiates from generic chat apps. Each class has a markdown doc anyone in the chatroom can edit (TA office hours, exam schedule, links to resources). Pinned to the top of the chatroom.

**How:** New `course_wiki(course_id, body, updated_at, updated_by)` table. Markdown rendering with `react-markdown` (sanitized!). Edit history table optional.

**Concepts:** XSS protection in user-generated markdown, last-write-wins vs operational transform.

**Difficulty:** Medium.

### R10. Dark mode

**Why:** Cheap win. Students study at night.

**How:** Tailwind's `dark:` variant + a class on `<html>` toggled by a button. Persist to localStorage. Server-side: read the cookie to avoid flash of wrong theme.

**Difficulty:** Tiny if you do it early; tedious to retrofit if you wait.

---

## Backend changes

### B1. Fuzzy search for class names

**Why:** "claud" should find "claude". Exact match is a poor UX.

**How: Postgres trigram similarity.** Free, indexed, and built for short strings.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_courses_class_name_trgm
  ON courses USING GIN (class_name gin_trgm_ops);
CREATE INDEX idx_courses_class_id_trgm
  ON courses USING GIN (class_id gin_trgm_ops);
```

Then in the action, instead of `.ilike(...)` use:
```ts
.or(`class_name.ilike.%${query}%,class_id.ilike.%${query}%`)
.order('class_name', { ascending: true })
```

For real fuzzy ranking, use the `<->` similarity operator via an RPC function:
```sql
CREATE OR REPLACE FUNCTION search_courses(q TEXT)
RETURNS SETOF courses AS $$
  SELECT * FROM courses
  WHERE similarity(class_name, q) > 0.2 OR similarity(class_id, q) > 0.2
  ORDER BY GREATEST(similarity(class_name, q), similarity(class_id, q)) DESC
  LIMIT 20;
$$ LANGUAGE SQL STABLE;
```

Call from the client via `supabaseAdmin.rpc('search_courses', { q: query })`.

**Concepts to learn:**
- Postgres extensions
- Trigram similarity (3-character substring matching)
- GIN indexes for indexed string search
- RPC functions in Supabase (defining DB-side logic)

**Difficulty:** Small once you've enabled the extension.

### B2. Database migrations

**Why:** Right now your schema lives only in Supabase Studio. Lose the project, lose the schema. Worse: adding a column on prod that doesn't exist in dev = bugs nobody can reproduce.

**How:** Supabase CLI supports versioned migrations:
```
supabase migration new add_messages_deleted_at
```
Creates a SQL file you commit to git. `supabase db push` applies pending migrations.

**Difficulty:** Small once you set up the CLI.

### B3. Environment variable validation at startup

**Why:** Currently you'd discover a missing `SUPABASE_SERVICE_ROLE_KEY` only when someone tries to create a chatroom. Catch it at boot instead.

**How:** Tiny module that imports zod and parses `process.env` against a schema. Import it once in `layout.tsx`. Throws on missing/malformed.

**Difficulty:** Tiny.

### B4. Rate limiting

**Why:** Without it, one malicious user can spam thousands of messages per second. Or one bug in your retry logic loops forever.

**How:** Supabase doesn't ship rate limiting; common pattern is Upstash Redis (free tier) + middleware in `proxy.ts`.

**Difficulty:** Medium.

### B5. Sentry / structured logging

**Why:** When something breaks in production, you want the error in your inbox, not in a user's browser console where you'll never see it.

**How:** `@sentry/nextjs` is one `npx` command. Captures errors automatically.

**Difficulty:** Tiny.

---

## Suggested implementation order

Strong recommendation to follow this rough order — each tier builds on the previous.

### Tier 1 (foundations, ~1-2 weeks)
- [ ] F4. Database indexes (5 min, immediate payoff)
- [ ] B2. Migrations (set this up before any schema changes below)
- [ ] F1. RLS policies
- [ ] F3. Zod validation
- [ ] F2. Push search filtering to DB
- [ ] B3. Env var validation

### Tier 2 (high-impact small features, ~1-2 weeks)
- [ ] R1. Message reactions
- [ ] Item #1. Delete message
- [ ] R4. Pinned messages
- [ ] R10. Dark mode (do this *now*, easy when codebase is small)
- [ ] B1. Fuzzy search

### Tier 3 (medium features, ~3-4 weeks)
- [ ] Item #2. Image posting (introduces Storage)
- [ ] Item #3. File posting
- [ ] R5. File library
- [ ] Item #5. Invite links
- [ ] R3. Message search

### Tier 4 (hard features, ~3-4 weeks)
- [ ] R2. @Mentions (needs notifications too)
- [ ] Item #4. Friends + DMs
- [ ] R6. Read receipts
- [ ] R7. Typing indicators

### Tier 5 (polish + future)
- [ ] R8. Profile customization
- [ ] R9. Course wiki
- [ ] B4. Rate limiting (do before public launch)
- [ ] B5. Sentry
- [ ] Item #6. Calling (when everything else is solid)

---

## A few meta-suggestions

- **Don't add features faster than you can RLS them.** F1 isn't optional once you have DMs — you cannot ship private messaging on a service-role-key bypass.
- **Pick one tier, finish it, then move on.** Switching tiers mid-feature is how half-built code accumulates.
- **Each feature needs a manual test plan and a PR description before it merges.** Even solo, write down "what does this fix and how do I verify it." This is a habit that scales when you start working on teams.
- **The hardest features here aren't technical — they're product decisions.** "Does a class chatroom show DMs?" "What happens to messages when someone leaves?" "Can you reply to a deleted message?" None of those have right answers. Decide *before* coding.
