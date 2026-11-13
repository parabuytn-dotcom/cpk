// Moteur de Texas Hold'em No-Limit (cash game, 2 à 9 joueurs).
// Logique pure : chaque méthode renvoie une liste d'événements que l'interface anime.
import { newDeck, shuffle } from './cards.js';
import { evaluate } from './evaluator.js';

export const STREETS = ['preflop', 'flop', 'turn', 'river'];
export const STREET_FR = { preflop: 'Préflop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Abattage' };

export class Holdem {
  constructor(players, { sb = 10, bb = 20 } = {}) {
    this.players = players.map((p, i) => ({
      seat: i, name: p.name, stack: p.stack, isHuman: !!p.isHuman, persona: p.persona,
      hole: [], folded: true, allIn: false, bet: 0, total: 0, lastAction: null, out: p.stack <= 0
    }));
    this.sb = sb;
    this.bb = bb;
    this.dealer = -1;
    this.handNo = 0;
    this.board = [];
    this.pot = 0;
    this.street = 'preflop';
    this.handOver = true;
    this.toAct = -1;
    this.pending = new Set();
    this.lastAggressor = -1;
  }

  get n() { return this.players.length; }
  inHand(p) { return !p.folded && !p.out; }
  canAct(p) { return this.inHand(p) && !p.allIn; }
  next(from, pred) {
    for (let k = 1; k <= this.n; k++) {
      const i = (from + k) % this.n;
      if (pred(this.players[i], i)) return i;
    }
    return -1;
  }
  get totalPot() { return this.pot + this.players.reduce((s, p) => s + p.bet, 0); }
  get currentBet() { return Math.max(...this.players.map((p) => p.bet)); }
  activeCount() { return this.players.filter((p) => !p.out).length; }

  /** Position (UTG, BTN...) d'un siège pour la main en cours */
  positionName(seat) {
    const order = [];
    let i = this.dealer;
    for (let k = 0; k < this.n; k++) {
      if (!this.players[i].out) order.push(i);
      i = (i + 1) % this.n;
    }
    const n = order.length;
    const idx = order.indexOf(seat);
    if (idx < 0) return '';
    if (n === 2) return idx === 0 ? 'BTN' : 'BB';
    const names = { 2: ['BTN', 'BB'], 3: ['BTN', 'SB', 'BB'], 4: ['BTN', 'SB', 'BB', 'UTG'], 5: ['BTN', 'SB', 'BB', 'UTG', 'CO'], 6: ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'], 7: ['BTN', 'SB', 'BB', 'UTG', 'MP', 'HJ', 'CO'], 8: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'], 9: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'] };
    return names[n][idx];
  }

  startHand() {
    const ev = [];
    this.handNo++;
    for (const p of this.players) {
      p.out = p.stack <= 0;
      p.hole = []; p.folded = p.out; p.allIn = false; p.bet = 0; p.total = 0; p.lastAction = null;
    }
    if (this.activeCount() < 2) throw new Error('Pas assez de joueurs');
    this.deck = shuffle(newDeck());
    this.board = [];
    this.pot = 0;
    this.street = 'preflop';
    this.handOver = false;
    this.lastAggressor = -1;
    this.dealer = this.dealer < 0
      ? this.next(Math.floor(Math.random() * this.n) - 1 + this.n, (p) => !p.out)
      : this.next(this.dealer, (p) => !p.out);
    const heads = this.activeCount() === 2;
    this.sbSeat = heads ? this.dealer : this.next(this.dealer, (p) => !p.out);
    this.bbSeat = this.next(this.sbSeat, (p) => !p.out);
    ev.push({ type: 'hand', handNo: this.handNo, dealer: this.dealer, sbSeat: this.sbSeat, bbSeat: this.bbSeat });
    ev.push(this.post(this.sbSeat, this.sb, 'SB'));
    ev.push(this.post(this.bbSeat, this.bb, 'BB'));
    this.minRaise = this.bb;
    // distribution : une carte à la fois, en commençant à gauche du bouton
    for (let round = 0; round < 2; round++) {
      let i = this.dealer;
      for (let k = 0; k < this.n; k++) {
        i = (i + 1) % this.n;
        if (!this.players[i].out) this.players[i].hole.push(this.deck.pop());
      }
    }
    ev.push({ type: 'deal', order: this.dealOrder() });
    this.pending = new Set(this.players.filter((p) => this.canAct(p)).map((p) => p.seat));
    this.toAct = this.next(this.bbSeat, (p) => this.pending.has(p.seat));
    if (this.pending.size <= 1 && this.players.filter((p) => this.canAct(p)).every((p) => p.bet >= this.currentBet)) {
      ev.push(...this.endStreet());
    } else {
      ev.push({ type: 'turn', seat: this.toAct });
    }
    return ev;
  }

