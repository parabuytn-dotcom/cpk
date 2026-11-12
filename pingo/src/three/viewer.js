import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const fib = (n, i) => { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996; return V(Math.cos(a) * r, y, Math.sin(a) * r); };

function phys(color, o = {}) {
  const transparent = o.opacity !== undefined && o.opacity < 1;
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide,
    transparent, depthWrite: !transparent, ...o
  });
}

/* ---------------- modèles ---------------- */
function virus() {
  const g = new THREE.Group();
  const envGeo = new THREE.SphereGeometry(1, 96, 64);
  const p = envGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + 0.025 * Math.sin(9 * v.x) * Math.sin(9 * v.y) * Math.sin(9 * v.z); v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z); }
  envGeo.computeVertexNormals();
  const envMat = phys('#7B86FF', { opacity: 0.93, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#C9CFFF') });
  g.add(new THREE.Mesh(envGeo, envMat));
  const innerMat = phys('#CDB8FF', { opacity: 0.35 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 32), innerMat));

  const stalk = new THREE.CylinderGeometry(0.022, 0.03, 0.22, 8).translate(0, 0.11, 0);
  const haGeo = mergeGeometries([stalk.clone(), new THREE.CylinderGeometry(0.075, 0.05, 0.13, 6).translate(0, 0.27, 0)]);
  const naGeo = mergeGeometries([stalk.clone(), new THREE.SphereGeometry(0.065, 12, 8).translate(0, 0.27, 0)]);
  const haMat = phys('#FF5A6E', { roughness: 0.4 }), naMat = phys('#FFC531', { roughness: 0.4 });
  const N = 150, nNA = Math.floor(N / 5);
  const ha = new THREE.InstancedMesh(haGeo, haMat, N - nNA), na = new THREE.InstancedMesh(naGeo, naMat, nNA);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), one = V(1, 1, 1);
  let ia = 0, ib = 0;
  for (let i = 0; i < N; i++) { const d = fib(N, i); q.setFromUnitVectors(up, d); m.compose(d.clone().multiplyScalar(0.98), q, one); if (i % 5 === 0) na.setMatrixAt(ib++, m); else ha.setMatrixAt(ia++, m); }
  g.add(ha, na);

  const rnaMat = phys('#2FD08A', { emissive: '#0b4a2f', emissiveIntensity: 0.4 });
  for (let s = 0; s < 8; s++) {
    const o = fib(8, s).multiplyScalar(0.42), pts = [];
    for (let j = 0; j < 7; j++) pts.push(o.clone().add(V(rnd(-0.22, 0.22), rnd(-0.22, 0.22), rnd(-0.22, 0.22))));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.042, 10, false), rnaMat));
  }
  return {
    group: g,
    parts: [
      { id: 'spicules', label: 'Spicules', color: '#FF5A6E', anchor: V(0.3, 0.9, 0.3).normalize().multiplyScalar(1.28), surface: true, mats: [haMat, naMat], info: "Des protéines hérissées : elles permettent au virus de s'accrocher à la cellule (la fixation)." },
      { id: 'enveloppe', label: 'Enveloppe', color: '#7B86FF', anchor: V(-0.75, 0.1, 0.65).normalize(), surface: true, mats: [envMat], info: "Elle entoure le virus. Pas de noyau, pas de cytoplasme : le virus n'est pas une cellule, il est acellulaire." },
      { id: 'genetique', label: 'Matériel génétique', color: '#2FD08A', anchor: V(0.15, -0.1, 0.25), surface: false, mats: [rnaMat], info: "Le « programme » du virus. Dans la cellule, il la force à fabriquer de nouveaux virus. Coupe le virus pour le voir." }
    ],
    update() {}
  };
}

