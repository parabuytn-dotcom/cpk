import { useEffect, useRef, useState } from 'preact/hooks';
import { Cards, useStore } from '../components/ui.jsx';
import { LESSONS } from '../content/lessons.js';
import { DRILLS } from './Train.jsx';
import { levelOf } from '../store.js';
import { Holdem } from '../poker/game.js';

function Showcase() {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let stop = false, scene, ctrl;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (async () => {
      try {
        const [{ TableScene }, { CHARACTERS }, { TableController }] = await Promise.all([
          import('../three/table.js'), import('../three/avatar.js'), import('../play/controller.js')
        ]);
        if (stop) return;
        scene = new TableScene(ref.current, { seats: 6, showcase: true });
        scene.getViewShift = (w, h) => (w / h > 1.2 ? -Math.round(w * 0.2) : 0);
        await scene.init();
        if (stop) { scene.dispose(); return; }
        const defs = ['Lucky', 'Tex', 'Mia', 'Bubba', 'Vinnie', 'Grace'].map((n) => CHARACTERS.find((c) => c.name === n));
        scene.setPlayers(defs);
        scene.speed = 1.2;
        const game = new Holdem(defs.map((d) => ({ name: d.name, stack: 2000, persona: d.persona })), { sb: 10, bb: 20 });
        ctrl = new TableController(scene, game, {});
        ctrl.syncStacks();
        setReady(true);
        while (!stop) {
          game.players.forEach((p) => { if (p.stack <= 0) p.stack = 2000; });
          await ctrl.playHand();
          await new Promise((r) => setTimeout(r, reduce ? 6000 : 2200));
        }
      } catch (e) {
        console.warn('3D indisponible', e);
      }
    })();
    return () => { stop = true; if (ctrl) ctrl.stopped = true; scene?.dispose(); };
  }, []);
  return <div class={`showcase${ready ? ' ready' : ''}`} ref={ref} aria-hidden="true" />;
}

export function HomePage() {
  const s = useStore();
  const L = levelOf(s.xp);
  const done = LESSONS.filter((l) => s.lessons[l.id]).length;
  const nextLesson = LESSONS.find((l) => !s.lessons[l.id]);
  const drillsPlayed = DRILLS.filter((d) => s.drills[d.id]).length;
  return (
    <main class="home">
      <section class="hero">
        <Showcase />
        <div class="hero-shade" />
        <div class="hero-content">
          <span class="eyebrow">Texas Hold'em No-Limit · le poker des casinos américains</span>
          <h1>Deviens un <em>requin</em><br />du poker.</h1>
          <p>Leçons animées, exercices et une vraie table en 3D contre 5 adversaires aux styles différents. Un coach t'explique chaque coup, en français.</p>
          <div class="row">
            <a class="btn big" href={nextLesson ? `#/apprendre/${nextLesson.id}` : '#/jouer'}>{done === 0 ? 'Commencer la formation' : nextLesson ? 'Continuer la formation' : 'Jouer une partie'}</a>
            <a class="btn big ghost" href="#/jouer">🃏 Aller à la table 3D</a>
          </div>
          
        </div>
      </section>

      <section class="path">
        <h2>Ton parcours</h2>
        <div class="path-grid">
          <a href="#/apprendre" class="path-step">
            <span class="ps-num">1</span>
            <span class="ps-ic">📘</span>
            <b>Apprendre</b>
            <p>12 leçons : règles, classement des mains, positions, maths, stratégie.</p>
            <span class="progress-line thin"><span style={{ width: (done / LESSONS.length) * 100 + '%' }} /></span>
            <small>{done}/{LESSONS.length} leçons</small>
          </a>
          <a href="#/entrainement" class="path-step">
            <span class="ps-num">2</span>
            <span class="ps-ic">🎯</span>
            <b>S'entraîner</b>
            <p>Qui gagne ? Combien d'outs ? Jouer ou jeter ? Des exercices infinis.</p>
            <span class="progress-line thin"><span style={{ width: (drillsPlayed / DRILLS.length) * 100 + '%' }} /></span>
            <small>{drillsPlayed}/{DRILLS.length} exercices essayés</small>
          </a>
          <a href="#/jouer" class="path-step">
            <span class="ps-num">3</span>
            <span class="ps-ic">🃏</span>
            <b>Jouer</b>
            <p>Table 3D à 6 joueurs, coach en direct, jetons et animations.</p>
            <span class="progress-line thin"><span style={{ width: Math.min(100, s.hands.played) + '%' }} /></span>
            <small>{s.hands.played} mains jouées · {s.hands.won} gagnées</small>
          </a>
        </div>
      </section>

      <section class="me-card">
        <span class="me-icon">{L.icon}</span>
        <div>
          <small>Ton niveau</small>
          <b>Niv. {L.index + 1} · {L.name}</b>
          <span class="progress-line"><span style={{ width: L.progress * 100 + '%' }} /></span>
          <small class="muted">{s.xp} XP{L.next ? ` · encore ${L.next - s.xp} XP pour le niveau suivant` : ' · niveau maximum !'}</small>
        </div>
        <a href="#/profil" class="btn ghost small">Mes stats</a>
      </section>

      <section class="features">
        <div class="feat"><span>🎓</span><b>Un coach en direct</b><p>Chances de gagner, cote du pot, outs : il t'explique la bonne décision à chaque tour.</p></div>
        <div class="feat"><span>🤖</span><b>5 styles d'adversaires</b><p>Le Roc, le Requin, le Poisson, le Maniaque et la Pro : apprends à les exploiter.</p></div>
        <div class="feat"><span>🇺🇸</span><b>Le vrai poker américain</b><p>No-Limit Hold'em, blindes, side pots, vocabulaire et étiquette des casinos de Las Vegas.</p></div>
        <div class="feat"><span>💾</span><b>Ta progression sauvegardée</b><p>XP, niveaux du Débutant à la Légende des WSOP, records et statistiques.</p></div>
      </section>
      <footer class="foot">All-In Academy · Jeu éducatif, sans argent réel. Le poker d'argent est réservé aux adultes : joue toujours de façon responsable.</footer>
    </main>
  );
}
