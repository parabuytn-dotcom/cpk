import * as THREE from 'three';
import { SUIT_SYMBOL, SUITS, RANK_LABEL } from '../poker/cards.js';

const cache = new Map();
const CW = 256, CH = 356;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function tex(c, renderer) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  return t;
}

export function cardFaceTexture(card, renderer) {
  const key = 'f' + card.id;
  if (cache.has(key)) return cache.get(key);
  const [c, ctx] = canvas(CW, CH);
  const red = card.s === 1 || card.s === 2;
  const color = red ? '#d3263a' : '#16181d';
  const sym = SUIT_SYMBOL[SUITS[card.s]];
  const label = RANK_LABEL(card.r);
  roundRect(ctx, 2, 2, CW - 4, CH - 4, 22);
  ctx.fillStyle = '#fbfaf6';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#d9d4c7';
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const corner = (rot) => {
    ctx.save();
    if (rot) { ctx.translate(CW, CH); ctx.rotate(Math.PI); }
    ctx.font = `800 ${label.length > 1 ? 58 : 66}px Outfit, Arial, sans-serif`;
    ctx.fillText(label, 44, 50);
    ctx.font = '700 46px Arial, sans-serif';
    ctx.fillText(sym, 44, 102);
    ctx.restore();
  };
  corner(false);
  corner(true);
  if (card.r >= 11 && card.r <= 13) {
    // figure stylisée (pas d'illustration copiée) : cadre coloré + lettre
    roundRect(ctx, 76, 64, CW - 152, CH - 128, 14);
    const g = ctx.createLinearGradient(0, 64, 0, CH - 64);
    g.addColorStop(0, red ? '#ffe4e4' : '#e6ebf5');
    g.addColorStop(1, red ? '#ffc9c9' : '#cbd5e6');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#c9a23a';
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '900 120px "Bebas Neue", Outfit, Arial, sans-serif';
    ctx.fillText(label, CW / 2, CH / 2 - 18);
    ctx.font = '700 54px Arial, sans-serif';
    ctx.fillText(sym, CW / 2, CH / 2 + 68);
    // couronne
    if (card.r !== 11) {
      ctx.fillStyle = '#c9a23a';
      ctx.beginPath();
      const cx = CW / 2, cy = 96;
      ctx.moveTo(cx - 34, cy + 14); ctx.lineTo(cx - 34, cy - 8); ctx.lineTo(cx - 17, cy + 4); ctx.lineTo(cx, cy - 14);
      ctx.lineTo(cx + 17, cy + 4); ctx.lineTo(cx + 34, cy - 8); ctx.lineTo(cx + 34, cy + 14); ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.font = `700 ${card.r === 14 ? 170 : 130}px Arial, sans-serif`;
    ctx.fillText(sym, CW / 2, CH / 2 + 8);
  }
  const t = tex(c, renderer);
  cache.set(key, t);
  return t;
}

export function cardBackTexture(renderer) {
  if (cache.has('back')) return cache.get('back');
  const [c, ctx] = canvas(CW, CH);
  roundRect(ctx, 2, 2, CW - 4, CH - 4, 22);
  ctx.fillStyle = '#fbfaf6';
  ctx.fill();
  roundRect(ctx, 14, 14, CW - 28, CH - 28, 14);
  const g = ctx.createLinearGradient(0, 0, CW, CH);
  g.addColorStop(0, '#b3202c');
  g.addColorStop(1, '#6e0f1a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,215,140,0.28)';
  ctx.lineWidth = 3;
  for (let i = -CH; i < CW + CH; i += 22) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + CH, CH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, CH); ctx.lineTo(i + CH, 0); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#f5c451';
  ctx.lineWidth = 5;
  roundRect(ctx, 24, 24, CW - 48, CH - 48, 10);
  ctx.stroke();
  ctx.fillStyle = '#6e0f1a';
  ctx.beginPath(); ctx.arc(CW / 2, CH / 2, 52, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f5c451'; ctx.stroke();
  ctx.fillStyle = '#f5c451';
  ctx.font = '400 54px "Bebas Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AIA', CW / 2, CH / 2 + 3);
  const t = tex(c, renderer);
  cache.set('back', t);
  return t;
}

export const CHIP_DENOMS = [
  { v: 1000, color: '#e2b53e', stripe: '#3b2a06' },
  { v: 500, color: '#7d3fd1', stripe: '#f2e9ff' },
  { v: 100, color: '#1b1d22', stripe: '#f4f4f4' },
  { v: 25, color: '#1f9d55', stripe: '#f4f4f4' },
  { v: 5, color: '#d0343f', stripe: '#f4f4f4' }
];

export function chipTopTexture(d, renderer) {
  const key = 'chip' + d.v;
  if (cache.has(key)) return cache.get(key);
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = d.color;
  ctx.beginPath(); ctx.arc(64, 64, 64, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = d.stripe;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.fillRect(-8, -64, 16, 20);
    ctx.restore();
  }
  ctx.strokeStyle = d.stripe;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.arc(64, 64, 36, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = d.stripe;
  ctx.font = '800 26px Outfit, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(d.v >= 1000 ? d.v / 1000 + 'K' : String(d.v), 64, 66);
  const t = tex(c, renderer);
  cache.set(key, t);
  return t;
}

export function chipSideTexture(d, renderer) {
  const key = 'chipside' + d.v;
  if (cache.has(key)) return cache.get(key);
  const [c, ctx] = canvas(128, 8);
  ctx.fillStyle = d.color;
  ctx.fillRect(0, 0, 128, 8);
  ctx.fillStyle = d.stripe;
  for (let i = 0; i < 8; i++) ctx.fillRect(i * 16 + 4, 0, 6, 8);
  const t = tex(c, renderer);
  cache.set(key, t);
  return t;
}

export function dealerButtonTexture(renderer) {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#fbfaf6';
  ctx.beginPath(); ctx.arc(64, 64, 64, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9a23a'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(64, 64, 54, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#16181d';
  ctx.font = '400 70px "Bebas Neue", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('DEALER', 64, 68, 100);
  return tex(c, renderer);
}

/** Tapis : texture dessinée en coordonnées monde (x ∈ [-W/2, W/2], z ∈ [-H/2, H/2]) */
export function feltTexture(renderer, W, H, drawShape) {
  const S = 512; // px par unité... ajusté ci-dessous
  const cw = 2048, ch = Math.round((2048 * H) / W);
  const [c, ctx] = canvas(cw, ch);
  const g = ctx.createRadialGradient(cw / 2, ch / 2, 40, cw / 2, ch / 2, cw * 0.62);
  g.addColorStop(0, '#2a8f5c');
  g.addColorStop(0.6, '#1c6f45');
  g.addColorStop(1, '#0f4a2d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  // grain du feutre
  const img = ctx.getImageData(0, 0, cw, ch);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const sx = cw / W;
  const toPx = (x, z) => [(x + W / 2) * sx, (z + H / 2) * sx];
  ctx.save();
  drawShape(ctx, toPx, sx);
  ctx.restore();
  void S;
  return tex(c, renderer);
}

export function floorTexture(renderer) {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#2a0f14';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(214,160,70,0.16)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = i * 128 + 64, y = j * 128 + 64;
      ctx.beginPath();
      ctx.moveTo(x, y - 40); ctx.lineTo(x + 40, y); ctx.lineTo(x, y + 40); ctx.lineTo(x - 40, y); ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const t = tex(c, renderer);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 12);
  return t;
}

export function glowTexture() {
  if (cache.has('glow')) return cache.get('glow');
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  cache.set('glow', t);
  return t;
}
