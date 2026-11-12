import { useEffect, useRef, useState } from 'preact/hooks';
import { Btn, Icon, Bar, Sheet } from '../components/ui.jsx';
import { Penguin } from '../components/Penguin.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { useStore, ping } from '../store.js';
import { api } from '../api.js';
import { go, back } from '../router.js';
import { sfx } from '../sfx.js';
import { exams, getSubject, getExam, allLessons } from '../content/catalog.js';
import { ago } from './Notifs.jsx';

export function seenText(seen) {
  if (!seen) return 'Hors ligne';
  return 'Vu ' + ago(seen);
}

function OnlineAvatar({ av, size, online }) {
  return <span class="av-wrap"><Avatar av={av} size={size} />{online && <i class="online-dot" style={{ width: Math.max(12, size / 5) + 'px', height: Math.max(12, size / 5) + 'px' }} />}</span>;
}

/* ---------- profil d'un joueur ---------- */
export function PlayerProfile({ id }) {
  const s = useStore();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [sure, setSure] = useState(false);
  const load = () => api.player(s.token, id).then((r) => { if (r.error) setErr(r.error === 'not_found' ? 'Ce joueur n\'existe plus.' : 'Impossible de charger ce profil.'); else setD(r); }).catch(() => setErr('Pas de connexion internet.'));
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [id]);
  const toggleBlock = async () => {
    setSure(false);
    try { await api.block(s.token, id, !d.blocked); sfx.tap(); load(); ping(); } catch { /* */ }
  };

  if (err) return <div class="screen center-col"><Penguin mood="sad" size={90} /><p>{err}</p><Btn onClick={() => back('rank')}>Retour</Btn></div>;
  if (!d) return <div class="screen center-col"><Penguin mood="think" size={90} /><p>Chargement…</p></div>;
  const p = d.player;
  return (
    <div class="screen">
      <header class="page-head"><button type="button" class="icon-btn" onClick={() => back('rank')} aria-label="Retour"><Icon name="back" /></button><h1>{d.me ? 'Mon profil public' : 'Profil'}</h1><span class="icon-btn ghost" /></header>
      <div class="profile-card">
        <OnlineAvatar av={p.avatar} size={120} online={p.online} />
        <h2>{p.name}</h2>
        <span class={'presence' + (p.online ? ' on' : '')}>{p.online ? 'En ligne' : seenText(p.seen)}</span>
        <span class="level-pill">Niveau {p.level}</span>
      </div>
      <div class="stats-grid">
        <div class="st trophy"><Icon name="trophy" size={26} /><b>#{d.rank}</b><small>au classement</small></div>
        <div class="st bolt"><Icon name="bolt" size={26} /><b>{p.xp}</b><small>XP au total</small></div>
        <div class="st flame"><Icon name="flame" size={26} /><b>{p.streak}</b><small>jours de suite</small></div>
        <div class="st check"><Icon name="star" size={26} /><b>{d.stars3}</b><small>leçons à 3 étoiles</small></div>
      </div>
      {d.exams.length > 0 && (
        <div class="menu exam-progress">
          {d.exams.map((e) => {
            const meta = exams.find((x) => x.id === e.exam); const ex = getExam(e.exam);
            if (!meta) return null;
            const total = ex ? allLessons(ex).filter((l) => !l.bonus).length : e.lessons;
            const sub = getSubject(meta.subject);
            return (
              <div class="ep-row">
                <span class="exam-badge sm" style={{ background: sub.color, boxShadow: `0 3px 0 ${sub.dark}` }}>{meta.short}</span>
                <span class="ep-txt"><b>{sub.name} · {meta.name}</b><Bar value={Math.min(100, e.lessons / total * 100)} color={sub.color} /><small>{e.lessons}/{total} leçons</small></span>
              </div>
            );
          })}
        </div>
      )}
      {d.me ? (
        <Btn kind="ghost" class="wide" onClick={() => go('avatar')}><Icon name="pen" size={18} />Modifier mon avatar</Btn>
      ) : (
        <div class="stack">
          {d.blocked ? <p class="note">Tu as bloqué {p.name} : vous ne pouvez plus vous écrire.</p>
            : d.blocked_me ? <p class="note">Tu ne peux pas écrire à {p.name}.</p>
            : <Btn kind="primary" class="wide" onClick={() => go('chat/' + id)}><Icon name="chat" size={20} />Envoyer un message</Btn>}
          <Btn kind="ghost-bad" class="wide" onClick={() => (d.blocked ? toggleBlock() : setSure(true))}>{d.blocked ? 'Débloquer' : 'Bloquer ' + p.name}</Btn>
        </div>
      )}
      <Sheet open={sure} onClose={() => setSure(false)}>
        <Penguin mood="sad" size={80} />
        <h2>Bloquer {p.name} ?</h2>
        <p class="muted">Vous ne pourrez plus vous envoyer de messages et votre conversation disparaîtra de ta liste. {p.name} ne sera pas prévenu(e).</p>
        <Btn kind="bad" class="wide" onClick={toggleBlock}>Bloquer</Btn>
        <Btn kind="ghost" class="wide" onClick={() => setSure(false)}>Annuler</Btn>
      </Sheet>
    </div>
  );
}

