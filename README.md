# CPK Learn — cpkef.tn

Portail numérique du Collège Pilote du Kef (parents, élèves, professeurs, staff, administration).
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
3. Dans le **SQL Editor** du projet, colle et exécute **l'intégralité** de
   [`supabase/schema.sql`](./supabase/schema.sql). Le fichier est conçu pour
   être rejoué en entier à chaque mise à jour (tables/colonnes en
   `if not exists`, policies précédées d'un `drop policy if exists`) — aucune
   erreur "already exists" ne devrait apparaître.
4. (Optionnel) `SMS_GATEWAY_URL`/`SMS_GATEWAY_TOKEN` pour les alertes SMS
   (voir `src/lib/smsService.ts`), `SMTP_HOST/PORT/USER/PASSWORD` pour l'envoi
   d'email (voir `src/lib/emailService.ts`). Sans ça, les envois échouent
   proprement et sont journalisés.
5. Lance le serveur de dev :

```bash
npm run dev
```

## Structure

- `src/app/[locale]/…` — pages (App Router), une locale par segment
  (`fr` par défaut sans préfixe, `/ar/...`, `/en/...`).
- `src/proxy.ts` — routing i18n (next-intl) + rafraîchissement de session
  Supabase + protection de `/admin`.
- `src/lib/supabase/` — clients Supabase (browser, server anon, admin
  service-role, middleware).
- `src/lib/{auth,admin,social,vault,badges,notifications}/` — schémas zod,
  requêtes de lecture et Server Actions par domaine fonctionnel.
- `messages/{fr,ar,en}.json` — traductions next-intl.
- `supabase/schema.sql` — schéma complet + RLS + policies Storage.
- `scripts/generate-report.mjs` — génère un rapport Excel local (voir plus bas).

## Fonctionnalités disponibles

**Authentification** — inscription manuelle (CIN), par email, ou création de
compte enfant/prof en 1-clic depuis le panel admin/dashboard parent.
Connexion universelle par **numéro de téléphone** + mot de passe (ou email).
Statuts compte en attente/validé avec bannière et modal de bienvenue.

**Emploi du temps & absences** — saisie manuelle ou import CSV par classe,
créneaux barrés automatiquement quand un prof déclare son absence (lui-même
depuis son dashboard, ou l'admin), alerte SMS + notification aux parents
concernés.

**Cahier de texte numérique** — les profs assignent des devoirs par classe
(matière, description, date limite, priorité) ; les élèves cochent au fur et
à mesure.

**Mur social** — feed façon Instagram/Facebook : publication (texte, image ou
vidéo/reel) réservée aux personnes taguées `feed_publisher`/`reels_publisher`
(géré depuis `/admin/utilisateurs`) ; like et commentaire ouverts à tous les
connectés.

**Le Vault** — espace de partage de cours par classe (upload réservé au tag
`scribe`), compteur de vues.

**Badges** — 4 badges attribués automatiquement (uploads, vues, streak de
devoirs cochés, régularité sur le feed), 2 badges manuels (Junior Dev,
Fondateur) togglables depuis `/admin/utilisateurs`.

**Notifications** — cloche dans la navbar (site uniquement pour l'instant ;
`// TODO: Intégrer API Push Mobile` marque les points d'intégration futurs).

**Panel admin** — comptes (validation, rôles, tags, téléphone), classes,
profs, staff (photo optionnelle), emploi du temps, absences, aide, nouveautés.

**Pages publiques** — Staff, Plus de nous, Nouveautés, Aide, Confidentialité.

## Rapport Excel (données réelles)

```bash
npm run report
```

Génère `rapport-cpk-<date>.xlsx` à la racine du projet (ignoré par git — il
contient des données personnelles réelles). Nécessite un `.env.local` rempli
avec tes vraies clés Supabase (`NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`). Tourne uniquement en local, tes clés ne
quittent jamais ta machine. Onglets : Résumé (indicateurs clés), Utilisateurs,
Classes, Devoirs, Feed, Vault, Absences profs, SMS, Badges.

## Ce qui reste à construire

- Gestion des classes/tags depuis une interface encore plus poussée (recherche,
  pagination) si le nombre d'utilisateurs grandit beaucoup.
- Tips (conseils communautaires anciens élèves) — page publique existe,
  pas encore de formulaire de publication.
- Notifications push mobile (une fois l'app mobile en chantier).
- Labels des formulaires admin internes (Bloc 1/2) encore en français
  uniquement — le reste de la plateforme (pages publiques, dashboard,
  feed, Vault) est traduit FR/AR/EN.

Recherche `// TODO` dans le code pour les points d'intégration prévus.
