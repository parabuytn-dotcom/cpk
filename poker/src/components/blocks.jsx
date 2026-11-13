// Blocs interactifs des leçons.
import { useState, useMemo } from 'preact/hooks';
import { Card, Cards, Rich } from './ui.jsx';
import { HAND_RANKINGS } from '../content/lessons.js';
import { cards as parse, RANK_CHARS } from '../poker/cards.js';
import { evaluate } from '../poker/evaluator.js';
import { outs, tierOfCode, TIER_INFO, RANKS_DESC } from '../poker/equity.js';
import { POSITION_INFO } from '../poker/coach.js';

export function Rankings() {
  const [open, setOpen] = useState(0);
  return (
    <ol class="rankings">
      {HAND_RANKINGS.map((h, i) => (
        <li key={h.fr} class={open === i ? 'open' : ''} onClick={() => setOpen(i)} style={{ '--i': i }}>
          <div class="rk-head">
            <span class="rk-num">{i + 1}</span>
            <span class="rk-name"><b>{h.fr}</b><small>{h.en}</small></span>
            <Cards cards={h.cards} size="xs" />
          </div>
          {open === i && (
            <div class="rk-body">
              <Cards cards={h.cards} size="md" flip />
              <p>{h.desc}</p>
              <span class="pill">Probabilité sur 7 cartes : {h.odds}</span>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function Compare({ board, hands, note }) {
  const [shown, setShown] = useState(hands.length === 1);
  const b = parse(board);
  const evals = hands.map((h) => evaluate([...parse(h.cards), ...b]));
  const best = Math.max(...evals.map((e) => e.score));
  return (
    <div class="compare">
      <div class="cmp-board"><span class="lbl">Board</span><Cards cards={board} size="sm" highlight={shown && hands.length === 1 ? evals[0].best.map((c) => c.id) : null} /></div>
      <div class="cmp-hands">
        {hands.map((h, i) => (
          <div key={i} class={`cmp-hand${shown && evals[i].score === best && hands.length > 1 ? ' win' : ''}`}>
            <span class="lbl">{h.name}</span>
            <Cards cards={h.cards} size="sm" />
            {shown && <span class="cmp-res">{evals[i].name}</span>}
            {shown && <Cards cards={evals[i].best.map((c) => c.id)} size="xs" />}
          </div>
        ))}
      </div>
      {!shown ? <button class="btn small" onClick={() => setShown(true)}>{hands.length > 1 ? 'Qui gagne ? Voir la réponse' : 'Voir ma main'}</button> : <p class="cmp-note"><Rich text={note} /></p>}
    </div>
  );
}

const STREET_STEPS = [
  { name: 'Préflop', en: 'Preflop', board: '', text: 'Chaque joueur reçoit 2 cartes privées. Premier tour d\'enchères, en commençant à gauche de la grosse blinde. Ici, tu relances avec {Ah Qh} et un adversaire suit.' },
  { name: 'Le Flop', en: 'Flop', board: 'Qd 9h 4h', text: 'Le croupier brûle une carte et retourne **3 cartes communes**. Tu as une paire de Dames (avec le meilleur kicker) et 4 cœurs ! Nouveau tour d\'enchères, en commençant à gauche du bouton.' },
  { name: 'La Turn', en: 'Turn', board: 'Qd 9h 4h 2c', text: '4ᵉ carte commune (aussi appelée « Fourth street »). Le 2 de trèfle ne change pas grand-chose. Tu mises, ton adversaire suit.' },
  { name: 'La River', en: 'River', board: 'Qd 9h 4h 2c Th', text: '5ᵉ et dernière carte (« Fifth street »). Un cœur ! Tu as une **Couleur à l\'As**. Dernier tour d\'enchères.' },
  { name: 'L\'abattage', en: 'Showdown', board: 'Qd 9h 4h 2c Th', text: 'L\'adversaire montre {Kd Qc} (paire de Dames). Ta Couleur bat sa paire : **tu gagnes le pot !**' }
];

export function Streets() {
  const [i, setI] = useState(0);
  const s = STREET_STEPS[i];
  const board = s.board ? s.board.split(' ') : [];
  return (
    <div class="streets">
      <div class="st-tabs">
        {STREET_STEPS.map((x, k) => <button key={k} class={k === i ? 'on' : k < i ? 'done' : ''} onClick={() => setI(k)}>{k + 1}. {x.name}</button>)}
      </div>
      <div class="mini-felt">
        <div class="mf-board">
          {[0, 1, 2, 3, 4].map((k) => (board[k] ? <Card key={board[k] + i} c={board[k]} size="sm" flip={k >= (STREET_STEPS[i - 1]?.board.split(' ').filter(Boolean).length || 0)} /> : <span key={k} class="slot" />))}
        </div>
        <div class="mf-seats">
          <div class="mf-seat"><span>Toi</span><Cards cards="Ah Qh" size="sm" /></div>
          <div class="mf-seat"><span>Adversaire</span>{i === 4 ? <Cards cards="Kd Qc" size="sm" flip /> : <span class="cards"><Card back size="sm" /><Card back size="sm" /></span>}</div>
        </div>
      </div>
      <p class="st-text"><b>{s.name}</b> <small>({s.en})</small> — <Rich text={s.text} /></p>
      <div class="st-nav">
        <button class="btn ghost small" disabled={i === 0} onClick={() => setI(i - 1)}>← Précédent</button>
        <button class="btn small" disabled={i === STREET_STEPS.length - 1} onClick={() => setI(i + 1)}>Étape suivante →</button>
      </div>
    </div>
  );
}

const ACTIONS = [
  { k: 'Check', fr: 'Parole', icon: '✊', when: 'Personne n\'a misé dans ce tour', what: 'Tu passes sans mettre de jetons. Geste au casino : taper sur la table.' },
  { k: 'Bet', fr: 'Miser', icon: '🪙', when: 'Personne n\'a misé dans ce tour', what: 'Tu mets des jetons au milieu (au moins une grosse blinde).' },
  { k: 'Call', fr: 'Suivre', icon: '🤝', when: 'Quelqu\'un a misé', what: 'Tu mets exactement la même somme pour rester dans le coup.' },
  { k: 'Raise', fr: 'Relancer', icon: '📈', when: 'Quelqu\'un a misé', what: 'Tu augmentes la mise. Les autres doivent suivre ta nouvelle mise, relancer ou se coucher.' },
  { k: 'Fold', fr: 'Se coucher', icon: '🏳️', when: 'À tout moment (quand c\'est ton tour)', what: 'Tu abandonnes tes cartes et tout ce que tu as déjà misé.' },
  { k: 'All-in', fr: 'Tapis', icon: '💥', when: 'À tout moment', what: 'Tu mises tous tes jetons. Tu ne peux plus être forcé à te coucher.' }
];
export function Actions() {
  return (
    <div class="action-grid">
      {ACTIONS.map((a) => (
        <div class="action-card" key={a.k}>
          <span class="ac-icon">{a.icon}</span>
          <b>{a.k}</b><small>{a.fr}</small>
          <p class="ac-when">Quand : {a.when}</p>
          <p>{a.what}</p>
        </div>
      ))}
    </div>
  );
}

const SEATS6 = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
export function Positions() {
  const [sel, setSel] = useState('BTN');
  const colors = { BTN: '#f5c451', CO: '#4cc38a', MP: '#46a6ff', UTG: '#e5484d', SB: '#9a7bff', BB: '#9a7bff' };
  // sièges autour d'une ellipse, sens horaire à partir du bas
  const pos = SEATS6.map((p, i) => {
    const a = Math.PI / 2 + (i / 6) * Math.PI * 2;
    return { p, x: 200 + Math.cos(a) * 165, y: 120 + Math.sin(a) * 92 };
  });
  return (
    <div class="positions">
      <svg viewBox="0 0 400 240" role="img" aria-label="Positions autour de la table">
        <ellipse cx="200" cy="120" rx="150" ry="78" fill="#1c6f45" stroke="#3a1e14" stroke-width="14" />
        <ellipse cx="200" cy="120" rx="118" ry="52" fill="none" stroke="rgba(245,196,81,.4)" stroke-width="2" />
        <text x="200" y="116" text-anchor="middle" fill="rgba(255,255,255,.55)" font-size="11">sens du jeu</text>
        <path d="M 232 132 A 40 16 0 0 1 168 132" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2" marker-end="url(#arr)" />
        <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="rgba(255,255,255,.55)" /></marker></defs>
        {pos.map(({ p, x, y }) => (
          <g key={p} onClick={() => setSel(p)} style={{ cursor: 'pointer' }}>
            <circle cx={x} cy={y} r={sel === p ? 25 : 22} fill={colors[p]} stroke={sel === p ? '#fff' : 'rgba(0,0,0,.4)'} stroke-width="3" />
            <text x={x} y={y + 5} text-anchor="middle" font-size="14" font-weight="800" fill="#111">{p}</text>
          </g>
        ))}
        {(() => { const b = pos[0]; return <circle cx={b.x + 30} cy={b.y - 22} r="9" fill="#fff" stroke="#c9a23a" stroke-width="2" />; })()}
      </svg>
      <div class="pos-info">
        <b>{sel} — {POSITION_INFO[sel].fr}</b>
        <p>{POSITION_INFO[sel].tip}</p>
        <small>Touche une place autour de la table. Les jetons tournent dans le sens des aiguilles d'une montre.</small>
      </div>
    </div>
  );
}

export function StartingChart({ compact = false }) {
  const [sel, setSel] = useState('AKs');
  const grid = useMemo(() => RANKS_DESC.map((r1, i) => RANKS_DESC.map((r2, j) => {
    if (i === j) return r1 + r2;
    return i < j ? r1 + r2 + 's' : r2 + r1 + 'o';
  })), []);
  const tier = tierOfCode(sel);
  const info = TIER_INFO[tier];
  const combos = sel.length === 2 ? 6 : sel.endsWith('s') ? 4 : 12;
  return (
    <div class={`chart-wrap${compact ? ' compact' : ''}`}>
      <div class="chart" role="grid">
        {grid.flat().map((code) => {
          const t = tierOfCode(code);
          return (
            <button key={code} class={`cell${sel === code ? ' sel' : ''}`} style={{ background: TIER_INFO[t].color + (t === 6 ? '55' : 'dd') }} onClick={() => setSel(code)}>
              {code}
            </button>
          );
        })}
      </div>
      <div class="chart-side">
        <div class="chart-sel" style={{ borderColor: info.color }}>
          <b style={{ color: info.color }}>{sel}</b> <span class="pill" style={{ background: info.color, color: '#111' }}>{info.label}</span>
          <p>{info.tip}</p>
          <small>{combos} combinaisons possibles · {sel.length === 2 ? 'paire' : sel.endsWith('s') ? 'assorties (même couleur)' : 'dépareillées'}</small>
        </div>
        <div class="legend">
          {Object.entries(TIER_INFO).map(([k, v]) => <span key={k}><i style={{ background: v.color }} />{v.label}</span>)}
        </div>
      </div>
    </div>
  );
}

export function OutsBlock({ hole, board, title, note }) {
  const [show, setShow] = useState(false);
  const o = useMemo(() => outs(parse(hole), parse(board)), [hole, board]);
  return (
    <div class="outs-block">
      <h4>{title}</h4>
      <div class="ob-row">
        <div><span class="lbl">Ta main</span><Cards cards={hole} size="sm" /></div>
        <div><span class="lbl">Flop</span><Cards cards={board} size="sm" /></div>
      </div>
      <p><Rich text={note} /></p>
      {!show ? <button class="btn small ghost" onClick={() => setShow(true)}>Voir les {o.count} outs</button> : (
        <div class="ob-outs"><Cards cards={o.cards} size="xs" /><span class="pill">≈ {Math.min(100, o.count * 4)} % d'ici la river (×4)</span></div>
      )}
    </div>
  );
}

export function renderBlock(b, i) {
  switch (b.t) {
    case 'p': return <p key={i}><Rich text={b.text} /></p>;
    case 'h': return <h3 key={i}>{b.text}</h3>;
    case 'cards': return <figure key={i} class="cards-fig"><Cards cards={b.cards} size={b.size || 'md'} flip />{b.label && <figcaption>{b.label}</figcaption>}</figure>;
    case 'tip': return <aside key={i} class={`tip tip-${b.kind}`}><span class="tip-ic">{b.kind === 'us' ? '🇺🇸' : b.kind === 'warn' ? '⚠️' : '💡'}</span><div><b>{b.kind === 'us' ? 'Au casino aux USA' : b.kind === 'warn' ? 'Attention' : 'Astuce'}</b><p><Rich text={b.text} /></p></div></aside>;
    case 'list': return <ul key={i} class="nice-list">{b.items.map((t, k) => <li key={k}><Rich text={t} /></li>)}</ul>;
    case 'table': return (
      <div key={i} class="tbl-wrap"><table class="tbl"><thead><tr>{b.rows[0].map((c, k) => <th key={k}>{c}</th>)}</tr></thead>
        <tbody>{b.rows.slice(1).map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>)}</tbody></table></div>
    );
    case 'rankings': return <Rankings key={i} />;
    case 'compare': return <Compare key={i} {...b} />;
    case 'streets': return <Streets key={i} />;
    case 'actions': return <Actions key={i} />;
    case 'positions': return <Positions key={i} />;
    case 'chart': return <StartingChart key={i} />;
    case 'outs': return <OutsBlock key={i} {...b} />;
    default: return null;
  }
}
void RANK_CHARS;