function bacille() {
  const g = new THREE.Group(), inner = new THREE.Group(); inner.rotation.z = Math.PI / 2; g.add(inner);
  const wallMat = phys('#2FD08A', { opacity: 0.4, roughness: 0.15, clearcoat: 1 });
  const memMat = phys('#6EA8FF', { opacity: 0.3 });
  inner.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 2.2, 16, 48), wallMat));
  inner.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.54, 2.16, 16, 48), memMat));
  const pts = []; let x = 0, y = -0.9, z = 0;
  for (let j = 0; j < 46; j++) { x = THREE.MathUtils.clamp(x + rnd(-0.18, 0.18), -0.3, 0.3); z = THREE.MathUtils.clamp(z + rnd(-0.18, 0.18), -0.3, 0.3); y = j < 23 ? -0.9 + j * 0.08 : 0.9 - (j - 23) * 0.08; pts.push(V(x, y, z)); }
  const chrMat = phys('#FF4D6D', { emissive: '#5a0010', emissiveIntensity: 0.35 });
  inner.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 500, 0.03, 8, true), chrMat));
  const riboMat = phys('#9B6BFF');
  const ribo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), riboMat, 200);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 200; i++) { let p; do { p = V(rnd(-0.45, 0.45), rnd(-1.4, 1.4), rnd(-0.45, 0.45)); } while (Math.hypot(p.x, p.z) > 0.46); m.makeTranslation(p.x, p.y, p.z); ribo.setMatrixAt(i, m); }
  inner.add(ribo);
  return {
    group: g,
    parts: [
      { id: 'paroi', label: 'Paroi', color: '#2FD08A', anchor: V(0.5, 0.62, 0.1), surface: true, mats: [wallMat], info: 'Elle entoure la membrane cytoplasmique et donne sa forme de bâtonnet à la bactérie.' },
      { id: 'membrane', label: 'Membrane', color: '#6EA8FF', anchor: V(-0.9, 0.2, 0.5), surface: true, mats: [memMat], info: 'La membrane cytoplasmique délimite la cellule, sous la paroi.' },
      { id: 'chromosome', label: 'Chromosome', color: '#FF4D6D', anchor: V(0.1, 0, 0.15), surface: false, mats: [chrMat], info: "Un seul chromosome qui baigne dans le cytoplasme : pas de vrai noyau. La bactérie est un procaryote." },
      { id: 'cytoplasme', label: 'Cytoplasme', color: '#9B6BFF', anchor: V(1.1, -0.25, 0.2), surface: false, mats: [riboMat], info: 'Il remplit la cellule et contient de petits grains (les ribosomes).' }
    ],
    update() {}
  };
}

function levure() {
  const g = new THREE.Group();
  const wallMat = phys('#FFCF6B', { opacity: 0.5, roughness: 0.25, clearcoat: 1 });
  const budMat = phys('#FFB347', { opacity: 0.55, roughness: 0.25, clearcoat: 1 });
  const mother = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), wallMat); mother.scale.set(1, 1.05, 1); g.add(mother);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 32), phys('#FFF1C9', { opacity: 0.18 })));
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.58, 48, 32), budMat); bud.position.set(1.02, 0.74, 0); g.add(bud);
  const nucMat = phys('#5B5BFF', { emissive: '#1a1a66', emissiveIntensity: 0.3 });
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 28), nucMat); nuc.position.set(-0.15, -0.1, 0.05); g.add(nuc);
  const env = new THREE.Mesh(new THREE.SphereGeometry(0.34, 40, 28), phys('#9C9CFF', { opacity: 0.35 })); env.position.copy(nuc.position); g.add(env);
  const n2 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 20), nucMat); n2.position.set(1.1, 0.8, 0); g.add(n2);
  const vacMat = phys('#7FD3FF', { opacity: 0.6, roughness: 0.1 });
  const vac = new THREE.Mesh(new THREE.SphereGeometry(0.4, 40, 28), vacMat); vac.position.set(-0.25, 0.45, -0.18); g.add(vac);
  const gran = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), phys('#E0A300'), 50); const m = new THREE.Matrix4();
  for (let i = 0; i < 50; i++) { const d = fib(50, i).multiplyScalar(rnd(0.45, 0.85)); m.makeTranslation(d.x, d.y, d.z); gran.setMatrixAt(i, m); }
  g.add(gran);
  g.position.x = -0.35;
  return {
    group: g,
    parts: [
      { id: 'paroi', label: 'Paroi', color: '#E0A300', anchor: V(-0.55, -0.62, 0.6), surface: true, mats: [wallMat], info: "Elle entoure la membrane : c'est pour ça que la levure n'est pas un animal." },
      { id: 'noyau', label: 'Noyau', color: '#5B5BFF', anchor: V(-0.15, -0.1, 0.05), surface: false, mats: [nucMat], info: "Un vrai noyau entouré d'une enveloppe nucléaire : la levure est un eucaryote." },
      { id: 'bourgeon', label: 'Bourgeon', color: '#FF8A1F', anchor: V(1.2, 1.0, 0.3), surface: true, mats: [budMat], info: 'Il grossit, reçoit un noyau puis se sépare : ce sera la cellule fille (bourgeonnement).' },
      { id: 'vacuole', label: 'Vacuole', color: '#3FA9FF', anchor: V(-0.25, 0.45, -0.18), surface: false, mats: [vacMat], info: 'Une grosse poche remplie de liquide dans le cytoplasme.' }
    ],
    update(t) { const k = 1 + 0.03 * Math.sin(t * 2); bud.scale.set(k, k, k); }
  };
}

