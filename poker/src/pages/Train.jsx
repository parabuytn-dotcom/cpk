import { useState, useMemo, useEffect } from 'preact/hooks';
import { Cards, Rich, useStore } from '../components/ui.jsx';
import { newDeck, shuffle, handCode } from '../poker/cards.js';
import { evaluate, CATEGORIES } from '../poker/evaluator.js';
import { outs, tierOf, TIER_INFO } from '../poker/equity.js';
import { POSITION_INFO } from '../poker/coach.js';
import { store } from '../store.js';
import { sfx } from '../sound.js';

const pickN = (n) => shuffle(newDeck()).slice(0, n);
const ids = (cs) => cs.map((c) => c.id);
const ROUNDS = 10;

// ---------- générateurs d'exercices ----------
function genWinner() {
  const d = shuffle(newDeck());
  const a = d.slice(0, 2), b = d.slice(2, 4), board = d.slice(4, 9);
  const ea = evaluate([...a, ...board]), eb = evaluate([...b, ...board]);
  const ans = ea.score > eb.score ? 0 : eb.score > ea.score ? 1 : 2;
  return {
    prompt: 'Qui a la meilleure main ?',
    show: { board, hands: [{ name: 'Joueur A', cards: a }, { name: 'Joueur B', cards: b }] },
    opts: ['Joueur A', 'Joueur B', 'Égalité (partage)'], a: ans,
    explain: `A : **${ea.name}** — B : **${eb.name}**. ${ans === 2 ? 'Mêmes 5 meilleures cartes : le pot est partagé.' : ea.cat !== eb.cat ? `${CATEGORIES[Math.max(ea.cat, eb.cat)].fr} bat ${CATEGORIES[Math.min(ea.cat, eb.cat)].fr}.` : 'Même combinaison : on départage avec la hauteur puis les kickers.'}`,
    best: ans === 1 ? eb.best : ea.best,
    bestLabel: ans === 1 ? 'Main gagnante de B' : 'Main gagnante de A'
  };
}

function genName() {
  // on favorise les mains intéressantes
  let hole, board, e;
  for (let k = 0; k < 30; k++) {
    const d = pickN(7);
    hole = d.slice(0, 2); board = d.slice(2);
    e = evaluate(d);
    if (e.cat >= 2 || Math.random() < 0.25) break;
  }
  const correct = e.displayCat;
  const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((c) => c !== correct);
  const wrong = shuffle(pool.filter((c) => Math.abs(c - correct) <= 3)).slice(0, 3);
  const choices = shuffle([correct, ...wrong]);
  return {
    prompt: 'Quelle est ta meilleure combinaison ?',
    show: { board, hands: [{ name: 'Toi', cards: hole }] },
    opts: choices.map((c) => `${CATEGORIES[c].fr} · ${CATEGORIES[c].en}`), a: choices.indexOf(correct),
    explain: `Tu as **${e.name}**. Les 5 cartes qui comptent sont en surbrillance.`,
    best: e.best, bestLabel: 'Tes 5 meilleures cartes'
  };
}

function genOuts() {
  for (let k = 0; k < 400; k++) {
    const d = shuffle(newDeck());
    const hole = d.slice(0, 2), board = d.slice(2, 5);
    if (evaluate([...hole, ...board]).cat >= 4) continue;
    const o = outs(hole, board);
    if (o.count < 4 || o.count > 15 || !o.draws.length) continue;
    const n = o.count;
    const set = new Set([n]);
    while (set.size < 4) { const v = n + Math.round((Math.random() - 0.5) * 10); if (v > 0 && v < 22) set.add(v); }
    const choices = shuffle([...set]);
    return {
      prompt: 'Combien d\'outs as-tu pour améliorer ta main ?',
      show: { board, hands: [{ name: 'Toi', cards: hole }], boardLabel: 'Flop' },
      opts: choices.map(String), a: choices.indexOf(n),
      explain: `**${n} outs** (${o.draws.join(' + ')}). Règle du 4 au flop : ≈ ${Math.min(100, n * 4)} % d'améliorer d'ici la river.`,
      extra: o.cards, extraLabel: 'Les cartes qui t\'améliorent'
    };
  }
  return genWinner();
}

