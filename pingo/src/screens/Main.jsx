import { useEffect, useState } from 'preact/hooks';
import { Btn, Icon, Bar, Sheet, Stars, starsFor, isStandalone, isIOS, confetti } from '../components/ui.jsx';
import { Penguin, Coach } from '../components/Penguin.jsx';
import { Avatar, AvatarBuilder, DEFAULT_AVATAR } from '../components/Avatar.jsx';
import { subjects, examsOf, getExam, getSubject, allLessons, lessonStates, examProgress } from '../content/catalog.js';
import { useStore, setState, logout, refresh, markSeen } from '../store.js';
import { api } from '../api.js';
import { go, back } from '../router.js';
import { sfx } from '../sfx.js';
import { PushCard } from './Notifs.jsx';

export const levelInfo = (xp = 0) => ({ level: 1 + Math.floor(xp / 150), into: xp % 150, need: 150 });

function TopStats({ p }) {
  return (
    <div class="top-stats">
      <span class="stat-chip flame" title="Série de jours"><Icon name="flame" size={18} />{p.streak || 0}</span>
      <span class="stat-chip bolt" title="XP"><Icon name="bolt" size={18} />{p.xp || 0}</span>
    </div>
  );
}

/* ---------- installer l'app ---------- */
let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });

export function InstallCard({ compact }) {
  const [open, setOpen] = useState(false);
  const s = useStore();
  if (isStandalone() || (compact && s.seen['install-dismissed'])) return null;
  const install = async () => {
    if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch { /* */ } deferred = null; }
    else setOpen(true);
  };
  return (
    <div class="install-card">
      <span class="install-ic"><Icon name="download" /></span>
      <div><b>Installe Pingo</b><small>Une vraie app sur ton écran d'accueil.</small></div>
      <Btn kind="primary" class="sm" onClick={install}>Installer</Btn>
      {compact && <button type="button" class="icon-btn sm" aria-label="Masquer" onClick={() => markSeen('install-dismissed')}><Icon name="x" size={16} /></button>}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <Penguin mood="wave" size={80} />
        <h2>Ajouter à l'écran d'accueil</h2>
        {isIOS() ? (
          <ol class="install-steps">
            <li>Ouvre ce site dans <b>Safari</b>.</li>
            <li>Touche le bouton <b>Partager</b> <Icon name="share" size={18} /> en bas de l'écran.</li>
            <li>Choisis <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b>.</li>
          </ol>
        ) : (
          <ol class="install-steps">
            <li>Ouvre ce site dans <b>Chrome</b>.</li>
            <li>Touche le menu <b>⋮</b> en haut à droite.</li>
            <li>Choisis <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</li>
          </ol>
        )}
        <Btn kind="primary" class="wide" onClick={() => setOpen(false)}>Compris</Btn>
      </Sheet>
    </div>
  );
}

