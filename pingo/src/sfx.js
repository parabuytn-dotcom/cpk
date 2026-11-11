import { getState } from './store.js';
let ctx;
function tone(freq, start, dur, type = 'sine', vol = 0.12) {
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function play(fn, vib) {
  if (vib && navigator.vibrate) { try { navigator.vibrate(vib); } catch { /* */ } }
  if (!getState().sound) return;
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); fn(); } catch { /* audio indisponible */ }
}
export const sfx = {
  tap: () => play(() => tone(660, 0, 0.06, 'triangle', 0.05)),
  ok: () => play(() => { tone(784, 0, 0.12, 'triangle'); tone(1175, 0.09, 0.2, 'triangle'); }, 15),
  bad: () => play(() => { tone(220, 0, 0.18, 'sawtooth', 0.06); tone(165, 0.1, 0.25, 'sawtooth', 0.05); }, [30, 40, 30]),
  done: () => play(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.1)), [20, 30, 20]),
  combo: () => play(() => [880, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.15, 'square', 0.04)))
};
