/* Widgets de Français (langue) — vanilla JS. Chaque widget : (el, opts) => destroy() */
import { frame, $, $$, reduced } from './index.js';

/* ---------- frise : les 3 rapports de temps ---------- */
const RAPPORTS = {
  ant: {
    nom: 'Antériorité', mode: 'subjonctif', cls: 'subj',
    conj: ['avant que', "jusqu'à ce que", 'en attendant que'],
    def: "L'action de la <b>principale</b> se passe <b>AVANT</b> celle de la subordonnée.",
    ex: ["L'aviateur vivra isolé dans le désert", "jusqu'à ce que son moteur <u>soit</u> réparé."],
    p: 0.22, s: 0.7
  },
  sim: {
    nom: 'Simultanéité', mode: 'indicatif', cls: 'ind',
    conj: ['pendant que', 'tandis que', 'au moment où', 'à mesure que', 'comme', 'chaque fois que', 'lorsque', 'quand', 'alors que'],
    def: 'Les deux actions se passent <b>EN MÊME TEMPS</b>.',
    ex: ['Meaulnes a rencontré la jeune fille', "pendant qu'il <u>se trouvait</u> à bord du bateau."],
    p: 0.48, s: 0.48
  },
  post: {
    nom: 'Postériorité', mode: 'indicatif', cls: 'ind',
    conj: ['après que', 'depuis que', 'dès que', 'aussitôt que', 'quand', 'lorsque'],
    def: "L'action de la <b>principale</b> se passe <b>APRÈS</b> celle de la subordonnée.",
    ex: ["L'aviateur vivait seul", "depuis que son avion <u>était tombé</u> en panne."],
    p: 0.74, s: 0.26
  }
};

function frise(el) {
  const w = frame(el, `<div class="w-chips fr-tabs">${Object.entries(RAPPORTS).map(([k, r], i) => `<button type="button" data-r="${k}" class="${i ? '' : 'on'}">${r.nom}</button>`).join('')}</div>
    <svg class="w-svg" viewBox="0 0 400 150"></svg>
    <div class="fr-info"></div>`);
  const svg = $('svg', w), info = $('.fr-info', w);
  let cur = 'ant', pos = { p: RAPPORTS.ant.p, s: RAPPORTS.ant.s }, alive = true;
  function draw() {
    const r = RAPPORTS[cur];
    const X = (f) => 30 + f * 340;
    const px = X(pos.p), sx = X(pos.s);
    svg.innerHTML = `<defs><marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="var(--ink-soft)"/></marker></defs>
      <line x1="20" y1="80" x2="385" y2="80" stroke="var(--ink-soft)" stroke-width="3" marker-end="url(#ar)"/>
      <text x="380" y="104" text-anchor="end" class="w-t" style="fill:var(--ink-2)">temps →</text>
      <g transform="translate(${px} 0)"><rect x="-46" y="22" width="92" height="34" rx="12" fill="var(--primary)"/><text x="0" y="44" text-anchor="middle" style="fill:#fff;font:800 13px var(--f-body)">PRINCIPALE</text><line x1="0" y1="56" x2="0" y2="80" stroke="var(--primary)" stroke-width="3"/><circle cx="0" cy="80" r="7" fill="var(--primary)"/></g>
      <g transform="translate(${sx} 0)"><circle cx="0" cy="80" r="7" fill="var(--orange)"/><line x1="0" y1="80" x2="0" y2="104" stroke="var(--orange)" stroke-width="3"/><rect x="-52" y="104" width="104" height="34" rx="12" fill="var(--orange)"/><text x="0" y="126" text-anchor="middle" style="fill:#fff;font:800 13px var(--f-body)">SUBORDONNÉE</text></g>`;
  }
  function show(k) {
    cur = k; const r = RAPPORTS[k];
    $$('.fr-tabs button', w).forEach((b) => b.classList.toggle('on', b.dataset.r === k));
    info.innerHTML = `<p>${r.def}</p>
      <div class="fr-conj">${r.conj.map((c, i) => `<span style="animation-delay:${i * 0.05}s">${c}</span>`).join('')}</div>
      <p class="fr-mode ${r.cls}">+ ${r.mode.toUpperCase()}</p>
      <p class="fr-ex"><span class="pp">${r.ex[0]}</span> <span class="sub">${r.ex[1]}</span></p>`;
  }
  w.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) show(b.dataset.r); });
  (function loop() {
    if (!alive) return;
    const r = RAPPORTS[cur], k = reduced() ? 1 : 0.12;
    pos.p += (r.p - pos.p) * k; pos.s += (r.s - pos.s) * k;
    draw(); requestAnimationFrame(loop);
  })();
  show('ant');
  return () => { alive = false; };
}

