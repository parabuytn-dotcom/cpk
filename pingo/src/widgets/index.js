/* Widgets interactifs du cours (vanilla JS). Chaque widget : (el, opts) => destroy() */
const root = document.documentElement;
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const $ = (s, el) => el.querySelector(s);
export const $$ = (s, el) => [...el.querySelectorAll(s)];
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let cache = {};
export const C = (n) => cache[n] || (cache[n] = getComputedStyle(root).getPropertyValue('--' + n).trim() || '#888');
const redraws = new Set();
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { cache = {}; redraws.forEach((f) => f()); }); } catch { /* */ }

/* ---------- canvas sim helper ---------- */
export function sim(canvas, W, H, api) {
  const ctx = canvas.getContext('2d');
  let scale = 1, vis = false, last = 0, t = 0, alive = true;
  canvas.style.aspectRatio = W + '/' + H;
  function draw() { if (!alive) return; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(scale, 0, 0, scale, 0, 0); api.draw(ctx, t); }
  function size() { const w = canvas.clientWidth; if (!w) return; const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * H / W * dpr); scale = canvas.width / W; draw(); }
  const ro = new ResizeObserver(size); ro.observe(canvas);
  const io = new IntersectionObserver((e) => { const was = vis; vis = e[0].isIntersecting; if (vis && !was) { last = performance.now(); requestAnimationFrame(loop); } }); io.observe(canvas);
  function loop(now) { if (!vis || !alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; api.step(dt, t); draw(); requestAnimationFrame(loop); }
  redraws.add(draw);
  return () => { alive = false; ro.disconnect(); io.disconnect(); redraws.delete(draw); };
}
export function label(ctx, txt, x, y, color, align) {
  ctx.font = '800 15px "Nunito Variable", system-ui, sans-serif'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(txt).width; const x0 = align === 'center' ? x - w / 2 : (align === 'right' ? x - w : x);
  ctx.fillStyle = C('card'); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 - 5, y - 11, w + 10, 22, 8) : ctx.rect(x0 - 5, y - 11, w + 10, 22); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = color || C('ink'); ctx.fillText(txt, x, y);
}
function arrow(ctx, x1, y1, x2, y2, color) { ctx.strokeStyle = color || C('ink-soft'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.fillStyle = color || C('ink-soft'); ctx.beginPath(); ctx.arc(x2, y2, 3, 0, 7); ctx.fill(); }

export function frame(el, html) { el.innerHTML = `<div class="w">${html}</div>`; return el.firstChild; }

/* ---------- les 4 groupes ---------- */
function groups(el) {
  const items = [
    ['Protozoaires', 'paramécie, amibe', `<ellipse cx="40" cy="40" rx="30" ry="15" fill="var(--cell)" stroke="var(--ink-soft)" stroke-width="2.5"/><ellipse cx="44" cy="42" rx="7" ry="4" fill="var(--nuc)"/>${Array.from({ length: 16 }, (_, i) => { const a = i / 16 * 6.283; return `<line x1="${40 + 30 * Math.cos(a)}" y1="${40 + 15 * Math.sin(a)}" x2="${40 + 36 * Math.cos(a)}" y2="${40 + 19 * Math.sin(a)}" stroke="var(--ink-soft)" stroke-width="1.6"/>`; }).join('')}`],
    ['Champignons', 'levure, moisissure', `<circle cx="34" cy="44" r="16" fill="var(--cell)" stroke="var(--wall)" stroke-width="3"/><circle cx="52" cy="28" r="9" fill="var(--cell)" stroke="var(--wall)" stroke-width="3"/><circle cx="34" cy="44" r="5" fill="var(--nuc)"/>`],
    ['Bactéries', 'coques, bacilles', `<rect x="14" y="30" width="38" height="16" rx="8" fill="var(--cell-2)" stroke="var(--wall)" stroke-width="2.5"/><circle cx="56" cy="56" r="8" fill="var(--cell-2)" stroke="var(--wall)" stroke-width="2.5"/><circle cx="66" cy="44" r="8" fill="var(--cell-2)" stroke="var(--wall)" stroke-width="2.5"/>`],
    ['Virus', 'grippe, VIH…', `<polygon points="40,24 54,32 54,48 40,56 26,48 26,32" fill="var(--card)" stroke="var(--red)" stroke-width="3"/>${Array.from({ length: 8 }, (_, i) => { const a = i / 8 * 6.283; return `<line x1="${40 + 17 * Math.cos(a)}" y1="${40 + 17 * Math.sin(a)}" x2="${40 + 25 * Math.cos(a)}" y2="${40 + 25 * Math.sin(a)}" stroke="var(--red)" stroke-width="2.5"/><circle cx="${40 + 26 * Math.cos(a)}" cy="${40 + 26 * Math.sin(a)}" r="2.6" fill="var(--red)"/>`; }).join('')}`]
  ];
  frame(el, `<div class="w-groups">${items.map(([t, s, svg], i) => `<div class="w-group" style="animation-delay:${i * 0.12}s"><svg viewBox="0 0 80 80">${svg}</svg><b>${t}</b><small>${s}</small></div>`).join('')}</div>`);
  return () => {};
}

/* ---------- échelle des tailles ---------- */
function scale(el) {
  const w = frame(el, `<div class="w-scroll"><svg class="w-scale" viewBox="0 0 640 150"></svg></div><p class="w-cap"></p>`);
  const svg = $('svg', w), info = $('.w-cap', w);
  const x = (m) => 40 + (Math.log10(m) + 8) / 5 * 560;
  const items = [
    ['Virus', 1e-7, '<b>Virus</b> ≈ 0,1 µm. Quelques dixièmes de µm au maximum.'],
    ['Bactérie', 1.5e-6, '<b>Bactérie</b> : 0,2 à 2 µm. 1000 bactéries alignées ≈ 1 mm.'],
    ['Levure', 1e-5, '<b>Levure de boulanger</b> ≈ 10 µm.'],
    ['Cheveu', 7e-5, '<b>Épaisseur d\'un cheveu</b> ≈ 70 µm, pour comparer.'],
    ['Paramécie', 2e-4, '<b>Paramécie</b> ≈ 0,2 mm : à peine visible à l\'œil nu.'],
    ['Amibe', 4e-4, '<b>Amibe</b> ≈ 0,3 à 0,5 mm, sa forme change tout le temps.']
  ];
  let h = `<line x1="40" y1="80" x2="600" y2="80" stroke="var(--ink-soft)" stroke-width="2"/>`;
  [['10 nm', 1e-8], ['0,1 µm', 1e-7], ['1 µm', 1e-6], ['10 µm', 1e-5], ['0,1 mm', 1e-4], ['1 mm', 1e-3]].forEach(([t, m]) => { h += `<line x1="${x(m)}" y1="74" x2="${x(m)}" y2="86" stroke="var(--ink-soft)"/><text x="${x(m)}" y="104" text-anchor="middle" class="w-mono">${t}</text>`; });
  h += `<line x1="${x(1e-4)}" y1="118" x2="${x(1e-4)}" y2="18" stroke="var(--red)" stroke-dasharray="4 4"/><text x="${x(1e-4) + 6}" y="142" class="w-t-r">limite de l'œil nu →</text>`;
  items.forEach(([n, m], i) => { const up = i % 2 === 0, X = x(m); h += `<g class="w-mk" data-i="${i}" role="button" tabindex="0"><line x1="${X}" y1="80" x2="${X}" y2="${up ? 48 : 112}" stroke="var(--ink-soft)"/><circle cx="${X}" cy="80" r="9"/><text x="${X}" y="${up ? 40 : 128}" text-anchor="middle" class="w-t">${n}</text></g>`; });
  svg.innerHTML = h;
  const pick = (i) => { $$('.w-mk', svg).forEach((m) => m.classList.toggle('on', +m.dataset.i === i)); info.innerHTML = items[i][2]; };
  svg.addEventListener('click', (e) => { const m = e.target.closest('.w-mk'); if (m) pick(+m.dataset.i); });
  pick(1);
  return () => {};
}

/* ---------- légendes (affichage ou test) ---------- */
function labelLayer(svg, items, opt) {
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g'); svg.appendChild(g);
  const quiz = !!opt.quiz; let sel = null, mistakes = 0; const found = new Set();
  const bank = opt.bank;
  function draw() {
    g.innerHTML = items.map((it, i) => {
      const above = it.y < it.py, y1 = above ? it.y + 6 : it.y - 18;
      const line = `<line class="lb-line" x1="${it.x}" y1="${y1}" x2="${it.px}" y2="${it.py}"/><circle class="lb-dot" cx="${it.px}" cy="${it.py}" r="3"/>`;
      if (!quiz || found.has(i)) return `<g>${line}<text class="lb-text ${quiz ? 'lb-ok' : ''}" x="${it.x}" y="${it.y}" text-anchor="middle">${it.t}</text></g>`;
      return `<g class="lb-slot" data-i="${i}" role="button" tabindex="0">${line}<circle class="lb-q" cx="${it.x}" cy="${it.y - 5}" r="16"/><text class="lb-qt" x="${it.x}" y="${it.y + 1}" text-anchor="middle">?</text></g>`;
    }).join('');
  }
  if (quiz) {
    bank.innerHTML = shuffle(items.map((it) => it.t)).map((t) => `<button type="button" data-t="${t}">${t}</button>`).join('');
    bank.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; $$('button', bank).forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); sel = b.dataset.t; });
    g.addEventListener('click', (e) => {
      const s = e.target.closest('.lb-slot'); if (!s) return;
      const i = +s.dataset.i;
      if (sel && items[i].t === sel) {
        found.add(i); const b = bank.querySelector(`[data-t="${CSS.escape(sel)}"]`); if (b) { b.disabled = true; b.classList.remove('sel'); }
        sel = null; draw(); opt.onHit && opt.onHit(true);
        if (found.size === items.length) opt.onDone && opt.onDone(mistakes);
      } else { if (sel) { mistakes++; opt.onHit && opt.onHit(false); } s.classList.add('wrong'); setTimeout(() => s.classList.remove('wrong'), 450); }
    });
  }
  draw();
}