  dealOrder() {
    const order = [];
    for (let round = 0; round < 2; round++) {
      let i = this.dealer;
      for (let k = 0; k < this.n; k++) {
        i = (i + 1) % this.n;
        if (!this.players[i].out) order.push({ seat: i, index: round });
      }
    }
    return order;
  }

  post(seat, amount, kind) {
    const p = this.players[seat];
    const a = Math.min(amount, p.stack);
    p.stack -= a; p.bet += a; p.total += a;
    if (p.stack === 0) p.allIn = true;
    p.lastAction = kind;
    return { type: 'post', seat, amount: a, kind, bet: p.bet };
  }

  /** Ce que le joueur qui a la parole peut faire */
  legal(seat = this.toAct) {
    const p = this.players[seat];
    const toCall = Math.min(this.currentBet - p.bet, p.stack);
    const maxTo = p.bet + p.stack;
    const minTo = Math.min(this.currentBet + this.minRaise, maxTo);
    const canRaise = maxTo > this.currentBet && this.players.some((o) => o.seat !== seat && this.canAct(o));
    return { toCall, canCheck: toCall === 0, minTo, maxTo, canRaise, currentBet: this.currentBet, pot: this.totalPot, stack: p.stack, bet: p.bet };
  }

  act(action) {
    if (this.handOver) return [];
    const ev = [];
    const seat = this.toAct;
    const p = this.players[seat];
    const L = this.legal(seat);
    let { type } = action;
    let label = type;
    if (type === 'check' && !L.canCheck) type = 'call';
    if (type === 'allin') {
      const to = L.maxTo;
      type = to > L.currentBet && L.canRaise ? 'raise' : 'call';
      action = { type, to };
    }
    if (type === 'raise' && !L.canRaise) type = L.canCheck ? 'check' : 'call';

    if (type === 'fold') {
      p.folded = true;
      label = 'fold';
    } else if (type === 'check') {
      label = 'check';
    } else if (type === 'call') {
      const amt = L.toCall;
      p.stack -= amt; p.bet += amt; p.total += amt;
      if (p.stack === 0) p.allIn = true;
      label = amt === 0 ? 'check' : p.allIn ? 'allin' : 'call';
    } else if (type === 'raise') {
      let to = Math.round(action.to);
      to = Math.max(L.minTo, Math.min(L.maxTo, to));
      const add = to - p.bet;
      const wasBet = L.currentBet === 0;
      const raiseSize = to - L.currentBet;
      p.stack -= add; p.bet = to; p.total += add;
      if (p.stack === 0) p.allIn = true;
      if (raiseSize >= this.minRaise) this.minRaise = raiseSize;
      this.lastAggressor = seat;
      // tous les autres doivent reparler
      this.pending = new Set(this.players.filter((o) => o.seat !== seat && this.canAct(o)).map((o) => o.seat));
      label = p.allIn ? 'allin' : wasBet ? 'bet' : 'raise';
    }
    p.lastAction = label;
    this.pending.delete(seat);
    ev.push({ type: 'action', seat, action: label, bet: p.bet, stack: p.stack, pot: this.totalPot });

    const alive = this.players.filter((q) => this.inHand(q));
    if (alive.length === 1) {
      ev.push(...this.collect());
      const w = alive[0];
      const amount = this.pot;
      w.stack += amount;
      this.pot = 0;
      this.handOver = true;
      ev.push({ type: 'win', uncontested: true, pots: [{ amount, winners: [w.seat], hand: null }] });
      return ev;
    }
    if (this.pending.size === 0) {
      ev.push(...this.endStreet());
    } else {
      this.toAct = this.next(seat, (q) => this.pending.has(q.seat));
      ev.push({ type: 'turn', seat: this.toAct });
    }
    return ev;
  }

  collect() {
    const ev = [];
    const bets = this.players.map((p) => p.bet);
    const max = Math.max(...bets);
    if (max > 0) {
      const top = this.players.filter((p) => p.bet === max);
      if (top.length === 1) {
        const second = Math.max(...this.players.filter((p) => p !== top[0]).map((p) => p.bet));
        const refund = max - second;
        if (refund > 0) {
          const t = top[0];
          t.bet -= refund; t.total -= refund; t.stack += refund;
          if (t.stack > 0) t.allIn = false;
          ev.push({ type: 'refund', seat: t.seat, amount: refund });
        }
      }
      const amounts = this.players.map((p) => ({ seat: p.seat, amount: p.bet }));
      for (const p of this.players) { this.pot += p.bet; p.bet = 0; }
      ev.push({ type: 'collect', amounts, pot: this.pot });
    }
    return ev;
  }

