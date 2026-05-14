-- 003_schools_table.sql
--
-- Normalizes `school` from free-text strings in `profiles` and `courses`
-- into a dedicated `schools` table. Replaces text columns with foreign
-- keys so:
--   * profiles.school_id and courses.school_id compare as exact UUIDs
--     (no case/whitespace/spelling drift)
--   * one canonical row per real school
--   * schools can carry attributes (color now; logo, domain later)
--
-- DESTRUCTIVE: wipes profiles, courses, chatrooms, chatroom_members, and
-- messages. Appropriate for a learning project with no real users.
-- DO NOT run this on a database with real user data without a backfill plan.
--
-- Schools are admin-managed: only the service-role key can write to the
-- `schools` table. Authenticated users can read.

BEGIN;

-- 1) Wipe data so the column drops below have nothing to break on.
TRUNCATE TABLE
    public.messages,
    public.chatroom_members,
    public.chatrooms,
    public.courses,
    public.profiles
CASCADE;

-- 2) Create the schools table.
CREATE TABLE public.schools (
    id          uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name        text NOT NULL UNIQUE,
    color       text NOT NULL DEFAULT '#2b2b2b',
    created_at  timestamp with time zone DEFAULT now() NOT NULL
);

-- 3) RLS: authenticated users can SELECT; nobody can INSERT/UPDATE/DELETE.
--    Admin writes go through the service-role key which bypasses RLS.
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read schools"
    ON public.schools FOR SELECT TO authenticated
    USING (true);

-- 4) profiles: replace the free-text `school` column with a nullable FK.
--    NULL means "user hasn't set their school yet" (consistent with the
--    placeholder cleanup in migration 002).
ALTER TABLE public.profiles
    DROP COLUMN school;

ALTER TABLE public.profiles
    ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_school_id ON public.profiles(school_id);

-- 5) courses: replace `school` with a required FK. CASCADE drops the old
--    (school, class_id) unique constraint along with the column.
ALTER TABLE public.courses
    DROP COLUMN school CASCADE;

ALTER TABLE public.courses
    ADD COLUMN school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.courses
    ADD CONSTRAINT courses_school_id_class_id_key UNIQUE (school_id, class_id);

CREATE INDEX idx_courses_school_class ON public.courses(school_id, class_id);

COMMIT;