function paramecie() {
  const g = new THREE.Group();
  const shape = (v) => { v.x *= 2.1; v.y *= 0.8; v.z *= 0.72; if (v.x > 0) { const f = 1 - 0.18 * (v.x / 2.1); v.y *= f; v.z *= f; } return v; };
  const geo = new THREE.SphereGeometry(1, 96, 64); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = shape(V(p.getX(i), p.getY(i), p.getZ(i))); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const bodyMat = phys('#9DBBFF', { opacity: 0.5, roughness: 0.2, clearcoat: 1 });
  g.add(new THREE.Mesh(geo, bodyMat));
  const nucMat = phys('#4B4BD6', { emissive: '#14146b', emissiveIntensity: 0.3 });
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 28), nucMat); nuc.scale.set(1.4, 0.8, 0.8); nuc.position.set(0.35, -0.05, 0); g.add(nuc);
  const mic = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), nucMat); mic.position.set(0.75, 0.08, 0.1); g.add(mic);
  const vpMat = phys('#3FA9FF', { emissive: '#0b3a66', emissiveIntensity: 0.4 });
  const vps = [V(-1.2, 0.18, 0.12), V(1.25, 0.15, 0.1)].map((pos) => {
    const s = new THREE.Group(); s.position.copy(pos);
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), vpMat));
    for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 6), vpMat); const a = k / 7 * Math.PI * 2; const d = V(Math.cos(a), 0.25 * Math.sin(3 * a), Math.sin(a)).normalize(); c.quaternion.setFromUnitVectors(V(0, 1, 0), d); c.position.copy(d.multiplyScalar(0.16)); s.add(c); }
    g.add(s); return s;
  });
  const dvMat = phys('#FF5A6E', { emissive: '#5a0010', emissiveIntensity: 0.3 });
  const dvs = Array.from({ length: 7 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), dvMat); d.userData.ph = i / 7 * Math.PI * 2; g.add(d); return d; });
  const grooveMat = phys('#6A79B5');
  const groove = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 10, 40, Math.PI), grooveMat); groove.position.set(-0.15, 0.55, 0.3); groove.rotation.x = 0.9; g.add(groove);
  const NC = 1500, pos = new Float32Array(NC * 6), base = [];
  for (let i = 0; i < NC; i++) { const d = fib(NC, i); const s = shape(d.clone()); const n = V(d.x / 2.1, d.y / 0.8, d.z / 0.72).normalize(); base.push([s, n]); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const ciliaMat = new THREE.LineBasicMaterial({ color: '#6A79B5', transparent: true, opacity: 0.85 });
  g.add(new THREE.LineSegments(cg, ciliaMat));
  return {
    group: g,
    parts: [
      { id: 'cils', label: 'Cils vibratiles', color: '#6A79B5', anchor: V(0.6, 0.8, 0.1), surface: true, mats: [ciliaMat], info: 'Ils battent tous ensemble comme des rames : ils font avancer la paramécie.' },
      { id: 'bouche', label: 'Bouche', color: '#6A79B5', anchor: V(-0.15, 0.62, 0.42), surface: true, mats: [grooveMat], info: 'Par ce sillon, la nourriture entre dans la cellule.' },
      { id: 'noyau', label: 'Noyau', color: '#4B4BD6', anchor: V(0.35, -0.05, 0), surface: false, mats: [nucMat], info: 'Un vrai noyau : la paramécie est un eucaryote.' },
      { id: 'vp', label: 'Vacuole pulsatile', color: '#3FA9FF', anchor: V(1.25, 0.15, 0.1), surface: false, mats: [vpMat], info: "Elle se contracte régulièrement et rejette l'excès d'eau." },
      { id: 'vd', label: 'Vacuoles digestives', color: '#FF5A6E', anchor: V(-0.5, -0.2, 0.1), surface: false, mats: [dvMat], info: 'Elles contiennent la nourriture et la digèrent en tournant dans le cytoplasme.' }
    ],
    update(t) {
      for (let i = 0; i < NC; i++) { const [s, n] = base[i]; const w = Math.sin(t * 6 - s.x * 3) * 0.5; pos[i * 6] = s.x; pos[i * 6 + 1] = s.y; pos[i * 6 + 2] = s.z; pos[i * 6 + 3] = s.x + n.x * 0.15 + w * 0.08; pos[i * 6 + 4] = s.y + n.y * 0.15; pos[i * 6 + 5] = s.z + n.z * 0.15; }
      cg.attributes.position.needsUpdate = true;
      vps.forEach((s, i) => { const k = 0.7 + 0.45 * Math.abs(Math.sin(t * 1.6 + i * 1.4)); s.scale.set(k, k, k); });
      dvs.forEach((d) => { const a = t * 0.4 + d.userData.ph; d.position.set(Math.cos(a) * 1.05, Math.sin(a * 2) * 0.12 - 0.12, Math.sin(a) * 0.32); });
    }
  };
}