/* ---------- conjugueur : imparfait / passé simple ---------- */
const PERS = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
const END = {
  imp: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
  ai: ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'],
  is: ['is', 'is', 'it', 'îmes', 'îtes', 'irent'],
  us: ['us', 'us', 'ut', 'ûmes', 'ûtes', 'urent'],
  ins: ['ins', 'ins', 'int', 'înmes', 'întes', 'inrent']
};
const MODEL = { ai: '1er groupe · en -ai', is: 'en -is · 2e groupe, 3e modèle 1', us: 'en -us · 3e groupe modèle 2', ins: 'en -ins · venir, tenir' };
const VERBS = [
  ['aimer', 'aim', 'aim', 'ai'], ['finir', 'finiss', 'fin', 'is'], ['être', 'ét', 'f', 'us'], ['avoir', 'av', 'e', 'us'],
  ['aller', 'all', 'all', 'ai'], ['mettre', 'mett', 'm', 'is'], ['prendre', 'pren', 'pr', 'is'], ['faire', 'fais', 'f', 'is'],
  ['dire', 'dis', 'd', 'is'], ['voir', 'voy', 'v', 'is'], ['partir', 'part', 'part', 'is'], ['écrire', 'écriv', 'écriv', 'is'],
  ['boire', 'buv', 'b', 'us'], ['vouloir', 'voul', 'voul', 'us'], ['pouvoir', 'pouv', 'p', 'us'], ['lire', 'lis', 'l', 'us'],
  ['venir', 'ven', 'v', 'ins'], ['tenir', 'ten', 't', 'ins'], ['crier', 'cri', 'cri', 'ai'], ['payer', 'pay', 'pay', 'ai']
];
const PIEGES = {
  être: "Piège : <b>je fus</b> (être) ≠ <b>je fis</b> (faire).", faire: "Piège : <b>je fis</b> (faire) ≠ <b>je fus</b> (être).",
  voir: "Piège : <b>je vis</b> (voir, passé simple) ≠ <b>je vis</b> (vivre, présent).", crier: "À l'imparfait : nous cr<b>ii</b>ons, vous cr<b>ii</b>ez (deux i) !",
  payer: "À l'imparfait : nous pa<b>yi</b>ons, vous pa<b>yi</b>ez (y + i) !", finir: 'À l\'imparfait, n\'oublie pas le <b>-iss-</b> : je finissais.',
  aller: '3e groupe, mais passé simple en <b>-ai</b> comme le 1er groupe : j\'allai.'
};

