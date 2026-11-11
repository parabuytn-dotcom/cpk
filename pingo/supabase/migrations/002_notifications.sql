-- Pingo · notifications (cloche dans l'app + push quotidien)
-- À exécuter une fois dans Supabase (SQL Editor) si la migration n'a pas été appliquée par Claude.

create extension if not exists pg_cron;

create table if not exists pingo.config(key text primary key, value text not null);
alter table pingo.config enable row level security;
insert into pingo.config values ('cron_secret', encode(extensions.gen_random_bytes(24), 'hex')) on conflict do nothing;

alter table pingo.players add column if not exists notif_push boolean not null default true;
alter table pingo.players add column if not exists last_push_at timestamptz;

create table if not exists pingo.notifications(
  id bigint generated always as identity primary key,
  player_id uuid not null references pingo.players(id) on delete cascade,
  kind text not null, title text not null, body text not null,
  created_at timestamptz not null default now(), read_at timestamptz, pushed_at timestamptz
);
create index if not exists notif_player_idx on pingo.notifications(player_id, created_at desc);
create index if not exists notif_unpushed_idx on pingo.notifications(created_at) where pushed_at is null;
alter table pingo.notifications enable row level security;

create table if not exists pingo.push_subs(
  endpoint text primary key,
  player_id uuid not null references pingo.players(id) on delete cascade,
  p256dh text not null, auth text not null, created_at timestamptz not null default now()
);
create index if not exists push_player_idx on pingo.push_subs(player_id);
alter table pingo.push_subs enable row level security;

/* inscription : + notification de bienvenue */
create or replace function public.pingo_register(p_name text, p_phone text, p_pin text, p_avatar jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ph text := pingo.norm_phone(p_phone); nm text := btrim(coalesce(p_name,'')); r pingo.players;
begin
  if char_length(nm) < 2 or char_length(nm) > 24 then return jsonb_build_object('error','bad_name'); end if;
  if ph !~ '^[0-9]{8,15}$' then return jsonb_build_object('error','bad_phone'); end if;
  if coalesce(p_pin,'') !~ '^[0-9]{4}$' then return jsonb_build_object('error','bad_pin'); end if;
  if p_avatar is null or pg_column_size(p_avatar) > 600 then p_avatar := '{}'::jsonb; end if;
  if exists(select 1 from pingo.players where phone = ph) then return jsonb_build_object('error','phone_taken'); end if;
  insert into pingo.players(name, phone, pin_hash, avatar)
    values (nm, ph, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), p_avatar) returning * into r;
  insert into pingo.notifications(player_id, kind, title, body)
    values (r.id, 'welcome', 'Bienvenue sur Pingo, ' || r.name || ' !', 'Termine ta première leçon pour gagner tes premiers XP et entrer dans le classement.');
  return jsonb_build_object('token', r.token, 'player', pingo.pub(r));
end $$;

/* score : + « X t'a dépassé » pour les joueurs doublés */
create or replace function public.pingo_submit(p_token uuid, p_exam text, p_lesson text, p_score int, p_max int)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r pingo.players; old int; gain int; old_xp int; today date := (now() at time zone 'Africa/Tunis')::date;
begin
  select * into r from pingo.players where token = p_token for update;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  if p_max is null or p_max < 1 or p_max > 60 or p_score is null or p_score < 0 or p_score > p_max
     or char_length(coalesce(p_exam,'')) not between 1 and 40 or char_length(coalesce(p_lesson,'')) not between 1 and 40 then
    return jsonb_build_object('error','bad_input'); end if;
  old_xp := r.xp;
  select best into old from pingo.results where player_id = r.id and exam = p_exam and lesson = p_lesson;
  if old is null then
    gain := p_score * 10;
    insert into pingo.results(player_id, exam, lesson, best, max) values (r.id, p_exam, p_lesson, p_score, p_max);
  else
    gain := greatest(0, p_score - old) * 10 + 3;
    update pingo.results set best = greatest(best, p_score), max = p_max, plays = plays + 1, updated_at = now()
      where player_id = r.id and exam = p_exam and lesson = p_lesson;
  end if;
  update pingo.players set xp = xp + gain,
    streak = case when last_day = today then streak when last_day = today - 1 then streak + 1 else 1 end,
    last_day = today
  where id = r.id returning * into r;
  if r.xp > old_xp then
    insert into pingo.notifications(player_id, kind, title, body)
    select o.id, 'rank', r.name || ' t''a dépassé !', r.name || ' vient de passer devant toi au classement. Fais une leçon pour reprendre ta place !'
    from pingo.players o
    where o.id <> r.id and o.xp >= old_xp and o.xp < r.xp
      and not exists (select 1 from pingo.notifications n where n.player_id = o.id and n.kind = 'rank' and n.created_at > now() - interval '1 hour')
    limit 30;
  end if;
  return jsonb_build_object('gain', gain, 'player', pingo.pub(r),
    'rank', (select count(*) + 1 from pingo.players o where o.xp > r.xp));
end $$;

/* API de l'app */
create or replace function public.pingo_notifs(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r pingo.players;
begin
  select * into r from pingo.players where token = p_token;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'title',title,'body',body,'at',created_at,'read',read_at is not null) order by created_at desc)
                        from (select * from pingo.notifications where player_id = r.id order by created_at desc limit 30) x), '[]'::jsonb),
    'unread', (select count(*) from pingo.notifications where player_id = r.id and read_at is null),
    'push', r.notif_push);
end $$;

