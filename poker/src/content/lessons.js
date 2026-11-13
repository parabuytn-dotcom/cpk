// Parcours de formation au Texas Hold'em No-Limit (le poker joué dans les casinos américains).
// Blocs : p, h, cards, tip, rankings, compare, streets, actions, positions, chart, outs, list, table

export const CHAPTERS = [
  { id: 'regles', title: 'Les règles', desc: 'Tout ce qu\'il faut pour s\'asseoir à une table.' },
  { id: 'fondamentaux', title: 'Les fondamentaux', desc: 'Lire le board, la position, les mains de départ.' },
  { id: 'maths', title: 'Les maths (faciles !)', desc: 'Outs, cotes du pot : décider comme un pro.' },
  { id: 'pro', title: 'Jouer comme un pro', desc: 'Stratégie gagnante et casino américain.' }
];

export const LESSONS = [
  {
    id: 'bases', chapter: 'regles', icon: '🎯', title: 'Le but du jeu', minutes: 3,
    intro: 'Le Texas Hold\'em No-Limit, c\'est LE poker des casinos américains, de Las Vegas et des World Series of Poker (WSOP).',
    blocks: [
      { t: 'p', text: 'Chaque joueur reçoit **2 cartes privées** (face cachée, rien que pour lui). Ensuite, le croupier pose **5 cartes communes** au milieu de la table, que **tout le monde** peut utiliser.' },
      { t: 'cards', cards: 'Ah Kd', label: 'Tes 2 cartes privées (hole cards)' },
      { t: 'cards', cards: 'Kh 9c 4s Ks 2d', label: 'Les 5 cartes communes (le board)' },
      { t: 'p', text: 'Ta main, c\'est **la meilleure combinaison de 5 cartes** parmi les 7 disponibles (tes 2 + les 5 communes). Ici, tu as {Ah Kd} + {Kh Ks} sur le board : un **brelan de Rois** !' },
      { t: 'h', text: 'Comment on gagne ?' },
      { t: 'list', items: [
        '**Option 1 :** tous les autres joueurs abandonnent (ils « se couchent ») → tu gagnes le pot sans montrer tes cartes.',
        '**Option 2 :** on arrive à l\'abattage (le **showdown**) → ceux qui restent montrent leurs cartes, la meilleure main de 5 cartes gagne.'
      ] },
      { t: 'tip', kind: 'tip', text: 'Le **pot**, c\'est la pile de jetons au centre : toutes les mises de la main. Le but n\'est pas de gagner le plus de mains, mais de gagner le plus de **jetons**.' },
      { t: 'h', text: '« No-Limit », ça veut dire quoi ?' },
      { t: 'p', text: 'Tu peux miser **autant que tu veux**, jusqu\'à tous tes jetons d\'un coup : c\'est le fameux **all-in** (tapis). C\'est ce qui rend le jeu si spectaculaire.' },
      { t: 'tip', kind: 'us', text: 'Aux USA, on joue en **cash game** (les jetons valent de l\'argent réel, ex. table « 1/2 » = blindes de 1 $ et 2 $) ou en **tournoi** (tout le monde part avec le même tapis, le dernier qui a des jetons gagne).' }
    ],
    quiz: [
      { q: 'Combien de cartes privées reçoit chaque joueur ?', opts: ['1', '2', '4', '5'], a: 1, why: 'Au Texas Hold\'em, chacun reçoit 2 cartes privées (au Omaha, c\'est 4).' },
      { q: 'Ta main finale est composée de…', opts: ['Tes 2 cartes seulement', 'Les 7 cartes', 'Les 5 meilleures cartes parmi les 7', 'Les 5 cartes communes'], a: 2, why: 'On garde toujours la meilleure combinaison de 5 cartes parmi tes 2 cartes + les 5 communes.' },
      { q: 'Que signifie « all-in » ?', opts: ['Miser tous ses jetons', 'Se coucher', 'Regarder une carte gratuite', 'Doubler la mise'], a: 0, why: 'All-in (tapis) = tu mets tous tes jetons au milieu.' },
      { q: 'Peut-on gagner un pot sans montrer ses cartes ?', opts: ['Non, jamais', 'Oui, si tous les autres se couchent', 'Seulement avec un As', 'Seulement au tournoi'], a: 1, why: 'Si tout le monde abandonne face à ta mise, tu gagnes sans montrer : c\'est comme ça qu\'on bluffe !' }
    ]
  },
  {
    id: 'cartes', chapter: 'regles', icon: '🂡', title: 'Les cartes & le vocabulaire', minutes: 3,
    intro: 'Un jeu de 52 cartes, 4 couleurs, 13 valeurs. Et des mots anglais que tu entendras partout.',
    blocks: [
      { t: 'h', text: 'Les 4 couleurs (suits)' },
      { t: 'table', rows: [['Symbole', 'Français', 'Anglais (USA)'], ['♠', 'Pique', 'Spades'], ['♥', 'Cœur', 'Hearts'], ['♦', 'Carreau', 'Diamonds'], ['♣', 'Trèfle', 'Clubs']] },
      { t: 'tip', kind: 'warn', text: 'Au poker, **aucune couleur n\'est plus forte qu\'une autre**. Un As de pique ne bat pas un As de cœur : c\'est une égalité.' },
      { t: 'h', text: 'Les 13 valeurs (ranks), de la plus forte à la plus faible' },
      { t: 'cards', cards: 'As Ks Qs Js Ts 9s 8s 7s 6s 5s 4s 3s 2s', size: 'sm', label: 'A (As) · K (Roi / King) · Q (Dame / Queen) · J (Valet / Jack) · 10 (noté « T ») … 2' },
      { t: 'p', text: 'Sur les sites et dans les livres américains, le 10 s\'écrit souvent **T** (« Ten »). Ainsi « AKs » veut dire As-Roi de la même couleur (**s**uited) et « QJo » Dame-Valet de couleurs différentes (**o**ffsuit).' },
      { t: 'p', text: 'L\'**As est spécial** : il est la carte la plus haute, mais il peut aussi servir de « 1 » dans la petite suite {As 2d 3c 4h 5s} (appelée la *wheel*).' },
      { t: 'h', text: 'Les mots à connaître' },
      { t: 'table', rows: [['Anglais', 'Français', 'Sens'], ['Hole cards', 'Cartes privées', 'Tes 2 cartes'], ['Board', 'Tableau', 'Les cartes communes'], ['Pot', 'Pot', 'Les jetons à gagner'], ['Blinds', 'Blindes', 'Mises obligatoires'], ['Stack', 'Tapis / pile', 'Tes jetons'], ['Showdown', 'Abattage', 'On montre les cartes']] }
    ],
    quiz: [
      { q: 'Que signifie « suited » ?', opts: ['Deux cartes de même valeur', 'Deux cartes de la même couleur', 'Une paire', 'Deux figures'], a: 1, why: 'Suited = assorties : même couleur (ex. {Ah Kh}).' },
      { q: 'Le Cœur est-il plus fort que le Pique ?', opts: ['Oui', 'Non, les couleurs sont égales', 'Seulement à l\'abattage', 'Seulement aux USA'], a: 1, why: 'Il n\'y a aucune hiérarchie entre les couleurs au poker.' },
      { q: 'Que vaut « T » dans « KTs » ?', opts: ['Trois', 'Dix', 'Treize', 'Trèfle'], a: 1, why: 'T = Ten = 10. KTs = Roi-Dix assortis.' },
      { q: 'Comment dit-on « Dame » en anglais ?', opts: ['King', 'Jack', 'Queen', 'Lady'], a: 2, why: 'Queen (Q). King = Roi (K), Jack = Valet (J).' }
    ]
  },
  {
    id: 'mains', chapter: 'regles', icon: '🏆', title: 'Le classement des mains', minutes: 6,
    intro: 'LA leçon la plus importante : savoir quelle main bat quelle main. Apprends-les par cœur !',
    blocks: [
      { t: 'p', text: 'Il existe 10 combinaisons. Clique sur chacune pour voir un exemple et combien elle est rare. Plus une main est rare, plus elle est forte.' },
      { t: 'rankings' },
      { t: 'tip', kind: 'tip', text: 'Astuce mémoire : **la Couleur bat la Quinte** (il est plus dur d\'avoir 5 cartes de la même couleur que 5 cartes qui se suivent), et **le Full bat la Couleur**.' },
      { t: 'h', text: 'Et en cas d\'égalité de combinaison ?' },
      { t: 'p', text: 'Si deux joueurs ont la même combinaison, on compare la hauteur : une paire de Rois bat une paire de Dames. Si c\'est encore égal, on regarde la carte suivante : le **kicker** (carte d\'accompagnement).' },
      { t: 'compare', board: 'Ah 9d 6c 4s 2h', hands: [{ name: 'Joueur A', cards: 'Ad Kc' }, { name: 'Joueur B', cards: 'As Jd' }], note: 'Les deux ont une paire d\'As, mais A a un kicker Roi contre un kicker Valet : A gagne.' },
      { t: 'compare', board: 'Kh Kd 7s 7c Qh', hands: [{ name: 'Joueur A', cards: 'Ad 2c' }, { name: 'Joueur B', cards: '3s 4d' }], note: 'Les deux ont Double paire Rois et Sept. Pour la 5ᵉ carte, A utilise son As, B utilise la Dame du board : A gagne.' },
      { t: 'compare', board: 'Ts Jh Qd Kc Ah', hands: [{ name: 'Joueur A', cards: '2c 2d' }, { name: 'Joueur B', cards: '9s 9h' }], note: 'La quinte à l\'As est sur le board : tout le monde « joue le board ». Égalité, le pot est partagé (split pot) !' }
    ],
    quiz: [
      { q: 'Qu\'est-ce qui est le plus fort ?', opts: ['Une Quinte', 'Une Couleur'], a: 1, why: 'La Couleur (Flush) bat la Quinte (Straight).' },
      { q: 'Un Full, c\'est…', opts: ['Deux paires', 'Un brelan + une paire', '5 cartes qui se suivent', '4 cartes identiques'], a: 1, why: 'Full (Full house) = brelan + paire, ex. {Kh Kd Ks 7c 7h}.' },
      { q: 'Quelle main gagne ? A : {Qh Qd} — B : {Ah Kd} sur un board {Jc 7s 4h 3d 2c}', opts: ['A', 'B', 'Égalité'], a: 0, why: 'A a une paire de Dames. B n\'a qu\'une hauteur As. Une paire bat toujours une carte haute.' },
      { q: 'Combien de cartes compte une main de poker ?', opts: ['2', '5', '7', 'Ça dépend'], a: 1, why: 'Toujours exactement 5 cartes. La 6ᵉ et la 7ᵉ ne comptent jamais.' },
      { q: 'Le Brelan bat-il la Double paire ?', opts: ['Oui', 'Non'], a: 0, why: 'Oui : Brelan (Three of a kind) > Double paire (Two pair).' },
      { q: 'Quelle est la plus petite quinte possible ?', opts: ['{2s 3h 4d 5c 6s}', '{As 2h 3d 4c 5s}', '{3s 4h 5d 6c 7s}'], a: 1, why: 'A-2-3-4-5 (la « wheel ») : l\'As compte comme un 1.' }
    ]
  },
  {
    id: 'deroulement', chapter: 'regles', icon: '🔄', title: 'Déroulement d\'une main', minutes: 5,
    intro: 'Une main se joue en 4 tours d\'enchères : Préflop, Flop, Turn, River. Suis une main en entier, étape par étape.',
    blocks: [
      { t: 'h', text: 'Avant de distribuer : le bouton et les blindes' },
      { t: 'p', text: 'Un jeton **« DEALER »** (le bouton) indique qui est le donneur fictif. Il tourne d\'une place vers la gauche à chaque main. Les deux joueurs à sa gauche posent des mises **obligatoires** :' },
      { t: 'list', items: [
        '**Petite blinde (Small Blind, SB)** : le joueur juste à gauche du bouton pose la moitié de la mise de base.',
        '**Grosse blinde (Big Blind, BB)** : le joueur suivant pose la mise de base complète.'
      ] },
      { t: 'tip', kind: 'tip', text: 'Les blindes servent à mettre de l\'argent au milieu dès le départ : sans elles, tout le monde attendrait d\'avoir des As !' },
      { t: 'streets' },
      { t: 'tip', kind: 'warn', text: 'Le sens du jeu est **toujours vers la gauche** (sens des aiguilles d\'une montre). Préflop, le premier à parler est à gauche de la grosse blinde ; aux tours suivants, c\'est le premier joueur encore en jeu à gauche du bouton.' },
      { t: 'tip', kind: 'us', text: 'Avant chaque nouvelle carte commune, le croupier **brûle** une carte (il la met de côté face cachée) pour éviter la triche.' }
    ],
    quiz: [
      { q: 'Combien de cartes au Flop ?', opts: ['1', '2', '3', '5'], a: 2, why: 'Le Flop = 3 cartes communes d\'un coup. Puis la Turn (1) et la River (1).' },
      { q: 'Dans quel ordre arrivent les tours ?', opts: ['Flop, River, Turn', 'Préflop, Flop, Turn, River', 'Turn, Flop, River', 'Préflop, Turn, Flop, River'], a: 1, why: 'Préflop → Flop (3 cartes) → Turn (4ᵉ) → River (5ᵉ) → Abattage.' },
      { q: 'Qui pose la grosse blinde ?', opts: ['Le bouton', 'Le joueur à gauche du bouton', 'Le 2ᵉ joueur à gauche du bouton', 'Le croupier'], a: 2, why: 'Gauche du bouton = petite blinde ; le suivant = grosse blinde.' },
      { q: 'Qui parle en premier au préflop ?', opts: ['La petite blinde', 'Le joueur à gauche de la grosse blinde', 'Le bouton', 'La grosse blinde'], a: 1, why: 'Préflop, on commence à gauche de la grosse blinde (position « Under the Gun »).' }
    ]
  },
  {
    id: 'actions', chapter: 'regles', icon: '🗣️', title: 'Les actions : check, bet, call, raise, fold', minutes: 5,
    intro: 'Quand c\'est ton tour de parler, tu as le choix entre 5 actions. Voici exactement quand utiliser chacune.',
    blocks: [
      { t: 'actions' },
      { t: 'h', text: 'Les règles de mise en No-Limit' },
      { t: 'list', items: [
        'La **mise minimum** est égale à la grosse blinde.',
        'Une **relance** doit être au moins égale à la relance précédente. Exemple : blindes 10/20, quelqu\'un relance à 60 (+40). Tu dois relancer au moins à 100 (+40).',
        'Tu peux toujours relancer jusqu\'à **tout ton tapis** (all-in).',
        'Le tour d\'enchères se termine quand tout le monde a mis la même somme (ou s\'est couché / est à tapis).'
      ] },
      { t: 'tip', kind: 'tip', text: 'Si tu n\'as pas assez pour suivre une mise, tu peux quand même faire tapis : tu ne peux alors gagner que la part du pot que tu as couverte. Le reste forme un **pot annexe** (side pot) entre les autres joueurs.' },
      { t: 'tip', kind: 'us', text: 'Au casino, ce que tu **annonces à voix haute** t\'engage. Dire « Raise » puis poser seulement l\'équivalent d\'un call = tu dois relancer. Et poser ses jetons en plusieurs fois (« string bet ») est interdit : annonce ton montant ou pose tout d\'un coup.' }
    ],
    quiz: [
      { q: 'Personne n\'a misé et tu ne veux pas mettre de jetons. Tu fais…', opts: ['Fold', 'Check', 'Call', 'Raise'], a: 1, why: 'Check = passer sans miser. Possible seulement si personne n\'a misé avant toi dans ce tour.' },
      { q: 'Quelqu\'un mise 50. Tu veux payer exactement 50. Tu fais…', opts: ['Check', 'Bet', 'Call', 'Raise'], a: 2, why: 'Call (suivre) = égaliser la mise.' },
      { q: 'Blindes 10/20. Un joueur relance à 60. Quelle est ta relance minimum ?', opts: ['80', '100', '120', '60'], a: 1, why: 'Il a relancé de +40 (de 20 à 60). Tu dois relancer d\'au moins +40 : 60 + 40 = 100.' },
      { q: 'Peut-on checker après une mise adverse ?', opts: ['Oui', 'Non'], a: 1, why: 'Non : face à une mise, tu dois suivre, relancer ou te coucher.' }
    ]
  },
  {
    id: 'lire', chapter: 'fondamentaux', icon: '🔍', title: 'Lire le board : trouver ta main', minutes: 5,
    intro: 'Le piège n°1 des débutants : mal lire sa propre main. Entraîne ton œil.',
    blocks: [
      { t: 'p', text: 'Tu peux utiliser **2, 1 ou même 0** de tes cartes privées. On prend toujours les 5 meilleures cartes parmi les 7.' },
      { t: 'compare', board: 'Ks 9s 5s 2h 7d', hands: [{ name: 'Toi', cards: 'As 3s' }], note: 'Tu utilises tes 2 cartes : As et 3 de pique + 3 piques du board = Couleur à l\'As.' },
      { t: 'compare', board: 'Kh Kd 8c 4s 2h', hands: [{ name: 'Toi', cards: 'Ks Jd' }], note: 'Tu utilises 1 seule carte (le Roi) : brelan de Rois, avec Valet et 8 en kickers.' },
      { t: 'compare', board: '9c Tc Jh Qd Ks', hands: [{ name: 'Toi', cards: '2d 3h' }], note: 'Tu n\'utilises aucune carte : la quinte au Roi est sur le board. Tu « joues le board ».' },
      { t: 'tip', kind: 'warn', text: 'Piège classique : sur un board {Qh Qd 7s 7c 3h}, tes {Ah 5d} ne te donnent PAS « trois paires ». Tu as **Double paire Dames et Sept avec un kicker As**. Seulement 5 cartes comptent !' },
      { t: 'tip', kind: 'warn', text: 'Autre piège : pour une Couleur, il faut **5 cartes** de la même couleur. 4 cœurs, ce n\'est rien du tout (sauf un « tirage »).' },
      { t: 'h', text: 'Lire le danger sur le board' },
      { t: 'list', items: [
        '**Board apparié** (une paire au milieu, ex. {Kd Ks 6h}) : un Full ou un Carré devient possible.',
        '**3 cartes de la même couleur** : quelqu\'un a peut-être une Couleur.',
        '**Cartes qui se suivent** (ex. {9h Tc Jd}) : une Quinte est possible.',
        '**Board « sec »** (ex. {Kd 7s 2c}) : peu de tirages, ta paire est plus solide.'
      ] }
    ],
    quiz: [
      { q: 'Board {Ah Kh Qh 4c 2d}. Tu as {Jh Ts}. Quelle est ta main ?', opts: ['Couleur', 'Quinte à l\'As', 'Quinte flush', 'Hauteur As'], a: 1, why: 'A-K-Q-J-T = Quinte à l\'As (Broadway). Tu n\'as que 4 cœurs : pas de couleur.' },
      { q: 'Board {7s 7d 7h 7c 2h}. Tu as {Ad 3c}. Ta main ?', opts: ['Carré de 7, kicker As', 'Full', 'Brelan', 'Égalité forcée'], a: 0, why: 'Carré de Sept sur le board + ton As comme 5ᵉ carte. Le meilleur kicker gagne !' },
      { q: 'Combien de tes cartes privées dois-tu utiliser au minimum ?', opts: ['0', '1', '2'], a: 0, why: 'Au Texas Hold\'em, tu peux utiliser 0, 1 ou 2 cartes privées (≠ Omaha où il en faut exactement 2).' },
      { q: 'Board {Kc 8c 3c 9d 2h}. Que dois-tu craindre ?', opts: ['Une couleur à trèfle', 'Un carré', 'Rien du tout'], a: 0, why: '3 trèfles sur le board : quelqu\'un avec 2 trèfles a une Couleur.' }
    ]
  },
  {
    id: 'positions', chapter: 'fondamentaux', icon: '🪑', title: 'Les positions à la table', minutes: 4,
    intro: 'Parler en dernier, c\'est un super-pouvoir : tu vois ce que les autres font avant de décider.',
    blocks: [
      { t: 'positions' },
      { t: 'p', text: 'Après le flop, c\'est **le premier joueur encore en jeu à gauche du bouton qui parle en premier**, et le bouton parle **en dernier**. Parler en dernier = avoir plus d\'informations.' },
      { t: 'list', items: [
        '**Positions précoces (UTG, MP)** : tu parles tôt, beaucoup de joueurs peuvent encore se réveiller derrière toi. Joue seulement des mains fortes.',
        '**Positions tardives (CO, BTN)** : les meilleures. Tu peux jouer plus de mains et voler les blindes.',
        '**Les blindes (SB, BB)** : tu as déjà payé, mais tu parles en premier après le flop. Ce sont les positions où l\'on perd le plus.'
      ] },
      { t: 'tip', kind: 'tip', text: 'Règle d\'or : **plus tu es proche du bouton, plus tu peux jouer de mains.** Une main comme {Kd Ts} est un fold sous le gun mais une relance au bouton.' }
    ],
    quiz: [
      { q: 'Quelle est la meilleure position ?', opts: ['UTG', 'Petite blinde', 'Bouton', 'Grosse blinde'], a: 2, why: 'Le bouton parle en dernier à tous les tours après le flop.' },
      { q: 'Que veut dire UTG ?', opts: ['Under the Gun', 'Up To Game', 'Ultra Tight Game', 'Under The Gamble'], a: 0, why: 'Under the Gun : « sous le pistolet », le premier à parler préflop.' },
      { q: 'Après le flop, qui parle en premier ?', opts: ['Le bouton', 'Le premier joueur actif à gauche du bouton', 'Celui qui a relancé', 'UTG'], a: 1, why: 'Après le flop, on commence par le premier joueur encore en jeu à gauche du bouton (souvent la petite blinde).' },
      { q: 'Où peux-tu jouer le PLUS de mains ?', opts: ['UTG', 'MP', 'Bouton'], a: 2, why: 'Au bouton, l\'avantage de position compense des mains plus faibles.' }
    ]
  },
  {
    id: 'depart', chapter: 'fondamentaux', icon: '🃏', title: 'Choisir ses mains de départ', minutes: 6,
    intro: 'La décision la plus fréquente du poker : jouer ou jeter ses 2 cartes. Les bons joueurs jettent ~75 % de leurs mains !',
    blocks: [
      { t: 'p', text: 'Voici les 169 mains de départ possibles. En **haut à droite** les mains assorties (s = même couleur), en **bas à gauche** les dépareillées (o), sur la **diagonale** les paires. Touche une case pour la détailler.' },
      { t: 'chart' },
      { t: 'h', text: 'Ce qui fait une bonne main de départ' },
      { t: 'list', items: [
        '**Les paires** : déjà une main faite. Les grosses ({Ah Ad}, {Kh Kd}, {Qh Qd}) sont des monstres. Les petites ({2h 2d} à {6h 6d}) espèrent faire un brelan au flop (1 fois sur 8).',
        '**Les grosses cartes** ({Ah Kd}, {Ah Qd}, {Kh Qd}) : elles font des paires hautes avec de bons kickers.',
        '**Assorties et connectées** ({8h 7h}, {Ts 9s}) : elles peuvent faire des Quintes et des Couleurs. À jouer en position, pour pas cher.'
      ] },
      { t: 'tip', kind: 'warn', text: 'Les **pièges des débutants** : {Kh 4d}, {Qs 7c}, {Jd 3h}… Une figure avec une petite carte dépareillée. Quand tu touches ta paire, quelqu\'un a souvent la même avec un meilleur kicker.' },
      { t: 'tip', kind: 'tip', text: 'Quand tu joues une main, **entre en relançant** (environ 3 grosses blindes) plutôt qu\'en suivant (« limper »). Tu prends l\'initiative et tu peux gagner tout de suite.' }
    ],
    quiz: [
      { q: 'Quelle est la meilleure main de départ ?', opts: ['{Ah Kh}', '{Ah Ad}', '{Kh Kd}', '{7h 2d}'], a: 1, why: 'La paire d\'As (« pocket rockets ») est la meilleure main préflop.' },
      { q: 'Tu es UTG avec {Kh 9d}. Que fais-tu ?', opts: ['Relancer', 'Suivre', 'Se coucher'], a: 2, why: 'K9 dépareillé est trop faible en première position. Fold.' },
      { q: 'Tu es au bouton, tout le monde s\'est couché. Tu as {9s 8s}. Que fais-tu ?', opts: ['Relancer', 'Se coucher', 'Tapis'], a: 0, why: 'Au bouton, 98 assortis est une bonne main pour attaquer les blindes.' },
      { q: 'Que veut dire « AKo » ?', opts: ['As-Roi même couleur', 'As-Roi couleurs différentes', 'As-Roi à l\'abattage'], a: 1, why: 'o = offsuit (dépareillées).' },
      { q: 'Quel pourcentage de mains un bon joueur jette-t-il environ préflop ?', opts: ['10 %', '40 %', '75 %', '100 %'], a: 2, why: 'Un joueur solide joue environ 20 à 25 % de ses mains à une table de 6.' }
    ]
  },
  {
    id: 'outs', chapter: 'maths', icon: '🎲', title: 'Les outs & la règle du 2 et du 4', minutes: 6,
    intro: 'Tu as un tirage ? Compte tes « outs » et tu sauras tes chances en 2 secondes, sans calculatrice.',
    blocks: [
      { t: 'p', text: 'Un **out** est une carte encore dans le paquet qui va améliorer ta main (et normalement te faire gagner).' },
      { t: 'outs', hole: 'Ah 8h', board: 'Kh 6h 2c', title: 'Tirage couleur (flush draw)', note: 'Tu as 4 cœurs. Il reste 13 − 4 = 9 cœurs dans le paquet : **9 outs**.' },
      { t: 'outs', hole: '9c 8d', board: 'Th 7s 2c', title: 'Tirage quinte par les deux bouts (open-ended)', note: 'Un 6 ou un J te donne une quinte. 4 Six + 4 Valets = **8 outs**.' },
      { t: 'outs', hole: 'Kd Qs', board: 'Ah Tc 4s', title: 'Tirage quinte ventral (gutshot)', note: 'Seul un Valet complète A-K-Q-J-T : **4 outs**.' },
      { t: 'h', text: 'La règle du 2 et du 4' },
      { t: 'list', items: [
        'Au **flop** (2 cartes à venir) : **outs × 4** ≈ % de chances d\'avoir ta carte à la river.',
        'À la **turn** (1 carte à venir) : **outs × 2** ≈ % de chances d\'avoir ta carte à la river.'
      ] },
      { t: 'table', rows: [['Tirage', 'Outs', 'Au flop (×4)', 'À la turn (×2)'], ['Couleur', '9', '≈ 36 %', '≈ 18 %'], ['Quinte bilatérale', '8', '≈ 32 %', '≈ 16 %'], ['Quinte ventrale', '4', '≈ 16 %', '≈ 8 %'], ['Couleur + quinte', '15', '≈ 60 % (réel : 54 %)', '≈ 30 %'], ['Deux overcards', '6', '≈ 24 %', '≈ 12 %']] },
      { t: 'tip', kind: 'tip', text: 'La règle du 4 suppose que tu verras **les 2 cartes** (turn et river). Si l\'adversaire peut miser gros à la turn, utilise plutôt ×2 pour la seule carte suivante.' }
    ],
    quiz: [
      { q: 'Tirage couleur au flop : combien d\'outs ?', opts: ['4', '8', '9', '13'], a: 2, why: '13 cartes de la couleur − 4 que tu vois = 9 outs.' },
      { q: '8 outs au flop : quelles chances d\'améliorer d\'ici la river ?', opts: ['≈ 8 %', '≈ 16 %', '≈ 32 %', '≈ 50 %'], a: 2, why: 'Règle du 4 : 8 × 4 = 32 %.' },
      { q: '9 outs à la turn : quelles chances à la river ?', opts: ['≈ 9 %', '≈ 18 %', '≈ 36 %'], a: 1, why: 'Règle du 2 : 9 × 2 = 18 %.' },
      { q: 'Tu as {Jd Ts} sur {9h 8c 2d}. Quel tirage ?', opts: ['Quinte bilatérale (8 outs)', 'Quinte ventrale (4 outs)', 'Couleur'], a: 0, why: 'J-T-9-8 : un Q ou un 7 complète ta quinte → 8 outs.' }
    ]
  },
  {
    id: 'cote', chapter: 'maths', icon: '⚖️', title: 'La cote du pot (pot odds)', minutes: 6,
    intro: 'Le secret des joueurs gagnants : ne payer que quand le prix est bon.',
    blocks: [
      { t: 'p', text: 'Quand on te mise dessus, compare **ce que tu dois payer** à **ce que tu peux gagner**.' },
      { t: 'h', text: 'La formule simple' },
      { t: 'tip', kind: 'tip', text: '**% nécessaire = (somme à payer) ÷ (pot total après ton call)**. Si tes chances de gagner sont **plus grandes** que ce %, suivre est rentable.' },
      { t: 'h', text: 'Exemple concret' },
      { t: 'list', items: [
        'Le pot contient **100**. Ton adversaire mise **50**. Il y a donc 150 au milieu.',
        'Pour suivre, tu paies **50**. Le pot total après ton call sera 100 + 50 + 50 = **200**.',
        'Il te faut : 50 ÷ 200 = **25 %** de chances de gagner.',
        'Tu as un tirage couleur à la turn (9 outs × 2 = **18 %**) → 18 % < 25 % : **couche-toi** !',
        'Au flop avec le même tirage et 2 cartes à venir (≈ 36 %), le call serait rentable.'
      ] },
      { t: 'table', rows: [['Mise adverse', '% nécessaire pour suivre'], ['¼ du pot', '17 %'], ['⅓ du pot', '20 %'], ['½ pot', '25 %'], ['¾ du pot', '30 %'], ['1 pot', '33 %'], ['2 pots', '40 %']] },
      { t: 'tip', kind: 'us', text: 'Au mode **Jouer**, le coach calcule pour toi la cote du pot et tes chances à chaque décision. Observe-le, et bientôt tu le feras de tête.' }
    ],
    quiz: [
      { q: 'Pot de 100, on te mise 100. Quel % te faut-il ?', opts: ['25 %', '33 %', '50 %', '100 %'], a: 1, why: '100 ÷ (100 + 100 + 100) = 33 %.' },
      { q: 'Pot de 200, on te mise 50. Tu as 9 outs à la turn (≈ 18 %). Suivre est-il rentable ?', opts: ['Oui', 'Non'], a: 0, why: 'Il faut 50 ÷ (200 + 50 + 50) = 50 ÷ 300 ≈ 17 %. Tu as ≈ 18 % : c\'est (tout juste) rentable de suivre.' },
      { q: 'Plus la mise adverse est grosse, plus il te faut…', opts: ['moins de chances', 'plus de chances', 'pareil'], a: 1, why: 'Payer cher exige d\'avoir plus souvent la meilleure main.' }
    ]
  },
  {
    id: 'strategie', chapter: 'pro', icon: '🦈', title: 'Stratégie gagnante pour débutant', minutes: 6,
    intro: 'Le style « Tight-Aggressive » (serré-agressif) : simple, solide, et il bat la plupart des joueurs amateurs.',
    blocks: [
      { t: 'h', text: 'Les 4 styles de joueurs' },
      { t: 'table', rows: [['', 'Passif (suit)', 'Agressif (mise/relance)'], ['Serré (peu de mains)', 'Le Roc 🪨', 'Le Requin 🦈 ← à imiter'], ['Large (beaucoup de mains)', 'Le Poisson 🐟', 'Le Maniaque 🤪']] },
      { t: 'p', text: 'À la table **Jouer**, tes adversaires ont exactement ces styles. Observe-les : Tex est un Roc, Bubba un Poisson, Vinnie un Maniaque, Mia une Requin et Grace une Pro équilibrée.' },
      { t: 'h', text: 'Les 7 règles d\'or' },
      { t: 'list', items: [
        '**Sois sélectif** : joue peu de mains, mais de bonnes mains.',
        '**Sois agressif** : quand tu joues, mise et relance plutôt que de suivre. Miser te donne deux façons de gagner : l\'adversaire se couche, ou tu as la meilleure main.',
        '**Mise pour la valeur** : quand tu as une très bonne main, mise ! Tu veux être payé par des mains moins bonnes.',
        '**Le continuation bet (c-bet)** : si tu as relancé préflop, mise souvent au flop (environ ½ pot), même si tu n\'as rien touché.',
        '**Ne bluffe pas les Poissons** : ils suivent tout. Contre eux, mise simplement tes bonnes mains.',
        '**Respecte les grosses relances des Rocs** : quand un joueur serré se réveille, il a souvent un monstre.',
        '**Sache te coucher** : même une paire d\'As peut être battue. Si la river complète une couleur et qu\'on te fait tapis… réfléchis !'
      ] },
      { t: 'h', text: 'Bluffer intelligemment' },
      { t: 'p', text: 'Un bon bluff **raconte une histoire cohérente**. Il marche mieux contre **peu d\'adversaires** (1 ou 2), sur des boards qui font peur (3 cartes de même couleur, un As qui tombe), et contre des joueurs capables de se coucher.' },
      { t: 'tip', kind: 'warn', text: '**Le tilt** : après un bad beat (perdre avec une très bonne main), on a envie de se venger et on joue mal. Les pros font une pause. Gère aussi ta **bankroll** : ne joue jamais de l\'argent que tu ne peux pas perdre.' }
    ],
    quiz: [
      { q: 'Quel style est recommandé pour débuter ?', opts: ['Large-passif', 'Serré-agressif', 'Maniaque', 'Ne jamais miser'], a: 1, why: 'Tight-aggressive : peu de mains, jouées avec agressivité.' },
      { q: 'Contre un joueur qui suit tout (un Poisson), il faut…', opts: ['Bluffer beaucoup', 'Miser ses bonnes mains pour la valeur', 'Ne jamais jouer'], a: 1, why: 'Un Poisson paie trop : fais-le payer avec tes bonnes mains, et oublie les bluffs.' },
      { q: 'Qu\'est-ce qu\'un c-bet ?', opts: ['Une mise au flop après avoir relancé préflop', 'Un call à la river', 'Une mise en tapis'], a: 0, why: 'Continuation bet : tu continues l\'histoire de force commencée préflop.' },
      { q: 'Contre combien d\'adversaires un bluff marche-t-il le mieux ?', opts: ['1', '3', '5'], a: 0, why: 'Plus il y a d\'adversaires, plus il y a de chances que l\'un d\'eux ait une main.' }
    ]
  },
  {
    id: 'casino', chapter: 'pro', icon: '🎰', title: 'Jouer dans un casino américain', minutes: 4,
    intro: 'Tu vas à Las Vegas ? Voici comment s\'asseoir à une vraie table sans passer pour un touriste.',
    blocks: [
      { t: 'list', items: [
        '**S\'inscrire** : à la « poker room », demande une place pour une partie, ex. « 1/2 No-Limit » (blindes 1 $/2 $). On t\'appelle quand un siège est libre.',
        '**Le buy-in** : tu achètes des jetons au début (souvent entre 100 $ et 300 $ en 1/2). Tu ne peux jouer qu\'avec les jetons déjà sur la table (**table stakes**).',
        '**Le croupier (dealer)** distribue, gère le pot et annonce les mains. On lui laisse un pourboire (**tip**) quand on gagne un pot, souvent 1 à 2 $.',
        '**Le rake** : le casino prélève un petit pourcentage de chaque pot (souvent 10 %, plafonné).',
        '**Parle à ton tour** et annonce clairement : « Call », « Raise to 15 », « Fold », « All-in ».',
        '**Protège tes cartes** : pose un jeton dessus. Si le croupier les ramasse par erreur, ta main est morte.',
        '**À l\'abattage**, le dernier joueur à avoir misé/relancé montre en premier. Si personne n\'a misé à la river, le premier à gauche du bouton montre.'
      ] },
      { t: 'tip', kind: 'us', text: 'Les World Series of Poker (WSOP) à Las Vegas, chaque été : le Main Event coûte 10 000 $ d\'inscription et des milliers de joueurs s\'y affrontent en Texas Hold\'em No-Limit.' },
      { t: 'h', text: 'Le vocabulaire de table' },
      { t: 'table', rows: [['Expression', 'Sens'], ['« Nice hand »', 'Bien joué (après un pot)'], ['« Chop »', 'Partager le pot'], ['« Muck »', 'Jeter ses cartes sans les montrer'], ['« Straddle »', 'Mise volontaire avant de voir ses cartes (2× la BB)'], ['« Seat open »', 'Une place est libre']] }
    ],
    quiz: [
      { q: 'Que signifie une table « 1/2 » ?', opts: ['1 à 2 joueurs', 'Blindes de 1 $ et 2 $', 'Mise max 2 $', 'Durée de 1h à 2h'], a: 1, why: 'Petite blinde 1 $, grosse blinde 2 $.' },
      { q: 'Que fait le joueur qui « muck » sa main ?', opts: ['Il la montre fièrement', 'Il la jette sans la montrer', 'Il relance'], a: 1, why: 'Muck = jeter ses cartes face cachée.' },
      { q: 'Qui montre ses cartes en premier à l\'abattage s\'il y a eu une mise à la river ?', opts: ['Le dernier agresseur', 'Le bouton', 'Le croupier', 'Le plus gros tapis'], a: 0, why: 'Le dernier à avoir misé ou relancé montre en premier.' }
    ]
  }
];

