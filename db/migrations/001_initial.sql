-- ============================================================================
-- Migration: 001_initial
-- Purpose:   Baseline schema for StudyHub.
--            Captures everything in the `public` schema: helper function,
--            5 tables, primary/unique constraints, foreign keys, indexes,
--            row-level security policies.
-- Notes:
--   - This is meant to be applied once to a fresh Supabase project.
--   - Supabase's internal schemas (auth, storage, realtime, extensions)
--     are auto-provisioned and not included here.
--   - Authentication is provided by Clerk via JWT. RLS policies read the
--     Clerk user id from the JWT's `sub` claim via current_user_id().
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Helper function: returns the Clerk user id from the current request's JWT.
-- Used by RLS policies below.
-- ----------------------------------------------------------------------------

CREATE FUNCTION public.current_user_id() RETURNS text
    LANGUAGE sql STABLE
    AS $$
        SELECT auth.jwt() ->> 'sub'
    $$;


-- ----------------------------------------------------------------------------
-- Tables (defined in dependency order: referenced tables first)
-- ----------------------------------------------------------------------------

-- profiles: one row per Clerk user. id is the Clerk user id (e.g. user_2abc...).
CREATE TABLE public.profiles (
    id text NOT NULL PRIMARY KEY,
    username text NOT NULL,
    email text NOT NULL,
    major text,
    color text DEFAULT '#2b2b2b'::text,
    school text,
    bio text DEFAULT 'No bio has been set.'::text,
    year smallint,
    avatar_url text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- courses: unique on (school, class_id) so the same class code can exist at
-- different schools but not collide within one school.
CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    class_id text NOT NULL,
    class_name text NOT NULL,
    professor text DEFAULT 'Unknown'::text,
    school text NOT NULL,
    final_exam_date date,
    created_by text REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (school, class_id)
);

-- chatrooms: one per course. course_id is unique so each course has at most
-- one room.
CREATE TABLE public.chatrooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    course_id uuid NOT NULL UNIQUE REFERENCES public.courses(id) ON DELETE CASCADE,
    ongoing boolean DEFAULT true NOT NULL,
    created_by text REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- chatroom_members: join table. Composite PK on (chatroom_id, user_id)
-- prevents duplicate memberships.
CREATE TABLE public.chatroom_members (
    chatroom_id uuid NOT NULL REFERENCES public.chatrooms(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (chatroom_id, user_id)
);

-- messages: chat messages. Foreign keys cascade so deleting a chatroom or
-- profile removes their messages.
CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    chatroom_id uuid NOT NULL REFERENCES public.chatrooms(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- ----------------------------------------------------------------------------
-- Indexes (B-tree; added in F4 for query performance)
-- ----------------------------------------------------------------------------

CREATE INDEX idx_chatroom_members_chatroom_id ON public.chatroom_members (chatroom_id);
CREATE INDEX idx_chatroom_members_user_id ON public.chatroom_members (user_id);
CREATE INDEX idx_courses_school_class ON public.courses (school, class_id);
CREATE INDEX idx_messages_chatroom_created ON public.messages (chatroom_id, created_at DESC);


-- ----------------------------------------------------------------------------
-- Enable Row Level Security on every public table.
-- After ENABLE, the table denies all anon/authenticated access by default.
-- Policies below opt specific rules back in.
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- RLS policies
-- ----------------------------------------------------------------------------

-- profiles -------------------------------------------------------------------

CREATE POLICY "Authenticated users can read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = public.current_user_id());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = public.current_user_id())
WITH CHECK (id = public.current_user_id());

-- courses --------------------------------------------------------------------

CREATE POLICY "Authenticated users can view courses"
ON public.courses FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create courses"
ON public.courses FOR INSERT TO authenticated
WITH CHECK (created_by = public.current_user_id());

CREATE POLICY "Course creators can update courses"
ON public.courses FOR UPDATE TO authenticated
USING (created_by = public.current_user_id());

-- chatrooms ------------------------------------------------------------------

CREATE POLICY "Authenticated users can view chatrooms"
ON public.chatrooms FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create chatrooms"
ON public.chatrooms FOR INSERT TO authenticated
WITH CHECK (created_by = public.current_user_id());

CREATE POLICY "Chatroom creators can update chatrooms"
ON public.chatrooms FOR UPDATE TO authenticated
USING (created_by = public.current_user_id())
WITH CHECK (created_by = public.current_user_id());

-- chatroom_members -----------------------------------------------------------

CREATE POLICY "Users can view own memberships"
ON public.chatroom_members FOR SELECT TO authenticated
USING (user_id = public.current_user_id());

CREATE POLICY "Users can join as themselves"
ON public.chatroom_members FOR INSERT TO authenticated
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can leave rooms"
ON public.chatroom_members FOR DELETE TO authenticated
USING (user_id = public.current_user_id());

-- messages -------------------------------------------------------------------

CREATE POLICY "Members can read chatroom messages"
ON public.messages FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chatroom_members
        WHERE chatroom_members.chatroom_id = messages.chatroom_id
          AND chatroom_members.user_id = public.current_user_id()
    )
);

CREATE POLICY "Members can send chatroom messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
    user_id = public.current_user_id()
    AND EXISTS (
        SELECT 1 FROM public.chatroom_members
        WHERE chatroom_members.chatroom_id = messages.chatroom_id
          AND chatroom_members.user_id = public.current_user_id()
    )
);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE TO authenticated
USING (user_id = public.current_user_id())
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE TO authenticated
USING (user_id = public.current_user_id());


COMMIT;