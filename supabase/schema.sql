-- ============================================================================
-- CPK Learn — schéma Supabase
-- À exécuter dans le SQL Editor du projet Supabase (ou via `supabase db push`).
-- Ce fichier est intégralement ré-exécutable : à chaque mise à jour du schéma,
-- recopie-le en entier et relance-le, aucune erreur "already exists" ne
-- devrait apparaître (tables/colonnes en `if not exists`, policies précédées
-- d'un `drop policy if exists`).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles — one row per auth.users account (parent, student, admin, staff).
-- Created before is_admin() below, which references it.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('parent', 'student', 'admin', 'staff')),
  status text not null default 'pending' check (status in ('pending', 'validated')),
  registration_method text check (registration_method in ('manual', 'cin', 'email')),
  cin text unique,
  phone text,
  parent_first_name text,
  parent_last_name text,
  validation_seen boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Helper: is_admin() — security definer function used in RLS policies to
-- check the caller's role without triggering recursive RLS on `profiles`.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'director')
  );
$$;

-- is_school_staff(): everyone allowed into the admin area — admin, director,
-- and staff, who only manage the timetable, teacher absences and homework.
-- Used by those tables' policies; everything else stays on is_admin().
create or replace function public.is_school_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'director', 'staff')
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert their own profile on signup" on public.profiles;
create policy "Users can insert their own profile on signup"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Admins can update any profile (validation)" on public.profiles;
create policy "Admins can update any profile (validation)"
  on public.profiles for update
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- classes — e.g. "7ème Base A", "3ème Sciences", ...
-- ----------------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.classes enable row level security;

drop policy if exists "Anyone authenticated can read classes" on public.classes;
create policy "Anyone authenticated can read classes"
  on public.classes for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins manage classes" on public.classes;
create policy "Admins manage classes"
  on public.classes for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- students — a child linked to a parent profile, and optionally to their own