const OPEN_POS = ['UTG', 'MP', 'CO', 'BTN', 'SB'];
const MAX_TIER = { UTG: 3, MP: 3, CO: 4, BTN: 5, SB: 4 };
function genPreflop() {
  let hole, tier;
  for (let k = 0; k < 20; k++) {
    hole = pickN(2);
    tier = tierOf(hole);
    if (tier < 6 || Math.random() < 0.3) break;
  }
  const pos = OPEN_POS[Math.floor(Math.random() * OPEN_POS.length)];
  const play = tier <= MAX_TIER[pos];
  return {
    prompt: `Tu es **${pos}** (${POSITION_INFO[pos].fr}). Tout le monde avant toi s'est couché. Que fais-tu ?`,
    show: { hands: [{ name: 'Ta main', cards: hole }] },
    opts: ['Relancer (≈ 3 BB)', 'Se coucher'], a: play ? 0 : 1,
    explain: `${handCode(hole)} est une main **${TIER_INFO[tier].label}**. ${pos} : on ouvre jusqu'à la catégorie « ${TIER_INFO[MAX_TIER[pos]].label} ». ${play ? 'Donc on relance !' : 'Donc on se couche.'} ${POSITION_INFO[pos].tip}`
  };
}

function genOdds() {
  const pot = [60, 80, 100, 120, 150, 200, 300][Math.floor(Math.random() * 7)];
  const fr = [0.33, 0.5, 0.75, 1][Math.floor(Math.random() * 4)];
  const bet = Math.round((pot * fr) / 5) * 5;
  const draws = [['tirage couleur', 9], ['tirage quinte bilatéral', 8], ['tirage quinte ventral', 4], ['tirage couleur + quinte', 15], ['deux overcards', 6]];
  const [dname, o] = draws[Math.floor(Math.random() * draws.length)];
  const street = Math.random() < 0.5 ? 'turn' : 'flop';
  // au flop, on considère seulement la prochaine carte si l'adversaire peut encore miser -> on simplifie : règle du 2 à la turn, du 4 au flop (tapis)
  const chance = Math.min(100, o * (street === 'flop' ? 4 : 2));
  const need = Math.round((bet / (pot + 2 * bet)) * 100);
  const call = chance >= need;
  return {
    prompt: `${street === 'flop' ? 'Au flop, ton adversaire fait **tapis**' : 'À la turn, ton adversaire mise'} **${bet}** dans un pot de **${pot}**. Tu as un ${dname} (**${o} outs**). Tu suis ?`,
    show: null,
    opts: ['Suivre (call)', 'Se coucher (fold)'], a: call ? 0 : 1,
    explain: `Il faut ${bet} ÷ (${pot} + ${bet} + ${bet}) = **${need} %**. Tes chances : ${o} outs × ${street === 'flop' ? 4 : 2} ≈ **${chance} %**. ${call ? `${chance} % ≥ ${need} % → suivre est rentable.` : `${chance} % < ${need} % → couche-toi, le prix est trop cher.`}`
  };
}

export const DRILLS = [
  { id: 'winner', icon: '⚔️', title: 'Qui gagne ?', desc: 'Compare deux mains sur le même board. Le réflexe n°1 du joueur.', gen: genWinner },
  { id: 'name', icon: '🔎', title: 'Nomme ta main', desc: 'Trouve ta meilleure combinaison de 5 cartes parmi 7.', gen: genName },
  { id: 'preflop', icon: '🚦', title: 'Jouer ou jeter ?', desc: 'Décide préflop selon ta main et ta position.', gen: genPreflop },
  { id: 'outs', icon: '🎲', title: 'Compte tes outs', desc: 'Repère les cartes qui complètent ton tirage.', gen: genOuts },
  { id: 'odds', icon: '⚖️', title: 'Cote du pot', desc: 'Suivre ou se coucher face à une mise ? Fais le calcul.', gen: genOdds }
];

export function TrainIndex() {
  const s = useStore();
  return (
    <main class="page">
      <section class="page-head">
        <span class="eyebrow">Entraînement · séries de {ROUNDS} questions</span>
        <h1>S'entraîner</h1>
        <p>Des exercices générés à l'infini pour transformer les règles en réflexes. Chaque bonne réponse rapporte de l'XP.</p>
      </section>
      <div class="drill-grid">
        {DRILLS.map((d) => {
          const st = s.drills[d.id];
          return (
            <a key={d.id} href={`#/entrainement/${d.id}`} class="drill-card">
              <span class="dc-icon">{d.icon}</span>
              <b>{d.title}</b>
              <p>{d.desc}</p>
              <span class="dc-stat">{st ? `Record : ${st.best}/${ROUNDS} · ${st.played} série${st.played > 1 ? 's' : ''}` : 'Pas encore joué'}</span>
            </a>
          );
        })}
      </div>
    </main>
  );
}