export const HAND_RANKINGS = [
  { fr: 'Quinte flush royale', en: 'Royal flush', cards: 'As Ks Qs Js Ts', desc: 'As, Roi, Dame, Valet, 10 de la même couleur. La main ultime.', odds: '1 main sur 30 940' },
  { fr: 'Quinte flush', en: 'Straight flush', cards: '9h 8h 7h 6h 5h', desc: '5 cartes qui se suivent, toutes de la même couleur.', odds: '1 sur 3 590' },
  { fr: 'Carré', en: 'Four of a kind (Quads)', cards: 'Qc Qd Qh Qs 7d', desc: '4 cartes de même valeur.', odds: '1 sur 595' },
  { fr: 'Full', en: 'Full house (Boat)', cards: 'Kh Kd Ks 4c 4s', desc: 'Un brelan + une paire. On dit « Full aux Rois par les 4 ».', odds: '1 sur 38' },
  { fr: 'Couleur', en: 'Flush', cards: 'Ad Jd 8d 5d 2d', desc: '5 cartes de la même couleur, pas forcément à la suite.', odds: '1 sur 32' },
  { fr: 'Quinte (Suite)', en: 'Straight', cards: 'Tc 9d 8s 7h 6c', desc: '5 cartes qui se suivent, de couleurs différentes.', odds: '1 sur 22' },
  { fr: 'Brelan', en: 'Three of a kind (Trips / Set)', cards: '7s 7h 7d Kc 2s', desc: '3 cartes de même valeur. Avec une paire servie en main, on dit « set ».', odds: '1 sur 21' },
  { fr: 'Double paire', en: 'Two pair', cards: 'Jh Jc 4d 4s Ah', desc: 'Deux paires différentes + une 5ᵉ carte.', odds: '1 sur 4,3' },
  { fr: 'Paire', en: 'One pair', cards: 'Th Ts Kd 6c 3h', desc: 'Deux cartes de même valeur.', odds: '1 sur 2,3' },
  { fr: 'Carte haute', en: 'High card', cards: 'Ac Qd 9h 6s 3c', desc: 'Aucune combinaison : c\'est la carte la plus haute qui compte.', odds: '1 sur 5,7' }
];
