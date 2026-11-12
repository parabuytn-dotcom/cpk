// Photo de profil Pingo : réservée au niveau 10. Reçoit { token, image } (JPEG en base64) ou { token, remove: true }.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const BUCKET = 'pingo-photos';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.token !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.token)) return json({ error: 'bad_token' }, 400);

  const { data: me } = await sb.rpc('pingo_photo_player', { p_token: body.token });
  if (!me || !me.id) return json({ error: 'bad_token' }, 401);
  const path = `${me.id}.jpg`;

  if (body.remove) {
    await sb.storage.from(BUCKET).remove([path]);
    const { data } = await sb.rpc('pingo_set_photo', { p_player: me.id, p_url: null });
    return json(data);
  }

  if (me.level < 10) return json({ error: 'level' }, 403);
  if (typeof body.image !== 'string' || body.image.length > 360000) return json({ error: 'too_big' }, 413);
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(body.image), (c) => c.charCodeAt(0)); } catch { return json({ error: 'bad_image' }, 400); }
  if (bytes.length < 200 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return json({ error: 'bad_image' }, 400);

  const up = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
  if (up.error) return json({ error: 'upload', message: up.error.message }, 500);
  const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
  const { data } = await sb.rpc('pingo_set_photo', { p_player: me.id, p_url: url });
  return json(data);
});