-- login account (created 1-click by the parent, see Phase 2).
-- ----------------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.profiles (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  first_name text not null,
  last_name text,
  class_name text not null,
  class_id uuid references public.classes (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

drop policy if exists "Parents view their own children" on public.students;
create policy "Parents view their own children"
  on public.students for select
  using (auth.uid() = parent_id or auth.uid() = user_id or public.is_admin());

drop policy if exists "Parents insert their own children" on public.students;
create policy "Parents insert their own children"
  on public.students for insert
  with check (auth.uid() = parent_id);

drop policy if exists "Admins manage students" on public.students;
create policy "Admins manage students"
  on public.students for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- teachers
-- ----------------------------------------------------------------------------
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  subject text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.teachers enable row level security;

drop policy if exists "Anyone authenticated can read teachers" on public.teachers;
create policy "Anyone authenticated can read teachers"
  on public.teachers for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins manage teachers" on public.teachers;
create policy "Admins manage teachers"
  on public.teachers for all
  using (public.is_admin())
  with check (public.is_admin());

-- A timetable import creates the teachers it doesn't know yet, and staff can
-- import timetables — so they may add teachers, but not edit or remove them.
drop policy if exists "Staff add teachers" on public.teachers;
create policy "Staff add teachers"
  on public.teachers for insert
  with check (public.is_school_staff());

-- ----------------------------------------------------------------------------
-- timetable_entries — one row per (class, day, time slot).
-- `is_cancelled` is toggled automatically when a teacher_absences row covers
-- the slot (Phase 2 logic), and read by the UI to render it strikethrough.
-- ----------------------------------------------------------------------------
create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes (id) on delete cascade,
  class_name text not null,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  subject text not null,
  teacher_id uuid references public.teachers (id) on delete set null,
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.timetable_entries enable row level security;

drop policy if exists "Anyone authenticated can read timetable" on public.timetable_entries;
create policy "Anyone authenticated can read timetable"
  on public.timetable_entries for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins manage timetable" on public.timetable_entries;
create policy "Admins manage timetable"
  on public.timetable_entries for all
  using (public.is_school_staff())
  with check (public.is_school_staff());

-- ----------------------------------------------------------------------------
-- teacher_absences — declared by an admin, drives SMS alerts + timetable
-- strikethrough for every class taught by this teacher during the period.
-- ----------------------------------------------------------------------------
create table if not exists public.teacher_absences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.teacher_absences enable row level security;

drop policy if exists "Anyone authenticated can read teacher absences" on public.teacher_absences;
create policy "Anyone authenticated can read teacher absences"
  on public.teacher_absences for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins manage teacher absences" on public.teacher_absences;
create policy "Admins manage teacher absences"
  on public.teacher_absences for all
  using (public.is_school_staff())
  with check (public.is_school_staff());

-- A teacher declares their own absence from their dashboard ("Je suis
-- absent(e)"), which the admin-only policy above refused. Restricted to the
-- teachers row linked to their account, so nobody can mark a colleague
-- absent. `teachers` is readable by any authenticated user, so this subquery
-- needs no security-definer helper.
drop policy if exists "Teachers declare their own absence" on public.teacher_absences;
create policy "Teachers declare their own absence"
  on public.teacher_absences for insert
  with check (
    exists (
      select 1
      from public.teachers t
      where t.id = teacher_id
        and t.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- staff_members — public "Le Staff" page.
-- ----------------------------------------------------------------------------
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_title text not null,
  photo_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

drop policy if exists "Anyone can read staff members" on public.staff_members;
create policy "Anyone can read staff members"
  on public.staff_members for select
  using (true);

drop policy if exists "Admins manage staff members" on public.staff_members;
create policy "Admins manage staff members"
  on public.staff_members for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- help_requests — "Aide" contact form, triaged from the admin dashboard.
-- ----------------------------------------------------------------------------
create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  subject text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.help_requests enable row level security;

drop policy if exists "Authors view their own help requests" on public.help_requests;
create policy "Authors view their own help requests"
  on public.help_requests for select
  using (auth.uid() = author_id or public.is_admin());

drop policy if exists "Authenticated users can submit a help request" on public.help_requests;
create policy "Authenticated users can submit a help request"
  on public.help_requests for insert
  with check (auth.uid() = author_id);

drop policy if exists "Admins manage help requests" on public.help_requests;
create policy "Admins manage help requests"
  on public.help_requests for update
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- releases — changelog published by the admin.
-- ----------------------------------------------------------------------------
create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published_by uuid references public.profiles (id),
  published_at timestamptz not null default now()
);

alter table public.releases enable row level security;

drop policy if exists "Anyone can read releases" on public.releases;
create policy "Anyone can read releases"
  on public.releases for select
  using (true);

drop policy if exists "Admins manage releases" on public.releases;
create policy "Admins manage releases"
  on public.releases for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- tips — community posts from validated alumni / top students.
-- ----------------------------------------------------------------------------
create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  content text not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tips enable row level security;

drop policy if exists "Anyone can read published tips" on public.tips;
create policy "Anyone can read published tips"
  on public.tips for select
  using (published = true or public.is_admin());

drop policy if exists "Validated users can submit a tip" on public.tips;
create policy "Validated users can submit a tip"
  on public.tips for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'validated'
    )
  );

drop policy if exists "Admins manage tips" on public.tips;
create policy "Admins manage tips"
  on public.tips for update
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- sms_logs — audit trail of every SMS attempt sent through the gateway.
-- ----------------------------------------------------------------------------
create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  message text not null,
  trigger text not null check (trigger in ('teacher_absence', 'generated_password', 'manual')),
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

-- 'phone_verification' added for the SMS OTP feature (registration + profile
-- phone changes) — widened rather than reused so those sends are
-- distinguishable from absence/manual alerts in the logs.
alter table public.sms_logs drop constraint if exists sms_logs_trigger_check;
alter table public.sms_logs add constraint sms_logs_trigger_check
  check (trigger in ('teacher_absence', 'generated_password', 'manual', 'phone_verification'));

-- ----------------------------------------------------------------------------
-- Phone number verification (OTP by SMS) — gated at registration and at any
-- later phone change, toggleable by admins via site_settings
-- ('sms_verification_enabled'). Default true on the column so existing rows
-- (created before this feature) aren't retroactively treated as unverified;
-- every code path that sets a *new* phone number explicitly writes the
-- correct value instead of relying on this default.
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists phone_verified boolean not null default true;

create table if not exists public.phone_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('register', 'update', 'qr_login', 'password_reset', 'admin_login')),
  attempts int not null default 0,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 'qr_login' added for the QR-code re-login flow (a scanned printed QR, on a
-- second use, asks for an SMS code before falling back to the password), then
-- 'password_reset' for the forgotten-password flow. The ALTER is what actually
-- applies on an existing database: the CREATE TABLE above is skipped there.
alter table public.phone_otps drop constraint if exists phone_otps_purpose_check;
alter table public.phone_otps add constraint phone_otps_purpose_check
  check (purpose in ('register', 'update', 'qr_login', 'password_reset', 'admin_login'));

create index if not exists phone_otps_phone_purpose_idx on public.phone_otps (phone, purpose, created_at desc);

-- No policies at all: this table is only ever touched via the service-role
-- admin client (see src/lib/phoneVerification.ts), never from a browser
-- session, so RLS enabled with zero policies denies anon/authenticated
-- access entirely.
alter table public.phone_otps enable row level security;

alter table public.sms_logs enable row level security;

drop policy if exists "Admins read sms logs" on public.sms_logs;
create policy "Admins read sms logs"
  on public.sms_logs for select
  using (public.is_admin());

drop policy if exists "Service role writes sms logs" on public.sms_logs;
create policy "Service role writes sms logs"
  on public.sms_logs for insert
  with check (true);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_students_parent_id on public.students (parent_id);
create index if not exists idx_students_class_name on public.students (class_name);
create index if not exists idx_timetable_class_name on public.timetable_entries (class_name);
create index if not exists idx_timetable_teacher_id on public.timetable_entries (teacher_id);
create index if not exists idx_teacher_absences_teacher_id on public.teacher_absences (teacher_id);
create index if not exists idx_help_requests_status on public.help_requests (status);
create index if not exists idx_profiles_status on public.profiles (status);
create index if not exists idx_students_class_id on public.students (class_id);

-- ============================================================================
-- Phase 4, bloc 1 — panel admin complet, login par téléphone, profs, etc.
-- Incrément idempotent : peut être ré-exécuté sans casser l'existant.
-- ============================================================================

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists tags text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('parent', 'student', 'teacher', 'admin', 'staff', 'director'));

alter table public.teachers add column if not exists user_id uuid references public.profiles (id) on delete set null;

alter table public.staff_members add column if not exists show_photo boolean not null default true;

