-- Pingo · profils publics, messages privés, blocage, statut en ligne.

alter table pingo.players add column if not exists last_seen timestamptz;

create table if not exists pingo.messages(
  id bigint generated always as identity primary key,
  sender uuid not null references pingo.players(id) on delete cascade,
  recipient uuid not null references pingo.players(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender <> recipient)
);
create index if not exists msg_pair_idx on pingo.messages(least(sender, recipient), greatest(sender, recipient), created_at desc);
create index if not exists msg_unread_idx on pingo.messages(recipient) where read_at is null;
create index if not exists msg_sender_time_idx on pingo.messages(sender, created_at desc);
alter table pingo.messages enable row level security;

create table if not exists pingo.blocks(
  blocker uuid not null references pingo.players(id) on delete cascade,
  blocked uuid not null references pingo.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
alter table pingo.blocks enable row level security;

-- en ligne = vu dans les 2 dernières minutes
create or replace function pingo.presence(p pingo.players) returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('online', coalesce(p.last_seen > now() - interval '2 minutes', false), 'seen', p.last_seen)
$$;

create or replace function public.pingo_ping(p_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r pingo.players;
begin
  update pingo.players set last_seen = now() where token = p_token returning * into r;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  return jsonb_build_object('unread_msgs',
    (select count(*) from pingo.messages m where m.recipient = r.id and m.read_at is null
       and not exists (select 1 from pingo.blocks b where b.blocker = r.id and b.blocked = m.sender)));
end $$;

create or replace function public.pingo_leaderboard(p_exam text default null, p_limit int default 50)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(x order by (x->>'score')::int desc, x->>'name'), '[]'::jsonb) from (
    select jsonb_build_object('id',p.id,'name',p.name,'avatar',pingo.av(p),'level',1+p.xp/150,
      'score', case when p_exam is null then p.xp else coalesce(s.total,0) end) || pingo.presence(p) x
    from pingo.players p
    left join (select player_id, sum(best) total from pingo.results where exam = p_exam group by player_id) s on s.player_id = p.id
    where p_exam is null or s.total is not null
    order by case when p_exam is null then p.xp else coalesce(s.total,0) end desc, p.created_at
    limit least(greatest(coalesce(p_limit,50),1),100)
  ) t
$$;

-- profil public d'un joueur (réservé aux joueurs connectés)
create or replace function public.pingo_player(p_token uuid, p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me pingo.players; o pingo.players;
begin
  select * into me from pingo.players where token = p_token;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  select * into o from pingo.players where id = p_id;
  if not found then return jsonb_build_object('error','not_found'); end if;
  return jsonb_build_object(
    'player', pingo.pub(o) || pingo.presence(o) || jsonb_build_object('since', o.created_at),
    'rank', (select count(*) + 1 from pingo.players x where x.xp > o.xp),
    'lessons', (select count(*) from pingo.results where player_id = o.id),
    'stars3', (select count(*) from pingo.results where player_id = o.id and best * 10 >= max * 9),
    'exams', coalesce((select jsonb_agg(jsonb_build_object('exam', exam, 'lessons', n, 'score', s)) from
                (select exam, count(*) n, sum(best) s from pingo.results where player_id = o.id group by exam) e), '[]'::jsonb),
    'me', me.id = o.id,
    'blocked', exists(select 1 from pingo.blocks where blocker = me.id and blocked = o.id),
    'blocked_me', exists(select 1 from pingo.blocks where blocker = o.id and blocked = me.id));
end $$;

create or replace function public.pingo_conversations(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me pingo.players;
begin
  select * into me from pingo.players where token = p_token;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  return coalesce((
    select jsonb_agg(c order by (c->>'at') desc) from (
      select jsonb_build_object('id', o.id, 'name', o.name, 'avatar', pingo.av(o), 'level', 1 + o.xp/150,
        'last', l.body, 'mine', l.sender = me.id, 'at', l.created_at,
        'unread', (select count(*) from pingo.messages u where u.sender = o.id and u.recipient = me.id and u.read_at is null)) || pingo.presence(o) c
      from (select distinct on (case when sender = me.id then recipient else sender end)
              case when sender = me.id then recipient else sender end other, body, sender, created_at
            from pingo.messages where sender = me.id or recipient = me.id
            order by case when sender = me.id then recipient else sender end, created_at desc) l
      join pingo.players o on o.id = l.other
      where not exists (select 1 from pingo.blocks b where b.blocker = me.id and b.blocked = o.id)
      limit 100) t), '[]'::jsonb);
end $$;

-- fil d'une conversation (50 derniers, ou avant p_before) ; marque comme lus
create or replace function public.pingo_messages(p_token uuid, p_other uuid, p_before bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me pingo.players;
begin
  select * into me from pingo.players where token = p_token;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  update pingo.messages set read_at = now() where recipient = me.id and sender = p_other and read_at is null;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'mine', sender = me.id, 'body', body, 'at', created_at, 'read', read_at is not null) order by id)
    from (select * from pingo.messages
          where ((sender = me.id and recipient = p_other) or (sender = p_other and recipient = me.id))
            and (p_before is null or id < p_before)
          order by id desc limit 50) x), '[]'::jsonb));
