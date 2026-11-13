// Effets sonores synthétisés (aucun fichier audio à télécharger).
let ctx = null;
let enabled = true;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noise(dur, { freq = 3000, q = 1, gain = 0.3, type = 'bandpass', delay = 0 } = {}) {
  const a = ac(); if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + delay);
}

function tone(freq, dur, { type = 'sine', gain = 0.15, delay = 0, slide = 0 } = {}) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  const t0 = a.currentTime + delay;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

const SOUNDS = {
  card: () => noise(0.07, { freq: 2400, q: 0.8, gain: 0.35 }),
  chips: () => { for (let i = 0; i < 4; i++) { tone(3200 + Math.random() * 1600, 0.05, { type: 'triangle', gain: 0.05, delay: i * 0.035 }); noise(0.03, { freq: 6000, q: 2, gain: 0.12, delay: i * 0.035 }); } },
  knock: () => { noise(0.06, { freq: 300, q: 1.5, gain: 0.8, type: 'lowpass' }); noise(0.06, { freq: 300, q: 1.5, gain: 0.7, type: 'lowpass', delay: 0.12 }); },
  fold: () => noise(0.22, { freq: 1200, q: 0.5, gain: 0.25 }),
  allin: () => { tone(220, 0.35, { type: 'sawtooth', gain: 0.06, slide: 2 }); tone(330, 0.35, { type: 'sawtooth', gain: 0.05, slide: 2, delay: 0.05 }); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: 'triangle', gain: 0.12, delay: i * 0.09 })),
  turn: () => { tone(880, 0.18, { gain: 0.08 }); tone(1320, 0.25, { gain: 0.06, delay: 0.08 }); },
  good: () => { tone(660, 0.12, { type: 'triangle', gain: 0.12 }); tone(990, 0.2, { type: 'triangle', gain: 0.12, delay: 0.08 }); },
  bad: () => { tone(300, 0.25, { type: 'square', gain: 0.05, slide: 0.6 }); },
  level: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.1, delay: i * 0.08 })),
  click: () => tone(1400, 0.04, { type: 'triangle', gain: 0.05 })
};

export function setSoundEnabled(v) { enabled = v; }
export function sfx(name) {
  if (!enabled || !name || !SOUNDS[name]) return;
  try { SOUNDS[name](); } catch { /* audio indisponible */ }
}
window.__sfx = sfx;
