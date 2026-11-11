import { useEffect, useState } from 'preact/hooks';

const P = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="5"/>',
  flame: '<path fill="currentColor" stroke="none" d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-4-1-6 1-9.5z"/>',
  bolt: '<path fill="currentColor" stroke="none" d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  star: '<path fill="currentColor" stroke="none" d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  play: '<path fill="currentColor" stroke="none" d="M8 5v14l11-7z"/>',
  cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/>',
  sound: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19l7-7"/>',
  pi: '<path d="M4 7h16M9 7v12M15 7v9a3 3 0 0 0 3 3"/>',
  atom: '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v8h14v-8"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  crown: '<path d="M4 8l4 4 4-7 4 7 4-4-2 10H6z"/><path d="M5 21h14"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/>',
  cut: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 20M8.5 15.5L20 4"/>',
  spin: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  micro: '<path d="M6 21h12M9 17h6M10 3h4l-1 9h-2zM12 12a5 5 0 0 0 5 5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  sparkle: '<path fill="currentColor" stroke="none" d="M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z"/>'
};

export function Icon({ name, size = 22, class: cls = '', stroke = 2.2 }) {
  return (
    <svg class={'ic ' + cls} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: P[name] || '' }} />
  );
}

export function Btn({ kind = 'primary', class: cls = '', children, ...rest }) {
  return <button type="button" class={`btn ${kind} ${cls}`} {...rest}>{children}</button>;
}

export function Bar({ value, color }) {
  return <div class="bar"><i style={{ width: Math.max(0, Math.min(100, value)) + '%', background: color }} /></div>;
}

export function Sheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div class="sheet-back" onClick={onClose}>
      <div class="sheet" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Stars({ n, size = 22 }) {
  return <span class="stars">{[0, 1, 2].map((i) => <Icon name="star" size={size} class={i < n ? 'on' : ''} />)}</span>;
}

export function starsFor(best, max) {
  if (!max) return 0;
  const r = best / max;
  return r >= 0.9 ? 3 : r >= 0.7 ? 2 : 1;
}

export function useTyped(text, speed = 16) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(text.length); return; }
    let i = 0;
    const id = setInterval(() => { i += 1; setN(i); if (i >= text.length) clearInterval(id); }, speed);
    return () => clearInterval(id);
  }, [text]);
  return text ? text.slice(0, n) : '';
}

export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  const cols = ['#2F6BFF', '#FF8A1F', '#1FBF75', '#FFC531', '#FF4D5E', '#8B5CF6'];
  const ps = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 4,
    a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0]
  }));
  let t = 0;
  (function f() {
    t++;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
    }
    if (t < 160) requestAnimationFrame(f); else c.remove();
  })();
}

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
