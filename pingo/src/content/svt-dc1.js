/* SVT · Devoir de contrôle 1 — TP1 La diversité des microbes, TP2 L'immunité non spécifique.
   Types d'étapes : learn, qcm (1re réponse = la bonne), tf, order (ordre correct), pairs, sort, labels, model */

const L = (title, html, extra = {}) => ({ t: 'learn', title, html, ...extra });
const Q = (q, a, e) => ({ t: 'qcm', q, a, e });
const TF = (q, ok, e) => ({ t: 'tf', q, ok, e });

export const units = [
  {
    id: 'microbes', title: 'Les microbes', sub: 'TP1 · La diversité des microbes', color: '#1FBF75', dark: '#139A5C',
    lessons: [
      {
        id: 'm1', title: "C'est quoi un microbe ?", icon: 'micro', desc: 'Définition, où on les trouve, leurs tailles.',
        steps: [
          L('Un monde invisible', '<p>Le monde microbien se caractérise par une <b class="r">grande diversité</b>.</p><p>Un <b>microbe</b> est un <b class="r">être vivant microscopique</b> : on ne peut le voir qu\'au <b>microscope</b>. On dit aussi <b>micro-organisme</b>.</p>', { pingo: 'Retiens bien cette définition, elle tombe souvent !' }),
          L('Ils sont partout', '<p>On en trouve dans <b>l\'eau</b>, <b>l\'air</b>, <b>le sol</b> et au niveau d\'autres organismes : sur ta peau, dans ta bouche, dans ton intestin…</p><p>Il existe <b>4 groupes</b> de microbes :</p>', { w: 'groups' }),
          Q('Un microbe, c\'est…', ['Un être vivant microscopique', 'Un objet minuscule non vivant', 'Toujours une bactérie', 'Un animal visible à l\'œil nu'], 'Microbe = être vivant microscopique (micro-organisme).'),
          L('Des tailles très différentes', '<p>Touche chaque microbe sur la règle. Chaque graduation est <b>10 fois</b> plus grande que la précédente.</p><p class="mono">1 µm = 10⁻⁶ m (un millionième de mètre)</p>', { w: 'scale' }),
          { t: 'order', q: 'Range du plus petit au plus grand', items: ['Virus', 'Bactérie', 'Levure', 'Paramécie'], e: 'Virus ≈ 0,1 µm < bactérie 0,2–2 µm < levure ≈ 10 µm < paramécie ≈ 0,2 mm.' },
          Q('1 µm (micromètre) vaut…', ['10⁻⁶ m', '10⁻³ m', '10⁻⁹ m', '10⁶ m'], 'Un micromètre, c\'est un millionième de mètre.'),
          TF('On peut voir une bactérie à l\'œil nu.', false, 'Une bactérie mesure 0,2 à 2 µm : il faut un microscope.'),
          { t: 'pairs', q: 'Associe chaque microbe à son groupe', pairs: [['Paramécie', 'Protozoaire'], ['Levure', 'Champignon'], ['Streptocoque', 'Bactérie'], ['VIH', 'Virus']] }
        ]
      },
      {
        id: 'm2', title: 'La paramécie', icon: 'micro', desc: 'Observation, schéma légendé, pourquoi c\'est un animal.',
        steps: [
          L('Observer une paramécie', '<p>On prélève, entre lame et lamelle, une goutte d\'<b>infusion de foin</b> (foin + eau pendant une semaine) ou de persil, puis on observe au microscope.</p>', { pingo: 'C\'est l\'activité 1 de ton TP !' }),
          L('Le schéma à connaître', '<p>Regarde : les <b>cils vibratiles</b> battent, les <b>vacuoles pulsatiles</b> se contractent et les <b>vacuoles digestives</b> tournent dans le cytoplasme.</p>', { w: 'paramecie' }),
          L('Ses caractéristiques', '<ul><li>Formée d\'<b>une seule cellule</b> : <b class="r">unicellulaire</b> (≠ pluricellulaire).</li><li>Possède un <b>vrai noyau</b>.</li><li>Sa membrane cytoplasmique <b>n\'est pas entourée d\'une paroi</b> → c\'est un <b class="r">animal</b>.</li><li>C\'est un microbe <b>inoffensif</b> (≠ pathogène).</li></ul>'),
          { t: 'labels', q: 'Légende la paramécie', w: 'paramecie' },
          Q('La paramécie est un animal car…', ['Sa membrane n\'est pas entourée d\'une paroi', 'Elle possède un noyau', 'Elle est unicellulaire', 'Elle vit dans l\'eau'], 'Pas de paroi autour de la membrane → animal (protozoaire).'),
          Q('La paramécie se déplace grâce à…', ['Ses cils vibratiles', 'Ses pseudopodes', 'Sa vacuole pulsatile', 'Ses spores'], 'Les cils battent tous ensemble comme des rames.'),
          TF('La paramécie est un microbe pathogène.', false, 'Elle est inoffensive (≠ pathogène).'),
          Q('Pour observer des paramécies, on utilise…', ['Une infusion de foin', 'Le liquide d\'un yaourt', 'De la levure + du glucose', 'Un fragment de pain moisi'], 'Infusion de foin (ou de persil).')
        ]
      },
      {
        id: 'm3', title: "L'amibe", icon: 'micro', desc: 'Pseudopodes, kyste et dysenterie amibienne.',
        steps: [
          L('Une cellule qui change de forme', '<p>L\'amibe est un <b>animal unicellulaire</b>. Son cytoplasme forme des <b class="r">pseudopodes</b> (« faux pieds ») qui assurent le <b>déplacement</b> et l\'<b>alimentation</b>.</p>', { w: 'amibe', pingo: 'Appuie sur le bouton pour la voir s\'enkyster !' }),
          L('S\'enkyster', '<p>Lorsque les conditions sont <b>défavorables</b> (manque de nourriture par exemple), elle <b class="r">s\'enkyste</b> : elle s\'entoure d\'une enveloppe et <b>ralentit sa vie</b>.</p>'),
          Q('L\'amibe se déplace et se nourrit grâce à…', ['Des pseudopodes', 'Des cils vibratiles', 'Un sporange', 'Des spores'], 'Son cytoplasme forme des pseudopodes.'),
          Q('Quand les conditions sont défavorables, l\'amibe…', ['S\'enkyste', 'Bourgeonne', 'Fabrique des spores', 'Se divise très vite'], 'Elle s\'entoure d\'une enveloppe : c\'est un kyste.'),
          L('L\'amibe peut rendre malade', '<p>Des <b>kystes</b> d\'amibes peuvent être avalés avec de l\'<b>eau</b> ou des <b>aliments souillés</b>. Dans le tube digestif, ils redeviennent des amibes qui se multiplient dans le <b>gros intestin (côlon)</b>.</p><p>Maladie : la <b class="r">dysenterie amibienne</b> (diarrhées, vomissements, selles sanglantes).</p>'),
          { t: 'order', q: 'Remets dans l\'ordre l\'histoire de la dysenterie amibienne', items: ['Des kystes sont avalés avec de l\'eau ou des aliments souillés', 'Dans le tube digestif, ils redeviennent des amibes', 'Les amibes se multiplient dans le côlon', 'Diarrhées, vomissements, selles sanglantes'] },
          Q('La dysenterie amibienne touche…', ['Le gros intestin (côlon)', 'L\'estomac', 'Les poumons', 'Le cerveau'], 'Les amibes se multiplient dans le côlon.'),
          TF('L\'amibe est un animal unicellulaire.', true, 'Une seule cellule, pas de paroi : c\'est un protozoaire.')
        ]
      },
      {
        id: 'm4', title: 'Les moisissures', icon: 'leaf', desc: 'Mycélium, sporange, Penicillium et Trichophyton.',
        steps: [
          L('La moisissure du pain', '<p>C\'est un <b>champignon microscopique filamenteux</b>. L\'ensemble de ses filaments forme le <b class="r">mycélium</b>.</p><p>Certains filaments se terminent par un sac rempli de <b>spores</b> : le <b class="r">sporange</b>. Les spores germent et donnent de nouvelles moisissures.</p>', { w: 'moisissure', pingo: 'Libère les spores et regarde-les germer sur le pain.' }),
          Q('L\'ensemble des filaments d\'une moisissure s\'appelle…', ['Le mycélium', 'Le sporange', 'Le bourgeon', 'Le kyste'], 'Mycélium = ensemble des filaments.'),
          Q('Le sac rempli de spores au bout d\'un filament est…', ['Le sporange', 'Le mycélium', 'La vacuole', 'Le pseudopode'], 'Sporange = sac rempli de spores.'),
          L('Le Penicillium', '<p>Le <i>Penicillium notatum</i> (doc 14 p 98) est une <b class="g">moisissure verte</b>. On l\'utilise pour fabriquer le célèbre <b>antibiotique</b> : la <b class="r">pénicilline</b>. C\'est un microbe <b>utile</b>.</p>'),
          L('Le Trichophyton', '<p>Champignon filamenteux qui se nourrit de <b class="r">kératine</b> (docs 15 et 16 p 98). Il infecte la <b>peau</b> et les <b>cheveux</b>.</p><p>C\'est l\'agent de la <b class="r">teigne</b>, caractérisée par une <b>chute des cheveux</b>.</p>'),
          { t: 'pairs', q: 'Associe chaque mot à sa définition', pairs: [['Penicillium', 'Pénicilline'], ['Trichophyton', 'Teigne'], ['Mycélium', 'Ensemble des filaments'], ['Sporange', 'Sac rempli de spores']] },
          Q('Le Trichophyton se nourrit de…', ['Kératine', 'Glucose', 'Chlorophylle', 'Mucus'], 'D\'où l\'attaque de la peau et des cheveux.'),
          TF('La teigne provoque une chute des cheveux.', true, 'Teigne = maladie due au Trichophyton.')
        ]
      },
      {
        id: 'm5', title: 'La levure', icon: 'leaf', desc: 'Bourgeonnement et conclusion sur les champignons.',
        steps: [
          L('Un champignon unicellulaire', '<p>La <b>levure de boulanger</b> (taille ≈ <span class="mono">10 µm</span>) sert à fabriquer le pain. La <b>levure de bière</b> est aussi utile.</p><p>Pour l\'observer : levure + eau + <b>glucose</b> pendant ¼ d\'heure, puis une goutte entre lame et lamelle.</p>'),
          L('Le bourgeonnement', '<p>Avance étape par étape pour voir comment la levure se multiplie.</p>', { w: 'levure' }),
          { t: 'model', title: 'La levure en 3D', html: '<p>Fais-la tourner, zoome, et coupe-la en deux pour voir son <b>noyau</b> et sa <b>paroi</b>.</p>', model: 'levure' },
          { t: 'order', q: 'Remets les étapes du bourgeonnement dans l\'ordre', items: ['Un bourgeon apparaît sur la cellule mère', 'Le noyau se divise', 'Le bourgeon grossit avec son noyau', 'Le bourgeon se sépare : c\'est la cellule fille'] },
          L('Conclusion : les champignons', '<ul><li>Moisissures et levures sont des <b class="r">eucaryotes</b> : le noyau est vrai, entouré d\'une <b>enveloppe nucléaire</b>.</li><li>Leur cellule a une <b>paroi</b> → ce ne sont <b>pas des animaux</b>.</li><li><b class="g">Pas de chlorophylle</b> → ce ne sont pas des végétaux : ce sont des <b>champignons</b>.</li></ul>', { pingo: 'Cette conclusion est une question de cours classique !' }),
          Q('Les champignons ne sont pas des végétaux car…', ['Ils n\'ont pas de chlorophylle', 'Ils ont une paroi', 'Ils ont un vrai noyau', 'Ils sont microscopiques'], 'L\'absence de chlorophylle les classe parmi les champignons.'),
          Q('Les champignons ne sont pas des animaux car…', ['Leurs cellules ont une paroi', 'Ils ont un noyau', 'Ils sont filamenteux', 'Ils font des spores'], 'Une paroi entoure la membrane cytoplasmique.'),
          Q('Un eucaryote est un être vivant dont les cellules…', ['Ont un vrai noyau entouré d\'une enveloppe', 'N\'ont pas de noyau', 'N\'ont pas de membrane', 'Ont un seul chromosome libre'], 'Eucaryote = vrai noyau.')
        ]
      },
      {
        id: 'm6', title: 'Les bactéries', icon: 'micro', desc: 'Coques, bacilles, bipartition, procaryotes.',
        steps: [
          L('Toutes petites', '<p>Les bactéries sont des organismes <b class="r">unicellulaires</b> de taille <span class="mono">0,2 à 2 µm</span>. On en trouve partout, même dans la bouche et le côlon.</p>'),
          L('Les coques', '<p>Cellule <b>arrondie</b> (sphérique) :</p><ul><li><b class="g">Diplocoques</b> : par deux. Ex : <b>méningocoques</b> → <b class="r">méningite</b> (inflammation des méninges).</li><li><b class="g">Streptocoques</b> : en <b>chaînette</b> → abcès, <b class="r">angines</b>, rhumatisme, caries dentaires.</li><li><b class="g">Staphylocoques</b> : en <b>grappe</b>.</li></ul>', { w: 'bactForms' }),
          { t: 'pairs', q: 'Associe chaque forme', pairs: [['Diplocoques', 'Par deux'], ['Streptocoques', 'En chaînette'], ['Staphylocoques', 'En grappe'], ['Bacilles', 'En bâtonnet']] },
          L('Les bacilles', '<p>En forme de <b>bâtonnet</b> :</p><ul><li><i>Escherichia coli</i> : vit dans le côlon.</li><li><b>Bacille de Koch</b> (BK) → <b class="r">tuberculose</b>.</li><li><b>Lactobacille</b> (bacille du lait) : <b class="g">utile</b>, il fait le yaourt.</li></ul><p>Au TP : frottis de yaourt, séché, fixé à l\'alcool, coloré au <b>bleu de méthylène</b>.</p>'),
          Q('Les méningocoques sont des…', ['Diplocoques', 'Bacilles', 'Streptocoques', 'Virus'], 'Groupés par deux, responsables de la méningite.'),
          L('La bipartition', '<p>Une bactérie grandit puis se coupe en deux : c\'est la <b class="r">bipartition</b>.</p>', { w: 'bipartition' }),
          { t: 'model', title: 'La bactérie en 3D', html: '<p>Coupe-la en deux : <b>pas de noyau</b>, juste un chromosome dans le cytoplasme.</p>', model: 'bacille' },
          L('Conclusion : les procaryotes', '<ul><li>Toutes les bactéries sont des <b class="g">procaryotes</b> : pas de vrai noyau.</li><li>Le matériel génétique est <b class="r">un seul chromosome</b> qui <b>baigne</b> dans le cytoplasme.</li><li>La membrane est entourée d\'une <b>paroi</b>.</li></ul>'),
          Q('Chez la bactérie, le matériel génétique est…', ['Un seul chromosome dans le cytoplasme', 'Dans un vrai noyau', 'Dans une vacuole', 'Absent'], 'Procaryote : pas de noyau.'),
          TF('Le lactobacille est pathogène.', false, 'Il est utile : il fabrique le yaourt.'),
          Q('Le bacille de Koch provoque…', ['La tuberculose', 'La méningite', 'La rage', 'La teigne'], 'BK = agent de la tuberculose.')
        ]
      },
      {
        id: 'm7', title: 'Les virus', icon: 'micro', desc: 'Acellulaires et parasites obligatoires.',
        steps: [
          L('Pas vraiment des cellules', '<p>Les virus mesurent au maximum <b>quelques dixièmes de µm</b>. Ce ne sont <b>pas de véritables cellules</b> : ils sont <b class="r">acellulaires</b>.</p><p>Ils ne peuvent pas se reproduire de manière <b>autonome</b>.</p>'),
          L('Comment un virus se multiplie', '<p>Avance étape par étape.</p>', { w: 'virus' }),
          { t: 'model', title: 'Le virus en 3D', html: '<p>Le virus de la grippe : une enveloppe hérissée de protéines, et du matériel génétique à l\'intérieur.</p>', model: 'virus' },
          { t: 'order', q: 'Remets le cycle du virus dans l\'ordre', items: ['Fixation sur la cellule', 'Pénétration dans la cellule', 'Multiplication avec les structures de la cellule', 'Libération : la cellule est détruite'] },
          Q('Pourquoi dit-on que les virus sont des parasites ?', ['Ils ne se multiplient que dans une cellule, qu\'ils détruisent', 'Ils fabriquent des spores', 'Ils ont une paroi', 'Ils mangent avec des pseudopodes'], 'Ils dépendent d\'une cellule hôte et la détruisent.'),
          { t: 'pairs', q: 'Associe chaque virus à sa maladie', pairs: [['VIH', 'SIDA'], ['Rhabdovirus', 'Rage'], ['Poliovirus', 'Paralysie (poliomyélite)'], ['Influenza', 'Grippe']] },
          TF('Un virus peut se multiplier tout seul dans l\'eau.', false, 'Il doit obligatoirement pénétrer dans une cellule.')
        ]
      },
      { id: 'm8', title: 'Défi : les microbes', icon: 'trophy', boss: true, desc: 'Un mélange de questions sur tout le TP1.', from: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'], bank: 'm', n: 10, sort: true }
    ]
  },
  {
    id: 'immunite', title: "L'immunité non spécifique", sub: 'TP2 · Les défenses naturelles', color: '#2F6BFF', dark: '#1E4FD6',
    lessons: [
      {
        id: 'i1', title: 'Les barrières naturelles', icon: 'shield', desc: 'Pourquoi on dit « non spécifique ».',
        steps: [
          L('Toujours attaqué', '<p>L\'organisme est <b>en permanence</b> exposé à des microbes, dont certains sont <b class="r">pathogènes</b>.</p><p>Pour se protéger, il dispose de moyens de <b class="r">défense naturels</b> qui s\'opposent à la pénétration des microbes <b>sans distinction</b>.</p><p>C\'est l\'<b class="r">immunité non spécifique</b>.</p>'),
          Q('L\'immunité non spécifique agit…', ['Contre tous les microbes, sans distinction', 'Contre un seul microbe précis', 'Seulement après un vaccin', 'Seulement contre les virus'], 'Sans distinction : c\'est pour ça qu\'elle est « non spécifique ».'),
          TF('L\'organisme est exposé aux microbes seulement de temps en temps.', false, 'Il y est exposé en permanence.'),
          L('Les barrières du corps', '<p>Les surfaces du corps en contact direct avec les microbes sont <b>la peau</b> et <b>les muqueuses</b>. Touche chaque point.</p>', { w: 'body' }),
          Q('Les surfaces en contact direct avec les microbes sont…', ['La peau et les muqueuses', 'Le cœur et les poumons', 'Les os', 'Le sang'], 'Peau + muqueuses = barrières naturelles.')
        ]
      },
      {
        id: 'i2', title: 'La peau', icon: 'shield', desc: 'Couche cornée, sueur et larmes.',
        steps: [
          L('Une barrière physique', '<p>La peau est une <b>barrière physique</b> efficace grâce à sa <b class="r">couche cornée</b>.</p>', { w: 'peau', pingo: 'Essaie la blessure : tu vas voir pourquoi on désinfecte une plaie !' }),
          Q('La peau est une barrière physique grâce à…', ['Sa couche cornée', 'Sa sueur', 'Ses larmes', 'Son mucus'], 'La couche cornée empêche les microbes de passer.'),
          L('Sueur et larmes', '<p>La <b>sueur</b> est sécrétée par les <b class="r">glandes sudoripares</b>, les <b>larmes</b> par les <b class="r">glandes lacrymales</b>.</p><p>Elles ont une <b>acidité</b> qui ralentit le développement de certains microbes.</p>', { pingo: 'Pour le devoir, retiens bien les deux noms de glandes.' }),
          { t: 'pairs', q: 'Associe', pairs: [['Sueur', 'Glandes sudoripares'], ['Larmes', 'Glandes lacrymales'], ['Couche cornée', 'Barrière physique'], ['Acidité', 'Ralentit les microbes']] },
          TF('Une blessure ouvre une porte d\'entrée aux microbes.', true, 'La barrière est ouverte : il faut désinfecter.')
        ]
      },
      {
        id: 'i3', title: 'Les muqueuses', icon: 'shield', desc: 'Le mucus et le suc gastrique.',
        steps: [
          L('Le mucus piège tout', '<p>Les muqueuses sont des tissus qui tapissent les <b class="r">voies respiratoires</b> (nasales, bronches, bronchioles), les <b class="r">voies digestives</b> et <b class="r">urogénitales</b>.</p><p>Le <b>mucus</b> qu\'elles sécrètent <b>retient</b> les microbes et les poussières, qui sont ensuite <b>éliminés</b>.</p>', { w: 'muqueuse' }),
          Q('Le rôle du mucus est de…', ['Retenir les microbes et les poussières', 'Fabriquer des anticorps', 'Digérer les aliments', 'Produire la sueur'], 'Ils sont ensuite éliminés (mouchage, toux…).'),
          Q('Les muqueuses tapissent notamment…', ['Les voies respiratoires, digestives et urogénitales', 'Uniquement la peau', 'Les os', 'Les muscles'], 'Respiratoires, digestives, urogénitales.'),
          L('Le suc gastrique', '<p>Dans l\'estomac, le <b>suc gastrique</b> est très <b class="r">acide</b> : il détruit la plupart des microbes avalés.</p>'),
          TF('Le suc gastrique est très acide.', true, 'Il détruit les microbes avalés.')
        ]
      },
      {
        id: 'i4', title: 'Bonus : la phagocytose', icon: 'sparkle', bonus: true, desc: 'Pas encore dans tes notes : probablement la suite du cours.',
        steps: [
          L('Si un microbe passe quand même…', '<p>Certains <b>globules blancs</b>, les <b class="r">phagocytes</b>, avalent et détruisent les microbes. Eux aussi agissent <b>sans distinction</b>.</p><p class="note">Ce n\'est pas dans tes notes : vérifie avec ton prof s\'il tombe au devoir.</p>', { w: 'phago' }),
          { t: 'order', q: 'Remets les étapes de la phagocytose dans l\'ordre', items: ['Adhésion', 'Ingestion', 'Digestion', 'Rejet des déchets'] }
        ]
      },
      { id: 'i5', title: "Défi : l'immunité", icon: 'trophy', boss: true, desc: 'Toutes les questions sur le TP2.', from: ['i1', 'i2', 'i3'], bank: 'i', n: 8 }
    ]
  },
  {
    id: 'final', title: 'Le grand défi', sub: 'Tout le devoir en un seul quiz', color: '#FF8A1F', dark: '#E06D00',
    lessons: [
      { id: 'f1', title: 'Le grand défi du devoir', icon: 'crown', boss: true, final: true, desc: '15 questions sur tout le programme. Vise 3 étoiles !', from: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'i1', 'i2', 'i3'], bank: 'all', n: 15, sort: true }
    ]
  }
];

