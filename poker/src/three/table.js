import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Avatar } from './avatar.js';
import {
  cardFaceTexture, cardBackTexture, CHIP_DENOMS, chipTopTexture, chipSideTexture,
  dealerButtonTexture, feltTexture, floorTexture, glowTexture
} from './textures.js';

const A = 1.1, R = 0.95; // demi-longueur droite et rayon du tapis (stadium)
const PERIM = 4 * A + 2 * Math.PI * R;
const CARD_W = 0.25, CARD_H = 0.35;
const CHIP_R = 0.045, CHIP_H = 0.014;

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function stadiumPoint(s, off) {
  s = ((s % PERIM) + PERIM) % PERIM;
  const rr = R + off;
  if (s < A) return { x: -s, z: rr, nx: 0, nz: 1 };
  s -= A;
  const arc = Math.PI * R;
  if (s < arc) { const t = s / R; const nx = -Math.sin(t), nz = Math.cos(t); return { x: -A + nx * rr, z: nz * rr, nx, nz }; }
  s -= arc;
  if (s < 2 * A) return { x: -A + s, z: -rr, nx: 0, nz: -1 };
  s -= 2 * A;
  if (s < arc) { const t = s / R; const nx = Math.sin(t), nz = -Math.cos(t); return { x: A + nx * rr, z: nz * rr, nx, nz }; }
  s -= arc;
  return { x: A - s, z: rr, nx: 0, nz: 1 };
}

