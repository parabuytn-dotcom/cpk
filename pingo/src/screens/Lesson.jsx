import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Btn, Bar, Icon, Sheet, Stars, starsFor, confetti } from '../components/ui.jsx';
import { Pingo, Penguin } from '../components/Penguin.jsx';
import { widgets } from '../widgets/index.js';
import { getExam, findLesson, lessonSteps, lessonStates } from '../content/catalog.js';
import { recordResult, useStore, markSeen } from '../store.js';
import { go, back } from '../router.js';
import { sfx } from '../sfx.js';
import { Viewer3D } from './Viewer3D.jsx';
import { MODELS } from '../three/meta.js';

const SCORED = ['qcm', 'tf', 'order', 'pairs', 'sort', 'labels'];
const AUTO = ['pairs', 'sort', 'labels'];
const PRAISE = ['Bravo !', 'Parfait !', 'Excellent !', 'Trop fort !', 'Exact !', 'Bien joué !'];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function WidgetHost({ name, opts }) {
  const ref = useRef(null);
  useEffect(() => { const w = widgets[name]; if (!w || !ref.current) return; const stop = w(ref.current, opts || {}); return () => { stop && stop(); }; }, [name]);
  return <div class="widget" ref={ref} />;
}

function Learn({ step, openModel }) {
  return (
    <div class="step learn">
      <h2 class="step-title">{step.title}</h2>
      {step.html && <div class="prose" dangerouslySetInnerHTML={{ __html: step.html }} />}
      {step.w && <WidgetHost name={step.w} />}
      {step.t === 'model' && (
        <button type="button" class="model-card" onClick={() => openModel(step.model)}>
          <span class="model-orb"><Icon name="cube" size={44} stroke={1.8} /></span>
          <span><b>Ouvrir le labo 3D</b><small>{MODELS.find((m) => m.id === step.model).full} · plein écran</small></span>
          <Icon name="play" />
        </button>
      )}
      {step.pingo && <Pingo say={step.pingo} mood="wave" size={64} />}
    </div>
  );
}

function Qcm({ step, value, setValue, fb }) {
  const opts = useMemo(() => shuffle(step.a), [step]);
  return (
    <div class="step">
      <span class="step-kind">Choisis la bonne réponse</span>
      <h2 class="step-title">{step.q}</h2>
      <div class="opts">
        {opts.map((o, i) => {
          let cls = value === o ? ' sel' : '';
          if (fb) cls = o === step.a[0] ? ' good' : (value === o ? ' badc' : ' dim');
          return <button type="button" class={'opt-btn' + cls} disabled={!!fb} onClick={() => { sfx.tap(); setValue(o); }}><span class="opt-key">{String.fromCharCode(65 + i)}</span>{o}</button>;
        })}
      </div>
    </div>
  );
}

function Tf({ step, value, setValue, fb }) {
  return (
    <div class="step">
      <span class="step-kind">Vrai ou faux ?</span>
      <div class="tf-card"><p>{step.q}</p></div>
      <div class="tf-row">
        {[true, false].map((v) => {
          let cls = value === v ? ' sel' : '';
          if (fb) cls = v === step.ok ? ' good' : (value === v ? ' badc' : ' dim');
          return <button type="button" class={'tf-btn ' + (v ? 'yes' : 'no') + cls} disabled={!!fb} onClick={() => { sfx.tap(); setValue(v); }}><Icon name={v ? 'check' : 'x'} size={28} stroke={3} />{v ? 'Vrai' : 'Faux'}</button>;
        })}
      </div>
    </div>
  );
}

function Order({ step, value, setValue, fb }) {
  const pool = useMemo(() => shuffle(step.items), [step]);
  const chosen = value || [];
  return (
    <div class="step">
      <span class="step-kind">Remets dans l'ordre</span>
      <h2 class="step-title">{step.q}</h2>
      <div class="order-slots">
        {step.items.map((_, i) => {
          const it = chosen[i];
          const cls = fb ? (it === step.items[i] ? ' good' : ' badc') : '';
          return <button type="button" class={'slot' + (it ? ' full' : '') + cls} disabled={!it || !!fb} onClick={() => { sfx.tap(); setValue(chosen.filter((x) => x !== it)); }}><span class="slot-n">{i + 1}</span>{it || ''}</button>;
        })}
      </div>
      {!fb && <div class="pool">{pool.filter((x) => !chosen.includes(x)).map((x) => <button type="button" class="chip-btn" onClick={() => { sfx.tap(); setValue([...chosen, x]); }}>{x}</button>)}</div>}
      {fb && !fb.ok && <ol class="correct-list">{step.items.map((x) => <li>{x}</li>)}</ol>}
    </div>
  );
}

