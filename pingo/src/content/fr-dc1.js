/* Français · DC1 · Langue — Lycée Pilote El Kef, Mme Arfaoui (1re année).
   Subordonnées circonstancielles de temps, imparfait et passé simple, leurs emplois dans le récit. */

const L = (title, html, extra = {}) => ({ t: 'learn', title, html, ...extra });
const Q = (q, a, e) => ({ t: 'qcm', q, a, e });
const TF = (q, ok, e) => ({ t: 'tf', q, ok, e });
const F = (q, a, hint, e) => ({ t: 'fill', q, a: Array.isArray(a) ? a : [a], hint, e });
const CARD = (front, back) => ({ t: 'flash', front, back });
const RAPPORT = ['Antériorité', 'Simultanéité', 'Postériorité'];
const R = (sentence, good, e) => Q(`Quel rapport de temps ? « ${sentence} »`, [good, ...RAPPORT.filter((x) => x !== good)], e);

export const lab = null; // pas de labo 3D pour le français

export const units = [
  {
    id: 'temps', title: 'Les subordonnées de temps', sub: 'Grammaire · Module 1 : Rencontres', color: '#FF4D5E', dark: '#D93445',
    lessons: [
      {
        id: 'f1', title: 'Les 3 rapports de temps', icon: 'target', desc: 'Antériorité, simultanéité, postériorité.',
        steps: [
          L('Une phrase, deux propositions', '<p>Dans la phrase complexe, il y a :</p><ul><li>une <b class="r">proposition principale</b> (P.P.) ;</li><li>une <b class="r">proposition subordonnée circonstancielle de temps</b> (P.S.C.T.), introduite par une <b>conjonction</b> ou une <b>locution conjonctive</b>.</li></ul><p class="fr-ex"><span class="pp">Meaulnes lui présenta ses excuses</span> <span class="sub">lorsqu\'il la rencontra de nouveau.</span></p><p>La subordonnée dit <b>quand</b> se passe l\'action de la principale.</p>', { pingo: 'Pour trouver la subordonnée : cherche le petit mot qui l\'introduit (quand, avant que, depuis que…).' }),
          L('Les 3 rapports', '<p>Choisis un rapport et regarde où se placent les deux actions sur la frise.</p>', { w: 'frise' }),
          L('Le truc pour retenir', '<div class="memo"><b>« A-J-E attend le subjonctif »</b><br><b>A</b>vant que · <b>J</b>usqu\'à ce que · <b>E</b>n attendant que<br>→ ce sont les <b>seules</b> à prendre le <b>subjonctif</b> : l\'action n\'a pas encore eu lieu !</div><p>Toutes les autres (pendant que, quand, dès que, après que…) prennent l\'<b>indicatif</b>.</p><p class="note">« Avant que » est souvent suivi d\'un <b>ne</b> qui ne veut pas dire « pas » : « avant qu\'il ne fasse nuit ».</p>'),
          CARD('Antériorité : quelles conjonctions ?<br><small>+ quel mode ?</small>', '<b>avant que</b>, <b>jusqu\'à ce que</b>, <b>en attendant que</b><br><span class="tag-subj">+ SUBJONCTIF</span>'),
          CARD('Simultanéité : quelles conjonctions ?', '<b>pendant que, tandis que, au moment où, à mesure que, comme, chaque fois que, lorsque, quand, alors que</b><br><span class="tag-ind">+ INDICATIF</span>'),
          CARD('Postériorité : quelles conjonctions ?', '<b>après que, depuis que, dès que, aussitôt que, quand, lorsque</b><br><span class="tag-ind">+ INDICATIF</span>'),
          { t: 'sort', q: 'Range chaque conjonction', groups: { ant: 'Antériorité', sim: 'Simultanéité', post: 'Postériorité' }, items: [['avant que', 'ant'], ["jusqu'à ce que", 'ant'], ['en attendant que', 'ant'], ['pendant que', 'sim'], ['tandis que', 'sim'], ['au moment où', 'sim'], ['à mesure que', 'sim'], ['chaque fois que', 'sim'], ['après que', 'post'], ['depuis que', 'post'], ['dès que', 'post'], ['aussitôt que', 'post']] },
          Q('Quel mode après « jusqu\'à ce que » ?', ['Le subjonctif', 'L\'indicatif', 'Le conditionnel', 'L\'impératif'], 'A-J-E : avant que, jusqu\'à ce que, en attendant que → subjonctif.'),
          TF('« Après que » est suivi du subjonctif.', false, 'Piège classique : « après que » + INDICATIF. L\'action a déjà eu lieu.'),
          Q('« Quand » et « lorsque » peuvent exprimer…', ['La simultanéité ou la postériorité', 'Seulement l\'antériorité', 'Seulement la simultanéité', 'Aucun rapport de temps'], 'Ils sont dans les deux colonnes : tout dépend des temps des verbes.')
        ]
      },
      {
        id: 'f2', title: 'Trouver le rapport', icon: 'micro', desc: 'Les phrases de l\'exercice 1 et 2 de ta prof.',
        steps: [
          L('La méthode en 3 questions', '<ol><li><b>Souligne</b> la principale, <b>encadre</b> la subordonnée.</li><li>Repère la <b>conjonction</b> qui introduit la subordonnée.</li><li>Demande-toi : l\'action principale se passe <b>avant</b>, <b>pendant</b> ou <b>après</b> celle de la subordonnée ?</li></ol><div class="memo">Principale <b>avant</b> → antériorité · <b>en même temps</b> → simultanéité · <b>après</b> → postériorité</div>'),
          R("L'aviateur vivait seul, loin de toute terre habitée, depuis que son avion était tombé en panne.", 'Postériorité', 'Depuis que : il vit seul APRÈS la panne.'),
          R("Comme il allait se mettre à la réparation de son moteur, l'enfant lui demanda de lui dessiner un mouton.", 'Simultanéité', 'Comme : les deux actions ont lieu en même temps.'),
          R("L'aviateur vivra isolé dans le désert jusqu'à ce que son moteur soit complètement réparé.", 'Antériorité', "Jusqu'à ce que + subjonctif : il vit isolé AVANT la réparation."),
          R('Meaulnes a rencontré la belle jeune fille pendant qu\'il se trouvait à bord du bateau.', 'Simultanéité', 'Pendant que : en même temps.'),
          R('Avant que la jeune fille ne se soit présentée, Meaulnes lui déclara son admiration.', 'Antériorité', 'Avant que + subjonctif.'),
          R("Lorsqu'il la rencontra de nouveau au cours de la promenade, Meaulnes lui présenta ses excuses.", 'Simultanéité', 'Lorsque, avec deux passés simples : les deux actions sont simultanées.'),
          Q('Les enfants coururent à la rencontre de leurs parents ___ ils les virent descendre du train.', ['aussitôt qu\'', 'avant qu\'', 'en attendant qu\'', 'jusqu\'à ce qu\''], 'Ils courent juste APRÈS les avoir vus : postériorité.'),
          Q('La famille alla prendre un café ___ leurs bagages leur soient livrés.', ['en attendant que', 'depuis que', 'aussitôt que', 'chaque fois que'], '« soient » est au subjonctif : antériorité.'),
          Q('___ les parents voyagent, les enfants se retrouvent chez leurs grands-parents.', ['Chaque fois que', 'Avant que', 'Depuis que', 'En attendant que'], 'Répétition, en même temps : simultanéité.'),
          Q('___ le père a été nommé directeur, il part souvent en mission à l\'étranger.', ['Depuis que', 'Avant que', 'Pendant que', 'Comme'], 'Il part en mission APRÈS sa nomination : postériorité.'),
          Q('___ ils sortaient de la gare, ils croisèrent des amis qui partaient en vacances.', ['Comme', 'Avant qu\'', 'Depuis qu\'', 'En attendant qu\''], 'En même temps : simultanéité.'),
          Q('Ils restèrent longtemps à bavarder ___ chacun n\'aille de son côté.', ['avant que', 'depuis que', 'dès que', 'pendant que'], '« aille » est au subjonctif : avant que.')
        ]
      },
      {
        id: 'f3', title: 'Le bon temps, le bon mode', icon: 'pen', desc: 'Subjonctif, indicatif et concordance.',
        steps: [
          L('Postériorité : un temps composé', '<p>Touche chaque ligne du tableau.</p>', { w: 'concordance', pingo: 'C\'est le tableau de ton cahier : principale → subordonnée.' }),
          CARD('Principale à l\'<b>imparfait</b><br>→ subordonnée (postériorité) au… ?', '<b>plus-que-parfait</b><br>« Depuis qu\'ils <u>étaient revenus</u>, la famille se retrouvait chez eux. »'),
          CARD('Principale au <b>futur simple</b><br>→ subordonnée au… ?', '<b>futur antérieur</b><br>« Dès que le signal <u>aura été donné</u>, vous partirez. »'),
          CARD('Principale au <b>passé simple</b><br>→ subordonnée au… ?', '<b>passé antérieur</b><br>« Lorsque le grimpeur <u>fut arrivé</u> au sommet, la corde cassa. »'),
          { t: 'pairs', q: 'Associe le temps de la principale à celui de la subordonnée', pairs: [['Présent', 'Passé composé'], ['Imparfait', 'Plus-que-parfait'], ['Futur simple', 'Futur antérieur'], ['Passé simple', 'Passé antérieur']] },
          F('Toutes les fois que les enfants ___ dans la grande maison familiale, les cris et les rires fusaient de partout.', 'se réunissaient', '(se réunir) · simultanéité', 'Simultanéité avec une principale à l\'imparfait → imparfait.'),
          F("Les enfants pouvaient jouer dehors, mais ils devaient rentrer avant qu'il ne ___ nuit.", 'fasse', '(faire) · antériorité', 'Avant que + subjonctif présent : qu\'il fasse.'),
          F('Depuis que les vieux parents ___ vivre à la campagne, toute la famille se retrouvait chez eux.', 'étaient revenus', '(revenir) · postériorité', 'Principale à l\'imparfait → plus-que-parfait.'),
          F('Tandis que les femmes ___ aux tâches ménagères, les hommes accompagnaient le grand-père au champ.', 'vaquaient', '(vaquer) · simultanéité', 'Imparfait : vaquaient.'),
          F("Personne ne devait manger jusqu'à ce que toute la famille ___ réunie.", 'soit', '(être) · antériorité', "Jusqu'à ce que + subjonctif : soit."),
          Q('Dès que le repas ___ prêt, nous passerons à table.', ['aura été', 'était', 'soit', 'fut'], 'Principale au futur → futur antérieur.'),
          Q('Lorsque le premier grimpeur ___ au sommet, la corde cassa.', ['fut arrivé', 'est arrivé', 'soit arrivé', 'arriverait'], 'Principale au passé simple → passé antérieur.')
        ]
      },
      {
        id: 'f4', title: 'Complément ou subordonnée ?', icon: 'sparkle', desc: 'Les transformations des exercices 4 et 5.',
        steps: [
          L('Deux façons de dire « quand »', '<p>Une <b>subordonnée</b> de temps (avec un verbe conjugué) peut être remplacée par un <b>complément circonstanciel</b> de temps (un groupe nominal ou un gérondif), et inversement :</p><ul><li><span class="sub">Lorsque les invités arrivèrent</span> = <b>À l\'arrivée des invités</b></li><li><span class="sub">Pendant qu\'il écrivait la liste</span> = <b>En écrivant la liste</b> (gérondif)</li><li><span class="sub">Après avoir fini</span> (infinitif passé) = <b>Après qu\'il eut fini</b></li></ul><div class="memo">Le verbe devient un <b>nom</b> : arriver → l\'<b>arrivée</b> · partir → le <b>départ</b> · revenir → le <b>retour</b> · apparaître → l\'<b>apparition</b></div>'),
          { t: 'pairs', q: 'Associe la subordonnée au complément de même sens', pairs: [["Chaque fois qu'ils se rencontraient", 'À chacune de leurs rencontres'], ['Quand le père partit', 'Au départ du père'], ['Jusqu\'à ce que ses enfants retournent', "Jusqu'au retour de ses enfants"], ['Lorsque les invités arrivèrent', "À l'arrivée des invités"]] },
          { t: 'pairs', q: 'Et dans l\'autre sens : complément → subordonnée', pairs: [["À l'apparition du soleil", 'Lorsque le soleil apparut'], ['En écrivant la liste', "Pendant qu'il écrivait la liste"], ['Jusqu\'à la fin de la cérémonie', "Jusqu'à ce que la cérémonie soit finie"], ['Après le départ des invités', 'Après que les invités seront partis']] },
          Q("« Je remettrai la maison en ordre après le départ de tous les invités. » Quelle subordonnée a le même sens ?", ['Après que tous les invités seront partis', 'Après que tous les invités partent', 'Avant que tous les invités ne partent', 'Après que tous les invités soient partis'], 'Après que + indicatif ; principale au futur → futur antérieur.'),
          Q('« Toute la famille s\'est installée devant la télévision bien avant la transmission de la rencontre. » →', ['bien avant que la rencontre ne soit transmise', 'bien avant que la rencontre est transmise', 'bien après que la rencontre soit transmise', 'pendant que la rencontre était transmise'], 'Avant que + subjonctif.'),
          TF('« En traversant la rue » est un complément circonstanciel de temps (un gérondif).', true, 'Gérondif = en + participe présent. Il équivaut à « pendant que je traversais la rue ».')
        ]
      },
      { id: 'f5', title: 'Défi : les subordonnées de temps', icon: 'trophy', boss: true, desc: 'Rapports, conjonctions, modes et temps.', from: ['f1', 'f2', 'f3', 'f4'], bank: 't', n: 10 }
    ]
  },
  {
    id: 'conjug', title: "L'imparfait et le passé simple", sub: 'Conjugaison · terminaisons à connaître par cœur', color: '#2F6BFF', dark: '#1E4FD6',
    lessons: [
      {
        id: 'g1', title: "L'imparfait", icon: 'pen', desc: 'Une seule série de terminaisons pour tous les verbes.',
        steps: [
          L("Les terminaisons de l'imparfait", '<p>Les terminaisons sont <b>les mêmes pour tous les verbes</b> :</p><div class="memo big"><span class="nw">-ais</span> · <span class="nw">-ais</span> · <span class="nw">-ait</span> · <span class="nw">-ions</span> · <span class="nw">-iez</span> · <span class="nw">-aient</span></div><p>Joue avec le conjugueur : choisis un verbe, puis appuie sur <b>Cacher les terminaisons</b> pour te tester.</p>', { w: 'conjugueur' }),
          L('Les pièges', '<ul><li><b>-iss-</b> au 2e groupe : je fin<b>iss</b>ais.</li><li><b>Deux i</b> pour les verbes en -ier : nous cr<b>ii</b>ons, vous cr<b>ii</b>ez.</li><li><b>y + i</b> pour les verbes en -yer : nous pa<b>yi</b>ons, vous pa<b>yi</b>ez.</li><li>Être : j\'<b>étais</b> · Avoir : j\'<b>avais</b> (auxiliaires du plus-que-parfait).</li></ul>'),
          CARD("Imparfait : les 6 terminaisons ?", '<b>-ais, -ais, -ait, -ions, -iez, -aient</b><br><small>pour TOUS les verbes</small>'),
          F('Nous ___ (crier) de joie.', 'criions', 'imparfait', 'Verbe en -ier : radical cri- + ions = deux i.'),
          F('Vous ___ (payer) toujours en avance.', 'payiez', 'imparfait', 'pay- + iez.'),
          F('Lucile ___ grande et d\'une beauté remarquable.', 'était', '(être, imparfait)'),
          F('Elle ___ souvent au ciel des regards pleins de tristesse.', 'attachait', '(attacher, imparfait)'),
          F('Elle ___ autour d\'elle des regards pleins de feu.', 'promenait', '(promener, imparfait)'),
          F('Sa démarche, sa voix, son sourire ___ quelque chose de rêveur.', 'avaient', '(avoir, imparfait) · le sujet est pluriel'),
          F('Je ___ le journal depuis un quart d\'heure.', 'lisais', '(lire, imparfait)'),
          Q('Quelle forme est correcte ?', ['Nous finissions', 'Nous finions', 'Nous finisions', 'Nous finîmes'], '2e groupe : -iss- + ions.')
        ]
      },
      {
        id: 'g2', title: 'Le passé simple', icon: 'bolt', desc: '1er groupe en -ai, puis -is, -us, -ins.',
        steps: [
          L('4 familles de terminaisons', '<div class="memo"><b>1er groupe</b> (et aller) : -ai, -as, -a, -âmes, -âtes, -èrent<br><b>2e groupe</b> et 3e groupe modèle 1 : -is, -is, -it, -îmes, -îtes, -irent<br><b>3e groupe modèle 2</b> : -us, -us, -ut, -ûmes, -ûtes, -urent<br><b>Venir / tenir</b> : -ins, -ins, -int, -înmes, -întes, -inrent</div><p>Le <b>chapeau</b> (^) n\'est qu\'aux personnes <b>nous</b> et <b>vous</b> !</p>', { w: 'conjugueur', pingo: 'Appuie sur « Passé simple » en haut du conjugueur.' }),
          CARD('Quels verbes du 3e groupe font -is ?<br><small>modèle 1</small>', '<b>voir, faire, dire, partir, écrire, mettre, prendre…</b><br>je vis, je fis, je dis, je partis, j\'écrivis'),
          CARD('Quels verbes du 3e groupe font -us ?<br><small>modèle 2</small>', '<b>boire, vouloir, pouvoir, lire, vivre, mourir, valoir…</b><br>je bus, je voulus, je pus, je lus'),
          CARD('Être et avoir au passé simple ?', '<b>je fus</b>, tu fus, il fut, nous fûmes, vous fûtes, ils furent<br><b>j\'eus</b>, tu eus, il eut, nous eûmes, vous eûtes, ils eurent'),
          { t: 'sort', q: 'Range chaque verbe selon sa terminaison au passé simple', groups: { ai: '-ai (je chantai)', is: '-is (je finis)', us: '-us (je bus)', ins: '-ins (je vins)' }, items: [['chanter', 'ai'], ['aller', 'ai'], ['plonger', 'ai'], ['finir', 'is'], ['faire', 'is'], ['voir', 'is'], ['prendre', 'is'], ['boire', 'us'], ['pouvoir', 'us'], ['être', 'us'], ['venir', 'ins'], ['tenir', 'ins']] },
          TF('« Je fis » est le passé simple du verbe être.', false, 'Je fis = faire. Être : je fus.'),
          TF('« Je vis » peut être le passé simple de voir ou le présent de vivre.', true, 'Seul le contexte permet de savoir.'),
          F('Le marquis ___ la porte du salon.', 'ouvrit', '(ouvrir, passé simple)'),
          F('Une dame ___ et vint à la rencontre d\'Emma.', 'se leva', '(se lever, passé simple)'),
          F('Elle ___ à la rencontre d\'Emma.', 'vint', '(venir, passé simple)'),
          F('Elle la ___ asseoir près d\'elle.', 'fit', '(faire, passé simple)'),
          F('À sept heures, on ___ le dîner.', 'servit', '(servir, passé simple)'),
          F('Les bergers ___ leurs mulets.', 'chargèrent', '(charger, passé simple)', 'Chargèrent : 1er groupe, -èrent.'),
          F('Ils ___ la route et allèrent jusqu\'aux pâturages.', 'prirent', '(prendre, passé simple)'),
          F('Nous ___ dans la piscine.', 'plongeâmes', '(plonger, passé simple)', 'Verbe en -ger : on garde le e devant a → plongeâmes.'),
          F('Tu ___ une orangeade.', 'bus', '(boire, passé simple)'),
          F('Il ___ sa première médaille.', 'reçut', '(recevoir, passé simple)', 'Cédille devant u : reçut.'),
          F('Ils ___ tard.', 'revinrent', '(revenir, passé simple)'),
          F("J'___ le but.", 'atteignis', '(atteindre, passé simple)'),
          F('Le prince et la bergère ___ se marier.', 'purent', '(pouvoir, passé simple)'),
          F('Elles ___ vite.', 'coururent', '(courir, passé simple) · « Elle courut » au pluriel'),
          F('Il ___ un refrain.', 'chanta', '« Ils chantèrent » au singulier'),
          F('Je ___ le fleuve.', 'longeai', '« Nous longeâmes » au singulier', 'Longer : le e reste devant a → je longeai.')
        ]
      },
      { id: 'g3', title: 'Défi : conjugaison', icon: 'trophy', boss: true, desc: 'Écris les bonnes formes, sans te tromper d\'accent !', from: ['g1', 'g2'], bank: 'c', n: 12 }
    ]
  },
  {
    id: 'recit', title: 'Imparfait et passé simple dans le récit', sub: 'Leurs emplois et leurs valeurs', color: '#8B5CF6', dark: '#6D3FE0',
    lessons: [
      {
        id: 'h1', title: 'Arrière-plan et premier plan', icon: 'play', desc: 'Le décor et les actions qui font avancer l\'histoire.',
        steps: [
          L('Comme dans un film', '<p>Dans un récit au passé, l\'<b>imparfait</b> installe le <b>décor</b> et le <b>passé simple</b> fait surgir les <b>événements</b>. Regarde la scène.</p>', { w: 'scene' }),
          L("Les 3 valeurs de l'imparfait", '<ul><li><b class="r">Durée</b> (imparfait duratif) : l\'action dure, elle n\'est pas finie. « Il <u>était</u> une fois une vieille femme… »</li><li><b class="r">Description</b> (imparfait descriptif) : paysage, portrait. « Notre vieille maison <u>dominait</u> la rivière. »</li><li><b class="r">Habitude, répétition</b> (imparfait itératif) : « <u>Chaque matin</u>, elle se <u>levait</u> dès l\'aube. »</li></ul><div class="memo"><b>D-D-H</b> : Durée · Description · Habitude</div>'),
          L('Les valeurs du passé simple', '<ul><li>Action <b class="r">achevée et délimitée</b> (début et fin) : « À ce moment-là, on <u>entendit</u> un bruit. »</li><li>Action <b class="r">soudaine</b> : « …lorsque, soudain, une voiture <u>heurta</u> son véhicule. »</li><li>Actions <b class="r">brèves qui se succèdent</b> : « Le chien <u>aboya</u> et se <u>précipita</u> à la porte. »</li></ul><p class="note">Mots-signaux du passé simple : <b>soudain, tout à coup, alors, à ce moment-là</b>. Mots-signaux de l\'imparfait d\'habitude : <b>chaque matin, tous les jours, souvent</b>.</p>'),
          CARD("Imparfait : 3 valeurs ?", '<b>Durée</b> · <b>Description</b> · <b>Habitude</b> (répétition)<br><small>→ arrière-plan, action inachevée</small>'),
          CARD('Passé simple : 3 valeurs ?', 'Action <b>achevée</b> et délimitée · action <b>soudaine</b> · actions <b>brèves qui se succèdent</b><br><small>→ premier plan</small>'),
          { t: 'sort', q: 'Quelle valeur de l\'imparfait ?', groups: { dur: 'Durée', desc: 'Description', hab: 'Habitude' }, items: [['Il était une fois une pauvre femme…', 'dur'], ['Je lisais le journal depuis un quart d\'heure', 'dur'], ['Notre vieille maison dominait la rivière', 'desc'], ['Ses pierres de granit luisaient au soleil', 'desc'], ['Son visage était ravagé par les rides', 'desc'], ['Chaque matin, elle se levait dès l\'aube', 'hab'], ['Tous les matins, il partait travailler', 'hab']] },
          Q('« Nous regardions un film quand tout à coup notre chien aboya. » Le passé simple « aboya » exprime…', ['Une action soudaine, au premier plan', 'Une habitude', 'Une description', 'Une action qui dure'], '« Tout à coup » + passé simple : action soudaine.'),
          Q('« Je lisais le journal quand le téléphone sonna. » Quelle est l\'action principale (premier plan) ?', ['Le téléphone sonna', 'Je lisais le journal', 'Les deux', 'Aucune'], 'Le passé simple porte l\'action qui fait avancer l\'histoire.'),
          TF("L'imparfait exprime une action terminée, délimitée dans le temps.", false, "C'est le passé simple. L'imparfait exprime une action inachevée."),
          { t: 'sort', q: 'Imparfait ou passé simple ?', groups: { imp: 'Imparfait (décor)', ps: 'Passé simple (événement)' }, items: [['il faisait beau', 'imp'], ['les oiseaux chantaient', 'imp'], ['elle portait une robe bleue', 'imp'], ['soudain, il cria', 'ps'], ['le train entra en gare', 'ps'], ['quelques voyageurs descendirent', 'ps']] },
          Q('Quel temps choisir ? « Il ___ (pleuvoir) depuis le matin quand Paul ___ (arriver). »', ['pleuvait / arriva', 'plut / arrivait', 'pleuvait / arrivait', 'plut / arriva'], 'Le décor qui dure à l\'imparfait, l\'événement au passé simple.')
        ]
      },
      { id: 'h2', title: 'Défi : le récit', icon: 'trophy', boss: true, desc: 'Valeurs de l\'imparfait et du passé simple.', from: ['h1'], bank: 'r', n: 8 }
    ]
  },
  {
    id: 'final', title: 'Le grand défi', sub: 'Toute la langue du DC1', color: '#FF8A1F', dark: '#E06D00',
    lessons: [
      { id: 'z1', title: 'Le grand défi du devoir', icon: 'crown', boss: true, final: true, desc: '15 questions sur les trois chapitres. Vise 3 étoiles !', from: ['f1', 'f2', 'f3', 'f4', 'g1', 'g2', 'h1'], bank: 'all', n: 15, sort: true }
    ]
  }
];