function conjugueur(el) {
  const w = frame(el, `<div class="w-chips cj-tense"><button type="button" data-t="imp" class="on">Imparfait</button><button type="button" data-t="ps">Passé simple</button></div>
    <div class="cj-verbs scroll-x">${VERBS.map(([v], i) => `<button type="button" data-v="${i}" class="${i ? '' : 'on'}">${v}</button>`).join('')}</div>
    <div class="cj-card"></div>
    <div class="w-row"><button type="button" class="w-btn" data-a="hide">Cacher les terminaisons</button></div>`);
  const card = $('.cj-card', w);
  let t = 'imp', vi = 0, hide = false, shown = new Set();
  function render() {
    const [inf, si, sp, set] = VERBS[vi];
    const stem = t === 'imp' ? si : sp, ends = t === 'imp' ? END.imp : END[set];
    const cls = t === 'imp' ? 'imp' : set;
    const elision = (p, form) => (p === 'je' && /^[aeéèêiouhy]/i.test(form) ? "j'" : p + ' ');
    card.innerHTML = `<div class="cj-head"><b>${inf}</b><span class="cj-model ${cls}">${t === 'imp' ? 'mêmes terminaisons pour tous les verbes' : MODEL[set]}</span></div>
      <ol class="cj-rows">${PERS.map((p, i) => {
        const form = stem + ends[i];
        const hid = hide && !shown.has(i);
        return `<li style="animation-delay:${i * 0.05}s"><span class="cj-p">${elision(p, form)}</span><span class="cj-f">${stem}<b class="cj-e ${cls}${hid ? ' hid' : ''}" data-i="${i}">${hid ? '?' : ends[i]}</b></span></li>`;
      }).join('')}</ol>
      ${PIEGES[inf] ? `<p class="cj-trap">${PIEGES[inf]}</p>` : ''}`;
  }
  w.addEventListener('click', (e) => {
    const b = e.target.closest('button, .cj-e'); if (!b) return;
    if (b.dataset.t) { t = b.dataset.t; shown.clear(); $$('.cj-tense button', w).forEach((x) => x.classList.toggle('on', x === b)); }
    if (b.dataset.v) { vi = +b.dataset.v; shown.clear(); $$('.cj-verbs button', w).forEach((x) => x.classList.toggle('on', x === b)); }
    if (b.dataset.a === 'hide') { hide = !hide; shown.clear(); b.textContent = hide ? 'Montrer les terminaisons' : 'Cacher les terminaisons'; b.classList.toggle('on', hide); }
    if (b.classList.contains('cj-e') && hide) shown.add(+b.dataset.i);
    render();
  });
  render();
  return () => {};
}

/* ---------- scène de film : arrière-plan / premier plan ---------- */
const SCENES = [
  { bg: [['Je ', 'lisais', " le journal depuis un quart d'heure"]], fg: [['quand soudain le téléphone ', 'sonna', '.']] },
  { bg: [['Il ', 'roulait', ' tranquillement']], fg: [['lorsque, soudain, une voiture ', 'heurta', " l'arrière de son véhicule."]] },
  { bg: [['Nous ', 'regardions', ' un film']], fg: [['quand tout à coup notre chien ', 'aboya'], [' et ', 'se précipita', ' à la porte.']] }
];

