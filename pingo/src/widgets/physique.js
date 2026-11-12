/* Widgets interactifs de Physique-Chimie (vanilla JS). Chaque widget : (el, opts) => destroy() */
import { sim, label, frame, stepper, $, $$, C, T, reduced } from './index.js';

const rand = (a, b) => a + Math.random() * (b - a);
const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
const sci = (x, digits = 2) => {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  return `${(+m.toFixed(digits)).toString().replace('.', ',')} × 10${sup(e)}`;
};

/* ---------- électrisation par frottement ---------- */
function frottement(el) {
  const MATS = { pvc: ['PVC', -1, '#C9A227'], ebonite: ['Ébonite', -1, '#3F4A6B'], verre: ['Verre', 1, '#9EC9E8'], plexi: ['Plexiglas', 1, '#B8D8F0'] };
  const w = frame(el, `<div class="w-chips">${Object.entries(MATS).map(([k, m], i) => `<button type="button" data-m="${k}" class="${i ? '' : 'on'}">${m[0]}</button>`).join('')}</div>
    <canvas class="w-canvas"></canvas>
    <div class="w-row"><button type="button" class="w-btn primary" data-a="rub">Frotter</button><button type="button" class="w-btn" data-a="reset">Recommencer</button><span class="w-stat">Électrons déplacés : <b>0</b></span></div>
    <p class="w-cap">Frotte le bâton avec la laine.</p>`);
  const W = 600, H = 300;
  const s = { mat: 'pvc', k: 0, rub: 0, off: 0, flying: [], dragX: null };
  const stat = $('.w-stat b', w), cap = $('.w-cap', w);
  const caption = () => {
    const [name, sign] = MATS[s.mat];
    if (!s.k) { cap.innerHTML = `Le bâton en <b>${name}</b> et la laine sont <b>neutres</b>. Frotte !`; return; }
    cap.innerHTML = sign < 0
      ? `Le bâton en <b>${name}</b> a <b>arraché ${s.k} électrons</b> à la laine : bâton <b class="r">négatif</b>, laine <b class="r">positive</b>.`
      : `La laine a <b>arraché ${s.k} électrons</b> au bâton en <b>${name}</b> : bâton <b class="r">positif</b>, laine <b class="r">négative</b>.`;
  };
  const stop = sim($('canvas', w), W, H, {
    step(dt, t) {
      if (s.rub > 0) {
        s.rub -= dt; s.off = Math.sin(t * 22) * 40;
        if (Math.random() < dt * 6 && s.k + s.flying.length < 14) {
          const sign = MATS[s.mat][1];
          const from = sign < 0 ? { x: 300 + rand(-60, 60), y: 205 } : { x: 300 + rand(-80, 80), y: 120 };
          const to = sign < 0 ? { x: 300 + rand(-150, 150), y: 120 } : { x: 300 + rand(-70, 70), y: 205 };
          s.flying.push({ ...from, tx: to.x, ty: to.y, p: 0 });
        }
      } else s.off *= 1 - dt * 6;
      for (const f of s.flying) f.p += dt * 1.6;
      const done = s.flying.filter((f) => f.p >= 1).length;
      if (done) { s.k += done; s.flying = s.flying.filter((f) => f.p < 1); stat.textContent = s.k; caption(); }
    },
    draw(ctx) {
      const [, sign, col] = MATS[s.mat];
      // laine
      ctx.save(); ctx.translate(300 + s.off * 0.6, 220);
      ctx.fillStyle = C('horn'); ctx.globalAlpha = 0.85;
      for (const [x, y, r] of [[-70, 0, 42], [-25, -14, 46], [25, -8, 48], [70, 4, 40], [0, 18, 46], [-50, 22, 36], [50, 24, 36]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.restore();
      label(ctx, 'laine', 300 + s.off * 0.6, 288, C('ink'), 'center');
      // bâton
      ctx.save(); ctx.translate(300 - s.off, 118);
      ctx.fillStyle = col; ctx.strokeStyle = C('ink-soft'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-190, -16, 380, 32, 16) : ctx.rect(-190, -16, 380, 32); ctx.fill(); ctx.stroke();
      ctx.restore();
      // charges
      ctx.font = '900 22px "Nunito Variable", system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const rodSym = sign < 0 ? '−' : '+', woolSym = sign < 0 ? '+' : '−';
      for (let i = 0; i < s.k; i++) {
        ctx.fillStyle = sign < 0 ? C('nuc') : C('red');
        ctx.fillText(rodSym, 300 - s.off - 160 + (i % 7) * 52 + (i >= 7 ? 26 : 0), 118 + (i >= 7 ? 8 : -6));
        ctx.fillStyle = sign < 0 ? C('red') : C('nuc');
        ctx.fillText(woolSym, 300 + s.off * 0.6 - 90 + (i % 7) * 30, 205 + (i >= 7 ? 22 : 0));
      }
      // électrons en vol
      for (const f of s.flying) {
        const x = f.x + (f.tx - f.x) * f.p, y = f.y + (f.ty - f.y) * f.p - Math.sin(f.p * Math.PI) * 30;
        ctx.fillStyle = C('sweat'); ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '900 14px system-ui'; ctx.fillText('−', x, y + 1);
      }
      label(ctx, `bâton en ${MATS[s.mat][0]}`, 300 - s.off, 76, C('ink'), 'center');
      label(ctx, 'électron = −', 70, 24, C('sweat'), 'left');
    }
  });
  const reset = () => { s.k = 0; s.flying = []; stat.textContent = 0; caption(); };
  w.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.m) { s.mat = b.dataset.m; $$('.w-chips button', w).forEach((x) => x.classList.toggle('on', x === b)); reset(); }
    if (b.dataset.a === 'rub') s.rub = 1.2;
    if (b.dataset.a === 'reset') reset();
  });
  const cv = $('canvas', w);
  cv.addEventListener('pointerdown', (e) => { s.dragX = e.clientX; });
  cv.addEventListener('pointermove', (e) => { if (s.dragX !== null && Math.abs(e.clientX - s.dragX) > 8) { s.rub = 0.25; s.dragX = e.clientX; } });
  addEventListener('pointerup', () => { s.dragX = null; });
  caption();
  return stop;
}

