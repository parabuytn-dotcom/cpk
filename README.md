# CPK Learn — cpklearn.cloud

Portail numérique du Collège Pilote du Kef (parents, élèves, administration).
Next.js (App Router) + Tailwind CSS v4 + Supabase + next-intl (FR/AR/EN).

> **Next.js 16** est installé ici : `middleware.ts` a été renommé `proxy.ts`
> (voir `src/proxy.ts`), la fonctionnalité reste identique.

## Démarrage

```bash
npm install
cp .env.example .env.local
```

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **Project Settings > API**, copie l'URL et les clés dans `.env.local`.
3. Dans le **SQL Editor** du projet, exécute le contenu de
   [`supabase/schema.sql`](./supabase/schema.sql) pour créer les tables, les
   index et les policies RLS de base.
4. (Optionnel pour l'instant) Configure `SMS_GATEWAY_URL` /
   `SMS_GATEWAY_TOKEN` avec l'URL d'une app de passerelle SMS installée sur
   un téléphone Android relié au numéro **99766801** — voir
   `src/lib/smsService.ts`. Tant que ce n'est pas configuré, les envois de
   SMS échouent proprement et sont journalisés dans `sms_logs`.
5. Lance le serveur de dev :

```bash
npm run dev
```

## Structure

- `src/app/[locale]/…` — pages (App Router), une locale par segment
  (`fr` par défaut sans préfixe, `/ar/...`, `/en/...`).
- `src/proxy.ts` — routing i18n (next-intl) + rafraîchissement de session
  Supabase + protection de `/admin`.
- `src/lib/supabase/` — clients Supabase (browser, server, middleware).
- `src/lib/auth/` — schémas de validation (zod) et Server Actions
  d'authentification (inscription manuelle, email, connexion CIN/email).
- `src/lib/smsService.ts` + `src/app/api/sms/send/route.ts` — envoi de SMS
  via la passerelle configurable, réservé aux appels admin authentifiés.
- `messages/{fr,ar,en}.json` — traductions next-intl.
- `supabase/schema.sql` — schéma complet (profiles, students, classes,
  teachers, timetable_entries, teacher_absences, staff_members,
  help_requests, releases, tips, sms_logs) avec RLS.

## Phase 2 — Dashboard admin & emploi du temps (fait)

- `/admin/comptes` — validation des inscriptions parents en attente.
- `/admin/emploi-du-temps` — import CSV (colonnes `Jour,Heure_Début,Heure_Fin,Matière,Professeur`,
  virgule ou point-virgule) + saisie manuelle, par classe.
- `/admin/absences` — déclaration d'une absence prof (début/fin/motif) :
  annule automatiquement tous les créneaux récurrents concernés
  (`timetable_entries.is_cancelled`) et envoie une alerte via
  `lib/smsService.ts` aux parents des classes touchées.
- Espace parent (`/dashboard`) — liste des enfants + création 1-clic du
  compte enfant (mot de passe généré, affiché à l'écran, email best-effort
  via `lib/emailService.ts` / Brevo si `BREVO_API_KEY` est configuré et que
  le parent a un email réel).

## Roadmap (phases suivantes)

- **Phase 3** — Tests réels des alertes SMS une fois `SMS_GATEWAY_URL`
  configuré, historique/suivi des envois dans le dashboard admin.
- **Phase 4** — Upload photos (Supabase Storage), page "Le Staff" avec cartes
  + fallback design, formulaire Aide → file d'attente admin, changelog
  Releases, espace communautaire Tips, polish visuel final.

Recherche `// TODO` dans le code pour les points d'intégration prévus
(notifications push mobile notamment).
