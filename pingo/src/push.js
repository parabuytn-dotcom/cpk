import { api } from './api.js';
import { getState, setState } from './store.js';
import { isIOS, isStandalone } from './components/ui.jsx';

const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };

/* unsupported | ios-install | denied | on | off */
export async function pushStatus() {
  if (isIOS() && !isStandalone()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub && getState().notifs.push !== false ? 'on' : 'off';
  } catch { return 'off'; }
}

export async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const key = await api.pushKey();
  if (!key || typeof key !== 'string') throw new Error('no_key');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
  const j = sub.toJSON();
  const r = await api.pushSub(getState().token, j.endpoint, j.keys.p256dh, j.keys.auth);
  if (r && r.error) throw new Error(r.error);
  setState((s) => ({ notifs: { ...s.notifs, push: true } }));
  return 'on';
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) { await api.pushUnsub(getState().token, sub.endpoint); await sub.unsubscribe(); }
  } catch { /* */ }
  setState((s) => ({ notifs: { ...s.notifs, push: false } }));
  return 'off';
}