-- ----------------------------------------------------------------------------
-- homework — "Cahier de texte numérique" (Bloc 2, schéma créé maintenant).
-- ----------------------------------------------------------------------------
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes (id) on delete cascade,
  class_name text not null,
  subject text not null,
  description text not null,
  due_date date not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.homework enable row level security;

drop policy if exists "Anyone authenticated can read homework" on public.homework;
create policy "Anyone authenticated can read homework"
  on public.homework for select
  using (auth.role() = 'authenticated');

drop policy if exists "Teachers and admins manage homework" on public.homework;
create policy "Teachers and admins manage homework"
  on public.homework for all
  using (public.is_school_staff() or auth.uid() = created_by)
  with check (public.is_school_staff() or auth.uid() = created_by);

create table if not exists public.homework_completions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

alter table public.homework_completions enable row level security;

drop policy if exists "Students manage their own completions" on public.homework_completions;
create policy "Students manage their own completions"
  on public.homework_completions for all
  using (auth.uid() = student_id or public.is_admin())
  with check (auth.uid() = student_id or public.is_admin());

-- ----------------------------------------------------------------------------
-- feed_posts — "Mur social" (Bloc 3, schéma créé maintenant).
-- ----------------------------------------------------------------------------
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  content text not null,
  image_url text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.feed_posts add column if not exists media_type text check (media_type in ('image', 'video'));
alter table public.feed_posts add column if not exists media_path text;

alter table public.feed_posts enable row level security;

drop policy if exists "Anyone authenticated can read the feed" on public.feed_posts;
create policy "Anyone authenticated can read the feed"
  on public.feed_posts for select
  using (auth.role() = 'authenticated');

-- Publishing text/image posts requires the 'feed_publisher' tag; video posts
-- ("reels") require the separate 'reels_publisher' tag, since video eats far
-- more storage. Admins can always post either kind.
-- Teachers are allowed here (mirroring the "Publishers write feed media"
-- storage policy below) — the frontend's canPostImage/canPostVideo checks in
-- FeedPage already grant them the composer for both image and video, so the
-- insert policy has to match or their post is silently rejected by RLS.
drop policy if exists "Publishers can post to the feed" on public.feed_posts;
create policy "Publishers can post to the feed"
  on public.feed_posts for insert
  with check (
    public.is_admin()
    or (
      (media_type is null or media_type = 'image')
      and exists (
        select 1 from public.profiles
        where id = auth.uid() and (role = 'teacher' or 'feed_publisher' = any(tags))
      )
    )
    or (
      media_type = 'video'
      and exists (
        select 1 from public.profiles
        where id = auth.uid() and (role = 'teacher' or 'reels_publisher' = any(tags))
      )
    )
  );

drop policy if exists "Admins manage feed posts" on public.feed_posts;
create policy "Admins manage feed posts"
  on public.feed_posts for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authors delete their own posts" on public.feed_posts;
create policy "Authors delete their own posts"
  on public.feed_posts for delete
  using (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- post_likes / post_comments — open to every authenticated user regardless
-- of publishing permissions.
-- ----------------------------------------------------------------------------
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Anyone authenticated can read likes" on public.post_likes;
create policy "Anyone authenticated can read likes"
  on public.post_likes for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users manage their own likes" on public.post_likes;
create policy "Users manage their own likes"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users remove their own likes" on public.post_likes;
create policy "Users remove their own likes"
  on public.post_likes for delete
  using (auth.uid() = user_id or public.is_admin());

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

drop policy if exists "Anyone authenticated can read comments" on public.post_comments;
create policy "Anyone authenticated can read comments"
  on public.post_comments for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users add their own comments" on public.post_comments;
create policy "Users add their own comments"
  on public.post_comments for insert
  with check (auth.uid() = author_id);

drop policy if exists "Users delete their own comments" on public.post_comments;
create policy "Users delete their own comments"
  on public.post_comments for delete
  using (auth.uid() = author_id or public.is_admin());

-- ----------------------------------------------------------------------------
-- course_resources ("Vault") removed — the feature was dropped from the app.
-- The `course-resources` storage bucket (and any files already in it) is
-- left alone below rather than force-deleted; remove it manually from the
-- Supabase dashboard if you want to reclaim that storage.
-- ----------------------------------------------------------------------------
drop function if exists public.increment_resource_views(uuid);
drop table if exists public.course_resources cascade;

-- ----------------------------------------------------------------------------
-- badges / user_badges — gamification (Bloc 5, schéma créé maintenant).
-- ----------------------------------------------------------------------------
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  emoji text not null,
  description text not null
);

alter table public.badges enable row level security;

drop policy if exists "Anyone can read badges" on public.badges;
create policy "Anyone can read badges"
  on public.badges for select
  using (true);

drop policy if exists "Admins manage badges" on public.badges;
create policy "Admins manage badges"
  on public.badges for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.badges (code, label, emoji, description) values
  ('scanner_fou', 'Scanner Fou', '📸', '10 cours uploadés et validés.'),
  ('sauveur_de_classe', 'Sauveur de Classe', '🛟', 'Un cours partagé consulté par plus de 20 élèves.'),
  ('toujours_a_jour', 'Toujours à Jour', '⚡', 'Devoirs cochés 5 jours consécutifs.'),
  ('journaliste_cpk', 'Journaliste CPK', '📰', 'Publications régulières sur le feed.'),
  ('junior_dev', 'Junior Dev', '💻', 'Élève du club web contributeur.'),
  ('fondateur', 'Fondateur', '👑', 'Badge exclusif administrateur.')
