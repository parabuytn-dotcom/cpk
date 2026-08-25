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
    where id = auth.uid() and role = 'admin'
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

drop policy if exists "Anyone authenticated can read teacher absences" on public.teacher_absences;
create policy "Anyone authenticated can read teacher absences"
  on public.teacher_absences for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins manage teacher absences" on public.teacher_absences;
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
  check (role in ('parent', 'student', 'teacher', 'admin', 'staff'));

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
  using (public.is_admin() or auth.uid() = created_by)
  with check (public.is_admin() or auth.uid() = created_by);

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
drop policy if exists "Publishers can post to the feed" on public.feed_posts;
create policy "Publishers can post to the feed"
  on public.feed_posts for insert
  with check (
    public.is_admin()
    or (
      (media_type is null or media_type = 'image')
      and exists (select 1 from public.profiles where id = auth.uid() and 'feed_publisher' = any(tags))
    )
    or (
      media_type = 'video'
      and exists (select 1 from public.profiles where id = auth.uid() and 'reels_publisher' = any(tags))
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
-- course_resources — "Vault" (Bloc 4, schéma créé maintenant).
-- ----------------------------------------------------------------------------
create table if not exists public.course_resources (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes (id) on delete cascade,
  class_name text not null,
  subject text not null,
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references public.profiles (id),
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.course_resources enable row level security;

drop policy if exists "Anyone authenticated can read course resources" on public.course_resources;
create policy "Anyone authenticated can read course resources"
  on public.course_resources for select
  using (auth.role() = 'authenticated');

drop policy if exists "Scribes can upload course resources" on public.course_resources;
create policy "Scribes can upload course resources"
  on public.course_resources for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and 'scribe' = any(tags)
    )
  );

drop policy if exists "Admins manage course resources" on public.course_resources;
create policy "Admins manage course resources"
  on public.course_resources for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Uploaders delete their own course resources" on public.course_resources;
create policy "Uploaders delete their own course resources"
  on public.course_resources for delete
  using (auth.uid() = uploaded_by or public.is_admin());

-- Atomic view counter, used when a student opens a resource — avoids the
-- read-then-write race of a plain update from the client.
create or replace function public.increment_resource_views(resource_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.course_resources set view_count = view_count + 1 where id = resource_id;
$$;

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
-- Storage — photos de staff (publiques) et documents du Vault (privés).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('staff-photos', 'staff-photos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('course-resources', 'course-resources', false)
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

drop policy if exists "Authenticated read course resources" on storage.objects;
create policy "Authenticated read course resources"
  on storage.objects for select
  using (bucket_id = 'course-resources' and auth.role() = 'authenticated');

drop policy if exists "Scribes write course resources" on storage.objects;
create policy "Scribes write course resources"
  on storage.objects for insert
  with check (
    bucket_id = 'course-resources'
    and (
      public.is_admin()
      or exists (select 1 from public.profiles where id = auth.uid() and 'scribe' = any(tags))
    )
  );

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
        where id = auth.uid() and (tags && array['feed_publisher', 'reels_publisher'])
      )
    )
  );

create index if not exists idx_post_likes_post_id on public.post_likes (post_id);
create index if not exists idx_post_comments_post_id on public.post_comments (post_id);
create index if not exists idx_homework_class_id on public.homework (class_id);
create index if not exists idx_homework_completions_student_id on public.homework_completions (student_id);
create index if not exists idx_feed_posts_created_at on public.feed_posts (created_at);
create index if not exists idx_course_resources_class_id on public.course_resources (class_id);
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