/* ---------- attraction / répulsion ---------- */
function charges(el) {
  const w = frame(el, `<svg class="w-svg" viewBox="0 0 400 260"></svg><p class="w-cap"></p>`);
  const svg = $('svg', w), cap = $('.w-cap', w);
  const st = [-1, -1]; let ang = [0, 0], alive = true;
  const names = { '-1': '−', '0': '0', '1': '+' };
  function target() {
    const [a, b] = st;
    if (!a && !b) return [0, 0];
    if (!a || !b) return [12, -12];
    return a === b ? [-22, 22] : [16, -16];
  }
  function text() {
    const [a, b] = st;
    if (!a && !b) return 'Deux corps <b>neutres</b> : rien ne se passe.';
    if (!a || !b) return 'Un corps chargé attire aussi un corps <b>neutre</b> (par influence).';
    return a === b ? 'Charges de <b>même signe</b> : elles <b class="r">se repoussent</b>.' : 'Charges de <b>signes contraires</b> : elles <b class="r">s\'attirent</b>.';
  }
  function draw() {
    const P = [[150, 20], [250, 20]];
    svg.innerHTML = `<line x1="60" y1="20" x2="340" y2="20" stroke="var(--ink-soft)" stroke-width="5" stroke-linecap="round"/>` + P.map(([x, y], i) => {
      const a = ang[i] * Math.PI / 180, bx = x + Math.sin(a) * 170, by = y + Math.cos(a) * 170;
      const sg = st[i], fill = sg > 0 ? 'var(--red)' : sg < 0 ? 'var(--nuc)' : 'var(--cell-2)';
      return `<line x1="${x}" y1="${y}" x2="${bx}" y2="${by}" stroke="var(--ink-soft)" stroke-width="2"/>
        <g class="w-ball" data-i="${i}" role="button" tabindex="0" style="cursor:pointer"><circle cx="${bx}" cy="${by}" r="30" fill="${fill}" stroke="var(--ink)" stroke-width="2.5"/>
        <text x="${bx}" y="${by + 9}" text-anchor="middle" style="fill:#fff;font:900 28px var(--f-display)">${names[sg]}</text></g>`;
    }).join('') + `<text x="200" y="250" text-anchor="middle" class="w-t">Touche une boule pour changer sa charge</text>`;
  }
  svg.addEventListener('pointerdown', (e) => { const g = e.target.closest('.w-ball'); if (!g) return; const i = +g.dataset.i; st[i] = st[i] === -1 ? 1 : st[i] === 1 ? 0 : -1; cap.innerHTML = text(); });
  (function loop() {
    if (!alive) return;
    const t = target(); ang = ang.map((a, i) => a + (t[i] - a) * (reduced() ? 1 : 0.08));
    draw(); requestAnimationFrame(loop);
  })();
  cap.innerHTML = text();
  return () => { alive = false; };
}

/* ---------- pendule : électrisation par contact ---------- */
function pendule(el) {
  const base = (ang, ballCh, rodX, rodCh, extra = '') => {
    const a = ang * Math.PI / 180, bx = 150 + Math.sin(a) * 120, by = 30 + Math.cos(a) * 120;
    const minus = (n, x0, y, dx) => Array.from({ length: n }, (_, i) => `<text x="${x0 + i * dx}" y="${y}" text-anchor="middle" style="fill:var(--nuc);font:900 18px var(--f-display)">−</text>`).join('');
    return `<path d="M60 230 L120 230 L120 30 L150 30" fill="none" stroke="var(--horn)" stroke-width="6" stroke-linecap="round"/><rect x="40" y="228" width="120" height="10" rx="4" fill="var(--horn)"/>
      <line x1="150" y1="30" x2="${bx}" y2="${by}" stroke="var(--ink-soft)" stroke-width="2"/>
      <circle cx="${bx}" cy="${by}" r="16" fill="var(--cell-2)" stroke="var(--ink)" stroke-width="2.5"/>${minus(ballCh, bx - (ballCh - 1) * 5, by + 6, 10)}
      <rect x="${rodX}" y="${by - 10}" width="190" height="20" rx="10" fill="#C9A227" stroke="var(--ink-soft)" stroke-width="2"/>${minus(rodCh, rodX + 20, by + 6, 22)}${extra}`;
  };
  return stepper(el, '0 0 400 250', [
    { svg: base(0, 0, 230, 7) + T(150, 200, 'boule neutre') + T(320, 120, 'ébonite (−)'), cap: '<b>1.</b> La boule du pendule est <b>neutre</b>. Le bâton d\'ébonite est chargé <b>négativement</b>.' },
    { svg: base(0, 0, 167, 7) + `<circle cx="160" cy="146" r="6" fill="var(--sweat)"/><circle cx="175" cy="156" r="6" fill="var(--sweat)"/>` + T(200, 200, 'contact : des électrons passent', 'w-t-r'), cap: '<b>2. Contact</b> : des électrons passent du bâton à la boule.' },
    { svg: base(0, 3, 230, 4) + T(150, 200, 'boule chargée (−)', 'w-t-r'), cap: '<b>3.</b> La boule est maintenant chargée <b>négativement</b>, comme le bâton.' },
    { svg: base(-28, 3, 185, 4) + T(250, 220, 'répulsion !', 'w-t-r'), cap: '<b>4. Répulsion</b> : même signe, donc le bâton repousse la boule. Le corps électrisé par contact a le <b>même signe</b> que le corps électrisant.' }
  ]);
}

/* ---------- électroscope : influence ---------- */
function electroscope(el) {
  const w = frame(el, `<svg class="w-svg" viewBox="0 0 400 280"></svg>
    <label class="w-slider">Approcher le bâton <input type="range" min="0" max="100" value="0" aria-label="Distance du bâton"></label>
    <div class="w-chips"><button type="button" data-s="-1" class="on">Bâton d'ébonite (−)</button><button type="button" data-s="1">Bâton de verre (+)</button></div>
    <p class="w-cap"></p>`);
  const svg = $('svg', w), cap = $('.w-cap', w), range = $('input', w);
  let sign = -1;
  function draw() {
    const p = +range.value / 100, ang = 6 + 34 * p, rodX = 360 - 140 * p;
    const near = sign < 0 ? '+' : '−', far = sign < 0 ? '−' : '+';
    const nc = sign < 0 ? 'var(--red)' : 'var(--nuc)', fc = sign < 0 ? 'var(--nuc)' : 'var(--red)';
    const n = Math.round(p * 4);
    const a = ang * Math.PI / 180;
    const lx = 190 - Math.sin(a) * 60, rx = 190 + Math.sin(a) * 60, ly = 190 + Math.cos(a) * 60;
    svg.innerHTML = `<path d="M110 270 L110 120 Q110 95 135 95 L245 95 Q270 95 270 120 L270 270" fill="none" stroke="var(--ink-soft)" stroke-width="3"/>
      <line x1="90" y1="270" x2="290" y2="270" stroke="var(--ink-soft)" stroke-width="3"/>
      <rect x="170" y="88" width="40" height="16" rx="3" fill="var(--horn)"/>
      <line x1="190" y1="70" x2="190" y2="190" stroke="var(--ink-soft)" stroke-width="4"/>
      <circle cx="190" cy="60" r="16" fill="#C9A227" stroke="var(--ink)" stroke-width="2"/>
      <line x1="190" y1="190" x2="${lx}" y2="${ly}" stroke="#E0A300" stroke-width="5" stroke-linecap="round"/>
      <line x1="190" y1="190" x2="${rx}" y2="${ly}" stroke="#E0A300" stroke-width="5" stroke-linecap="round"/>
      ${Array.from({ length: n }, (_, i) => `<text x="${178 + (i % 2) * 24}" y="${50 + (i > 1 ? 24 : 0)}" text-anchor="middle" style="fill:${nc};font:900 16px var(--f-display)">${near}</text>`).join('')}
      ${Array.from({ length: n }, (_, i) => `<text x="${i % 2 ? rx + 10 : lx - 10}" y="${ly - 14 + (i > 1 ? 18 : 0)}" text-anchor="middle" style="fill:${fc};font:900 16px var(--f-display)">${far}</text>`).join('')}
      <rect x="${rodX}" y="30" width="170" height="22" rx="11" fill="${sign < 0 ? '#3F4A6B' : '#9EC9E8'}" stroke="var(--ink-soft)" stroke-width="2"/>
      ${Array.from({ length: 5 }, (_, i) => `<text x="${rodX + 22 + i * 30}" y="47" text-anchor="middle" style="fill:${sign < 0 ? '#fff' : 'var(--red)'};font:900 16px var(--f-display)">${sign < 0 ? '−' : '+'}</text>`).join('')}
      <text x="40" y="160" class="w-t">feuilles</text>`;
    cap.innerHTML = p < 0.1 ? 'Le bâton est loin : les feuilles restent fermées.'
      : `Le bâton <b>s'approche sans toucher</b> : les feuilles <b class="r">se repoussent</b>. Elles portent des charges <b>${far === '−' ? 'négatives' : 'positives'}</b>, de même signe que le bâton. C'est l'<b>influence</b>.`;
  }
  range.addEventListener('input', draw);
  w.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; sign = +b.dataset.s; $$('.w-chips button', w).forEach((x) => x.classList.toggle('on', x === b)); draw(); });
  draw();
  return () => {};
}