/* ---------- liste des conversations ---------- */
export function Inbox() {
  const s = useStore();
  const [list, setList] = useState(null);
  const [err, setErr] = useState(false);
  const load = () => api.conversations(s.token).then((r) => { setErr(false); setList(Array.isArray(r) ? r : []); }).catch(() => setErr(true));
  useEffect(() => { load(); ping(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  return (
    <div class="screen">
      <header class="page-head"><span class="icon-btn ghost" /><h1>Messages</h1><button type="button" class="icon-btn" onClick={() => go('rank')} aria-label="Écrire à quelqu'un"><Icon name="pen" /></button></header>
      {err && !list && <div class="empty"><Penguin mood="sad" size={90} /><p>Impossible de charger tes messages. Vérifie ta connexion.</p></div>}
      {!err && !list && <div class="empty"><Penguin mood="think" size={90} /><p>Chargement…</p></div>}
      {list && list.length === 0 && (
        <div class="empty"><Penguin mood="wave" size={100} /><p>Pas encore de messages. Va dans le classement, touche un joueur et envoie-lui un message !</p><Btn onClick={() => go('rank')}>Voir le classement</Btn></div>
      )}
      {list && list.length > 0 && (
        <ul class="convs">
          {list.map((c) => (
            <li>
              <button type="button" class={'conv' + (c.unread ? ' unread' : '')} onClick={() => go('chat/' + c.id)}>
                <OnlineAvatar av={c.avatar} size={52} online={c.online} />
                <span class="conv-txt">
                  <span class="conv-top"><b>{c.name}</b><small>{ago(c.at)}</small></span>
                  <span class="conv-last">{c.mine ? 'Toi : ' : ''}{c.last}</span>
                </span>
                {c.unread > 0 && <i class="conv-badge">{c.unread}</i>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- conversation ---------- */
const QUICK = ['Salut ! 👋', 'Tu révises quoi ?', 'On fait le défi ensemble ?', 'Bien joué ! 🔥', 'Tu as compris cet exo ?'];
const ERR = { blocked: 'Tu ne peux plus écrire à cette personne.', slow_down: 'Doucement ! Attends un peu avant d\'envoyer d\'autres messages.', bad_body: 'Message vide ou trop long (500 caractères max).' };

function dayLabel(iso) {
  const d = new Date(iso), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === y.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function Chat({ id }) {
  const s = useStore();
  const [other, setOther] = useState(null);
  const [items, setItems] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef(null), stick = useRef(true);

  const scrollDown = () => { const el = list.current; if (el && stick.current) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; }); };
  const load = async () => {
    try {
      const r = await api.messages(s.token, id);
      if (r.items) setItems((old) => {
        // garde les messages en cours d'envoi qui ne sont pas encore revenus du serveur
        const pending = (old || []).filter((m) => m.pending && !r.items.some((x) => x.mine && x.body === m.body && Date.parse(x.at) >= m.t - 10000));
        return [...r.items, ...pending];
      });
    } catch { /* hors ligne */ }
  };
  useEffect(() => {
    api.player(s.token, id).then((r) => r.player && setOther(r)).catch(() => {});
    load().then(() => ping());
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 4000);
    const p = setInterval(() => api.player(s.token, id).then((r) => r.player && setOther(r)).catch(() => {}), 30000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [id]);
  useEffect(scrollDown, [items && items.length]);

  const send = async (body) => {
    const b = (body ?? text).trim();
    if (!b || busy) return;
    setErr(''); setBusy(true);
    const temp = { id: 'tmp' + Date.now(), mine: true, body: b, at: new Date().toISOString(), pending: true, t: Date.now() };
    stick.current = true;
    setItems((x) => [...(x || []), temp]); setText('');
    try {
      const r = await api.send(s.token, id, b);
      if (r.item) { sfx.tap(); setItems((x) => x.map((m) => (m === temp || m.id === temp.id ? r.item : m))); }
      else { setErr(ERR[r.error] || 'Message non envoyé.'); setItems((x) => x.filter((m) => m.id !== temp.id)); if (!body) setText(b); }
    } catch { setErr('Pas de connexion : message non envoyé.'); setItems((x) => x.filter((m) => m.id !== temp.id)); if (!body) setText(b); }
    setBusy(false);
  };

  const o = other && other.player;
  const blocked = other && (other.blocked || other.blocked_me);
  let lastDay = '';
  return (
    <div class="chat">
      <header class="chat-head">
        <button type="button" class="icon-btn" onClick={() => back('inbox')} aria-label="Retour"><Icon name="back" /></button>
        {o ? (
          <button type="button" class="chat-who" onClick={() => go('u/' + id)}>
            <OnlineAvatar av={o.avatar} size={40} online={o.online} />
            <span><b>{o.name}</b><small class={o.online ? 'on-txt' : ''}>{o.online ? 'En ligne' : seenText(o.seen)}</small></span>
          </button>
        ) : <span class="chat-who" />}
      </header>
      <div class="chat-list" ref={list} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        {!items && <div class="empty"><Penguin mood="think" size={80} /><p>Chargement…</p></div>}
        {items && items.length === 0 && (
          <div class="empty"><Penguin mood="wave" size={90} /><p>Dis bonjour à {o ? o.name : 'ton pote'} !</p></div>
        )}
        {items && items.map((m, i) => {
          const day = dayLabel(m.at); const showDay = day !== lastDay; lastDay = day;
          const next = items[i + 1]; const tail = !next || next.mine !== m.mine;
          return (
            <>
              {showDay && <p class="chat-day">{day}</p>}
              <div class={'bubble-msg' + (m.mine ? ' mine' : '') + (tail ? ' tail' : '') + (m.pending ? ' pending' : '')}>
                <span>{m.body}</span>
                <small>{new Date(m.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{m.mine && (m.pending ? ' · …' : m.read ? ' · Vu' : '')}</small>
              </div>
            </>
          );
        })}
      </div>
      <footer class="chat-foot">
        {err && <p class="err small">{err}</p>}
        {blocked ? <p class="note center">{other.blocked ? 'Tu as bloqué cette personne.' : 'Tu ne peux pas écrire à cette personne.'}</p> : (
          <>
            {items && items.length < 3 && <div class="quick scroll-x">{QUICK.map((q) => <button type="button" onClick={() => send(q)}>{q}</button>)}</div>}
            <form class="chat-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input class="field" value={text} maxLength={500} placeholder="Écris un message…" onInput={(e) => setText(e.currentTarget.value)} aria-label="Message" enterKeyHint="send" />
              <button type="submit" class="send-btn" disabled={!text.trim() || busy} aria-label="Envoyer"><Icon name="play" size={22} /></button>
            </form>
            <p class="chat-rule">Reste respectueux. Tu peux bloquer quelqu'un depuis son profil.</p>
          </>
        )}
      </footer>
    </div>
  );
}
