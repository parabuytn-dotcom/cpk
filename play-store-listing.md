# Fiche Play Store — CPK Learn

## Description courte (80 caractères max)

```
Emploi du temps, devoirs, messages et vie du collège, en un seul endroit.
```

## Description longue (4000 caractères max)

```
CPK Learn est le portail numérique officiel du Collège Pilote du Kef, qui
connecte parents, élèves, professeurs et administration.

📅 EMPLOI DU TEMPS & ABSENCES
Consultez l'emploi du temps de la classe. Quand un professeur est absent,
le créneau est automatiquement marqué et les parents concernés reçoivent
une notification (et un SMS).

📝 CAHIER DE TEXTE
Les professeurs publient les devoirs par classe (matière, description,
date limite). Les élèves cochent leurs devoirs au fur et à mesure.

💬 MESSAGERIE
Un groupe de discussion par classe (parents, élèves et professeurs de
cette classe), plus des messages privés en un-à-un — en temps réel.

📰 FEED
Un mur d'actualités façon réseau social pour la vie du collège : annonces,
photos, vidéos. Chacun peut aimer et commenter.

📂 LE VAULT
Un espace de partage de cours : des élèves désignés uploadent les leçons
du jour pour aider les absents à rattraper.

🏅 BADGES
Des badges récompensent l'engagement et la régularité.

🔔 NOTIFICATIONS
Restez informé de tout ce qui vous concerne directement dans l'app.

Disponible en français, arabe et anglais.

Un compte est nécessaire — les comptes sont créés par l'administration du
collège ou par inscription avec validation. Pour toute question :
99766801 ou contact@cpkef.tn.
```

## Catégorie

Éducation

## Coordonnées (obligatoire dans Play Console)

- Email : contact@cpkef.tn
- Téléphone : +216 99 766 801
- Site web / politique de confidentialité : https://cpkef.tn/confidentialite

## Classification du contenu

Le questionnaire officiel se remplit dans Play Console (génère une note
d'âge automatiquement), mais pour référence : l'app ne contient pas de
violence, contenu sexuel, ni langage grossier. Elle contient un espace de
messagerie et un réseau social modérable par l'administration entre
personnes d'une même classe — signale bien cette fonctionnalité de
communication utilisateur dans le questionnaire (catégorie "Communication
entre utilisateurs" / "User-generated content").

---

# Formulaire "Sécurité des données" (Data safety)

Google demande, pour chaque catégorie de donnée : est-elle collectée ?
est-elle partagée avec des tiers ? est-elle chiffrée en transit ? l'utilisateur
peut-il demander sa suppression ?

## Résumé à cocher dans Play Console

| Catégorie                          | Collectée ? | Partagée avec des tiers ? | Pourquoi                                      |
|-------------------------------------|:-----------:|:--------------------------:|------------------------------------------------|
| Nom                                  | Oui | Non | Identification du compte, gestion scolaire      |
| Adresse email                        | Oui (optionnelle selon inscription) | Non | Connexion, contact                              |
| Numéro de téléphone                  | Oui | Non | Connexion, alertes SMS (absences profs)         |
| Identifiants nationaux (CIN)         | Oui | Non | Vérification d'identité du parent               |
| Photos                               | Oui (photo de profil, publications) | Non | Personnalisation du profil, réseau social interne |
| Messages (app)                       | Oui | Non | Fonctionnalité de messagerie de l'app           |
| Autre contenu généré par l'utilisateur (publications, commentaires, devoirs) | Oui | Non | Fonctionnalités principales de l'app |
| Localisation                         | Non | — | — |
| Informations financières             | Non | — | — |
| Historique de navigation web/appli   | Non | — | — |

## Réponses aux questions clés

- **Toutes les données sont-elles chiffrées en transit ?** Oui (HTTPS partout,
  base de données Supabase avec connexion chiffrée).
- **L'utilisateur peut-il demander la suppression de ses données ?** Oui, sur
  demande auprès de l'administration (99766801 / contact@cpkef.tn) — pas
  encore de suppression en libre-service dans l'app elle-même (à mentionner
  tel quel dans le formulaire : "Users can request account/data deletion by
  contacting contact@cpkef.tn").
- **Les données sont-elles vendues à des tiers ?** Non.
- **Y a-t-il de la publicité ou du tracking publicitaire ?** Non.

## URL de politique de confidentialité (champ obligatoire)

```
https://cpkef.tn/confidentialite
```

(remplace par l'URL Vercel actuelle — https://cpk-platform.vercel.app/confidentialite
— tant que le domaine cpkef.tn n'est pas branché)

---

# Fichiers à uploader dans Play Console

- **Icône (512×512)** : `dist/playstore-icon-512.png`
- **Image de couverture / feature graphic (1024×500)** : `dist/playstore-feature-graphic.png`
- **App Bundle (.aab)** : `dist/CPK-Learn.aab` — c'est ce fichier qu'il faut
  uploader dans Play Console (pas le .apk, qui reste utile pour tester en
  dehors du Store).
- **Captures d'écran** (2 minimum, format téléphone) : pas encore générées —
  dis-moi si tu veux que je les prenne depuis le site en direct.
