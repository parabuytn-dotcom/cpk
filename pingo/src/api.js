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

export const api = {
  register: (name, phone, pin, avatar) => rpc('pingo_register', { p_name: name, p_phone: phone, p_pin: pin, p_avatar: avatar }),
  login: (phone, pin) => rpc('pingo_login', { p_phone: phone, p_pin: pin }),
  me: (token) => rpc('pingo_me', { p_token: token }),
  update: (token, name, avatar) => rpc('pingo_update_profile', { p_token: token, p_name: name, p_avatar: avatar }),
  submit: (token, exam, lesson, score, max) => rpc('pingo_submit', { p_token: token, p_exam: exam, p_lesson: lesson, p_score: score, p_max: max }),
  leaderboard: (exam) => rpc('pingo_leaderboard', { p_exam: exam || null, p_limit: 50 })
};
