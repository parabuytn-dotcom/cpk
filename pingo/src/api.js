import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

async function rpc(fn, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!res.ok) throw new Error('network');
  return res.json();
}

async function fn(name, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

export const api = {
  photo: (token, image) => fn('pingo-photo', { token, image }),
  photoRemove: (token) => fn('pingo-photo', { token, remove: true }),
  register: (name, phone, pin, avatar) => rpc('pingo_register', { p_name: name, p_phone: phone, p_pin: pin, p_avatar: avatar }),
  login: (phone, pin) => rpc('pingo_login', { p_phone: phone, p_pin: pin }),
  me: (token) => rpc('pingo_me', { p_token: token }),
  update: (token, name, avatar) => rpc('pingo_update_profile', { p_token: token, p_name: name, p_avatar: avatar }),
  submit: (token, exam, lesson, score, max) => rpc('pingo_submit', { p_token: token, p_exam: exam, p_lesson: lesson, p_score: score, p_max: max }),
  notifs: (token) => rpc('pingo_notifs', { p_token: token }),
  notifsRead: (token) => rpc('pingo_notifs_read', { p_token: token }),
  pushKey: () => rpc('pingo_push_public_key', {}),
  pushSub: (token, endpoint, p256dh, auth) => rpc('pingo_push_subscribe', { p_token: token, p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth }),
  pushUnsub: (token, endpoint) => rpc('pingo_push_unsubscribe', { p_token: token, p_endpoint: endpoint }),
  ping: (token) => rpc('pingo_ping', { p_token: token }),
  player: (token, id) => rpc('pingo_player', { p_token: token, p_id: id }),
  conversations: (token) => rpc('pingo_conversations', { p_token: token }),
  messages: (token, other, before) => rpc('pingo_messages', { p_token: token, p_other: other, p_before: before || null }),
  send: (token, to, body) => rpc('pingo_send', { p_token: token, p_to: to, p_body: body }),
  block: (token, id, on) => rpc('pingo_block', { p_token: token, p_id: id, p_on: on }),
  leaderboard: (exam) => rpc('pingo_leaderboard', { p_exam: exam || null, p_limit: 50 })
};
