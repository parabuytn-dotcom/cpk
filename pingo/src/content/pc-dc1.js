/* Physique-Chimie · 1re année secondaire — Électrisation, la matière, intensité du courant.
   Nouveau type d'étape : calc { q, a: [mantisse, exposant], unit, steps } — réponse saisie en notation scientifique. */

const L = (title, html, extra = {}) => ({ t: 'learn', title, html, ...extra });
const Q = (q, a, e) => ({ t: 'qcm', q, a, e });
const TF = (q, ok, e) => ({ t: 'tf', q, ok, e });
const CALC = (q, a, unit, steps, hint) => ({ t: 'calc', q, a, unit, steps, hint });

export const lab = 'eau';

export const units = [
  {
    id: 'electrisation', title: "Le phénomène d'électrisation", sub: 'Série 1 · Charges électriques', color: '#8B5CF6', dark: '#6D3FE0',
    lessons: [
      {
        id: 'e1', title: 'Électrisation par frottement', icon: 'bolt', desc: 'Qui gagne des électrons, qui en perd ?',
        steps: [
          L('Frotter, ça charge !', '<p>Frotte un bâton avec un tissu en laine, et il devient <b class="r">électrisé</b> : il porte une charge électrique.</p><p>Choisis un bâton puis <b>frotte</b> (glisse ton doigt sur le dessin ou appuie sur le bouton).</p>', { w: 'frottement', pingo: 'Essaie le PVC puis le verre : ils ne se chargent pas pareil !' }),
          L("Le secret : l'électron", '<p>La charge négative est portée par une toute petite particule : l\'<b class="r">électron</b>.</p><p>Sa charge vaut <span class="mono">−1,6 × 10⁻¹⁹ C</span>. Le <b>coulomb (C)</b> est l\'unité de la charge électrique.</p><ul><li>Un corps chargé <b>négativement</b> a <b class="r">gagné</b> des électrons.</li><li>Un corps chargé <b>positivement</b> a <b class="r">perdu</b> des électrons.</li><li>Un corps <b>neutre</b> n\'a ni gagné ni perdu d\'électrons.</li></ul>'),
          L('Qui prend les électrons ?', '<ul><li><b>PVC ou ébonite</b> frotté avec la laine : le bâton <b>arrache des électrons</b> à la laine → bâton <b class="r">négatif</b>, laine positive.</li><li><b>Verre ou plexiglas</b> frotté avec la laine : la laine arrache des électrons au bâton → bâton <b class="r">positif</b>, laine négative.</li></ul><p>Dans le frottement, les deux corps prennent toujours des charges <b>de signes contraires</b>.</p>'),
          Q('Un bâton en verre frotté avec un tissu en laine se charge…', ['Positivement', 'Négativement', 'Il reste neutre', 'Ça dépend du tissu'], 'Le verre perd des électrons : il devient positif.'),
          Q('Un bâton en PVC frotté avec de la laine se charge négativement. Que devient la laine ?', ['Elle se charge positivement', 'Elle se charge négativement', 'Elle reste neutre', 'Elle gagne des électrons'], 'La laine a perdu des électrons, arrachés par le PVC.'),
          TF('Un corps chargé positivement a gagné des électrons.', false, 'Au contraire : il a perdu des électrons.'),
          { t: 'pairs', q: 'Associe chaque bâton frotté à sa charge', pairs: [['Verre', 'Positive (+)'], ['PVC', 'Négative (−)'], ['Électron', '−1,6 × 10⁻¹⁹ C'], ['Corps neutre', 'Ni gagné ni perdu']] },
          L('Attraction ou répulsion ?', '<p>Touche une boule pour changer sa charge, et regarde ce qui se passe.</p><ul><li>Charges de <b>même signe</b> : elles <b class="r">se repoussent</b>.</li><li>Charges de <b>signes contraires</b> : elles <b class="r">s\'attirent</b>.</li></ul>', { w: 'charges' }),
          Q('On approche un bâton de verre frotté d\'un bâton de PVC frotté. Que se passe-t-il ?', ['Ils s\'attirent', 'Ils se repoussent', 'Rien', 'Ils se déchargent'], 'Verre (+) et PVC (−) : signes contraires, donc attraction.'),
          Q('Deux bâtons de plexiglas frottés avec de la laine…', ['Se repoussent', 'S\'attirent', 'Ne font rien', 'Deviennent neutres'], 'Tous les deux sont positifs : même signe, répulsion.')
        ]
      },
      {
        id: 'e2', title: 'Contact et influence', icon: 'bolt', desc: 'Électriser sans frotter.',
        steps: [
          L('Par contact', '<p>On touche la boule d\'un <b>pendule électrostatique</b> avec un bâton d\'ébonite chargé négativement : la boule se charge <b>négativement</b>. Ensuite, le bâton la <b>repousse</b>.</p><p>C\'est l\'<b class="r">électrisation par contact</b> : le corps touché prend une charge <b>de même signe</b> que le corps électrisant.</p>', { w: 'pendule' }),
          { t: 'order', q: 'Remets dans l\'ordre l\'électrisation par contact', items: ['Le bâton chargé (−) touche la boule neutre', 'Des électrons passent du bâton à la boule', 'La boule est chargée négativement', 'Le bâton repousse la boule'] },
          L('Par influence', '<p>On <b>approche</b>, sans toucher, un bâton chargé de la boule métallique d\'un <b>électroscope</b> : ses feuilles (en or ou en aluminium) <b>se repoussent</b>.</p><p>C\'est l\'<b class="r">électrisation par influence</b>. Avec un bâton négatif, les feuilles se chargent <b>négativement</b>.</p>', { w: 'electroscope', pingo: 'Approche et éloigne le bâton avec le curseur.' }),
          L('Ce qui se passe vraiment', '<p>Frottement ou contact : c\'est toujours un <b>déplacement d\'électrons</b> d\'un corps vers un autre.</p><ul><li>Celui qui <b>perd</b> des électrons devient <b>positif</b>.</li><li>Celui qui <b>reçoit</b> des électrons devient <b>négatif</b>.</li></ul>'),
          Q('Quels sont les trois modes d\'électrisation ?', ['Frottement, contact, influence', 'Frottement, chauffage, contact', 'Contact, aimantation, influence', 'Frottement, lumière, contact'], 'Les 3 modes du cours.'),
          Q('Une boule neutre touchée par un bâton chargé négativement se charge…', ['Négativement', 'Positivement', 'Elle reste neutre', 'Une fois sur deux'], 'Par contact : même signe que le corps électrisant.'),
          TF('Dans l\'électrisation par influence, le bâton touche l\'électroscope.', false, 'Par influence, on approche seulement, sans toucher.'),
          Q('Les corps A et B sont frottés ensemble. B est repoussé par un corps C négatif. Quel est le signe de A ?', ['Positif', 'Négatif', 'Neutre', 'On ne peut pas savoir'], 'B est repoussé par C (−) donc B est négatif ; frottés ensemble, A et B ont des signes contraires : A est positif.')
        ]
      },
      {
        id: 'e3', title: 'Calculer une charge', icon: 'pi', desc: '|q| = n × e et les sous-multiples du coulomb.',
        steps: [
          L('La formule à connaître', '<p class="formula">|q| = n × e</p><ul><li><b>|q|</b> : valeur absolue de la charge, en coulomb (C)</li><li><b>n</b> : nombre d\'électrons gagnés ou perdus</li><li><b>e</b> = 1,6 × 10⁻¹⁹ C : la charge élémentaire</li></ul><p>Joue avec le calculateur : choisis un nombre d\'électrons.</p>', { w: 'qcalc' }),
          L('Les sous-multiples du coulomb', '<ul><li>1 mC (millicoulomb) = 10⁻³ C</li><li>1 µC (microcoulomb) = 10⁻⁶ C</li><li>1 nC (nanocoulomb) = 10⁻⁹ C</li><li>1 pC (picocoulomb) = 10⁻¹² C</li></ul><p>Pour trouver n, on retourne la formule : <b>n = |q| / e</b>.</p>', { pingo: 'Dans les exercices, convertis toujours en coulomb avant de calculer !' }),
          Q('1 µC (microcoulomb) vaut…', ['10⁻⁶ C', '10⁻³ C', '10⁻⁹ C', '10⁶ C'], 'Micro = un millionième.'),
          CALC('Un bâton d\'ébonite frotté porte q = −6,4 µC. Combien d\'électrons a-t-il reçus ?', [4, 13], 'électrons', ['n = |q| / e', 'n = 6,4 × 10⁻⁶ / 1,6 × 10⁻¹⁹', 'n = 4 × 10¹³ électrons'], 'Convertis d\'abord : 6,4 µC = 6,4 × 10⁻⁶ C.'),
          CALC('Une boule reçoit 2 × 10¹⁰ électrons. Quelle est la valeur de |q| en coulomb ?', [3.2, -9], 'C', ['|q| = n × e', '|q| = 2 × 10¹⁰ × 1,6 × 10⁻¹⁹', '|q| = 3,2 × 10⁻⁹ C = 3,2 nC', 'Elle a reçu des électrons : q = −3,2 nC']),
          CALC('Un bâton (A) a gagné 6 × 10¹³ électrons. Calcule |qA| en coulomb.', [9.6, -6], 'C', ['|qA| = n × e = 6 × 10¹³ × 1,6 × 10⁻¹⁹', '|qA| = 9,6 × 10⁻⁶ C = 9,6 µC', 'Il a gagné des électrons : qA = −9,6 µC']),
          Q('Après contact avec un bâton (B) neutre, le bâton (A) (qA = −9,6 µC) garde les 3/4 de sa charge. Quelle charge prend (B) ?', ['−2,4 µC', '−7,2 µC', '+2,4 µC', '−9,6 µC'], 'B prend le 1/4 restant : −9,6 / 4 = −2,4 µC, de même signe que A.'),
          CALC('Un corps (D) a une charge q = 8 mC après contact. Combien d\'électrons a-t-il perdus ?', [5, 16], 'électrons', ['8 mC = 8 × 10⁻³ C', 'n = |q| / e = 8 × 10⁻³ / 1,6 × 10⁻¹⁹', 'n = 5 × 10¹⁶ électrons'])
        ]
      },
      { id: 'e4', title: "Défi : l'électrisation", icon: 'trophy', boss: true, desc: 'Tout le chapitre, avec des calculs.', from: ['e1', 'e2', 'e3'], bank: 'e', n: 9 }
    ]
  },
  {
    id: 'matiere', title: 'La matière', sub: 'Série 2 · Constitution et structure', color: '#14B8C4', dark: '#0E939D',
    lessons: [
      {
        id: 'p1', title: 'Mélanges et corps purs', icon: 'leaf', desc: 'Homogène, hétérogène, alliage, organique.',
        steps: [
          L('Homogène ou hétérogène ?', '<ul><li><b class="r">Homogène</b> : à l\'œil nu, on ne distingue pas de parties différentes. Ex : <b>eau + alcool</b>, une seule <b>phase</b> liquide.</li><li><b class="r">Hétérogène</b> : on distingue des parties d\'aspects différents. Ex : <b>eau + huile</b>, deux phases.</li></ul><p>Verse, agite et observe.</p>', { w: 'melange' }),
          L('Corps pur', '<p>Un <b class="r">corps pur</b> est formé d\'<b>un seul constituant</b>. Ex : le fer, l\'or, l\'eau distillée.</p><p>Il a des <b>critères de pureté</b>. Pour l\'eau pure :</p><ul><li>température d\'ébullition : <b>100 °C</b></li><li>température de fusion : <b>0 °C</b></li><li>masse volumique : <b>1000 kg/m³</b></li></ul>'),
          L('Alliage et corps organiques', '<ul><li>Un <b class="r">alliage</b> est un solide homogène formé en général de deux métaux. Ex : l\'or 18 carats (or + cuivre).</li><li>Un corps <b class="r">organique</b> contient du <b>carbone</b>. Ex : l\'alcool.</li><li>Un corps <b class="r">inorganique</b> ne contient en général pas de carbone. Ex : l\'eau.</li></ul><p class="note">Piège : le carbone, le monoxyde et le dioxyde de carbone et les carbonates contiennent du carbone, mais ils sont classés <b>inorganiques</b>.</p>'),
          { t: 'sort', q: 'Range chaque substance', groups: { homo: 'Mélange homogène', hetero: 'Mélange hétérogène', pur: 'Corps pur' }, items: [['Eau + sable', 'hetero'], ['Eau + huile', 'hetero'], ['Eau + alcool', 'homo'], ['Eau de robinet', 'homo'], ['Air', 'homo'], ['Acier', 'homo'], ['Eau distillée', 'pur'], ['Fer', 'pur'], ['Dioxygène', 'pur'], ['Aluminium', 'pur']] },
          Q('Un alliage est…', ['Un solide homogène formé en général de deux métaux', 'Un liquide hétérogène', 'Un corps pur', 'Un gaz'], 'Ex : l\'or 18 carats.'),
          Q('Un corps organique contient toujours…', ['Du carbone', 'Du fer', 'De l\'eau', 'De l\'oxygène'], 'Organique = contient du carbone.'),
          TF('Le dioxyde de carbone est un corps organique.', false, 'Il contient du carbone mais il est classé parmi les corps inorganiques.'),
          Q('À quelle température bout l\'eau pure ?', ['100 °C', '0 °C', '50 °C', '1000 °C'], 'Critère de pureté de l\'eau.')
        ]
      },
      {
        id: 'p2', title: 'Les molécules', icon: 'atom', desc: 'Matière discontinue, tailles, solide-liquide-gaz.',
        steps: [
          L('Zoom dans la matière', '<p>La matière est <b>divisible</b>, mais cette division a une limite : la matière est <b class="r">discontinue</b>. Elle est faite de particules invisibles : les <b class="r">molécules</b>.</p>', { w: 'zoom' }),
          L('Une molécule, c\'est minuscule', '<ul><li>Taille : quelques <b>angströms</b>. <span class="mono">1 Å = 10⁻¹⁰ m</span></li><li>Masse : de l\'ordre de <b>10⁻²⁶ kg</b></li><li>Des molécules <b>identiques</b> forment un <b>corps pur</b> ; des molécules <b>différentes</b> forment un <b>mélange</b>.</li></ul>'),
          { t: 'model', title: 'Les molécules en 3D', html: '<p>Fais tourner la molécule d\'eau, le dioxyde de carbone, le dihydrogène et le dichlore.</p>', model: 'eau' },
          Q('1 Å (angström) vaut…', ['10⁻¹⁰ m', '10⁻⁶ m', '10⁻⁹ m', '10⁻³ m'], 'Retiens-le, il sert dans tous les calculs de longueur.'),
          L('Solide, liquide, gaz', '<ul><li><b class="r">Solide</b> : structure <b>condensée et ordonnée</b>.</li><li><b class="r">Liquide</b> : structure <b>condensée et désordonnée</b>.</li><li><b class="r">Gaz</b> : structure <b>non condensée et désordonnée</b>.</li></ul><p>Change d\'état et observe les molécules.</p>', { w: 'etats' }),
          { t: 'pairs', q: 'Associe chaque état à sa structure', pairs: [['Solide (fer)', 'Condensée et ordonnée'], ['Liquide (huile)', 'Condensée et désordonnée'], ['Gaz (dioxygène)', 'Non condensée et désordonnée']] },
          { t: 'model', title: 'Les états en 3D', html: '<p>Les trois états côte à côte : touche une étiquette pour zoomer.</p>', model: 'etats' },
          L('Les calculs de molécules', '<ul><li>Molécules mises <b>bout à bout</b> : <b>L = n × ℓ</b> (L : longueur de la file, ℓ : longueur d\'une molécule).</li><li>Masse : <b>M = n × m</b> (M : masse totale, m : masse d\'une molécule).</li></ul><p>Rappels : 1 cm = 10⁻² m, 1 g = 10⁻³ kg, 1 million = 10⁶, 1 milliard = 10⁹.</p>'),
          CALC('Combien de molécules de dihydrogène (ℓ = 0,75 Å) faut-il mettre bout à bout pour faire une file de L = 1,23 cm ?', [1.64, 8], 'molécules', ['L = 1,23 × 10⁻² m et ℓ = 0,75 × 10⁻¹⁰ m', 'n = L / ℓ = 1,23 × 10⁻² / 0,75 × 10⁻¹⁰', 'n = 1,64 × 10⁸ molécules']),
          CALC('On met bout à bout 500 millions de molécules de chlorure d\'hydrogène (ℓ = 1,2 Å). Longueur L de la file en mètres ?', [6, -2], 'm', ['500 millions = 5 × 10⁸', 'L = n × ℓ = 5 × 10⁸ × 1,2 × 10⁻¹⁰', 'L = 6 × 10⁻² m = 6 cm']),
          CALC('Une goutte d\'eau a une masse M = 0,018 g. Une molécule d\'eau a une masse m = 3 × 10⁻²⁶ kg. Nombre de molécules ?', [6, 20], 'molécules', ['M = 0,018 g = 0,018 × 10⁻³ kg', 'n = M / m = 0,018 × 10⁻³ / 3 × 10⁻²⁶', 'n = 6 × 10²⁰ molécules']),
          CALC('3 milliards de molécules de dichlore côte à côte font une file de 0,6 m. Longueur ℓ d\'une molécule, en mètres ?', [2, -10], 'm', ['3 milliards = 3 × 10⁹', 'ℓ = L / n = 0,6 / 3 × 10⁹', 'ℓ = 2 × 10⁻¹⁰ m = 2 Å'])
        ]
      },
      { id: 'p3', title: 'Défi : la matière', icon: 'trophy', boss: true, desc: 'Mélanges, molécules et calculs.', from: ['p1', 'p2'], bank: 'p', n: 9 }
    ]
  },
  {
    id: 'courant', title: 'Intensité du courant électrique', sub: 'Série 3 · Circuits et mesures', color: '#FF8A1F', dark: '#E06D00',
    lessons: [
      {
        id: 'c1', title: 'Le circuit électrique', icon: 'bolt', desc: 'Dipôles, sens du courant, court-circuit.',
        steps: [
          L('Les mots du circuit', '<ul><li><b class="r">Dipôle</b> : composant à deux bornes (pile, lampe…).</li><li><b class="r">Circuit fermé</b> : chaîne continue de dipôles avec au moins un <b>générateur</b>.</li><li><b>Générateur</b> : il fait circuler le courant (pile, batterie). <b>Récepteur</b> : il utilise le courant (lampe, moteur).</li><li><b>Conducteur</b> : laisse passer le courant (cuivre, fer). <b>Isolant</b> : ne le laisse pas passer (plastique, verre, bois).</li></ul>'),
          L('Le circuit en vrai', '<p>Ferme l\'interrupteur, puis court-circuite la lampe L1.</p><ul><li>Le <b>courant</b> va, à l\'extérieur du générateur, de la borne <b class="r">+</b> vers la borne <b class="r">−</b>.</li><li>Les <b>électrons</b> circulent dans le <b>sens contraire</b>.</li></ul>', { w: 'circuit', pingo: 'Regarde bien : les points bleus (électrons) vont dans l\'autre sens que les flèches rouges.' }),
          { t: 'sort', q: 'Conducteur ou isolant ?', groups: { cond: 'Conducteur', iso: 'Isolant' }, items: [['Cuivre', 'cond'], ['Fer', 'cond'], ['Aluminium', 'cond'], ['Or', 'cond'], ['Plastique', 'iso'], ['Verre', 'iso'], ['Bois', 'iso']] },
          L('Les symboles', '<p>Touche chaque symbole pour voir son nom.</p>', { w: 'symboles' }),
          L('Ce que fait le courant', '<p>Le courant a <b>4 effets</b> : <b>thermique</b> (il chauffe), <b>chimique</b>, <b>magnétique</b> et <b>lumineux</b>.</p><ul><li>Dans les <b>conducteurs solides</b>, le courant est un mouvement d\'ensemble d\'<b>électrons</b> libres.</li><li>Dans les <b>solutions ioniques</b>, c\'est un mouvement d\'ensemble d\'<b>ions</b>.</li></ul>'),
          TF('À l\'extérieur du générateur, les électrons vont de la borne + vers la borne −.', false, 'C\'est le sens conventionnel du courant. Les électrons vont dans le sens contraire, de − vers +.'),
          Q('Une lampe dont les bornes sont reliées par un fil…', ['Est court-circuitée et ne s\'allume pas', 'Brille plus fort', 'Grille immédiatement', 'Fonctionne normalement'], 'Un récepteur court-circuité est mis hors d\'usage.'),
          Q('Le générateur fournit les électrons au circuit par sa borne…', ['Négative (−)', 'Positive (+)', 'Les deux', 'Aucune'], 'Il les envoie par la borne − et les récupère par la borne +.'),
          Q('Quel symbole représente une lampe ?', ['Un cercle avec une croix (⊗)', 'Un cercle avec un A', 'Un cercle avec un M', 'Un triangle avec un trait'], 'A = ampèremètre, M = moteur, triangle + trait = diode.')
        ]
      },
      {
        id: 'c2', title: "Mesurer l'intensité", icon: 'target', desc: 'Ampèremètre, calibre, loi des nœuds.',
        steps: [
          L('Série ou parallèle ?', '<ul><li><b class="r">En série</b> : les dipôles sont liés les uns à la suite des autres.</li><li><b class="r">En parallèle</b> (dérivation) : ils ne sont pas à la suite. On distingue la <b>branche principale</b> (avec le générateur) et les <b>branches dérivées</b>.</li><li>Un point où se rencontrent plus de deux branches : un <b>nœud</b>. Une boucle fermée : une <b>maille</b>.</li></ul>'),
          L("L'ampèremètre", '<p>L\'intensité <b>I</b> se mesure en <b>ampère (A)</b> avec un <b class="r">ampèremètre</b>, branché <b>en série</b>.</p><p>Le courant entre par la borne <b>A</b> (rouge) et sort par la borne <b>COM</b> (noire).</p><p>Choisis un calibre et lis l\'aiguille.</p>', { w: 'amperemetre' }),
          L('Les formules de la mesure', '<p class="formula">I = (L × C) / E</p><ul><li><b>L</b> : lecture (division sur laquelle s\'arrête l\'aiguille)</li><li><b>C</b> : calibre utilisé (en A)</li><li><b>E</b> : échelle (nombre total de divisions)</li></ul><p>Le <b>calibre</b> est la plus grande intensité que l\'appareil peut mesurer. Le <b>plus petit calibre supérieur à I</b> donne la mesure la plus précise.</p><p>1 mA = 10⁻³ A et 1 µA = 10⁻⁶ A.</p>', { pingo: 'Si le calibre est plus petit que I, l\'aiguille sort de l\'échelle : interdit !' }),
          CALC('L\'aiguille s\'arrête sur la 25e division d\'une échelle de 30, avec le calibre 0,3 A. Intensité I en ampères ?', [2.5, -1], 'A', ['I = L × C / E', 'I = 25 × 0,3 / 30', 'I = 0,25 A']),
          CALC('Même courant (I = 0,25 A), même échelle de 30, mais calibre 0,5 A. Sur quelle division s\'arrête l\'aiguille ?', [1.5, 1], 'divisions', ['L = I × E / C', 'L = 0,25 × 30 / 0,5', 'L = 15 divisions']),
          Q('Pour mesurer I = 0,25 A, quel calibre choisir parmi 0,2 A, 0,3 A, 0,5 A et 1 A ?', ['0,3 A', '0,2 A', '0,5 A', '1 A'], 'Le plus petit calibre supérieur à 0,25 A.'),
          TF('On peut utiliser le calibre 0,2 A pour mesurer un courant de 0,25 A.', false, 'Le calibre doit être supérieur à l\'intensité, sinon l\'appareil peut être endommagé.'),
          CALC('Un ampèremètre de 100 divisions indique 80 graduations sur le calibre 500 mA. Intensité I en ampères ?', [4, -1], 'A', ['C = 500 mA = 0,5 A', 'I = L × C / E = 80 × 0,5 / 100', 'I = 0,4 A']),
          L('La loi des nœuds', '<p>La somme des intensités des courants qui <b>arrivent</b> à un nœud est égale à la somme des intensités qui en <b>sortent</b>.</p><p class="formula">I = I1 + I2</p><p>Règle les deux branches et vérifie.</p>', { w: 'noeuds' }),
          CALC('Dans la branche principale I = 0,4 A, dans la branche de L1 : I1 = 0,28 A. Calcule I2.', [1.2, -1], 'A', ['Loi des nœuds : I = I1 + I2', 'I2 = I − I1 = 0,4 − 0,28', 'I2 = 0,12 A']),
          L("Quantité d'électricité", '<p class="formula">I = Q / Δt  et  Q = n × e</p><ul><li><b>Q</b> : quantité d\'électricité qui traverse le dipôle (C)</li><li><b>Δt</b> : durée (s)</li><li><b>n</b> : nombre d\'électrons qui traversent le dipôle</li></ul>'),
          CALC('Un courant I = 0,4 A traverse une lampe pendant 5 minutes. Quantité d\'électricité Q en coulombs ?', [1.2, 2], 'C', ['Δt = 5 min = 300 s', 'Q = I × Δt = 0,4 × 300', 'Q = 120 C']),
          CALC('Q = 120 C traverse la lampe. Combien d\'électrons cela représente-t-il ?', [7.5, 20], 'électrons', ['n = Q / e = 120 / 1,6 × 10⁻¹⁹', 'n = 7,5 × 10²⁰ électrons'])
        ]
      },
      { id: 'c3', title: 'Défi : le courant', icon: 'trophy', boss: true, desc: 'Circuits, calibres et calculs.', from: ['c1', 'c2'], bank: 'c', n: 9 }
    ]
  },
  {
    id: 'final', title: 'Le grand défi', sub: 'Tout le devoir en un seul quiz', color: '#2F6BFF', dark: '#1E4FD6',
    lessons: [
      { id: 'f1', title: 'Le grand défi du devoir', icon: 'crown', boss: true, final: true, desc: '15 questions sur les trois chapitres. Vise 3 étoiles !', from: ['e1', 'e2', 'e3', 'p1', 'p2', 'c1', 'c2'], bank: 'all', n: 15, sort: true }
    ]
  }
];