/* ---------------- chimie : molécules et états ---------------- */
function atom(r, mat) { return new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), mat); }
function bond(a, b, r, mat) {
  const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 20), mat);
  m.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}

function eau() {
  const g = new THREE.Group();
  const oMat = phys('#FF4D4D', { roughness: 0.3, clearcoat: 1 }), hMat = phys('#F4F7FF', { roughness: 0.3, clearcoat: 1 }), bMat = phys('#B8C0D8');
  const O = V(0, 0.2, 0);
  g.scale.setScalar(0.8);
  g.add(atom(0.62, oMat).translateY(0.2));
  const hs = [-1, 1].map((sx) => { const h = atom(0.38, hMat); g.add(h); return { h, sx }; });
  const bonds = [];
  const place = (t) => {
    const half = (52.25 + Math.sin(t * 3) * 4) * Math.PI / 180;
    bonds.forEach((b) => { g.remove(b); b.geometry.dispose(); }); bonds.length = 0;
    hs.forEach(({ h, sx }) => { const p = O.clone().add(V(sx * Math.sin(half), -Math.cos(half), 0).multiplyScalar(0.98)); h.position.copy(p); const b = bond(O, p, 0.1, bMat); g.add(b); bonds.push(b); });
  };
  place(0);
  return {
    group: g,
    parts: [
      { id: 'o', label: "Atome d'oxygène", color: '#FF4D4D', anchor: V(0, 0.85, 0.2), surface: true, mats: [oMat], info: "Le gros atome rouge : l'oxygène (O). La molécule d'eau H₂O en contient un." },
      { id: 'h', label: "Atomes d'hydrogène", color: '#9AA8D6', anchor: V(-0.95, -0.55, 0.2), surface: true, mats: [hMat], info: "Les deux petits atomes blancs : l'hydrogène (H). D'où le « H₂ » de H₂O." },
      { id: 'l', label: 'Liaisons', color: '#B8C0D8', anchor: V(0.35, -0.12, 0.1), surface: false, mats: [bMat], info: 'Elles relient les atomes entre eux. Toute la molécule mesure environ 3 Å (3 × 10⁻¹⁰ m).' }
    ],
    update(t) { place(t); }
  };
}

function co2() {
  const g = new THREE.Group();
  const cMat = phys('#3A3F4B', { roughness: 0.3, clearcoat: 1 }), oMat = phys('#FF4D4D', { roughness: 0.3, clearcoat: 1 }), bMat = phys('#B8C0D8');
  g.scale.setScalar(0.85);
  g.add(atom(0.5, cMat));
  for (const sx of [-1, 1]) {
    const o = atom(0.55, oMat); o.position.x = sx * 1.25; g.add(o);
    for (const dy of [-0.1, 0.1]) g.add(bond(V(0, dy, 0), V(sx * 1.25, dy, 0), 0.06, bMat));
  }
  return {
    group: g,
    parts: [
      { id: 'c', label: 'Atome de carbone', color: '#6B7280', anchor: V(0, 0.55, 0.2), surface: true, mats: [cMat], info: 'Le carbone (C) est au centre. Piège du cours : CO₂ contient du carbone mais il est classé inorganique.' },
      { id: 'o', label: "Atomes d'oxygène", color: '#FF4D4D', anchor: V(1.25, 0.6, 0.2), surface: true, mats: [oMat], info: "Deux atomes d'oxygène (O), un de chaque côté : CO₂." },
      { id: 'l', label: 'Doubles liaisons', color: '#B8C0D8', anchor: V(-0.62, 0.1, 0.1), surface: false, mats: [bMat], info: "Chaque oxygène est relié au carbone par une double liaison. La molécule est en ligne droite." }
    ],
    update(t) { g.children.forEach((c, i) => { if (i) c.position.z = Math.sin(t * 2 + i) * 0.015; }); }
  };
}

