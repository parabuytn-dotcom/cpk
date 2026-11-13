// Cartes : { r: 2..14, s: 0..3, id: 'As' }
export const SUITS = ['s', 'h', 'd', 'c'];
export const SUIT_SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAME_FR = { s: 'Pique', h: 'Cœur', d: 'Carreau', c: 'Trèfle' };
export const SUIT_NAME_EN = { s: 'Spades', h: 'Hearts', d: 'Diamonds', c: 'Clubs' };
export const RANK_CHARS = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const CHAR_RANK = Object.fromEntries(Object.entries(RANK_CHARS).map(([r, c]) => [c, +r]));

export const RANK_LABEL = (r) => (r === 10 ? '10' : RANK_CHARS[r === 1 ? 14 : r]);
export const RANK_NAME_FR = {
  1: 'As', 2: 'Deux', 3: 'Trois', 4: 'Quatre', 5: 'Cinq', 6: 'Six', 7: 'Sept', 8: 'Huit', 9: 'Neuf', 10: 'Dix',
  11: 'Valet', 12: 'Dame', 13: 'Roi', 14: 'As'
};
export const RANK_PLURAL_FR = {
  1: 'As', 2: 'Deux', 3: 'Trois', 4: 'Quatre', 5: 'Cinq', 6: 'Six', 7: 'Sept', 8: 'Huit', 9: 'Neuf', 10: 'Dix',
  11: 'Valets', 12: 'Dames', 13: 'Rois', 14: 'As'
};

export function card(id) {
  const r = CHAR_RANK[id[0]];
  const s = SUITS.indexOf(id[1]);
  if (!r || s < 0) throw new Error('Carte invalide : ' + id);
  return { r, s, id };
}
export const cards = (str) => str.trim().split(/\s+/).filter(Boolean).map(card);

export function newDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s, id: RANK_CHARS[r] + SUITS[s] });
  return d;
}

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const isRed = (c) => c.s === 1 || c.s === 2;
export const suitChar = (c) => SUITS[c.s];
export const cardText = (c) => RANK_LABEL(c.r) + SUIT_SYMBOL[SUITS[c.s]];

/** Notation d'une main de départ : "AKs", "QJo", "77" */
export function handCode(h) {
  const [a, b] = h[0].r >= h[1].r ? h : [h[1], h[0]];
  if (a.r === b.r) return RANK_CHARS[a.r] + RANK_CHARS[b.r];
  return RANK_CHARS[a.r] + RANK_CHARS[b.r] + (a.s === b.s ? 's' : 'o');
}

export function remainingDeck(exclude) {
  const ex = new Set(exclude.map((c) => c.id));
  return newDeck().filter((c) => !ex.has(c.id));
}