/* ---------- paramécie ---------- */
const PARA_LABELS = [
  { t: 'Cil vibratile', x: 370, y: 30, px: 334, py: 93 },
  { t: 'Bouche', x: 232, y: 30, px: 212, py: 112 },
  { t: 'Vacuole pulsatile', x: 92, y: 44, px: 150, py: 136 },
  { t: 'Noyau', x: 300, y: 288, px: 268, py: 168 },
  { t: 'Vacuole digestive', x: 140, y: 288, px: 196, py: 180 },
  { t: 'Cytoplasme', x: 412, y: 262, px: 352, py: 172 }
];
function paramecie(el, opt = {}) {
  const w = frame(el, `<svg class="w-svg" viewBox="0 0 480 300"></svg>${opt.quiz ? '<div class="w-bank"></div>' : ''}`);
  const svg = $('svg', w), cx = 240, cy = 150, rx = 150, ry = 62, N = 72;
  let cil = '';
  for (let i = 0; i < N; i++) {
    const t = i / N * Math.PI * 2, px = cx + rx * Math.cos(t), py = cy + ry * Math.sin(t);
    let nx = Math.cos(t) / rx, ny = Math.sin(t) / ry; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    cil += `<line class="cil" data-t="${t}" data-x="${px.toFixed(1)}" data-y="${py.toFixed(1)}" x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(px + nx * 12).toFixed(1)}" y2="${(py + ny * 12).toFixed(1)}" stroke="var(--ink-soft)" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  const star = (x, y) => { let s = `<g class="vp" data-x="${x}" data-y="${y}">`; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; s += `<line x1="${x}" y1="${y}" x2="${x + Math.cos(a) * 16}" y2="${y + Math.sin(a) * 11}" stroke="var(--sweat)" stroke-width="2.4" stroke-linecap="round"/>`; } return s + `<circle cx="${x}" cy="${y}" r="6.5" fill="var(--paper)" stroke="var(--sweat)" stroke-width="2.4"/></g>`; };
  svg.innerHTML = `<g>${cil}</g><ellipse class="s-cell" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
    <g class="dv">${[0, 1, 2, 3, 4].map(() => '<circle r="5" fill="var(--red)" opacity=".8"/>').join('')}</g>
    <circle cx="196" cy="176" r="6.5" fill="var(--red)" opacity=".85"/>
    <path d="M178 94 Q206 104 214 118" fill="none" stroke="var(--ink-soft)" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="215" cy="120" r="5" fill="var(--paper)" stroke="var(--ink-soft)" stroke-width="2"/>
    ${star(150, 140)}${star(338, 146)}
    <ellipse cx="268" cy="160" rx="26" ry="14" fill="var(--nuc)"/><circle cx="300" cy="150" r="5" fill="var(--nuc)" opacity=".7"/>`;
  labelLayer(svg, PARA_LABELS, { quiz: opt.quiz, bank: $('.w-bank', w), onDone: opt.onDone, onHit: opt.onHit });
  const dvs = $$('.dv circle', svg), cils = $$('.cil', svg), vps = $$('.vp', svg);
  let alive = true;
  function step(t) {
    cils.forEach((l) => { const a = 22 * Math.sin(t * 7 - (+l.dataset.t) * 5); l.setAttribute('transform', `rotate(${a.toFixed(1)} ${l.dataset.x} ${l.dataset.y})`); });
    dvs.forEach((c, i) => { const a = t * 0.35 + i * 1.25; c.setAttribute('cx', (240 + 92 * Math.cos(a)).toFixed(1)); c.setAttribute('cy', (152 + 30 * Math.sin(a)).toFixed(1)); });
    vps.forEach((v, i) => { const s = 0.75 + 0.35 * Math.abs(Math.sin(t * 1.6 + i * 1.5)); v.setAttribute('transform', `translate(${v.dataset.x} ${v.dataset.y}) scale(${s.toFixed(2)}) translate(${-v.dataset.x} ${-v.dataset.y})`); });
  }
  step(0);
  if (!reduced()) { (function loop(ms) { if (!alive) return; step(ms / 1000); requestAnimationFrame(loop); })(0); }
  return () => { alive = false; };
}

/* ---------- amibe ---------- */
function amibe(el) {
  const w = frame(el, `<canvas class="w-canvas"></canvas><div class="w-row"><button type="button" class="w-btn primary">Conditions défavorables</button><span class="w-stat">Mangées : <b>0</b></span></div><p class="w-cap">L'amibe avance et mange avec ses <b>pseudopodes</b>.</p>`);
  const W = 600, H = 300; const s = { x: 300, y: 150, R: 56, pods: [], foods: [], eaten: 0, ky: false, k: 0 };
  const newFood = () => { let x, y; do { x = rand(30, 570); y = rand(30, 270); } while (Math.hypot(x - s.x, y - s.y) < 110); return { x, y, e: false, age: 0, ox: 0, oy: 0, ph: rand(0, 6) }; };
  for (let i = 0; i < 7; i++) s.foods.push(newFood());
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const rad = (th, t) => { const R = s.R * (1 - 0.25 * s.k); let r = R * (1 + (0.05 * Math.sin(3 * th + t * 1.3) + 0.03 * Math.sin(5 * th - t)) * (1 - s.k)); for (const p of s.pods) { const d = wrap(th - p.a); r += p.amp * Math.exp(-d * d / (2 * 0.2 * 0.2)); } return r; };
  const eat = $('.w-stat b', w);
  const stop = sim($('canvas', w), W, H, {
    step(dt, t) {
      s.k = Math.max(0, Math.min(1, s.k + (s.ky ? 1 : -1) * dt * 0.7));
      if (!s.ky && s.k < 0.2 && s.pods.length < 3 && Math.random() < dt * 1.3) {
        const dc = Math.hypot(300 - s.x, 150 - s.y); let a;
        const near = s.foods.filter((f) => !f.e).sort((f, g) => Math.hypot(f.x - s.x, f.y - s.y) - Math.hypot(g.x - s.x, g.y - s.y))[0];
        if (dc > 150) a = Math.atan2(150 - s.y, 300 - s.x) + rand(-0.6, 0.6); else if (near && Math.random() < 0.6) a = Math.atan2(near.y - s.y, near.x - s.x) + rand(-0.4, 0.4); else a = rand(-Math.PI, Math.PI);
        s.pods.push({ a, life: 0, dur: rand(2.8, 4.5), max: rand(24, 46), amp: 0 });
      }
      for (const p of s.pods) { p.life += dt; p.amp = p.max * Math.sin(Math.PI * Math.min(1, p.life / p.dur)) * (1 - s.k); }
      s.pods = s.pods.filter((p) => p.life < p.dur);
      for (const p of s.pods) { s.x += Math.cos(p.a) * p.amp * 0.45 * dt; s.y += Math.sin(p.a) * p.amp * 0.45 * dt; }
      s.x = Math.max(70, Math.min(530, s.x)); s.y = Math.max(70, Math.min(230, s.y));
      for (let i = 0; i < s.foods.length; i++) {
        const f = s.foods[i];
        if (!f.e) { f.x += Math.sin(t * 0.7 + f.ph) * 4 * dt; f.y += Math.cos(t * 0.6 + f.ph) * 4 * dt; const d = Math.hypot(f.x - s.x, f.y - s.y), th = Math.atan2(f.y - s.y, f.x - s.x); if (!s.ky && d < rad(th, t) - 5) { f.e = true; f.ox = f.x - s.x; f.oy = f.y - s.y; s.eaten++; eat.textContent = s.eaten; } }
        else { f.age += dt; f.ox *= 1 - dt * 0.4; f.oy *= 1 - dt * 0.4; if (f.age > 7) s.foods[i] = newFood(); }
      }
    },
    draw(ctx, t) {
      for (const f of s.foods) if (!f.e) { ctx.fillStyle = C('food'); ctx.beginPath(); ctx.arc(f.x, f.y, 5.5, 0, 7); ctx.fill(); }
      const pts = []; for (let i = 0; i < 120; i++) { const th = -Math.PI + i / 120 * 2 * Math.PI, r = rad(th, t); pts.push([s.x + r * Math.cos(th), s.y + r * Math.sin(th)]); }
      if (s.k > 0) { ctx.globalAlpha = s.k; ctx.strokeStyle = C('horn'); ctx.lineWidth = 3 + 7 * s.k; ctx.beginPath(); ctx.arc(s.x, s.y, s.R * (1 - 0.25 * s.k) + 7, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.fillStyle = C('cell'); ctx.fill(); ctx.strokeStyle = C('ink-soft'); ctx.lineWidth = 2.4; ctx.stroke();
      for (const f of s.foods) if (f.e) { const r = 7 * (1 - f.age / 7) + 1; ctx.fillStyle = C('paper'); ctx.strokeStyle = C('red'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x + f.ox, s.y + f.oy, r + 3, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = C('food'); ctx.beginPath(); ctx.arc(s.x + f.ox, s.y + f.oy, r * 0.6, 0, 7); ctx.fill(); }
      ctx.fillStyle = C('nuc'); ctx.beginPath(); ctx.ellipse(s.x + 6, s.y + 5, 14, 11, 0, 0, 7); ctx.fill();
      const vr = 5 + 3 * Math.abs(Math.sin(t * 2)); ctx.fillStyle = C('paper'); ctx.strokeStyle = C('sweat'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x - 22, s.y - 14, vr, 0, 7); ctx.fill(); ctx.stroke();
      const big = s.pods.reduce((m, p) => (p.amp > (m ? m.amp : 0) ? p : m), null);
      if (big && big.amp > 18 && s.k < 0.3) { const r = rad(big.a, t), tx = s.x + r * Math.cos(big.a), ty = s.y + r * Math.sin(big.a); const lx = Math.max(70, Math.min(530, tx + Math.cos(big.a) * 44)), ly = Math.max(16, Math.min(284, ty + Math.sin(big.a) * 36)); arrow(ctx, lx, ly, tx, ty, C('red')); label(ctx, 'pseudopode', lx, ly, C('red'), 'center'); }
      if (s.k > 0.6) label(ctx, 'kyste', s.x, s.y - s.R - 26, C('red'), 'center');
      label(ctx, 'noyau', s.x + 6, s.y + 34, C('nuc'), 'center');
    }
  });
  const btn = $('.w-btn', w), cap = $('.w-cap', w);
  btn.addEventListener('click', () => { s.ky = !s.ky; btn.textContent = s.ky ? 'Conditions favorables' : 'Conditions défavorables'; cap.innerHTML = s.ky ? "L'amibe <b>s'enkyste</b> : elle s'arrondit, s'entoure d'une enveloppe et ralentit sa vie." : "L'amibe avance et mange avec ses <b>pseudopodes</b>."; });
  return stop;
}

/* ---------- moisissure ---------- */
function moisissure(el) {
  const w = frame(el, `<canvas class="w-canvas"></canvas><div class="w-row"><button type="button" class="w-btn primary">Libérer les spores</button><button type="button" class="w-btn">Recommencer</button><span class="w-stat">Nouvelles : <b>0</b></span></div>`);
  const W = 600, base = 236; const sp = [{ x: 110, top: 118 }, { x: 232, top: 142 }, { x: 352, top: 106 }, { x: 474, top: 132 }];
  const s = { spores: [], sprouts: [], open: [false, false, false, false], n: 0 };
  const nEl = $('.w-stat b', w);
  const stop = sim($('canvas', w), W, 300, {
    step(dt) {
      for (const p of s.spores) { p.vy += 55 * dt; p.vx *= 1 - dt * 0.6; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y >= base + 6) { p.dead = true; if (p.x > 10 && p.x < 590 && s.sprouts.length < 70) { s.sprouts.push({ x: p.x, len: 0, max: rand(14, 30), bend: rand(-0.5, 0.5) }); s.n++; nEl.textContent = s.n; } } if (p.x < -20 || p.x > 620) p.dead = true; }
      s.spores = s.spores.filter((p) => !p.dead);
      for (const g of s.sprouts) if (g.len < g.max) g.len += 7 * dt;
    },
    draw(ctx, t) {
      ctx.fillStyle = C('horn'); ctx.globalAlpha = 0.45; ctx.fillRect(0, base + 6, W, 300 - base); ctx.globalAlpha = 1;
      for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc((i * 97) % 600, base + 20 + ((i * 53) % 60), 2.5, 0, 7); ctx.fill(); }
      ctx.strokeStyle = C('ink-soft'); ctx.lineWidth = 2.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(20, base); for (let x = 20; x <= 580; x += 10) ctx.lineTo(x, base + 3 * Math.sin(x / 37)); ctx.stroke();
      for (const p of sp) for (const d of [-12, 0, 12]) { ctx.beginPath(); ctx.moveTo(p.x, base); ctx.quadraticCurveTo(p.x + d, base + 14, p.x + d * 1.6, base + 26); ctx.stroke(); }
      sp.forEach((p, i) => {
        const sway = Math.sin(t * 1.2 + i) * 3; ctx.strokeStyle = C('ink-soft'); ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(p.x, base); ctx.quadraticCurveTo(p.x + sway, (base + p.top) / 2, p.x + sway, p.top); ctx.stroke();
        const cx = p.x + sway, cy = p.top - 17;
        if (!s.open[i]) { ctx.fillStyle = C('nuc'); ctx.beginPath(); ctx.arc(cx, cy, 17, 0, 7); ctx.fill(); ctx.fillStyle = C('paper'); for (let k = 0; k < 12; k++) { const a = k * 2.4, r = 4 + (k % 3) * 4; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.8, 0, 7); ctx.fill(); } }
        else { ctx.strokeStyle = C('nuc'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 17, 0.6, 2.55); ctx.stroke(); }
        ctx.fillStyle = C('ink-soft'); ctx.beginPath(); ctx.arc(cx, cy + 4, 5, 0, 7); ctx.fill();
      });
      ctx.fillStyle = C('nuc'); for (const p of s.spores) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.8, 0, 7); ctx.fill(); }
      ctx.strokeStyle = C('green'); ctx.lineWidth = 2.2; for (const g of s.sprouts) { ctx.beginPath(); ctx.moveTo(g.x, base + 6); ctx.quadraticCurveTo(g.x + g.bend * g.len, base + 6 - g.len * 0.6, g.x + g.bend * g.len * 1.4, base + 6 - g.len); ctx.stroke(); }
      label(ctx, 'sporange', sp[2].x + 62, sp[2].top - 46, C('red'), 'left'); arrow(ctx, sp[2].x + 58, sp[2].top - 42, sp[2].x + 15, sp[2].top - 22, C('red'));
      label(ctx, 'spores', sp[0].x - 58, sp[0].top - 40, C('nuc'), 'center'); arrow(ctx, sp[0].x - 40, sp[0].top - 34, sp[0].x - 6, sp[0].top - 20, C('nuc'));
      label(ctx, 'filament', sp[1].x + 54, 182, C('ink'), 'left'); arrow(ctx, sp[1].x + 50, 182, sp[1].x + 3, 182);
      label(ctx, 'mycélium = tous les filaments', 300, base - 18, C('ink'), 'center');
      label(ctx, 'pain', 560, base + 38, C('ink'), 'center');
    }
  });
  const [go, reset] = $$('.w-btn', w);
  go.addEventListener('click', () => sp.forEach((p, i) => { if (s.open[i]) return; s.open[i] = true; for (let k = 0; k < 22; k++) s.spores.push({ x: p.x + rand(-8, 8), y: p.top - 17 + rand(-8, 8), vx: rand(-70, 70), vy: rand(-90, -20) }); }));
  reset.addEventListener('click', () => { s.spores = []; s.sprouts = []; s.open = [false, false, false, false]; s.n = 0; nEl.textContent = 0; });
  return stop;
}

