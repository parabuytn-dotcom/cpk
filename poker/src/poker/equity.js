// Équité (chances de gagner) par simulation Monte-Carlo + force préflop + outs.
import { remainingDeck, handCode, RANK_CHARS } from './cards.js';
import { evaluate } from './evaluator.js';

/** Probabilité de gagner (égalités comptées au prorata) contre `opponents` mains aléatoires. */
export function equity(hole, board, opponents, iterations = 1200) {
  if (opponents <= 0) return 1;
  const deck = remainingDeck([...hole, ...board]);
  const need = 5 - board.length;
  let total = 0;
  const n = deck.length;
  const idx = new Array(n);
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) idx[i] = i;
    let k = 0;
    const draw = () => {
      const j = k + Math.floor(Math.random() * (n - k));
      const t = idx[k]; idx[k] = idx[j]; idx[j] = t;
      return deck[idx[k++]];
    };
    const runout = board.slice();
    for (let i = 0; i < need; i++) runout.push(draw());
    const mine = evaluate([...hole, ...runout]).score;
    let best = true, ties = 1;
    for (let o = 0; o < opponents; o++) {
      const s = evaluate([draw(), draw(), ...runout]).score;
      if (s > mine) { best = false; break; }
      if (s === mine) ties++;
    }
    if (best) total += 1 / ties;
  }
  return total / iterations;
}

/** Formule de Chen (Bill Chen) : note d'une main de départ, de -1 à 20. */
export function chen(hole) {
  const [a, b] = hole[0].r >= hole[1].r ? hole : [hole[1], hole[0]];
  const pts = (r) => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2);
  let s = pts(a.r);
  if (a.r === b.r) return Math.max(5, s * 2);
  if (a.s === b.s) s += 2;
  const gap = a.r - b.r - 1;
  s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
  if (gap <= 1 && a.r < 12) s += 1;
  return Math.ceil(s);
}

/** Catégories de mains de départ (tableau simplifié utilisé dans les leçons). */
const TIERS = {
  1: 'AA KK QQ AKs AKo JJ',
  2: 'TT AQs AJs KQs AQo 99',
  3: '88 ATs KJs QJs JTs AJo KQo 77 KTs QTs',
  4: '66 55 A9s A8s A7s A6s A5s A4s A3s A2s K9s T9s 98s 87s ATo KJo QJo J9s Q9s',
  5: '44 33 22 76s 65s 54s 97s 86s T8s KTo QTo JTo K8s K7s K6s K5s A9o'
};
const TIER_OF = {};
for (const [t, list] of Object.entries(TIERS)) for (const h of list.split(' ')) TIER_OF[h] = +t;

export const TIER_INFO = {
  1: { label: 'Premium', color: '#f5c451', tip: 'Les meilleures mains du jeu. Relance depuis n\'importe quelle position, et relance encore si quelqu\'un relance.' },
  2: { label: 'Très forte', color: '#ff8a4c', tip: 'Relance depuis toutes les positions. Face à une grosse relance, tu peux souvent suivre.' },
  3: { label: 'Forte', color: '#4cc38a', tip: 'Relance en position moyenne et tardive. En début de parole, joue-la prudemment.' },
  4: { label: 'Jouable', color: '#46a6ff', tip: 'À jouer depuis le cutoff, le bouton ou la petite blinde quand personne n\'a relancé.' },
  5: { label: 'Spéculative', color: '#9a7bff', tip: 'Seulement au bouton ou pour pas cher : ces mains ont besoin de toucher le flop.' },
  6: { label: 'Faible', color: '#5b6474', tip: 'Couche-toi. Les débutants perdent le plus d\'argent avec ce genre de mains.' }
};

export function tierOf(hole) {
  return TIER_OF[handCode(hole)] || 6;
}
export function tierOfCode(code) {
  return TIER_OF[code] || 6;
}
export const RANKS_DESC = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((r) => RANK_CHARS[r]);

/** Outs : cartes restantes qui améliorent la main grâce aux cartes privées. */
export function outs(hole, board) {
  if (board.length < 3 || board.length > 4) return { count: 0, cards: [], draws: [] };
  const cur = evaluate([...hole, ...board]);
  const deck = remainingDeck([...hole, ...board]);
  const list = [];
  for (const c of deck) {
    const after = evaluate([...hole, ...board, c]);
    const boardOnly = evaluate([...board, c]);
    if (after.cat > cur.cat && after.cat >= 2 && after.cat > boardOnly.cat) {
      // une paire devenue double paire via une carte du board ne compte pas vraiment
      if (after.cat === 2 && cur.cat === 1 && !hole.some((h) => h.r === c.r)) continue;
      list.push({ card: c, cat: after.cat });
    }
  }
  const draws = [];
  const flushOuts = list.filter((o) => o.cat === 5 || o.cat >= 8).length;
  const straightOuts = list.filter((o) => o.cat === 4).length;
  if (flushOuts >= 7) draws.push('tirage couleur');
  if (straightOuts >= 7) draws.push('tirage quinte par les deux bouts');
  else if (straightOuts >= 3) draws.push('tirage quinte ventral');
  return { count: list.length, cards: list.map((o) => o.card), draws };
}

/** Règle du 2 et du 4 */
export function ruleOf24(outCount, street) {
  return Math.min(100, outCount * (street === 'flop' ? 4 : 2));
}