/* ---------- calculateur |q| = n × e ---------- */
function qcalc(el) {
  const w = frame(el, `<label class="w-slider">Nombre d'électrons : <b class="mono" data-n></b>
      <input type="range" min="10" max="99" value="40" data-k="m" aria-label="Chiffres"><input type="range" min="8" max="17" value="13" data-k="e" aria-label="Puissance de 10"></label>
    <div class="w-chips"><button type="button" data-g="-1" class="on">Gagnés (corps −)</button><button type="button" data-g="1">Perdus (corps +)</button></div>
    <div class="w-result"></div>`);
  const [rm, re] = $$('input', w), out = $('.w-result', w), nEl = $('[data-n]', w); let g = -1;
  function draw() {
    const m = +rm.value / 10, e = +re.value, q = m * 10 ** e * 1.6e-19;
    nEl.textContent = `${String(m).replace('.', ',')} × 10${sup(e)}`;
    const sgn = g < 0 ? '−' : '+';
    out.innerHTML = `<p class="mono">|q| = n × e = ${String(m).replace('.', ',')} × 10${sup(e)} × 1,6 × 10⁻¹⁹</p>
      <p class="w-big">q = ${sgn}${sci(q)} C</p>
      <p class="mono">= ${sgn}${(q * 1e3).toPrecision(3).replace('.', ',')} mC = ${sgn}${(q * 1e6).toPrecision(3).replace('.', ',')} µC = ${sgn}${(q * 1e9).toPrecision(3).replace('.', ',')} nC</p>`;
  }
  w.addEventListener('input', draw);
  w.addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; g = +b.dataset.g; $$('.w-chips button', w).forEach((x) => x.classList.toggle('on', x === b)); draw(); });
  draw();
  return () => {};
}

/* ---------- mélanges homogène / hétérogène ---------- */
function melange(el) {
  const w = frame(el, `<canvas class="w-canvas"></canvas><div class="w-row"><button type="button" class="w-btn primary">Agiter</button><span class="w-stat"></span></div>`);
  const W = 600, H = 300; const N = 90;
  const beakers = [{ x: 150, name: 'eau + alcool', mix: true }, { x: 450, name: 'eau + huile', mix: false }];
  const parts = beakers.map((b) => Array.from({ length: N }, (_, i) => ({ k: i % 2, x: b.x + rand(-80, 80), y: rand(100, 260), vx: 0, vy: 0 })));
  let shake = 0, tsince = 10;
  const stat = $('.w-stat', w);
  const stop = sim($('canvas', w), W, H, {
    step(dt) {
      shake = Math.max(0, shake - dt); tsince += dt;
      beakers.forEach((b, bi) => {
        for (const p of parts[bi]) {
          if (shake > 0) { p.vx += rand(-900, 900) * dt; p.vy += rand(-900, 900) * dt; }
          else if (!b.mix) { const tgt = p.k ? 135 + (p.x % 7) * 6 : 205 + (p.x % 9) * 6; p.vy += (tgt - p.y) * 2.2 * dt; }
          else { p.vx += rand(-40, 40) * dt; p.vy += rand(-40, 40) * dt; }
          p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          p.x = Math.max(b.x - 82, Math.min(b.x + 82, p.x)); p.y = Math.max(108, Math.min(262, p.y));
        }
      });
      stat.innerHTML = shake > 0 ? 'On agite…' : tsince < 2.5 ? 'On laisse reposer…' : '<b>Homogène</b> : une seule phase · <b>Hétérogène</b> : deux phases';
    },
    draw(ctx) {
      beakers.forEach((b, bi) => {
        ctx.fillStyle = C('paper'); ctx.strokeStyle = C('ink-soft'); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.x - 92, 80); ctx.lineTo(b.x - 92, 270); ctx.quadraticCurveTo(b.x - 92, 278, b.x - 84, 278); ctx.lineTo(b.x + 84, 278); ctx.quadraticCurveTo(b.x + 92, 278, b.x + 92, 270); ctx.lineTo(b.x + 92, 80); ctx.stroke();
        for (const p of parts[bi]) {
          ctx.fillStyle = p.k ? (b.mix ? 'rgba(160,190,255,.85)' : 'rgba(240,190,40,.9)') : 'rgba(80,150,255,.75)';
          ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 7); ctx.fill();
        }
        label(ctx, b.name, b.x, 40, C('ink'), 'center');
        if (shake <= 0 && tsince > 2.5) label(ctx, b.mix ? '1 phase : homogène' : '2 phases : hétérogène', b.x, 66, C('red'), 'center');
      });
    }
  });
  $('.w-btn', w).addEventListener('click', () => { shake = 1.2; tsince = -1.2; });
  return stop;
}