/* ---------- stepper (étapes animées) ---------- */
export function stepper(el, vb, frames) {
  const w = frame(el, `<svg class="w-svg" viewBox="${vb}"></svg><p class="w-cap"></p><div class="w-row"><button type="button" class="w-btn" data-a="prev" aria-label="Étape précédente">‹</button><div class="w-dots">${frames.map(() => '<span></span>').join('')}</div><button type="button" class="w-btn primary" data-a="next">Étape suivante</button></div>`);
  const svg = $('svg', w), cap = $('.w-cap', w), dots = $$('.w-dots span', w); let i = 0;
  function show(k) { i = (k + frames.length) % frames.length; svg.innerHTML = frames[i].svg; svg.classList.remove('w-fade'); void svg.getBoundingClientRect(); svg.classList.add('w-fade'); cap.innerHTML = frames[i].cap; dots.forEach((d, j) => d.classList.toggle('on', j === i)); }
  w.addEventListener('click', (e) => { const a = e.target.closest('button'); if (!a) return; if (a.dataset.a === 'prev') show(i - 1); if (a.dataset.a === 'next') show(i + 1); });
  show(0);
  return () => {};
}
const dbl = (shapes, cls) => shapes.map((s) => s.replace('CLS', cls || 'st-line')).join('') + shapes.map((s) => s.replace('CLS', 'st-fill')).join('');
export const T = (x, y, t, c) => `<text class="${c || 'w-t'}" x="${x}" y="${y}" text-anchor="middle">${t}</text>`;