end $$;

create or replace function public.pingo_send(p_token uuid, p_to uuid, p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me pingo.players; o pingo.players; b text := btrim(coalesce(p_body, '')); m pingo.messages;
begin
  select * into me from pingo.players where token = p_token;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  select * into o from pingo.players where id = p_to;
  if not found or o.id = me.id then return jsonb_build_object('error','not_found'); end if;
  if char_length(b) < 1 or char_length(b) > 500 then return jsonb_build_object('error','bad_body'); end if;
  if exists(select 1 from pingo.blocks where (blocker = o.id and blocked = me.id) or (blocker = me.id and blocked = o.id)) then
    return jsonb_build_object('error','blocked'); end if;
  if (select count(*) from pingo.messages where sender = me.id and created_at > now() - interval '1 minute') >= 15 then
    return jsonb_build_object('error','slow_down'); end if;
  insert into pingo.messages(sender, recipient, body) values (me.id, o.id, b) returning * into m;
  update pingo.players set last_seen = now() where id = me.id;
  if not exists (select 1 from pingo.notifications n where n.player_id = o.id and n.kind = 'message'
                   and n.read_at is null and n.created_at > now() - interval '30 minutes' and n.title like '%' || me.name) then
    insert into pingo.notifications(player_id, kind, title, body)
    values (o.id, 'message', 'Nouveau message de ' || me.name, left(b, 120));
  end if;
  return jsonb_build_object('item', jsonb_build_object('id', m.id, 'mine', true, 'body', m.body, 'at', m.created_at, 'read', false));
end $$;

create or replace function public.pingo_block(p_token uuid, p_id uuid, p_on boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me pingo.players;
begin
  select * into me from pingo.players where token = p_token;
  if not found then return jsonb_build_object('error','bad_token'); end if;
  if p_on then insert into pingo.blocks(blocker, blocked) select me.id, p_id where p_id <> me.id and exists(select 1 from pingo.players where id = p_id) on conflict do nothing;
  else delete from pingo.blocks where blocker = me.id and blocked = p_id; end if;
  return jsonb_build_object('ok', true, 'blocked', p_on);
end $$;

revoke all on function pingo.presence(pingo.players) from public, anon, authenticated;
revoke all on function public.pingo_ping(uuid), public.pingo_leaderboard(text,int), public.pingo_player(uuid,uuid), public.pingo_conversations(uuid),
  public.pingo_messages(uuid,uuid,bigint), public.pingo_send(uuid,uuid,text), public.pingo_block(uuid,uuid,boolean) from public;
grant execute on function public.pingo_ping(uuid), public.pingo_leaderboard(text,int), public.pingo_player(uuid,uuid), public.pingo_conversations(uuid),
  public.pingo_messages(uuid,uuid,bigint), public.pingo_send(uuid,uuid,text), public.pingo_block(uuid,uuid,boolean) to anon, authenticated;