/* ---------- états de la matière ---------- */
function etats(el) {
  const w = frame(el, `<div class="w-chips"><button type="button" data-s="solide" class="on">Solide</button><button type="button" data-s="liquide">Liquide</button><button type="button" data-s="gaz">Gaz</button></div><canvas class="w-canvas"></canvas><p class="w-cap"></p>`);
  const W = 600, H = 300, R = 11, N = 42, box = { x0: 150, x1: 450, y0: 20, y1: 285 };
  const cap = $('.w-cap', w);
  let state = 'solide';
  const ps = Array.from({ length: N }, (_, i) => ({ x: 300, y: 200, vx: 0, vy: 0, i }));
  const lattice = (i) => { const cols = 7, r = Math.floor(i / cols), c = i % cols; return [box.x0 + 40 + c * 2 * R * 1.0 + (c * 2), box.y1 - R - 2 - r * 2 * R]; };
  const caps = { solide: 'Solide : molécules <b>serrées</b> (condensée) et <b>rangées</b> (ordonnée). Elles vibrent sur place.', liquide: 'Liquide : molécules <b>serrées</b> (condensée) mais <b>en désordre</b>. Elles glissent les unes sur les autres.', gaz: 'Gaz : molécules <b>éloignées</b> (non condensée) et <b>en désordre</b>. Elles foncent dans tous les sens.' };
  function set(s) { state = s; cap.innerHTML = caps[s]; if (s === 'gaz') ps.forEach((p) => { const a = rand(0, 6.28); p.vx = Math.cos(a) * 160; p.vy = Math.sin(a) * 160; }); }
  ps.forEach((p) => { const [x, y] = lattice(p.i); p.x = x; p.y = y; });
  const stop = sim($('canvas', w), W, H, {
    step(dt, t) {
      dt = Math.min(dt, 0.03);
      for (const p of ps) {
        if (state === 'solide') { const [x, y] = lattice(p.i); p.vx += (x - p.x) * 40 * dt + rand(-300, 300) * dt; p.vy += (y - p.y) * 40 * dt + rand(-300, 300) * dt; p.vx *= 1 - 8 * dt; p.vy *= 1 - 8 * dt; }
        else if (state === 'liquide') { p.vy += 500 * dt; p.vx += rand(-500, 500) * dt; p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt; }
        else { const sp = Math.hypot(p.vx, p.vy) || 1; p.vx *= 160 / sp; p.vy *= 160 / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < box.x0 + R) { p.x = box.x0 + R; p.vx = Math.abs(p.vx); } if (p.x > box.x1 - R) { p.x = box.x1 - R; p.vx = -Math.abs(p.vx); }
        if (p.y < box.y0 + R) { p.y = box.y0 + R; p.vy = Math.abs(p.vy); } if (p.y > box.y1 - R) { p.y = box.y1 - R; p.vy = -Math.abs(p.vy) * (state === 'liquide' ? 0.2 : 1); }
      }
      if (state !== 'solide') for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = ps[i], b = ps[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        if (d < 2 * R) { const o = (2 * R - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; if (state === 'gaz') { const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny; a.vx += (vb - va) * nx; a.vy += (vb - va) * ny; b.vx += (va - vb) * nx; b.vy += (va - vb) * ny; } }
      }
    },
    draw(ctx) {
      ctx.strokeStyle = C('ink-soft'); ctx.lineWidth = 3; ctx.strokeRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
      for (const p of ps) { ctx.fillStyle = state === 'gaz' ? C('sweat') : state === 'liquide' ? C('primary') || C('nuc') : C('nuc'); ctx.beginPath(); ctx.arc(p.x, p.y, R - 1, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 3, 0, 7); ctx.fill(); }
      label(ctx, state.toUpperCase(), 520, 30, C('red'), 'center');
    }
  });
  w.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; $$('.w-chips button', w).forEach((x) => x.classList.toggle('on', x === b)); set(b.dataset.s); });
  set('solide');
  return stop;
}

/* ---------- zoom dans la craie ---------- */
function zoom(el) {
  const chalk = `<rect x="110" y="80" width="140" height="56" rx="10" fill="#F4F1E8" stroke="var(--ink-soft)" stroke-width="3"/>`;
  const grains = Array.from({ length: 26 }, (_, i) => `<circle cx="${110 + (i * 53) % 150}" cy="${70 + (i * 37) % 90}" r="${6 + (i % 4) * 3}" fill="#E8E3D3" stroke="var(--ink-soft)" stroke-width="2"/>`).join('');
  const dust = Array.from({ length: 60 }, (_, i) => `<circle cx="${80 + (i * 29) % 210}" cy="${50 + (i * 17) % 120}" r="${2 + (i % 3)}" fill="var(--ink-soft)" opacity=".6"/>`).join('');
  const mol = Array.from({ length: 20 }, (_, i) => { const x = 105 + (i % 5) * 38, y = 60 + Math.floor(i / 5) * 34; return `<circle cx="${x}" cy="${y}" r="13" fill="var(--nuc)"/><circle cx="${x + 12}" cy="${y - 8}" r="7" fill="var(--sweat)"/><circle cx="${x - 12}" cy="${y - 8}" r="7" fill="var(--sweat)"/>`; }).join('');
  return stepper(el, '0 0 360 220', [
    { svg: chalk + T(180, 180, 'un morceau de craie · quelques cm'), cap: 'Un morceau de craie, à l\'œil nu.' },
    { svg: grains + T(180, 200, 'écrasée : des grains · ≈ 1 mm'), cap: 'On l\'écrase : on obtient des <b>grains</b>. La matière est <b>divisible</b>.' },
    { svg: dust + T(180, 200, 'poussière · ≈ 1 µm = 10⁻⁶ m'), cap: 'On continue : une poussière très fine, presque invisible.' },
    { svg: mol + T(180, 210, 'molécules · quelques Å = 10⁻¹⁰ m'), cap: 'Impossible d\'aller plus loin sans casser les <b>molécules</b> : la division est limitée, la matière est <b>discontinue</b>.' }
  ]);
}

/* ---------- circuit : interrupteur, courant, électrons, court-circuit ---------- */
function circuit(el) {
  const w = frame(el, `<svg class="w-svg" viewBox="0 0 400 260"></svg><div class="w-row"><button type="button" class="w-btn primary" data-a="k">Fermer l'interrupteur</button><button type="button" class="w-btn" data-a="cc">Court-circuiter L1</button></div><p class="w-cap"></p>`);
  const svg = $('svg', w), cap = $('.w-cap', w);
  let closed = false, cc = false, t = 0, alive = true, last = performance.now();
  // boucle : générateur en haut (+ à gauche), lampes en bas
  const pathPts = [[200, 40], [40, 40], [40, 220], [360, 220], [360, 40], [200, 40]];
  const segLen = pathPts.slice(1).map((p, i) => Math.hypot(p[0] - pathPts[i][0], p[1] - pathPts[i][1]));
  const total = segLen.reduce((a, b) => a + b, 0);
  const at = (d) => { d = ((d % total) + total) % total; for (let i = 0; i < segLen.length; i++) { if (d <= segLen[i]) { const [x0, y0] = pathPts[i], [x1, y1] = pathPts[i + 1], k = d / segLen[i]; return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]; } d -= segLen[i]; } return pathPts[0]; };
  function draw() {
    const on = closed, b1 = on && !cc, b2 = on;
    const glow = (x, lit, strong) => lit ? `<circle cx="${x}" cy="220" r="${strong ? 34 : 26}" fill="#FFD43B" opacity="${strong ? 0.55 : 0.35}"/>` : '';
    const lamp = (x, lit, strong) => `${glow(x, lit, strong)}<circle cx="${x}" cy="220" r="17" fill="${lit ? '#FFE680' : 'var(--surface)'}" stroke="var(--ink)" stroke-width="2.5"/><path d="M${x - 11} 209 L${x + 11} 231 M${x + 11} 209 L${x - 11} 231" stroke="var(--ink)" stroke-width="2.5"/>`;
    let s = `<path d="M185 40 L40 40 L40 220 L143 220 M177 220 L223 220 M257 220 L360 220 L360 40 L215 40" fill="none" stroke="var(--ink-soft)" stroke-width="3"/>`;
    s += `<line x1="185" y1="22" x2="185" y2="58" stroke="var(--ink)" stroke-width="4"/><line x1="215" y1="30" x2="215" y2="50" stroke="var(--ink)" stroke-width="7"/>`;
    s += `<text x="170" y="22" style="fill:var(--red);font:900 18px var(--f-display)">+</text><text x="222" y="24" style="fill:var(--nuc);font:900 18px var(--f-display)">−</text>`;
    // interrupteur sur le côté droit
    s += `<rect x="345" y="110" width="30" height="50" fill="var(--bg)"/><circle cx="360" cy="110" r="4" fill="var(--ink)"/><circle cx="360" cy="160" r="4" fill="var(--ink)"/>`;
    s += closed ? `<line x1="360" y1="110" x2="360" y2="160" stroke="var(--ink)" stroke-width="4"/>` : `<line x1="360" y1="160" x2="385" y2="118" stroke="var(--ink)" stroke-width="4"/>`;
    s += lamp(160, b1, false) + lamp(240, b2, cc);
    if (cc) s += `<path d="M135 220 Q160 265 185 220" fill="none" stroke="var(--red)" stroke-width="4"/>`;
    s += `<text x="160" y="196" text-anchor="middle" class="w-t">L1</text><text x="240" y="196" text-anchor="middle" class="w-t">L2</text>`;
    if (on) {
      for (let i = 0; i < 12; i++) { const [x, y] = at(i * total / 12 - t * 60); s += `<circle cx="${x}" cy="${y}" r="5" fill="var(--sweat)"/>`; }
      for (let i = 0; i < 4; i++) { const d = i * total / 4 + t * 60, [x, y] = at(d), [x2, y2] = at(d + 6), a = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI; s += `<path d="M-7 -6 L5 0 L-7 6" transform="translate(${x} ${y}) rotate(${a})" fill="none" stroke="var(--red)" stroke-width="3.5" stroke-linecap="round"/>`; }
    }
    s += `<text x="70" y="252" style="fill:var(--red);font:800 12px var(--f-body)">➜ sens du courant</text><text x="230" y="252" style="fill:var(--sweat);font:800 12px var(--f-body)">● électrons</text>`;
    svg.innerHTML = s;
  }
  function caption() {
    cap.innerHTML = !closed ? 'Circuit <b>ouvert</b> : pas de courant, les lampes sont éteintes.'
      : cc ? 'L1 est <b>court-circuitée</b> : ses bornes sont reliées par un fil, elle <b>ne s\'allume pas</b>. L2 brille plus fort.'
        : 'Circuit <b>fermé</b> : le courant sort par la borne <b>+</b> et revient par la borne <b>−</b>. Les électrons vont dans l\'autre sens.';
  }
  w.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'k') { closed = !closed; b.textContent = closed ? 'Ouvrir l\'interrupteur' : 'Fermer l\'interrupteur'; }
    if (b.dataset.a === 'cc') { cc = !cc; b.classList.toggle('on', cc); b.textContent = cc ? 'Retirer le fil' : 'Court-circuiter L1'; }
    caption(); draw();
  });
  (function loop(now) { if (!alive) return; t += Math.min(0.05, (now - last) / 1000) * (reduced() ? 0 : 1); last = now; draw(); requestAnimationFrame(loop); })(performance.now());
  caption();
  return () => { alive = false; };
}