function levure(el) {
  const y = (mother, bud, nuclei, extra) => { const sh = [`<circle class="CLS" cx="${mother[0]}" cy="${mother[1]}" r="${mother[2]}"/>`]; if (bud) sh.push(`<circle class="CLS" cx="${bud[0]}" cy="${bud[1]}" r="${bud[2]}"/>`); return dbl(sh, 'wall-line') + nuclei.map((n) => `<ellipse fill="var(--nuc)" cx="${n[0]}" cy="${n[1]}" rx="${n[2]}" ry="${n[3]}" ${n[4] ? `transform="rotate(${n[4]} ${n[0]} ${n[1]})"` : ''}/>`).join('') + (extra || ''); };
  return stepper(el, '0 0 360 230', [
    { svg: y([150, 120, 62], null, [[150, 120, 14, 14]]) + T(150, 212, 'cellule mère') + T(290, 60, 'paroi', 'w-t-g') + `<line class="lb-line" x1="275" y1="66" x2="205" y2="95"/>` + T(70, 40, 'noyau') + `<line class="lb-line" x1="80" y1="46" x2="140" y2="112"/>`, cap: '<b>1.</b> Une cellule mère, avec son <b>noyau</b> et sa <b>paroi</b>.' },
    { svg: y([150, 120, 62], [207, 80, 18], [[165, 110, 14, 14]]) + T(275, 40, 'bourgeon', 'w-t-r') + `<line class="lb-line" x1="262" y1="46" x2="214" y2="72"/>` + T(150, 212, 'cellule mère'), cap: '<b>2.</b> Une petite déformation, le <b>bourgeon</b>, apparaît sur la cellule mère.' },
    { svg: y([150, 120, 62], [216, 74, 30], [[184, 96, 32, 9, -35]]) + T(285, 30, 'noyau en division', 'w-t-r') + `<line class="lb-line" x1="270" y1="36" x2="196" y2="88"/>` + T(150, 212, 'cellule mère'), cap: '<b>3.</b> Le <b>noyau se divise</b> : une partie passe dans le bourgeon.' },
    { svg: y([150, 120, 62], [222, 68, 40], [[140, 128, 12, 12], [228, 63, 11, 11]]) + T(150, 212, 'cellule mère') + T(305, 130, 'bourgeon', 'w-t-r'), cap: '<b>4.</b> Le bourgeon grossit : chaque cellule a <b>son noyau</b>.' },
    { svg: y([125, 132, 62], null, [[125, 132, 13, 13]]) + `<circle class="wall-line" cx="262" cy="70" r="44"/><circle class="st-fill" cx="262" cy="70" r="44"/><ellipse fill="var(--nuc)" cx="262" cy="70" rx="12" ry="12"/>` + T(125, 220, 'cellule mère') + T(262, 140, 'cellule fille', 'w-t-r'), cap: '<b>5.</b> Le bourgeon se sépare : c\'est la <b>cellule fille</b>. C\'est le <b>bourgeonnement</b>.' }
  ]);
}

