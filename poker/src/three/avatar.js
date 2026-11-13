import * as THREE from 'three';

export const CHARACTERS = [
  { name: 'Tex', persona: 'rock', skin: '#e9b48f', shirt: '#7a4b2a', hair: '#d9d9d9', hat: 'cowboy', mustache: true, eyes: '#2b2b2b' },
  { name: 'Mia', persona: 'tag', skin: '#f3c9a6', shirt: '#1d2333', hair: '#2a1a12', hat: 'ponytail', shades: true, eyes: '#2b2b2b', lips: true },
  { name: 'Bubba', persona: 'fish', skin: '#f0b892', shirt: '#2fa7c9', hair: '#8a5a2b', hat: 'cap', capColor: '#d6413b', round: true, eyes: '#2b2b2b' },
  { name: 'Vinnie', persona: 'maniac', skin: '#d79c74', shirt: '#b0182b', hair: '#121212', hat: 'mohawk', chain: true, eyes: '#2b2b2b' },
  { name: 'Lucky', persona: 'tag', skin: '#c58c63', shirt: '#2e6b4a', hair: '#3b2416', hat: 'cap', capColor: '#1d2a4a', eyes: '#2b2b2b' },
  { name: 'Grace', persona: 'pro', skin: '#8d5a3b', shirt: '#4b3fb8', hair: '#140c08', hat: 'bun', headphones: true, eyes: '#2b2b2b', lips: true }
];

