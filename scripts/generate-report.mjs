// Génère un rapport Excel (.xlsx) multi-onglets à partir des données réelles
// du projet Supabase, en utilisant NEXT_PUBLIC_SUPABASE_URL et
// SUPABASE_SERVICE_ROLE_KEY lus depuis .env.local (jamais envoyés ailleurs
// que vers ta propre base Supabase — ce script tourne uniquement en local).
//
// Usage : npm run report

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// dotenv/config only loads .env by default — load .env.local too if present.
const envLocalPath = path.join(root, ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]?.replace(/^["']|["']$/g, "") ?? "";
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local. " +
      "Copie .env.example vers .env.local et remplis tes vraies clés Supabase avant de relancer.",
  );
  process.exit(1);
}

const supabase = createClient(url, key);

function addSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(rows);
  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + columns.length)}1` };
  return sheet;
}

async function main() {
  console.log("Connexion à Supabase et collecte des données…");

  const [
    { data: profiles },
    { data: students },
    { data: classes },
    { data: timetableEntries },
    { data: teacherAbsences },
    { data: homework },
    { data: homeworkCompletions },
    { data: feedPosts },
    { data: postLikes },
    { data: postComments },
    { data: courseResources },
    { data: helpRequests },
    { data: smsLogs },
    { data: userBadges },
    { data: badges },
    { data: teachers },
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, parent_first_name, parent_last_name, role, status, phone, created_at"),
    supabase.from("students").select("id, first_name, last_name, class_name, parent_id, user_id"),
    supabase.from("classes").select("id, name"),
    supabase.from("timetable_entries").select("id, class_name, is_cancelled"),
    supabase.from("teacher_absences").select("id, teacher_id, starts_at, ends_at, reason"),
    supabase.from("homework").select("id, class_name, subject, due_date"),
    supabase.from("homework_completions").select("id, homework_id"),
    supabase.from("feed_posts").select("id, author_id, content, media_type, created_at"),
    supabase.from("post_likes").select("id, post_id"),
    supabase.from("post_comments").select("id, post_id"),
    supabase.from("course_resources").select("id, class_name, subject, file_name, uploaded_by, view_count"),
    supabase.from("help_requests").select("id, subject, status, created_at"),
    supabase.from("sms_logs").select("id, phone, trigger, status, created_at"),
    supabase.from("user_badges").select("id, user_id, badge_id, earned_at"),
    supabase.from("badges").select("id, code, label"),
    supabase.from("teachers").select("id, first_name, last_name"),
  ]);

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      p.full_name ?? ([p.parent_first_name, p.parent_last_name].filter(Boolean).join(" ") || "?"),
    ]),
  );
  const teacherNameById = new Map((teachers ?? []).map((t) => [t.id, `${t.first_name} ${t.last_name}`]));
  const badgeLabelById = new Map((badges ?? []).map((b) => [b.id, b.label]));
  const likesByPost = new Map();
  for (const l of postLikes ?? []) likesByPost.set(l.post_id, (likesByPost.get(l.post_id) ?? 0) + 1);
  const commentsByPost = new Map();
  for (const c of postComments ?? []) commentsByPost.set(c.post_id, (commentsByPost.get(c.post_id) ?? 0) + 1);
  const completionsByHomework = new Map();
  for (const c of homeworkCompletions ?? []) {
    completionsByHomework.set(c.homework_id, (completionsByHomework.get(c.homework_id) ?? 0) + 1);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CPK Learn — rapport automatique";
  workbook.created = new Date();

  // ---- Résumé ---------------------------------------------------------
  const roleCounts = {};
  const statusCounts = {};
  for (const p of profiles ?? []) {
    roleCounts[p.role] = (roleCounts[p.role] ?? 0) + 1;
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  }
  const helpStatusCounts = {};
  for (const h of helpRequests ?? []) helpStatusCounts[h.status] = (helpStatusCounts[h.status] ?? 0) + 1;
  const smsStatusCounts = {};
  for (const s of smsLogs ?? []) smsStatusCounts[s.status] = (smsStatusCounts[s.status] ?? 0) + 1;

  const summaryRows = [
    ["Utilisateurs — total", (profiles ?? []).length],
    ["  dont parents", roleCounts.parent ?? 0],
    ["  dont élèves", roleCounts.student ?? 0],
    ["  dont profs", roleCounts.teacher ?? 0],
    ["  dont staff", roleCounts.staff ?? 0],
    ["  dont admins", roleCounts.admin ?? 0],
    ["Comptes en attente de validation", statusCounts.pending ?? 0],
    ["Comptes validés", statusCounts.validated ?? 0],
    ["Élèves inscrits (fiches enfant)", (students ?? []).length],
    ["  dont avec compte de connexion", (students ?? []).filter((s) => s.user_id).length],
    ["Classes", (classes ?? []).length],
    ["Créneaux d'emploi du temps", (timetableEntries ?? []).length],
    ["  dont annulés (absence prof)", (timetableEntries ?? []).filter((e) => e.is_cancelled).length],
    ["Absences profs déclarées", (teacherAbsences ?? []).length],
    ["Devoirs assignés", (homework ?? []).length],
    ["Devoirs cochés (complétions élèves)", (homeworkCompletions ?? []).length],
    ["Publications sur le Mur social", (feedPosts ?? []).length],
    ["  dont avec photo/vidéo", (feedPosts ?? []).filter((p) => p.media_type).length],
    ["Likes sur le feed", (postLikes ?? []).length],
    ["Commentaires sur le feed", (postComments ?? []).length],
    ["Documents dans le Vault", (courseResources ?? []).length],
    ["Vues cumulées Vault", (courseResources ?? []).reduce((sum, r) => sum + (r.view_count ?? 0), 0)],
    ["Demandes d'aide — ouvertes", helpStatusCounts.open ?? 0],
    ["Demandes d'aide — en cours", helpStatusCounts.in_progress ?? 0],
    ["Demandes d'aide — closes", helpStatusCounts.closed ?? 0],
    ["SMS envoyés avec succès", smsStatusCounts.sent ?? 0],
    ["SMS échoués", smsStatusCounts.failed ?? 0],
    ["Badges décernés (total)", (userBadges ?? []).length],
  ];
  const summarySheet = workbook.addWorksheet("Résumé");
  summarySheet.columns = [
    { header: "Indicateur", key: "k", width: 42 },
    { header: "Valeur", key: "v", width: 14 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRows(summaryRows.map(([k, v]) => ({ k, v })));

  // ---- Utilisateurs -----------------------------------------------------
  addSheet(
    workbook,
    "Utilisateurs",
    [
      { header: "Nom", key: "name", width: 28 },
      { header: "Rôle", key: "role", width: 12 },
      { header: "Statut", key: "status", width: 12 },
      { header: "Téléphone", key: "phone", width: 16 },
      { header: "Inscrit le", key: "createdAt", width: 20 },
    ],
    (profiles ?? []).map((p) => ({
      name: nameById.get(p.id),
      role: p.role,
      status: p.status,
      phone: p.phone ?? "",
      createdAt: p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "",
    })),
  );

  // ---- Classes ------------------------------------------------------------
  const studentCountByClass = new Map();
  for (const s of students ?? []) studentCountByClass.set(s.class_name, (studentCountByClass.get(s.class_name) ?? 0) + 1);
  const timetableCountByClass = new Map();
  for (const e of timetableEntries ?? []) timetableCountByClass.set(e.class_name, (timetableCountByClass.get(e.class_name) ?? 0) + 1);

  addSheet(
    workbook,
    "Classes",
    [
      { header: "Classe", key: "name", width: 24 },
      { header: "Élèves", key: "students", width: 12 },
      { header: "Créneaux emploi du temps", key: "slots", width: 22 },
    ],
    (classes ?? []).map((c) => ({
      name: c.name,
      students: studentCountByClass.get(c.name) ?? 0,
      slots: timetableCountByClass.get(c.name) ?? 0,
    })),
  );

  // ---- Devoirs --------------------------------------------------------
  addSheet(
    workbook,
    "Devoirs",
    [
      { header: "Classe", key: "className", width: 20 },
      { header: "Matière", key: "subject", width: 20 },
      { header: "Date limite", key: "dueDate", width: 14 },
      { header: "Élèves l'ayant coché", key: "completions", width: 20 },
    ],
    (homework ?? []).map((h) => ({
      className: h.class_name,
      subject: h.subject,
      dueDate: h.due_date,
      completions: completionsByHomework.get(h.id) ?? 0,
    })),
  );

  // ---- Feed -------------------------------------------------------------
  addSheet(
    workbook,
    "Feed",
    [
      { header: "Auteur", key: "author", width: 24 },
      { header: "Contenu", key: "content", width: 50 },
      { header: "Type media", key: "mediaType", width: 12 },
      { header: "Likes", key: "likes", width: 10 },
      { header: "Commentaires", key: "comments", width: 14 },
      { header: "Publié le", key: "createdAt", width: 20 },
    ],
    (feedPosts ?? [])
      .slice()
      .sort((a, b) => (likesByPost.get(b.id) ?? 0) - (likesByPost.get(a.id) ?? 0))
      .map((p) => ({
        author: nameById.get(p.author_id) ?? "?",
        content: p.content,
        mediaType: p.media_type ?? "texte",
        likes: likesByPost.get(p.id) ?? 0,
        comments: commentsByPost.get(p.id) ?? 0,
        createdAt: new Date(p.created_at).toLocaleString("fr-FR"),
      })),
  );

  // ---- Vault --------------------------------------------------------------
  addSheet(
    workbook,
    "Vault",
    [
      { header: "Classe", key: "className", width: 20 },
      { header: "Matière", key: "subject", width: 20 },
      { header: "Fichier", key: "fileName", width: 30 },
      { header: "Uploadé par", key: "uploader", width: 24 },
      { header: "Vues", key: "views", width: 10 },
    ],
    (courseResources ?? [])
      .slice()
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .map((r) => ({
        className: r.class_name,
        subject: r.subject,
        fileName: r.file_name,
        uploader: nameById.get(r.uploaded_by) ?? "?",
        views: r.view_count ?? 0,
      })),
  );

  // ---- Absences profs -----------------------------------------------------
  addSheet(
    workbook,
    "Absences profs",
    [
      { header: "Professeur", key: "teacher", width: 24 },
      { header: "Début", key: "start", width: 20 },
      { header: "Fin", key: "end", width: 20 },
      { header: "Motif", key: "reason", width: 30 },
    ],
    (teacherAbsences ?? []).map((a) => ({
      teacher: teacherNameById.get(a.teacher_id) ?? "?",
      start: new Date(a.starts_at).toLocaleString("fr-FR"),
      end: new Date(a.ends_at).toLocaleString("fr-FR"),
      reason: a.reason ?? "",
    })),
  );

  // ---- SMS ------------------------------------------------------------------
  addSheet(
    workbook,
    "SMS",
    [
      { header: "Téléphone", key: "phone", width: 16 },
      { header: "Déclencheur", key: "trigger", width: 20 },
      { header: "Statut", key: "status", width: 12 },
      { header: "Envoyé le", key: "createdAt", width: 20 },
    ],
    (smsLogs ?? []).map((s) => ({
      phone: s.phone,
      trigger: s.trigger,
      status: s.status,
      createdAt: new Date(s.created_at).toLocaleString("fr-FR"),
    })),
  );

  // ---- Badges -----------------------------------------------------------
  addSheet(
    workbook,
    "Badges",
    [
      { header: "Utilisateur", key: "user", width: 24 },
      { header: "Badge", key: "badge", width: 24 },
      { header: "Obtenu le", key: "earnedAt", width: 20 },
    ],
    (userBadges ?? []).map((ub) => ({
      user: nameById.get(ub.user_id) ?? "?",
      badge: badgeLabelById.get(ub.badge_id) ?? "?",
      earnedAt: new Date(ub.earned_at).toLocaleString("fr-FR"),
    })),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = path.join(root, `rapport-cpk-${stamp}.xlsx`);
  await workbook.xlsx.writeFile(outPath);
  console.log(`Rapport généré : ${outPath}`);
}

main().catch((error) => {
  console.error("Échec de la génération du rapport :", error.message);
  process.exit(1);
});
