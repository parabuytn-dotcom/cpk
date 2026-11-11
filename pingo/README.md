# Pingo — app de révision

Application web installable (PWA) pour réviser les devoirs entre camarades de classe :
leçons guidées pas à pas, animations interactives, modèles 3D plein écran, quiz,
XP, séries de jours et classement. Mascotte : Pingo le pingouin.

- **Front** : Vite + Preact, three.js (chargé seulement à l'ouverture du labo 3D).
- **Données** : Supabase, schéma privé `pingo` ; l'app n'appelle que les fonctions
  `public.pingo_*` (inscription, connexion par téléphone + code à 4 chiffres, scores,
  classement). Le numéro de téléphone n'est jamais renvoyé par l'API.
- **Hébergement** : Vercel (dossier racine `pingo`).

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/
```

## Ajouter un devoir

1. Créer `src/content/<matiere>-<devoir>.js` sur le modèle de `svt-dc1.js`
   (unités → leçons → étapes `learn`, `qcm`, `tf`, `order`, `pairs`, `sort`, `labels`, `model`).
2. Le déclarer dans `src/content/catalog.js` (tableau `exams`, avec `data`).
