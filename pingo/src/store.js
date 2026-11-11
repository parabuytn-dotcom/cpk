import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';

const KEY = 'pingo:v1';
const init = { token: null, player: null, rank: null, results: {}, pending: [], sound: true, seen: {}, lastExam: null, levelUp: null };

function load() {
  try { return { ...init, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...init }; }
}
let state = load();
const subs = new Set();

export const getState = () => state;
export function setState(patch) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* stockage indisponible */ }
  subs.forEach((f) => f(state));
}
export function useStore() {
  const [s, set] = useState(state);
  useEffect(() => { subs.add(set); set(state); return () => subs.delete(set); }, []);
  return s;
}

function mergeResults(local, list) {
  const out = { ...local };
  for (const r of list || []) {
    const ex = { ...(out[r.exam] || {}) };
    const cur = ex[r.lesson];
    ex[r.lesson] = { best: Math.max(cur ? cur.best : 0, r.best), max: r.max };
    out[r.exam] = ex;
  }
  return out;
}

export function signIn(token, player) {
  setState({ token, player, results: {}, pending: [] });
  refresh();
}

export function logout() {
  setState({ ...init, sound: state.sound, seen: state.seen });
}

export async function refresh() {
  if (!state.token) return;
  try {
    const r = await api.me(state.token);
    if (r.error === 'bad_token') return logout();
    if (r.player) setState((s) => ({ player: r.player, rank: r.rank, results: mergeResults(s.results, r.results) }));
  } catch { /* hors ligne */ }
}

let flushing = null;
export function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    let gain = 0, synced = true;
    while (state.pending.length && state.token) {
      const p = state.pending[0];
      try {
        const r = await api.submit(state.token, p.exam, p.lesson, p.score, p.max);
        if (r.error === 'bad_token') { logout(); return { gain: 0, synced: false }; }
        if (r.player) {
          gain += r.gain;
          const before = state.player && state.player.level ? state.player.level : r.player.level;
          const up = r.player.level > before ? { levelUp: { from: before, to: r.player.level } } : {};
          setState((s) => ({ player: r.player, rank: r.rank, pending: s.pending.slice(1), ...up }));
        }
        else setState((s) => ({ pending: s.pending.slice(1) }));
      } catch { synced = false; break; }
    }
    return { gain, synced };
  })();
  flushing.finally(() => { flushing = null; });
  return flushing;
}

export function recordResult(exam, lesson, score, max) {
  setState((s) => {
    const ex = { ...(s.results[exam] || {}) };
    const cur = ex[lesson];
    ex[lesson] = { best: Math.max(cur ? cur.best : 0, score), max };
    return { results: { ...s.results, [exam]: ex }, pending: [...s.pending, { exam, lesson, score, max }], lastExam: exam };
  });
  return flush();
}

export function markSeen(id) { setState((s) => ({ seen: { ...s.seen, [id]: true } })); }
