// Adversaires : chaque bot a un style de jeu réel qu'on apprend à reconnaître.
import { chen, equity } from './equity.js';

export const PERSONAS = {
  rock: { style: 'Le Roc', en: 'Rock / Nit', desc: 'Ultra-serré : il ne joue que des monstres. Quand il mise, crois-le.', play: 10, raise: 12, threeBet: 15, aggr: 0.45, bluff: 0.02, margin: 0.06 },
  tag: { style: 'Le Requin', en: 'TAG (tight-aggressive)', desc: 'Serré et agressif : le style gagnant. Peu de mains, mais jouées fort.', play: 8, raise: 9, threeBet: 12, aggr: 0.7, bluff: 0.1, margin: 0.02 },
  fish: { style: 'Le Poisson', en: 'Calling station', desc: 'Il suit tout et ne se couche jamais. Ne bluffe pas contre lui : mise tes bonnes mains.', play: 3, raise: 14, threeBet: 18, aggr: 0.15, bluff: 0.03, margin: -0.1 },
  maniac: { style: 'Le Maniaque', en: 'LAG / Maniac', desc: 'Il relance tout le temps et bluffe beaucoup. Laisse-le miser quand tu es fort.', play: 4, raise: 6, threeBet: 9, aggr: 0.85, bluff: 0.35, margin: -0.02 },
  pro: { style: 'Le Pro', en: 'Balanced regular', desc: 'Équilibré : il mélange valeur et bluffs, et s\'adapte à la position.', play: 7, raise: 8, threeBet: 11, aggr: 0.6, bluff: 0.14, margin: 0.0 }
};

const rnd = Math.random;
const roundTo = (x, step) => Math.max(step, Math.round(x / step) * step);

export function decide(game, seat) {
  const p = game.players[seat];
  const P = PERSONAS[p.persona] || PERSONAS.pro;
  const L = game.legal(seat);
  const bb = game.bb;
  const opponents = game.players.filter((o) => o.seat !== seat && game.inHand(o)).length;
  const pos = game.positionName(seat);
  const late = ['BTN', 'CO', 'SB'].includes(pos);
  const raiseTo = (to) => (L.canRaise ? { type: 'raise', to: Math.min(L.maxTo, Math.max(L.minTo, roundTo(to, 5))) } : null);
  const passive = () => (L.canCheck ? { type: 'check' } : { type: 'fold' });

  if (game.street === 'preflop') {
    const s = chen(p.hole) + (late ? 1 : 0) + (rnd() - 0.5) * 1.5;
    const raised = L.currentBet > bb;
    if (!raised) {
      if (s >= P.raise) {
        const limpers = game.players.filter((o) => o.bet === bb && o.seat !== game.bbSeat).length;
        return raiseTo(bb * (2.5 + rnd()) + limpers * bb) || { type: 'call' };
      }
      if (s >= P.play) return L.canCheck ? (rnd() < P.aggr * 0.3 ? raiseTo(bb * 3) || { type: 'check' } : { type: 'check' }) : { type: 'call' };
      if (L.canCheck) return { type: 'check' };
      if (pos === 'SB' && s >= P.play - 2) return { type: 'call' };
      return rnd() < P.bluff * 0.4 && late ? raiseTo(bb * 3) || { type: 'fold' } : { type: 'fold' };
    }
    // face à une relance
    const priceBB = L.toCall / bb;
    if (s >= P.threeBet) return raiseTo(L.currentBet * 3) || { type: 'call' };
    if (L.toCall >= p.stack * 0.5) return s >= P.threeBet - 1 ? { type: 'call' } : { type: 'fold' };
    if (s >= P.raise - 1 || (s >= P.play && priceBB <= 3)) return { type: 'call' };
    if (rnd() < P.bluff * 0.25) return raiseTo(L.currentBet * 3) || { type: 'fold' };
    return { type: 'fold' };
  }

  // postflop : on estime ses chances par simulation
  const eq = equity(p.hole, game.board, Math.min(opponents, 4), 260);
  const pot = L.pot;
  const potOdds = L.toCall / (pot + L.toCall || 1);
  const bet = (frac) => raiseTo(L.currentBet + (pot + L.toCall) * frac);
  const strongThr = 0.55 + opponents * 0.04 - P.aggr * 0.08;

  if (L.toCall === 0) {
    if (eq > strongThr && rnd() < 0.55 + P.aggr * 0.4) return bet(0.5 + rnd() * 0.35) || { type: 'check' };
    if (eq > 0.45 && rnd() < P.aggr * 0.45) return bet(0.4 + rnd() * 0.2) || { type: 'check' };
    if (rnd() < P.bluff * (opponents === 1 ? 1.3 : 0.7)) return bet(0.45 + rnd() * 0.3) || { type: 'check' };
    return { type: 'check' };
  }
  if (eq > strongThr + 0.15 && rnd() < P.aggr) return bet(0.7 + rnd() * 0.5) || { type: 'call' };
  if (eq > potOdds + P.margin) return { type: 'call' };
  if (L.toCall <= bb && eq > 0.18) return { type: 'call' };
  if (rnd() < P.bluff * 0.25 && L.toCall < p.stack * 0.3) return bet(1) || passive();
  return passive();
}