create or replace function public.pingo_notifs_read(p_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  update pingo.notifications set read_at = now()
  where read_at is null and player_id = (select id from pingo.players where token = p_token);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pingo_push_subscribe(p_token uuid, p_endpoint text, p_p256dh text, p_auth text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r pingo.players;
begin
  select * into r from pingo.players where token = p_token;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 or char_length(coalesce(p_p256dh,'')) not between 20 and 200 or char_length(coalesce(p_auth,'')) not between 8 and 100 then
    return jsonb_build_object('error','bad_input'); end if;
  insert into pingo.push_subs(endpoint, player_id, p256dh, auth) values (p_endpoint, r.id, p_p256dh, p_auth)
    on conflict (endpoint) do update set player_id = excluded.player_id, p256dh = excluded.p256dh, auth = excluded.auth;
  delete from pingo.push_subs where player_id = r.id and endpoint not in
    (select endpoint from pingo.push_subs where player_id = r.id order by created_at desc limit 5);
  update pingo.players set notif_push = true where id = r.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pingo_push_unsubscribe(p_token uuid, p_endpoint text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r pingo.players;
begin
  select * into r from pingo.players where token = p_token;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  delete from pingo.push_subs where player_id = r.id and endpoint = p_endpoint;
  update pingo.players set notif_push = false where id = r.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pingo_push_public_key()
returns text language sql stable security definer set search_path='' as $$
  select value from pingo.config where key = 'vapid_public'
$$;

/* réservé à la fonction d'envoi (service_role) */
create or replace function public.pingo_push_config()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'public', (select value from pingo.config where key = 'vapid_public'),
    'private', (select value from pingo.config where key = 'vapid_private'),
    'cron', (select value from pingo.config where key = 'cron_secret'))
$$;

create or replace function public.pingo_push_set_keys(p_public text, p_private text)
returns void language sql security definer set search_path='' as $$
  insert into pingo.config values ('vapid_public', p_public), ('vapid_private', p_private) on conflict do nothing
$$;

create or replace function public.pingo_push_queue()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(q), '[]'::jsonb) from (
    select p.id as player_id,
      array_agg(n.id) as ids,
      (array_agg(n.title order by n.created_at desc))[1] as title,
      (array_agg(n.body order by n.created_at desc))[1] as body,
      count(*) as count,
      (select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)) from pingo.push_subs s where s.player_id = p.id) as subs
    from pingo.players p
    join pingo.notifications n on n.player_id = p.id and n.pushed_at is null and n.read_at is null and n.created_at > now() - interval '24 hours'
    where p.notif_push and (p.last_push_at is null or p.last_push_at < now() - interval '3 hours')
      and exists (select 1 from pingo.push_subs s where s.player_id = p.id)
    group by p.id
    limit 500
  ) q
$$;

create or replace function public.pingo_push_done(p_players uuid[], p_notifs bigint[], p_dead text[])
returns void language plpgsql security definer set search_path='' as $$
begin
  update pingo.notifications set pushed_at = now() where id = any(p_notifs);
  update pingo.players set last_push_at = now() where id = any(p_players);
  delete from pingo.push_subs where endpoint = any(p_dead);
end $$;

/* rappels quotidiens (cron) */
create or replace function pingo.daily_reminders()
returns int language plpgsql security definer set search_path='' as $$
declare today date := (now() at time zone 'Africa/Tunis')::date; n int := 0; k int;
begin
  insert into pingo.notifications(player_id, kind, title, body)
  select id, 'streak', 'Ta série est en danger !',
    'Ta série de ' || streak || ' jour' || case when streak > 1 then 's' else '' end || ' s''arrête ce soir. Une petite leçon et c''est sauvé !'
  from pingo.players where last_day = today - 1 and streak >= 1;
  get diagnostics k = row_count; n := n + k;
  insert into pingo.notifications(player_id, kind, title, body)
  select p.id, 'comeback', 'Pingo s''ennuie sans toi', 'Tes potes avancent au classement. Reviens faire une leçon de 3 minutes !'
  from pingo.players p
  where p.last_day between today - 10 and today - 3
    and not exists (select 1 from pingo.notifications x where x.player_id = p.id and x.kind = 'comeback' and x.created_at > now() - interval '3 days');
  get diagnostics k = row_count; n := n + k;
  delete from pingo.notifications where created_at < now() - interval '30 days';
  return n;
end $$;

revoke all on function pingo.daily_reminders() from public, anon, authenticated;
revoke all on function public.pingo_notifs(uuid), public.pingo_notifs_read(uuid), public.pingo_push_subscribe(uuid,text,text,text),
  public.pingo_push_unsubscribe(uuid,text), public.pingo_push_public_key(), public.pingo_push_config(), public.pingo_push_set_keys(text,text),
  public.pingo_push_queue(), public.pingo_push_done(uuid[],bigint[],text[]), public.pingo_register(text,text,text,jsonb), public.pingo_submit(uuid,text,text,int,int) from public;
grant execute on function public.pingo_notifs(uuid), public.pingo_notifs_read(uuid), public.pingo_push_subscribe(uuid,text,text,text),
  public.pingo_push_unsubscribe(uuid,text), public.pingo_push_public_key(), public.pingo_register(text,text,text,jsonb), public.pingo_submit(uuid,text,text,int,int) to anon, authenticated;
grant execute on function public.pingo_push_config(), public.pingo_push_set_keys(text,text), public.pingo_push_queue(), public.pingo_push_done(uuid[],bigint[],text[]) to service_role;

/* planification (heure de Tunis = UTC+1) : rappels à 18 h, envois de 8 h 05 à 20 h 05 */
select cron.schedule('pingo-daily-reminders', '0 17 * * *', 'select pingo.daily_reminders()');
select cron.schedule('pingo-push', '5 7-19 * * *',
  format($f$select net.http_post(url := 'https://krpagrssuwwzxcaercea.supabase.co/functions/v1/pingo-push', headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', %L), body := '{}'::jsonb)$f$,
         (select value from pingo.config where key = 'cron_secret')));
