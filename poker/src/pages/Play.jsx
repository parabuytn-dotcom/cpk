import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { Card, Cards, Meter, useStore } from '../components/ui.jsx';
import { Holdem, STREET_FR } from '../poker/game.js';
import { PERSONAS } from '../poker/bots.js';
import { advise, POSITION_INFO } from '../poker/coach.js';
import { evaluate } from '../poker/evaluator.js';
import { TIER_INFO } from '../poker/equity.js';
import { store } from '../store.js';
import { sfx } from '../sound.js';

const BOT_NAMES = ['Tex', 'Mia', 'Bubba', 'Vinnie', 'Grace'];
const START = 2000;
const ACTION_FR = { fold: 'Couché', check: 'Check', call: 'Suit', bet: 'Mise', raise: 'Relance', allin: 'TAPIS', SB: 'Petite blinde', BB: 'Grosse blinde' };

export function PlayPage() {
  const s = useStore();
  const settings = s.settings;
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const ctrlRef = useRef(null);
  const gameRef = useRef(null);
  const resolveRef = useRef(null);
  const nextRef = useRef(null);
  const plateRefs = useRef([]);
  const potRef = useRef(null);
  const betRefs = useRef([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [, force] = useState(0);
  const rerender = useCallback(() => force((x) => x + 1), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [handEnd, setHandEnd] = useState(null);
  const [raiseTo, setRaiseTo] = useState(0);
  const [showRaise, setShowRaise] = useState(false);
  const [panel, setPanel] = useState('coach');
  const [drawer, setDrawer] = useState(false);
  const [busted, setBusted] = useState(false);
  const [intro, setIntro] = useState(!store.get().seenPlayIntro);
  const [lastActions, setLastActions] = useState({});

  const log = useCallback((text, kind) => setLogs((l) => [...l.slice(-80), { text, kind, id: Math.random() }]), []);

  useEffect(() => {
    let disposed = false;
    let scene;
    (async () => {
      try {
        const [{ TableScene }, { CHARACTERS }, { TableController }] = await Promise.all([
          import('../three/table.js'), import('../three/avatar.js'), import('../play/controller.js')
        ]);
        if (disposed) return;
        scene = new TableScene(mountRef.current, { seats: 6 });
        scene.getViewShift = (w) => (w > 1100 ? 171 : w > 900 ? 151 : 0);
        await scene.init();
        if (disposed) { scene.dispose(); return; }
        sceneRef.current = scene;
        scene.speed = settingsRef.current.speed;
        const defs = [null, ...BOT_NAMES.map((n) => CHARACTERS.find((c) => c.name === n))];
        scene.setPlayers(defs);
        const players = [
          { name: 'Toi', stack: store.get().bankroll > 0 ? store.get().bankroll : START, isHuman: true },
          ...defs.slice(1).map((d) => ({ name: d.name, stack: START, persona: d.persona }))
        ];
        const game = new Holdem(players, { sb: 10, bb: 20 });
        gameRef.current = game;
        const ctrl = new TableController(scene, game, {
          log,
          onState: rerender,
          showBots: () => settingsRef.current.showBots,
          onAction: (ev) => setLastActions((a) => ({ ...a, [ev.seat]: ev.action })),
          onBoard: () => setLastActions((a) => Object.fromEntries(Object.entries(a).filter(([, v]) => v === 'fold' || v === 'allin'))),
          askHuman: () => new Promise((resolve) => {
            resolveRef.current = resolve;
            const L = game.legal(0);
            setRaiseTo(L.minTo);
            setShowRaise(false);
            setWaiting(true);
            sfx('turn');
            if (settingsRef.current.coach) {
              setAdvice(null);
              setTimeout(() => setAdvice(advise(game, 0)), 30);
            }
          }),
          onHandEnd: (res) => setHandEnd(res)
        });
        ctrlRef.current = ctrl;
        scene.onFrame = () => positionOverlay(scene, game);
        ctrl.syncStacks();
        setLoading(false);
        runLoop(ctrl, game);
      } catch (e) {
        console.error(e);
        setError('Impossible de lancer la 3D sur cet appareil (WebGL indisponible).');
        setLoading(false);
      }
    })();
    return () => {
      disposed = true;
      if (ctrlRef.current) ctrlRef.current.stopped = true;
      resolveRef.current?.({ type: 'fold' });
      nextRef.current?.();
      sceneRef.current?.dispose();
    };
  }, []);

  useEffect(() => { if (sceneRef.current) sceneRef.current.speed = settings.speed; }, [settings.speed]);

  async function runLoop(ctrl, game) {
    while (!ctrl.stopped) {
      setHandEnd(null);
      setLastActions({});
      setAdvice(null);
      // recaves des bots
      game.players.forEach((p) => {
        if (!p.isHuman && p.stack <= 0) { p.stack = START; log(`${p.name} recave ${START} jetons.`, 'muted'); }
      });
      if (game.players[0].stack <= 0) {
        setBusted(true);
        await new Promise((r) => { nextRef.current = r; });
        if (ctrl.stopped) return;
        setBusted(false);
      }
      const startStack = game.players[0].stack;
      await ctrl.playHand();
      if (ctrl.stopped) return;
      // statistiques
      const hero = game.players[0];
      const won = ctrl.lastWin?.winners.has(0);
      const gain = hero.stack - startStack;
      store.update((st) => {
        st.bankroll = hero.stack;
        st.hands.played++;
        if (won) { st.hands.won++; st.hands.biggest = Math.max(st.hands.biggest, ctrl.lastWin.perSeat.get(0) || 0); }
      });
      if (won && gain > 0) store.addXp(ctrl.lastWin.ev.uncontested ? 4 : 10, ctrl.lastWin.ev.uncontested ? 'Pot gagné' : 'Abattage gagné');
      else if (store.get().hands.played % 5 === 0) store.addXp(2, '5 mains jouées');
      if (settingsRef.current.autoNext) {
        await new Promise((r) => { nextRef.current = r; setTimeout(r, 3500 / (settingsRef.current.speed || 1)); });
      } else {
        await new Promise((r) => { nextRef.current = r; });
      }
    }
  }

  function positionOverlay(scene, game) {
    for (let i = 0; i < 6; i++) {
      const el = plateRefs.current[i];
      if (!el) continue;
      const info = scene.seatInfo(i);
      const p = scene.project(info.label);
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, ${i === 0 ? '0' : '-50%'})`;
      const b = betRefs.current[i];
      if (b) {
        const q = scene.project(info.bet.clone().setY(0.05));
        b.style.transform = `translate(${q.x}px, ${q.y}px) translate(-50%, 60%)`;
      }
    }
    if (potRef.current) {
      const q = scene.project(scene.potPos.clone().setY(0.02));
      potRef.current.style.transform = `translate(${q.x}px, ${q.y}px) translate(-50%, 40%)`;
    }
    void game;
  }

  const act = (action) => {
    if (!resolveRef.current) return;
    sfx('click');
    const r = resolveRef.current;
    resolveRef.current = null;
    setWaiting(false);
    setShowRaise(false);
    r(action);
  };
  const nextHand = () => { const r = nextRef.current; nextRef.current = null; r?.(); };
  const rebuy = () => {
    const g = gameRef.current;
    g.players[0].stack = START;
    store.update((st) => { st.bankroll = START; st.rebuys++; });
    sceneRef.current.setStack(0, START);
    log(`Tu recaves ${START} jetons.`, 'muted');
    nextHand();
  };
  const setSetting = (k, v) => store.update((st) => { st.settings[k] = v; });

  // raccourcis clavier
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
      const g = gameRef.current;
      if (!g) return;
      if (waiting) {
        const L = g.legal(0);
        if (e.key === 'f') act({ type: 'fold' });
        else if (e.key === 'c') act({ type: L.canCheck ? 'check' : 'call' });
        else if (e.key === 'r' && L.canRaise) setShowRaise(true);
      } else if ((e.key === ' ' || e.key === 'Enter') && handEnd) { e.preventDefault(); nextHand(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const game = gameRef.current;
  const ctrl = ctrlRef.current;
  const hero = game?.players[0];
  const L = game && waiting ? game.legal(0) : null;
  const heroHand = hero && hero.hole.length === 2 && !hero.folded
    ? (game.board.length >= 3 ? evaluate([...hero.hole, ...game.board]) : null) : null;
  const potTotal = game ? game.totalPot : 0;

  const presets = L && L.canRaise ? (() => {
    const pot = L.pot + L.toCall;
    const list = game.street === 'preflop'
      ? [['2,5 BB', 50], ['3 BB', 60], ['4 BB', 80], ['Pot', L.currentBet + pot]]
      : [['⅓', L.currentBet + pot / 3], ['½', L.currentBet + pot / 2], ['¾', L.currentBet + pot * 0.75], ['Pot', L.currentBet + pot]];
    return list.map(([l, v]) => [l, Math.min(L.maxTo, Math.max(L.minTo, Math.round(v / 5) * 5))]);
  })() : [];

  const winnerSeats = handEnd ? [...handEnd.winners] : [];
  const mainPot = handEnd?.ev.pots[0];

  return (
    <div class="play">
      <div class="play-canvas" ref={mountRef} />
      {loading && <div class="play-loading"><div class="spinner" /><p>Installation de la table…</p></div>}
      {error && <div class="play-loading"><p>{error}</p><a class="btn" href="#/entrainement">Aller aux entraînements</a></div>}

      {/* plaques des joueurs */}
      {game && game.players.map((p, i) => {
        const showCards = i !== 0 && ctrl && (ctrl.revealed.has(i) || (settings.showBots && !p.folded)) && p.hole.length === 2;
        const active = waiting ? i === 0 : sceneRef.current?.activeSeat === i;
        const isWinner = winnerSeats.includes(i);
        const pos = game.handNo ? game.positionName(i) : '';
        const persona = PERSONAS[p.persona];
        const la = lastActions[i];
        return (
          <div key={i} ref={(el) => (plateRefs.current[i] = el)} class={`plate${i === 0 ? ' hero' : ''}${p.folded && game.handNo ? ' folded' : ''}${active ? ' active' : ''}${isWinner ? ' winner' : ''}`}>
            {la && <span class={`bubble a-${la}`}>{ACTION_FR[la]}</span>}
            {showCards && <Cards cards={p.hole} size="xs" />}
            <div class="plate-main">
              <span class="plate-name">{i === 0 ? 'Toi' : p.name}{pos && <span class={`pos pos-${pos}`}>{pos}</span>}</span>
              <span class="plate-stack">🪙 {p.stack.toLocaleString('fr-FR')}</span>
            </div>
            {persona && <span class="plate-style" title={persona.desc}>{persona.style}</span>}
          </div>
        );
      })}
      {game && game.players.map((p, i) => (
        <div key={'b' + i} ref={(el) => (betRefs.current[i] = el)} class={`bet-label${p.bet > 0 ? ' on' : ''}`}>{p.bet > 0 ? p.bet : ''}</div>
      ))}
      <div ref={potRef} class={`pot-label${potTotal > 0 ? ' on' : ''}`}>
        Pot : <b>{potTotal.toLocaleString('fr-FR')}</b>
      </div>

      {/* barre du haut */}
      <div class="play-top">
        <a href="#/" class="icon-btn" title="Quitter la table">✕</a>
        <div class="table-info">
          <b>Las Vegas <span class="hide-sm">· NL </span>10/20</b>
          <span>{game?.handNo ? `Main n°${game.handNo} · ${STREET_FR[game.street] || ''}` : 'Cash game 6 joueurs'}</span>
        </div>
        <div class="toggles">
          <button class={`tgl${settings.coach ? ' on' : ''}`} onClick={() => setSetting('coach', !settings.coach)} title="Le coach t'explique chaque décision">🎓<span>Coach</span></button>
          <button class={`tgl${settings.showBots ? ' on' : ''}`} onClick={() => setSetting('showBots', !settings.showBots)} title="Voir les cartes des bots (mode apprentissage)">👁️<span>Cartes</span></button>
          <button class="tgl" onClick={() => setSetting('speed', settings.speed >= 2 ? 0.75 : settings.speed >= 1.4 ? 2 : settings.speed >= 1 ? 1.5 : 1)} title="Vitesse du jeu">⏩<span>×{settings.speed}</span></button>
          <button class={`tgl${settings.sound ? ' on' : ''}`} onClick={() => setSetting('sound', !settings.sound)} title="Son">{settings.sound ? '🔊' : '🔇'}</button>
          <button class="tgl only-mobile" onClick={() => setDrawer(!drawer)}>📋</button>
        </div>
      </div>

      {/* panneau coach / journal */}
      <aside class={`side-panel${drawer ? ' open' : ''}`}>
        <div class="sp-tabs">
          <button class={panel === 'coach' ? 'on' : ''} onClick={() => setPanel('coach')}>🎓 Coach</button>
          <button class={panel === 'log' ? 'on' : ''} onClick={() => setPanel('log')}>📜 Journal</button>
          <button class={panel === 'help' ? 'on' : ''} onClick={() => setPanel('help')}>🏆 Mains</button>
          <button class="sp-close only-mobile" onClick={() => setDrawer(false)}>✕</button>
        </div>
        {panel === 'coach' && <CoachPanel advice={advice} waiting={waiting} enabled={settings.coach} game={game} heroHand={heroHand} onEnable={() => setSetting('coach', true)} />}
        {panel === 'log' && <LogPanel logs={logs} />}
        {panel === 'help' && <HandsHelp />}
      </aside>

      {/* zone du joueur */}
      <div class="hero-zone">
        {hero && hero.hole.length === 2 && !handEnd && (
          <div class={`hero-cards${hero.folded ? ' folded' : ''}`}>
            {hero.hole.map((c, i) => <Card key={c.id + game.handNo} c={c} size="lg" flip delay={i * 120} glow={handEnd && mainPot?.hand?.best.some((b) => b.id === c.id) && winnerSeats.includes(0)} />)}
            <span class="hero-info">
              {heroHand ? <span class="hero-hand">{heroHand.name}</span> : !hero.folded && <span class="hero-hand muted">Préflop</span>}
              <span class="hero-stack">🪙 {hero.stack.toLocaleString('fr-FR')} · {game.positionName(0)}</span>
            </span>
          </div>
        )}
        {waiting && L && (
          <div class="actions">
            {showRaise && L.canRaise && (
              <div class="raise-box">
                <div class="presets">
                  {presets.map(([l, v]) => <button key={l} class={raiseTo === v ? 'on' : ''} onClick={() => setRaiseTo(v)}>{l}</button>)}
                  <button class={raiseTo === L.maxTo ? 'on' : ''} onClick={() => setRaiseTo(L.maxTo)}>Tapis</button>
                </div>
                <div class="slider-row">
                  <input type="range" min={L.minTo} max={L.maxTo} step={5} value={raiseTo} onInput={(e) => setRaiseTo(+e.target.value)} />
                  <input type="number" min={L.minTo} max={L.maxTo} step={5} value={raiseTo} onChange={(e) => setRaiseTo(Math.max(L.minTo, Math.min(L.maxTo, +e.target.value || L.minTo)))} />
                </div>
                <button class="act raise confirm" onClick={() => act(raiseTo >= L.maxTo ? { type: 'allin' } : { type: 'raise', to: raiseTo })}>
                  {raiseTo >= L.maxTo ? `TAPIS (${L.maxTo})` : `${L.currentBet === 0 ? 'Miser' : 'Relancer à'} ${L.currentBet === 0 ? raiseTo - L.bet : raiseTo}`}
                </button>
              </div>
            )}
            <div class="act-row">
              <button class="act fold" onClick={() => act({ type: 'fold' })} disabled={L.canCheck && false}>Se coucher<small>Fold · F</small></button>
              {L.canCheck
                ? <button class="act check" onClick={() => act({ type: 'check' })}>Check<small>Parole · C</small></button>
                : <button class="act call" onClick={() => act({ type: 'call' })}>{L.toCall >= L.stack ? `Tapis ${L.toCall}` : `Suivre ${L.toCall}`}<small>Call · C</small></button>}
              {L.canRaise && (
                <button class={`act raise${showRaise ? ' on' : ''}`} onClick={() => setShowRaise(!showRaise)}>
                  {L.currentBet === 0 ? 'Miser' : 'Relancer'}<small>{L.currentBet === 0 ? 'Bet' : 'Raise'} · R</small>
                </button>
              )}
            </div>
            {L.canCheck && <p class="hint">Personne n'a misé : tu peux checker gratuitement plutôt que te coucher.</p>}
          </div>
        )}
      {handEnd && (
        <div class="hand-end">
          <div class="he-title">
            {winnerSeats.includes(0) ? '🎉 Tu gagnes !' : `${winnerSeats.map((s) => game.players[s].name).join(' & ')} ${winnerSeats.length > 1 ? 'partagent' : 'gagne'}`}
            <b> {[...handEnd.perSeat.values()].reduce((a, b) => a + b, 0).toLocaleString('fr-FR')}</b>
          </div>
          {handEnd.ev.uncontested
            ? <p>Tous les autres se sont couchés : pas besoin de montrer ses cartes.</p>
            : <>
              <p>avec <b>{mainPot.hand.name}</b></p>
              <Cards cards={mainPot.hand.best} size="sm" />
              <ShowdownExplain game={game} ev={handEnd.ev} />
            </>}
          <button class="btn" onClick={nextHand}>Main suivante →</button>
          <label class="auto"><input type="checkbox" checked={settings.autoNext} onChange={(e) => setSetting('autoNext', e.target.checked)} /> Enchaîner automatiquement</label>
        </div>
      )}
        {!waiting && !handEnd && game?.handNo > 0 && !hero?.folded && <div class="waiting-msg">Les autres réfléchissent…</div>}
        {!waiting && !handEnd && hero?.folded && <div class="waiting-msg">Tu t'es couché · observe comment jouent les autres</div>}
      </div>

      {busted && (
        <div class="modal-bg">
          <div class="modal">
            <h2>Plus de jetons 😬</h2>
            <p>Ça arrive aux meilleurs ! Analyse le journal pour comprendre ce qui s'est passé, puis recave.</p>
            <button class="btn" onClick={rebuy}>Recaver {START} jetons</button>
          </div>
        </div>
      )}
      {intro && !loading && !error && (
        <div class="modal-bg">
          <div class="modal">
            <h2>Bienvenue à la table 🃏</h2>
            <ul class="nice-list">
              <li>Tu es assis <b>en bas</b>. Tes cartes s'affichent en grand.</li>
              <li>Le <b>Coach 🎓</b> analyse chaque situation : tes chances de gagner, la cote du pot et le bon choix.</li>
              <li>Le bouton <b>👁️ Cartes</b> te montre les cartes des bots pour comprendre leur jeu.</li>
              <li>Chaque bot a un <b>style</b> (Roc, Requin, Poisson…) : apprends à les reconnaître !</li>
              <li>Raccourcis : <kbd>F</kbd> fold, <kbd>C</kbd> check/call, <kbd>R</kbd> relance, <kbd>Espace</kbd> main suivante.</li>
            </ul>
            <button class="btn" onClick={() => { setIntro(false); store.update((st) => { st.seenPlayIntro = true; }); }}>C'est parti !</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShowdownExplain({ game, ev }) {
  const hands = ev.hands || {};
  const seats = Object.keys(hands).map(Number);
  if (seats.length < 2) return null;
  const sorted = seats.sort((a, b) => hands[b].score - hands[a].score);
  return (
    <ul class="sd-list">
      {sorted.map((s) => (
        <li key={s} class={ev.pots.some((p) => p.winners.includes(s)) ? 'w' : ''}>
          <span class="sd-name">{game.players[s].isHuman ? 'Toi' : game.players[s].name}</span>
          <Cards cards={game.players[s].hole} size="xs" />
          <b>{hands[s].name}</b>
        </li>
      ))}
    </ul>
  );
}

function CoachPanel({ advice, waiting, enabled, game, heroHand, onEnable }) {
  if (!enabled) return <div class="sp-body"><p class="muted">Le coach est désactivé.</p><button class="btn small" onClick={onEnable}>Activer le coach</button></div>;
  if (!game || !game.handNo) return <div class="sp-body"><p class="muted">La partie commence…</p></div>;
  if (!waiting || !advice) {
    return (
      <div class="sp-body">
        <p class="coach-wait">{waiting ? 'Analyse en cours…' : 'Le coach parlera quand ce sera ton tour. En attendant, observe les actions des autres joueurs.'}</p>
        {heroHand && <div class="coach-line"><span>Ta main actuelle</span><b>{heroHand.name}</b></div>}
        <div class="coach-line"><span>Ta position</span><b>{game.positionName(0)} · {POSITION_INFO[game.positionName(0)]?.fr}</b></div>
      </div>
    );
  }
  const a = advice;
  const eqPct = Math.round(a.equity * 100);
  const recLabel = { fold: '🏳️ ' , check: '✊ ', call: '🤝 ', raise: '📈 ' }[a.rec.action] + a.rec.label;
  return (
    <div class="sp-body coach">
      <div class="coach-rec"><small>Conseil du coach</small><b>{recLabel}</b></div>
      <ul class="coach-why">{a.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
      {a.preflop ? (
        <div class="coach-line"><span>Ta main</span><b style={{ color: a.preflop.info.color }}>{a.preflop.code} · {a.preflop.info.label}</b></div>
      ) : a.hand && (
        <div class="coach-line"><span>Ta main</span><b>{a.hand.name}{a.playsBoard ? ' (tu joues le board)' : ''}</b></div>
      )}
      <div class="coach-line col">
        <span>Chances de gagner contre {a.opponents} adversaire{a.opponents > 1 ? 's' : ''}</span>
        <div class="eq-row"><Meter value={a.equity} color={eqPct >= 50 ? '#2fbf71' : eqPct >= 30 ? '#f5c451' : '#e5484d'} /><b>{eqPct} %</b></div>
      </div>
      {a.toCall > 0 && (
        <div class="coach-line col">
          <span>Cote du pot : payer {a.toCall} pour gagner {a.pot + a.toCall}</span>
          <div class="eq-row"><Meter value={a.potOdds} color="#46a6ff" /><b>{Math.round(a.potOdds * 100)} % requis</b></div>
        </div>
      )}
      {a.outs && a.outs.count > 0 && (
        <div class="coach-line col">
          <span>{a.outs.count} outs{a.outs.draws.length ? ' · ' + a.outs.draws.join(', ') : ''}</span>
          <Cards cards={a.outs.cards.slice(0, 15)} size="xs" />
        </div>
      )}
      <div class="coach-line"><span>Position</span><b>{a.pos} · {a.posInfo?.fr}</b></div>
      {a.preflop && <p class="coach-tip">{TIER_INFO[a.preflop.tier].tip}</p>}
    </div>
  );
}

function LogPanel({ logs }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs.length]);
  return (
    <div class="sp-body log" ref={ref}>
      {logs.map((l) => <p key={l.id} class={`log-${l.kind}`}>{l.text}</p>)}
    </div>
  );
}

function HandsHelp() {
  const rows = [
    ['Quinte flush royale', 'As Ks Qs Js Ts'], ['Quinte flush', '9h 8h 7h 6h 5h'], ['Carré', 'Qc Qd Qh Qs 7d'], ['Full', 'Kh Kd Ks 4c 4s'],
    ['Couleur', 'Ad Jd 8d 5d 2d'], ['Quinte', 'Tc 9d 8s 7h 6c'], ['Brelan', '7s 7h 7d Kc 2s'], ['Double paire', 'Jh Jc 4d 4s Ah'], ['Paire', 'Th Ts Kd 6c 3h'], ['Carte haute', 'Ac Qd 9h 6s 3c']
  ];
  return (
    <div class="sp-body hands-help">
      {rows.map(([n, c], i) => <div key={n} class="hh-row"><span>{i + 1}. {n}</span><Cards cards={c} size="xs" /></div>)}
    </div>
  );
}
