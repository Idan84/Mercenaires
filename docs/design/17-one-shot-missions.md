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
- **L'éclaireur est dans l'escouade** (Discrétion) : il révèle les ennemis au déploiement, et donne peut-être l'initiative. Un **brouillard de guerre** est prévu ; l'éclaireur aidera aussi contre lui.
- **Tableau des contrats : 5 offres**, chacune valable de 3 à 6 jours.
- **Vocabulaire** : la **récompense du contrat** est l'or versé par le commanditaire à la compagnie ; la **prime de mission** est ce que la compagnie verse à chaque mercenaire (doc 09).
- **Archétypes d'ennemis fixes**, pour que le joueur puisse bâtir une stratégie. Beaucoup de lignes par faction (lanciers, frondeurs, archers, guerriers à l'épée et au bouclier, assassins discrets à la dague…), chacune sur quatre niveaux : par exemple **Lancier novice, Lancier, Lancier vétéran, Lancier d'élite**.
- **Ordres de mission** : des textes écrits à l'avance, qui collent au type de mission et à la faction ; JC3 en propose, Idan corrige.
- **Plus tard** : sonner la retraite ; les Morts-vivants.

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
- **Boss** : un chef nommé, au-dessus des niveaux d'élite (à voir).
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

Idan, 2026-10-24 : « Le charisme aidera les autres à réussir leur test de courage. » Piste à tester au simulateur, sur le modèle de l'aura du capitaine ; aucune règle pour l'instant.

## 8 — Première mission : « Faire le ménage » (Idan, 2026-10-24)

On attaque un camp ennemi.

- **Factions** : un camp d'Orcs, de Gobelins, de voleurs (Humains), d'Ogres, d'Hommes-bêtes ou de Reptiliens, tiré au hasard. Les Morts-vivants viendront plus tard : ce ne sont pas un peuple du jeu.
- **Victoire** : tous les ennemis tués ou mis en déroute (sortis de la carte). Un ennemi à 0 PV ou moins à la fin du combat compte comme mort ; les ennemis ne passent pas le jet de mort.
- **Défaite** : toute l'escouade est hors de combat (morte, à terre ou sortie de la carte).
- **Victoire, butin** : l'équipement de tous les morts, des deux camps ; un coffre du camp (or et objets, à chiffrer), qui revient automatiquement ; la récompense du contrat.
- **Défaite** : rien du tout, et une perte de renommée (§1). L'équipement de nos morts est perdu. Nos mercenaires restés à terre passent le jet de mort (doc 10 §3) avec une **probabilité doublée**, bornée à 100 % : on laisse sa chance à celui qui fait le mort et en profite pour s'échapper.
- **Prime de mission** : un mort ne la touche pas ; un mercenaire sorti de la carte en fuite non plus.