function vir(x, y, s = 1, o = 1) {
  let p = ''; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; p += `${(Math.cos(a) * 12).toFixed(1)},${(Math.sin(a) * 12).toFixed(1)} `; }
  let sp = ''; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; sp += `<line x1="${Math.cos(a) * 11}" y1="${Math.sin(a) * 11}" x2="${Math.cos(a) * 19}" y2="${Math.sin(a) * 19}" stroke="var(--red)" stroke-width="2"/><circle cx="${Math.cos(a) * 20}" cy="${Math.sin(a) * 20}" r="2.6" fill="var(--red)"/>`; }
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}">${sp}<polygon points="${p}" fill="var(--card)" stroke="var(--red)" stroke-width="2.4"/><path d="M-5 0 q2.5 -4 5 0 t5 0" fill="none" stroke="var(--green)" stroke-width="1.8"/></g>`;
}
function virus(el) {
  const cell = (broken) => `<circle cx="210" cy="125" r="88" fill="var(--cell)" stroke="${broken ? 'var(--bad)' : 'var(--ink-soft)'}" stroke-width="${broken ? 3 : 2.4}" ${broken ? 'stroke-dasharray="14 10"' : ''}/><circle cx="225" cy="135" r="24" fill="var(--nuc)" ${broken ? 'opacity=".35"' : ''}/>`;
  const inside = [[170, 95], [200, 80], [245, 92], [180, 135], [262, 120], [190, 170], [230, 180], [260, 160], [160, 155]];
  return stepper(el, '0 0 360 240', [
    { svg: cell() + vir(70, 45) + T(70, 92, 'virus', 'w-t-r') + T(225, 228, 'cellule hôte') + T(225, 172, 'noyau'), cap: 'Un <b>virus</b> n\'est pas une cellule. Seul, il ne peut rien faire : il lui faut une <b>cellule hôte</b>.' },
    { svg: cell() + vir(122, 72) + T(78, 40, 'fixation', 'w-t-r'), cap: '<b>1. Fixation</b> : le virus s\'accroche à la membrane de la cellule.' },
    { svg: cell() + vir(162, 100, 0.8, 0.45) + `<path d="M170 110 q8 -8 16 0 t16 0 t16 0" fill="none" stroke="var(--green)" stroke-width="3"/>` + T(250, 30, 'matériel génétique', 'w-t-g') + `<line class="lb-line" x1="240" y1="36" x2="198" y2="108"/>`, cap: '<b>2. Pénétration</b> : le virus (ou son matériel génétique) entre dans la cellule.' },
    { svg: cell() + inside.map((p) => vir(p[0], p[1], 0.6)).join(''), cap: '<b>3. Multiplication</b> : il utilise les <b>structures de la cellule</b> pour fabriquer de nouveaux virus.' },
    { svg: cell(true) + inside.map((p, k) => { const a = Math.atan2(p[1] - 125, p[0] - 210); return vir(210 + Math.cos(a) * 112 + (k % 2 ? 6 : -6), 125 + Math.sin(a) * 104, 0.6); }).join('') + T(210, 130, 'cellule détruite', 'w-t-r'), cap: '<b>4. Libération</b> : la cellule est <b>détruite</b>, les virus vont infecter d\'autres cellules. Le virus est un <b>parasite</b>.' }
  ]);
}

