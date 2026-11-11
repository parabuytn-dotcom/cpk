import { useEffect, useState } from 'preact/hooks';

let depth = 0;
export function parse() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
export function go(path, replace) {
  const h = '#/' + String(path).replace(/^\//, '');
  if (replace) { history.replaceState(null, '', h); dispatchEvent(new HashChangeEvent('hashchange')); }
  else { depth++; location.hash = h; }
}
export function back(fallback = '') {
  if (depth > 0) { depth--; history.back(); } else go(fallback, true);
}
export function useRoute() {
  const [r, setR] = useState(parse());
  useEffect(() => { const f = () => setR(parse()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
}
