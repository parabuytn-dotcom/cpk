-- Pingo · photo de profil (niveau 10). Appliquée le 12/11/2026.
alter table pingo.players add column if not exists photo_url text;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('pingo-photos', 'pingo-photos', true, 262144, array['image/jpeg'])
on conflict (id) do nothing;

-- la photo n'est jamais modifiable par le client : elle est ajoutée depuis photo_url
create or replace function pingo.av(p pingo.players) returns jsonb language sql stable set search_path='' as $$
  select case when p.photo_url is not null then p.avatar || jsonb_build_object('photo', p.photo_url) else p.avatar end
$$;
-- pingo.pub, pingo_leaderboard : 'avatar' => pingo.av(p)
-- pingo_update_profile, pingo_register : p_avatar - 'photo'
-- pingo_photo_player(token) et pingo_set_photo(player, url) : réservées à service_role (fonction pingo-photo)