function phago(el) {
  const bact = (x, y, o = 1, a = 0) => `<g opacity="${o}" transform="rotate(${a} ${x} ${y})"><rect x="${x - 17}" y="${y - 8}" width="34" height="16" rx="8" fill="var(--cell-2)" stroke="var(--wall)" stroke-width="2.4"/></g>`;
  const nuc = `<circle cx="205" cy="105" r="13" fill="var(--nuc)"/><circle cx="222" cy="122" r="12" fill="var(--nuc)"/><circle cx="203" cy="133" r="11" fill="var(--nuc)"/>`;
  const body = `<circle class="CLS" cx="200" cy="118" r="76"/>`;
  return stepper(el, '0 0 360 230', [
    { svg: dbl([body]) + nuc + bact(108, 118) + T(200, 215, 'phagocyte (globule blanc)') + T(80, 80, 'microbe', 'w-t-r'), cap: '<b>1. Adhésion</b> : le phagocyte se colle au microbe.' },
    { svg: dbl([body, `<ellipse class="CLS" cx="118" cy="96" rx="34" ry="11" transform="rotate(-28 118 96)"/>`, `<ellipse class="CLS" cx="118" cy="140" rx="34" ry="11" transform="rotate(28 118 140)"/>`]) + nuc + bact(104, 118) + T(70, 60, 'pseudopodes', 'w-t-r') + `<line class="lb-line" x1="80" y1="66" x2="104" y2="88"/>`, cap: '<b>2. Ingestion</b> : des <b>pseudopodes</b> entourent le microbe et l\'avalent.' },
    { svg: dbl([body]) + nuc + `<circle cx="160" cy="112" r="24" fill="var(--paper)" stroke="var(--red)" stroke-width="2" stroke-dasharray="4 4"/>` + bact(160, 112, 0.55, 20) + T(120, 60, 'vacuole', 'w-t-r') + `<line class="lb-line" x1="125" y1="66" x2="150" y2="90"/>`, cap: '<b>3. Digestion</b> : enfermé dans une vacuole, le microbe est détruit.' },
    { svg: dbl([body]) + nuc + [[290, 90], [300, 112], [288, 130], [306, 140], [296, 160]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--wall)" opacity=".7"/>`).join('') + T(300, 60, 'déchets', 'w-t-r'), cap: '<b>4. Rejet</b> des déchets à l\'extérieur.' }
  ]);
}

/* ---------- formes des bactéries ---------- */
function bactForms(el) {
  const w = frame(el, `<svg class="w-svg" viewBox="0 0 480 300"></svg>`);
  const coc = (x, y, r = 11) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--cell-2)" stroke="var(--wall)" stroke-width="2.5"/>`;
  const bac = (x, y, a, l = 54) => `<rect x="${x - l / 2}" y="${y - 10}" width="${l}" height="20" rx="10" fill="var(--cell-2)" stroke="var(--wall)" stroke-width="2.5" transform="rotate(${a} ${x} ${y})"/><path d="M${x - l / 4} ${y} q6 -5 12 0 t12 0" fill="none" stroke="var(--red)" stroke-width="1.6" transform="rotate(${a} ${x} ${y})"/>`;
  let h = coc(70, 70) + coc(92, 70) + coc(70, 108) + coc(92, 112) + T(80, 150, 'Diplocoques', 'w-t-g') + T(80, 170, 'par deux');
  [[180, 50], [200, 56], [219, 65], [236, 77], [250, 92], [261, 110], [268, 129]].forEach((p) => { h += coc(p[0], p[1], 10); });
  h += T(225, 160, 'Streptocoques', 'w-t-g') + T(225, 180, 'en chaînette');
  [[360, 50], [380, 50], [400, 52], [350, 68], [370, 68], [390, 70], [410, 70], [360, 86], [380, 88], [400, 88], [370, 105], [390, 106], [380, 122]].forEach((p) => { h += coc(p[0], p[1], 10); });
  h += T(382, 160, 'Staphylocoques', 'w-t-g') + T(382, 180, 'en grappe');
  h += bac(110, 236, -12) + bac(190, 254, 18) + bac(160, 214, 40, 46) + T(150, 292, 'Bacilles : en bâtonnet', 'w-t-g');
  h += `<rect x="300" y="224" width="34" height="20" rx="10" fill="var(--cell-2)" stroke="var(--wall)" stroke-width="2.5"/><rect x="336" y="224" width="34" height="20" rx="10" fill="var(--cell-2)" stroke="var(--wall)" stroke-width="2.5"/>` + T(335, 270, 'bacille en division') + T(335, 290, '(bipartition)');
  h += `<line x1="20" y1="196" x2="460" y2="196" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="4 5"/>`;
  $('svg', w).innerHTML = h;
  return () => {};
}

/* ---------- bipartition ---------- */
function bipartition(el) {
  const w = frame(el, `<canvas class="w-canvas"></canvas><div class="w-row"><button type="button" class="w-btn primary">Lancer la division</button><button type="button" class="w-btn">Recommencer</button><span class="w-stat"><b>1</b> bactérie</span></div><p class="w-cap"></p>`);
  let s; const nEl = $('.w-stat b', w), cap = $('.w-cap', w);
  const upd = () => { const g = Math.round(Math.log2(s.b.length)); nEl.textContent = s.b.length; cap.innerHTML = s.b.length >= 64 ? '64 bactéries après 6 divisions ! Une bactérie peut se diviser toutes les <b>20 minutes</b> environ : en 8 h, une seule en donne plus de <b>16 millions</b>.' : `Génération <b>${g}</b> · temps ≈ <b>${g * 20} min</b>. 1 → 2 → 4 → 8…`; };
  const reset = () => { s = { b: [{ x: 300, y: 150, a: -0.2, L: 28 }], on: false }; upd(); };
  reset();
  const stop = sim($('canvas', w), 600, 300, {
    step(dt) {
      if (!s.on) return; const full = s.b.length >= 64; const nb = [];
      for (const b of s.b) { if (!full) b.L += 13 * dt; if (b.L >= 56 && s.b.length + nb.length < 64) { const dx = Math.cos(b.a) * 14, dy = Math.sin(b.a) * 14; nb.push({ x: b.x + dx, y: b.y + dy, a: b.a + rand(-0.5, 0.5), L: 28 }); b.x -= dx; b.y -= dy; b.L = 28; b.a += rand(-0.5, 0.5); } else if (b.L > 56) b.L = 56; }
      if (nb.length) { s.b.push(...nb); upd(); }
      const B = s.b; const ends = (b) => { const h = b.L / 2 - 9; return [[b.x + Math.cos(b.a) * h, b.y + Math.sin(b.a) * h], [b.x - Math.cos(b.a) * h, b.y - Math.sin(b.a) * h], [b.x, b.y]]; };
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const p = B[i], q = B[j]; for (const e of ends(p)) for (const f of ends(q)) { const dx = f[0] - e[0], dy = f[1] - e[1], d = Math.hypot(dx, dy) || 0.01; if (d < 20) { const push = (20 - d) * 0.5 * dt * 8; p.x -= dx / d * push; p.y -= dy / d * push; q.x += dx / d * push; q.y += dy / d * push; } } }
      for (const b of B) { b.x = Math.max(30, Math.min(570, b.x)); b.y = Math.max(18, Math.min(282, b.y)); }
    },
    draw(ctx) {
      for (const b of s.b) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); const l = b.L, r = 9;
        ctx.beginPath(); ctx.arc(-l / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.arc(l / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2); ctx.closePath();
        ctx.fillStyle = C('cell-2'); ctx.fill(); ctx.strokeStyle = C('wall'); ctx.lineWidth = 2.4; ctx.stroke();
        if (b.L > 46) { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke(); }
        ctx.strokeStyle = C('red'); ctx.lineWidth = 1.5; ctx.beginPath(); for (const c of b.L > 46 ? [-l / 4, l / 4] : [0]) { ctx.moveTo(c - 7, 0); ctx.quadraticCurveTo(c - 3.5, -4, c, 0); ctx.quadraticCurveTo(c + 3.5, 4, c + 7, 0); } ctx.stroke();
        ctx.restore();
      }
      if (s.b.length === 1) { label(ctx, 'paroi', 380, 92, C('green'), 'center'); arrow(ctx, 375, 102, 312, 141, C('green')); label(ctx, 'chromosome (pas de noyau)', 300, 216, C('red'), 'center'); arrow(ctx, 300, 205, 300, 152, C('red')); }
    }
  });
  const [go, rs] = $$('.w-btn', w);
  go.addEventListener('click', () => { s.on = true; }); rs.addEventListener('click', reset);
  return stop;
}

