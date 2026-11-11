import { useState } from 'preact/hooks';
import { Icon } from './ui.jsx';
import { sfx } from '../sfx.js';

export const COLORS = ['#2F6BFF', '#1FBF75', '#FF8A1F', '#FF4D5E', '#8B5CF6', '#FFC531', '#14B8C4', '#F472B6', '#3F4A6B', '#A0613A'];
export const BGS = ['#DCE8FF', '#D9F7E8', '#FFE7D1', '#FFE0E3', '#EBE2FF', '#FFF4C7', '#D3F5F7', '#1B2550'];
export const SPECIES = [['pingo', 'Pingouin'], ['chat', 'Chat'], ['ours', 'Ours'], ['lapin', 'Lapin'], ['renard', 'Renard'], ['grenouille', 'Grenouille'], ['blob', 'Blob']];
export const EYES = ['Ronds', 'Brillants', 'Joyeux', 'Clin d\'œil'];
export const MOUTHS = ['Sourire', 'Rire', 'Mignon', 'Surpris'];
export const ACCS = [
  ['none', 'Rien', 1], ['noeud', 'Nœud', 1], ['lunettes', 'Lunettes', 1], ['soleil', 'Lunettes de soleil', 2],
  ['casquette', 'Casquette', 3], ['casque', 'Casque audio', 4], ['bandana', 'Bandana', 5], ['couronne', 'Couronne', 6], ['diplome', 'Chapeau de diplômé', 8]
];
export const DEFAULT_AVATAR = { s: 'pingo', c: 0, e: 1, m: 0, x: 'none', b: 0 };

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
};

