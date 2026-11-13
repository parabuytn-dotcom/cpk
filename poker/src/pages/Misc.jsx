import { useState } from 'preact/hooks';
import { GLOSSARY } from '../content/glossary.js';
import { LESSONS } from '../content/lessons.js';
import { DRILLS } from './Train.jsx';
import { useStore } from '../components/ui.jsx';
import { store, levelOf, LEVELS } from '../store.js';

export function GlossaryPage() {
  const [q, setQ] = useState('');
  const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = GLOSSARY.filter((g) => norm(g.join(' ')).includes(norm(q)));
  return (
    <main class="page">
      <section class="page-head">
        <span class="eyebrow">{GLOSSARY.length} termes · anglais → français</span>
        <h1>Lexique du poker</h1>
        <p>Aux USA tout se dit en anglais. Voici les mots que tu entendras à chaque table.</p>
        <input class="search" type="search" placeholder="Chercher un mot (ex. kicker, tapis, river…)" value={q} onInput={(e) => setQ(e.target.value)} />
      </section>
      <dl class="glossary">
        {list.map(([en, fr, def]) => (
          <div key={en} class="gl-item">
            <dt><b>{en}</b>{fr !== en && <span>{fr}</span>}</dt>
            <dd>{def}</dd>
          </div>
        ))}
        {!list.length && <p class="muted">Aucun résultat.</p>}
      </dl>
    </main>
  );
}

export function ProfilePage() {
  const s = useStore();
  const L = levelOf(s.xp);
  const done = LESSONS.filter((l) => s.lessons[l.id]);
  const winRate = s.hands.played ? Math.round((s.hands.won / s.hands.played) * 100) : 0;
  return (
    <main class="page">
      <section class="page-head">
        <span class="eyebrow">Ta progression</span>
        <h1>{L.icon} {L.name}</h1>
        <div class="progress-line"><span style={{ width: L.progress * 100 + '%' }} /></div>
        <small class="muted">{s.xp} XP{L.next ? ` · niveau suivant à ${L.next} XP` : ''}</small>
      </section>
      <div class="stat-grid">
        <div class="stat"><b>{done.length}/{LESSONS.length}</b><span>leçons terminées</span></div>
        <div class="stat"><b>{s.hands.played}</b><span>mains jouées</span></div>
        <div class="stat"><b>{winRate} %</b><span>mains gagnées</span></div>
        <div class="stat"><b>{s.hands.biggest.toLocaleString('fr-FR')}</b><span>plus gros pot</span></div>
        <div class="stat"><b>{s.bankroll.toLocaleString('fr-FR')}</b><span>jetons à la table</span></div>
        <div class="stat"><b>{s.rebuys}</b><span>recaves</span></div>
      </div>
      <h2>Les niveaux</h2>
      <ol class="levels">
        {LEVELS.map(([xp, name, icon], i) => (
          <li key={name} class={i <= L.index ? 'got' : ''}><span>{icon}</span><b>{name}</b><small>{xp} XP</small></li>
        ))}
      </ol>
      <h2>Records d'entraînement</h2>
      <div class="stat-grid">
        {DRILLS.map((d) => <div key={d.id} class="stat"><b>{s.drills[d.id] ? s.drills[d.id].best + '/10' : '—'}</b><span>{d.icon} {d.title}</span></div>)}
      </div>
      <p class="muted small">Gagner des mains rapporte un peu d'XP, mais la vraie progression vient des leçons et des exercices.</p>
      <button class="btn ghost small danger" onClick={() => { if (confirm('Effacer toute ta progression ?')) store.reset(); }}>Réinitialiser ma progression</button>
    </main>
  );
}