export const bank = [
  ['t', 'Une proposition subordonnée de temps est introduite par…', ['Une conjonction ou une locution conjonctive', 'Un pronom relatif', 'Un adverbe seul', 'Un nom']],
  ['t', '« Au moment où » exprime…', ['La simultanéité', "L'antériorité", 'La postériorité', 'La cause']],
  ['t', '« Dès que » exprime…', ['La postériorité', "L'antériorité", 'La simultanéité', 'Le but']],
  ['t', '« En attendant que » est suivi…', ['Du subjonctif', "De l'indicatif", "De l'infinitif", 'Du conditionnel']],
  ['t', 'Choisis la phrase correcte :', ['Après qu\'il eut fini, il sortit.', 'Après qu\'il eût fini, il sortit.', 'Après qu\'il ait fini, il sortit.', 'Après qu\'il finisse, il sortit.']],
  ['c', 'Nous (aimer, passé simple) →', ['aimâmes', 'aimames', 'aimions', 'aimèrent']],
  ['c', 'Ils (finir, passé simple) →', ['finirent', 'finissèrent', 'finissaient', 'finèrent']],
  ['c', 'Vous (venir, passé simple) →', ['vîntes', 'vintes', 'venâtes', 'veniez']],
  ['c', 'Il (être, passé simple) →', ['fut', 'fit', 'était', 'fût']],
  ['c', 'Ils (avoir, imparfait) →', ['avaient', 'eurent', 'avèrent', 'avait']],
  ['r', "L'imparfait sert surtout à…", ['Planter le décor (arrière-plan)', 'Raconter les actions principales', 'Exprimer un ordre', 'Parler du futur']],
  ['r', 'Le passé simple exprime une action…', ['Achevée, délimitée dans le temps', 'Qui dure sans fin', 'Habituelle', 'Future']],
  ['r', '« Tous les dimanches, nous allions chez mamie. » L\'imparfait exprime…', ["L'habitude", 'La description', 'Une action soudaine', 'Une action achevée']]
];

export const sortGame = {
  q: 'Range chaque conjonction',
  groups: { ant: 'Antériorité (+ subj.)', sim: 'Simultanéité', post: 'Postériorité' },
  items: [['avant que', 'ant'], ['en attendant que', 'ant'], ['pendant que', 'sim'], ['tandis que', 'sim'], ['après que', 'post'], ['dès que', 'post'], ['depuis que', 'post']]
};