function Pairs({ step, onComplete, fb }) {
  const L = useMemo(() => shuffle(step.pairs.map((p, i) => [p[0], i])), [step]);
  const R = useMemo(() => shuffle(step.pairs.map((p, i) => [p[1], i])), [step]);
  const [sel, setSel] = useState(null), [done, setDone] = useState([]), [shake, setShake] = useState(null), [miss, setMiss] = useState(0);
  const tapR = (i) => {
    if (sel === null) { setShake('r' + i); setTimeout(() => setShake(null), 400); return; }
    if (sel === i) { sfx.ok(); const d = [...done, i]; setDone(d); setSel(null); if (d.length === step.pairs.length) onComplete(miss === 0); }
    else { sfx.bad(); setMiss(miss + 1); setShake('r' + i); setTimeout(() => setShake(null), 400); }
  };
  return (
    <div class="step">
      <span class="step-kind">Associe les paires</span>
      <h2 class="step-title">{step.q}</h2>
      <div class="pairs">
        <div class="col">{L.map(([t, i]) => <button type="button" class={'pair' + (done.includes(i) ? ' done' : '') + (sel === i ? ' sel' : '')} disabled={done.includes(i) || !!fb} onClick={() => { sfx.tap(); setSel(i); }}>{t}</button>)}</div>
        <div class="col">{R.map(([t, i]) => <button type="button" class={'pair' + (done.includes(i) ? ' done' : '') + (shake === 'r' + i ? ' shake' : '')} disabled={done.includes(i) || !!fb} onClick={() => tapR(i)}>{t}</button>)}</div>
      </div>
      {miss > 0 && !fb && <p class="muted center">Erreurs : {miss}</p>}
    </div>
  );
}

function Sort({ step, onComplete, fb }) {
  const items = useMemo(() => shuffle(step.items), [step]);
  const [sel, setSel] = useState(null), [placed, setPlaced] = useState({}), [shake, setShake] = useState(null), [miss, setMiss] = useState(0);
  const drop = (g) => {
    if (!sel) { setShake(g); setTimeout(() => setShake(null), 400); return; }
    if (sel[1] === g) { sfx.ok(); const p = { ...placed, [sel[0]]: g }; setPlaced(p); setSel(null); if (Object.keys(p).length === items.length) onComplete(miss <= 1); }
    else { sfx.bad(); setMiss(miss + 1); setShake(g); setTimeout(() => setShake(null), 400); }
  };
  return (
    <div class="step">
      <span class="step-kind">Trie</span>
      <h2 class="step-title">{step.q}</h2>
      <div class="pool">{items.filter(([n]) => !placed[n]).map((it) => <button type="button" class={'chip-btn' + (sel && sel[0] === it[0] ? ' sel' : '')} disabled={!!fb} onClick={() => { sfx.tap(); setSel(it); }}>{it[0]}</button>)}</div>
      <div class="bins">
        {Object.entries(step.groups).map(([k, n]) => (
          <button type="button" class={'bin' + (shake === k ? ' shake' : '')} onClick={() => drop(k)} disabled={!!fb}>
            <b>{n}</b>
            <span class="got">{items.filter(([x]) => placed[x] === k).map(([x]) => <i>{x}</i>)}</span>
          </button>
        ))}
      </div>
      {miss > 0 && !fb && <p class="muted center">Erreurs : {miss}</p>}
    </div>
  );
}

