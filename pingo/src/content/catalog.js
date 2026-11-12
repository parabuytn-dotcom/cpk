import * as svtDc1 from './svt-dc1.js';
import * as pcDc1 from './pc-dc1.js';

export const subjects = [
  { id: 'svt', name: 'SVT', icon: 'leaf', color: '#1FBF75', dark: '#139A5C' },
  { id: 'maths', name: 'Maths', icon: 'pi', color: '#2F6BFF', dark: '#1E4FD6' },
  { id: 'physique', name: 'Physique-Chimie', icon: 'atom', color: '#8B5CF6', dark: '#6D3FE0' },
  { id: 'francais', name: 'Français', icon: 'book', color: '#FF4D5E', dark: '#D93445' },
  { id: 'arabe', name: 'Arabe', icon: 'pen', color: '#14B8C4', dark: '#0E939D' },
  { id: 'anglais', name: 'Anglais', icon: 'chat', color: '#FF8A1F', dark: '#E06D00' },
  { id: 'histgeo', name: 'Histoire-Géo', icon: 'globe', color: '#A0613A', dark: '#7E4A2A' },
  { id: 'info', name: 'Informatique', icon: 'cpu', color: '#3F4A6B', dark: '#2A3350' }
];

export const exams = [
  { id: 'svt-dc1', subject: 'svt', name: 'Devoir de contrôle 1', short: 'DC1', chapters: 'Les microbes · L\'immunité non spécifique', data: svtDc1 },
  { id: 'pc-dc1', subject: 'physique', name: 'Devoir de contrôle 1', short: 'DC1', chapters: 'Électrisation · La matière · Le courant électrique', data: pcDc1 },
  { id: 'pc-ds1', subject: 'physique', name: 'Devoir de synthèse 1', short: 'DS1', soon: true },
  { id: 'svt-ds1', subject: 'svt', name: 'Devoir de synthèse 1', short: 'DS1', soon: true },
  { id: 'svt-dc2', subject: 'svt', name: 'Devoir de contrôle 2', short: 'DC2', soon: true },
  { id: 'svt-ds2', subject: 'svt', name: 'Devoir de synthèse 2', short: 'DS2', soon: true }
];

export const examsOf = (subject) => exams.filter((e) => e.subject === subject);
export const getExam = (id) => exams.find((e) => e.id === id && e.data);
export const getSubject = (id) => subjects.find((s) => s.id === id);

export function allLessons(exam) {
  return exam.data.units.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u })));
}

export function findLesson(exam, id) {
  return allLessons(exam).find((l) => l.id === id);
}

/* Déblocage : dans chaque unité, une leçon s'ouvre quand la précédente est faite.
   Le grand défi s'ouvre quand les deux défis d'unité sont faits. */
export function lessonStates(exam, results) {
  const res = results[exam.id] || {};
  const out = {};
  let current = null;
  for (const u of exam.data.units) {
    let prevDone = true;
    for (const l of u.lessons) {
      const done = !!res[l.id];
      let open = prevDone;
      if (l.final) open = exam.data.units.filter((x) => x.id !== 'final').every((x) => x.lessons.filter((y) => y.boss).every((y) => res[y.id]));
      out[l.id] = { done, open, res: res[l.id] };
      if (!done && open && !current) current = l.id;
      prevDone = done;
    }
  }
  return { states: out, current };
}

export function examProgress(exam, results) {
  const ls = allLessons(exam).filter((l) => !l.bonus);
  const res = results[exam.id] || {};
  return Math.round(ls.filter((l) => res[l.id]).length / ls.length * 100);
}

const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* Construit les étapes d'un défi à partir des questions des leçons + banque */
export function lessonSteps(exam, lesson) {
  if (!lesson.boss) return lesson.steps;
  const all = allLessons(exam);
  const pool = [];
  for (const id of lesson.from) {
    const l = all.find((x) => x.id === id);
    for (const s of l.steps) if (s.t === 'qcm' || s.t === 'tf' || s.t === 'calc') pool.push(s);
  }
  for (const [tag, q, a] of exam.data.bank) if (lesson.bank === 'all' || lesson.bank === tag) pool.push({ t: 'qcm', q, a });
  const picked = shuffle(pool).slice(0, lesson.n);
  if (lesson.sort) picked.splice(Math.floor(picked.length / 2), 0, { t: 'sort', ...exam.data.sortGame });
  return picked;
}
