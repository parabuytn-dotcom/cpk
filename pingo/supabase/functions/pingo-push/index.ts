// Envoie les notifications push de Pingo. Appelée par pg_cron (en-tête x-cron-secret).
// Les clés VAPID sont générées ici au premier appel et gardées dans pingo.config :
// la clé privée ne quitte jamais Supabase.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  let { data: cfg, error } = await sb.rpc('pingo_push_config');
  if (error) return json({ error: error.message }, 500);
  if (!cfg.cron || req.headers.get('x-cron-secret') !== cfg.cron) return json({ error: 'forbidden' }, 403);

  if (!cfg.public || !cfg.private) {
    const k = webpush.generateVAPIDKeys();
    await sb.rpc('pingo_push_set_keys', { p_public: k.publicKey, p_private: k.privateKey });
    ({ data: cfg } = await sb.rpc('pingo_push_config'));
  }
  webpush.setVapidDetails('https://pingo-revisions.vercel.app', cfg.public, cfg.private);

  const body = await req.json().catch(() => ({}));
  if (body.init) return json({ ok: true });
  if (body.test) {
    try {
      const r = await webpush.sendNotification({ endpoint: body.test.endpoint, keys: { p256dh: body.test.p256dh, auth: body.test.auth } },
        JSON.stringify({ title: 'Test Pingo', body: 'Les notifications marchent !' }), { TTL: 60 });
      return json({ test: 'ok', status: r.statusCode });
    } catch (e) {
      return json({ test: 'error', status: (e as { statusCode?: number }).statusCode, message: String((e as Error).message || e) });
    }
  }

  const { data: queue, error: qe } = await sb.rpc('pingo_push_queue');
  if (qe) return json({ error: qe.message }, 500);
  const players: string[] = [], notifs: number[] = [], dead: string[] = [];
  let sent = 0;
  for (const q of queue ?? []) {
    const title = q.count > 1 ? `${q.title} (+${q.count - 1})` : q.title;
    const payload = JSON.stringify({ title, body: q.body, url: '/#/notifs', tag: 'pingo' });
    for (const s of q.subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    }
    players.push(q.player_id);
    notifs.push(...q.ids);
  }
  if (players.length || dead.length) await sb.rpc('pingo_push_done', { p_players: players, p_notifs: notifs, p_dead: dead });
  return json({ sent, players: players.length, dead: dead.length });
});
