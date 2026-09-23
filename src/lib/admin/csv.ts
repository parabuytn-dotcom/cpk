// Reading a pasted timetable.
//
// A timetable gets typed on a phone, saved by Excel, sent across and pasted
// back — the accents, the separator and the byte-order mark rarely survive
// that trip intact. So the header is matched on its shape rather than on its
// exact spelling: "Heure_Début", "heure debut" and "HEURE-DEBUT" are one and
// the same column. Anything unrecognised is kept verbatim, so the error
// message can name it back to the user.
//
// Lives apart from actions.ts because that file is "use server" and may only
// export async functions — which also means none of this can be unit-tested
// from there.

const CSV_HEADER_ALIASES: Record<string, string> = {
  jour: "Jour",
  day: "Jour",
  heure_debut: "Heure_Début",
  debut: "Heure_Début",
  heure_de_debut: "Heure_Début",
  heure_fin: "Heure_Fin",
  fin: "Heure_Fin",
  matiere: "Matière",
  cours: "Matière",
  salle: "Salle",
  local: "Salle",
  professeur: "Professeur",
  prof: "Professeur",
  enseignant: "Professeur",
  semaine: "Semaine",
  quinzaine: "Semaine",
  groupe: "Groupe",
  group: "Groupe",
};

export function canonicalHeader(raw: string) {
  const key = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return CSV_HEADER_ALIASES[key] ?? raw.trim();
}

export function detectDelimiter(headerLine: string) {
  const counts: [string, number][] = [
    [",", (headerLine.match(/,/g) ?? []).length],
    [";", (headerLine.match(/;/g) ?? []).length],
    ["\t", (headerLine.match(/\t/g) ?? []).length],
  ];
  return counts.reduce((best, candidate) => (candidate[1] > best[1] ? candidate : best))[0];
}

export function parseCsv(text: string): Record<string, string>[] {
  // Excel and most phone transfers put a byte-order mark in front. Left there,
  // it turns "Jour" into an unknown column and then every row fails at once.
  const lines = text
    .replace(/^﻿/, "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map(canonicalHeader);

  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

/** The columns without which nothing can be imported. */
export const REQUIRED_CSV_HEADERS = ["Jour", "Heure_Début", "Heure_Fin", "Matière"];

/** Null when the header is usable, otherwise the message to show. */
export function missingHeaderMessage(rows: Record<string, string>[]): string | null {
  if (rows.length === 0) return null;
  const read = Object.keys(rows[0]);
  const missing = REQUIRED_CSV_HEADERS.filter((header) => !read.includes(header));
  if (missing.length === 0) return null;

  // One single column means the text has no separator at all — almost always
  // a table copied off a screen rather than the contents of the .csv file.
  // Listing the "columns read" in that case is just noise.
  if (read.length === 1) {
    return "Ce texte n'a qu'une seule colonne : il n'y a ni virgule ni point-virgule. Ce n'est pas le contenu d'un fichier CSV — utilise le bouton « Choisir un fichier » au-dessus, ou ouvre le .csv et copie tout son texte.";
  }

  return `Colonne(s) manquante(s) : ${missing.join(", ")}. Colonnes lues dans ton fichier : ${read.join(", ")}.`;
}
