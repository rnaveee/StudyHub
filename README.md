# StudyHub

A class-specific, school-gated group chat for students. One chatroom per class per school — no duplicates, no people from other schools.

## The problem

Group chats for classes are a mess right now. People mostly use one of two things, and both of them fall apart.

**Instagram / Facebook.** You exchange profiles with someone in the class, they add you to a group, and you're set — until the class is big. Imagine you're the new person who doesn't know anyone yet. You'd have to wait for the next in-person class, walk up to someone, and ask *"hey, is there a group chat for this class on Instagram or something?"*. And in big classes, you usually end up with three or four group chats instead of one, because not everyone knows each other.

**Discord.** Better in one way — share a link and anyone can join. But Discord is also where people game, where they DM friends, where they're in fifteen other servers. Class stuff gets buried in everything else.

## The solution

StudyHub gives every class exactly one chatroom, locked to a school. You search for your class. If it exists, you join — but *only* if your declared school matches. If it doesn't exist, you make it, and you're the owner. That way the whole class stays unified and everyone has help from everyone.

Share the chatroom with classmates by link or QR code. Much easier than friending someone on Instagram, waiting for them to accept, then adding them to a group.

## Status

Actively building. The foundation is done — Clerk auth, Supabase Postgres with Row Level Security, real-time chat, profiles, and search. Feature work is in progress.

See [`ROADMAP.md`](./ROADMAP.md) for the full plan.

### What works today

- ✅ Sign up / sign in with Clerk
- ✅ Profile (school, major, year, bio, avatar)
- ✅ Create a chatroom (one per class per school)
- ✅ Search chatrooms by class or school
- ✅ Join an existing chatroom
- ✅ Real-time messaging

### What's planned

- 🛠️ School-gated joining (you can only join if your school matches)
- 🛠️ Owners and moderators, plus a report system if an owner goes inactive
- 🛠️ Reactions, emojis, pinned messages, @mentions
- 🛠️ Image and file sharing
- 🛠️ Invite links + QR codes for easy sharing

## Stack

- **Next.js 16 + React 19** — App Router, server actions, server components.
- **TypeScript + Tailwind CSS v4** — Types catch the dumb bugs before they ship; Tailwind keeps the styling in the markup.
- **Supabase (Postgres + Realtime)** — Database, RLS policies, and the real-time message subscription all in one place.
- **Clerk** — Auth as a service. I didn't want to spend a week building password resets and OAuth flows when the actual project is about chat.

## Running it locally

You'll need Node 20+, a [Supabase](https://supabase.com) project, and a [Clerk](https://clerk.com) application.

```bash
git clone https://github.com/<your-username>/studyhub
cd studyhub
npm install
```

Create a `.env.local` in the project root with:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Apply the schema in `db/migrations/001_initial.sql` to your Supabase project via the SQL editor. Then:

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint

## Made by

Ryan Nave. Portfolio project — built to learn software engineering properly, not just to ship.