export const bank = [
  ['e', 'Un bâton en plexiglas frotté avec un drap se charge…', ['Positivement', 'Négativement', 'Il reste neutre', 'Il devient un aimant']],
  ['e', 'Un corps électriquement neutre est un corps qui…', ['N\'a ni gagné ni perdu d\'électrons', 'A gagné des électrons', 'A perdu des électrons', 'N\'a pas d\'électrons']],
  ['e', 'Dans l\'électrisation par frottement, les deux corps se chargent…', ['De signes contraires', 'Du même signe', 'Positivement tous les deux', 'Négativement tous les deux']],
  ['e', 'L\'unité de la charge électrique est…', ['Le coulomb (C)', 'L\'ampère (A)', 'Le volt (V)', 'Le gramme (g)']],
  ['e', 'Un bâton (A) frotté par un tissu est attiré par un bâton de verre frotté. Le bâton (A) est…', ['Négatif', 'Positif', 'Neutre', 'En plexiglas']],
  ['p', 'L\'eau et le sable forment un mélange…', ['Hétérogène', 'Homogène', 'Pur', 'Organique']],
  ['p', 'L\'eau de robinet forme un mélange…', ['Homogène', 'Hétérogène', 'Organique', 'Solide']],
  ['p', 'La masse d\'une molécule est de l\'ordre de…', ['10⁻²⁶ kg', '10⁻¹⁰ kg', '1 g', '10⁻³ kg']],
  ['p', 'Des molécules identiques constituent…', ['Un corps pur', 'Un mélange', 'Un alliage', 'Une solution']],
  ['p', 'Un gaz a une structure…', ['Non condensée et désordonnée', 'Condensée et ordonnée', 'Condensée et désordonnée', 'Non condensée et ordonnée']],
  ['c', 'L\'ampèremètre se branche…', ['En série', 'En parallèle', 'Aux bornes de la lampe', 'Sans fil']],
  ['c', 'L\'unité de l\'intensité du courant est…', ['L\'ampère (A)', 'Le coulomb (C)', 'Le volt (V)', 'L\'ohm (Ω)']],
  ['c', '1 mA vaut…', ['10⁻³ A', '10⁻⁶ A', '10³ A', '10⁻⁹ A']],
  ['c', 'Le calibre d\'un ampèremètre, c\'est…', ['La plus grande intensité qu\'il peut mesurer', 'Le nombre de divisions', 'La lecture de l\'aiguille', 'La plus petite intensité mesurable']],
  ['c', 'Lequel n\'est PAS un effet du courant électrique ?', ['L\'effet sonore', 'L\'effet thermique', 'L\'effet chimique', 'L\'effet magnétique']]
];

export const sortGame = {
  q: 'Range chaque substance',
  groups: { homo: 'Mélange homogène', hetero: 'Mélange hétérogène', pur: 'Corps pur' },
  items: [['Eau + sable', 'hetero'], ['Eau + huile', 'hetero'], ['Eau + alcool', 'homo'], ['Air', 'homo'], ['Eau distillée', 'pur'], ['Fer', 'pur'], ['Aluminium', 'pur']]
};