on conflict (code) do nothing;

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

alter table public.user_badges enable row level security;

drop policy if exists "Anyone can read user badges" on public.user_badges;
create policy "Anyone can read user badges"
  on public.user_badges for select
  using (true);

drop policy if exists "Admins manage user badges" on public.user_badges;
create policy "Admins manage user badges"
  on public.user_badges for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Storage — photos de staff (publiques).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('staff-photos', 'staff-photos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('feed-media', 'feed-media', true)
  on conflict (id) do nothing;

drop policy if exists "Public read staff photos" on storage.objects;
create policy "Public read staff photos"
  on storage.objects for select
  using (bucket_id = 'staff-photos');

drop policy if exists "Admins write staff photos" on storage.objects;
create policy "Admins write staff photos"
  on storage.objects for all
  using (bucket_id = 'staff-photos' and public.is_admin())
  with check (bucket_id = 'staff-photos' and public.is_admin());

-- The "Vault" storage policies (course-resources bucket) were removed along
-- with the feature; drop them explicitly since old policy names would
-- otherwise linger on storage.objects forever.
drop policy if exists "Authenticated read course resources" on storage.objects;
drop policy if exists "Scribes write course resources" on storage.objects;

drop policy if exists "Public read feed media" on storage.objects;
create policy "Public read feed media"
  on storage.objects for select
  using (bucket_id = 'feed-media');

drop policy if exists "Publishers write feed media" on storage.objects;
create policy "Publishers write feed media"
  on storage.objects for insert
  with check (
    bucket_id = 'feed-media'
    and (
      public.is_admin()
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
          and (role = 'teacher' or tags && array['feed_publisher', 'reels_publisher'])
      )
    )
  );

create index if not exists idx_post_likes_post_id on public.post_likes (post_id);
create index if not exists idx_post_comments_post_id on public.post_comments (post_id);
create index if not exists idx_homework_class_id on public.homework (class_id);
create index if not exists idx_homework_completions_student_id on public.homework_completions (student_id);
create index if not exists idx_feed_posts_created_at on public.feed_posts (created_at);
create index if not exists idx_user_badges_user_id on public.user_badges (user_id);

