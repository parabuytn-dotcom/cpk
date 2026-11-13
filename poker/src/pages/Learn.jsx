import { useState, useEffect } from 'preact/hooks';
import { CHAPTERS, LESSONS } from '../content/lessons.js';
import { renderBlock } from '../components/blocks.jsx';
import { Rich, useStore } from '../components/ui.jsx';
import { store } from '../store.js';
import { sfx } from '../sound.js';

export function LearnIndex() {
  const s = useStore();
  const done = LESSONS.filter((l) => s.lessons[l.id]).length;
  const nextLesson = LESSONS.find((l) => !s.lessons[l.id]);
  return (
    <main class="page">
      <section class="page-head">
        <span class="eyebrow">Formation complète · {LESSONS.length} leçons</span>
        <h1>Apprendre le Texas Hold'em</h1>
        <p>Des règles de base jusqu'aux maths des pros. Chaque leçon se termine par un quiz qui te rapporte de l'XP.</p>
        <div class="progress-line"><span style={{ width: (done / LESSONS.length) * 100 + '%' }} /></div>
        <small class="muted">{done}/{LESSONS.length} leçons terminées</small>
        {nextLesson && <a class="btn" href={`#/apprendre/${nextLesson.id}`}>{done ? 'Continuer' : 'Commencer'} : {nextLesson.title} →</a>}
      </section>
      {CHAPTERS.map((ch, ci) => (
        <section key={ch.id} class="chapter">
          <h2><span class="ch-num">{ci + 1}</span>{ch.title}</h2>
          <p class="muted">{ch.desc}</p>
          <div class="lesson-grid">
            {LESSONS.filter((l) => l.chapter === ch.id).map((l) => {
              const idx = LESSONS.indexOf(l);
              return (
                <a key={l.id} href={`#/apprendre/${l.id}`} class={`lesson-card${s.lessons[l.id] ? ' done' : ''}${nextLesson?.id === l.id ? ' next' : ''}`}>
                  <span class="lc-icon">{l.icon}</span>
                  <span class="lc-body">
                    <small>Leçon {idx + 1} · {l.minutes} min</small>
                    <b>{l.title}</b>
                    <span class="lc-intro">{l.intro}</span>
                  </span>
                  <span class="lc-state">{s.lessons[l.id] ? '✓' : nextLesson?.id === l.id ? '▶' : ''}</span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

function Quiz({ lesson, onDone }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [score, setScore] = useState(0);
  const q = lesson.quiz[i];
  const answered = pick !== null;
  const choose = (k) => {
    if (answered) return;
    setPick(k);
    if (k === q.a) { setScore((x) => x + 1); sfx('good'); } else sfx('bad');
  };
  const next = () => {
    if (i + 1 < lesson.quiz.length) { setI(i + 1); setPick(null); }
    else onDone(score);
  };
  return (
    <div class="quiz">
      <div class="quiz-top"><span>Question {i + 1}/{lesson.quiz.length}</span><span class="pill">Score : {score}</span></div>
      <div class="progress-line thin"><span style={{ width: ((i + (answered ? 1 : 0)) / lesson.quiz.length) * 100 + '%' }} /></div>
      <h3><Rich text={q.q} /></h3>
      <div class="opts">
        {q.opts.map((o, k) => (
          <button key={k} class={`opt${answered && k === q.a ? ' right' : ''}${answered && k === pick && k !== q.a ? ' wrong' : ''}`} onClick={() => choose(k)} disabled={answered && k !== pick && k !== q.a}>
            <Rich text={o} />
          </button>
        ))}
      </div>
      {answered && (
        <div class={`feedback ${pick === q.a ? 'ok' : 'ko'}`}>
          <b>{pick === q.a ? 'Bien joué !' : 'Pas tout à fait…'}</b>
          <p><Rich text={q.why} /></p>
          <button class="btn" onClick={next}>{i + 1 < lesson.quiz.length ? 'Question suivante →' : 'Terminer la leçon'}</button>
        </div>
      )}
    </div>
  );
}

export function LessonPage({ id }) {
  const s = useStore();
  const idx = LESSONS.findIndex((l) => l.id === id);
  const lesson = LESSONS[idx];
  const [phase, setPhase] = useState('read');
  const [result, setResult] = useState(null);
  const [quizKey, setQuizKey] = useState(0);
  useEffect(() => { setPhase('read'); setResult(null); window.scrollTo(0, 0); }, [id]);
  if (!lesson) return <main class="page"><p>Leçon introuvable. <a href="#/apprendre">Retour</a></p></main>;
  const next = LESSONS[idx + 1];
  const finish = (score) => {
    const first = !s.lessons[lesson.id];
    const xp = (first ? 40 : 5) + score * 5;
    store.update((st) => { st.lessons[lesson.id] = { score, total: lesson.quiz.length, at: Date.now() }; });
    store.addXp(xp, first ? 'Leçon terminée' : 'Révision');
    setResult({ score, xp });
    setPhase('done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <main class="page lesson">
      <a href="#/apprendre" class="back">← Toutes les leçons</a>
      <header class="lesson-head">
        <span class="lh-icon">{lesson.icon}</span>
        <div>
          <span class="eyebrow">Leçon {idx + 1}/{LESSONS.length} · {lesson.minutes} min</span>
          <h1>{lesson.title}</h1>
          <p class="lead">{lesson.intro}</p>
        </div>
      </header>
      {phase === 'done' && result && (
        <div class="done-card">
          <span class="big">{result.score === lesson.quiz.length ? '🏆' : result.score >= lesson.quiz.length / 2 ? '🎉' : '💪'}</span>
          <div>
            <h3>Leçon terminée : {result.score}/{lesson.quiz.length}</h3>
            <p>+{result.xp} XP. {result.score === lesson.quiz.length ? 'Sans faute, impressionnant !' : 'Tu peux refaire le quiz quand tu veux.'}</p>
            <div class="row">
              {next ? <a class="btn" href={`#/apprendre/${next.id}`}>Leçon suivante : {next.title} →</a> : <a class="btn" href="#/jouer">Mettre en pratique à la table 3D →</a>}
              <button class="btn ghost" onClick={() => { setQuizKey((k) => k + 1); setPhase('quiz'); }}>Refaire le quiz</button>
            </div>
          </div>
        </div>
      )}
      <article class="lesson-body">
        {lesson.blocks.map(renderBlock)}
      </article>
      {phase === 'read' && (
        <div class="quiz-cta">
          <div><b>Prêt pour le quiz ?</b><p>{lesson.quiz.length} questions pour vérifier que tout est clair.</p></div>
          <button class="btn" onClick={() => { setPhase('quiz'); setTimeout(() => document.querySelector('.quiz')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}>Lancer le quiz</button>
        </div>
      )}
      {phase === 'quiz' && <Quiz key={lesson.id + quizKey} lesson={lesson} onDone={finish} />}
      <nav class="lesson-nav">
        {LESSONS[idx - 1] ? <a href={`#/apprendre/${LESSONS[idx - 1].id}`}>← {LESSONS[idx - 1].title}</a> : <span />}
        {next ? <a href={`#/apprendre/${next.id}`}>{next.title} →</a> : <a href="#/jouer">Jouer →</a>}
      </nav>
    </main>
  );
}