function stadiumShape(a, r) {
  const s = new THREE.Shape();
  s.moveTo(-a, -r);
  s.lineTo(a, -r);
  s.absarc(a, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-a, r);
  s.absarc(-a, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  return s;
}
function stadiumPath(ctx, toPx, a, r) {
  ctx.beginPath();
  const [x0, y0] = toPx(-a, -r);
  ctx.moveTo(x0, y0);
  const steps = 40;
  const pts = [];
  pts.push([a, -r]);
  for (let i = 0; i <= steps; i++) { const t = -Math.PI / 2 + (i / steps) * Math.PI; pts.push([a + Math.cos(t) * r, Math.sin(t) * r]); }
  pts.push([-a, r]);
  for (let i = 0; i <= steps; i++) { const t = Math.PI / 2 + (i / steps) * Math.PI; pts.push([-a + Math.cos(t) * r, Math.sin(t) * r]); }
  for (const [x, z] of pts) { const [px, py] = toPx(x, z); ctx.lineTo(px, py); }
  ctx.closePath();
}

export class TableScene {
  constructor(container, { seats = 6, showcase = false } = {}) {
    this.container = container;
    this.nSeats = seats;
    this.showcase = showcase;
    this.tweens = [];
    this.avatars = [];
    this.cardMeshes = new Map(); // id -> mesh
    this.holeMeshes = [];
    this.boardMeshes = [];
    this.stacks = [];
    this.bets = [];
    this.activeSeat = -1;
    this.speed = 1;
    this.onFrame = null;
    this.clock = new THREE.Clock();
    this.disposed = false;
  }

  async init() {
    try {
      await Promise.all([
        document.fonts.load('800 40px Outfit'),
        document.fonts.load('400 40px "Bebas Neue"')
      ]);
    } catch { /* polices de secours */ }
    const cw = this.container.clientWidth || 1, ch = this.container.clientHeight || 1;
    this.portrait = !this.showcase && cw / ch < 0.85;
    this.boardZ = this.portrait ? -0.15 : -0.05;
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;
    this.container.appendChild(r.domElement);
    r.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    this.scene = scene;
    scene.background = new THREE.Color('#07080c');
    scene.fog = new THREE.FogExp2('#07080c', 0.055);
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.28;

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    this.camTarget = new THREE.Vector3(0, -0.1, 0.38);

    // lumières
    const spot = new THREE.SpotLight('#fff0d4', 55, 14, 0.62, 0.55, 1.5);
    spot.position.set(0, 5.4, 0.4);
    spot.target.position.set(0, 0, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0004;
    spot.shadow.radius = 4;
    scene.add(spot, spot.target);
    scene.add(new THREE.HemisphereLight('#7f8cff', '#2a1010', 0.55));
    const rim = new THREE.PointLight('#ff9e57', 6, 12, 1.4);
    rim.position.set(-3, 2.5, -3.5);
    scene.add(rim);
    const rim2 = new THREE.PointLight('#5f7dff', 5, 12, 1.4);
    rim2.position.set(3.5, 2.2, -2.5);
    scene.add(rim2);

    if (this.portrait) this.camTarget.set(0, 0, 0.15);
    this.buildRoom();
    this.buildTable();
    this.buildProps();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.container);
    this.loop = this.loop.bind(this);
    r.setAnimationLoop(this.loop);
  }

  buildRoom() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: floorTexture(this.renderer), roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.85;
    floor.receiveShadow = true;
    this.scene.add(floor);
    // lumières de casino floues au loin
    const glow = glowTexture();
    const colors = ['#ff4f6d', '#f5c451', '#55d6ff', '#a66bff', '#ff8a3d', '#3dff9e'];
    this.bokeh = [];
    for (let i = 0; i < 46; i++) {
      const m = new THREE.SpriteMaterial({ map: glow, color: colors[i % colors.length], transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      const sp = new THREE.Sprite(m);
      const ang = Math.random() * Math.PI * 2;
      const dist = 9 + Math.random() * 9;
      sp.position.set(Math.cos(ang) * dist, 0.3 + Math.random() * 3.5, Math.sin(ang) * dist);
      const sc = 0.5 + Math.random() * 1.6;
      sp.scale.set(sc, sc, 1);
      sp.userData.phase = Math.random() * 10;
      this.scene.add(sp);
      this.bokeh.push(sp);
    }
  }

  buildTable() {
    const scene = new THREE.Group();
    // en portrait, la table est tournée de 90° : on est assis au bout
    scene.rotation.y = this.portrait ? Math.PI / 2 : 0;
    this.scene.add(scene);
    const portrait = this.portrait;
    const W = 2 * (A + R), H = 2 * R;
    const ftex = feltTexture(this.renderer, W, H, (ctx, toPx, sx) => {
      ctx.strokeStyle = 'rgba(245,196,81,0.55)';
      ctx.lineWidth = 6;
      stadiumPath(ctx, toPx, A - 0.05, R - 0.36);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 3;
      stadiumPath(ctx, toPx, A, R - 0.08);
      ctx.stroke();
      if (portrait) return;
      // emplacements des cartes communes
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 5; i++) {
        const [x, y] = toPx(-0.62 + i * 0.31 - CARD_W / 2 - 0.01, -0.05 - CARD_H / 2 - 0.01);
        ctx.beginPath();
        ctx.roundRect(x, y, (CARD_W + 0.02) * sx, (CARD_H + 0.02) * sx, 12);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(245,196,81,0.22)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `400 ${0.17 * sx}px "Bebas Neue", Arial`;
      let [x, y] = toPx(0, -0.43);
      ctx.fillText('ALL-IN ACADEMY', x, y);
      ctx.font = `600 ${0.06 * sx}px Outfit, Arial`;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      [x, y] = toPx(0, 0.64);
      ctx.fillText("TEXAS HOLD'EM · NO LIMIT", x, y);
    });
    const feltGeo = new THREE.ShapeGeometry(stadiumShape(A, R), 48);
    const pos = feltGeo.attributes.position;
    const uv = feltGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
    }
    const felt = new THREE.Mesh(feltGeo, new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.92 }));
    felt.rotation.x = -Math.PI / 2;
    felt.receiveShadow = true;
    scene.add(felt);

    const railShape = stadiumShape(A, R + 0.17);
    railShape.holes.push(stadiumShape(A, R));
    const railGeo = new THREE.ExtrudeGeometry(railShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 5, curveSegments: 40 });
    const rail = new THREE.Mesh(railGeo, new THREE.MeshStandardMaterial({ color: '#2b1610', roughness: 0.42, metalness: 0.05 }));
    rail.rotation.x = -Math.PI / 2;
    rail.position.y = 0.0;
    rail.castShadow = true;
    rail.receiveShadow = true;
    scene.add(rail);
    // liseré doré
    const trimGeo = new THREE.ExtrudeGeometry((() => { const s = stadiumShape(A, R + 0.012); s.holes.push(stadiumShape(A, R - 0.005)); return s; })(), { depth: 0.012, bevelEnabled: false, curveSegments: 40 });
    const trim = new THREE.Mesh(trimGeo, new THREE.MeshStandardMaterial({ color: '#c9a23a', roughness: 0.3, metalness: 0.85 }));
    trim.rotation.x = -Math.PI / 2;
    trim.position.y = 0.001;
    scene.add(trim);
    const apron = new THREE.Mesh(new THREE.ExtrudeGeometry(stadiumShape(A, R + 0.2), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, curveSegments: 40 }), new THREE.MeshStandardMaterial({ color: '#4a2716', roughness: 0.5 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.2;
    apron.castShadow = true;
    scene.add(apron);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 0.62, 32), new THREE.MeshStandardMaterial({ color: '#1c0f0a', roughness: 0.4 }));
    base.position.y = -0.53;
    scene.add(base);
  }

  buildProps() {
    const r = this.renderer;
    // matériaux partagés
    this.cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    this.backMat = new THREE.MeshStandardMaterial({ map: cardBackTexture(r), roughness: 0.45, transparent: true, alphaTest: 0.5 });
    this.chipGeo = new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 24);
    this.chipMats = new Map();
    for (const d of CHIP_DENOMS) {
      const top = new THREE.MeshStandardMaterial({ map: chipTopTexture(d, r), roughness: 0.4 });
      const sideTex = chipSideTexture(d, r);
      sideTex.wrapS = THREE.RepeatWrapping;
      sideTex.repeat.set(3, 1);
      const side = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.4 });
      this.chipMats.set(d.v, [side, top, top]);
    }
    // paquet
    const deck = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const c = this.makeCardMesh(null);
      c.position.y = i * 0.0035;
      deck.add(c);
    }
    const dp = this.portrait ? [0.62, -0.72] : [0.98, -0.08];
    deck.position.set(dp[0], 0.006, dp[1]);
    deck.rotation.y = 0.25;
    this.deckPos = new THREE.Vector3(dp[0], 0.06, dp[1]);
    this.scene.add(deck);
    // bouton dealer
    const btnMat = new THREE.MeshStandardMaterial({ map: dealerButtonTexture(r), roughness: 0.3 });
    const btnSide = new THREE.MeshStandardMaterial({ color: '#e8e2d2', roughness: 0.4 });
    this.dealerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 32), [btnSide, btnMat, btnMat]);
    this.dealerBtn.castShadow = true;
    this.dealerBtn.position.set(0, -1, 0);
    this.scene.add(this.dealerBtn);
    // anneau du joueur actif
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 48), new THREE.MeshBasicMaterial({ color: '#f5c451', transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.004;
    this.scene.add(this.ring);
    this.potPos = new THREE.Vector3(0, 0.005, this.portrait ? 0.42 : 0.3);
    this.potGroup = new THREE.Group();
    this.potGroup.position.copy(this.potPos);
    this.scene.add(this.potGroup);
  }

  /** Positions utiles pour un siège */
  seatInfo(i) {
    const s0 = this.portrait ? A + (Math.PI * R) / 2 : 0;
    const s = s0 + (i / this.nSeats) * PERIM;
    const at = (off) => {
      const q = stadiumPoint(s, off);
      // portrait : rotation de 90° (u, w) -> (w, -u)
      return this.portrait ? { x: q.z, z: -q.x, nx: q.nz, nz: -q.nx } : q;
    };
    const p = at(0);
    const tangent = new THREE.Vector3(-p.nz, 0, p.nx); // vers la droite du joueur
    const v = (o, tan = 0, y = 0) => { const q = at(o); return new THREE.Vector3(q.x + tangent.x * tan, y, q.z + tangent.z * tan); };
    const hero = i === 0;
    return {
      normal: new THREE.Vector3(p.nx, 0, p.nz),
      tangent,
      avatar: v(0.55, 0, 0.04),
      cards: hero ? v(-0.3, -0.05, 0.004) : v(-0.3, 0, 0.004),
      stack: hero ? v(-0.16, 0.36) : v(-0.16, 0.3),
      bet: hero ? v(-0.48, 0.12) : v(-0.5, 0),
      button: hero ? v(-0.22, -0.38, 0.0) : v(-0.2, -0.32, 0.0),
      ring: hero ? v(-0.26, 0) : v(-0.18, 0),
      label: hero ? v(0.25, 0, 0.12) : v(0.12, 0, 0.2)
    };
  }

  setPlayers(list) {
    // list[i] : définition de personnage ou null (siège du joueur humain)
    for (const a of this.avatars) if (a) this.scene.remove(a.group);
    this.avatars = list.map((def, i) => {
      if (!def) return null;
      const av = new Avatar(def);
      const info = this.seatInfo(i);
      av.group.position.copy(info.avatar);
      av.group.scale.setScalar(0.8);
      av.group.lookAt(new THREE.Vector3(0, info.avatar.y, 0).lerp(info.avatar, 0.2));
      this.scene.add(av.group);
      av.group.updateMatrixWorld(true);
      return av;
    });
    this.stacks = list.map(() => null);
    this.bets = list.map(() => null);
  }

  // ---------- animations ----------
  tween(dur, fn, ease = easeInOut, delay = 0) {
    return new Promise((resolve) => {
      this.tweens.push({ t: -delay, dur: Math.max(0.001, dur / this.speed), fn, ease, resolve });
    });
  }
  wait(sec) { return this.tween(sec, () => {}, (t) => t); }

  makeCardMesh(card) {
    const g = new THREE.Group();
    const back = new THREE.Mesh(this.cardGeo, this.backMat);
    back.rotation.x = Math.PI / 2;
    back.position.y = -0.0006;
    back.castShadow = true;
    g.add(back);
    if (card) {
      const front = new THREE.Mesh(this.cardGeo, new THREE.MeshStandardMaterial({ map: cardFaceTexture(card, this.renderer), roughness: 0.4, transparent: true, alphaTest: 0.5 }));
      front.rotation.x = -Math.PI / 2;
      front.position.y = 0.0006;
      g.add(front);
      g.userData.front = front;
    } else {
      back.rotation.x = -Math.PI / 2;
    }
    g.userData.card = card;
    return g;
  }

  flyCard(mesh, to, { faceUp = false, rotY = 0, dur = 0.42, arc = 0.35, delay = 0 } = {}) {
    const from = this.deckPos.clone();
    mesh.position.copy(from);
    mesh.rotation.set(0, 0.25, Math.PI);
    mesh.visible = false;
    this.scene.add(mesh);
    const startRotY = 0.25 + Math.PI * 2;
    return this.tween(dur, (k) => {
      mesh.visible = true;
      mesh.position.lerpVectors(from, to, k);
      mesh.position.y += Math.sin(k * Math.PI) * arc;
      mesh.rotation.y = startRotY + (rotY - startRotY) * k;
      mesh.rotation.z = faceUp ? Math.PI * (1 - k) : Math.PI;
    }, easeOut, delay);
  }

  flip(mesh, { rotY, dur = 0.45, lift = 0.12 } = {}) {
    const z0 = mesh.rotation.z, y0 = mesh.position.y, ry0 = mesh.rotation.y;
    const ry1 = rotY ?? ry0;
    return this.tween(dur, (k) => {
      mesh.rotation.z = z0 * (1 - k);
      mesh.rotation.y = ry0 + (ry1 - ry0) * k;
      mesh.position.y = y0 + Math.sin(k * Math.PI) * lift;
    });
  }

  async dealHole(order, holes) {
    // order : [{seat, index}] ; holes[seat] = [c1,c2] (cartes connues ou null)
    this.holeMeshes = this.holeMeshes.length ? this.holeMeshes : [];
    const promises = [];
    let k = 0;
    for (const { seat, index } of order) {
      const info = this.seatInfo(seat);
      const card = holes[seat]?.[index] || null;
      const mesh = this.makeCardMesh(card);
      if (!this.holeMeshes[seat]) this.holeMeshes[seat] = [];
      this.holeMeshes[seat][index] = mesh;
      const to = info.cards.clone().addScaledVector(info.tangent, (index - 0.5) * (seat === 0 ? 0.27 : 0.12));
      to.y = 0.004 + index * 0.002;
      const face = Math.atan2(info.normal.x, info.normal.z);
      const rotY = seat === 0 ? (index - 0.5) * -0.12 : face + (index - 0.5) * 0.25;
      promises.push(this.flyCard(mesh, to, { rotY, delay: k * 0.11, faceUp: false }).then(() => window.__sfx?.('card')));
      k++;
    }
    await Promise.all(promises);
  }

  async revealHero(cards) {
    const m = this.holeMeshes[0];
    if (!m) return;
    await Promise.all(m.map((mesh, i) => (mesh ? this.flip(mesh, { dur: 0.4 }) : null)));
    void cards;
  }

  async reveal(seat, hole) {
    const ms = this.holeMeshes[seat];
    if (!ms) return;
    // remplace les dos par des cartes connues, puis retourne
    await Promise.all(ms.map((mesh, i) => {
      if (!mesh) return null;
      if (!mesh.userData.card && hole?.[i]) {
        const nm = this.makeCardMesh(hole[i]);
        nm.position.copy(mesh.position);
        nm.rotation.copy(mesh.rotation);
        this.scene.remove(mesh);
        this.scene.add(nm);
        ms[i] = nm;
        mesh = nm;
      }
      if (mesh.rotation.z < 0.01) return null;
      const info = this.seatInfo(seat);
      const target = info.cards.clone().addScaledVector(info.normal, 0.08).addScaledVector(info.tangent, (i - 0.5) * 0.27);
      const p0 = mesh.position.clone();
      return Promise.all([
        this.flip(mesh, { rotY: 0, dur: 0.5 }),
        this.tween(0.5, (k) => { mesh.position.x = p0.x + (target.x - p0.x) * k; mesh.position.z = p0.z + (target.z - p0.z) * k; })
      ]);
    }));
  }

  async foldCards(seat) {
    const ms = this.holeMeshes[seat];
    if (!ms) return;
    const center = new THREE.Vector3(0.35, 0.01, -0.35);
    await Promise.all(ms.map((mesh, i) => {
      if (!mesh) return null;
      const p0 = mesh.position.clone();
      const ry0 = mesh.rotation.y;
      const z0 = mesh.rotation.z;
      return this.tween(0.45, (k) => {
        mesh.position.lerpVectors(p0, center, k * 0.55);
        mesh.position.y = p0.y + Math.sin(k * Math.PI) * 0.15;
        mesh.rotation.y = ry0 + k * 1.5;
        mesh.rotation.z = z0 < 1 ? Math.PI * k : Math.PI;
        mesh.scale.setScalar(1 - k * 0.98);
      }, easeOut).then(() => { this.scene.remove(mesh); });
    }));
    this.holeMeshes[seat] = null;
  }

  async dealBoard(cards, startIndex) {
    const ps = cards.map((c, i) => {
      const idx = startIndex + i;
      const mesh = this.makeCardMesh(c);
      this.boardMeshes[idx] = mesh;
      const sp = this.portrait ? 0.345 : 0.31;
      if (this.portrait) mesh.scale.setScalar(1.27);
      const to = new THREE.Vector3((idx - 2) * sp, 0.004, this.boardZ);
      return this.flyCard(mesh, to, { faceUp: false, rotY: 0, delay: i * 0.12, dur: 0.38 })
        .then(() => window.__sfx?.('card'))
        .then(() => this.wait(0.05 + i * 0.08))
        .then(() => this.flip(mesh, { dur: 0.4, lift: 0.1 }));
    });
    await Promise.all(ps);
  }

  highlight(cardIds) {
    const ids = new Set(cardIds);
    const all = [...this.boardMeshes, ...this.holeMeshes.flat()].filter(Boolean);
    for (const m of all) {
      const on = m.userData.card && ids.has(m.userData.card.id);
      const front = m.userData.front;
      if (front) {
        front.material.emissive = new THREE.Color(on ? '#5a4310' : '#000000');
        front.material.color = new THREE.Color(on || !ids.size ? '#ffffff' : '#7d7d7d');
      }
      const y0 = m.userData.baseY ?? m.position.y;
      m.userData.baseY = y0;
      m.position.y = on ? y0 + 0.03 : y0;
    }
  }

  // ---------- jetons ----------
  chipStack(amount, maxCols = 6) {
    const g = new THREE.Group();
    let rem = Math.round(amount);
    const cols = [];
    for (const d of CHIP_DENOMS) {
      let n = Math.floor(rem / d.v);
      rem -= n * d.v;
      while (n > 0) { const c = Math.min(n, 12); cols.push({ d, n: c }); n -= c; }
    }
    if (rem > 0) cols.push({ d: CHIP_DENOMS[CHIP_DENOMS.length - 1], n: 1 });
    const offsets = [[0, 0], [0.095, 0], [0.0475, -0.082], [-0.0475, -0.082], [-0.095, 0], [0.0475, 0.082], [-0.0475, 0.082], [0.142, -0.082], [-0.142, -0.082]];
    cols.slice(0, Math.max(maxCols, 3)).forEach((col, ci) => {
      const [ox, oz] = offsets[ci % offsets.length];
      for (let i = 0; i < col.n; i++) {
        const chip = new THREE.Mesh(this.chipGeo, this.chipMats.get(col.d.v));
        chip.position.set(ox + (Math.random() - 0.5) * 0.004, CHIP_H / 2 + i * CHIP_H, oz + (Math.random() - 0.5) * 0.004);
        chip.rotation.y = Math.random() * 6;
        chip.castShadow = true;
        g.add(chip);
      }
    });
    return g;
  }

  setStack(seat, amount) {
    const old = this.stacks[seat];
    if (old) this.scene.remove(old);
    if (amount <= 0) { this.stacks[seat] = null; return; }
    const g = this.chipStack(amount, 7);
    const info = this.seatInfo(seat);
    g.position.copy(info.stack);
    g.rotation.y = Math.atan2(info.normal.x, info.normal.z);
    this.scene.add(g);
    this.stacks[seat] = g;
  }

  async setBet(seat, amount) {
    const info = this.seatInfo(seat);
    const old = this.bets[seat];
    if (old) this.scene.remove(old);
    if (amount <= 0) { this.bets[seat] = null; return; }
    const g = this.chipStack(amount, 4);
    g.userData.amount = amount;
    this.bets[seat] = g;
    this.scene.add(g);
    const from = info.stack.clone();
    const to = info.bet.clone();
    window.__sfx?.('chips');
    await this.tween(0.35, (k) => {
      g.position.lerpVectors(from, to, k);
      g.position.y = Math.sin(k * Math.PI) * 0.12;
    }, easeOut);
  }

  async collectBets(potAmount) {
    const ps = this.bets.map((g, seat) => {
      if (!g) return null;
      const from = g.position.clone();
      return this.tween(0.45, (k) => {
        g.position.lerpVectors(from, this.potPos, k);
        g.position.y = Math.sin(k * Math.PI) * 0.1;
      }, easeInOut, seat * 0.03).then(() => this.scene.remove(g));
    });
    if (ps.some(Boolean)) window.__sfx?.('chips');
    await Promise.all(ps);
    this.bets = this.bets.map(() => null);
    this.setPot(potAmount);
  }

  setPot(amount) {
    this.potGroup.clear();
    if (amount > 0) this.potGroup.add(this.chipStack(amount, 9));
  }

  async awardPot(splits) {
    // splits : [{seat, amount}]
    this.potGroup.clear();
    window.__sfx?.('chips');
    await Promise.all(splits.map(({ seat, amount }, i) => {
      const g = this.chipStack(amount, 6);
      g.position.copy(this.potPos);
      this.scene.add(g);
      const to = this.seatInfo(seat).stack;
      return this.tween(0.75, (k) => {
        g.position.lerpVectors(this.potPos, to, k);
        g.position.y = Math.sin(k * Math.PI) * 0.25;
      }, easeInOut, i * 0.15).then(() => this.scene.remove(g));
    }));
  }

  async moveDealer(seat) {
    const to = this.seatInfo(seat).button;
    to.y = 0.013;
    const b = this.dealerBtn;
    if (b.position.y < -0.5) { b.position.copy(to); return; }
    const from = b.position.clone();
    await this.tween(0.5, (k) => {
      b.position.lerpVectors(from, to, k);
      b.position.y = 0.013 + Math.sin(k * Math.PI) * 0.12;
    });
  }

  setActive(seat) {
    this.activeSeat = seat;
    if (seat >= 0) {
      const p = this.seatInfo(seat).ring;
      this.ring.position.set(p.x, 0.004, p.z);
      // les autres regardent le joueur actif
      const target = seat === 0 ? new THREE.Vector3(0, 0.6, 1.6) : this.seatInfo(seat).avatar.clone().setY(0.6);
      this.avatars.forEach((av, i) => { if (av && i !== seat) av.lookAt(target); });
      if (this.avatars[seat]) this.avatars[seat].lookAt(new THREE.Vector3(0, 0, 0));
    }
  }

  lookAllAt(pos) { for (const av of this.avatars) if (av) av.lookAt(pos); }

  async clearTable() {
    const all = [...this.boardMeshes, ...this.holeMeshes.flat()].filter(Boolean);
    const target = this.deckPos.clone();
    await Promise.all(all.map((m, i) => {
      const from = m.position.clone();
      return this.tween(0.35, (k) => {
        m.position.lerpVectors(from, target, k);
        m.scale.setScalar(1 - k * 0.6);
      }, easeInOut, i * 0.015).then(() => this.scene.remove(m));
    }));
    this.boardMeshes = [];
    this.holeMeshes = [];
    for (const g of this.bets) if (g) this.scene.remove(g);
    this.bets = this.bets.map(() => null);
    this.potGroup.clear();
    for (const av of this.avatars) if (av) av.setFolded(false);
  }

  // ---------- rendu ----------
  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    const shift = this.getViewShift ? this.getViewShift(w, h) : 0;
    if (shift) this.camera.setViewOffset(w, h, shift, 0, w, h); else this.camera.clearViewOffset();
    const aspect = (w - 2 * shift) / h;
    this.camera.aspect = w / h;
    this.camera.fov = aspect < 1 ? 52 : 40;
    let fit = aspect < 1.5 ? Math.max(1, (aspect < 1 ? 1.12 : 1.5) / aspect) : 1;
    if (this.portrait) {
      this.camera.fov = 56;
      const halfW = 1.62;
      const d = halfW / (Math.tan((this.camera.fov * Math.PI) / 360) * aspect);
      fit = d / Math.hypot(5.6, 3.6);
      this.camera.setViewOffset(w, h, 0, Math.round(h * 0.07), w, h);
    }
    this.camDist = fit;
    this.camera.updateProjectionMatrix();
  }

  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.container.clientWidth, y: (-p.y * 0.5 + 0.5) * this.container.clientHeight, visible: p.z < 1 };
  }

  loop() {
    if (this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    // tweens
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.ease(k));
      if (k >= 1) { this.tweens.splice(i, 1); tw.resolve(); }
    }
    for (const av of this.avatars) if (av) av.update(dt);
    for (const b of this.bokeh) b.material.opacity = 0.32 + Math.sin(t * 0.8 + b.userData.phase) * 0.18;
    this.ring.material.opacity = this.activeSeat >= 0 ? 0.55 + Math.sin(t * 5) * 0.3 : 0;
    // caméra
    const d = this.camDist || 1;
    if (this.showcase) {
      const a = t * 0.12;
      this.camera.position.set(Math.sin(a) * 5.2, 2.6 + Math.sin(t * 0.3) * 0.3, Math.cos(a) * 5.2);
      this.camera.lookAt(0, 0.1, 0);
    } else {
      const px = this.pointer ? this.pointer.x * 0.25 : 0;
      const base = this.portrait ? new THREE.Vector3(0, 5.6, 3.6) : new THREE.Vector3(px, 4.5, 4.7);
      const dir = base.sub(this.camTarget).multiplyScalar(d);
      this.camera.position.copy(this.camTarget).add(dir);
      this.camera.lookAt(this.camTarget);
    }
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.ro?.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