const mat = (color, rough = 0.55, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

export class Avatar {
  constructor(def) {
    this.def = def;
    this.group = new THREE.Group();
    this.t = Math.random() * 10;
    this.blink = 2 + Math.random() * 3;
    this.anim = null;
    this.mood = 0; // -1 triste, 0 neutre, 1 content
    this.folded = false;
    this.lookYaw = 0;
    this.lookYawTarget = 0;
    this.build();
  }

  build() {
    const d = this.def;
    const g = this.group;
    const skin = mat(d.skin, 0.6);
    const shirt = mat(d.shirt, 0.7);
    const hairM = mat(d.hair, 0.8);
    const dark = mat('#141414', 0.4);

    // chaise
    const chairM = mat('#3a1e14', 0.5);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.08), chairM);
    chairBack.position.set(0, -0.05, -0.36);
    chairBack.castShadow = true;
    g.add(chairBack);
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.05), mat('#8c1d2a', 0.8));
    cushion.position.set(0, -0.02, -0.31);
    g.add(cushion);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.6), chairM);
    seat.position.set(0, -0.42, -0.1);
    g.add(seat);

    // corps
    this.body = new THREE.Group();
    g.add(this.body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(d.round ? 0.3 : 0.25, 0.3, 6, 16), shirt);
    torso.position.y = 0.02;
    torso.scale.z = 0.8;
    torso.castShadow = true;
    this.body.add(torso);
    this.torso = torso;
    if (d.chain) {
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 8, 24), mat('#f5c451', 0.25, 0.9));
      chain.position.set(0, 0.24, 0.12);
      chain.rotation.x = 1.25;
      this.body.add(chain);
    }

    // bras
    this.arms = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * (d.round ? 0.32 : 0.28), 0.24, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 4, 10), shirt);
      arm.position.y = -0.2;
      arm.castShadow = true;
      pivot.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), skin);
      hand.position.y = -0.41;
      pivot.add(hand);
      this.body.add(pivot);
      return { pivot, side, rx: -1.05, rz: side * 0.12 };
    });

    // tête
    this.head = new THREE.Group();
    this.head.position.y = 0.62;
    this.body.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 20), skin);
    skull.castShadow = true;
    this.head.add(skull);
    const ears = [-1, 1].map((s) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skin);
      e.position.set(s * 0.26, -0.01, 0);
      e.scale.set(0.6, 1, 0.8);
      this.head.add(e);
      return e;
    });
    void ears;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skin);
    nose.position.set(0, -0.03, 0.27);
    this.head.add(nose);

    // yeux
    this.eyes = [-1, 1].map((s) => {
      const eg = new THREE.Group();
      eg.position.set(s * 0.095, 0.05, 0.225);
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), mat('#ffffff', 0.3));
      white.scale.z = 0.6;
      eg.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), mat(d.eyes, 0.2));
      pupil.position.z = 0.03;
      eg.add(pupil);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      shine.position.set(0.012, 0.012, 0.058);
      eg.add(shine);
      this.head.add(eg);
      return eg;
    });
    this.brows = [-1, 1].map((s) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.018, 0.02), mat(d.hair === '#d9d9d9' ? '#9a9a9a' : d.hair, 0.8));
      b.position.set(s * 0.095, 0.125, 0.235);
      this.head.add(b);
      return { mesh: b, side: s };
    });
    // bouche (arc de tore)
    this.mouth = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 20, Math.PI), mat(d.lips ? '#b5384a' : '#6b2b25', 0.5));
    this.mouth.position.set(0, -0.11, 0.245);
    this.mouth.rotation.z = Math.PI;
    this.head.add(this.mouth);

    if (d.mustache) {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.1, 4, 8), mat('#cfcfcf', 0.9));
      m.rotation.z = Math.PI / 2;
      m.position.set(0, -0.075, 0.262);
      this.head.add(m);
    }
    if (d.shades) {
      const sh = new THREE.Group();
      for (const s of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 20), mat('#0b0b0f', 0.1, 0.6));
        lens.rotation.x = Math.PI / 2;
        lens.position.set(s * 0.095, 0.05, 0.27);
        sh.add(lens);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.012), dark);
      bridge.position.set(0, 0.06, 0.275);
      sh.add(bridge);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.01, 6, 32, Math.PI), dark);
      band.rotation.x = Math.PI / 2;
      band.rotation.z = Math.PI;
      band.position.y = 0.06;
      sh.add(band);
      this.head.add(sh);
    }

    // cheveux / chapeaux
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.285, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2.1), hairM);
    cap.rotation.x = -0.25;
    cap.position.set(0, 0.015, -0.02);
    if (d.hat !== 'mohawk') this.head.add(cap);
    if (d.hat === 'cowboy') {
      const hatM = mat('#8b5a2b', 0.75);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.025, 32), hatM);
      brim.position.y = 0.19;
      brim.scale.z = 0.85;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.22, 24), hatM);
      crown.position.y = 0.3;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.252, 0.252, 0.04, 24), mat('#2a1a10', 0.6));
      band.position.y = 0.215;
      const hat = new THREE.Group();
      hat.add(brim, crown, band);
      hat.rotation.x = -0.12;
      this.head.add(hat);
    } else if (d.hat === 'cap') {
      const cm = mat(d.capColor, 0.7);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.29, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2.2), cm);
      dome.position.y = 0.04;
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24, 1, false, -Math.PI / 2, Math.PI), cm);
      visor.position.set(0, 0.1, 0.2);
      visor.rotation.x = 0.15;
      this.head.add(dome, visor);
    } else if (d.hat === 'mohawk') {
      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 8), hairM);
        const a = -0.9 + i * 0.36;
        spike.position.set(0, Math.cos(a) * 0.28, Math.sin(a) * 0.28);
        spike.rotation.x = a;
        this.head.add(spike);
      }
    } else if (d.hat === 'ponytail') {
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), hairM);
      tail.position.set(0, -0.05, -0.3);
      tail.rotation.x = 0.4;
      this.head.add(tail);
      this.tail = tail;
    } else if (d.hat === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), hairM);
      bun.position.set(0, 0.27, -0.08);
      this.head.add(bun);
    }
    if (d.headphones) {
      const hm = mat('#f5c451', 0.35, 0.4);
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 32, Math.PI), mat('#222', 0.4));
      arc.position.y = 0.0;
      this.head.add(arc);
      for (const s of [-1, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 20), hm);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(s * 0.29, 0, 0);
        this.head.add(cup);
      }
    }
  }

  play(name, dur) {
    const durations = { bet: 0.8, fold: 0.7, win: 2.4, lose: 1.8, allin: 1.2, think: 999, check: 0.5 };
    this.anim = { name, t: 0, dur: dur ?? durations[name] ?? 1 };
    if (name === 'win') this.mood = 1;
    if (name === 'lose') this.mood = -1;
  }
  stopThink() { if (this.anim?.name === 'think') this.anim = null; }
  setFolded(f) { this.folded = f; if (!f) this.mood = 0; }
  lookAt(worldPos) {
    const local = this.group.worldToLocal(worldPos.clone());
    this.lookYawTarget = Math.max(-0.9, Math.min(0.9, Math.atan2(local.x, local.z)));
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    // respiration
    const breath = Math.sin(t * 2.1) * 0.012;
    this.torso.scale.y = 1 + breath;
    let bodyY = 0, lean = this.folded ? -0.08 : 0.04, headTilt = Math.sin(t * 0.7) * 0.03, headPitch = 0;
    const arm = [{ rx: this.folded ? -0.45 : -1.05, rz: 0.12 }, { rx: this.folded ? -0.45 : -1.05, rz: 0.12 }];
    // clignement
    this.blink -= dt;
    let eyeScale = 1;
    if (this.blink < 0) {
      eyeScale = 0.1;
      if (this.blink < -0.12) this.blink = 2 + Math.random() * 4;
    }
    if (this.anim) {
      const a = this.anim;
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      const pulse = Math.sin(k * Math.PI);
      switch (a.name) {
        case 'think':
          headTilt = 0.16 + Math.sin(t * 1.5) * 0.04;
          headPitch = -0.08;
          arm[1].rx = lerp(-1.05, -2.3, Math.min(1, a.t * 3));
          arm[1].rz = lerp(0.12, -0.5, Math.min(1, a.t * 3));
          break;
        case 'bet':
        case 'check':
          lean = 0.04 + pulse * 0.18;
          arm[0].rx = arm[1].rx = -1.05 - pulse * (a.name === 'check' ? 0.3 : 0.55);
          if (a.name === 'check') headPitch = pulse * 0.2;
          break;
        case 'allin':
          lean = 0.04 + pulse * 0.3;
          bodyY = pulse * 0.08;
          arm[0].rx = arm[1].rx = -1.05 - pulse * 0.75;
          break;
        case 'fold':
          arm[1].rx = -1.05 - pulse * 0.9;
          arm[1].rz = 0.12 - pulse * 0.6;
          headTilt = -pulse * 0.1;
          break;
        case 'win': {
          const j = Math.abs(Math.sin(a.t * 7)) * (1 - k);
          bodyY = j * 0.12;
          arm[0].rx = arm[1].rx = lerp(-1.05, -2.9, Math.min(1, a.t * 4) * (1 - Math.max(0, k - 0.85) / 0.15));
          arm[0].rz = arm[1].rz = 0.4;
          headPitch = -0.15 * pulse;
          break;
        }
        case 'lose':
          headPitch = 0.35 * pulse;
          lean = -0.05;
          arm[0].rx = arm[1].rx = -0.6;
          break;
      }
      if (a.t >= a.dur) this.anim = null;
    }
    this.lookYaw += (this.lookYawTarget - this.lookYaw) * Math.min(1, dt * 4);
    this.body.position.y = bodyY;
    this.body.rotation.x = lean;
    this.head.rotation.set(headPitch, this.lookYaw, headTilt);
    for (let i = 0; i < 2; i++) {
      const A = this.arms[i];
      A.rx += (arm[i].rx - A.rx) * Math.min(1, dt * 10);
      A.rz += (arm[i].rz * A.side - A.rz) * Math.min(1, dt * 10);
      A.pivot.rotation.set(A.rx, 0, A.rz);
    }
    for (const e of this.eyes) e.scale.y = eyeScale;
    const m = this.mood;
    this.mouth.rotation.z = m >= 0 ? Math.PI : 0;
    this.mouth.scale.set(m === 1 ? 1.25 : 1, m === 0 ? 0.45 : 1, 1);
    this.mouth.position.y = m < 0 ? -0.14 : -0.11;
    for (const b of this.brows) b.mesh.rotation.z = (m < 0 ? 0.25 : m > 0 ? -0.1 : 0) * b.side * -1;
    if (this.tail) this.tail.rotation.z = Math.sin(t * 1.3) * 0.08;
  }
}