/* ---------- ampèremètre à aiguille ---------- */
function amperemetre(el) {
  const I = 0.25, E = 30, CALS = [0.2, 0.3, 0.5, 1];
  const w = frame(el, `<svg class="w-svg" viewBox="0 0 400 230"></svg><div class="w-chips">${CALS.map((c, i) => `<button type="button" data-c="${c}" class="${i === 3 ? 'on' : ''}">${String(c).replace('.', ',')} A</button>`).join('')}</div><div class="w-result"></div>`);
  const svg = $('svg', w), out = $('.w-result', w);
  let C0 = 1, ang = -60, alive = true;
  function target() { const f = I / C0; return f > 1 ? 66 : -60 + 120 * f; }
  function draw() {
    let s = `<rect x="20" y="10" width="360" height="210" rx="22" fill="var(--surface)" stroke="var(--ink-soft)" stroke-width="3"/>`;
    for (let k = 0; k <= E; k++) {
      const a = (-60 + 120 * k / E) * Math.PI / 180, r1 = 140, r2 = k % 5 ? 128 : 120;
      s += `<line x1="${200 + Math.sin(a) * r1}" y1="${190 - Math.cos(a) * r1}" x2="${200 + Math.sin(a) * r2}" y2="${190 - Math.cos(a) * r2}" stroke="var(--ink)" stroke-width="${k % 5 ? 1.5 : 3}"/>`;
      if (!(k % 5)) s += `<text x="${200 + Math.sin(a) * 104}" y="${194 - Math.cos(a) * 104}" text-anchor="middle" style="fill:var(--ink-2);font:800 12px var(--f-body)">${k}</text>`;
    }
    const a = ang * Math.PI / 180;
    s += `<line x1="200" y1="190" x2="${200 + Math.sin(a) * 135}" y2="${190 - Math.cos(a) * 135}" stroke="var(--red)" stroke-width="4" stroke-linecap="round"/><circle cx="200" cy="190" r="9" fill="var(--ink)"/>`;
    s += `<text x="200" y="150" text-anchor="middle" style="fill:var(--ink);font:700 26px var(--f-display)">A</text>`;
    svg.innerHTML = s;
  }
  function info() {
    if (I > C0) { out.innerHTML = `<p class="w-big bad">Calibre trop petit !</p><p>L'aiguille sort de l'échelle : l'ampèremètre risque d'être <b>endommagé</b>. Il faut un calibre <b>supérieur</b> à l'intensité.</p>`; return; }
    const L = I * E / C0;
    out.innerHTML = `<p>Lecture : L = <b>${(+L.toFixed(2)).toString().replace('.', ',')}</b> divisions sur E = ${E}</p><p class="mono">I = L × C / E = ${(+L.toFixed(2)).toString().replace('.', ',')} × ${String(C0).replace('.', ',')} / ${E} = <b>0,25 A</b></p>
      <p>${C0 === 0.3 ? '<b class="g">Meilleur calibre</b> : le plus petit au-dessus de 0,25 A, l\'aiguille va loin, la mesure est la plus précise.' : 'Ça marche, mais un calibre plus petit (tout en restant au-dessus de I) serait plus précis.'}</p>`;
  }
  w.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; C0 = +b.dataset.c; $$('.w-chips button', w).forEach((x) => x.classList.toggle('on', x === b)); info(); });
  (function loop() { if (!alive) return; const tg = target(); ang += (tg - ang) * (reduced() ? 1 : 0.1); if (I > C0 && Math.abs(tg - ang) < 1) ang = tg + Math.sin(performance.now() / 40) * 1.5; draw(); requestAnimationFrame(loop); })();
  info();
  return () => { alive = false; };
}

