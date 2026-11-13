// Progression du joueur (sauvegardée dans le navigateur).
import { setSoundEnabled, sfx } from './sound.js';

const KEY = 'aia-progress-v1';
export const LEVELS = [
  [0, 'Débutant', '🐣'], [80, 'Poisson', '🐟'], [200, 'Amateur', '🃏'], [400, 'Joueur du dimanche', '🎲'],
  [700, 'Régulier', '♠️'], [1100, 'Grinder', '⚙️'], [1600, 'Requin', '🦈'], [2300, 'Pro de Las Vegas', '🎰'], [3200, 'Légende des WSOP', '🏆']
];

const DEFAULT = {
  xp: 0,
  lessons: {},
  drills: {},
  hands: { played: 0, won: 0, biggest: 0, showdownsWon: 0 },
  bankroll: 2000,
  rebuys: 0,
  settings: { coach: true, sound: true, speed: 1, showBots: false, autoNext: false },
  seenPlayIntro: false
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const s = JSON.parse(raw);
    return { ...structuredClone(DEFAULT), ...s, settings: { ...DEFAULT.settings, ...s.settings }, hands: { ...DEFAULT.hands, ...s.hands } };
  } catch {
    return structuredClone(DEFAULT);
  }
}

let state = load();
setSoundEnabled(state.settings.sound);
const subs = new Set();
const toastSubs = new Set();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* stockage indisponible */ }
}

export const store = {
  get: () => state,
  update(fn) {
    const next = structuredClone(state);
    fn(next);
    state = next;
    setSoundEnabled(state.settings.sound);
    save();
    subs.forEach((f) => f(state));
  },
  subscribe(f) { subs.add(f); return () => subs.delete(f); },
  onToast(f) { toastSubs.add(f); return () => toastSubs.delete(f); },
  toast(msg, kind = 'info') { toastSubs.forEach((f) => f({ msg, kind, id: Math.random() })); },
  addXp(n, reason) {
    const before = levelOf(state.xp).index;
    store.update((s) => { s.xp += n; });
    const after = levelOf(state.xp);
    store.toast(`+${n} XP${reason ? ' · ' + reason : ''}`, 'xp');
    if (after.index > before) {
      sfx('level');
      store.toast(`${after.icon} Niveau ${after.index + 1} : ${after.name} !`, 'level');
    }
  },
  reset() { state = structuredClone(DEFAULT); save(); subs.forEach((f) => f(state)); }
};

export function levelOf(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const [min, name, icon] = LEVELS[i];
  const next = LEVELS[i + 1]?.[0] ?? null;
  return { index: i, name, icon, min, next, progress: next ? (xp - min) / (next - min) : 1 };
}
