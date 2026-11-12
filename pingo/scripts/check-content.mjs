// Vérifie le contenu de tous les devoirs : npm run check
import { exams, allLessons, lessonSteps } from '../src/content/catalog.js';

const errors = [];
const err = (where, msg) => errors.push(`${where} : ${msg}`);
const KINDS = ['learn', 'model', 'qcm', 'tf', 'order', 'pairs', 'sort', 'labels', 'calc'];

for (const exam of exams.filter((e) => e.data)) {
  const d = exam.data, ids = new Set();
  for (const [i, b] of (d.bank || []).entries()) {
    if (!Array.isArray(b) || typeof b[1] !== 'string' || !Array.isArray(b[2]) || b[2].length < 2) err(`${exam.id} banque n°${i}`, `entrée invalide (virgule manquante ?) : ${JSON.stringify(b)}`);
  }
  for (const l of allLessons(exam)) {
    const w = `${exam.id}/${l.id}`;
    if (ids.has(l.id)) err(w, 'identifiant de leçon en double');
    ids.add(l.id);
    if (l.boss) {
      for (const id of l.from || []) if (!allLessons(exam).some((x) => x.id === id && x.steps)) err(w, `leçon source introuvable : ${id}`);
      for (let k = 0; k < 20; k++) {
        const steps = lessonSteps(exam, l);
        if (!steps.length) { err(w, 'défi vide'); break; }
      }
      continue;
    }
    for (const [i, s] of (l.steps || []).entries()) {
      const ws = `${w} étape ${i + 1}`;
      if (!s || !KINDS.includes(s.t)) { err(ws, `type inconnu : ${s && s.t}`); continue; }
      if (s.t === 'qcm' && (!Array.isArray(s.a) || s.a.length < 2 || new Set(s.a).size !== s.a.length)) err(ws, 'QCM : réponses manquantes ou en double');
      if (s.t === 'tf' && typeof s.ok !== 'boolean') err(ws, 'vrai/faux : « ok » doit valoir true ou false');
      if (s.t === 'order' && (!Array.isArray(s.items) || s.items.length < 2)) err(ws, 'ordre : items manquants');
      if (s.t === 'pairs' && (!Array.isArray(s.pairs) || s.pairs.some((p) => !Array.isArray(p) || p.length !== 2))) err(ws, 'paires invalides');
      if (s.t === 'sort' && (!s.groups || s.items.some(([, g]) => !s.groups[g]))) err(ws, 'tri : groupe inconnu');
      if (s.t === 'calc' && (!Array.isArray(s.a) || s.a.length !== 2 || !Number.isFinite(s.a[0] * 10 ** s.a[1]) || !Array.isArray(s.steps))) err(ws, 'calcul : réponse [mantisse, exposant] ou correction invalide');
    }
  }
}

if (errors.length) { console.error(`✗ ${errors.length} problème(s) :\n- ` + errors.join('\n- ')); process.exit(1); }
console.log(`✓ Contenu valide (${exams.filter((e) => e.data).length} devoirs).`);
