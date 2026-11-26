> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Camp & château en ruines

<aside>
🏰

**Camp = château en ruines à restaurer.** La couche stratégique est une interface **2D cliquable**, façon XCOM / jeu de
gestion mobile. Le joueur ne se promène pas librement en 3D dans le château.

</aside>

## 1 — État initial

Le château en ruines est la future base de la compagnie. Au départ : la **Taverne**, « au coin de la rue » ; un
**dortoir de 25 places** ; **10 000 pièces d'or** (or de départ et revenus seront recalés ensemble plus tard) ;
l'**Initial Squad**. Constructions et améliorations progressent en **jours**.

## 2 — Taverne

Le **cœur du début de partie**, tenue par un **vieux nain caustique** : personnage récurrent et aide volontaire, pas un
assistant omniprésent ; on vient lui parler quand on veut. On y recrute, on y trouve les missions, on l'améliore (plus
de candidats, plus de missions), on y achète des renseignements.

**Interface** (Idan, 2026-11-14) : le décor, en calques d'Idan, a ses zones cliquables : **tableau des primes** (Trouver
une mission), **menu** (La Cantine), **deux tables de clients** (Recruter), **trappe** (La Cave), **tavernier** (lui
parler). Le tavernier et les tables changent au hasard à chaque entrée (variantes d'Idan). Pas de vidéo pour l'instant.

<aside>
🍺

**Un candidat est généré avant son recrutement** : déjà généré, il peut rester disponible plusieurs jours / semaines,
d'où les candidats qui traînent longtemps à la taverne faute de succès.

</aside>

### La Cantine (Idan, 2026-11-08)

- **Une salle de la Taverne**, où cuisine le tavernier. **10 niveaux, 500 × n² PO** (500, 2 000, 4 500… 50 000) et
  **4 × n jours**.
- **Elle se construit dans la fenêtre Construction** (Idan, 2026-11-26). Tant qu'elle n'est pas construite, **le menu
  n'est pas au mur** de la taverne : ni image, ni zone cliquable, ni ligne dans le bouton du lieu.
- **Son écran** a un fond plein écran par niveau (Idan, 2026-11-26 ; `assets/cantine/cantine-<niveau>.webp`) : la cuisine
  et le tavernier s'embellissent du niveau 1 au niveau 10.
- **Le menu** (Idan, 2026-11-26) : un petit parchemin « Au menu », le nom du plat du jour, son image dans un cadre or, une
  phrase sans chiffres ; le bouton « Changer le menu » n'apparaît que si un autre plat est disponible (un autre plat
  goûté, ou celui que propose le tavernier : le choisir, c'est le goûter). Le niveau et l'amélioration de la salle sont
  dans la fenêtre Construction.
- **Chaque matin**, le **plat du jour** donne **40 × niveau XP** dans sa caractéristique à **chaque mercenaire au camp**
  (blessés, fatigués et prisonniers du Cachot compris ; pas ceux partis en contrat, chasse ou garde du corps). Pas de
  multiplicateur.
- **Dix plats**, un par peuple (`data/reference/canteen-dishes.json`) : Force — Ragoût de Mamie Ogresse (Ogre) ;
  Endurance — Fromage au lait de poule (Nain) ; Vitesse — Hérisson rôti à la sauce des bois (Reptilien) ; Perception —
  Poêlée de champignons (Gnome) ; Esquive — Lapin rôti et ses carottes confites (Gobelin) ; Chance — Tourte aux trèfles
  (Halfling) ; Constitution — Soupe de Géant Vert (Orc) ; Intelligence — Têtes de harengs (Elfe) ; Courage — Chili aux
  piments doux (Homme-bête) ; Dextérité — Tataki d'hirondelle (Humain).
- **À l'ouverture**, le plat du **peuple du capitaine**. Puis **un nouveau plat par niveau du Labo d'alchimie à partir
  du niveau 2** : le tavernier en propose un au hasard, dont on ne voit que le nom ; on le **goûte gratuitement** et son
  effet est connu. Le plat du jour se choisit parmi les plats goûtés et ne change pas tout seul.

### La Cave (Idan, 2026-11-10)

« On peut décider de les arrêter ? Non. De parier sur le vainqueur ! »

- **Une salle de la Taverne** : **un niveau, 500 PO, 4 jours**.
- **À la première visite du jour**, le tavernier annonce la bagarre du soir (une par jour) : un mercenaire **au hasard**
  parmi ceux **au camp** (ni parti, ni sur le départ, ni au Cachot), **pas blessés** (fatigués, si), **pas le
  capitaine** ; contre l'un de ceux dont **l'alignement est le plus éloigné** du sien (grille 3 × 3). Moins de deux :
  pas de bagarre.
- **Les cotes** : le tavernier joue la bagarre **100 fois en coulisses** ; chance = (victoires + 1) ÷ (simulations +
  2) ; **cote = 0,9 ÷ chance** (il garde 10 %), au centième, jamais sous ×1,01 ; recalculée si l'un des deux change
  d'équipement ou de valeurs. 75 % → ×1,20 ; 25 % → ×3,60.
- **Le pari** : de 1 PO à tout l'or de la compagnie ; gagné, on empoche **mise × cote** (mise comprise). On peut aussi
  regarder sans parier.
- **La bagarre** : **cave de 9 × 9** sans relief, **tonneaux** contre les murs (couverture partielle), les deux au
  centre à **2 cases**. **Personne ne commande** (l'IA). **Avec leurs armes, jusqu'à ce que l'un tombe** ; **fuir, c'est
  perdre**. Ni aura de capitaine ni de lieutenant. Un fatigué se bat à 80 % (doc 10 §5). Après 60 tours, le tavernier
  les sépare : le plus frais (PV restants) gagne.
- **Après** : les deux gagnent **l'XP de combat** ; **le perdant fait un jet de blessure** (sans jet de mort ; évité, il
  est fatigué) ; **le gagnant** n'est ni blessé ni fatigué et gagne **+50 XP d'Intimidation**. Ni prime ni réputation.
- **Pas regardée**, elle a lieu quand même avant le lendemain, en coulisses, sans pari.

### Renseignements sur les missions

Pas de salle des cartes : **un vieux type louche qui connaît un mec qui connaît un mec…** Payants, les renseignements
révèlent peu à peu ce qui est caché d'une mission (ennemis, terrain, effectifs, danger, objectif secondaire, butin…).
Liste exacte et tarifs à définir.

## 3 — Bureau du Capitaine

Gestion administrative : budget, affectation des mercenaires, politiques de compagnie, éventuellement une partie des
trophées.

## 4 — Dortoir

Le dortoir fixe la **capacité maximale de mercenaires**. Données : `data/reference/dormitory-quality.json`.

- **Capacité initiale : 25** (l'escouade initiale en prend 22 au plus).
- **Places** : **ogre 2** ; **halfling, gnome, gobelin ½** ; les autres **1** ; le capitaine et l'intendant **0**.
- **Plein** (moins de places libres que n'en demande le candidat) : **impossible de recruter**, ni de renvoyer
  l'intendant sur le terrain.
- **Un chantier à la fois** au dortoir (agrandissement, qualité ou quartier) ; l'or est payé au lancement ; c'est prêt
  le matin du dernier jour.
- **Agrandissement** (Idan, 2026-10-25) : **+5 places**, **sans limite**. Le k-ième (k = 1 : de 25 à 30) coûte **100 ×
  1,2^(k−1) PO**, arrondi à 10, et dure **2 + ⌊(k−1)/3⌋ jours**.

  | Places | Ce palier | Total depuis 25 places |
  |---:|---|---|
  | 30 | 100 PO, 2 jours | 100 PO, 2 jours |
  | 40 | 140 PO, 2 jours | 360 PO, 6 jours |
  | 60 | 300 PO, 4 jours | 1 290 PO, 19 jours |
  | 80 | 620 PO, 5 jours | 3 220 PO, 37 jours |
  | 100 | 1 280 PO, 6 jours | 7 200 PO, 60 jours |
  | 150 | 7 950 PO, 10 jours | 47 180 PO, 142 jours |
  | 200 | 49 220 PO, 13 jours | 294 820 PO, 257 jours |

- **Qualité** : **dix niveaux** au-dessus du niveau 0 ; le niveau n coûte **500 × n² PO** et **3 × n jours**. Chaque
  niveau donne **+50 de Renommée** pour de bon (doc 09 §2), **+5 d'affinité** avec le capitaine à chaque membre ce
  jour-là (expédition comprise, capitaine exclu) et retire **10 % des jours de fatigue** au retour d'une mission ou
  d'une garde du corps (doc 10 §5), arrondi au jour supérieur : **au niveau 10, plus de fatigue**. Puis les Bains chauds
  (§9) retirent 1 jour par niveau, au moins 1 jour : 7 jours, dortoir 3 et Bains 2 → ⌈7 × 0,7⌉ − 2 = 3. Nos animaux
  n'ont que les Bains.

  | Niveau | Nom | Prix | Jours | Total investi | Renommée |
  |---:|---|---:|---:|---:|---:|
  | 0 | Paille humide | — | — | — | — |
  | 1 | Paillasses | 500 | 3 | 500 | +50 |
  | 2 | Châlits de bois | 2 000 | 6 | 2 500 | +100 |
  | 3 | Lits et couvertures | 4 500 | 9 | 7 000 | +150 |
  | 4 | Chambrées | 8 000 | 12 | 15 000 | +200 |
  | 5 | Chambrées chauffées | 12 500 | 15 | 27 500 | +250 |
  | 6 | Matelas de laine | 18 000 | 18 | 45 500 | +300 |
  | 7 | Bains et chambrées | 24 500 | 21 | 70 000 | +350 |
  | 8 | Chambres de quatre | 32 000 | 24 | 102 000 | +400 |
  | 9 | Quartiers de vétérans | 40 500 | 27 | 142 500 | +450 |
  | 10 | Quartiers de seigneur | 50 000 | 30 | 192 500 | +500 |

- Non retenu : un prix de qualité qui dépend aussi de la taille du dortoir.
- **Quartiers du lieutenant** : **un par niveau pair de qualité** (dès le niveau 0) ; le k-ième coûte **1 000 × k² PO**
  et dure **5 × k jours**. Un quartier loge un lieutenant.

  | Quartier | Dortoir requis | Prix | Jours |
  |---:|---:|---:|---:|
  | 1 | 0 | 1 000 | 5 |
  | 2 | 2 | 4 000 | 10 |
  | 3 | 4 | 9 000 | 15 |
  | 4 | 6 | 16 000 | 20 |
  | 5 | 8 | 25 000 | 25 |
  | 6 | 10 | 36 000 | 30 |

- **Écran** (maquette d'Idan, 2026-11-14) : fond selon la qualité (une image par niveau) ; Agrandir, Améliorer, Quartier
  du lieutenant, Mes mercenaires.

### Le lieutenant (Idan, 2026-10-25)

- **Combien** : **10 mercenaires par lieutenant** (20 pour le deuxième…) et **un quartier** chacun. Le capitaine et
  l'intendant ne comptent pas dans les 10 ; les lieutenants, oui. Si l'effectif baisse, il garde son grade, mais on n'en
  nomme pas d'autre. Ni le capitaine ni l'intendant ne peuvent être lieutenant ; un lieutenant ne peut pas devenir
  intendant (à confirmer).
- **Promotion** : il accepte forcément, mais demande **salaire × (1 + Intelligence / 100)** ; **la prime de mission ne
  bouge pas**. On négocie comme avec une recrue (doc 14 §9, salaire seul), sans offrir moins que son salaire actuel ; là
  où une recrue partirait, il reste mais **refuse définitivement** le poste. Affinité : **+10** promu, **−10** s'il
  refuse.
- **Aura** : la moitié de celle du capitaine, sur ses propres valeurs : **17,5 % de son Courage + 12,5 % de son
  Charisme**, équipement compris, aux alliés à 10 cases ou moins. Les auras **ne s'additionnent pas** : un allié prend
  la plus forte à portée.
- **Demandes** (au camp, **une par jour**) : rendre un mercenaire « un peu plus courageux » ou « un peu plus
  respectueux ». Chance = **10 + 80 / (1 + e^(−Δ/20))**, Δ = moyenne (Charisme, Intelligence) du lieutenant − Volonté du
  mercenaire (25 % à −30, 50 % à 0, 75 % à +30). Gain = **20 % de l'écart** de Courage (ou d'affinité avec le capitaine)
  entre eux, de +1 à +10 ; **sans écart en faveur du lieutenant, échec forcé**. Résultat le lendemain (pour l'affinité,
  seulement « il vous respecte un peu plus »). **30 jours** entre deux demandes du même type pour un même mercenaire.
- À confirmer : la cible est tout membre au camp sauf le capitaine et le lieutenant ; valeurs **équipement compris** ;
  le Courage gagné est le Courage de base, pour de bon ; un échec compte pour les 30 jours.

## 5 — Salle de sport / terrain d’entraînement / cour intérieure

Un **seul bâtiment** pour les entraînements physiques, techniques et martiaux / maîtrise d'armes, avec une partie de
l'XP choisie au camp.

## 6 — Petit salon

Entraînement des **capacités mentales**. Le décor peut assumer le gag du beau canapé / divan de psychanalyse.

## 7 — Tours de magie

Apprentissage des sorts, entraînement des écoles de magie, développement des capacités magiques.

**L'École de magie** (Idan, 2026-11-01 ; `data/reference/camp-buildings.json`) :

- **un bâtiment** à construire puis **10 niveaux**, et **une salle par école** (Feu, Eau, Foudre, Vie, Nécromancie,
  Illusion, Invocation, Transmutation, Télékinésie), **10 niveaux** chacune, **au plus au niveau de l'École** (un niveau
  en chantier ne compte pas) ;
- **barème des bâtiments du camp** (en attendant les prix d'Idan) : niveau n = **500 × n² PO** et **4 × n jours**
  (niveau 10 : 50 000 PO et 40 jours ; 192 500 PO pour les dix) ; **un chantier par bâtiment et par salle**, en
  parallèle entre eux et avec le dortoir ; or payé au lancement, niveau atteint le matin du dernier jour ;
- **places** : **1 + ⌊niveau ÷ 2⌋**, pour l'École elle-même (la salle généraliste : Puissance magique, Réserve de mana)
  comme pour chaque salle ; **60 places** quand tout est au niveau 10 ;
- chaque niveau de l'École réduira le temps d'apprentissage (par exemple −10 %).

**Directeur de l'École** : nommé comme l'intendant (§16 : il peut refuser), une fois l'École construite ; un seul ; ni
le capitaine, ni un lieutenant, ni l'intendant, ni le médecin. **Hors mission**, comme eux : il vit à l'École (pas de
place au dortoir), ne part ni en mission ni en garde du corps, ne devient pas lieutenant et ne compte pas pour les 10
mercenaires d'un lieutenant. Il n'agit que sur l'entraînement libre.

**Entraînement libre** (Idan, 2026-11-02 : « un mercenaire hors mission, pas blessé pas fatigué ne restera pas oisif au
camp ») :

- **chaque matin**, une fois l'École construite : d'abord le **capitaine**, dans la salle choisie la veille par le
  joueur (n'importe laquelle), **sans test** ; puis, **dans un ordre tiré au hasard**, les mercenaires **disponibles**
  (au camp, ni blessés, ni fatigués, ni en mission même programmée, ni intendant, médecin ou directeur) ;
- **à 75 %** (Idan, 2026-11-03), il va là où il **se classe le mieux dans la compagnie** (la part de ses camarades qu'il
  dépasse dans ce que travaille la salle : les échelles ne se comparent pas, résistances 4 à 8, caractéristiques 55,
  armes 28, meilleure école 75 en médiane), parmi les salles et ailes à place libre de tous les bâtiments
  d'entraînement ; sinon **au hasard** ; plus de place : la taverne ;
- **test à l'École** : chance = **100 / (1 + e^(−Δ/15))**, de 2 à 95 %, **Δ = (Volonté − 50) / 2 + (meilleure école −
  70) + Charisme du directeur / 10 + affinité avec le directeur / 10** (affinité comme avec le capitaine ; −100 à +100).
  Raté : la taverne. Meilleure école d'une recrue : 78 en médiane ; doué (Volonté 50, école 100) 88 % ; moyen (50, 78)
  63 % ; peu doué (40, 40) 9 % ; sans école 2 % ;
- **test ailleurs** : le même sans le terme d'école, avec le maître : **Δ = (Volonté − 50) / 2 + Charisme du maître /
  10 + affinité avec le maître / 10** (une chance sur deux pour un mercenaire moyen sans maître) ;
- **gain par jour à l'École** = **80 × Intelligence / 50 × (1 + 0,1 × niveau de la salle) × (1 + niveau du directeur /
  100) × (1 + Transmission du savoir du directeur / 100)**, arrondi ; niveau du directeur : son école (sa Puissance
  magique en salle généraliste) ; sans directeur, ces facteurs valent 1. Salle 1 sans directeur (Intelligence 54)
  **95 XP** ; salle 3, directeur à 100, Transmission 48 **332 XP** ; salle 10, directeur à 120, Transmission 70,
  Intelligence 70 **838 XP** ;
- **gain ailleurs** : 80 × carac / 50 × (1 + 0,1 × niveau) × (1 + niveau du maître / 100) × (1 + Transmission du maître
  / 100), la carac selon le bâtiment (**Endurance** au Ludus, **Volonté** à l'Académie, **Dextérité** au Cercle…) ;
- à l'École, l'XP va à l'école de la salle, dont les **deux écoles opposées perdent chacune un quart** (doc 12) ; en
  salle généraliste, à la **Puissance magique** ; ailleurs, caractéristiques et résistances montent, et une arme, une
  catégorie ou un style fait reculer les autres comme en combat (doc 08) ;
- un élève reste disponible pour une mission ;
- à venir : le choix du mercenaire entre la magie et le combat selon ses goûts.

**Apprendre un sort** : avec le manuel, dans la salle de l'école du sort, avant l'entraînement libre ; l'élève reste au
camp jusqu'à ce qu'il sache ; professeur facultatif ; règles au doc 12.

### Bâtiments d'entraînement (Idan, 2026-11-02 et 2026-11-03)

Sur le modèle de l'École : un bâtiment, un maître, une **salle principale** (ce qu'on y travaille sans aile) et des
**ailes**. Sauf mention contraire, chaque bâtiment se construit puis monte de 1 à 10 au barème habituel, ses ailes au
plus à son niveau, avec les places de l'École (1, +1 tous les 2 niveaux, par salle) et l'entraînement libre.

**Les maîtres** : **le Doctore** (Ludus), **le Vétéran** (Académie), **le Maître des lames** (Cercle), **l'Alchimiste**
(Labo d'alchimie) ; plus bas, le Maître des plaisirs (Palais) et le Dresseur (§8). Nommés **comme le directeur**, une
fois le bâtiment construit ; ils vivent dans leur bâtiment (pas de place au dortoir). Un mercenaire ne tient qu'un poste
(intendant, médecin, directeur, maître, lieutenant). **Niveau du maître** : sa valeur dans ce que travaille la salle (sa
Force à la Meule…). Le directeur et ces quatre maîtres gagnent **20 XP de Transmission du savoir par élève de leur
bâtiment et par jour**.

**Ludus** — maître : **le Doctore**.

| Aile | Travaille | Info-bulle |
|---|---|---|
| **La Cour** (salle principale) | Résistance physique | « Le Doctore frappe. On encaisse. Jusqu'à ce que ça ne fasse plus mal. » |
| **La Meule** | Force | « On pousse la meule à la place de l'âne. L'âne, lui, se repose. » |
| **La Longue Piste** | Endurance | « Dix tours du camp en armure. Le onzième, c'est pour avoir demandé combien il en restait. » |
| **La Course au Cochon** | Vitesse | « Le cochon est graissé. Le vainqueur le garde. Personne n'a encore gagné. » |
| **La Quintaine** | Esquive | « On frappe le mannequin, il tourne et rend le coup. On apprend vite à se baisser. » |
| **Le Réfectoire du Doctore** | Constitution | « Six œufs crus au réveil, bouillie et viande de cheval. Le corps suit, ou pas. » |

**Académie de la survie** — maître : **le Vétéran** ; salle principale, sans aile à construire : les **Boucliers** et
l'**apprentissage des armures** (ci-dessous).

| Aile | Travaille | Info-bulle |
|---|---|---|
| **Le Four** | Résistance au feu | « On y entre en armure. On en ressort cuit à point, ou endurci. » |
| **Le Frigo** | Résistance au froid | « Une nuit dans la glacière. Le Vétéran appelle ça “se rafraîchir les idées”. » |
| **La Décharge** | Résistance à la foudre | « Un mage en colère, une flaque d'eau, et vous dedans. » |
| **L'Assommoir** | Résistance au poison | « Le plat du jour est toujours un test. Personne n'a jamais su lequel. » |
| **Le Placard** | Discrétion | « On s'y cache pendant que le Vétéran vous cherche. Il cherche encore le dernier. » |

**Apprendre une armure à l'Académie** (Idan, 2026-11-03 : « comme un sort » ; sans le port, pas d'armure : doc 03) :

- **dans l'ordre** : légère, intermédiaire, lourde ; **ni manuel ni professeur** : le seul coût est le temps ;
- **le convaincre**, comme pour un sort : 10 + 80 / (1 + e^(−Δ/20)), **Δ = 0,5 × affinité avec le capitaine** + l'appui
  de l'intendant (50 % à affinité 0) ; une tentative par jour ; le capitaine sans test ;
- il entre le lendemain matin (annulable d'ici là), prend **une place de la salle principale** avant l'entraînement
  libre et reste au camp, sans autre activité, jusqu'à ce qu'il sache ;
- **chaque matin** : chance = **100 / (1 + e^(−(X − 100)/20)) × (1 + 0,1 × niveau de l'Académie)**, au plus 95 %, **X =
  (Force + Endurance) / 2 − 10 par cran** (0 légère, 10 intermédiaire, 20 lourde) **+ Transmission du Vétéran / 5** s'il
  a lui-même ce port ; réussi : ce port et ceux d'en dessous. Moyen (Force 54, Endurance 59), Académie 1 : légère 11 %
  (**9 jours**), intermédiaire 7 % (14), lourde 4 % (23) ; avec un Vétéran à 48 de Transmission : légère 17 %
  (6 jours) ;
- **affinité**, comme pour un sort : +5 à l'entrée, −2 s'il refuse, +10 quand il sait, −10 si on le fait sortir avant
  (rien n'est acquis).

**Le Cercle des Fines Lames** — maître : **le Maître des lames** ; salle principale : **Dextérité**.

| Aile | Travaille | Info-bulle |
|---|---|---|
| **La Salle des Miroirs** | Lames longues | « On s'y bat contre son reflet. Il triche. » |
| **Le Boudoir** | Lames courtes | « Les dagues, les confidences et les coups bas. » |
| **Le Bal masqué** | Combat à deux armes | « Une rapière, une main-gauche, et surtout ne pas marcher sur les pieds. » |
| **Le Salon de thé** | Combat à une main | « La tasse dans une main, l'épée dans l'autre. Ne rien renverser. » |

Deuxième fonction : on y croise des nobles. **Paiement d'une garde du corps × (1 + 5 % par niveau du Cercle)**, arrondi
à 10 PO, pour les offres qui arrivent au tableau (doc 17 §12) ; pas plus d'offres pour autant.

**La Tour de guet** — salle principale **La Vigie** : **Perception** (« Là-haut, on voit venir les ennuis. Et la
pluie. ») ; une aile, **Le Créneau** : **Armes de tir** (« On tire sur tout ce qui approche. Le facteur ne passe
plus. ») ; apprises avec la **Perception**. Ni Armes à feu, ni Pièges, ni Courage, ni Volonté. **Pas d'instructeur**
(trop peu pour immobiliser un mercenaire ; peut-être un chef pour plusieurs bâtiments, plus tard). Elle repère les
déserteurs (§11) ; anticiper les attaques viendra avec la défense du camp.

**Le Labo d'alchimie** — maître : **l'Alchimiste** ; salle principale **L'Alambic** : **Résistance au poison** (« Ça
bout, ça fume, ça sent le chou. Personne ne sait ce que c'est. ») ; ailes **La Poudrière** : **Armes à feu** (« On y
apprend à charger, à viser… et surtout à ne pas fumer. ») et **La Cave** : **Pièges** (« Chaque marche est un piège. La
rampe aussi. ») ; apprises avec l'**Intelligence**. Les **potions** (préparation, ingrédients, recettes) viendront avec
la fabrication, qui fera monter l'Alchimie.

**Apprendre l'Empoisonnement des armes au Labo** : comme un port d'armure à l'Académie (même conviction, entrée le
lendemain matin, une place de l'Alambic, au camp jusqu'à la fin, même affinité, rien d'acquis s'il sort). Chaque matin,
chance = 100 / (1 + e^(−(X − 100)/20)) × (1 + 0,1 × niveau du Labo), au plus 95 %, **X = (Intelligence + Dextérité) /
2 + Résistance au poison + Transmission de l'Alchimiste / 5** s'il a lui-même l'aptitude (la Dextérité « pour pas en
mettre partout ! »). Labo 1 : ~13 jours pour les 10 % les moins doués, ~7 en médiane (~5 avec un Alchimiste à 48), ~3
pour les 10 % meilleurs. **Un seul apprentissage à la fois** (sort, armure ou empoisonnement).

**La Cabane du bûcheron** — salle principale **Le Billot** : **Haches** (« On fend du bois toute la journée. Le bois,
lui, ne se défend pas. »), apprises avec la **Force** ; pas de chef. Deuxième fonction, **les bûcherons** (corvée, Idan,
2026-11-04) :

- **1 par niveau** de la Cabane. Envoyé au jour J, il commence le lendemain matin et continue chaque jour **jusqu'à ce
  qu'on le retire** ; retiré, il est libre le lendemain. Tant qu'il y est : ni mission, ni garde du corps, ni
  entraînement libre, ni apprentissage. Ni l'intendant, ni le médecin, ni un maître à son poste, ni un blessé.
- **Il peut refuser** : 10 + 80 / (1 + e^(−Δ/20)), **Δ = 0,5 × affinité avec le capitaine − 30** + l'appui de
  l'intendant ; ~25 % à affinité 0, 45 % à 50, 69 % à 100 ; puis **une relance** (ci-dessous). Le capitaine accepte
  toujours.
- **Chaque matin de travail : affinité −1** (× 2 intimidé, × 0,5 convaincu), perdue pour de bon ; rien pour le
  capitaine. Le salaire de la corvée (« Politique sociale » de l'Intendance, doc 09 §7, un curseur par corvée), de 0 à
  200 %, fait la perte du jour × (2 − taux ÷ 100) : −1 à 100 % (par défaut), 0 à 200 %.
- **Effet : du bois** (ci-dessous).

**Bois et pierre** (Idan, 2026-11-18) :

- **Stock de départ** : 500 bois, 500 pierre, affichés à côté de l'or.
- **Chaque matin**, la Cabane rapporte du bois, la Guilde des mineurs de la pierre, même sans ouvrier : **20 × 0,5 ×
  étoiles de renommée de la compagnie × niveau du bâtiment** ; plus, par ouvrier, **15 × (Force ÷ 50)²** (« un gobelin
  avec 10 en force, ça rapporte rien ») : Force 10 → 1, 35 → 7, 55 → 18, 77 → 36, 110 → 73.
- **Usages** à venir (coût des bâtiments, bourse permanente or ↔ ressources) : pour l'instant, on accumule.

**Relance après un refus** (Idan, 2026-11-04), pour tout test de refus :

- corvées, Palais, apprentissages, échanges d'équipement (doc 05), postes : **une seule relance**, **Intimider** ou
  **Convaincre**, ou « Laisser tomber » ; puis c'est non pour aujourd'hui ;
- **Intimider** refait le test en ajoutant l'**Intimidation du capitaine** (médiane 38) ; **Convaincre**, son **Charisme
  ÷ 2** (médiane 27) : un test à 50 % passe à ~77 % ou 70 % ;
- la perte d'affinité qui suit est **× 2** si on l'a intimidé, **× 0,5** si on l'a convaincu : pour une corvée, celle de
  chaque jour ; sinon, celle du refus si la relance échoue, celle de l'accord si elle réussit ; échange d'équipement :
  le gain est annulé s'il a été intimidé ;
- **apprentissages** (sort, professeur, port d'armure, empoisonnement) : refus −2 d'affinité ; relance ratée −4
  (intimidé) ou −1 (convaincu) en tout ; réussie, il entre le lendemain, mais **intimidé, il perd les +5 du premier
  matin ; convaincu, il les garde** (de même pour le professeur et ses +3) ;
- **postes** (et retour sur le terrain) : la relance ajoute l'Intimidation ou le Charisme ÷ 2 à leur chance, en points
  (au plus 95 %) ; si le refus tient, **vexé** : perte × 2 ou × 0,5 ; **flatté** : bonus perdu s'il a été intimidé (il
  pourra être flatté une autre fois), gardé s'il a été convaincu ; accepté, rien ne change ;
- **relance échouée** : en plus de « Partir », « **Au cachot !** », s'il reste une cellule (§11).

**La Guilde des mineurs** — salle principale **Le Puits** : **Armes contondantes** (« On y descend avec une lanterne, on
en remonte avec un marteau. »), apprises avec la **Force** ; pas de chef. Deuxième fonction, **les mineurs**, comme les
bûcherons : 1 par niveau, même test, même perte ; **effet : de la pierre**. **Une seule corvée à la fois** : pour passer
de la Cabane à la mine, on le retire d'abord (mine dès le lendemain).

**Les dernières armes** (l'Ermitage et le Hall des Berserkers sont abandonnés) :

- **La Caverne de la terreur** — salle principale **La Gueule** : **Courage** (« On y entre en héros. On en ressort en
  courant. ») ; aile **Le Hérisson** : **Armes d'hast** (« Des piques partout, et quelque chose de gros derrière. ») ;
  apprises avec le **Courage** ; pas de chef ; peut-être des cristaux plus tard.
- **Combat à deux mains** : aile **Le Merlin** de la Cabane (« Le merlin se tient à deux mains. La bûche n'a rien
  demandé. ») et aile **La Masse** de la Guilde (« Une masse de carrier, deux mains, et la roche finit par céder. Le
  carrier aussi. ») ; apprises avec la **Force**.
- **Bâtons** : la **Salle du Bâton** de l'École de magie (« Un bâton de mage, c'est d'abord un bâton. Demandez au
  gobelin qui a ri. »), comme une salle d'école.
- **Le Sauna** des Bains chauds : **Réserve de mana** (« On transpire, on médite, on remplit sa réserve. Surtout de
  vapeur. »), appris avec la **Volonté** ; au plus au niveau des Bains (5) ; les Bains eux-mêmes n'ont pas de places.
- **Armes articulées** : au Palais des plaisirs. **Combat à mains nues** : désactivé (doc 03). L'artisanat attendra les
  bâtiments de fabrication.

**Le Palais des plaisirs** (« Il faut que ça soit rentable d'y faire travailler des mercenaires ») :

- salle principale **Le Grand Salon** (« Sourire, écouter, ne jamais annoncer son prix en premier. ») : on y travaille,
  on ne s'y entraîne pas (le Charisme ne s'entraîne pas) ; une aile, **L'Arrière-salle** : **Armes articulées** (« On y
  apprend le fouet. Officiellement, pour le dressage. »), apprises avec le **Charisme** ;
- **le Maître des plaisirs** (la Maîtresse), nommé comme les autres maîtres et choisi sur son Charisme, aide
  l'Arrière-salle et **multiplie l'or de chacun par 1 + son Charisme ÷ 200** (Charisme 60 : +30 %) ;
- **le travail**, comme une corvée (1 par niveau, une seule corvée à la fois, relance, **−1 d'affinité par jour**) ; le
  test des bûcherons sans le −30 : **~50 % à affinité 0**, 69 % à 50, 85 % à 100 ;
- **or de chaque journée = Charisme × (1 + 0,2 × niveau de réputation)** (1 à 15), arrondi : ~55 PO pour un faible
  (Charisme 39, niveau 2), ~86 pour un moyen (54, niveau 3), ~124 pour un très bon (69, niveau 4) ; le salaire médian
  est de 48 PO.

## 8 — Bâtiments pour animaux et montures

Des structures selon les espèces (écuries, souille, antre pour dragon, autres à définir), pour des unités montées, y
compris volontairement extravagantes : une troupe sur plusieurs dragons.

### La Grange du dresseur et les Écuries (Idan, 2026-11-07)

Données : `data/reference/mounts.json` ; fiches des animaux : doc 04.

- **Grange du dresseur** : à construire, puis 10 niveaux au barème habituel. Son maître, le **Dresseur** (Animal,
  Intelligence, Charisme, Intimidation), nommé comme les autres maîtres et choisi sur son Compagnon animal, aide à
  apprivoiser.
- **Ses ailes**, au plus au niveau de la Grange, mêmes prix et durées, **2 places par niveau** chacune (20 au niveau
  10) ; chaque animal loge dans la sienne : **Écuries** (chevaux, licorne, Pégase), **Chenil** (loup, cerbère, molosse),
  **Serre** (les papillons), **Souille** (les bêtes à cornes, 2026-11-16). On s'entraîne à la Serre avec son papillon
  (Papillons et Compagnon animal), à la Souille avec sa bête (**Bêtes à cornes** et Compagnon animal). Le Nid de griffon
  viendra avec le griffon.

| Animal | Aile | Entretien | Rang d'échange | Alignement | Entêtement | Places | Vendu par | Capture (doc 17 §23) |
|---|---|---:|---:|---|---:|---:|---|---|
| **Pégase** (2026-11-09) | Écuries | 40 PO | 4 | neutre bon | 75 | 1 | Aymeric Belcomptoir (doc 18) | Chasse au pégase, dès 3★ bronze |
| **Cerbère** | Chenil | 35 PO | 4 | loyal mauvais | 40 | 1 | Bruga Roc-Fendu, Ogres des montagnes | |
| **Molosse de guerre** | Chenil | 5 PO | 1 | neutre mauvais | 25 | ½ | Kippa Ressortdor, Gnomes des villes | |
| **Papillon télépathe** | Serre | 3 PO | | chaotique bon | | ½ | Callie Loincompas, Explorateurs | non |
| **Papillon vénéneux** | Serre | 4 PO | | chaotique neutre | | ½ | Jasper Bonnebourse, Halflings des cités humaines | Chasse aux papillons |
| **Papillon géant** | Serre | 10 PO | | neutre bon | | 1 | Dottie Mielbruyère, Halflings des villages isolés | non, seulement vendu |
| **Sanglier de combat** | Souille | 15 PO | 3 | chaotique neutre | | 1 | Draz Crinsauvage, Orcs des steppes | Chasse au sanglier |
| **Mammouth de guerre** | Souille | 50 PO | 4 | neutre | | 2 | Hroska Crocs-de-Neige, Tribus nordiques | Chasse au mammouth |
| **Tricératops** (2026-11-17) | Souille | 70 PO | 4 | neutre | | 2 | Azhiss Kaal'Thesh, Reptiliens des cités-temples | Chasse au tricératops |

Cases vides : voir les fiches (doc 04). Entêtement du Pégase (Intelligence 80 + Volonté 70) ÷ 2 : un cran d'écart, 25 %
par jour ; trois, 1,6 %. Cerbère : (20 + 60) ÷ 2. Le rang 3 est celui du destrier et du loup. Valeur : mammouth
15 000 PO, tricératops 21 000 PO. Titres « à dos de … » : pégase, cerbère, sanglier, mammouth, tricératops, papillon
(géant, pour un petit qui le monte). Les places prises comptent les demi-places (« 1,5 / 2 »).

- **Capture** : les ennemis ont des montures, mises KO au combat. Après une victoire, chaque monture **capturable**
  restée KO, et chaque **loup de la Cour de sang**, passe le **test de survie** : le jet de mort de nos mercenaires (doc
  10 §3 : à 0 PV ou plus, elle vit ; sous 0, mort = −1 000 × PV ÷ PV max − Volonté ÷ 20 %). Un cheval qui a fui, ou qui
  est parti avec son cavalier, est perdu.
- **Arrivée** : après un contrat, les montures rentrent **avec l'escouade** et prennent une place dans leur aile
  (tableau), sinon elles sont **relâchées**.
- **Entretien** : chaque matin, par animal (destrier 10 PO, licorne 30 PO, loup 10 PO ; les autres : tableau), avec les
  salaires. Si la caisse ne suffit pas (Idan, 2026-11-10) : celui d'une monture est dû à son cavalier ; sans propriétaire ou à celle du capitaine,
  au Dresseur ; sans Dresseur, elle est relâchée (les dettes, doc 09). Relâcher une monture sans propriétaire libère sa
  place.
- **Une monture est un objet**, qui s'achète et se vend, sans tier ni qualité ; sans propriétaire, à l'Intendance ; où
  qu'elle soit, elle loge dans son aile (sa place, son entretien). Achat et vente : doc 18 §12 bis.
- **Son nom** : tiré de la liste de son animal (24 noms chacun), qu'aucun autre de nos animaux ne porte (liste épuisée :
  suivi d'un numéro) ; **renommable**. Elle garde son espèce (« Destrier ») pour les marchands ; en combat, celles d'en
  face restent « Destrier de … ».
- **La proposer à un mercenaire** : il accepte ou refuse, au jet des échanges d'équipement (doc 05), à son **rang
  d'échange** (le destrier comme un T3, la licorne comme un T4). Acceptée, elle est **dans son inventaire, non
  équipable** tant qu'il ne l'a pas apprivoisée. Celle d'un mercenaire ne se vend ni ne se relâche ; s'il meurt, elle
  revient à l'Intendance. Après une mission, elle se repose comme un mercenaire (blessée ou fatiguée ; doc 04, « Combat
  à cheval »). Plusieurs montures possibles, une seule équipée.

### S'entraîner avec son compagnon (Idan, 2026-11-07)

Les **Écuries** (Équidés) et le **Chenil** (Canidés) entrent dans l'**entraînement libre** (§7), avec le test des
bâtiments d'entraînement et le Dresseur comme maître ; **seulement pour celui qui y a son animal apprivoisé**, pas au
repos ; leurs places sont celles des animaux. **Gain** : la formule de l'entraînement libre, avec la **moyenne de ses
Charisme, Intelligence et Intimidation** ; la famille de l'animal et **Compagnon animal** montent chacune du gain, sans
recul des autres familles. Le Dresseur gagne 5 XP de Transmission du savoir par élève et par jour.

### Apprivoiser (Idan, 2026-11-07)

- **Qui** : le mercenaire à qui est la monture, s'il peut la monter (« un ogre ne peut pas monter sur un cheval » : sa
  taille, les places du dortoir de son peuple, sous le gabarit de la monture). Un compagnon (le loup) s'apprivoise par
  tout le monde : qui ne peut pas le monter l'emmène à pied (doc 04). Il faut la Grange. **Par monture**, pas par
  catégorie : s'il perd un cheval, il doit en apprivoiser un autre.
- **Quand** : il entre à la Grange le lendemain matin (annulable d'ici là) et reste au camp jusqu'à la fin (ni mission,
  ni autre apprentissage, ni corvée). Une monture à la fois.
- **Chaque matin**, dès le matin qui suit son entrée, deux tests à réussir le même jour :
  1. **Dressage** : X = moyenne de ses Intelligence, Charisme, Intimidation, Compagnon animal et compétence de la
     famille de la monture (Équidés…) + **bonus du Dresseur** (s'il n'est pas l'élève) = (Compagnon animal +
     Intelligence + Charisme + Intimidation du Dresseur) ÷ 20, environ +10 ; chance = 100 / (1 + e^(−(X − 60) / 10)) :
     50 % à X = 60.
  2. **Alignement** : écart = crans sur l'axe Loyal–Chaotique + crans sur l'axe Bon–Mauvais (0 à 4) ; sans écart, réussi
     d'office ; sinon chance = 100 × ((100 − entêtement) ÷ 100)^écart, **entêtement** = (Intelligence + Volonté de
     l'animal) ÷ 2, sans autre caractéristique (« je veux qu'on evite au max d'ajouter des caractéristiques »). La
     licorne (82,5) : 17,5 % pour un cran, 3 % pour deux, 0,5 % pour trois, **0,09 % pour quatre** (un orc chaotique
     mauvais : environ 1 pour 1000). Le destrier (20), neutre : 80 % pour un cran, 64 % pour deux (au plus).
- **Réussi** : il peut l'équiper (emplacement Monture) et sort de la Grange ; une monture apprivoisée par un autre ne
  s'équipe pas. Le Dresseur gagne 20 XP de Transmission par élève et par jour.
- **Le faire sortir**, la monture qui n'est plus à lui, le Cachot : rien n'est acquis.

## 9 — Soins & mémorial

### Soins

Ils améliorent la qualité / vitesse de guérison, la récupération de fatigue et les capacités soignantes utilisées dans
la durée des blessures.

**Dispensaire et Bains chauds** (Idan, 2026-11-01) : à construire, puis **5 niveaux** ; niveau n = **500 × n² PO** et
**4 × n jours** ; un chantier par bâtiment, en parallèle du dortoir.

| Niveau | Prix | Jours | Total |
|---:|---:|---:|---:|
| 1 | 500 | 4 | 500 |
| 2 | 2 000 | 8 | 2 500 |
| 3 | 4 500 | 12 | 7 000 |
| 4 | 8 000 | 16 | 15 000 |
| 5 | 12 500 | 20 | 27 500 |

- **Dispensaire** : la durée d'une blessure (doc 10 §6, de 7 à 60 jours) est multipliée par **1 − 0,1 × niveau** (au
  moins 1 jour), pour les blessures reçues après la construction. Niveau 5 : 7 → 4 jours, 27 → 14, 48 → 24, 60 → 30.
- **Bains chauds** : la fatigue (doc 10 §5) dure **1 jour de moins par niveau**, au moins 1 jour (5 à 7 jours → 1 à 2 au
  niveau 5), après la réduction du dortoir (§4) ; la recharge du mana au camp (doc 12) gagne **+5 % de la Réserve par
  jour et par niveau** (Volonté 52 : 36 % → 61 % par jour au niveau 5) ; une salle, **Le Sauna** (§7).

**Médecin** (Idan, 2026-11-01) :

- nommé comme l'intendant (§16 : il peut refuser), **une fois le Dispensaire construit** ; un seul ; ni le capitaine, ni
  un lieutenant, ni l'intendant ; **hors mission** comme l'intendant : il vit au Dispensaire (pas de place au dortoir),
  ne part ni en mission ni en garde du corps, ne devient pas lieutenant ;
- **blessures** : durée × **1 − Médecine / 250**, en plus du Dispensaire (au moins 1 jour), pour les blessures reçues
  pendant qu'il est en poste. Médecine 46 (recrue moyenne) : −18 % ; 63 : −25 % ; 100 : −40 %. Dispensaire 1 et médecin
  à 50 : 10 jours → 8 ;
- **Renommée** : + sa Médecine tant qu'il est en poste (+46 pour un médecin moyen) ;
- **XP** : chaque blessé guéri pendant qu'il est en poste lui donne **40 XP de Médecine par jour** de blessure.

### Mémorial

**Le Mémorial** (Idan, 2026-11-09 : « un bâtiment souvenir ») est **là dès le début** (ni construction, ni niveau, ni
entretien) et a une **capacité illimitée**. Textes : `data/reference/memorial.json`.

- **Qui y entre** : tous les mercenaires morts dans la compagnie (jet de mort de fin de mission, éclaireur prisonnier
  jamais revenu (doc 04), déserteur tué en combat singulier (§11)) ; **pas les animaux**.
- **La galerie** : les portraits ; au clic, l'**avatar complet**, la **date du décès**, les jours dans la compagnie, la
  **cause**, l'**épitaphe** et **son historique**, arrêté au jour de sa mort.
- **La cause** (« un peu drôle, c'est mieux ! ») : un coup (corps à corps, tir, charge, contre la contre-charge, attaque
  d'opportunité, en fuite, dans le dos), sa propre arme (échec critique), un sort (feu, froid, foudre ou autre), son
  propre sort, le poison, une malédiction, le relevé en zombie, un camarade (« tir ami ») ; avec le tueur et l'arme ou
  le sort (« Arme du crime : Hache de guerre. ») ; une tournure drôle tirée une fois pour toutes.
- **L'épitaphe** : une centaine, délirantes (« Mort comme il a vécu : en retard sur l'initiative. »), au hasard,
  **jamais deux fois dans une même partie** tant qu'il en reste ; au masculin ou au féminin.

**Étudier la Nécromancie au Mémorial** (un mini bonus gratuit) : une salle de l'entraînement libre (§7), ouverte **dès
le premier mort**, **une place**, le capitaine compris ; elle travaille la **Nécromancie** (ses écoles opposées
reculent, comme à l'École). **Niveau = morts ÷ 10**, sans arrondi ni plafond. Test et gain d'une salle de l'École,
**sans directeur** : 80 × Intelligence / 50 × (1 + 0,1 × niveau) ; Intelligence 50 : 81 XP par jour à 1 mort, 88 à 10,
160 à 100, 320 à 300.

## 10 — Grande salle du château

Lieu de vie et de discussions : conversations calmes, disputes / négociations, décisions sociales importantes, peut-être
les trophées.

## 11 — Prison

**Le Cachot** (Idan, 2026-11-04) — 10 niveaux, barème habituel, **1 cellule par niveau** :

- **qui** : tout membre, sauf le capitaine et ceux qui partent ou sont partis en mission ; depuis le Cachot, ou quand
  une relance a échoué (« Au cachot ! ») ;
- **tout de suite, jusqu'à ce qu'on le libère** ; il garde son lit au dortoir ;
- il **perd son poste** (intendant, médecin, directeur, maître, lieutenant) et quitte sa corvée et son apprentissage
  (comme une sortie ordinaire) ;
- **affinité −10** en entrant, **−2 chaque matin**, qui **ne reviennent pas** à la libération ;
- **pas de salaire** ; ni mission, ni garde du corps, ni entraînement, ni corvée, ni apprentissage, ni poste ;
- les autres membres ne réagissent pas, pour l'instant.

Plus tard : les prisonniers ennemis, l'interrogatoire, les événements internes.

### La désertion (Idan, 2026-11-04)

- **Le test du matin**, après tout ce qui fait bouger l'affinité : chaque membre au camp, sauf le capitaine, dont
  l'affinité avec le capitaine a **baissé depuis la veille** (bilan sur 24 heures : −2 puis +5, pas de test). Chance de
  rester = **100 / (1 + e^(−(affinité + 60) / 10))**, de 1 à 99 % : 99 % à 0, 98 % à −20, 88 % à −40, 50 % à −60, 12 % à
  −80. D'abord avec le capitaine, puis avec **chaque lieutenant présent** (son affinité envers lui). Tous ratés : il
  part cette nuit.
- **Au cachot**, il ne part pas : il **veut partir** (plus de test) et tente de filer le matin qui suit sa libération.
- **La Tour de guet** le repère : **100 / (1 + e^(−Δ/15))**, **Δ = 10 × niveau − 55 − (Discrétion − 30)** (équipement
  compris), de 5 à 95 % ; sans Tour, jamais. Discrétion 30 (la moyenne) : 5 % au niveau 1, 42 % au niveau 5, 95 % au
  niveau 10.
- **Passé inaperçu** : il part avec ce qu'il porte **et son sac** ; on l'apprend au matin (par l'intendant s'il y en a
  un : « Brak a filé cette nuit, avec son sac. »). Son profil est gardé, pour plus tard.
- **Repéré** : une scène **au début de la journée**, une par repéré ; le jour suivant attend sa réponse, qu'on peut
  remettre à plus tard (Discussions, doc 16) :
  - **Intimider** ou **Convaincre** : une seule tentative, **dure** : 10 + 80 / (1 + e^(−Δ/20)), **Δ = 0,5 × affinité +
    Intimidation (ou Charisme ÷ 2) du capitaine − 60** ; capitaine moyen, mercenaire à −20 : 23 % ou 18 %. **Il
    reste** : **+20** d'affinité et **15 jours sans test**. Raté : restent les deux choix suivants ;
  - **le défier en combat singulier** (ci-dessous ; grisé si l'un des deux ne peut pas se battre) : gagné (il tombe ou
    fuit l'arène), **mis à mort** (Mémorial §9 ; héritage de renommée, doc 09) ou **épargné : il reste**, 15 jours sans
    test ; **perdu** (ou le capitaine se rend), **il part avec son sac** ;
  - **le laisser partir** : **+10** d'affinité (gardée dans son profil), et il part avec son sac.
- **En partant ou en mourant**, il quitte son poste, sa corvée et son apprentissage.

### Le Défi du capitaine

Idan, 2026-11-09 : « On va la faire gladiateur ! »

- **Défier** : depuis la fiche, à tout moment, sans limite par jour ; le capitaine et le défié au camp, ni blessés, ni
  fatigués, ni au cachot.
- **L'arène** : **15 × 15 cases**, un peu de décor, les deux au centre, face à face, à **3 cases** ; un contre un, avec
  l'équipement porté, sans monture ni compagnon ; personne n'est caché. Le combat des missions : on joue le capitaine,
  l'IA le défié.
- Le capitaine peut **se rendre** ; le défié non, mais il peut paniquer : **fuir l'arène est une victoire du capitaine**
  (« Il court, mais se fait rattraper par les autres »).
- **Le capitaine perd** (il tombe, ou se rend) : la fin de mission habituelle (jet de mort sous 0 PV, sa mort met fin à
  la partie ; sinon blessure ou fatigue).
- **Nous gagnons** : **Mise à mort** (Mémorial §9, cause « Défié par son capitaine », héritage de renommée) ou
  **Épargner** (pas de jet de mort, le **jet de blessure** comme à 0 PV s'il est tombé, et **+50** d'affinité).
- **La compagnie**, si nous gagnons : chaque mercenaire gagne **+5 d'affinité par case d'écart** entre son alignement et
  celui du défié (grille 3 × 3, 0 à 4 cases) ; **+10** aux alignements mauvais s'il est mis à mort, **+10** aux bons
  s'il est épargné.
- **Dans tous les cas** : **+150 XP d'Intimidation** et **+50 XP de Charisme** pour le capitaine, l'XP normale du combat
  pour les deux ; ni prime, ni réputation ; puis fatigue ou blessure de fin de mission, pour les deux.
- **Après un refus** (apprentissage, échange, poste, corvée) : « Défier » est la troisième relance (grisée si l'un des
  deux ne peut pas se battre) et compte comme la relance du jour ; le duel compte comme depuis la fiche (verdict, XP,
  affinité de la compagnie). **Gagné et épargné, il cède** ; **perdu, le refus tient**, sans perte ni gain d'affinité en
  plus ; mis à mort, plus rien à demander. L'issue s'applique avant le bilan du duel.

## 12 — Embellissement / prestige kitsch

Un **gold sink** assumé : des améliorations surtout prestigieuses, qui alimentent la **renommée de la compagnie**
(immense statue dorée à l'effigie du capitaine, tapis érotiques, décorations volontairement excessives / ridicules).

## 13 — Forge

Travail du métal ; fabrication / modification d'équipement métallique ; enchantement magique associé.

## 14 — Atelier de couture

Cuir, vêtements, équipements textiles ; enchantement magique associé.

## 15 — Joaillerie

Bagues, amulettes, bijoux ; futurs systèmes d'enchantement / gemmes.

## 16 — Armurerie / Intendance

Stockage d'un **nombre limité** de matériels (capacité à définir) ; gestion de l'équipement mis à disposition ;
**échanges** à proposer pour récupérer un objet donné : le matériel attribué ne se récupère pas sans interaction. Un
onglet par grande catégorie, ses catégories en accordéon.

### Stock d'armes de départ (Idan, 2026-10-23)

À sa création, la compagnie reçoit un stock de rechange, sans propriétaire, à l'Intendance :

- **armes** : **2D20** (2 à 40), tirées parmi toutes les armes du référentiel, **boucliers compris**, doublons
  possibles, avec un poids **max(0,25 ; 1 + 2 × A)** : `A` additionne les intensités de la matrice de génération du
  **peuple** et de la **culture** du capitaine, sur l'arme et sur sa catégorie. Nain du chaos : Arquebuse 2 + 2 + 1 + 1
  = 6, poids 13 ; Hache de guerre 2 + 1 = 3, poids 7 ; Fouet 0, poids 1 ;
- **tier** : table de l'équipement de départ des mercenaires (doc 05), lue à la réputation du capitaine ; à la création
  (≈ 110 à 165) : environ 77 % T1, 20 % T2, 3 % T3 ;
- **armures** : **1D6 par type** (Vêtement, Légère, Intermédiaire, Lourde), tirées parmi les armures du type ; même
  table de tier ;
- **1D6** de chacun de ces objets, chacun d'un type tiré au hasard (doc 05) : **paires de bottes** (vitesse, esquive,
  perception ; même table de tier), **ceintures** (mana, endurance, courage), **amulettes** (puissance magique, volonté,
  chance), **capes** (résistance physique, esquive, discrétion), **paires de gants** (pièges, dextérité, force),
  **culottes** (charisme, intimidation, affinité), **bagues** (parmi onze : chance, courage, une par école de magie),
  **casques ou chapeaux** (constitution, intelligence, dresseur) ;
- **potions et fioles** : **1D6 de chaque sorte** (potion de soins, potion de mana, fiole de poison) ; elles se donnent
  et se reprennent librement, sans négociation.

### L'intendant (Idan, 2026-10-24)

Le capitaine **propose** le poste ; le mercenaire peut refuser. Un seul intendant, jamais le capitaine ; **une
proposition par mercenaire et par jour**. L'intendant ne part plus en mission ; on lui parle à l'Intendance.

- **Envie d'intendance** = 40 − 0,6 × Courage + 2 × Missions + 8 × Blessures (retours de mission blessé).
- **Accepter le poste** : chance = Envie, de 2 à 95 %. Courage 31 / 49 / 62 : 21 / 11 / 3 % en début de partie ;
  57 / 47 / 39 % après 10 missions et 2 blessures.
- **Revenir sur le terrain** : chance = 60 − Envie + 1 par jour passé à l'intendance (le goût du sang), de 2 à 95 %.
  Courage 49, 10 missions, 2 blessures : 13 % le premier jour, 43 % après 30 jours, 73 % après 60 jours.
- **Refus** (même règle quand il refuse de revenir sur le terrain) : l'affinité change de (Intelligence − Courage) / 10,
  arrondi : le malin est flatté (une seule fois, pour qu'on ne gonfle pas l'affinité en insistant), le brave vexé qu'on
  l'écarte du combat (à chaque fois). Un accord ne change rien.
- **Évaluer les candidats de la Taverne** : comme le tavernier (candidat → catégorie → caractéristique), mais il répond
  par un chiffre, à ±20 % × (1 − Intendance/100) près (doc 14 §7) ; gratuit, et la réponse ne change pas si l'on repose
  la question.
- **Appuyer les échanges d'équipement** : Δ + 0,2 × son Intendance + 0,25 × l'affinité du mercenaire envers lui (peuple,
  culture, alignement). Intendance 50 et affinité +40 : « Troquer son T1 contre un T3 » (Int 20) passe de 42 à 62 %. Pas
  d'appui quand c'est à lui qu'on parle.

#### Cruxor Limortel, l'ancien intendant (Idan, 2026-11-12)

« Un vieux qui […] veut juste partir à la retraite, et qui demande en permanence à être remplacé. » Données :
`data/reference/old-steward.json`.

- **Là dès le premier jour**, avec **30 d'Intendance** (Idan, 2026-11-22 ; 10 avant) ; il fait tout ce que fait un intendant (candidats, échanges,
  apprentissages, prix des marchands, et il décrit les mercenaires pour leurs tags, doc 20 §12).
- **Ce n'est pas un mercenaire** : ni salaire, ni place au dortoir, ni fiche, ni mission.
- **Affinité** : chaque mercenaire (et chaque marchand) l'apprécie exactement comme le capitaine.
- **Il demande à partir, mais n'ose pas de lui-même** : seulement quand on lui parle, en fin de phrase (« Vous savez, je
  pensais à ma retraite et… »).
- **Remplacé, il part pour de bon** : dès qu'un mercenaire accepte le poste, il fait ses adieux ; il ne revient pas si
  le nouvel intendant retourne sur le terrain ou meurt. Plus tard, on pourra lui parler à la Taverne.

## 17 — Laboratoire d’alchimie

Potions, poisons, recettes ; fabrication / recherche alchimique.

## 18 — Cuisine / Réfectoire

Lieu de vie quotidien : récupération, fatigue, satisfaction / ambiance de compagnie, relations entre mercenaires ; les
conflits que l'Arène n'a pas réglés peuvent y dégénérer.

## 19 — Bibliothèque

Un **lieu d'aide intégré au jeu** : formules, explications, règles, informations de référence ; peut-être aussi la
formation / Intelligence / Transmission du savoir, plus tard.

## 20 — Arène / fosse d’entraînement

Riche en événements : duels, entraînement réel, paris, règlements de compte « encadrés », progression plus rapide de
certaines compétences, **risque réel de blessure**. Une soupape sociale avant que deux mercenaires ne se poignardent au
réfectoire.

## 21 — Atelier bois / ingénierie

Arcs, hampes, boucliers / éléments en bois, pièges, objets techniques et ingénierie non métallique.

## 22 — Salle des trophées

Concept validé, emplacement ouvert (Bureau du Capitaine, Grande salle ou Bibliothèque) ; les trophées peuvent contribuer
au prestige / à la renommée.

## 23 — Muraille / tours de garde

Le château pourra être **attaqué** : murailles et tours se réparent / s'améliorent et défendent le camp. Règles de siège
à définir.

## 24 — Principe de design des bâtiments

Les bâtiments doivent autant que possible **ouvrir des actions, des choix ou des capacités**, pas seulement fournir des
bonus passifs : Taverne → plus de candidats, missions et renseignements ; Dortoir → capacité de roster ; soins → moins
d'indisponibilité ; salles d'entraînement → actions de formation ; Forge / ateliers → production et modification
d'objets ; Arène → duels, paris, progression risquée ; Armurerie → stockage et négociation de récupération d'équipement.

## 25 — Non retenu pour l’instant

Les idées non validées restent hors de cette page. La carte du château et le découpage des ailes / tours / sous-sols
viendront plus tard.
