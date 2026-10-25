# Missions One Shot

> **Brouillon de travail**, ouvert le 2026-10-24 (discussion Idan / JC3). Rien n'est codé.

Le jeu aura deux grands types de missions :

- les **campagnes** : une histoire qui se suit, écrite par Idan ; elles auront leur propre document ;
- les **one shot** : des missions presque procédurales, l'objet de cette page.

## 1 — Décidé (Idan, 2026-10-24)

- **Plusieurs escouades en parallèle.** Chaque escouade est immobilisée pendant l'aller-retour (`2 × distance`, doc 10 §1) ; les salaires de toute la compagnie continuent de tomber.
- **Taille d'escouade : jusqu'à 20 mercenaires**, au choix du joueur. Il doit cependant avoir une idée de ce qu'il faut envoyer (§4).
- **Difficulté relative à la compagnie.** La mission a une menace fixe ; ce qui s'affiche est relatif : à la compagnie sur le tableau des contrats, à l'escouade choisie pendant sa composition.
- **L'intendant affine la jauge de risque** : sans lui, l'estimation reste approximative (§4).
- **Échec : rien du tout, plus une perte de renommée.** La prime de mission reste payée aux survivants sous contrat qui reviennent (doc 10 §8), sauf à ceux sortis de la carte en fuite (§8) : un échec coûte donc de l'or. C'est voulu.
- **L'échec se définit par type de mission** : escouade anéantie ou en fuite, cible qui s'échappe, otages morts, convoi détruit… (§5).
- **Combat automatique possible** pour les gros affrontements (20 contre 30) ; ses modalités restent à voir.
  - **Premier pas (Idan, 2026-10-25 : « un mode simu pour tester rapidement les missions »)** : dans l'écran de combat, le bouton **Combat automatique** fait jouer votre équipe avec l'IA des ennemis (cible la plus proche, change d'arme, recharge, charge, attaque) jusqu'à la fin du combat, en 100 tours au plus ; le bilan de fin de mission est le même. Pas de tactique (le capitaine se bat comme les autres) : un joueur fait mieux.
- **L'éclaireur est dans l'escouade** (Discrétion) : il révèle les ennemis au déploiement, et donne peut-être l'initiative. Un **brouillard de guerre** est prévu ; l'éclaireur aidera aussi contre lui.
- **Tableau des contrats : 5 offres**, chacune valable de 3 à 6 jours.
- **Des avis ouverts à tous** : une mission ne s'adresse pas à la compagnie du joueur, elle est ouverte à qui veut la prendre, et d'autres compagnies peuvent la prendre chaque jour, comme les candidats de la Taverne (un jour peut-être d'autres joueurs, en réseau).
- **Le tableau est à la Taverne**, « Trouver une mission », là où se trouve la Mission Test.
- **Une mission signée est réservée** : aucune autre compagnie ne peut plus la prendre. Plus tard peut-être : une escarmouche contre une bande rivale qui a pris la même mission.
- **Les compagnies rivales ne sont qu'un nom** pour l'instant (« Les Loups de Vargh ont pris le contrat de Valombre. »).
- **Vocabulaire** : la **récompense du contrat** est l'or versé par le commanditaire à la compagnie ; la **prime de mission** est ce que la compagnie verse à chaque mercenaire (doc 09).
- **Archétypes d'ennemis fixes**, pour que le joueur puisse bâtir une stratégie. Beaucoup de lignes par faction (lanciers, frondeurs, archers, guerriers à l'épée et au bouclier, assassins discrets à la dague…), chacune sur quatre niveaux : par exemple **Lancier novice, Lancier, Lancier vétéran, Lancier d'élite**.
- **Ordres de mission** : des textes écrits à l'avance, qui collent au type de mission et à la faction ; JC3 en propose, Idan corrige.
- **Plus tard** : sonner la retraite ; les Morts-vivants.

## 1 bis — Le tableau chaque matin (proposition JC3, non validée)

Sur le modèle du test « Engagé ailleurs » des candidats (doc 14 §3–4) :

1. chaque offre passe un test **« Prise par une autre compagnie »** : une récompense élevée la rend plus attirante, une mission dangereuse moins ;
2. on retire les offres prises et les offres expirées (le journal nomme la compagnie rivale) ;
3. on remplit les places libres, jusqu'à 5 offres.

Formule et constantes à définir.

## 2 — La fiche d'une mission (proposition JC3)

Ce que le joueur voit au tableau des contrats :

- type de mission et commanditaire ;
- distance en jours (aller) ;
- ennemis : faction, nombre approximatif, tiers ;
- boss éventuel ;
- difficulté (☠ de 1 à 5, relative à la compagnie) ;
- récompense du contrat en pièces d'or, plus le butin ;
- jours avant l'expiration de l'offre.

Exemple :

> **Assassinat : le percepteur de Valombre** — guilde des marchands
> 3 jours de marche (6 aller-retour) · une dizaine d'Humains (bandits), T1 à T2 · boss : Garm le Balafré (Humain T3)
> ☠☠☠ · 4 500 PO + butin · expire dans 4 jours

## 3 — Génération (proposition JC3, non validée)

Ordre : **difficulté → type → faction → budget de menace → distance → récompense**.

- **Difficulté** : tirée selon la renommée de la compagnie (doc 09 prévoit que la renommée ouvre des missions plus dures).
- **Budget de menace** : la difficulté donne des points, dépensés en ennemis. Un ennemi coûte selon son archétype et son tier (piste : T1 = 1, T2 = 2, T3 = 4, T4 = 8), plus le boss. Le simulateur d'équilibrage calibrera les prix : 12 Gobelins battent 3 Ogres à chaque fois, un Gobelin ne peut donc pas coûter le quart d'un Ogre.
- **Archétypes d'ennemis** (fixes, §1) : une fiche par ligne et par niveau dans un fichier de données : peuple, caractéristiques, compétences, équipement et son tier, comportement, coût en menace calibré au simulateur. Le générateur de mercenaires peut servir à ébaucher les fiches.
- **Boss** : un chef, sur quatre niveaux (§10), avec un nom propre généré (« Garm le Balafré »).
- **Butin** : pour « Faire le ménage », voir §8.
- **Récompense** : une base selon la difficulté, plus une indemnité par jour de trajet. Elle ne suit pas la paie réelle du joueur, ce serait exploitable. Repère : une compagnie neuve dépense environ 700 PO de salaires par jour.

## 4 — Juger son escouade (proposition JC3, non validée)

- **Valeur de combat** de chaque mercenaire : caractéristiques, équipement et compétences, calibrée au simulateur.
- **Jauge de risque** sur l'écran de composition : la puissance de l'escouade choisie face à la menace estimée, mise à jour à chaque ajout ou retrait (« Avec cette escouade : ☠☠☠☠ — très risqué »).
- **Intendant** : sur le modèle de son évaluation des candidats de la Taverne (doc 14 §7, ±20 % × (1 − Intendance / 100)), il estime la menace de chaque mission, avec une erreur figée par mission. Sans intendant, la marge d'erreur est plus large (à fixer).

## 5 — Types de mission envisagés (non validés)

| Type | Réussite | Échec |
|---|---|---|
| Extermination | tous les ennemis hors combat | escouade anéantie ou en fuite |
| Assassinat | la cible hors combat ; on peut décrocher ensuite | la cible s'échappe de la carte |
| Libérer des otages | les otages escortés jusqu'à un bord | otages morts |
| Escorter un convoi | le convoi tient N tours | convoi détruit |
| Tenir une position | survivre aux vagues | position perdue |
| Vol / récupération | atteindre un point, puis ressortir | objet non récupéré |

Ces missions pourraient donner un rôle à la Discrétion, aux Pièges et au Charisme.

## 6 — À trancher

- Chiffres de la récompense, de la perte de renommée en cas d'échec et du gain en cas de réussite (« points de mission », doc 09).
- Marge d'erreur de la jauge sans intendant.
- Contenu du coffre (or et objets selon la difficulté).
- Retraite : quand on peut la sonner, et ce qu'elle coûte.
- Taille et forme des cartes pour 20 contre 30.
- Abandon d'une mission acceptée : ne pas partir, faire demi-tour.
- Combat automatique : quand, et comment.

## 7 — Idée notée : Charisme et Courage

Idan, 2026-10-24 : « Le charisme aidera les autres à réussir leur test de courage. » Première règle : le Charisme du capitaine compte dans son aura (25 %, doc 13, Idan 2026-10-24). Le Charisme des autres mercenaires (lieutenants…) : piste à tester plus tard.

## 8 — Première mission : « Faire le ménage » (Idan, 2026-10-24)

On attaque un camp ennemi.

- **Factions** : un camp d'Orcs, de Gobelins, de voleurs (Humains), d'Ogres, d'Hommes-bêtes ou de Reptiliens, tiré au hasard. Les Morts-vivants viendront plus tard : ce ne sont pas un peuple du jeu.
- **Victoire** : tous les ennemis tués ou mis en déroute (sortis de la carte). Un ennemi à 0 PV ou moins à la fin du combat compte comme mort ; les ennemis ne passent pas le jet de mort.
- **Défaite** : toute l'escouade est hors de combat (morte, à terre ou sortie de la carte).
- **Victoire, butin** : l'équipement de tous les morts, des deux camps ; un coffre du camp (or et objets, à chiffrer), qui revient automatiquement ; la récompense du contrat.
- **Défaite** : rien du tout, et une perte de renommée (§1). L'équipement de nos morts est perdu. Nos mercenaires restés à terre passent le jet de mort (doc 10 §3) avec une **probabilité doublée**, bornée à 100 % : on laisse sa chance à celui qui fait le mort et en profite pour s'échapper.
- **Prime de mission** : un mort ne la touche pas ; un mercenaire sorti de la carte en fuite non plus.

## 9 — Ordres de mission validés (Idan, 2026-10-24)

Trois essais pour « Faire le ménage » chez les Gobelins, validés par Idan. Les accolades sont remplies par le jeu ; {estimation} est le nombre approximatif d'ennemis, flou par nature.

### Le chef de village

> À toute compagnie de mercenaires qui voudra bien venir,
>
> Je m'appelle {commanditaire}, chef de {lieu}, à {jours} de marche de votre camp. On m'a dit que vous tuiez des gens pour de l'argent. Ça tombe bien : nous avons de l'argent, un peu, et des gens à tuer, beaucoup.
>
> Depuis la fonte des neiges, des gobelins se sont installés dans la vieille carrière, au-dessus du village. Au début, ils volaient les poules. Puis les chèvres. La semaine dernière, ils ont volé la cloche du temple, et personne ne sait ce qu'un gobelin peut bien faire d'une cloche. On les entend la sonner la nuit.
>
> Combien sont-ils ? Le berger dit {estimation}. Le berger boit.
>
> Le village a réuni {récompense} pièces d'or. C'est tout ce que nous avons, à part la cloche, que vous nous rendrez si elle est encore entière. Ce que vous trouverez dans leur camp sera à vous.
>
> Le premier qui nous débarrasse d'eux touche la somme. Les autres auront fait le chemin pour rien.
>
> Venez vite. Il ne reste plus beaucoup de poules.
>
> *{commanditaire}, chef de {lieu}, le {date}*

### Le chef gobelin rival

> OYÉ LES MERCENAIRES !!!
>
> Moi c'est {commanditaire}, grand chef des {tribu} (le plus grand des chefs, les autres ils sont plus petits). Les {tribu_cible} ils ont pris MA grotte à {lieu}. C'est à {jours} de chez vous si on marche vite, plus si on marche comme un humain.
>
> Eux c'est des voleurs, des menteurs et ils puent. Nous aussi un peu, mais pas pareil.
>
> Vous allez là-bas, vous tapez tout le monde. Ils sont {estimation}, j'ai compté avec les doigts de mon cousin. Leur chef c'est {boss}, il est gros et bête. Tapez-le en premier ou en dernier, je m'en fiche, mais tapez-le.
>
> Pour vous : {récompense} pièces d'or. Du vrai or, pas des cailloux peints comme la dernière fois. Tout ce qu'il y a dans la grotte, vous prenez. Sauf le trône. Le trône il est à moi.
>
> Le premier qui vient, il gagne. Les autres, ils ont perdu.
>
> C'est pas un piège. Promis sur la tête de mon cousin.
>
> *Signé : {commanditaire} (une empreinte de pouce, un peu grasse)*

### L'ordre de l'Empereur

> **PAR ORDRE DE SA MAJESTÉ IMPÉRIALE**
> *Chancellerie des Marches — Bureau des Nuisances et Engeances*
>
> À toute compagnie franche dûment patentée,
>
> Attendu qu'une engeance gobeline a établi un campement illicite à {lieu}, à {jours} de marche de votre cantonnement ;
> Attendu que ladite engeance entrave la circulation des marchandises, le recouvrement de l'impôt et le moral des percepteurs ;
> Attendu que la garnison impériale la plus proche se trouve, à son grand regret, fort occupée ailleurs ;
>
> Il est ordonné à la compagnie qui s'en chargera de procéder au nettoyage complet dudit campement, par tout moyen qu'elle jugera utile, dans le respect approximatif des usages de la guerre.
>
> La Couronne versera {récompense} pièces d'or à l'exécution du présent ordre. Le butin pris sur l'ennemi reste acquis à la compagnie, Sa Majesté étant d'humeur généreuse.
>
> Le présent ordre expire le {date_expiration}, ou dès qu'une compagnie s'en sera chargée.
>
> *Donné le {date}, an {an} de l'Âge des Couronnes Brisées.*
> *Pour l'Empereur et par délégation, {signataire}, sous-secrétaire adjoint aux Marches.*

## 10 — Archétypes gobelins (Idan, 2026-10-24)

Données : `data/reference/enemy-archetypes.json` (24 fiches figées, pas encore utilisées par le jeu).

**Niveaux par centiles.** Les Gobelins générés de faible et de forte réputation ont presque les mêmes valeurs de combat (leur réputation vient surtout du Charisme et de l'Intelligence). Chaque niveau prend donc, valeur par valeur, un centile des Gobelins générés : **novice P20, normal P50, vétéran P75, élite P90** ; résistances, compétences et Intimidation suivent le même centile. PV = 3 × (Constitution + 0,2 × Endurance + 0,1 × Volonté), comme à la génération.

**Spécialisation des lignes** : trois caractéristiques un cran de centile au-dessus, deux un cran au-dessous.

| Ligne | Armes | Monte | Descend |
|---|---|---|---|
| Lancier | Lance | Force, Constitution, Courage | Vitesse, Perception |
| Frondeur | Fronde | Dextérité, Perception, Vitesse | Force, Constitution |
| Archer | Arc | Perception, Dextérité, Chance | Force, Esquive |
| Guerrier | Épée courte + Rondache | Constitution, Endurance, Dextérité | Vitesse, Perception |
| Assassin | deux Dagues (+ Discrétion d'un cran) | Vitesse, Esquive, Dextérité | Constitution, Courage |
| Chef | Sabre + Rondache (+ Intimidation d'un cran) | Courage, Volonté, Charisme | — |

**Équipement** : le tier suit le niveau, T1 Usée, T2 Correcte, T3 Grand Luxe, T4 Grand Luxe. **Le T4 ne se trouve que sur les élites et les chefs** : un butin rare, aucun mercenaire généré n'a d'arme T4. Armures, du novice à l'élite : Lancier Vêtements, Gambison, Armure de cuir, Cuir renforcé ; Frondeur Vêtements, Vêtements, Gambison, Armure de cuir ; Archer Vêtements, Gambison, Armure de cuir, Armure de cuir ; Guerrier Gambison, Armure de cuir, Cuir renforcé, Brigandine ; Assassin Vêtements.

**Chefs**, quatre niveaux (noms validés par Idan) :

| Chef | Centile | Armure | Battu seul par | Menace |
|---|---|---|---|---|
| Caïd gobelin | P75 | Cuir renforcé T3 | ~3 mercenaires | 30 |
| Grand Caïd gobelin | P90 | Cotte de mailles T4 | ~5,5 | 55 |
| Chef de clan gobelin | P95 | Brigandine T4 | ~10 | 100 |
| Roi des Cavernes | P99 | Armure d'écailles T4 | plus de 10 (84 % de victoires contre 10) | au-delà de la mesure |

Le Roi des Cavernes reste presque intouchable pour une compagnie de départ : c'est voulu (Idan) ; il devra affronter des mercenaires à 4 étoiles d'or, et la magie (boule de feu) ignorera son bouclier.

**Menace mesurée** (simulateur, 150 combats par effectif : nombre d'exemplaires qu'il faut pour battre 3 mercenaires générés quelconques une fois sur deux ; **un mercenaire moyen vaut 10 points** ; un Gobelin généré quelconque en vaut 10) :

| | Novice | Normal | Vétéran | Élite |
|---|---|---|---|---|
| Lancier | 6 | 12 | 23 | 43 |
| Frondeur | 5 | 10 | 16 | 22 |
| Archer | 6 | 11 | 16 | 23 |
| Guerrier | 5 | 11 | 24 | 47 |
| Assassin | 4 | 7 | 15 | 23 |

Le Guerrier d'élite (bouclier et Brigandine) reste tel quel : les mercenaires monteront aussi en niveau et en équipement (Idan). Limites de la mesure : groupes d'un seul archétype, petite carte de test ; les synergies d'un camp mélangé ne sont pas mesurées. L'Assassin vaudra plus quand la Discrétion aura une règle de combat. **Le Chaman** viendra avec la magie en combat.

## 11 — Mise en œuvre V1 (2026-10-24)

« Faire le ménage » chez les Gobelins est la seule mission proposée, en boucle, à la Taverne (« Trouver une mission »). Code : `game-core/missions.js` (règles), `prototype-web/contract-ui.js` (tableau), `prototype-web/mission.js` (trajet, combat, bilan). Données : `data/reference/one-shot-missions.json` (camp, distance, carte, récompense, coffre, échec, défaite, les trois ordres et leurs noms) et `enemy-archetypes.json`.

- **Tableau** : une offre à la fois, avec son ordre de mission (un des trois, au hasard) et ses faits : commanditaire, distance, ennemis (en toutes lettres, flou), récompense, date d'expiration. Une offre non signée qui dépasse sa date (3 à 6 jours) est prise par une autre compagnie : le journal le dit, une nouvelle la remplace. Une offre signée part avec son escouade et une nouvelle est affichée : plusieurs escouades peuvent être en route en même temps.
- **Camp ☠** (camp B, §10) : 1D4+3 novices (Frondeurs 35 %, Lanciers 20 %, Archers, Guerriers, Assassins 15 % chacun), un « normal » (T2) dans 20 % des camps et deux dans 5 %, et un Caïd nommé.
- **Escouade** : de 1 à 20 mercenaires au choix du joueur ; l'écran de choix affiche le coût des primes si tous reviennent et les jours de marche.
- **Expédition** (Idan, 2026-10-24 : « le joueur doit pouvoir continuer à gérer son camp pendant la mission ») : l'escouade part (statut « En mission » ; ni intendance, ni échange, ni autre mission) ; distance 1D3 jours. Le joueur fait passer les jours au camp comme d'habitude. À l'arrivée, une fenêtre propose **Commencer le combat** ; « Plus tard » laisse finir la journée au camp (équiper, recruter…), mais **le jour suivant est bloqué tant que le combat n'est pas livré** (Idan) : le bouton du jour rouvre la fenêtre, et « Commencer le combat » reste aussi au tableau des contrats. Après le combat, les survivants rentrent en autant de jours (le retour compte comme du repos, doc 10 §9) ; la récompense, le coffre, le butin et les primes arrivent avec eux.
- **Combat** : carte de 20 × 12 cases ; l'escouade se déploie à gauche, le camp à droite, le Caïd au fond ; votre équipe a l'initiative (elle joue la première).
- **Victoire** : tous les ennemis à terre ou sortis de la carte. **Récompense du contrat** = 2 000 + 1 200 par jour de marche aller-retour + 300 par ennemi (de 5 900 à 11 600 PO ; doublée par Idan le 2026-10-25) ; **coffre** = 2D6 × 50 PO et **1D3 objets** (Idan, 2026-10-25 : « il faut pouvoir trouver de l'équipement T2 ou T3 à ce stade »), chacun d'une famille tirée au hasard (arme, armure, bottes, ceinture, amulette, cape, gants, culotte, bague, casque), **T2 (70 %) ou T3 (30 %)**, à la qualité de son tier ; **butin** = l'équipement de tous les morts des deux camps, au stock de l'Intendance.
- **Défaite** : rien n'est payé ; renommée de la compagnie −30 (points de mission, doc 09 §2) ; jet de mort doublé pour nos mercenaires à terre ; leur équipement est perdu.
- **Primes** : versées au retour de l'escouade aux survivants sous contrat, sauf à ceux qui ont fui hors de la carte (règle générale). La renommée perdue sur un échec compte dès la fin du combat.
- Tous les montants sont des valeurs de départ (Idan : « on ajuste les récompenses et on va voir »).
- La Mission Test reste disponible dans la rubrique Compagnie du camp, comme outil de test.

## 12 — Garde du corps (Idan, 2026-10-25)

Une mission sans combat pour gagner de l'or ; la contrepartie : on est privé des mercenaires pendant la mission. Code : `game-core/bodyguard.js` (règles), `game-core/campaign.js` (offre, départ, retour), `prototype-web/contract-ui.js` et `mission.js` (tableau, choix des gardes, fenêtre du retour). Données et textes : `data/reference/bodyguard-missions.json`.

- **Offre** : une à la fois au tableau de la Taverne, sous le contrat, valable 3 à 6 jours ; un client (texte de JC), **1 à 3 mercenaires** d'un **niveau de réputation minimal**, pour **3 à 21 jours**. Niveau tiré : 1★ 10 %, 2★ 30 %, 3★ 30 %, 4★ 20 %, 5★ 10 % ; les offres montent avec la compagnie : + max(0, niveau du meilleur mercenaire − 4), jusqu'à 15★ (JC, à confirmer ; plus tard, lié à la renommée).
- **Paiement d'avance**, par mercenaire (formule de JC, validée et relevée sur les durées courtes par Idan) : **W × (2 + jours × (1,3 + (jours − 3) / 22))**, arrondi à 10 PO, où **W = 10 × Réputation minimale du niveau suivant / 30** (le salaire d'un mercenaire en haut du niveau demandé ; au-delà de 15★, × 1,25). Plus c'est long, plus la journée paie ; un mercenaire payé nettement plus que son niveau fait perdre de l'or, surtout sur les missions courtes.

  | Niveau | W | 3 jours | 7 jours | 14 jours | 21 jours |
  |---:|---:|---:|---:|---:|---:|
  | 1★ | 33 | 200 | 410 | 910 | 1 550 |
  | 3★ | 53 | 310 | 660 | 1 450 | 2 480 |
  | 5★ | 83 | 490 | 1 030 | 2 270 | 3 870 |
  | 10★ | 267 | 1 570 | 3 300 | 7 250 | 12 400 |
  | 15★ | 833 | 4 920 | 10 310 | 22 670 | 38 730 |

- **Qui** : un mercenaire au camp, disponible (ni blessé, ni fatigué), du niveau demandé ; pas le capitaine ni l'intendant (JC, à confirmer). Exactement le nombre demandé. Les salaires courent comme d'habitude.
- **Pas de combat.** Au retour, chacun tire son sort : **50 %** rentré ; **25 %** rentré fatigué (« il a trop gardé le corps de charmantes demoiselles », fatigue 1D3 jours) ; **25 %** rentré blessé (« bagarre dans une taverne », blessure 1D3 jours). Une fenêtre le dit, avec une ligne par mercenaire.
- **Prime de mission** versée au retour. **Réputation** : +10 (rentré ou fatigué), +5 (blessé) ; **renommée de la compagnie** : +10 par mission (points de mission, doc 09 §2) — « un peu », chiffres de JC à confirmer.