function Labels({ step, onComplete }) {
  return (
    <div class="step">
      <span class="step-kind">Légende le schéma</span>
      <h2 class="step-title">{step.q}</h2>
      <p class="muted">Touche un mot, puis le <b>?</b> qui correspond.</p>
      <WidgetHost name={step.w} opts={{ quiz: true, onDone: (m) => onComplete(m <= 1), onHit: (ok) => (ok ? sfx.ok() : sfx.bad()) }} />
    </div>
  );
}

function Results({ res, lesson, onAgain, onExit }) {
  const n = starsFor(res.score, res.max);
  const title = n === 3 ? 'Parfait !' : n === 2 ? 'Très bien !' : 'Leçon terminée !';
  return (
    <div class="results">
      <Penguin mood="happy" size={130} class="jump" />
      <h1>{title}</h1>
      <div class="big-stars"><Stars n={n} size={46} /></div>
      <div class="res-grid">
        <div class="res-card gold"><small>XP gagnés</small><b>{res.gain === undefined ? '…' : '+' + res.gain}</b></div>
        <div class="res-card ok"><small>Score</small><b>{res.score}/{res.max}</b></div>
        <div class="res-card blue"><small>Précision</small><b>{Math.round(res.score / res.max * 100)} %</b></div>
      </div>
      {res.synced === false && <p class="muted center">Pas de connexion : tes XP seront envoyés automatiquement plus tard.</p>}
      {lesson.boss && n < 3 && <p class="muted center">Refais le défi pour viser les 3 étoiles : les questions changent à chaque fois !</p>}
      <div class="res-actions">
        <Btn kind="ok" class="wide" onClick={onExit}>Continuer</Btn>
        <Btn kind="ghost" class="wide" onClick={onAgain}><Icon name="refresh" size={18} />Refaire la leçon</Btn>
      </div>
    </div>
  );
}

