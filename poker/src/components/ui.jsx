import { useEffect, useState } from 'preact/hooks';
import { card as parseCard, SUIT_SYMBOL, SUITS, RANK_LABEL } from '../poker/cards.js';
import { store, levelOf } from '../store.js';

export function useStore() {
  const [s, set] = useState(store.get());
  useEffect(() => store.subscribe(set), []);
  return s;
}

export function Card({ c, size = 'md', back = false, dim = false, glow = false, delay = 0, flip = false }) {
  const cardObj = typeof c === 'string' ? parseCard(c) : c;
  const cls = `pc pc-${size}${dim ? ' dim' : ''}${glow ? ' glow' : ''}${flip ? ' flip-in' : ''}`;
  if (back || !cardObj) return <span class={cls + ' back'} style={{ animationDelay: delay + 'ms' }} />;
  const red = cardObj.s === 1 || cardObj.s === 2;
  const sym = SUIT_SYMBOL[SUITS[cardObj.s]];
  const label = RANK_LABEL(cardObj.r);
  return (
    <span class={cls + (red ? ' red' : '')} style={{ animationDelay: delay + 'ms' }} aria-label={label + sym}>
      <span class="pc-corner">{label}<i>{sym}</i></span>
      <span class="pc-mid">{cardObj.r >= 11 && cardObj.r <= 13 ? <b>{label}</b> : sym}</span>
    </span>
  );
}

export function Cards({ cards, size = 'md', highlight, gap, flip = false }) {
  const list = typeof cards === 'string' ? cards.trim().split(/\s+/).filter(Boolean) : cards;
  const hl = highlight ? new Set(highlight) : null;
  return (
    <span class="cards" style={gap ? { gap } : null}>
      {list.map((c, i) => {
        const id = typeof c === 'string' ? c : c?.id;
        return <Card key={id + i} c={c} size={size} flip={flip} delay={i * 70} dim={hl && !hl.has(id)} glow={hl && hl.has(id)} />;
      })}
    </span>
  );
}

/** Texte enrichi : **gras**, {As} → carte, [[terme]] → étiquette */
export function Rich({ text }) {
  const parts = String(text).split(/(\{[2-9TJQKA][shdc](?:\s[2-9TJQKA][shdc])*\}|\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('{') && p.endsWith('}')) return <Cards key={i} cards={p.slice(1, -1)} size="xs" />;
        if (p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('[[')) return <span key={i} class="term">{p.slice(2, -2)}</span>;
        return p;
      })}
    </>
  );
}

export function LevelBadge({ compact = false }) {
  const s = useStore();
  const L = levelOf(s.xp);
  return (
    <a href="#/profil" class={`level-badge${compact ? ' compact' : ''}`} title="Ta progression">
      <span class="lvl-icon">{L.icon}</span>
      <span class="lvl-text">
        <b>Niv. {L.index + 1} · {L.name}</b>
        <span class="xpbar"><span style={{ width: Math.round(L.progress * 100) + '%' }} /></span>
      </span>
    </a>
  );
}

export function Toasts() {
  const [list, setList] = useState([]);
  useEffect(() => store.onToast((t) => {
    setList((l) => [...l.slice(-3), t]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 2600);
  }), []);
  return (
    <div class="toasts">
      {list.map((t) => <div key={t.id} class={`toast ${t.kind}`}>{t.msg}</div>)}
    </div>
  );
}

export function TopNav({ route }) {
  const links = [
    ['#/', 'Accueil', '🏠'],
    ['#/apprendre', 'Apprendre', '📘'],
    ['#/entrainement', 'S\'entraîner', '🎯'],
    ['#/jouer', 'Jouer', '🃏'],
    ['#/lexique', 'Lexique', '📖']
  ];
  const active = (h) => (h === '#/' ? route === '' : route.startsWith(h.slice(2)));
  return (
    <header class="topnav">
      <a href="#/" class="brand">
        <span class="brand-chip" aria-hidden="true">♠</span>
        <span>ALL-IN <em>ACADEMY</em></span>
      </a>
      <nav>
        {links.map(([h, l, ic]) => (
          <a key={h} href={h} class={active(h) ? 'on' : ''}><span class="nav-ic">{ic}</span><span class="nav-l">{l}</span></a>
        ))}
      </nav>
      <LevelBadge compact />
    </header>
  );
}

export function Meter({ value, color }) {
  return <span class="meter"><span style={{ width: Math.max(2, Math.min(100, value * 100)) + '%', background: color }} /></span>;
}