/* ---------- accueil ---------- */
export function Home() {
  const s = useStore(); const p = s.player || {};
  const last = getExam(s.lastExam || 'svt-dc1');
  const { current } = lessonStates(last, s.results);
  const nextL = current && allLessons(last).find((l) => l.id === current);
  const prog = examProgress(last, s.results);
  const hour = new Date().getHours();
  const hello = hour < 5 ? 'Encore debout' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Salut' : 'Bonsoir';
  return (
    <div class="screen">
      <header class="home-head">
        <button type="button" class="avatar-btn" onClick={() => go('me')} aria-label="Mon profil"><Avatar av={p.avatar} size={46} /></button>
        <div class="hello"><small>{hello},</small><b>{p.name}</b></div>
        <TopStats p={p} />
        <button type="button" class="bell-btn" onClick={() => go('notifs')} aria-label={`Notifications${s.notifs.unread ? ` (${s.notifs.unread} non lues)` : ''}`}>
          <Icon name="bell" size={22} />{s.notifs.unread > 0 && <span class="bell-dot">{s.notifs.unread > 9 ? '9+' : s.notifs.unread}</span>}
        </button>
      </header>

      <section class="resume" style={{ '--c': getSubject(last.subject).color, '--cd': getSubject(last.subject).dark }}>
        <div class="resume-txt">
          <small>{getSubject(last.subject).name} · {last.short}</small>
          <h2>{nextL ? nextL.title : 'Tout est terminé !'}</h2>
          <Bar value={prog} color="#fff" />
          <small>{prog} % du devoir</small>
        </div>
        <Penguin mood={prog === 100 ? 'happy' : 'idle'} size={84} />
        <Btn kind="white" class="wide" onClick={() => (nextL ? go(`l/${last.id}/${nextL.id}`) : go('e/' + last.id))}>{nextL ? (prog ? 'Continuer' : 'Commencer') : 'Revoir le parcours'}<Icon name="play" size={16} /></Btn>
      </section>

      <InstallCard compact />
      {Object.keys(s.results).length > 0 && !s.seen['push-dismissed'] && (
        <PushCard compact onDismiss={() => markSeen('push-dismissed')} />
      )}

      <h3 class="sec-title">Choisis ta matière</h3>
      <div class="subjects">
        {subjects.map((sub, i) => {
          const n = examsOf(sub.id).filter((e) => !e.soon).length;
          return (
            <button type="button" class={'subject' + (n ? '' : ' soon')} style={{ '--c': sub.color, '--cd': sub.dark, animationDelay: i * 0.04 + 's' }}
              onClick={() => { sfx.tap(); go('s/' + sub.id); }}>
              <span class="subject-ic"><Icon name={sub.icon} size={30} /></span>
              <b>{sub.name}</b>
              <small>{n ? `${n} devoir prêt` : 'Bientôt'}</small>
            </button>
          );
        })}
      </div>

      <button type="button" class="lab-banner" onClick={() => go('3d/virus')}>
        <span class="lab-orb"><Icon name="cube" size={34} stroke={1.8} /></span>
        <span><b>Labo 3D</b><small>Virus, bactérie, levure, paramécie en 3D</small></span>
        <Icon name="play" />
      </button>

      <Coach id="tour-home" text={`Bienvenue ${p.name || ''} ! Choisis une matière, puis ton devoir. Pour l'instant, la SVT est prête. Chaque leçon te rapporte des XP pour le classement !`} />
    </div>
  );
}

/* ---------- devoirs d'une matière ---------- */
export function Exams({ subject }) {
  const s = useStore();
  const sub = getSubject(subject) || subjects[0];
  const list = examsOf(sub.id);
  const [soon, setSoon] = useState(false);
  return (
    <div class="screen">
      <header class="page-head" style={{ '--c': sub.color }}>
        <button type="button" class="icon-btn" onClick={() => back('')} aria-label="Retour"><Icon name="back" /></button>
        <h1>{sub.name}</h1>
        <span class="icon-btn ghost" />
      </header>
      <div class="subject-hero" style={{ '--c': sub.color, '--cd': sub.dark }}>
        <span class="subject-ic big"><Icon name={sub.icon} size={44} /></span>
        <p>{list.length ? 'Choisis le devoir que tu prépares.' : 'Les leçons de cette matière arrivent bientôt.'}</p>
      </div>
      <div class="exam-list">
        {list.map((e) => {
          const ex = getExam(e.id); const pr = ex ? examProgress(ex, s.results) : 0;
          return (
            <button type="button" class={'exam' + (e.soon ? ' soon' : '')} style={{ '--c': sub.color, '--cd': sub.dark }} onClick={() => (e.soon ? setSoon(true) : go('e/' + e.id))}>
              <span class="exam-badge">{e.short}</span>
              <span class="exam-txt"><b>{e.name}</b><small>{e.soon ? 'Bientôt disponible' : e.chapters}</small>{!e.soon && <Bar value={pr} color={sub.color} />}</span>
              {e.soon ? <Icon name="lock" /> : <span class="exam-pct">{pr}%</span>}
            </button>
          );
        })}
        {!list.length && <div class="empty"><Penguin mood="think" size={100} /><p>Pas encore de devoir ici. Reviens bientôt !</p></div>}
      </div>
      <Sheet open={soon} onClose={() => setSoon(false)}>
        <Penguin mood="think" size={80} />
        <h2>Bientôt !</h2>
        <p class="muted">Ce devoir n'a pas encore de leçons. Concentre-toi sur celui qui arrive en premier.</p>
        <Btn class="wide" onClick={() => setSoon(false)}>OK</Btn>
      </Sheet>
    </div>
  );
}