/* ---------- loi des nœuds ---------- */
function noeuds(el) {
  const w = frame(el, `<svg class="w-svg" viewBox="0 0 400 240"></svg>
    <label class="w-slider">I1 (branche de L1) : <b data-v="1"></b><input type="range" min="0" max="50" value="28" data-i="1" aria-label="I1"></label>
    <label class="w-slider">I2 (branche de L2) : <b data-v="2"></b><input type="range" min="0" max="50" value="12" data-i="2" aria-label="I2"></label>
    <p class="w-big"></p>`);
  const svg = $('svg', w), big = $('.w-big', w), [r1, r2] = $$('input', w);
  let t = 0, alive = true, last = performance.now();
  const fmt = (x) => (x / 100).toFixed(2).replace('.', ',');
  function draw() {
    const i1 = +r1.value, i2 = +r2.value, I = i1 + i2;
    $('[data-v="1"]', w).textContent = fmt(i1) + ' A'; $('[data-v="2"]', w).textContent = fmt(i2) + ' A';
    big.innerHTML = `I = I1 + I2 = ${fmt(i1)} + ${fmt(i2)} = <b>${fmt(I)} A</b>`;
    const lamp = (x, y, c) => `<circle cx="${x}" cy="${y}" r="${18 + c / 6}" fill="#FFD43B" opacity="${Math.min(0.6, c / 70)}"/><circle cx="${x}" cy="${y}" r="15" fill="${c > 3 ? '#FFE680' : 'var(--surface)'}" stroke="var(--ink)" stroke-width="2.5"/><path d="M${x - 10} ${y - 10} L${x + 10} ${y + 10} M${x + 10} ${y - 10} L${x - 10} ${y + 10}" stroke="var(--ink)" stroke-width="2.5"/>`;
    let s = `<path d="M40 40 L360 40 L360 120 M40 40 L40 120 M40 120 L40 200 L360 200 L360 120 M40 120 L360 120" fill="none" stroke="var(--ink-soft)" stroke-width="3"/>`;
    s += `<rect x="185" y="25" width="30" height="30" fill="var(--bg)"/><line x1="192" y1="22" x2="192" y2="58" stroke="var(--ink)" stroke-width="4"/><line x1="208" y1="30" x2="208" y2="50" stroke="var(--ink)" stroke-width="7"/>`;
    s += lamp(200, 120, i1) + lamp(200, 200, i2);
    s += `<circle cx="40" cy="120" r="6" fill="var(--red)"/><text x="12" y="116" style="fill:var(--red);font:800 12px var(--f-body)">nœud</text>`;
    const dots = (y0, n, speed) => Array.from({ length: n }, (_, k) => { const x = 50 + ((k * 300 / n + t * speed) % 300); return `<circle cx="${x}" cy="${y0}" r="4" fill="var(--red)"/>`; }).join('');
    s += dots(40, 10, -I * 2.2) + dots(120, 8, i1 * 2.2) + dots(200, 8, i2 * 2.2);
    s += `<text x="110" y="32" style="fill:var(--ink);font:800 13px var(--f-body)">I = ${fmt(I)} A</text><text x="250" y="112" style="fill:var(--ink);font:800 13px var(--f-body)">I1</text><text x="250" y="192" style="fill:var(--ink);font:800 13px var(--f-body)">I2</text>`;
    svg.innerHTML = s;
  }
  w.addEventListener('input', draw);
  (function loop(now) { if (!alive) return; t += Math.min(0.05, (now - last) / 1000) * (reduced() ? 0 : 1); last = now; draw(); requestAnimationFrame(loop); })(performance.now());
  return () => { alive = false; };
}

/* ---------- symboles ---------- */
function symboles(el) {
  const S = [
    ['Fil conducteur', '<circle cx="15" cy="30" r="3" fill="var(--ink)"/><line x1="15" y1="30" x2="85" y2="30" stroke="var(--ink)" stroke-width="3"/><circle cx="85" cy="30" r="3" fill="var(--ink)"/>'],
    ['Générateur', '<line x1="10" y1="30" x2="44" y2="30" stroke="var(--ink)" stroke-width="3"/><line x1="44" y1="14" x2="44" y2="46" stroke="var(--ink)" stroke-width="3"/><line x1="56" y1="22" x2="56" y2="38" stroke="var(--ink)" stroke-width="6"/><line x1="56" y1="30" x2="90" y2="30" stroke="var(--ink)" stroke-width="3"/><text x="34" y="14" style="fill:var(--red);font:900 12px sans-serif">+</text>'],
    ['Lampe', '<line x1="8" y1="30" x2="36" y2="30" stroke="var(--ink)" stroke-width="3"/><circle cx="50" cy="30" r="14" fill="none" stroke="var(--ink)" stroke-width="3"/><path d="M40 20 L60 40 M60 20 L40 40" stroke="var(--ink)" stroke-width="3"/><line x1="64" y1="30" x2="92" y2="30" stroke="var(--ink)" stroke-width="3"/>'],
    ['Moteur', '<line x1="8" y1="30" x2="36" y2="30" stroke="var(--ink)" stroke-width="3"/><circle cx="50" cy="30" r="14" fill="none" stroke="var(--ink)" stroke-width="3"/><text x="50" y="36" text-anchor="middle" style="fill:var(--ink);font:900 15px sans-serif">M</text><line x1="64" y1="30" x2="92" y2="30" stroke="var(--ink)" stroke-width="3"/>'],
    ['Diode', '<line x1="8" y1="30" x2="38" y2="30" stroke="var(--ink)" stroke-width="3"/><path d="M38 16 L62 30 L38 44 Z" fill="none" stroke="var(--ink)" stroke-width="3"/><line x1="62" y1="16" x2="62" y2="44" stroke="var(--ink)" stroke-width="3"/><line x1="62" y1="30" x2="92" y2="30" stroke="var(--ink)" stroke-width="3"/>'],
    ['Diode LED', '<line x1="8" y1="34" x2="38" y2="34" stroke="var(--ink)" stroke-width="3"/><path d="M38 20 L62 34 L38 48 Z" fill="none" stroke="var(--ink)" stroke-width="3"/><line x1="62" y1="20" x2="62" y2="48" stroke="var(--ink)" stroke-width="3"/><line x1="62" y1="34" x2="92" y2="34" stroke="var(--ink)" stroke-width="3"/><path d="M50 16 L60 6 M58 18 L68 8" stroke="var(--ink)" stroke-width="2"/>'],
    ['Interrupteur ouvert', '<line x1="8" y1="34" x2="34" y2="34" stroke="var(--ink)" stroke-width="3"/><circle cx="34" cy="34" r="3" fill="var(--ink)"/><line x1="34" y1="34" x2="64" y2="16" stroke="var(--ink)" stroke-width="3"/><circle cx="66" cy="34" r="3" fill="var(--ink)"/><line x1="66" y1="34" x2="92" y2="34" stroke="var(--ink)" stroke-width="3"/>'],
    ['Interrupteur fermé', '<line x1="8" y1="30" x2="92" y2="30" stroke="var(--ink)" stroke-width="3"/><circle cx="34" cy="30" r="3" fill="var(--ink)"/><circle cx="66" cy="30" r="3" fill="var(--ink)"/>'],
    ['Ampèremètre', '<line x1="8" y1="30" x2="36" y2="30" stroke="var(--ink)" stroke-width="3"/><circle cx="50" cy="30" r="14" fill="none" stroke="var(--ink)" stroke-width="3"/><text x="50" y="36" text-anchor="middle" style="fill:var(--ink);font:900 15px sans-serif">A</text><line x1="64" y1="30" x2="92" y2="30" stroke="var(--ink)" stroke-width="3"/>'],
    ['Voltmètre', '<line x1="8" y1="30" x2="36" y2="30" stroke="var(--ink)" stroke-width="3"/><circle cx="50" cy="30" r="14" fill="none" stroke="var(--ink)" stroke-width="3"/><text x="50" y="36" text-anchor="middle" style="fill:var(--ink);font:900 15px sans-serif">V</text><line x1="64" y1="30" x2="92" y2="30" stroke="var(--ink)" stroke-width="3"/>'],
    ['Électrolyseur', '<line x1="8" y1="30" x2="36" y2="30" stroke="var(--ink)" stroke-width="3"/><circle cx="50" cy="30" r="14" fill="none" stroke="var(--ink)" stroke-width="3"/><line x1="44" y1="20" x2="44" y2="40" stroke="var(--ink)" stroke-width="3"/><line x1="56" y1="20" x2="56" y2="40" stroke="var(--ink)" stroke-width="3"/><line x1="64" y1="30" x2="92" y2="30" stroke="var(--ink)" stroke-width="3"/>'],
    ['Ohmmètre', '<line x1="8" y1="30" x2="36" y2="30" stroke="var(--ink)" stroke-width="3"/><circle cx="50" cy="30" r="14" fill="none" stroke="var(--ink)" stroke-width="3"/><text x="50" y="36" text-anchor="middle" style="fill:var(--ink);font:900 15px sans-serif">Ω</text><line x1="64" y1="30" x2="92" y2="30" stroke="var(--ink)" stroke-width="3"/>']
  ];
  const w = frame(el, `<div class="w-symbols">${S.map(([n, s], i) => `<button type="button" class="w-sym" data-i="${i}"><svg viewBox="0 0 100 60">${s}</svg><span>?</span></button>`).join('')}</div><p class="w-cap">Trouvés : <b>0</b>/${S.length}</p>`);
  const seen = new Set();
  w.addEventListener('click', (e) => { const b = e.target.closest('.w-sym'); if (!b) return; const i = +b.dataset.i; seen.add(i); b.classList.add('on'); $('span', b).textContent = S[i][0]; $('.w-cap b', w).textContent = seen.size; });
  return () => {};
}