/* Questions supplémentaires pour les défis */
export const bank = [
  ['m', 'Le classement du plus petit au plus grand :', ['Virus < bactérie < levure < paramécie', 'Bactérie < virus < levure < paramécie', 'Levure < bactérie < virus < paramécie', 'Virus < levure < bactérie < paramécie']],
  ['m', 'Pour colorer les bactéries du yaourt, on utilise…', ['Du bleu de méthylène', 'De l\'eau iodée', 'Du glucose', 'Du sel']],
  ['m', 'Une bactérie se multiplie par…', ['Bipartition', 'Bourgeonnement', 'Spores', 'Enkystement']],
  ['m', 'Les staphylocoques sont groupés…', ['En grappe', 'En chaînette', 'Par deux', 'En filaments']],
  ['m', 'Les streptocoques peuvent causer…', ['Des angines et des caries', 'La tuberculose', 'La rage', 'La teigne']],
  ['m', 'Les virus sont…', ['Acellulaires', 'Des bactéries', 'Des cellules eucaryotes', 'Des champignons']],
  ['m', 'La levure se multiplie par…', ['Bourgeonnement', 'Bipartition', 'Enkystement', 'Pseudopodes']],
  ['m', 'La pénicilline est fabriquée à partir de…', ['Penicillium notatum', 'Trichophyton', 'La levure de bière', 'Escherichia coli']],
  ['m', 'Taille de la levure de boulanger :', ['Environ 10 µm', 'Environ 1 mm', 'Environ 0,1 µm', 'Environ 1 cm']],
  ['m', 'Les bactéries sont des…', ['Procaryotes', 'Eucaryotes', 'Virus', 'Champignons']],
  ['m', 'Le VIH est le virus…', ['Du SIDA', 'De la rage', 'De la grippe', 'De la poliomyélite']],
  ['m', 'La méningite est…', ['Une inflammation des méninges', 'Une maladie de la peau', 'Une infection du côlon', 'Une chute des cheveux']],
  ['i', 'La sueur est sécrétée par…', ['Les glandes sudoripares', 'Les glandes lacrymales', 'Les muqueuses', 'L\'estomac']],
  ['i', 'Les larmes sont sécrétées par…', ['Les glandes lacrymales', 'Les glandes sudoripares', 'Les bronches', 'Le derme']],
  ['i', 'Selon le cours, sueur et larmes protègent grâce à…', ['Leur acidité', 'Leur couleur', 'Leur mucus', 'Leur couche cornée']],
  ['i', 'Le suc gastrique protège car il est…', ['Très acide', 'Sucré', 'Visqueux', 'Chaud']],
  ['i', 'L\'organisme est exposé aux microbes…', ['En permanence', 'Occasionnellement', 'Seulement l\'hiver', 'Seulement quand il est blessé']]
];

export const sortGame = {
  q: 'Range chaque microbe dans son groupe',
  groups: { proto: 'Protozoaires', champ: 'Champignons', bact: 'Bactéries', virus: 'Virus' },
  items: [['Paramécie', 'proto'], ['Amibe', 'proto'], ['Moisissure du pain', 'champ'], ['Penicillium', 'champ'], ['Trichophyton', 'champ'], ['Levure', 'champ'], ['Méningocoque', 'bact'], ['Streptocoque', 'bact'], ['Bacille de Koch', 'bact'], ['Lactobacille', 'bact'], ['VIH', 'virus'], ['Rhabdovirus', 'virus']]
};
