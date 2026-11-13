// Le coach : analyse la situation du joueur et explique la bonne décision.
import { equity, outs, tierOf, TIER_INFO, ruleOf24 } from './equity.js';
import { evaluate } from './evaluator.js';
import { handCode } from './cards.js';

export const POSITION_INFO = {
  BTN: { fr: 'Bouton (Dealer)', tip: 'La meilleure place : tu parles en dernier après le flop. Tu peux jouer beaucoup de mains.' },
  CO: { fr: 'Cutoff', tip: 'Juste avant le bouton : une position tardive, très bonne pour attaquer.' },
  HJ: { fr: 'Hijack', tip: 'Position moyenne : sois un peu sélectif.' },
  LJ: { fr: 'Lojack', tip: 'Position moyenne-début : reste sélectif.' },
  MP: { fr: 'Milieu de parole', tip: 'Position moyenne : joue les mains solides.' },
  UTG: { fr: 'Under the Gun', tip: 'Tu parles en premier préflop : joue seulement des mains fortes.' },
  'UTG+1': { fr: 'Under the Gun +1', tip: 'Très tôt dans la parole : mains fortes uniquement.' },
  SB: { fr: 'Petite blinde', tip: 'Tu as déjà mis la moitié de la mise, mais tu parles en premier après le flop. Pas idéal.' },
  BB: { fr: 'Grosse blinde', tip: 'Tu as déjà payé la grosse blinde : tu parles en dernier préflop et peux souvent voir le flop pour pas cher.' }
};

const MAX_TIER_OPEN = { UTG: 3, 'UTG+1': 2, MP: 3, LJ: 3, HJ: 3, CO: 4, BTN: 5, SB: 4, BB: 2 };