function diatomiques() {
  const g = new THREE.Group();
  const hMat = phys('#F4F7FF', { roughness: 0.3, clearcoat: 1 }), clMat = phys('#3DDC84', { roughness: 0.3, clearcoat: 1 }), bMat = phys('#B8C0D8');
  const h2 = new THREE.Group(); h2.position.y = 1.05; g.add(h2);
  for (const sx of [-1, 1]) { const a = atom(0.3, hMat); a.position.x = sx * 0.23; h2.add(a); }
  h2.add(bond(V(-0.23, 0, 0), V(0.23, 0, 0), 0.08, bMat));
  const cl2 = new THREE.Group(); cl2.position.y = -0.55; g.add(cl2);
  for (const sx of [-1, 1]) { const a = atom(0.72, clMat); a.position.x = sx * 0.55; cl2.add(a); }
  return {
    group: g,
    parts: [
      { id: 'h2', label: 'Dihydrogène H₂', color: '#9AA8D6', anchor: V(0, 1.45, 0.2), surface: true, mats: [hMat], info: 'Deux atomes d\'hydrogène. Longueur ℓ ≈ 0,75 Å : il en faut 1,64 × 10⁸ bout à bout pour 1,23 cm !' },
      { id: 'cl2', label: 'Dichlore Cl₂', color: '#3DDC84', anchor: V(0, 0.2, 0.3), surface: true, mats: [clMat], info: 'Deux atomes de chlore. Longueur ℓ ≈ 2 Å = 2 × 10⁻¹⁰ m.' }
    ],
    update(t) { h2.rotation.y = t * 0.6; cl2.rotation.y = -t * 0.4; }
  };
}

function etats() {
  const g = new THREE.Group(), S = 1.3, R = 0.085;
  g.scale.setScalar(0.72);
  const sphere = new THREE.SphereGeometry(R, 14, 10), m4 = new THREE.Matrix4();
  const mk = (pos, color, n) => {
    const box = new THREE.Group(); box.position.copy(pos); g.add(box);
    const lineMat = new THREE.LineBasicMaterial({ color: '#9AA8D6' });
    box.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S, S, S)), lineMat));
    const mat = phys(color, { roughness: 0.3, clearcoat: 1 });
    const inst = new THREE.InstancedMesh(sphere, mat, n); box.add(inst);
    return { box, inst, mat };
  };
  const sol = mk(V(-0.95, 1.2, 0), '#4B4BD6', 64), liq = mk(V(0.95, 0, 0), '#2F6BFF', 48), gaz = mk(V(-0.95, -1.2, 0), '#3FA9FF', 14);
  const lat = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) lat.push(V(-0.39 + i * 0.26, -0.39 + j * 0.26, -0.39 + k * 0.26));
  const liqBase = Array.from({ length: 48 }, () => V(rnd(-0.5, 0.5), rnd(-0.55, 0.05), rnd(-0.5, 0.5)));
  const gas = Array.from({ length: 14 }, () => ({ p: V(rnd(-0.5, 0.5), rnd(-0.5, 0.5), rnd(-0.5, 0.5)), v: V(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(0.9) }));
  let last = 0;
  return {
    group: g,
    parts: [
      { id: 'sol', label: 'Solide', color: '#4B4BD6', anchor: V(-0.95, 1.95, 0), surface: false, mats: [sol.mat], info: 'Structure condensée et ordonnée : les molécules sont serrées et bien rangées. Elles vibrent sur place.' },
      { id: 'liq', label: 'Liquide', color: '#2F6BFF', anchor: V(0.95, 0.75, 0), surface: false, mats: [liq.mat], info: 'Structure condensée et désordonnée : serrées, mais sans ordre. Elles glissent les unes sur les autres.' },
      { id: 'gaz', label: 'Gaz', color: '#3FA9FF', anchor: V(-0.95, -0.45, 0), surface: false, mats: [gaz.mat], info: 'Structure non condensée et désordonnée : les molécules sont éloignées et bougent dans tous les sens.' }
    ],
    update(t) {
      const dt = Math.min(0.05, t - last); last = t;
      lat.forEach((p, i) => { m4.makeTranslation(p.x + Math.sin(t * 9 + i) * 0.012, p.y + Math.cos(t * 11 + i * 2) * 0.012, p.z + Math.sin(t * 7 + i * 3) * 0.012); sol.inst.setMatrixAt(i, m4); });
      liqBase.forEach((p, i) => { m4.makeTranslation(p.x + Math.sin(t * 1.3 + i) * 0.07, p.y + Math.sin(t * 1.7 + i * 2) * 0.03, p.z + Math.cos(t * 1.1 + i * 3) * 0.07); liq.inst.setMatrixAt(i, m4); });
      gas.forEach((o, i) => {
        o.p.addScaledVector(o.v, dt);
        for (const k of ['x', 'y', 'z']) if (Math.abs(o.p[k]) > S / 2 - R) { o.p[k] = Math.sign(o.p[k]) * (S / 2 - R); o.v[k] *= -1; }
        m4.makeTranslation(o.p.x, o.p.y, o.p.z); gaz.inst.setMatrixAt(i, m4);
      });
      sol.inst.instanceMatrix.needsUpdate = liq.inst.instanceMatrix.needsUpdate = gaz.inst.instanceMatrix.needsUpdate = true;
    }
  };
}

