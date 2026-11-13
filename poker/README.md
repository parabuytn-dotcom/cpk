# All-In Academy — apprendre le Texas Hold'em

Site éducatif pour apprendre le **Texas Hold'em No-Limit** (le poker des casinos américains) :

- **Apprendre** : 12 leçons interactives (classement des mains, déroulement, actions, positions,
  mains de départ, outs, cote du pot, stratégie, casino aux USA) + quiz.
- **S'entraîner** : 5 exercices générés à l'infini (qui gagne, nommer sa main, préflop, outs, cote du pot).
- **Jouer** : table 3D (three.js) à 6 joueurs contre 5 bots aux styles différents, avec un coach
  qui calcule l'équité (Monte-Carlo), la cote du pot et les outs à chaque décision.
- Progression (XP, niveaux, records) sauvegardée dans le navigateur.

Stack : Vite + Preact + three.js, sans backend. Hébergement : Vercel (dossier racine `poker`).

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # tests du moteur (évaluateur, side pots, simulation de 2 400 mains)
npm run build   # dist/
```