-- ----------------------------------------------------------------------------
-- notifications — in-site notifications for now; `link` lets the UI route
-- to the relevant page. Always inserted via the service-role client (system-
-- triggered on someone else's behalf), so no insert policy is needed here.
-- TODO: Intégrer API Push Mobile — miroir de ces notifications en push une
-- fois l'app mobile disponible.
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Sent from /admin/notifications: `intrusive` notifications are also shown as
-- a blocking modal the next time the person opens the site (same treatment as
-- the "your account has been validated" popup) instead of only sitting under
-- the bell. `title` is that modal's heading; `sent_by` records which admin
-- sent it, so a hand-written message is distinguishable from an automatic one.
alter table public.notifications add column if not exists intrusive boolean not null default false;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists sent_by uuid references public.profiles (id) on delete set null;

create index if not exists idx_notifications_user_read on public.notifications (user_id, read);

alter table public.notifications enable row level security;

drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users update their own notifications" on public.notifications;
create policy "Users update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id or public.is_admin());

create index if not exists idx_notifications_user_id on public.notifications (user_id, read);

-- ----------------------------------------------------------------------------
-- avatar_url — photo de profil, tout le monde peut mettre la sienne.
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users manage their own avatar" on storage.objects;
create policy "Users manage their own avatar"
  on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- contact_email — email de contact déclaratif pour les comptes CIN (dont
-- l'email de connexion est synthétique @cpk.internal), indépendant de
-- l'email d'authentification. Encourage à compléter via ProfileProgress.
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists contact_email text;

-- ----------------------------------------------------------------------------
-- Messagerie — fonctionnalité retirée. Supprime les tables si ce fichier a
-- déjà été exécuté avant leur retrait (drop en cascade : membres + messages).
-- ----------------------------------------------------------------------------
drop table if exists public.messages cascade;
drop table if exists public.conversation_members cascade;
drop table if exists public.conversations cascade;

-- ----------------------------------------------------------------------------
-- get_public_profiles — la policy select de `profiles` limite volontairement
-- la lecture d'une ligne entière à son propriétaire (CIN, téléphone, etc. y
-- vivent) ou à un admin. Mais le nom et la photo d'un auteur doivent rester
-- visibles à tout le monde (feed, commentaires, profils publics). Fonction
-- security definer strictement bornée aux 4 colonnes sans risque, jamais
-- un select * — ne pas l'élargir sans réfléchir aux colonnes exposées.
-- ----------------------------------------------------------------------------
create or replace function public.get_public_profiles(ids uuid[])
returns table (id uuid, display_name text, avatar_url text, role text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, coalesce(p.full_name, p.parent_first_name, '?') as display_name, p.avatar_url, p.role
  from public.profiles p
  where p.id = any(ids);
$$;

-- ----------------------------------------------------------------------------
-- follows — système de followers/suivis façon réseau social. Public : voir
-- qui suit qui n'est pas sensible ici, seul le suivi lui-même est protégé.
-- ----------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

alter table public.follows enable row level security;

drop policy if exists "Anyone authenticated can read follows" on public.follows;
create policy "Anyone authenticated can read follows"
  on public.follows for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users follow others as themselves" on public.follows;
create policy "Users follow others as themselves"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Users unfollow as themselves" on public.follows;
create policy "Users unfollow as themselves"
  on public.follows for delete
  using (auth.uid() = follower_id);

create index if not exists idx_follows_follower_id on public.follows (follower_id);
create index if not exists idx_follows_followed_id on public.follows (followed_id);

-- ----------------------------------------------------------------------------
-- teacher_classes — which classes a teacher is assigned to (admin-managed).
-- Scopes what a teacher can do from their dashboard (post homework for one of
-- their own classes) instead of every class in the school.
-- ----------------------------------------------------------------------------
create table if not exists public.teacher_classes (
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  primary key (teacher_id, class_id)
);

alter table public.teacher_classes enable row level security;

drop policy if exists "Anyone authenticated can read teacher classes" on public.teacher_classes;
create policy "Anyone authenticated can read teacher classes"
  on public.teacher_classes for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins manage teacher classes" on public.teacher_classes;
create policy "Admins manage teacher classes"
  on public.teacher_classes for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Backfill class_id on students rows created before that column was added
-- (or otherwise left null) — homework lookup now matches on class_id first,
-- falling back to class_name only for rows this can't reach.
-- ----------------------------------------------------------------------------
update public.students s
set class_id = c.id
from public.classes c
where s.class_id is null and s.class_name = c.name;

-- ----------------------------------------------------------------------------
-- push_tokens — device/browser push registrations (Firebase Cloud Messaging).
-- One row per device: the same user logged in on their phone and a browser
-- gets two rows, both fired on every notification. Tokens are opaque and
-- rotate on their own; a token rejected by FCM (uninstalled app, revoked
-- permission) is deleted from here by the send path.
-- ----------------------------------------------------------------------------
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('web', 'android')),
  created_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists "Users manage their own push tokens" on public.push_tokens;
create policy "Users manage their own push tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create index if not exists idx_push_tokens_user_id on public.push_tokens (user_id);

-- ----------------------------------------------------------------------------
-- Printed "document" accounts — admin creates a batch of parent accounts
-- upfront, prints a slip per person (name, phone, QR code) via /admin/documents.
-- qr_login_token is single-use (cleared the moment it's scanned); the
-- printed password is never stored, only shown once at PDF-generation time.
-- must_change_password forces a password change on first login regardless
-- of whether they came in via QR or by typing the printed credentials.
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists qr_login_token text unique;
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- ----------------------------------------------------------------------------
-- exams — "devoirs" in the Tunisian sense (devoir de contrôle / devoir de
-- synthèse), i.e. exam dates, not to be confused with the homework/cahier de
-- texte table above (checklist of tasks). Shown to students/parents as a
-- calendar on /devoirs.
-- ----------------------------------------------------------------------------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes (id) on delete cascade,
  class_name text not null,
  subject text not null,
  type text not null check (type in ('controle', 'synthese')),
  exam_date date not null,
  description text,
  teacher_notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.exams enable row level security;

drop policy if exists "Anyone authenticated can read exams" on public.exams;
create policy "Anyone authenticated can read exams"
  on public.exams for select
  using (auth.role() = 'authenticated');

drop policy if exists "Teachers and admins manage exams" on public.exams;
create policy "Teachers and admins manage exams"
  on public.exams for all
  using (public.is_school_staff() or auth.uid() = created_by)
  with check (public.is_school_staff() or auth.uid() = created_by);

create index if not exists idx_exams_class_id on public.exams (class_id);
create index if not exists idx_exams_exam_date on public.exams (exam_date);

-- ----------------------------------------------------------------------------
-- Backfill: create a teachers row for any profile with role='teacher' that
-- doesn't have one yet — e.g. an account whose role was set to "teacher"
-- directly in /admin/utilisateurs before that flow auto-created this row.
-- Without a teachers row, that account can't be assigned classes and never
-- shows up in /admin/profs.
-- ----------------------------------------------------------------------------
insert into public.teachers (first_name, last_name, user_id)
select
  split_part(coalesce(p.full_name, 'Professeur'), ' ', 1) as first_name,
  case
    when position(' ' in coalesce(p.full_name, '')) > 0
      then trim(substring(p.full_name from position(' ' in p.full_name) + 1))
    else split_part(coalesce(p.full_name, 'Professeur'), ' ', 1)
  end as last_name,
  p.id
from public.profiles p
where p.role = 'teacher'
  and not exists (select 1 from public.teachers t where t.user_id = p.id);

-- ----------------------------------------------------------------------------
-- suggestions — "Boîte à idées". Anyone can submit free-form text; it's only
-- visible to its author and admins until an admin gives it a public title
-- and validates it, at which point it becomes visible to everyone.
-- ----------------------------------------------------------------------------
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  content text not null,
  title text,
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected')),
  validated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.suggestions enable row level security;

drop policy if exists "Read validated suggestions or your own" on public.suggestions;
create policy "Read validated suggestions or your own"
  on public.suggestions for select
  using (status = 'validated' or auth.uid() = author_id or public.is_admin());

drop policy if exists "Users submit their own suggestions" on public.suggestions;
create policy "Users submit their own suggestions"
  on public.suggestions for insert
  with check (auth.uid() = author_id);

drop policy if exists "Admins manage suggestions" on public.suggestions;
create policy "Admins manage suggestions"
  on public.suggestions for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_suggestions_status on public.suggestions (status);
create index if not exists idx_suggestions_author_id on public.suggestions (author_id);

-- `won_at` is set once a suggestion has been featured as a monthly winner
-- (see suggestion_votes below), so it's excluded from future monthly draws.
alter table public.suggestions add column if not exists won_at timestamptz;

-- ----------------------------------------------------------------------------
-- suggestion_votes — one active vote per user, across ALL suggestions (not
-- one-per-suggestion): `user_id` is the primary key, so voting for a new
-- suggestion is a plain upsert that moves the existing row, which is exactly
-- how a user "changes their mind". At the end of each month a cron job
-- (see /api/cron/suggestions) posts the suggestion with the most votes to the
-- feed as "Daily Upgrades" and clears this table for the next month.
-- ----------------------------------------------------------------------------
create table if not exists public.suggestion_votes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.suggestion_votes enable row level security;

drop policy if exists "Users read their own vote" on public.suggestion_votes;
create policy "Users read their own vote"
  on public.suggestion_votes for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users cast their own vote" on public.suggestion_votes;
create policy "Users cast their own vote"
  on public.suggestion_votes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users change their own vote" on public.suggestion_votes;
create policy "Users change their own vote"
  on public.suggestion_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users remove their own vote" on public.suggestion_votes;
create policy "Users remove their own vote"
  on public.suggestion_votes for delete
  using (auth.uid() = user_id);

create index if not exists idx_suggestion_votes_suggestion_id on public.suggestion_votes (suggestion_id);

-- Vote counts must be visible to everyone (to rank suggestions publicly), but
-- the votes table itself only exposes each user's own row via RLS above — so
-- counting goes through this security-definer RPC, same pattern as
-- get_public_profiles.
create or replace function public.get_suggestion_vote_counts()
returns table (suggestion_id uuid, votes bigint)
language sql
security definer
set search_path = public
stable
as $$
  select suggestion_id, count(*)::bigint as votes
  from public.suggestion_votes
  group by suggestion_id;
$$;

-- Lets a post render as a system account ("Daily Upgrades") instead of a real
-- profile: `author_id` stays null (already renders as non-clickable in
-- PostCard), and `system_label` supplies the display name.
alter table public.feed_posts add column if not exists system_label text;

-- ----------------------------------------------------------------------------
-- site_settings — generic admin-editable key/value store. First use: the
-- external training link shown on "Plus de nous" (/admin/parametres).
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select
  using (true);

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings"
  on public.site_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Presence — `last_seen_at` is bumped by a client-side heartbeat every ~60s
-- while a session is open; "online" = last_seen_at within the last 2 minutes.
-- No RLS change needed: the existing "Users can update their own profile"
-- policy already covers writing this column on your own row.
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists last_seen_at timestamptz;

create index if not exists idx_profiles_last_seen_at on public.profiles (last_seen_at);

-- ----------------------------------------------------------------------------
-- onboarding_tour_seen — one-time animated feature tour shown right after a
-- new account's first login (see OnboardingTour). Same pattern as
-- validation_seen: set once, never shown again.
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists onboarding_tour_seen boolean not null default false;

-- ----------------------------------------------------------------------------
-- donations — parent/staff support payments via Flouci (Tunisian payment
-- gateway). `amount` is in millimes (Flouci's unit; 1 TND = 1000), and
-- `payment_ref` holds Flouci's payment_id. A row is inserted as 'pending'
-- when the payment is initiated, then flipped to 'completed'/'failed' only
-- after the real status is re-fetched from Flouci's verify_payment API —
-- neither the webhook call nor the redirect back is trusted on its own.
-- ----------------------------------------------------------------------------
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.profiles (id) on delete set null,
  amount integer not null check (amount > 0),
  payment_ref text unique,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.donations enable row level security;

drop policy if exists "Donors view their own donations or admin" on public.donations;
create policy "Donors view their own donations or admin"
  on public.donations for select
  using (auth.uid() = donor_id or public.is_admin());

drop policy if exists "Donors create their own donations" on public.donations;
create policy "Donors create their own donations"
  on public.donations for insert
  with check (auth.uid() = donor_id);

-- Status updates happen only via the webhook route, using the service-role
-- client (bypasses RLS) — no user-facing update policy needed.

create index if not exists idx_donations_donor_id on public.donations (donor_id);
create index if not exists idx_donations_status on public.donations (status);

-- ----------------------------------------------------------------------------
-- makeup_sessions — one-off "rattrapage" sessions a teacher adds for one of
-- their classes on a specific date, shown alongside the recurring weekly
-- grid on /emploi-du-temps (not part of timetable_entries, which is only for
-- the recurring weekly schedule).
-- ----------------------------------------------------------------------------
create table if not exists public.makeup_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes (id) on delete cascade,
  class_name text not null,
  teacher_id uuid references public.teachers (id) on delete set null,
  subject text not null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.makeup_sessions enable row level security;

drop policy if exists "Anyone authenticated can read makeup sessions" on public.makeup_sessions;
create policy "Anyone authenticated can read makeup sessions"
  on public.makeup_sessions for select
  using (auth.role() = 'authenticated');

drop policy if exists "Teachers add their own makeup sessions" on public.makeup_sessions;
create policy "Teachers add their own makeup sessions"
  on public.makeup_sessions for insert
  with check (
    public.is_admin()
    or exists (select 1 from public.teachers where id = teacher_id and user_id = auth.uid())
  );

drop policy if exists "Teachers delete their own makeup sessions" on public.makeup_sessions;
create policy "Teachers delete their own makeup sessions"
  on public.makeup_sessions for delete
  using (
    public.is_admin()
    or exists (select 1 from public.teachers where id = teacher_id and user_id = auth.uid())
  );

create index if not exists idx_makeup_sessions_class_id on public.makeup_sessions (class_id);
create index if not exists idx_makeup_sessions_session_date on public.makeup_sessions (session_date);

-- ----------------------------------------------------------------------------
-- Group projects — a student creates a group for a class project and gets a
-- persistent text chat plus a video-call room. Every group is visible to
-- every student (browsing groups doesn't require being in one); anyone can
-- ask to join, and the founder ('owner') is the only one who can accept a
-- request, remove a member, or delete the group. `group_members.status`
-- distinguishes a pending request from an accepted membership — chat access
-- and the call room address are only ever given to accepted members/the
-- owner (see is_group_member() below and getGroupDetail() in
-- src/lib/groups/data.ts).
--
-- All writes to `groups`/`group_members` go through server actions using the
-- service-role client with an explicit owner/admin check in application
-- code (see src/lib/groups/actions.ts) — simpler and safer than replicating
-- that authorization as RLS policies, especially for the necessary
-- bootstrap step (inserting the creator as the first 'owner' row). RLS below
-- only needs to gate SELECT for these two tables. `group_messages` is
-- written directly by members through the regular client, so it does get a
-- real INSERT policy.
-- ----------------------------------------------------------------------------
-- Tables first, then the security-definer helpers (LANGUAGE SQL functions
-- are validated against the catalog at CREATE time — unlike plpgsql, a
-- forward reference to a not-yet-created table fails immediately), then the
-- RLS policies that call those helpers.
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_id uuid references public.classes (id) on delete cascade,
  class_name text not null,
  room_slug text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table public.group_members add column if not exists status text not null default 'accepted' check (status in ('pending', 'accepted'));

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and status = 'accepted'
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role = 'owner'
  );
$$;

alter table public.groups enable row level security;

drop policy if exists "Members or admin can view groups" on public.groups;
drop policy if exists "Any authenticated user can view groups" on public.groups;
create policy "Any authenticated user can view groups"
  on public.groups for select
  using (auth.uid() is not null);

alter table public.group_members enable row level security;

drop policy if exists "Members can view group membership" on public.group_members;
drop policy if exists "Any authenticated user can view group membership" on public.group_members;
create policy "Any authenticated user can view group membership"
  on public.group_members for select
  using (auth.uid() is not null);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.group_messages enable row level security;

drop policy if exists "Members can read group messages" on public.group_messages;
create policy "Members can read group messages"
  on public.group_messages for select
  using (public.is_group_member(group_id) or public.is_admin());

drop policy if exists "Members can send group messages" on public.group_messages;
create policy "Members can send group messages"
  on public.group_messages for insert
  with check (auth.uid() = author_id and (public.is_group_member(group_id) or public.is_admin()));

create index if not exists idx_group_members_group_id on public.group_members (group_id);
create index if not exists idx_group_members_user_id on public.group_members (user_id);
create index if not exists idx_group_messages_group_id on public.group_messages (group_id);
create index if not exists idx_groups_class_id on public.groups (class_id);

-- ----------------------------------------------------------------------------
-- login_qr_tokens — one-time login QR codes an admin generates from an
-- existing user's page in /admin/utilisateurs (handing a parent or teacher
-- their account without ever telling them a password). Deliberately a
-- separate table from the `profiles.qr_login_token` column used by the
-- "document" bulk-account-creation flow above: that one is a long-lived,
-- reusable credential meant to survive on a printed slip for weeks, while
-- this one must die after exactly one scan. Only the service-role client
-- (admin server actions, the /api/qr-connexion route) ever touches this
-- table, so no RLS policies are defined — RLS enabled with zero policies
-- denies every request from the anon/authenticated clients by default.
-- Only a SHA-256 hash of the token is stored; the raw token lives only in
-- the URL handed to the admin at generation time.
-- ----------------------------------------------------------------------------
create table if not exists public.login_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz
);

alter table public.login_qr_tokens enable row level security;

create index if not exists idx_login_qr_tokens_user_id on public.login_qr_tokens (user_id);

-- ----------------------------------------------------------------------------
-- One-off cleanup: timetable_entries.is_cancelled is no longer written to or
-- read. A teacher absence used to flip it to true on the recurring weekly
-- slot, which struck that course out every week forever instead of only
-- during the absence. Cancellation is now derived at read time from
-- teacher_absences (see listTimetableEntries in src/lib/admin/data.ts), so any
-- row still stuck at true is stale data — reset it. Safe to re-run: nothing
-- sets this column to true any more.
-- ----------------------------------------------------------------------------
update public.timetable_entries set is_cancelled = false where is_cancelled = true;

-- ----------------------------------------------------------------------------
-- Messagerie privée — réservée aux "amis", c'est-à-dire deux personnes qui se
-- suivent mutuellement (follows dans les deux sens). Pas de demande d'ami
-- séparée : le suivi mutuel EST l'amitié, ce qui évite un deuxième système de
-- validation à maintenir.
--
-- user_blocks : un blocage coupe la conversation dans les deux sens, quel que
-- soit celui qui a bloqué. user_reports : signalements, relus depuis
-- /admin/signalements.
-- ----------------------------------------------------------------------------
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  context text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Mutual follow = friendship. Security definer so the check doesn't depend on
-- the caller being able to read the other person's follow rows.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.follows where follower_id = a and followed_id = b)
     and exists (select 1 from public.follows where follower_id = b and followed_id = a);
$$;

-- A block in EITHER direction cuts the conversation off for both sides.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

alter table public.direct_messages enable row level security;

drop policy if exists "Participants read their own messages" on public.direct_messages;
create policy "Participants read their own messages"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id or public.is_admin());