const BUILDERS = { virus, bacille, levure, paramecie, eau, co2, diatomiques, etats };

/* ---------------- viewer ---------------- */
export function createViewer(container, { onSelect } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  renderer.domElement.className = 'v-canvas';
  container.appendChild(renderer.domElement);
  const labelsEl = document.createElement('div'); labelsEl.className = 'v-labels'; container.appendChild(labelsEl);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#334477', 0.6));
  const key = new THREE.DirectionalLight('#ffffff', 1.3); key.position.set(4, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#7fb2ff', 1.1); rim.position.set(-5, -2, -4); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100); camera.position.set(0, 0.6, 6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 2; controls.maxDistance = 11; controls.enablePan = false;
  controls.autoRotate = true; controls.autoRotateSpeed = 1.4;

  // poussière flottante
  const dustGeo = new THREE.BufferGeometry(); const dp = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) { const d = fib(260, i).multiplyScalar(rnd(3, 7)); dp.set([d.x, d.y, d.z], i * 3); }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#cfe0ff', size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  const clip = new THREE.Plane(V(0, 0, -1), 0);
  let model = null, labels = [], cut = false, showLabels = true, selected = null, tween = null;
  const t0 = performance.now(); let raf = 0, alive = true;

  function forMats(fn) { if (!model) return; model.group.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(fn); }); }
  function applyClip() { forMats((m) => { m.clippingPlanes = cut ? [clip] : []; m.needsUpdate = true; }); }

  function disposeModel() {
    if (!model) return;
    scene.remove(model.group);
    model.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
    labelsEl.innerHTML = ''; labels = []; model = null;
  }

  function setModel(name) {
    disposeModel(); selected = null;
    model = BUILDERS[name]();
    scene.add(model.group);
    model.parts.forEach((p) => {
      p.mats.forEach((m) => { m.userData.baseColor = m.color.clone(); if (m.emissive) { m.userData.baseEm = m.emissive.clone(); m.userData.baseEi = m.emissiveIntensity; } });
      const b = document.createElement('button'); b.type = 'button'; b.className = 'v-lab';
      b.innerHTML = `<i style="background:${p.color}"></i><span>${p.label}</span>`;
      b.addEventListener('click', (e) => { e.stopPropagation(); select(p.id); });
      labelsEl.appendChild(b); labels.push({ p, b });
    });
    applyClip(); reset(false);
  }

  function highlight() {
    if (!model) return;
    model.parts.forEach((p) => p.mats.forEach((m) => { m.color.copy(m.userData.baseColor); if (m.emissive) { m.emissive.copy(m.userData.baseEm); m.emissiveIntensity = m.userData.baseEi; } }));
    labels.forEach(({ p, b }) => b.classList.toggle('on', p.id === selected));
  }

  function animateCam(toPos, toTarget, ms = 700) {
    tween = { fromP: camera.position.clone(), fromT: controls.target.clone(), toP: toPos, toT: toTarget, start: performance.now(), ms };
  }

  function select(id) {
    if (!model) return;
    selected = id; highlight();
    const p = model.parts.find((x) => x.id === id);
    if (!p) return;
    controls.autoRotate = false;
    const world = p.anchor.clone().applyMatrix4(model.group.matrixWorld);
    const dir = p.surface ? world.clone().normalize() : camera.position.clone().sub(controls.target).normalize();
    animateCam(world.clone().multiplyScalar(0.35).add(dir.multiplyScalar(4)), world.clone().multiplyScalar(0.35));
    onSelect && onSelect(p);
  }

  function reset(anim = true) {
    selected = null; highlight(); onSelect && onSelect(null);
    const toP = V(0, 0.6, 6), toT = V(0, 0, 0);
    if (anim) animateCam(toP, toT); else { camera.position.copy(toP); controls.target.copy(toT); }
  }

  // tap sur un objet
  const ray = new THREE.Raycaster(); let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; tween = null; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || !model) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hits = ray.intersectObject(model.group, true);
    for (const h of hits) {
      const m = h.object.material; if (!m) continue;
      if (cut && clip.distanceToPoint(h.point) < 0) continue;
      const part = model.parts.find((p) => p.mats.includes(m));
      if (part) { select(part.id); return; }
    }
  });

  function resize() {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w < h ? 48 : 38; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const tmp = V(0, 0, 0), center = V(0, 0, 0);
  function loop() {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const t = (performance.now() - t0) / 1000;
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.start) / tween.ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      camera.position.lerpVectors(tween.fromP, tween.toP, e); controls.target.lerpVectors(tween.fromT, tween.toT, e);
      if (k >= 1) tween = null;
    }
    controls.update();
    dust.rotation.y = t * 0.02;
    if (model) {
      model.update(t);
      if (selected) {
        const p = model.parts.find((x) => x.id === selected); const pulse = 0.5 + 0.5 * Math.sin(t * 5);
        p.mats.forEach((m) => { if (m.emissive) { m.emissive.set(p.color); m.emissiveIntensity = 0.25 + 0.45 * pulse; } else m.color.copy(m.userData.baseColor).lerp(new THREE.Color('#ffffff'), 0.5 * pulse); });
      }
    }
    renderer.render(scene, camera);
    // étiquettes
    const w = container.clientWidth, h = container.clientHeight;
    model && model.group.updateMatrixWorld();
    center.setFromMatrixPosition(model ? model.group.matrixWorld : new THREE.Matrix4());
    for (const { p, b } of labels) {
      tmp.copy(p.anchor).applyMatrix4(model.group.matrixWorld);
      let vis = showLabels;
      if (p.surface) { const n = tmp.clone().sub(center).normalize(); const toCam = camera.position.clone().sub(tmp).normalize(); if (n.dot(toCam) < -0.05) vis = false; if (cut && clip.distanceToPoint(tmp) < 0) vis = false; }
      tmp.project(camera);
      if (tmp.z > 1) vis = false;
      b.style.transform = `translate3d(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px, 0)`;
      b.classList.toggle('hide', !vis);
    }
  }
  loop();

  return {
    setModel,
    select,
    reset: () => reset(true),
    setCut(v) {
      cut = v;
      if (v) { const d = camera.position.clone().sub(controls.target).normalize(); clip.normal.copy(d.negate()); clip.constant = 0; }
      applyClip();
    },
    setLabels(v) { showLabels = v; },
    setAuto(v) { controls.autoRotate = v; },
    zoom(f) { const d = camera.position.clone().sub(controls.target); d.multiplyScalar(f); const len = THREE.MathUtils.clamp(d.length(), controls.minDistance, controls.maxDistance); d.setLength(len); animateCam(controls.target.clone().add(d), controls.target.clone(), 300); },
    destroy() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); disposeModel(); controls.dispose();
      dustGeo.dispose(); dust.material.dispose(); scene.environment.dispose(); pmrem.dispose(); renderer.dispose();
      renderer.domElement.remove(); labelsEl.remove();
    }
  };
}