function scene(el) {
  const w = frame(el, `<svg class="w-svg" viewBox="0 0 400 170"></svg><p class="sc-phrase"></p>
    <div class="w-row"><button type="button" class="w-btn primary" data-a="play">Rejouer</button><button type="button" class="w-btn" data-a="next">Autre exemple</button></div>
    <div class="sc-legend"><p><i class="imp"></i><b>Imparfait</b> = arrière-plan : le décor, une action qui <b>dure</b>, pas terminée.</p><p><i class="ps"></i><b>Passé simple</b> = premier plan : une action <b>brève, terminée</b>, qui fait avancer l'histoire.</p></div>`);
  const svg = $('svg', w), ph = $('.sc-phrase', w);
  let si = 0, t0 = performance.now(), alive = true;
  function frameDraw() {
    const sc = SCENES[si], t = reduced() ? 9 : (performance.now() - t0) / 1000;
    const grow = Math.min(1, t / 1.6);
    let s = `<line x1="20" y1="110" x2="385" y2="110" stroke="var(--ink-soft)" stroke-width="2"/>
      <text x="20" y="160" class="w-t" style="fill:var(--ink-2)">passé</text>
      <rect x="30" y="92" width="${340 * grow}" height="36" rx="10" fill="var(--primary)" opacity=".85"/>
      <text x="40" y="115" style="fill:#fff;font:800 14px var(--f-body)">${grow > 0.4 ? sc.bg[0][1] + ' …' : ''}</text>
      <text x="40" y="84" style="fill:var(--primary);font:800 12px var(--f-body)">ARRIÈRE-PLAN</text>`;
    sc.fg.forEach((f, i) => {
      const at = 1.8 + i * 0.8, k = Math.max(0, Math.min(1, (t - at) / 0.35));
      if (k <= 0) return;
      const x = 250 + i * 70, sc2 = 0.6 + 0.4 * k + (k < 1 ? 0.2 * Math.sin(k * Math.PI) : 0);
      s += `<g transform="translate(${x} 60) scale(${sc2})" opacity="${k}"><path d="M4 -34 L-14 6 L-2 6 L-8 34 L14 -8 L2 -8 Z" fill="var(--orange)" stroke="#fff" stroke-width="2"/></g>
        <text x="${x}" y="${30 - (i % 2) * 0}" text-anchor="middle" style="fill:var(--orange);font:900 14px var(--f-body)" opacity="${k}">${f[1]}</text>
        <line x1="${x}" y1="94" x2="${x}" y2="128" stroke="var(--orange)" stroke-width="4" opacity="${k}"/>`;
    });
    if (t > 1.8) s += `<text x="370" y="84" text-anchor="end" style="fill:var(--orange);font:800 12px var(--f-body)">PREMIER PLAN</text>`;
    svg.innerHTML = s;
  }
  function phrase() {
    const sc = SCENES[si];
    ph.innerHTML = sc.bg.map(([a, v, b]) => `${a}<b class="v-imp">${v}</b>${b}`).join('') + ' ' + sc.fg.map(([a, v, b]) => `${a}<b class="v-ps">${v}</b>${b || ''}`).join('');
  }
  w.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'next') si = (si + 1) % SCENES.length;
    t0 = performance.now(); phrase();
  });
  (function loop() { if (!alive) return; frameDraw(); requestAnimationFrame(loop); })();
  phrase();
  return () => { alive = false; };
}

/* ---------- concordance des temps (postériorité) ---------- */
function concordance(el) {
  const ROWS = [
    ['présent', 'passé composé', 'Après qu\'elle <u>a fini</u> sa journée, ses amis la <b>rejoignent</b>.'],
    ['imparfait', 'plus-que-parfait', 'Depuis que les parents <u>étaient revenus</u>, la famille se <b>retrouvait</b> chez eux.'],
    ['futur simple', 'futur antérieur', 'Dès que le signal <u>aura été donné</u>, vous <b>partirez</b>.'],
    ['passé simple', 'passé antérieur', 'Lorsque le premier grimpeur <u>fut arrivé</u> au sommet, la corde <b>cassa</b>.']
  ];
  const w = frame(el, `<p class="cc-title">Avec la <b>postériorité</b>, la subordonnée prend un <b>temps composé</b> : son action est déjà finie.</p>
    <div class="cc-rows">${ROWS.map(([a, b], i) => `<button type="button" class="cc-row" data-i="${i}"><span class="cc-p">${a}</span><span class="cc-arrow">→</span><span class="cc-s">${b}</span></button>`).join('')}</div>
    <p class="cc-ex"></p>
    <p class="cc-tip">Astuce : le temps composé utilise l'auxiliaire <b>au même temps</b> que la principale. Imparfait → <b>avait</b> fini · Futur → <b>aura</b> fini · Passé simple → <b>eut</b> fini.</p>`);
  const ex = $('.cc-ex', w);
  const pick = (i) => { $$('.cc-row', w).forEach((r) => r.classList.toggle('on', +r.dataset.i === i)); ex.innerHTML = `<span class="pp-lbl">Principale</span> / <span class="sub-lbl">subordonnée</span><br>${ROWS[i][2]}`; };
  w.addEventListener('click', (e) => { const b = e.target.closest('.cc-row'); if (b) pick(+b.dataset.i); });
  pick(0);
  return () => {};
}

export const frWidgets = { frise, conjugueur, scene, concordance };