drop policy if exists "Friends send messages" on public.direct_messages;
create policy "Friends send messages"
  on public.direct_messages for insert
  with check (
    auth.uid() = sender_id
    and public.are_friends(auth.uid(), recipient_id)
    and not public.is_blocked_between(auth.uid(), recipient_id)
  );

drop policy if exists "Recipients mark messages read" on public.direct_messages;
create policy "Recipients mark messages read"
  on public.direct_messages for update
  using (auth.uid() = recipient_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Users read their own blocks" on public.user_blocks;
create policy "Users read their own blocks"
  on public.user_blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id or public.is_admin());

drop policy if exists "Users block as themselves" on public.user_blocks;
create policy "Users block as themselves"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Users unblock as themselves" on public.user_blocks;
create policy "Users unblock as themselves"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

alter table public.user_reports enable row level security;

-- Reports are write-only for the reporter: only admins get to read them back,
-- so nobody can browse who reported whom.
drop policy if exists "Users file their own reports" on public.user_reports;
create policy "Users file their own reports"
  on public.user_reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Admins read reports" on public.user_reports;
create policy "Admins read reports"
  on public.user_reports for select
  using (public.is_admin());

drop policy if exists "Admins update reports" on public.user_reports;
create policy "Admins update reports"
  on public.user_reports for update
  using (public.is_admin());