/* ---------- parcours d'un devoir ---------- */
export function Path({ examId }) {
  const s = useStore();
  const exam = getExam(examId);
  const [open, setOpen] = useState(null);
  useEffect(() => { if (exam && s.lastExam !== exam.id) setState({ lastExam: exam.id }); }, [examId]);
  useEffect(() => { const el = document.querySelector('.node.current'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, []);
  if (!exam) return <div class="screen center-col"><Penguin mood="sad" /><p>Devoir introuvable.</p><Btn onClick={() => go('', true)}>Accueil</Btn></div>;
  const sub = getSubject(exam.subject);
  const { states, current } = lessonStates(exam, s.results);
  let n = 0;
  const sel = open && allLessons(exam).find((l) => l.id === open);
  const st = sel && states[sel.id];
  return (
    <div class="screen path-screen">
      <header class="page-head sticky">
        <button type="button" class="icon-btn" onClick={() => back('s/' + exam.subject)} aria-label="Retour"><Icon name="back" /></button>
        <div class="page-title"><small>{sub.name}</small><b>{exam.name}</b></div>
        <TopStats p={s.player || {}} />
      </header>
      {exam.data.units.map((u) => (
        <section class="unit" style={{ '--c': u.color, '--cd': u.dark }}>
          <div class="unit-head">
            <div><small>{u.sub}</small><h2>{u.title}</h2></div>
          </div>
          <div class="nodes">
            {u.lessons.map((l) => {
              const ls = states[l.id]; const i = n++;
              const x = Math.round(Math.sin(i * 1.1) * 72);
              const isCur = l.id === current;
              const stars = ls.res ? starsFor(ls.res.best, ls.res.max) : 0;
              return (
                <div class={'node-wrap' + (isCur ? ' cur' : '')} style={{ transform: `translateX(${x}px)` }}>
                  {isCur && <span class="node-tip">{ls.res ? 'REFAIRE' : 'COMMENCER'}</span>}
                  <button type="button" class={'node' + (l.boss ? ' boss' : '') + (ls.done ? ' done' : '') + (!ls.open ? ' locked' : '') + (isCur ? ' current' : '') + (l.bonus ? ' bonus' : '')}
                    onClick={() => { sfx.tap(); setOpen(l.id); }} aria-label={l.title}>
                    <Icon name={!ls.open ? 'lock' : ls.done && !l.boss ? 'check' : l.icon === 'micro' ? 'micro' : l.icon} size={l.boss ? 38 : 30} stroke={2.6} />
                  </button>
                  {ls.done && <Stars n={stars} size={14} />}
                  <span class="node-label">{l.title}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <div class="path-end"><Penguin mood="happy" size={90} /><p>Termine le grand défi pour être prêt(e) le jour J !</p></div>
      <button type="button" class="fab" onClick={() => go('3d/virus')} aria-label="Labo 3D"><Icon name="cube" size={26} /></button>
      <Sheet open={!!sel} onClose={() => setOpen(null)}>
        {sel && (
          <div class="lesson-sheet" style={{ '--c': sel.unit.color, '--cd': sel.unit.dark }}>
            <span class={'node static' + (sel.boss ? ' boss' : '')}><Icon name={sel.icon} size={30} stroke={2.6} /></span>
            <h2>{sel.title}</h2>
            <p class="muted">{sel.desc}</p>
            {sel.bonus && <p class="note">Pas encore dans tes notes : c'est probablement la suite du cours.</p>}
            {st.res && <p class="best">Meilleur score : <b>{st.res.best}/{st.res.max}</b> <Stars n={starsFor(st.res.best, st.res.max)} size={16} /></p>}
            {st.open ? (
              <Btn kind="primary" class="wide" onClick={() => { setOpen(null); go(`l/${exam.id}/${sel.id}`); }}>{st.done ? 'Refaire' : 'Commencer'} {!st.done && <span class="xp-hint">+XP</span>}</Btn>
            ) : (
              <p class="locked-msg"><Icon name="lock" size={16} />{sel.final ? 'Termine les deux défis pour débloquer le grand défi.' : 'Termine la leçon précédente pour débloquer celle-ci.'}</p>
            )}
          </div>
        )}
      </Sheet>
      <Coach id="tour-path" text="Voici ton parcours ! Les leçons se débloquent une par une. Les trophées sont des défis : plus de questions, plus de XP." />
    </div>
  );
}

/* ---------- classement ---------- */
export function Leaderboard() {
  const s = useStore();
  const [tab, setTab] = useState('exam');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(false);
  const exam = getExam(s.lastExam || 'svt-dc1');
  const load = () => { setErr(false); setRows(null); api.leaderboard(tab === 'exam' ? exam.id : null).then((r) => setRows(Array.isArray(r) ? r : [])).catch(() => setErr(true)); };
  useEffect(load, [tab]);
  useEffect(() => { refresh(); }, []);
  const me = s.player && s.player.id;
  const top = rows ? rows.slice(0, 3) : [];
  const unit = tab === 'exam' ? 'pts' : 'XP';
  return (
    <div class="screen">
      <header class="page-head"><span class="icon-btn ghost" /><h1>Classement</h1><button type="button" class="icon-btn" onClick={load} aria-label="Actualiser"><Icon name="refresh" /></button></header>
      <div class="seg">
        <button type="button" class={tab === 'exam' ? 'on' : ''} onClick={() => setTab('exam')}>{getSubject(exam.subject).name} · {exam.short}</button>
        <button type="button" class={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>Général (XP)</button>
      </div>
      {err && <div class="empty"><Penguin mood="sad" size={90} /><p>Impossible de charger le classement. Vérifie ta connexion.</p><Btn onClick={load}>Réessayer</Btn></div>}
      {!err && !rows && <div class="empty"><Penguin mood="think" size={90} /><p>Chargement…</p></div>}
      {rows && rows.length === 0 && <div class="empty"><Penguin mood="wave" size={90} /><p>Personne n'est encore classé. Termine une leçon pour être le premier !</p></div>}
      {rows && rows.length > 0 && (
        <>
          <div class="podium">
            {[1, 0, 2].map((i) => top[i] && (
              <div class={'pod pod' + (i + 1) + (top[i].id === me ? ' me' : '')}>
                {i === 0 && <Icon name="crown" size={26} class="crown" />}
                <Avatar av={top[i].avatar} size={i === 0 ? 76 : 60} />
                <b>{top[i].name}</b>
                <small>{top[i].score} {unit}</small>
                <div class="pod-block">{i + 1}</div>
              </div>
            ))}
          </div>
          <ol class="ranks">
            {rows.map((r, i) => (
              <li class={r.id === me ? 'me' : ''}>
                <span class="rk">{i + 1}</span>
                <Avatar av={r.avatar} size={40} />
                <span class="rn"><b>{r.name}{r.id === me ? ' (toi)' : ''}</b><small>Niveau {r.level}</small></span>
                <span class="rs">{r.score} <small>{unit}</small></span>
              </li>
            ))}
          </ol>
        </>
      )}
      <Coach id="tour-rank" text="Ici, tu vois les meilleurs de la classe. Partage l'app à tes potes pour vous défier !" />
    </div>
  );
}

/* ---------- profil ---------- */
export function Profile() {
  const s = useStore(); const p = s.player || {};
  const [sure, setSure] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { refresh(); }, []);
  const lv = levelInfo(p.xp);
  const done = Object.values(s.results).reduce((a, e) => a + Object.keys(e).length, 0);
  const share = async () => {
    const url = location.origin;
    const text = 'Viens réviser avec moi sur Pingo !';
    if (navigator.share) { try { await navigator.share({ title: 'Pingo', text, url }); } catch { /* annulé */ } return; }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
  };
  return (
    <div class="screen">
      <header class="page-head"><span class="icon-btn ghost" /><h1>Profil</h1><button type="button" class="icon-btn" onClick={() => { setState({ sound: !s.sound }); }} aria-label={s.sound ? 'Couper le son' : 'Activer le son'}><Icon name={s.sound ? 'sound' : 'mute'} /></button></header>
      <div class="profile-card">
        <button type="button" class="avatar-edit" onClick={() => go('avatar')} aria-label="Modifier mon avatar">
          <Avatar av={p.avatar} size={120} />
          <span class="edit-badge"><Icon name="pen" size={16} /></span>
        </button>
        <h2>{p.name}</h2>
        <span class="level-pill">Niveau {lv.level}</span>
        <div class="lvbar"><Bar value={lv.into / lv.need * 100} color="var(--gold)" /><small>{lv.into}/{lv.need} XP avant le niveau {lv.level + 1}</small></div>
      </div>
      <div class="stats-grid">
        <div class="st flame"><Icon name="flame" size={26} /><b>{p.streak || 0}</b><small>jours de suite</small></div>
        <div class="st bolt"><Icon name="bolt" size={26} /><b>{p.xp || 0}</b><small>XP au total</small></div>
        <div class="st trophy"><Icon name="trophy" size={26} /><b>{s.rank ? '#' + s.rank : '–'}</b><small>au classement</small></div>
        <div class="st check"><Icon name="check" size={26} /><b>{done}</b><small>leçons finies</small></div>
      </div>
      <div class="menu">
        <button type="button" onClick={() => go('avatar')}><Icon name="user" />Modifier mon avatar et mon nom</button>
        <button type="button" onClick={() => go('notifs')}><Icon name="bell" />Notifications{s.notifs.unread > 0 && <span class="menu-badge">{s.notifs.unread}</span>}</button>
        <button type="button" onClick={share}><Icon name="share" />{copied ? 'Lien copié !' : 'Inviter mes potes'}</button>
        <button type="button" onClick={() => setState({ sound: !s.sound })}><Icon name={s.sound ? 'sound' : 'mute'} />Son {s.sound ? 'activé' : 'coupé'}</button>
        <button type="button" onClick={() => setState({ seen: {} })}><Icon name="sparkle" />Revoir les conseils de Pingo</button>
        <button type="button" class="danger" onClick={() => setSure(true)}><Icon name="logout" />Se déconnecter</button>
      </div>
      <InstallCard />
      <Sheet open={sure} onClose={() => setSure(false)}>
        <Penguin mood="sad" size={80} />
        <h2>Se déconnecter ?</h2>
        <p class="muted">Tu pourras revenir avec ton numéro et ton code secret.</p>
        <Btn kind="bad" class="wide" onClick={() => { logout(); go('', true); }}>Se déconnecter</Btn>
        <Btn kind="ghost" class="wide" onClick={() => setSure(false)}>Annuler</Btn>
      </Sheet>
    </div>
  );
}

export function AvatarEdit() {
  const s = useStore(); const p = s.player || {};
  const [av, setAv] = useState({ ...DEFAULT_AVATAR, ...(p.avatar || {}) });
  const [name, setName] = useState(p.name || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.update(s.token, name.trim(), av);
      if (r.error) setErr(r.error === 'bad_name' ? 'Ton prénom doit faire entre 2 et 24 caractères.' : 'Impossible d\'enregistrer.');
      else { setState({ player: r.player }); sfx.ok(); confetti(); back('me'); }
    } catch { setErr('Pas de connexion internet.'); }
    setBusy(false);
  };
  return (
    <div class="screen">
      <header class="page-head"><button type="button" class="icon-btn" onClick={() => back('me')} aria-label="Retour"><Icon name="back" /></button><h1>Mon avatar</h1><span class="icon-btn ghost" /></header>
      <input class="field center" value={name} maxLength={24} onInput={(e) => setName(e.currentTarget.value)} aria-label="Ton prénom" />
      <AvatarBuilder value={av} onChange={setAv} level={levelInfo(p.xp).level} />
      <p class="muted center small">Gagne des niveaux pour débloquer de nouveaux accessoires !</p>
      {err && <p class="err">{err}</p>}
      <div class="auth-foot"><Btn kind="primary" class="wide" disabled={busy} onClick={save}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Btn></div>
    </div>
  );
}

export function BottomNav({ active }) {
  const items = [['', 'home', 'Apprendre'], ['rank', 'trophy', 'Classement'], ['me', 'user', 'Profil']];
  const cur = active === 'rank' ? 'rank' : active === 'me' ? 'me' : '';
  return (
    <nav class="bottom-nav">
      {items.map(([path, ic, label]) => (
        <button type="button" class={cur === path ? 'on' : ''} onClick={() => { sfx.tap(); go(path, true); }} aria-current={cur === path ? 'page' : undefined}>
          <Icon name={ic} size={24} /><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
