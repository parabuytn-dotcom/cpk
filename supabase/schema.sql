-- ============================================================================
-- CPK Learn — schéma Supabase (Phase 1)
-- À exécuter dans le SQL Editor du projet Supabase (ou via `supabase db push`).
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
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

create policy "Users can insert their own profile on signup"
  on public.profiles for insert
  with check (auth.uid() = id);

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

create policy "Anyone authenticated can read classes"
  on public.classes for select
  using (auth.role() = 'authenticated');

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

create policy "Parents view their own children"
  on public.students for select
  using (auth.uid() = parent_id or auth.uid() = user_id or public.is_admin());

create policy "Parents insert their own children"
  on public.students for insert
  with check (auth.uid() = parent_id);

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

create policy "Anyone authenticated can read teachers"
  on public.teachers for select
  using (auth.role() = 'authenticated');

create policy "Admins manage teachers"
  on public.teachers for all
  using (public.is_admin())
  with check (public.is_admin());

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

create policy "Anyone authenticated can read timetable"
  on public.timetable_entries for select
  using (auth.role() = 'authenticated');

create policy "Admins manage timetable"
  on public.timetable_entries for all
  using (public.is_admin())
  with check (public.is_admin());

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

create policy "Anyone authenticated can read teacher absences"
  on public.teacher_absences for select
  using (auth.role() = 'authenticated');

create policy "Admins manage teacher absences"
  on public.teacher_absences for all
  using (public.is_admin())
  with check (public.is_admin());

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

create policy "Anyone can read staff members"
  on public.staff_members for select
  using (true);

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

create policy "Authors view their own help requests"
  on public.help_requests for select
  using (auth.uid() = author_id or public.is_admin());

create policy "Authenticated users can submit a help request"
  on public.help_requests for insert
  with check (auth.uid() = author_id);

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

create policy "Anyone can read releases"
  on public.releases for select
  using (true);

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

create policy "Anyone can read published tips"
  on public.tips for select
  using (published = true or public.is_admin());

create policy "Validated users can submit a tip"
  on public.tips for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'validated'
    )
  );

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

alter table public.sms_logs enable row level security;

create policy "Admins read sms logs"
  on public.sms_logs for select
  using (public.is_admin());

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