create index if not exists idx_direct_messages_pair on public.direct_messages (sender_id, recipient_id, created_at);
create index if not exists idx_direct_messages_recipient on public.direct_messages (recipient_id, read_at);
create index if not exists idx_user_blocks_blocker on public.user_blocks (blocker_id);
create index if not exists idx_user_reports_status on public.user_reports (status, created_at);

-- ----------------------------------------------------------------------------
-- push_tokens.platform accepte désormais 'ios' : l'app native iOS (Capacitor)
-- renvoie un token APNs, que la contrainte d'origine ('web','android')
-- rejetait silencieusement à l'insertion — le token n'était donc jamais
-- enregistré et aucune notification ne pouvait arriver sur iPhone.
-- ----------------------------------------------------------------------------
alter table public.push_tokens drop constraint if exists push_tokens_platform_check;
alter table public.push_tokens add constraint push_tokens_platform_check
  check (platform in ('web', 'android', 'ios'));

-- ----------------------------------------------------------------------------
-- email_logs — historique des emails envoyés depuis /admin/emails (envoi
-- personnalisé à des membres du site et/ou à des adresses externes). Sert de
-- trace administrative et à surveiller le quota Brevo (300 emails/jour sur
-- l'offre gratuite). Écrit uniquement via le client service_role.
-- ----------------------------------------------------------------------------
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid references public.profiles (id) on delete set null,
  recipient text not null,
  subject text not null,
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

alter table public.email_logs enable row level security;

drop policy if exists "Admins read email logs" on public.email_logs;
create policy "Admins read email logs"
  on public.email_logs for select
  using (public.is_admin());

create index if not exists idx_email_logs_created on public.email_logs (created_at desc);

-- ----------------------------------------------------------------------------
-- Boîte de réception admin — SMS reçus sur la ligne du collège et emails reçus
-- (contact@cpkef.tn, une fois le domaine en place), affichés dans un seul
-- onglet avec les demandes d'aide. Les lignes arrivent uniquement par les
-- routes webhook (/api/sms/received, /api/email/inbound), qui écrivent avec la
-- clé service_role : aucune règle d'insertion côté utilisateur.
-- `external_id` est l'identifiant du message chez l'expéditeur (passerelle SMS
-- ou Brevo) : un webhook renvoyé après une coupure ne crée pas de doublon.
-- ----------------------------------------------------------------------------
create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('sms', 'email')),
  external_id text not null,
  sender text not null,
  sender_name text,
  subject text,
  body text not null,
  profile_id uuid references public.profiles (id) on delete set null,
  received_at timestamptz not null default now(),
  read_at timestamptz,
  reply_body text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (channel, external_id)
);

create index if not exists idx_inbox_messages_received on public.inbox_messages (received_at desc);

alter table public.inbox_messages enable row level security;

drop policy if exists "Admins read inbox messages" on public.inbox_messages;
create policy "Admins read inbox messages"
  on public.inbox_messages for select
  using (public.is_admin());

drop policy if exists "Admins update inbox messages" on public.inbox_messages;
create policy "Admins update inbox messages"
  on public.inbox_messages for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete inbox messages" on public.inbox_messages;
create policy "Admins delete inbox messages"
  on public.inbox_messages for delete
  using (public.is_admin());

-- Réponse de l'administration à une demande d'aide, envoyée à son auteur en
-- notification et conservée ici pour l'historique.
alter table public.help_requests add column if not exists admin_reply text;
alter table public.help_requests add column if not exists replied_at timestamptz;