/* ---------- corps humain ---------- */
function body(el) {
  const spots = [
    { x: 117, y: 52, t: 'Les larmes', k: 'Barrière chimique', d: 'Sécrétées par les <b>glandes lacrymales</b>. Leur acidité ralentit certains microbes.' },
    { x: 130, y: 74, t: 'Muqueuses buccale et nasale', k: 'Mucus', d: 'Leur <b>mucus</b> retient les microbes et les poussières.' },
    { x: 130, y: 140, t: 'Voies respiratoires', k: 'Mucus', d: 'Les muqueuses des <b>bronches et bronchioles</b> piègent les microbes de l\'air inspiré.' },
    { x: 146, y: 190, t: 'Le suc gastrique', k: 'Barrière chimique', d: 'Très <b>acide</b>, il détruit la plupart des microbes avalés.' },
    { x: 66, y: 205, t: 'La sueur', k: 'Barrière chimique', d: 'Sécrétée par les <b>glandes sudoripares</b>. Son acidité ralentit certains microbes.' },
    { x: 112, y: 330, t: 'La peau', k: 'Barrière physique', d: 'Sa <b>couche cornée</b> empêche les microbes d\'entrer, sauf en cas de blessure.' }
  ];
  const w = frame(el, `<div class="w-body"><svg viewBox="0 0 260 430"></svg><div class="w-info"></div></div>`);
  const svg = $('svg', w), info = $('.w-info', w);
  let h = `<g fill="var(--skin)"><circle cx="130" cy="56" r="34"/><rect x="118" y="84" width="24" height="22" rx="6"/><rect x="86" y="100" width="88" height="160" rx="30"/><rect x="52" y="108" width="28" height="150" rx="14" transform="rotate(10 66 108)"/><rect x="180" y="108" width="28" height="150" rx="14" transform="rotate(-10 194 108)"/><rect x="90" y="240" width="36" height="170" rx="16"/><rect x="134" y="240" width="36" height="170" rx="16"/></g>
    <circle cx="117" cy="52" r="4" fill="var(--ink)"/><circle cx="143" cy="52" r="4" fill="var(--ink)"/><path d="M120 74 q10 7 20 0" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M130 88 L130 132 M130 132 q-14 8 -22 22 M130 132 q14 8 22 22" fill="none" stroke="var(--blood)" stroke-width="5" stroke-linecap="round" opacity=".6"/>
    <ellipse cx="108" cy="150" rx="16" ry="26" fill="var(--blood)" opacity=".2"/><ellipse cx="152" cy="150" rx="16" ry="26" fill="var(--blood)" opacity=".2"/>
    <path d="M136 176 q22 -6 26 10 q2 18 -22 22 q-12 2 -12 -10 z" fill="var(--horn)"/>`;
  spots.forEach((s, i) => { h += `<g class="w-hs" data-i="${i}" role="button" tabindex="0"><circle class="ring" cx="${s.x}" cy="${s.y}" r="13"/><circle class="core" cx="${s.x}" cy="${s.y}" r="8"/></g>`; });
  svg.innerHTML = h;
  const seen = new Set();
  const pick = (i) => { seen.add(i); $$('.w-hs', svg).forEach((g) => g.classList.toggle('on', seen.has(+g.dataset.i))); const s = spots[i]; info.innerHTML = `<span class="w-tag">${s.k}</span><b class="w-h">${s.t}</b><p>${s.d}</p><small>Vus : ${seen.size}/${spots.length}</small>`; };
  svg.addEventListener('click', (e) => { const g = e.target.closest('.w-hs'); if (g) pick(+g.dataset.i); });
  info.innerHTML = '<b class="w-h">Touche un point rouge</b><p>Chaque point est une barrière naturelle du corps (doc p 119).</p>';
  return () => {};
}

