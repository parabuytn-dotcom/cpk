// Évaluateur de mains : meilleure combinaison de 5 cartes parmi 5 à 7 cartes.
import { RANK_NAME_FR, RANK_PLURAL_FR } from './cards.js';

export const CATEGORIES = [
  { fr: 'Carte haute', en: 'High card' },
  { fr: 'Paire', en: 'One pair' },
  { fr: 'Double paire', en: 'Two pair' },
  { fr: 'Brelan', en: 'Three of a kind' },
  { fr: 'Quinte', en: 'Straight' },
  { fr: 'Couleur', en: 'Flush' },
  { fr: 'Full', en: 'Full house' },
  { fr: 'Carré', en: 'Four of a kind' },
  { fr: 'Quinte flush', en: 'Straight flush' },
  { fr: 'Quinte flush royale', en: 'Royal flush' }
];

function score(cat, ranks) {
  let s = cat;
  for (let i = 0; i < 5; i++) s = s * 15 + (ranks[i] || 0);
  return s;
}

function findStraight(list) {
  // list : cartes quelconques ; renvoie 5 cartes formant la meilleure quinte, ou null
  const byRank = new Map();
  for (const c of list) if (!byRank.has(c.r)) byRank.set(c.r, c);
  if (byRank.has(14)) byRank.set(1, byRank.get(14));
  for (let high = 14; high >= 5; high--) {
    const seq = [];
    for (let r = high; r > high - 5; r--) {
      const c = byRank.get(r);
      if (!c) break;
      seq.push(c);
    }
    if (seq.length === 5) return { high, cards: seq };
  }
  return null;
}

const desc = (a, b) => b.r - a.r;

export function evaluate(cardsIn) {
  const cards = cardsIn.slice().sort(desc);
  const bySuit = [[], [], [], []];
  const groups = new Map();
  for (const c of cards) {
    bySuit[c.s].push(c);
    if (!groups.has(c.r)) groups.set(c.r, []);
    groups.get(c.r).push(c);
  }

  // Quinte flush
  let flushCards = null;
  for (const suited of bySuit) {
    if (suited.length >= 5) {
      flushCards = suited;
      const sf = findStraight(suited);
      if (sf) {
        const cat = sf.high === 14 ? 9 : 8;
        return make(8, [sf.high, sf.high - 1, sf.high - 2, sf.high - 3, sf.high - 4], sf.cards, cat, { high: sf.high });
      }
    }
  }

  const g = [...groups.values()].sort((a, b) => b.length - a.length || b[0].r - a[0].r);
  const kickers = (used, n) => cards.filter((c) => !used.includes(c)).slice(0, n);

  if (g[0].length === 4) {
    const k = kickers(g[0], 1);
    return make(7, [g[0][0].r, g[0][0].r, g[0][0].r, g[0][0].r, k[0]?.r], [...g[0], ...k], 7, { rank: g[0][0].r });
  }
  if (g[0].length === 3 && g[1] && g[1].length >= 2) {
    const t = g[0], p = g[1].slice(0, 2);
    return make(6, [t[0].r, t[0].r, t[0].r, p[0].r, p[0].r], [...t, ...p], 6, { rank: t[0].r, over: p[0].r });
  }
  if (flushCards) {
    const f = flushCards.slice(0, 5);
    return make(5, f.map((c) => c.r), f, 5, { high: f[0].r });
  }
  const st = findStraight(cards);
  if (st) return make(4, [st.high, st.high - 1, st.high - 2, st.high - 3, st.high - 4], st.cards, 4, { high: st.high });
  if (g[0].length === 3) {
    const k = kickers(g[0], 2);
    return make(3, [g[0][0].r, g[0][0].r, g[0][0].r, ...k.map((c) => c.r)], [...g[0], ...k], 3, { rank: g[0][0].r });
  }
  if (g[0].length === 2 && g[1] && g[1].length === 2) {
    const used = [...g[0], ...g[1]];
    const k = kickers(used, 1);
    return make(2, [g[0][0].r, g[0][0].r, g[1][0].r, g[1][0].r, k[0]?.r], [...used, ...k], 2, { rank: g[0][0].r, low: g[1][0].r });
  }
  if (g[0].length === 2) {
    const k = kickers(g[0], 3);
    return make(1, [g[0][0].r, g[0][0].r, ...k.map((c) => c.r)], [...g[0], ...k], 1, { rank: g[0][0].r });
  }
  const top = cards.slice(0, 5);
  return make(0, top.map((c) => c.r), top, 0, { high: top[0].r });
}

function make(cat, ranks, best, displayCat, info) {
  return { cat, displayCat, score: score(cat, ranks), best, name: describe(displayCat, info), info };
}

function describe(cat, i) {
  const N = RANK_NAME_FR, P = RANK_PLURAL_FR;
  const de = (r) => (r === 14 ? "d'As" : `de ${P[r]}`);
  const au = (r) => (r === 14 ? "à l'As" : r === 11 ? 'au Valet' : r === 12 ? 'à la Dame' : r === 13 ? 'au Roi' : `au ${N[r]}`);
  switch (cat) {
    case 9: return 'Quinte flush royale';
    case 8: return `Quinte flush ${au(i.high)}`;
    case 7: return `Carré ${de(i.rank)}`;
    case 6: return `Full aux ${P[i.rank]} par les ${P[i.over]}`;
    case 5: return `Couleur ${au(i.high)}`;
    case 4: return `Quinte ${au(i.high)}`;
    case 3: return `Brelan ${de(i.rank)}`;
    case 2: return `Double paire ${P[i.rank]} et ${P[i.low]}`;
    case 1: return `Paire ${de(i.rank)}`;
    default: return `Hauteur ${N[i.high]}`;
  }
}

export const compare = (a, b) => a.score - b.score;