export function Lesson({ examId, lessonId }) {
  const exam = getExam(examId);
  const lesson = exam && findLesson(exam, lessonId);
  const s = useStore();
  const [run, setRun] = useState(0);
  const build = () => (lesson ? lessonSteps(exam, lesson).map((st, i) => ({ ...st, key: i })) : []);
  const [queue, setQueue] = useState(build);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState(null);
  const [fb, setFb] = useState(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [res, setRes] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [quit, setQuit] = useState(false);
  const max = useMemo(() => queue.filter((x) => SCORED.includes(x.t) && !x.retry).length, [run, queue.length === 0]);

  if (!lesson) return <div class="screen center-col"><Penguin mood="sad" /><p>Leçon introuvable.</p><Btn onClick={() => go('', true)}>Accueil</Btn></div>;
  const { states } = lessonStates(exam, s.results);
  if (states[lesson.id] && !states[lesson.id].open) return <div class="screen center-col"><Penguin mood="think" /><p>Termine d'abord les leçons précédentes.</p><Btn onClick={() => go('e/' + exam.id, true)}>Retour au parcours</Btn></div>;

  const step = queue[idx];
  const scored = step && SCORED.includes(step.t);
  const auto = step && AUTO.includes(step.t);

  const feedback = (ok) => {
    if (ok) { sfx.ok(); const c = combo + 1; setCombo(c); if (c >= 3 && c % 3 === 0) setTimeout(sfx.combo, 250); if (!step.retry) setScore((x) => x + 1); }
    else { sfx.bad(); setCombo(0); if (!step.retry && !auto) setQueue((q) => [...q, { ...step, retry: true, key: q.length + 100 }]); }
    setFb({ ok, praise: PRAISE[Math.floor(Math.random() * PRAISE.length)] });
  };
  const check = () => {
    if (step.t === 'qcm') return feedback(value === step.a[0]);
    if (step.t === 'tf') return feedback(value === step.ok);
    if (step.t === 'order') return feedback(value && value.every((x, i) => x === step.items[i]) && value.length === step.items.length);
  };
  const finish = () => {
    const r = { score, max: Math.max(1, max) };
    if (max === 0) r.score = 1;
    setRes(r); sfx.done(); confetti();
    recordResult(exam.id, lesson.id, r.score, r.max).then((x) => setRes((p) => p && { ...p, gain: x ? x.gain : 0, synced: x ? x.synced : false }));
  };
  const next = () => {
    if (idx + 1 < queue.length) { setIdx(idx + 1); setValue(null); setFb(null); window.scrollTo(0, 0); }
    else finish();
  };
  const again = () => { const q = build(); setQueue(q); setIdx(0); setValue(null); setFb(null); setScore(0); setCombo(0); setRes(null); setRun(run + 1); };
  const exit = () => back('e/' + exam.id);

  if (res) return <div class="lesson"><Results res={res} lesson={lesson} onAgain={again} onExit={exit} /></div>;

  const ready = step.t === 'qcm' || step.t === 'tf' ? value !== null : step.t === 'order' ? value && value.length === step.items.length : false;
  let body;
  const common = { step, value, setValue, fb, onComplete: feedback, openModel: setViewer };
  if (step.t === 'learn' || step.t === 'model') body = <Learn {...common} />;
  else if (step.t === 'qcm') body = <Qcm {...common} />;
  else if (step.t === 'tf') body = <Tf {...common} />;
  else if (step.t === 'order') body = <Order {...common} />;
  else if (step.t === 'pairs') body = <Pairs {...common} />;
  else if (step.t === 'sort') body = <Sort {...common} />;
  else if (step.t === 'labels') body = <Labels {...common} />;

  return (
    <div class="lesson">
      <header class="l-top">
        <button type="button" class="icon-btn" onClick={() => setQuit(true)} aria-label="Quitter la leçon"><Icon name="x" /></button>
        <Bar value={(idx + (fb ? 1 : 0)) / queue.length * 100} color={lesson.unit.color} />
        <span class={'combo' + (combo >= 3 ? ' on' : '')}><Icon name="flame" size={18} />{combo}</span>
      </header>
      {step.retry && <p class="retry-tag">On réessaie celle-là !</p>}
      <main class="l-body slide-in" key={step.key + '-' + idx}>{body}</main>
      <footer class={'l-foot' + (fb ? (fb.ok ? ' ok' : ' bad') : '')}>
        {fb && (
          <div class="fb pop">
            <span class="fb-ic"><Icon name={fb.ok ? 'check' : 'x'} size={26} stroke={3} /></span>
            <div>
              <b>{fb.ok ? fb.praise : 'Pas tout à fait…'}</b>
              {!fb.ok && step.t === 'qcm' && <p>Bonne réponse : <b>{step.a[0]}</b></p>}
              {!fb.ok && step.t === 'tf' && <p>C'était <b>{step.ok ? 'VRAI' : 'FAUX'}</b>.</p>}
              {step.e && <p>{step.e}</p>}
              {!fb.ok && !auto && !step.retry && <p class="small">Cette question reviendra à la fin.</p>}
            </div>
          </div>
        )}
        {fb || !scored ? (
          <Btn kind={fb ? (fb.ok ? 'ok' : 'bad') : 'primary'} class="wide" onClick={next}>{idx + 1 < queue.length ? 'Continuer' : 'Terminer'}</Btn>
        ) : auto ? (
          <Btn kind="primary" class="wide" disabled>Termine l'exercice</Btn>
        ) : (
          <Btn kind="primary" class="wide" disabled={!ready} onClick={check}>Vérifier</Btn>
        )}
      </footer>
      {!s.seen['tour-lesson'] && idx === 0 && (
        <div class="coach"><div class="coach-in">
          <Pingo say="Lis chaque carte, manipule les animations, puis appuie sur Continuer. Si tu te trompes, la question revient à la fin !" mood="wave" size={70} />
          <Btn class="sm" onClick={() => markSeen('tour-lesson')}>C'est parti !</Btn>
        </div></div>
      )}
      <Sheet open={quit} onClose={() => setQuit(false)}>
        <Penguin mood="sad" size={80} />
        <h2>Tu pars déjà ?</h2>
        <p class="muted">Ta progression dans cette leçon sera perdue.</p>
        <Btn kind="primary" class="wide" onClick={() => setQuit(false)}>Continuer la leçon</Btn>
        <Btn kind="ghost-bad" class="wide" onClick={exit}>Quitter</Btn>
      </Sheet>
      {viewer && <Viewer3D model={viewer} lockModel onClose={() => setViewer(null)} />}
    </div>
  );
}