/* ---------- grand circuit (exercice n°5) ---------- */
function grandcircuit(el) {
  const w = frame(el, `<svg class="w-svg" viewBox="0 0 440 290"></svg>
    <div class="w-chips"><button type="button" data-n="A">Nœud A</button><button type="button" data-n="E">Nœud E</button><button type="button" data-n="B">Nœud B</button><button type="button" data-n="F">Nœud F (vérif)</button></div>
    <div class="w-result"><p>Touche un nœud.</p></div>`);
  const svg = $('svg', w), out = $('.w-result', w);
  const P = { Gb: [40, 250], Gt: [40, 50], A: [140, 50], B: [300, 50], C: [410, 50], D: [410, 250], E: [300, 250], F: [140, 250] };
  // branches : [de, vers, intensité, nom, lampe, connue]
  const BR = [
    [['Gb', 'Gt', 'A'], 1, 'I', null, true],
    [['A', 'B'], 0.7, 'I1', 'L1', true],
    [['A', 'F'], 0.3, 'I2', 'L2', false],
    [['B', 'F'], 0.1, 'I4', 'L4', false],
    [['B', 'E'], 0.4, 'I5', 'L5', true],
    [['B', 'C', 'D', 'E'], 0.2, 'I3', 'L3', false],
    [['E', 'F'], 0.6, 'I6', 'L8', true],
    [['F', 'Gb'], 1, 'I', null, true]
  ];
  const EQ = {
    A: { hi: ['I', 'I1', 'I2'], html: 'Entre : <b>I</b> · Sortent : <b>I1</b> et <b>I2</b><p class="mono">I = I1 + I2 ⇒ I2 = 1 − 0,7 = <b>0,3 A</b></p>' },
    E: { hi: ['I3', 'I5', 'I6'], html: 'Entrent : <b>I3</b> et <b>I5</b> · Sort : <b>I6</b><p class="mono">I3 + I5 = I6 ⇒ I3 = 0,6 − 0,4 = <b>0,2 A</b></p>' },
    B: { hi: ['I1', 'I3', 'I4', 'I5'], html: 'Entre : <b>I1</b> · Sortent : <b>I3</b>, <b>I4</b>, <b>I5</b><p class="mono">I1 = I3 + I4 + I5 ⇒ I4 = 0,7 − 0,2 − 0,4 = <b>0,1 A</b></p>' },
    F: { hi: ['I2', 'I4', 'I6', 'I'], html: 'Entrent : <b>I2</b>, <b>I4</b>, <b>I6</b> · Sort : <b>I</b><p class="mono">0,3 + 0,1 + 0,6 = <b>1 A</b> = I ✔</p>' }
  };
  let node = null, found = new Set(['I', 'I1', 'I5', 'I6']), t = 0, alive = true, last = performance.now();
  const pts = (names) => names.map((n) => P[n]);
  const lenOf = (ps) => ps.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - ps[i][0], p[1] - ps[i][1]), 0);
  const at = (ps, d) => { for (let i = 1; i < ps.length; i++) { const L = Math.hypot(ps[i][0] - ps[i - 1][0], ps[i][1] - ps[i - 1][1]); if (d <= L) { const k = d / L; return [ps[i - 1][0] + (ps[i][0] - ps[i - 1][0]) * k, ps[i - 1][1] + (ps[i][1] - ps[i - 1][1]) * k]; } d -= L; } return ps[ps.length - 1]; };
  function draw() {
    const hi = node ? EQ[node].hi : [];
    let s = '';
    for (const [names, I, nm, lamp] of BR) {
      const ps = pts(names), on = hi.includes(nm);
      s += `<polyline points="${ps.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${on ? 'var(--orange)' : 'var(--ink-soft)'}" stroke-width="${on ? 5 : 3}"/>`;
      const L = lenOf(ps), n = Math.max(2, Math.round(L / 34));
      for (let k = 0; k < n; k++) { const [x, y] = at(ps, ((k * L / n) + t * I * 70) % L); s += `<circle cx="${x}" cy="${y}" r="3.4" fill="var(--red)"/>`; }
      if (lamp) {
        const [x, y] = names.length > 2 ? at(ps, L * (lamp === 'L3' ? 0.12 : 0.5)) : at(ps, L / 2);
        const lit = I > 0;
        s += `<circle cx="${x}" cy="${y}" r="13" fill="${lit ? '#FFE680' : 'var(--surface)'}" stroke="var(--ink)" stroke-width="2"/><path d="M${x - 8} ${y - 8} L${x + 8} ${y + 8} M${x + 8} ${y - 8} L${x - 8} ${y + 8}" stroke="var(--ink)" stroke-width="2"/>`;
        const lbl = found.has(nm) ? `${nm} = ${String(I).replace('.', ',')} A` : `${nm} = ?`;
        const off = { L1: [-30, -18], L2: [-92, 24], L4: [16, 22], L5: [8, -18], L3: [-20, -18], L8: [-40, -18] }[lamp] || [6, -18];
        s += `<text x="${x + off[0]}" y="${y + off[1]}" style="fill:${found.has(nm) ? 'var(--ink)' : 'var(--orange)'};font:800 11.5px var(--f-body)">${lamp} · ${lbl}</text>`;
      }
    }
    // L6 et L7 sur la branche I3
    for (const [x, y, n] of [[410, 150, 'L6'], [355, 250, 'L7']]) s += `<circle cx="${x}" cy="${y}" r="12" fill="#FFE680" stroke="var(--ink)" stroke-width="2"/><path d="M${x - 7} ${y - 7} L${x + 7} ${y + 7} M${x + 7} ${y - 7} L${x - 7} ${y + 7}" stroke="var(--ink)" stroke-width="2"/><text x="${x + (n === 'L6' ? -32 : -8)}" y="${y + (n === 'L6' ? 4 : 28)}" style="fill:var(--ink);font:800 11px var(--f-body)">${n}</text>`;
    s += `<rect x="28" y="140" width="24" height="22" fill="var(--bg)"/><line x1="26" y1="144" x2="54" y2="144" stroke="var(--ink)" stroke-width="3"/><line x1="33" y1="156" x2="47" y2="156" stroke="var(--ink)" stroke-width="6"/><text x="14" y="142" style="fill:var(--red);font:900 14px var(--f-display)">+</text><text x="14" y="166" style="fill:var(--nuc);font:900 14px var(--f-display)">−</text>`;
    s += `<text x="56" y="110" style="fill:var(--ink);font:800 12px var(--f-body)">I = 1 A</text>`;
    for (const [n, [x, y]] of Object.entries(P)) if (!n.startsWith('G')) s += `<g class="w-node" data-n="${n}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${node === n ? 9 : 6}" fill="${node === n ? 'var(--orange)' : 'var(--ink)'}"/><text x="${x - 4}" y="${y + (y < 100 ? -12 : 22)}" style="fill:var(--ink);font:900 13px var(--f-display)">${n}</text></g>`;
    svg.innerHTML = s;
  }
  function pick(n) {
    if (!EQ[n]) return; node = n; EQ[n].hi.forEach((x) => found.add(x));
    $$('.w-chips button', w).forEach((b) => b.classList.toggle('on', b.dataset.n === n));
    out.innerHTML = `<p><b>Nœud ${n}</b> : somme des courants qui entrent = somme des courants qui sortent.</p><p>${EQ[n].html}</p>`;
  }
  w.addEventListener('click', (e) => { const b = e.target.closest('button[data-n]'); if (b) pick(b.dataset.n); });
  svg.addEventListener('pointerdown', (e) => { const g = e.target.closest('[data-n]'); if (g) pick(g.dataset.n); });
  (function loop(now) { if (!alive) return; t += Math.min(0.05, (now - last) / 1000) * (reduced() ? 0 : 1); last = now; draw(); requestAnimationFrame(loop); })(performance.now());
  return () => { alive = false; };
}

