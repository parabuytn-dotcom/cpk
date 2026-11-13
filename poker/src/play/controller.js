// Fait le lien entre le moteur (règles) et la scène 3D (animations).
import { decide } from '../poker/bots.js';
import { narrate, STREET_EXPLAIN } from '../poker/coach.js';
import { STREET_FR } from '../poker/game.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class TableController {
  constructor(scene, game, hooks = {}) {
    this.scene = scene;
    this.game = game;
    this.hooks = hooks;
    this.revealed = new Set();
    this.stopped = false;
    this.lastWin = null;
  }

  log(text, kind = 'info') { this.hooks.log?.(text, kind); }
  state() { this.hooks.onState?.(); }
  pace(ms) { return sleep(ms / (this.scene.speed || 1)); }

  syncStacks() {
    this.game.players.forEach((p, i) => this.scene.setStack(i, p.stack));
  }

  async playHand() {
    const g = this.game;
    const sc = this.scene;
    this.revealed = new Set();
    this.lastWin = null;
    await sc.clearTable();
    sc.highlight([]);
    this.syncStacks();
    let events = g.startHand();
    this.state();
    await this.process(events);
    while (!g.handOver && !this.stopped) {
      const seat = g.toAct;
      const p = g.players[seat];
      let action;
      if (p.isHuman) {
        action = await this.hooks.askHuman();
        if (this.stopped) return;
      } else {
        const av = sc.avatars[seat];
        av?.play('think');
        await this.pace(450 + Math.random() * 900);
        action = decide(g, seat);
        av?.stopThink();
      }
      events = g.act(action);
      await this.process(events);
    }
    sc.setActive(-1);
    this.state();
  }

  async process(events) {
    const g = this.game;
    const sc = this.scene;
    for (const ev of events) {
      if (this.stopped) return;
      switch (ev.type) {
        case 'hand':
          this.log(`— Main n°${ev.handNo} — Bouton : ${g.players[ev.dealer].isHuman ? 'toi' : g.players[ev.dealer].name}`, 'hand');
          await sc.moveDealer(ev.dealer);
          break;
        case 'post': {
          const p = g.players[ev.seat];
          sc.setStack(ev.seat, p.stack);
          await sc.setBet(ev.seat, ev.bet);
          this.log(`${p.isHuman ? 'Tu poses' : p.name + ' pose'} la ${ev.kind === 'SB' ? 'petite blinde' : 'grosse blinde'} (${ev.amount}).`, 'muted');
          break;
        }
        case 'deal': {
          const holes = g.players.map((p) => (p.isHuman || this.hooks.showBots?.() ? p.hole : null));
          await sc.dealHole(ev.order, holes);
          this.hooks.onDealt?.();
          if (g.players[0].isHuman) await sc.revealHero();
          if (this.hooks.showBots?.()) {
            await Promise.all(g.players.map((p, i) => (!p.isHuman && !p.out ? sc.reveal(i, p.hole) : null)));
          }
          this.log(STREET_EXPLAIN.preflop, 'street');
          break;
        }
        case 'turn':
          sc.setActive(ev.seat);
          this.state();
          break;
        case 'action': {
          const p = g.players[ev.seat];
          const av = sc.avatars[ev.seat];
          const animMap = { fold: 'fold', check: 'check', call: 'bet', bet: 'bet', raise: 'bet', allin: 'allin' };
          av?.play(animMap[ev.action]);
          this.hooks.onAction?.(ev);
          window.__sfx?.(ev.action === 'check' ? 'knock' : ev.action === 'fold' ? 'fold' : ev.action === 'allin' ? 'allin' : null);
          this.log(narrate(g, ev), ev.action === 'allin' ? 'alert' : 'action');
          if (ev.action === 'fold') {
            av?.setFolded(true);
            await sc.foldCards(ev.seat);
          } else if (ev.action !== 'check') {
            sc.setStack(ev.seat, p.stack);
            await sc.setBet(ev.seat, ev.bet);
          } else {
            await this.pace(250);
          }
          this.state();
          await this.pace(150);
          break;
        }
        case 'refund': {
          const p = g.players[ev.seat];
          this.log(`${p.isHuman ? 'Ta' : 'La'} mise non suivie (${ev.amount}) est rendue${p.isHuman ? '' : ' à ' + p.name}.`, 'muted');
          sc.setStack(ev.seat, p.stack);
          const remain = (sc.bets[ev.seat]?.userData.amount || 0) - ev.amount;
          if (remain > 0) await sc.setBet(ev.seat, remain); else await sc.setBet(ev.seat, 0);
          break;
        }
        case 'collect':
          sc.setActive(-1);
          await sc.collectBets(ev.pot);
          this.state();
          break;
        case 'reveal':
          this.log('Tapis et suivi : les cartes sont retournées, le reste du board est distribué.', 'alert');
          await Promise.all(ev.seats.map(({ seat, hole }) => { this.revealed.add(seat); return g.players[seat].isHuman ? null : sc.reveal(seat, hole); }));
          this.state();
          await this.pace(500);
          break;
        case 'board':
          await this.pace(350);
          this.log(`${STREET_FR[ev.street]} : ${ev.cards.map((c) => c.id).join(' ')}. ${STREET_EXPLAIN[ev.street].split(':').slice(1).join(':').trim()}`, 'street');
          await sc.dealBoard(ev.cards, ev.board.length - ev.cards.length);
          this.hooks.onBoard?.();
          this.state();
          break;
        case 'showdown':
          sc.setActive(-1);
          this.log(STREET_EXPLAIN.showdown, 'street');
          for (const r of ev.reveals) {
            this.revealed.add(r.seat);
            if (!g.players[r.seat].isHuman) await sc.reveal(r.seat, r.hole);
            const p = g.players[r.seat];
            this.log(`${p.isHuman ? 'Tu montres' : p.name + ' montre'} ${r.hole.map((c) => c.id).join(' ')} → ${r.hand.name}.`, 'show');
            this.state();
            await this.pace(380);
          }
          break;
        case 'win':
          await this.win(ev);
          break;
      }
    }
  }

  async win(ev) {
    const g = this.game;
    const sc = this.scene;
    const perSeat = new Map();
    for (const pot of ev.pots) {
      const share = Math.floor(pot.amount / pot.winners.length);
      for (const s of pot.winners) perSeat.set(s, (perSeat.get(s) || 0) + share);
    }
    const main = ev.pots[0];
    if (!ev.uncontested && main.hand) {
      sc.highlight(main.hand.best.map((c) => c.id));
    }
    ev.pots.forEach((pot, i) => {
      const names = pot.winners.map((s) => (g.players[s].isHuman ? 'Tu' : g.players[s].name));
      const label = ev.pots.length > 1 ? (i === 0 ? 'le pot principal' : `le pot annexe n°${i}`) : 'le pot';
      const verb = pot.winners.length > 1 ? 'se partagent' : names[0] === 'Tu' ? 'remportes' : 'remporte';
      this.log(`${names.join(' et ')} ${verb} ${label} (${pot.amount})${pot.hand && !ev.uncontested ? ' avec ' + pot.hand.name : ' — tout le monde s\'est couché'}.`, 'win');
    });
    await this.pace(ev.uncontested ? 200 : 700);
    await sc.awardPot([...perSeat.entries()].map(([seat, amount]) => ({ seat, amount })));
    this.syncStacks();
    const winners = new Set(perSeat.keys());
    g.players.forEach((p, i) => {
      const av = sc.avatars[i];
      if (!av || p.out) return;
      if (winners.has(i)) av.play('win');
      else if (!p.folded) av.play('lose');
    });
    window.__sfx?.(winners.has(0) ? 'win' : 'chips');
    this.lastWin = { ev, perSeat, winners };
    this.hooks.onHandEnd?.(this.lastWin);
    this.state();
  }
}