  endStreet() {
    const ev = this.collect();
    const alive = this.players.filter((p) => this.inHand(p));
    const actors = alive.filter((p) => !p.allIn);
    const runout = actors.length <= 1;
    if (runout && alive.length > 1 && this.street !== 'river') {
      ev.push({ type: 'reveal', seats: alive.map((p) => ({ seat: p.seat, hole: p.hole })) });
    }
    while (true) {
      if (this.street === 'river') {
        ev.push(...this.showdown());
        return ev;
      }
      const nextStreet = STREETS[STREETS.indexOf(this.street) + 1];
      this.street = nextStreet;
      this.deck.pop(); // carte brûlée
      const count = nextStreet === 'flop' ? 3 : 1;
      const dealt = [];
      for (let i = 0; i < count; i++) dealt.push(this.deck.pop());
      this.board.push(...dealt);
      ev.push({ type: 'board', street: nextStreet, cards: dealt, board: this.board.slice() });
      for (const p of this.players) if (this.inHand(p) && !p.allIn) p.lastAction = null;
      if (!runout) break;
    }
    this.minRaise = this.bb;
    this.pending = new Set(actors.map((p) => p.seat));
    this.toAct = this.next(this.dealer, (p) => this.pending.has(p.seat));
    ev.push({ type: 'turn', seat: this.toAct });
    return ev;
  }

  /** Découpe le pot principal et les pots annexes (side pots) */
  buildPots() {
    const rest = this.players.map((p) => ({ p, amt: p.total }));
    const pots = [];
    let guard = 0;
    while (rest.some((x) => x.amt > 0) && guard++ < 20) {
      const live = rest.filter((x) => x.amt > 0 && this.inHand(x.p));
      if (!live.length) {
        const extra = rest.reduce((s, x) => s + x.amt, 0);
        if (pots.length) pots[pots.length - 1].amount += extra;
        break;
      }
      const cap = Math.min(...live.map((x) => x.amt));
      let amount = 0;
      for (const x of rest) { const t = Math.min(x.amt, cap); amount += t; x.amt -= t; }
      const eligible = live.map((x) => x.p.seat);
      const prev = pots[pots.length - 1];
      if (prev && prev.eligible.join() === eligible.join()) prev.amount += amount;
      else pots.push({ amount, eligible });
    }
    return pots;
  }

  showdown() {
    const ev = [];
    this.street = 'showdown';
    const alive = this.players.filter((p) => this.inHand(p));
    const hands = {};
    for (const p of alive) hands[p.seat] = evaluate([...p.hole, ...this.board]);
    // ordre d'abattage : dernier agresseur d'abord, sinon premier à gauche du bouton
    const first = this.lastAggressor >= 0 && this.inHand(this.players[this.lastAggressor])
      ? this.lastAggressor : this.next(this.dealer, (p) => this.inHand(p));
    const order = [];
    for (let k = 0; k < this.n; k++) {
      const i = (first + k) % this.n;
      if (this.inHand(this.players[i])) order.push(i);
    }
    ev.push({ type: 'showdown', reveals: order.map((s) => ({ seat: s, hole: this.players[s].hole, hand: hands[s] })) });
    const pots = this.buildPots();
    const results = [];
    for (const pot of pots) {
      const best = Math.max(...pot.eligible.map((s) => hands[s].score));
      const winners = pot.eligible.filter((s) => hands[s].score === best);
      const share = Math.floor(pot.amount / winners.length);
      let odd = pot.amount - share * winners.length;
      // jeton impair : premier gagnant à gauche du bouton
      const sorted = winners.slice().sort((a, b) => ((a - this.dealer - 1 + this.n) % this.n) - ((b - this.dealer - 1 + this.n) % this.n));
      for (const s of sorted) {
        this.players[s].stack += share + (odd > 0 ? 1 : 0);
        odd--;
      }
      results.push({ amount: pot.amount, winners, hand: hands[winners[0]], eligible: pot.eligible });
    }
    this.pot = 0;
    this.handOver = true;
    ev.push({ type: 'win', uncontested: false, pots: results, hands });
    return ev;
  }
}