export function advise(game, seat) {
  const p = game.players[seat];
  const L = game.legal(seat);
  const bb = game.bb;
  const pos = game.positionName(seat);
  const opponents = game.players.filter((o) => o.seat !== seat && game.inHand(o)).length;
  const eq = equity(p.hole, game.board, opponents, 1400);
  const potOdds = L.toCall > 0 ? L.toCall / (L.pot + L.toCall) : 0;
  const res = {
    street: game.street, pos, posInfo: POSITION_INFO[pos], opponents, equity: eq,
    toCall: L.toCall, pot: L.pot, potOdds, why: [], rec: null
  };
  const bet = (frac) => Math.min(L.maxTo, Math.max(L.minTo, Math.round((L.currentBet + (L.pot + L.toCall) * frac) / 5) * 5));

  if (game.street === 'preflop') {
    const tier = tierOf(p.hole);
    res.preflop = { code: handCode(p.hole), tier, info: TIER_INFO[tier] };
    const raised = L.currentBet > bb;
    const maxTier = MAX_TIER_OPEN[pos] ?? 3;
    if (!raised) {
      if (tier <= maxTier || (tier <= 2)) {
        const limpers = game.players.filter((o) => o.bet === bb && o.seat !== game.bbSeat && o.seat !== seat).length;
        const to = Math.min(L.maxTo, bb * 3 + limpers * bb);
        res.rec = { action: 'raise', to, label: `Relance à ${to}` };
        res.why.push(`${res.preflop.code} est une main « ${TIER_INFO[tier].label} ».`);
        res.why.push(`Depuis ta position (${pos}), on ouvre en relançant à environ 3 grosses blindes${limpers ? ` (+1 par limpeur)` : ''}. Ne te contente pas de suivre : relancer te donne l'initiative.`);
      } else if (L.canCheck) {
        res.rec = { action: 'check', label: 'Check' };
        res.why.push('Personne n\'a relancé et tu es à la grosse blinde : tu vois le flop gratuitement.');
      } else if (pos === 'SB' && tier <= 5) {
        res.rec = { action: 'call', label: `Compléter (${L.toCall})` };
        res.why.push('À la petite blinde, compléter pour pas cher est acceptable avec une main spéculative.');
      } else {
        res.rec = { action: 'fold', label: 'Se coucher' };
        res.why.push(`${res.preflop.code} (${TIER_INFO[tier].label}) est trop faible pour être jouée depuis ${pos}.`);
        res.why.push('Se coucher préflop ne coûte rien : la patience, c\'est la base du poker gagnant.');
      }
    } else {
      const priceBB = L.toCall / bb;
      if (tier === 1) {
        const to = Math.min(L.maxTo, L.currentBet * 3);
        res.rec = { action: 'raise', to, label: `3-bet à ${to}` };
        res.why.push(`${res.preflop.code} fait partie des toutes meilleures mains : on sur-relance (3-bet) pour faire grossir le pot.`);
      } else if (tier === 2 || (tier === 3 && priceBB <= 4 && ['BTN', 'CO', 'BB'].includes(pos))) {
        res.rec = { action: 'call', label: `Suivre ${L.toCall}` };
        res.why.push(`Quelqu'un a relancé. ${res.preflop.code} est assez forte pour suivre et voir le flop.`);
      } else if (L.canCheck) {
        res.rec = { action: 'check', label: 'Check' };
      } else {
        res.rec = { action: 'fold', label: 'Se coucher' };
        res.why.push(`Face à une relance, ${res.preflop.code} n'est pas assez forte. Les relanceurs ont souvent de grosses mains.`);
      }
    }
    return res;
  }

  const hand = evaluate([...p.hole, ...game.board]);
  const boardHand = evaluate(game.board);
  res.hand = hand;
  res.playsBoard = hand.score === boardHand.score && game.board.length === 5;
  if (game.street !== 'river') {
    const o = outs(p.hole, game.board);
    res.outs = { ...o, pct: ruleOf24(o.count, game.street) };
  }
  const pct = Math.round(eq * 100);
  if (L.toCall === 0) {
    if (eq >= 0.62) {
      const to = bet(0.66);
      res.rec = { action: 'raise', to, label: `Miser ${to - p.bet}` };
      res.why.push(`Avec ~${pct} % de chances de gagner, ta main est probablement devant : mise « pour la valeur » (≈ 2/3 du pot) pour te faire payer par des mains moins bonnes.`);
    } else if (eq >= 0.45 && opponents <= 2) {
      const to = bet(0.5);
      res.rec = { action: 'raise', to, label: `Miser ${to - p.bet}` };
      res.why.push(`~${pct} % : main correcte. Une mise d'un demi-pot protège ta main contre les tirages et peut faire coucher mieux.`);
    } else {
      res.rec = { action: 'check', label: 'Check' };
      res.why.push(`~${pct} % seulement : inutile de mettre de l'argent. Check et regarde la prochaine carte gratuitement.`);
    }
  } else {
    const need = Math.round(potOdds * 100);
    res.why.push(`Tu dois payer ${L.toCall} pour gagner un pot de ${L.pot + L.toCall} : il te faut au moins ${need} % de chances (cote du pot).`);
    if (eq >= 0.72 && L.canRaise) {
      const to = bet(0.9);
      res.rec = { action: 'raise', to, label: `Relancer à ${to}` };
      res.why.push(`Tu as ~${pct} % : bien plus que nécessaire. Relance pour gagner un plus gros pot.`);
    } else if (eq >= potOdds + 0.03) {
      res.rec = { action: 'call', label: `Suivre ${L.toCall}` };
      res.why.push(`Tu as ~${pct} % ≥ ${need} % : suivre est rentable sur le long terme.`);
    } else {
      res.rec = { action: 'fold', label: 'Se coucher' };
      res.why.push(`Tu as ~${pct} % < ${need} % : suivre perd de l'argent à long terme. Couche-toi.`);
    }
  }
  if (res.outs && res.outs.count >= 4 && hand.cat < 4) {
    res.why.push(`Tu as ${res.outs.count} outs${res.outs.draws.length ? ` (${res.outs.draws.join(', ')})` : ''} : règle du ${game.street === 'flop' ? '4' : '2'} → environ ${res.outs.pct} % d'améliorer ta main d'ici la river.`);
  }
  return res;
}

/** Phrase pédagogique qui décrit l'action d'un joueur */
export function narrate(game, ev) {
  const p = game.players[ev.seat];
  const n = p.isHuman ? 'Tu' : p.name;
  const v = (fr2, fr3) => (p.isHuman ? fr2 : fr3);
  switch (ev.action) {
    case 'fold': return `${n} ${v('te couches', 'se couche')} (fold).`;
    case 'check': return `${n} ${v('checkes', 'checke')} (check) : ${v('tu passes', 'il passe')} la parole sans miser.`;
    case 'call': return `${n} ${v('suis', 'suit')} (call) à ${ev.bet}.`;
    case 'bet': return `${n} ${v('mises', 'mise')} ${ev.bet} (bet).`;
    case 'raise': return `${n} ${v('relances', 'relance')} à ${ev.bet} (raise).`;
    case 'allin': return `${n} ${v('fais', 'fait')} TAPIS (all-in) pour ${ev.bet} !`;
    default: return '';
  }
}

export const STREET_EXPLAIN = {
  preflop: 'Préflop : chacun a reçu 2 cartes privées. La parole commence à gauche de la grosse blinde.',
  flop: 'Le Flop : le croupier brûle une carte puis retourne 3 cartes communes. Nouveau tour d\'enchères, en commençant à gauche du bouton.',
  turn: 'La Turn : 4ᵉ carte commune. Les mises deviennent plus sérieuses.',
  river: 'La River : 5ᵉ et dernière carte commune. Dernier tour d\'enchères !',
  showdown: 'Abattage (showdown) : les joueurs restants montrent leurs cartes. La meilleure main de 5 cartes gagne.'
};
