import { useEffect, useState } from 'preact/hooks';
import { Btn, Icon } from '../components/ui.jsx';
import { Penguin } from '../components/Penguin.jsx';
import { useStore, refreshNotifs, markNotifsRead } from '../store.js';
import { back } from '../router.js';
import { pushStatus, enablePush, disablePush } from '../push.js';
import { sfx } from '../sfx.js';

const KIND = { streak: ['flame', 'var(--orange)'], rank: ['trophy', 'var(--purple)'], welcome: ['sparkle', 'var(--primary)'], comeback: ['user', 'var(--ok)'], level: ['star', 'var(--gold-d)'] };

export function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'hier' : `il y a ${d} jours`;
}

export function PushCard({ compact, onDismiss }) {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { pushStatus().then(setSt); }, []);
  if (!st || (compact && st !== 'off')) return null;
  const on = async () => {
    setBusy(true); setErr('');
    try { setSt(await enablePush()); sfx.ok(); } catch { setErr("Impossible d'activer pour l'instant. Réessaie plus tard."); }
    setBusy(false);
  };
  const off = async () => { setBusy(true); setSt(await disablePush()); setBusy(false); };
  return (
    <div class={'push-card' + (st === 'on' ? ' on' : '') + (onDismiss ? ' dismissable' : '')}>
      <span class="push-ic"><Icon name="bell" size={24} /></span>
      <div class="push-txt">
        {st === 'off' && <><b>Active les notifications</b><small>Pingo te prévient avant que ta série s'arrête et quand un pote te dépasse. Une par jour maximum.</small></>}
        {st === 'on' && <><b>Notifications activées</b><small>Maximum une notification toutes les 3 heures, jamais la nuit.</small></>}
        {st === 'ios-install' && <><b>Installe d'abord l'app</b><small>Sur iPhone, les notifications marchent seulement quand Pingo est sur l'écran d'accueil : Partager puis « Sur l'écran d'accueil ».</small></>}
        {st === 'denied' && <><b>Notifications bloquées</b><small>Autorise-les dans les réglages du téléphone (Notifications, puis Pingo ou ton navigateur).</small></>}
        {st === 'unsupported' && <><b>Pas disponible ici</b><small>Ce navigateur ne gère pas les notifications. Essaie Chrome sur Android ou l'app installée sur iPhone.</small></>}
        {err && <small class="push-err">{err}</small>}
      </div>
      {st === 'off' && <Btn kind="primary" class="sm" disabled={busy} onClick={on}>Activer</Btn>}
      {st === 'on' && !compact && <Btn kind="ghost" class="sm" disabled={busy} onClick={off}>Couper</Btn>}
      {onDismiss && <button type="button" class="icon-btn sm push-x" aria-label="Masquer" onClick={onDismiss}><Icon name="x" size={16} /></button>}
    </div>
  );
}

export function Notifs() {
  const s = useStore();
  const { items } = s.notifs;
  useEffect(() => { refreshNotifs().then(() => setTimeout(markNotifsRead, 1200)); }, []);
  return (
    <div class="screen">
      <header class="page-head"><button type="button" class="icon-btn" onClick={() => back('')} aria-label="Retour"><Icon name="back" /></button><h1>Notifications</h1><span class="icon-btn ghost" /></header>
      <PushCard />
      {items.length === 0 ? (
        <div class="empty"><Penguin mood="think" size={96} /><p>Rien pour l'instant. Termine des leçons et défie tes potes !</p></div>
      ) : (
        <ul class="notif-list">
          {items.map((n, i) => {
            const [ic, col] = KIND[n.kind] || ['bell', 'var(--primary)'];
            return (
              <li class={n.read ? '' : 'unread'} style={{ animationDelay: Math.min(i, 8) * 0.04 + 's' }}>
                <span class="notif-ic" style={{ background: col }}><Icon name={ic} size={20} /></span>
                <div><b>{n.title}</b><p>{n.body}</p><small>{ago(n.at)}</small></div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