/* ---------- fabrique d'atomes et d'ions ---------- */
const ELEMS = [
  ['H', 'Hydrogène', 1, 'hydrogène', 1], ['N', 'Azote', 7, null, 0], ['O', 'Oxygène', 8, 'oxygène', -2], ['F', 'Fluor', 9, 'fluorure', -1],
  ['Na', 'Sodium', 11, 'sodium', 1], ['Mg', 'Magnésium', 12, 'magnésium', 2], ['Al', 'Aluminium', 13, 'aluminium', 3], ['S', 'Soufre', 16, 'sulfure', -2],
  ['Cl', 'Chlore', 17, 'chlorure', -1], ['K', 'Potassium', 19, 'potassium', 1], ['Ca', 'Calcium', 20, 'calcium', 2], ['Cu', 'Cuivre', 29, 'cuivre II', 2]
];
function atome(el) {
  const w = frame(el, `<div class="w-chips w-elems">${ELEMS.map((e, i) => `<button type="button" data-e="${i}" class="${i === 4 ? 'on' : ''}">${e[0]}</button>`).join('')}</div>
    <canvas class="w-canvas"></canvas>
    <div class="w-row"><button type="button" class="w-btn" data-a="-">− Enlever un électron</button><button type="button" class="w-btn" data-a="+">+ Ajouter un électron</button><button type="button" class="w-btn" data-a="0">Neutre</button></div>
    <div class="w-result"></div>`);
  let ei = 4, ne = ELEMS[4][2], alive = true;
  const out = $('.w-result', w);
  const sup = (k) => k === 0 ? '' : (Math.abs(k) > 1 ? String(Math.abs(k)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]) : '') + (k > 0 ? '⁺' : '⁻');
  const f = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');
  function info() {
    const [sym, name, Z, ion, usual] = ELEMS[ei]; const k = Z - ne;
    const what = k === 0 ? `<b>Atome de ${name.toLowerCase()}</b> : neutre` : `<b>${k > 0 ? 'Cation' : 'Anion'} ${sym}${sup(k)}</b> : il a ${k > 0 ? 'perdu' : 'gagné'} ${Math.abs(k)} électron${Math.abs(k) > 1 ? 's' : ''}`;
    const real = k !== 0 && k === usual && ion ? ` — c'est l'<b class="g">ion ${ion}</b> du tableau !` : k !== 0 && ion ? ` <span class="muted">(l'ion qu'on rencontre dans le cours est ${sym}${sup(usual)})</span>` : '';
    out.innerHTML = `<p class="w-big">${sym}${sup(k)}</p><p>${what}${real}</p>
      <p class="mono">Noyau : ${Z} × e = +${f(Z * 1.6)} × 10⁻¹⁹ C</p>
      <p class="mono">Électrons : ${ne} × (−e) = −${f(ne * 1.6)} × 10⁻¹⁹ C</p>
      <p class="mono">Total : ${k === 0 ? '0 C (neutre)' : `${k > 0 ? '+' : '−'}${f(Math.abs(k) * 1.6)} × 10⁻¹⁹ C`}</p>`;
  }
  const shells = (n) => { const r = []; for (const cap of [2, 8, 8, 18]) { if (n <= 0) break; r.push(Math.min(cap, n)); n -= cap; } return r; };
  const stop = sim($('canvas', w), 600, 320, {
    step() {},
    draw(ctx, t) {
      const cx = 300, cy = 160, Z = ELEMS[ei][2];
      const sh = shells(ne);
      sh.forEach((n, i) => {
        const R = 58 + i * 36;
        ctx.strokeStyle = C('line'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
        for (let k = 0; k < n; k++) {
          const a = k / n * Math.PI * 2 + t * (0.9 - i * 0.2) * (reduced() ? 0 : 1);
          const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
          ctx.fillStyle = C('sweat'); ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '900 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('−', x, y + 1);
        }
      });
      const nr = Math.min(Z, 30), rr = Z > 12 ? 7 : 9;
      for (let k = 0; k < nr; k++) {
        const a = k * 2.4, d = Math.sqrt(k) * rr * 1.05;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        ctx.fillStyle = C('red'); ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `900 ${rr + 3}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', x, y + 1);
      }
      label(ctx, `noyau : ${Z} charges +`, 20, 22, C('red'), 'left');
      label(ctx, `${ne} électrons`, 580, 22, C('sweat'), 'right');
    }
  });
  w.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.e) { ei = +b.dataset.e; ne = ELEMS[ei][2]; $$('.w-elems button', w).forEach((x) => x.classList.toggle('on', x === b)); }
    const Z = ELEMS[ei][2];
    if (b.dataset.a === '-') ne = Math.max(Math.max(0, Z - 3), ne - 1);
    if (b.dataset.a === '+') ne = Math.min(Z + 3, ne + 1);
    if (b.dataset.a === '0') ne = Z;
    info();
  });
  info();
  return () => { alive = false; stop(); };
}

export const physWidgets = { frottement, charges, pendule, electroscope, qcalc, melange, etats, zoom, circuit, amperemetre, noeuds, symboles, grandcircuit, atome };