export function avatarSVG(av) {
  const a = { ...DEFAULT_AVATAR, ...(av || {}) };
  const col = COLORS[a.c] || COLORS[0], dark = shade(col, 0.72), light = shade(col, 1.35), bg = BGS[a.b] || BGS[0];
  const ink = '#13214A';
  let s = `<circle cx="60" cy="60" r="60" fill="${bg}"/>`;
  s += `<ellipse cx="60" cy="126" rx="40" ry="34" fill="${col}"/>`;
  const ey = a.s === 'grenouille' ? 40 : 58;
  // oreilles / extras derrière la tête
  if (a.s === 'chat' || a.s === 'renard') s += `<path d="M30 46 L36 16 L56 34Z M90 46 L84 16 L64 34Z" fill="${col}"/><path d="M36 40 L39 24 L50 34Z M84 40 L81 24 L70 34Z" fill="${a.s === 'renard' ? '#fff' : '#FF9FB2'}"/>`;
  if (a.s === 'ours') s += `<circle cx="34" cy="34" r="12" fill="${col}"/><circle cx="86" cy="34" r="12" fill="${col}"/><circle cx="34" cy="34" r="6" fill="${light}"/><circle cx="86" cy="34" r="6" fill="${light}"/>`;
  if (a.s === 'lapin') s += `<ellipse cx="46" cy="22" rx="8" ry="22" fill="${col}"/><ellipse cx="74" cy="22" rx="8" ry="22" fill="${col}"/><ellipse cx="46" cy="24" rx="4" ry="15" fill="#FF9FB2"/><ellipse cx="74" cy="24" rx="4" ry="15" fill="#FF9FB2"/>`;
  if (a.s === 'grenouille') s += `<circle cx="45" cy="40" r="13" fill="${col}"/><circle cx="75" cy="40" r="13" fill="${col}"/>`;
  if (a.s === 'blob') s += `<path d="M60 22 q4 -10 10 -6" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  s += `<circle cx="60" cy="62" r="33" fill="${col}"/>`;
  if (a.s === 'pingo') s += `<path d="M60 52 C48 40 30 50 32 66 C34 84 50 92 60 92 C70 92 86 84 88 66 C90 50 72 40 60 52Z" fill="#fff"/>`;
  if (a.s === 'renard') s += `<path d="M28 66 Q44 70 60 90 Q76 70 92 66 Q84 92 60 95 Q36 92 28 66Z" fill="#fff"/>`;
  if (a.s === 'ours') s += `<ellipse cx="60" cy="76" rx="14" ry="10" fill="${light}"/><ellipse cx="60" cy="71" rx="5" ry="3.5" fill="${ink}"/>`;
  if (a.s === 'grenouille') s += `<circle cx="45" cy="40" r="9" fill="#fff"/><circle cx="75" cy="40" r="9" fill="#fff"/>`;
  // joues
  s += `<ellipse cx="40" cy="${ey + 14}" rx="6" ry="4" fill="#FF7F98" opacity=".45"/><ellipse cx="80" cy="${ey + 14}" rx="6" ry="4" fill="#FF7F98" opacity=".45"/>`;
  // yeux
  const L = 47, R = 73;
  if (a.e === 0) s += `<circle cx="${L}" cy="${ey}" r="4.5" fill="${ink}"/><circle cx="${R}" cy="${ey}" r="4.5" fill="${ink}"/>`;
  if (a.e === 1) s += `<circle cx="${L}" cy="${ey}" r="7.5" fill="#fff"/><circle cx="${R}" cy="${ey}" r="7.5" fill="#fff"/><circle cx="${L + 1}" cy="${ey + 1}" r="4.8" fill="${ink}"/><circle cx="${R + 1}" cy="${ey + 1}" r="4.8" fill="${ink}"/><circle cx="${L + 2.5}" cy="${ey - 1}" r="1.6" fill="#fff"/><circle cx="${R + 2.5}" cy="${ey - 1}" r="1.6" fill="#fff"/>`;
  if (a.e === 2) s += `<path d="M${L - 6} ${ey + 2} q6 -8 12 0 M${R - 6} ${ey + 2} q6 -8 12 0" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  if (a.e === 3) s += `<circle cx="${L}" cy="${ey}" r="4.5" fill="${ink}"/><path d="M${R - 6} ${ey + 1} q6 -6 12 0" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  // bouche
  const my = ey + 20;
  if (a.s === 'pingo') s += `<path d="M52 ${my - 6} L68 ${my - 6} L60 ${my + 3}Z" fill="#FF9A2E"/>`;
  else {
    if (a.m === 0) s += `<path d="M52 ${my} q8 8 16 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    if (a.m === 1) s += `<path d="M50 ${my - 2} q10 16 20 0z" fill="${ink}"/><path d="M55 ${my + 4} q5 4 10 0" fill="#FF6B81"/>`;
    if (a.m === 2) s += `<path d="M52 ${my} q4 4 8 0 q4 4 8 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (a.m === 3) s += `<ellipse cx="60" cy="${my + 2}" rx="4.5" ry="5.5" fill="${ink}"/>`;
  }
  // accessoires
  const x = a.x;
  if (x === 'noeud') s += `<path d="M60 30 L44 21 L44 39Z M60 30 L76 21 L76 39Z" fill="#FF4D5E"/><circle cx="60" cy="30" r="5" fill="#E43A4C"/>`;
  if (x === 'lunettes') s += `<g fill="none" stroke="${ink}" stroke-width="3"><circle cx="${L}" cy="${ey}" r="10"/><circle cx="${R}" cy="${ey}" r="10"/><path d="M${L + 10} ${ey} h6"/></g>`;
  if (x === 'soleil') s += `<path d="M${L - 12} ${ey - 7} h24 v6 q0 9 -12 9 q-12 0 -12 -9z M${R - 12} ${ey - 7} h24 v6 q0 9 -12 9 q-12 0 -12 -9z" fill="#0E1633"/><path d="M${L + 12} ${ey - 5} h2" stroke="#0E1633" stroke-width="3"/>`;
  if (x === 'casquette') s += `<path d="M28 50 Q30 22 60 22 Q90 22 92 50Z" fill="#FF4D5E"/><path d="M60 46 Q90 44 104 52 Q90 56 60 52Z" fill="#E43A4C"/><circle cx="60" cy="23" r="3" fill="#fff"/>`;
  if (x === 'casque') s += `<path d="M26 62 Q26 24 60 24 Q94 24 94 62" fill="none" stroke="#13214A" stroke-width="6"/><rect x="19" y="54" width="14" height="22" rx="6" fill="#8B5CF6"/><rect x="87" y="54" width="14" height="22" rx="6" fill="#8B5CF6"/>`;
  if (x === 'bandana') s += `<path d="M27 46 Q60 30 93 46 L93 52 Q60 38 27 52Z" fill="#1FBF75"/><path d="M90 48 l12 -6 l-2 12z" fill="#1FBF75"/>`;
  if (x === 'couronne') s += `<path d="M38 34 L42 14 L52 26 L60 10 L68 26 L78 14 L82 34Z" fill="#FFC531" stroke="#E0A300" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="27" r="3" fill="#FF4D5E"/>`;
  if (x === 'diplome') s += `<path d="M60 12 L96 26 L60 40 L24 26Z" fill="#13214A"/><path d="M40 33 v8 q20 8 40 0 v-8 L60 40Z" fill="#26335F"/><path d="M92 28 v14" stroke="#FFC531" stroke-width="2.5"/><circle cx="92" cy="44" r="3" fill="#FFC531"/>`;
  return s;
}

export function Avatar({ av, size = 48, class: cls = '' }) {
  return <svg class={'avatar ' + cls} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" dangerouslySetInnerHTML={{ __html: avatarSVG(av) }} />;
}

const TABS = [['s', 'Perso'], ['c', 'Couleur'], ['e', 'Yeux'], ['m', 'Bouche'], ['x', 'Accessoire'], ['b', 'Fond']];

export function AvatarBuilder({ value, onChange, level = 1 }) {
  const [tab, setTab] = useState('s');
  const av = { ...DEFAULT_AVATAR, ...value };
  const set = (k, v) => { sfx.tap(); onChange({ ...av, [k]: v }); };
  let opts = [];
  if (tab === 's') opts = SPECIES.map(([k, n]) => ({ v: k, n, prev: { ...av, s: k } }));
  if (tab === 'c') opts = COLORS.map((c, i) => ({ v: i, color: c }));
  if (tab === 'b') opts = BGS.map((c, i) => ({ v: i, color: c }));
  if (tab === 'e') opts = EYES.map((n, i) => ({ v: i, n, prev: { ...av, e: i } }));
  if (tab === 'm') opts = MOUTHS.map((n, i) => ({ v: i, n, prev: { ...av, m: i } }));
  if (tab === 'x') opts = ACCS.map(([k, n, lv]) => ({ v: k, n, prev: { ...av, x: k }, lv }));
  return (
    <div class="builder">
      <div class="builder-preview"><Avatar av={av} size={132} class="pop" key={JSON.stringify(av)} /></div>
      <div class="chips scroll-x" role="tablist">
        {TABS.map(([k, n]) => <button type="button" role="tab" aria-selected={tab === k} class={'chip-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      <div class={'opt-grid' + (opts[0] && opts[0].color ? ' colors' : '')}>
        {opts.map((o) => {
          const locked = o.lv && level < o.lv;
          const on = av[tab] === o.v;
          return (
            <button type="button" class={'opt' + (on ? ' on' : '') + (locked ? ' locked' : '')} aria-pressed={on} disabled={locked}
              onClick={() => set(tab, o.v)} aria-label={o.n || 'couleur'}>
              {o.color ? <span class="swatch" style={{ background: o.color }} /> : <Avatar av={o.prev} size={54} />}
              {o.n && <small>{o.n}</small>}
              {locked && <span class="lockbadge"><Icon name="lock" size={12} />Niv. {o.lv}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
