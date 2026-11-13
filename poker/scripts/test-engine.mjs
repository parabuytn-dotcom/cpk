import { cards } from '../src/poker/cards.js';
import { evaluate } from '../src/poker/evaluator.js';
import { Holdem } from '../src/poker/game.js';
import { decide } from '../src/poker/bots.js';
import { advise } from '../src/poker/coach.js';
import { outs, equity } from '../src/poker/equity.js';

let fail = 0;
const eq = (a, b, msg) => { if (a !== b) { fail++; console.error('FAIL', msg, a, '!==', b); } };
const name = (s) => evaluate(cards(s)).name;
eq(name('Ah Kh Qh Jh Th 2c 3d'), 'Quinte flush royale', 'royal');
eq(name('5h 4h 3h 2h Ah Kc Kd'), 'Quinte flush au Cinq', 'steel wheel');
eq(name('9s 9h 9d 9c 2h 3c 4d'), 'Carré de Neuf', 'quads');
eq(name('Ks Kh Kd 2c 2h 3c 3d'), 'Full aux Rois par les Trois', 'full');
eq(name('As Ah Ad Kc Kh Kd 2c'), "Full aux As par les Rois", 'double trips');
eq(name('2s 7s 9s Js Ks Ah Ad'), 'Couleur au Roi', 'flush');
eq(name('As 2d 3h 4c 5s Kd Kh'), 'Quinte au Cinq', 'wheel');
eq(name('Ts Jd Qh Kc As 2d 2h'), "Quinte à l'As", 'broadway');
eq(name('7s 7d 7h Ac 2s 3d 9h'), 'Brelan de Sept', 'trips');
eq(name('As Ad 7h 7c 3s 3d 9h'), 'Double paire As et Sept', 'two pair (3 pairs)');
eq(name('As Ad 7h 8c 3s 4d 9h'), "Paire d'As", 'pair');
eq(name('As Jd 7h 8c 3s 4d 9h'), 'Hauteur As', 'high');
const cmp = (a, b) => Math.sign(evaluate(cards(a)).score - evaluate(cards(b)).score);
eq(cmp('As Ad Kh 7c 3s 4d 9h', 'As Ad Qh 7c 3s 4d 9h'), 1, 'kicker');
eq(cmp('2s 3d 4h 5c 6s Kd Kh', '2s 3d 4h 5c As Kd Kh'), 1, '6-high straight beats wheel');
eq(cmp('Ah Kd 2c 2d 7h 7s 9c', 'Qh Jd 2c 2d 7h 7s 9c'), 1, 'two pair kicker');
eq(cmp('Ah 3d Ks Kd Qh Qs Jc', '2h 3c Ks Kd Qh Qs Jc'), 1, 'board kicker');
eq(cmp('4h 3d Ks Kd Qh Qs Jc', '2h 3c Ks Kd Qh Qs Jc'), 0, 'split board');

const o = outs(cards('Ah Kh'), cards('Qh 7h 2c'));
eq(o.count, 9, 'flush outs');
const o2 = outs(cards('9c 8d'), cards('7h 6s Kc'));
eq(o2.count, 8, 'OESD outs');
const e = equity(cards('As Ad'), [], 1, 4000);
if (e < 0.82 || e > 0.88) { fail++; console.error('FAIL AA equity', e); }

// simulation : conservation des jetons et pas de blocage
const personas = ['rock', 'tag', 'fish', 'maniac', 'pro', 'tag'];
let hands = 0, showdowns = 0, sidepots = 0;
for (let t = 0; t < 40; t++) {
  const g = new Holdem(personas.map((p, i) => ({ name: 'B' + i, stack: 400 + Math.floor(Math.random() * 3000), persona: p })), { sb: 10, bb: 20 });
  for (let h = 0; h < 60; h++) {
    for (const p of g.players) if (p.stack <= 0) p.stack = 2000;
    const before = g.players.reduce((s, p) => s + p.stack, 0);
    let ev = g.startHand();
    let steps = 0;
    while (!g.handOver) {
      if (steps++ > 200) { fail++; console.error('FAIL stuck'); break; }
      if (steps === 1 && h % 10 === 0) advise(g, g.toAct);
      const L = g.legal(g.toAct);
      const p = g.players[g.toAct];
      if (!g.canAct(p)) { fail++; console.error('FAIL non-actor to act'); break; }
      ev = g.act(decide(g, g.toAct));
      for (const x of ev) {
        if (x.type === 'showdown') showdowns++;
        if (x.type === 'win' && x.pots.length > 1) sidepots++;
      }
    }
    const after = g.players.reduce((s, p) => s + p.stack, 0);
    if (before !== after) { fail++; console.error('FAIL chips', before, after); }
    if (g.players.some((p) => p.stack < 0)) { fail++; console.error('FAIL neg stack'); }
    hands++;
  }
}
console.log({ hands, showdowns, sidepots, fail });
process.exit(fail ? 1 : 0);