/* ---------- peau ---------- */
function peau(el) {
  const w = frame(el, `<canvas class="w-canvas"></canvas><div class="w-row"><button type="button" class="w-btn">Ajouter la sueur</button><button type="button" class="w-btn">Faire une blessure</button></div><p class="w-cap">La <b>couche cornée</b> arrête les microbes.</p>`);
  const W = 600, top = 92; const s = { m: [], sweat: false, wound: false, acc: 0 }; const glands = [130, 470];
  const stop = sim($('canvas', w), W, 300, {
    step(dt, t) {
      s.acc += dt * 2.6; while (s.acc > 1) { s.acc--; if (s.m.length < 70) s.m.push({ x: rand(20, 580), y: -8, vx: rand(-12, 12), vy: rand(50, 85), st: 'fall', age: 0, c: ['green', 'nuc', 'red'][Math.floor(rand(0, 3))] }); }
      for (const m of s.m) {
        m.age += dt;
        if (m.st === 'fall') { m.x += m.vx * dt; m.y += m.vy * dt; if (m.y >= top - 6) { if (s.wound && m.x > 268 && m.x < 332) { m.st = 'in'; m.ty = rand(205, 285); } else if (s.sweat) { m.st = 'slow'; m.y = top - 6; m.age = 0; } else { m.st = 'bounce'; m.vy = -Math.abs(m.vy) * 0.55; m.vx += rand(-40, 40); m.age = 0; } } }
        else if (m.st === 'bounce') { m.vy += 90 * dt; m.x += m.vx * dt; m.y += m.vy * dt; if (m.y > top - 6) { m.y = top - 6; m.vy = -Math.abs(m.vy) * 0.5; } if (m.age > 2.6) m.dead = true; }
        else if (m.st === 'slow') { if (m.age > 2.8) m.dead = true; }
        else if (m.st === 'in') { if (m.y < m.ty) m.y += 40 * dt; m.x += Math.sin(t * 4 + m.ty) * 20 * dt; if (m.age > 9) m.dead = true; }
      }
      s.m = s.m.filter((m) => !m.dead);
    },
    draw(ctx, t) {
      ctx.fillStyle = C('derm'); ctx.fillRect(0, 190, W, 110);
      ctx.fillStyle = C('blood'); ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.moveTo(0, 248); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 248 + 4 * Math.sin(x / 50)); ctx.lineTo(W, 268); for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, 268 + 4 * Math.sin(x / 50)); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = C('skin'); ctx.fillRect(0, 128, W, 62);
      ctx.strokeStyle = C('ink-soft'); ctx.globalAlpha = 0.3; ctx.lineWidth = 1; for (let r = 0; r < 3; r++) for (let x = (r % 2) * 14; x < W; x += 28) { ctx.beginPath(); ctx.ellipse(x + 14, 140 + r * 18, 12, 8, 0, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1;
      ctx.fillStyle = C('horn'); ctx.fillRect(0, top, W, 36);
      if (s.sweat) { ctx.strokeStyle = C('sweat'); ctx.lineWidth = 2.5; for (const gx of glands) { ctx.beginPath(); ctx.moveTo(gx, top); ctx.lineTo(gx, 212); ctx.stroke(); ctx.beginPath(); for (let a = 0; a < 14; a += 0.3) ctx.lineTo(gx + Math.cos(a) * (6 + a * 0.6), 222 + Math.sin(a) * 6); ctx.stroke(); } ctx.fillStyle = C('sweat'); ctx.globalAlpha = 0.6; for (let x = 20; x < W; x += 46) { ctx.beginPath(); ctx.ellipse(x, top - 3, 10, 4, 0, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
      if (s.wound) { ctx.fillStyle = C('derm'); ctx.beginPath(); ctx.moveTo(268, top); ctx.lineTo(286, 195); ctx.lineTo(314, 195); ctx.lineTo(332, top); ctx.fill(); ctx.strokeStyle = C('blood'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(268, top); ctx.lineTo(286, 195); ctx.moveTo(332, top); ctx.lineTo(314, 195); ctx.stroke(); }
      for (const m of s.m) { ctx.globalAlpha = m.st === 'bounce' ? Math.max(0, 1 - m.age / 2.6) : (m.st === 'slow' ? Math.max(0, 1 - m.age / 2.8) : 1); ctx.fillStyle = m.st === 'slow' ? C('ink-soft') : (m.st === 'in' ? C('bad') : C(m.c)); ctx.beginPath(); ctx.ellipse(m.x, m.y, 6, 4, m.x % 3, 0, 7); ctx.fill(); if (m.st === 'in') { ctx.strokeStyle = C('bad'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(m.x, m.y, 10 + 2 * Math.sin(t * 6), 0, 7); ctx.stroke(); } }
      ctx.globalAlpha = 1;
      label(ctx, 'couche cornée', 10, top + 18, C('ink')); label(ctx, 'épiderme', 10, 160); label(ctx, 'derme', 10, 214); label(ctx, 'vaisseau sanguin', 10, 286, C('blood'));
      if (s.sweat) label(ctx, 'glande sudoripare', glands[1] - 60, 236, C('sweat'), 'right');
      label(ctx, 'microbes', W - 12, 22, C('ink-soft'), 'right');
    }
  });
  const [sw, wd] = $$('.w-btn', w), cap = $('.w-cap', w);
  const msg = () => { cap.innerHTML = s.wound ? '<b>Blessure</b> : la barrière est ouverte, les microbes entrent. Il faut désinfecter !' : (s.sweat ? 'La <b>sueur</b> est acide : elle ralentit les microbes à la surface.' : 'La <b>couche cornée</b> arrête les microbes : barrière physique.'); };
  sw.addEventListener('click', () => { s.sweat = !s.sweat; sw.classList.toggle('on', s.sweat); sw.textContent = s.sweat ? 'Enlever la sueur' : 'Ajouter la sueur'; msg(); });
  wd.addEventListener('click', () => { s.wound = !s.wound; wd.classList.toggle('on', s.wound); wd.textContent = s.wound ? 'Refermer la blessure' : 'Faire une blessure'; msg(); });
  return stop;
}

/* ---------- muqueuse ---------- */
function muqueuse(el) {
  const w = frame(el, `<canvas class="w-canvas"></canvas><div class="w-row"><button type="button" class="w-btn">Retirer le mucus</button><span class="w-stat">Piégées : <b>0</b></span></div><p class="w-cap">Le mucus retient les particules puis il est évacué vers la gorge.</p>`);
  const W = 600; const s = { p: [], mucus: true, trap: 0, acc: 0 }; const nEl = $('.w-stat b', w);
  const mt = (x, t) => 180 + 4 * Math.sin(x / 40 - t * 1.5);
  const stop = sim($('canvas', w), W, 300, {
    step(dt, t) {
      s.acc += dt * 3.2; while (s.acc > 1) { s.acc--; if (s.p.length < 90) s.p.push({ x: -6, y: rand(30, 165), vx: rand(70, 120), vy: rand(10, 26), dust: Math.random() < 0.5, st: 'air', age: 0, c: ['green', 'nuc', 'red'][Math.floor(rand(0, 3))] }); }
      for (const p of s.p) {
        p.age += dt;
        if (p.st === 'air') { p.x += p.vx * dt; p.y += p.vy * dt + Math.sin(t * 3 + p.age * 4) * 6 * dt; if (s.mucus && p.y >= mt(p.x, t)) { p.st = 'stuck'; p.y = rand(186, 206); s.trap++; nEl.textContent = s.trap; } else if (!s.mucus && p.y >= 226) { p.st = 'cell'; p.y = rand(228, 236); p.age = 0; } if (p.x > 610) p.dead = true; }
        else if (p.st === 'stuck') { p.x -= 26 * dt; if (p.x < -10) p.dead = true; }
        else if (p.st === 'cell' && p.age > 6) p.dead = true;
      }
      s.p = s.p.filter((p) => !p.dead);
    },
    draw(ctx, t) {
      ctx.fillStyle = C('skin'); ctx.globalAlpha = 0.75; ctx.fillRect(0, 240, W, 60); ctx.globalAlpha = 1;
      ctx.strokeStyle = C('ink-soft'); ctx.lineWidth = 1.2; for (let x = 0; x < W; x += 40) { ctx.strokeRect(x, 240, 40, 60); ctx.fillStyle = C('nuc'); ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(x + 20, 272, 7, 10, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.lineWidth = 1.6; for (let x = 3; x < W; x += 7) { const a = 0.5 * Math.sin(t * 6 - x / 18); ctx.beginPath(); ctx.moveTo(x, 240); ctx.lineTo(x + Math.sin(a) * 18, 240 - Math.cos(a) * 20); ctx.stroke(); }
      if (s.mucus) { ctx.fillStyle = C('mucus'); ctx.beginPath(); ctx.moveTo(0, mt(0, t)); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, mt(x, t)); ctx.lineTo(W, 216); ctx.lineTo(0, 216); ctx.fill(); }
      for (const p of s.p) { if (p.dust) { ctx.fillStyle = C('ink-soft'); ctx.fillRect(p.x - 3, p.y - 3, 6, 6); } else { ctx.fillStyle = C(p.c); ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3.5, 0.4, 0, 7); ctx.fill(); } if (p.st === 'cell') { ctx.strokeStyle = C('bad'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 9 + 2 * Math.sin(t * 6), 0, 7); ctx.stroke(); } }
      label(ctx, 'air inspiré →', 12, 22);
      if (s.mucus) { label(ctx, 'mucus', W - 12, 198, C('ink'), 'right'); label(ctx, '← évacué vers la gorge', 12, 166, C('green')); }
      label(ctx, 'cils', W - 12, 228, C('ink'), 'right'); label(ctx, 'cellules de la muqueuse', W / 2, 284, C('ink'), 'center');
    }
  });
  const b = $('.w-btn', w), cap = $('.w-cap', w);
  b.addEventListener('click', () => { s.mucus = !s.mucus; b.classList.toggle('on', !s.mucus); b.textContent = s.mucus ? 'Retirer le mucus' : 'Remettre le mucus'; s.p.forEach((p) => { if (p.st === 'stuck') p.st = 'air'; }); cap.innerHTML = s.mucus ? 'Le mucus retient les particules puis il est évacué vers la gorge.' : '<b>Sans mucus</b>, poussières et microbes arrivent directement sur les cellules.'; });
  return stop;
}

export const widgets = { groups, scale, paramecie, amibe, moisissure, levure, virus, phago, bactForms, bipartition, body, peau, muqueuse };