function Show({ show, best, reveal }) {
  if (!show) return null;
  const bestIds = reveal && best ? ids(best) : null;
  return (
    <div class="drill-show">
      {show.board && <div class="ds-board"><span class="lbl">{show.boardLabel || 'Board'}</span><Cards cards={show.board} size="md" highlight={bestIds} flip /></div>}
      <div class="ds-hands">
        {show.hands.map((h, i) => (
          <div key={i} class="ds-hand"><span class="lbl">{h.name}</span><Cards cards={h.cards} size="md" highlight={bestIds} flip /></div>
        ))}
      </div>
    </div>
  );
}

export function DrillPage({ id }) {
  const drill = DRILLS.find((d) => d.id === id);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pick, setPick] = useState(null);
  const [seed, setSeed] = useState(0);
  const [over, setOver] = useState(false);
  const q = useMemo(() => drill?.gen(), [seed, id]);
  useEffect(() => { setRound(0); setScore(0); setStreak(0); setPick(null); setOver(false); setSeed((x) => x + 1); }, [id]);
  if (!drill) return <main class="page"><a href="#/entrainement">← Retour</a></main>;
  const answered = pick !== null;
  const choose = (k) => {
    if (answered) return;
    setPick(k);
    if (k === q.a) { setScore((x) => x + 1); setStreak((x) => x + 1); sfx('good'); } else { setStreak(0); sfx('bad'); }
  };
  const next = () => {
    if (round + 1 >= ROUNDS) {
      const final = score;
      setOver(true);
      store.update((s) => {
        const st = s.drills[id] || { best: 0, played: 0 };
        st.best = Math.max(st.best, final); st.played++;
        s.drills[id] = st;
      });
      store.addXp(final * 3 + (final === ROUNDS ? 15 : 0), drill.title);
      return;
    }
    setRound(round + 1); setPick(null); setSeed(seed + 1);
  };
  const restart = () => { setRound(0); setScore(0); setStreak(0); setPick(null); setOver(false); setSeed(seed + 1); };
  return (
    <main class="page drill">
      <a href="#/entrainement" class="back">← Tous les exercices</a>
      <header class="drill-head">
        <h1>{drill.icon} {drill.title}</h1>
        <div class="drill-stats">
          <span class="pill">Question {Math.min(round + 1, ROUNDS)}/{ROUNDS}</span>
          <span class="pill gold">Score {score}</span>
          {streak >= 2 && <span class="pill hot">🔥 Série de {streak}</span>}
        </div>
      </header>
      <div class="progress-line thin"><span style={{ width: ((round + (answered ? 1 : 0)) / ROUNDS) * 100 + '%' }} /></div>
      {over ? (
        <div class="done-card">
          <span class="big">{score >= 9 ? '🏆' : score >= 6 ? '🎉' : '💪'}</span>
          <div>
            <h3>Série terminée : {score}/{ROUNDS}</h3>
            <p>+{score * 3 + (score === ROUNDS ? 15 : 0)} XP. {score >= 8 ? 'Excellent, tu maîtrises !' : 'Continue, la répétition crée les réflexes.'}</p>
            <div class="row"><button class="btn" onClick={restart}>Rejouer</button><a class="btn ghost" href="#/entrainement">Autre exercice</a></div>
          </div>
        </div>
      ) : q && (
        <section class="drill-q" key={seed}>
          <h3 class="drill-prompt"><Rich text={q.prompt} /></h3>
          <Show show={q.show} best={q.best} reveal={answered} />
          <div class={`opts${q.opts.length <= 3 ? ' row-opts' : ''}`}>
            {q.opts.map((o, k) => (
              <button key={k} class={`opt${answered && k === q.a ? ' right' : ''}${answered && k === pick && k !== q.a ? ' wrong' : ''}`} onClick={() => choose(k)}>{o}</button>
            ))}
          </div>
          {answered && (
            <div class={`feedback ${pick === q.a ? 'ok' : 'ko'}`}>
              <b>{pick === q.a ? 'Correct !' : 'Raté !'}</b>
              <p><Rich text={q.explain} /></p>
              {q.extra && <div class="extra"><span class="lbl">{q.extraLabel}</span><Cards cards={q.extra} size="xs" /></div>}
              <button class="btn" onClick={next} autofocus>{round + 1 >= ROUNDS ? 'Voir le résultat' : 'Suivant →'}</button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
