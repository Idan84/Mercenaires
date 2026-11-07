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

Données : `data/reference/enemy-archetypes.json` (24 fiches gobelines ; les orcs au §14).

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

**Équipement** : le tier suit le niveau, T1 Usée, T2 Correcte, T3 De bonne facture, T4 De luxe (qualités renommées le 2026-11-01 ; T3 et T4 étaient « Grand Luxe »). **Le T4 ne se trouve que sur les élites et les chefs** : un butin rare, aucun mercenaire généré n'a d'arme T4. Armures, du novice à l'élite : Lancier Vêtements, Gambison, Armure de cuir, Cuir renforcé ; Frondeur Vêtements, Vêtements, Gambison, Armure de cuir ; Archer Vêtements, Gambison, Armure de cuir, Armure de cuir ; Guerrier Gambison, Armure de cuir, Cuir renforcé, Brigandine ; Assassin Vêtements.

**Chefs**, quatre niveaux (noms validés par Idan) :

| Chef | Centile | Armure | Battu seul par | Menace |
|---|---|---|---|---|
| Caïd gobelin | P75 | Cuir renforcé T3 | ~3 mercenaires | 30 |
| Grand Caïd gobelin | P90 | Cotte de mailles T4 | ~5,5 | 58 |
| Chef de clan gobelin | P95 | Brigandine T4 | ~10 | 102 |
| Roi des Cavernes | P99 | Armure d'écailles T4 | ~20 (remesuré au §17) | 201 |

Le Roi des Cavernes reste presque intouchable pour une compagnie de départ : c'est voulu (Idan) ; il devra affronter des mercenaires à 4 étoiles d'or, et la magie (boule de feu) ignorera son bouclier.

**Menace mesurée** (simulateur, 150 combats par effectif : nombre d'exemplaires qu'il faut pour battre 3 mercenaires générés quelconques une fois sur deux ; **un mercenaire moyen vaut 10 points** ; un Gobelin généré quelconque en vaut 10) :

| | Novice | Normal | Vétéran | Élite |
|---|---|---|---|---|
| Lancier | 6 | 12 | 23 | 37 |
| Frondeur | 5 | 10 | 16 | 23 |
| Archer | 6 | 11 | 16 | 27 |
| Guerrier | 5 | 11 | 24 | 60 |
| Assassin | 4 | 7 | 15 | 28 |

Le Guerrier d'élite (bouclier et Brigandine) reste tel quel : les mercenaires monteront aussi en niveau et en équipement (Idan). Limites de la mesure : groupes d'un seul archétype, petite carte de test ; les synergies d'un camp mélangé ne sont pas mesurées. L'Assassin vaudra plus quand la Discrétion aura une règle de combat. **Le Chaman** viendra avec la magie en combat.

## 11 — Mise en œuvre V1 (2026-10-24)

« Faire le ménage » chez les Gobelins est la seule mission proposée, en boucle, à la Taverne (« Trouver une mission »). Code : `game-core/missions.js` (règles), `prototype-web/contract-ui.js` (tableau), `prototype-web/mission.js` (trajet, combat, bilan). Données : `data/reference/one-shot-missions.json` (camp, distance, carte, récompense, coffre, échec, défaite, les trois ordres et leurs noms) et `enemy-archetypes.json`.

- **Tableau** : une offre à la fois, avec son ordre de mission (un des trois, au hasard) et ses faits : commanditaire, distance, ennemis (en toutes lettres, flou), récompense, date d'expiration. Une offre non signée qui dépasse sa date (3 à 6 jours) est prise par une autre compagnie : le journal le dit, une nouvelle la remplace. Une offre signée part avec son escouade et une nouvelle est affichée : plusieurs escouades peuvent être en route en même temps.
- **Camp ☠** : gobelin ou orc, tiré au hasard, composé par les points de combat (§14). Frondeurs 35 %, Lanciers 20 %, Archers, Guerriers, Assassins 15 % chacun ; un « normal » (T2) dans 5 % des tirages ; un chef nommé (Caïd gobelin, Chef de bande orc). Historique : 1D4+3 novices au départ, 1D4+4 le 2026-11-01 (« un tout petit peu » plus fort), puis le budget de points, qui garde la même taille moyenne.
- **Escouade** : de 1 à 20 mercenaires au choix du joueur ; l'écran de choix affiche le coût des primes si tous reviennent et les jours de marche.
- **Expédition** (Idan, 2026-10-24 : « le joueur doit pouvoir continuer à gérer son camp pendant la mission ») : l'escouade part (statut « En mission » ; ni intendance, ni échange, ni autre mission) ; distance 1D3 jours. **Mission programmée** (Idan, 2026-10-30 : « les soldats partent en mission le lendemain matin… on doit pouvoir encore leur parler et les équiper. C'est fondamental. ») : signée, l'escouade reste au camp jusqu'au lendemain matin (statut « Mission programmée ») ; on peut encore l'équiper et lui parler (échanges d'équipement, lieutenant), elle recharge son mana la nuit, mais elle ne part sur aucune autre mission et ne devient pas intendant. Elle part le matin suivant, puis marche ses jours de distance : l'arrivée vient donc un jour après la signature plus la distance. Même règle pour la garde du corps (départ le lendemain, retour au bout de sa durée). **Annuler le départ** (Idan, 2026-11-02 : « pendant la journée, on peut encore changer les plans ») : tant que l'escouade n'est pas partie, « Annuler le départ » la libère et l'offre revient au tableau (doc 16, « Au jour J, on organise J+1 »). Le joueur fait passer les jours au camp comme d'habitude. À l'arrivée, une fenêtre propose **Commencer le combat** ; « Plus tard » laisse finir la journée au camp (équiper, recruter…), mais **le jour suivant est bloqué tant que le combat n'est pas livré** (Idan) : le bouton du jour rouvre la fenêtre, et « Commencer le combat » reste aussi au tableau des contrats. Après le combat, les survivants rentrent en autant de jours (le retour compte comme du repos, doc 10 §9) ; la récompense, le coffre, le butin et les primes arrivent avec eux.
- **Combat** : carte de 30 × 15 cases (20 × 12 avant le §16) ; l'escouade se déploie à gauche, le camp à droite, le chef au fond ; votre équipe a l'initiative (elle joue la première). Le terrain suit la faction (Idan, 2026-11-06 : vieille carrière et camp en hauteur, clairière en forêt, repaire… ; doc 04, « Décor »).
- **Victoire** : tous les ennemis à terre ou sortis de la carte. **Récompense du contrat** = 2 000 + 1 200 par jour de marche aller-retour + **35 PO par point de combat** du camp (Idan, 2026-11-01 ; 300 par ennemi avant ; doublée par Idan le 2026-10-25), soit environ 6 100 à 12 000 PO (9 100 en moyenne, gobelins comme orcs) ; **coffre** = 2D6 × 50 PO et **1D3 objets** (Idan, 2026-10-25 : « il faut pouvoir trouver de l'équipement T2 ou T3 à ce stade »), chacun d'une famille tirée au hasard (arme, armure, bottes, ceinture, amulette, cape, gants, culotte, bague, casque), **T2 (70 %) ou T3 (30 %)**, à la qualité de son tier ; **butin** = l'équipement de tous les morts des deux camps, au stock de l'Intendance.
- **Défaite** : rien n'est payé ; renommée de la compagnie −30 (points de mission, doc 09 §2) ; jet de mort doublé pour nos mercenaires à terre ; leur équipement est perdu.
- **Primes** : versées au retour de l'escouade aux survivants sous contrat, sauf à ceux qui ont fui hors de la carte (règle générale). La renommée perdue sur un échec compte dès la fin du combat.
- Tous les montants sont des valeurs de départ (Idan : « on ajuste les récompenses et on va voir »).
- La Mission Test reste disponible dans la rubrique Compagnie du camp, comme outil de test.

## 12 — Garde du corps (Idan, 2026-10-25)

Une mission sans combat pour gagner de l'or ; la contrepartie : on est privé des mercenaires pendant la mission. Code : `game-core/bodyguard.js` (règles), `game-core/campaign.js` (offre, départ, retour), `prototype-web/contract-ui.js` et `mission.js` (tableau, choix des gardes, fenêtre du retour). Données et textes : `data/reference/bodyguard-missions.json`.

- **Offre** : une à la fois au tableau de la Taverne, sous le contrat, valable 3 à 6 jours ; un client (texte de JC), **1 à 3 mercenaires** d'un **niveau de réputation minimal**, pour **3 à 21 jours**. Niveau tiré : 1★ 10 %, 2★ 30 %, 3★ 30 %, 4★ 20 %, 5★ 10 % ; les offres montent avec la compagnie : + max(0, niveau du meilleur mercenaire − 4), jusqu'à 15★ (proposé par JC, validé par Idan ; plus tard, lié à la renommée).
- **Cercle des Fines Lames** (doc 11 §7 ; Idan, 2026-11-03) : le paiement d'une offre × (1 + 5 % par niveau du Cercle), arrondi à 10 PO ; la fiche de l'offre montre le paiement, sans commentaire.
- **Paiement d'avance**, versé **le matin du départ** (Idan, 2026-11-02 : « On reçoit l'argent le lendemain matin ! Les SEPA heroic fantasy, c'est long » ; annuler avant le départ ne coûte ni ne rapporte rien), par mercenaire (formule de JC, validée et relevée sur les durées courtes par Idan) : **W × (2 + jours × (1,3 + (jours − 3) / 22))**, arrondi à 10 PO, où **W = 10 × Réputation minimale du niveau suivant / 30** (le salaire d'un mercenaire en haut du niveau demandé ; au-delà de 15★, × 1,25). Plus c'est long, plus la journée paie ; un mercenaire payé nettement plus que son niveau fait perdre de l'or, surtout sur les missions courtes.

  | Niveau | W | 3 jours | 7 jours | 14 jours | 21 jours |
  |---:|---:|---:|---:|---:|---:|
  | 1★ | 33 | 200 | 410 | 910 | 1 550 |
  | 3★ | 53 | 310 | 660 | 1 450 | 2 480 |
  | 5★ | 83 | 490 | 1 030 | 2 270 | 3 870 |
  | 10★ | 267 | 1 570 | 3 300 | 7 250 | 12 400 |
  | 15★ | 833 | 4 920 | 10 310 | 22 670 | 38 730 |

- **Qui** : un mercenaire au camp, disponible (ni blessé, ni fatigué), du niveau demandé ; pas le capitaine ni l'intendant (validé par Idan). Exactement le nombre demandé. Les salaires courent comme d'habitude.
- **Pas de combat.** Au retour, chacun tire son sort : **50 %** rentré ; **25 %** rentré fatigué (« il a trop gardé le corps de charmantes demoiselles », fatigue 1D3 jours) ; **25 %** rentré blessé (« bagarre dans une taverne », blessure 1D3 jours). Une fenêtre le dit, avec une ligne par mercenaire ; si plusieurs gardes rentrent le même matin, leurs fenêtres se suivent (correctif de Chatty, PR #310, issue #503).
- **Prime de mission** versée au retour. **Réputation** : +5 (rentré ou fatigué), +2,5 (blessé) (+10 et +5 avant le bêta-test, divisés par deux comme la renommée) ; **renommée de la compagnie** : +5 par mission (points de mission, doc 09 §2) — « un peu », chiffres de JC validés par Idan ; +10 avant le bêta-test, divisé par deux (Idan, 2026-11-07 : « On reduit par 2 la réputation donnée par les gardes du corps »).


## 13 — Tableau des missions (Idan, 2026-10-31)

À la Taverne, « Trouver une mission » montre une **carte par mission**, toutes au même gabarit
(`prototype-web/contract-ui.js`, `missionCards`) : illustration, type (« Faire le ménage », « Garde du corps »),
titre, description, difficulté en étoiles (la réputation minimale pour une garde du corps), récompense, durée. Au clic,
le **détail** : grande illustration, titre et étoiles, description, faits avec leurs icônes (commanditaire, distance,
ennemis, récompense, expiration…), la lettre du commanditaire s'il y en a une, et l'action (« Accepter le contrat »,
« Choisir les gardes »).

- **Illustration** : le champ `illustration` de la mission (`one-shot-missions.json`, `missions[]`) ou des gardes du corps
  (`bodyguard-missions.json`), chemin d'une image du site ; vide, un emblème de la mission en attendant l'image.
- **Difficulté** : la difficulté de la mission (`difficulte`) en étoiles de réputation (1 = 1 étoile de bronze), à
  caler avec Idan quand les missions plus dures arriveront.
- Un nouveau type de mission ajoute son gabarit dans `missionCards`.

## 14 — Points de combat et camps par peuple (Idan, 2026-11-01)

> « Le peuple est aléatoire, la difficulté dépend de la réputation et on équilibre la difficulté grâce aux nombre d'ennemis qu'on ajoute. » « Chaque ennemi devrait avoir un équivalent en point de combat […] et on monte des escouades grâce à cela. » « Oui, vas-y pour les points et 35 PO par point. »

- **Une seule carte « Faire le ménage »** au tableau ; son camp est tiré au hasard parmi les peuples de camps (`one-shot-missions.json`, `camps[]`, même poids) : **Gobelins**, **Orcs**, **Hommes-bêtes**, **Voleurs** (Humains) et **Ogres** (Idan : « vas-y pour le camp orc et enchaîne avec Hommes-bêtes, voleurs et Ogres »). Chaque peuple a ses lignes, son chef, ses trois ordres de mission et ses noms (tribus, chefs). Depuis le §19 : **Culte des morts** ; depuis le §20 : **Cour de sang**.
- **Points de combat** : chaque fiche (`enemy-archetypes.json`, `points`) vaut ce qu'elle pèse au combat, sur l'échelle d'un mercenaire généré moyen = 10 (simulateur : nombre d'exemplaires qu'il faut contre 3 mercenaires pour gagner une fois sur deux ; chefs : 10 × le nombre de mercenaires qui le battent une fois sur deux ; tous mesurés depuis le §15).
- **Budget** : une mission a le budget de sa difficulté (`budgets`) ; difficulté 1 : tiré entre **55 et 75 points**. Le camp prend son chef, puis tire des ennemis (lignes selon leurs poids ; « normal » dans 5 % des tirages, sinon novice) **tant que le total se rapproche du budget**. Résultat : 65 points en moyenne pour chaque peuple ; en plus du chef, 6,5 gobelins en moyenne (comme l'ancien camp à 1D4+4), 4,3 orcs, 3,7 hommes-bêtes, 3,5 voleurs ou 2,7 ogres. Le total s'écarte du budget d'au plus la moitié d'un « normal ».
- **Lignes des nouveaux peuples** : cinq rôles comme chez les gobelins (un front, un garde à bouclier ou arme lourde, un rapide, deux tireurs), avec les armes que ce peuple porte vraiment à la génération (mesuré sur 3 000 personnages générés). Mêmes armures par rôle et même spécialisation que les lignes gobelines correspondantes. Une ligne de chaque peuple, ses armes et ses poids peuvent changer sans toucher au reste : seuls ses points comptent pour le budget.
- **Récompense** : 35 PO par point de combat (même moyenne que 300 PO par ennemi pour les gobelins) : un camp plus dangereux paie plus, quel que soit le nombre d'ennemis.
- **Vérifié en campagne simulée** (avant le budget) : 1D4+2 orcs et leur Chef de bande (67 points) se jouent comme 1D4+4 gobelins et leur Caïd (65 points) : 94 % / 97 % de victoires en escouade complète, 48 % / 50 % avec 300 PO de primes.
- **Depuis le §16** : la Renommée donne le niveau de la mission, donc le budget, les niveaux des monstres, la récompense et le coffre.

### Archétypes orcs (2026-11-01)

Même méthode que les gobelins (§10), sur les centiles des Orcs générés (Orcs noirs, des villes, des steppes) : mêmes lignes, armes et armures ; base des personnages : Orcs des steppes. À niveau égal, un orc a environ 50 PV, 20 de Force et 11 points d'arme de plus qu'un gobelin, mais moins de Dextérité, d'Esquive, de Vitesse et de Perception.

| Points de combat | Novice | Normal | Vétéran | Élite |
|---|---|---|---|---|
| Lancier | 7 | 15 | 26 | 50 |
| Frondeur | 6 | 9 | 15 | 24 |
| Archer | 6 | 11 | 17 | 29 |
| Guerrier | 6 | 15 | 32 | 79 |
| Assassin | 5 | 10 | 18 | 34 |

Chefs (noms validés par Idan) : **Chef de bande orc** (P75, 38 points), **Chef de guerre orc** (P90, 77), **Seigneur de guerre orc** (P95, 135), **Khan des Steppes** (P99, 261 ; T4 De luxe, §17). Pour comparer : Caïd gobelin 30, Grand Caïd 58, Chef de clan 102.

Ordres orcs (Idan : « au pire, c'est un texte à changer ») : le chef de village (le vieux fort, le forgeron rendu avec une liste de commandes), le chef orc rival (« Un orc ne ment pas. Presque jamais. ») et l'ordre de l'Empereur (« une horde orque »). Texte complet dans `one-shot-missions.json` (`village_orcs`, `orc_rival`, `emperor_orcs`).

### Hommes-bêtes, Voleurs et Ogres (2026-11-01)

Même méthode, sur les centiles des personnages générés de chaque peuple (toutes ses cultures). Base des personnages : Tribus des forêts anciennes, Cités libres, Ogres des montagnes. Points de combat par niveau (novice, normal, vétéran, élite) ; poids de la ligne dans le camp entre parenthèses.

| Hommes-bêtes | Armes | Novice | Normal | Vétéran | Élite |
|---|---|---|---|---|---|
| Guerrier (30) | Hache de guerre + Rondache | 7 | 17 | 37 | 79 |
| Brute (20) | Hache double | 6 | 12 | 24 | 48 |
| Arbalétrier (20) | Arbalète | 7 | 12 | 19 | 30 |
| Traqueur (15) | deux Hachettes (+ Discrétion d'un cran) | 5 | 10 | 19 | 34 |
| Archer (15) | Arc | 6 | 10 | 16 | 27 |

Chefs (Hache de guerre + Rondache) : **Chef de harde** (41), **Grand Chef de harde** (82), **Seigneur des Bêtes** (133), **Roi-Totem** (237).

| Voleurs | Armes | Novice | Normal | Vétéran | Élite |
|---|---|---|---|---|---|
| Coupe-jarret (25) | deux Dagues (+ Discrétion d'un cran) | 5 | 10 | 18 | 34 |
| Spadassin (20) | Estoc + Rondache | 8 | 18 | 48 | 88 |
| Arbalétrier (20) | Arbalète | 8 | 13 | 20 | 31 |
| Archer (20) | Arc | 7 | 11 | 20 | 31 |
| Bandit (15) | Lance | 8 | 16 | 25 | 48 |

Chefs (Sabre + Rondache) : **Chef de brigands** (40), **Capitaine des brigands** (81), **Maître de la Guilde** (132), **Prince des Voleurs** (255).

| Ogres | Armes | Novice | Normal | Vétéran | Élite |
|---|---|---|---|---|---|
| Cogneur (30) | Massue | 9 | 17 | 34 | 56 |
| Écraseur (20) | Marteau de guerre | 9 | 19 | 44 | 83 |
| Tromblonnier (20) | Tromblon | 7 | 13 | 22 | 35 |
| Perceur (15) | Pic de guerre | 9 | 19 | 35 | 57 |
| Canonnier (15) | Canon à main | 8 | 13 | 22 | 34 |

Chefs (Marteau de guerre) : **Patron ogre** (42), **Grand Patron ogre** (67), **Tyran ogre** (98), **Ventre-Roi** (136).

Ordres (trois par peuple, textes de JC, à changer si besoin) : chef de village (les totems dans la forêt ; le droit de respirer du moulin ; les ogres qui « repasseront »), rival (corne-maîtresse d'une harde, maître voleur d'une confrérie, chef ogre qui veut récupérer sa marmite) et ordre de l'Empereur. Codes : `village_hommes_betes`, `beastman_rival`, `emperor_hommes_betes`, `village_voleurs`, `thief_rival`, `emperor_voleurs`, `village_ogres`, `ogre_rival`, `emperor_ogres`.

## 15 — Bestiaire : butin, niveau de mission minimum, chefs mesurés (Idan, 2026-11-01)

> « Il faut que tu fasses : le butin par créature, le niveau de mission minimum et les chefs qui n'ont pas de points mesurés. »

- **Niveau de mission minimum** (`enemy-archetypes.json`, `niveau_mission_min`) : de 1 à 15, comme les étoiles (1 à 5 de bronze, puis d'argent, puis d'or : « 2★ argent » = 7). Une créature ne sort que dans une mission de ce niveau ou plus : au tirage du camp, les lignes dont la fiche n'est pas permise sont écartées. **Toutes les fiches sont à 1 pour l'instant** (rien ne change en jeu) ; les niveaux se régleront avec le budget par étoile.
- **Butin par créature** (`butin`) : `equipement` = chance (%) de récupérer chaque objet porté par un ennemi mort (100 = la règle d'avant, §11) ; `objets` = objets en plus, chacun `{type, nom, tier, chance}` (type : `weapon`, `armor`, `potion`, `manual` ou un objet à bonus comme `ring`), tirés à la mort de la créature. **Toutes les fiches : 100 % de l'équipement, rien en plus** pour l'instant. L'équipement de nos morts revient toujours en entier.
- **Chefs mesurés** : les neuf chefs restés « au-delà de la mesure » sont mesurés sur leurs fiches figées, telles que le jeu les applique, contre 1 à 27 mercenaires générés (200 combats par effectif ; points = 10 × le nombre de mercenaires qui les battent une fois sur deux). Contrôle : le Grand Caïd (55) et le Tyran ogre (79) retombent à 51 et 81 avec la même méthode. Le tableau donne les points à jour (fiches T4 remesurées au §17).

| Peuple | Chef 1 | Chef 2 | Chef 3 | Chef 4 |
|---|---|---|---|---|
| Gobelins | Caïd 30 | Grand Caïd 58 | Chef de clan 102 | Roi des Cavernes 201 |
| Orcs | Chef de bande 38 | Chef de guerre 77 | Seigneur de guerre 135 | Khan des Steppes 261 |
| Hommes-bêtes | Chef de harde 41 | Grand Chef de harde 82 | Seigneur des Bêtes 133 | Roi-Totem 237 |
| Voleurs | Chef de brigands 40 | Capitaine des brigands 81 | Maître de la Guilde 132 | Prince des Voleurs 255 |
| Ogres | Patron 42 | Grand Patron 67 | Tyran 98 | Ventre-Roi 136 |

- **Design Lab, Bestiaire** : colonnes « Dès » (niveau de mission minimum) et « Butin » (chance par objet porté, et les objets en plus au survol).

## 16 — Niveau de mission, budget par métal, récompense, coffre (Idan, 2026-11-01)

> « Le joueur doit se prendre une branlée de temps à autre, sinon, c'est pas intéressant ! » « Les récompenses ne montent pas assez. » « Le coffre : ici, il faut des fourchettes très larges. C'est la partie loterie du butin. » « Je veux une ambiance à la X-com. »

Le niveau d'une mission va de 1 à 15, comme les étoiles : 1 à 5 étoiles de bronze (niveaux 1 à 5), d'argent (6 à 10), d'or (11 à 15). Dans les formules, « niveau » est ce nombre.

- **Niveau de la mission** = niveau de Renommée de la compagnie + un écart tiré entre −3 et +2, chaque écart avec la même chance, borné de 1 à 15 (`one-shot-missions.json`, `niveau.ecart`). Une compagnie de départ est à 2 ou 3 étoiles de bronze.
- **Budget en points de combat** (`budgets`, un par métal) :
  - Bronze : tirage 40–60 × niveau ; monstres novice / normal (50 % / 50 %) ; chef 1.
  - Argent : tirage 60–80 × niveau ; novice / normal / vétéran (25 % / 50 % / 25 %) ; chef 2.
  - Or : niveau² × tirage 8–12 ; vétéran / élite (50 % / 50 %) ; chef 3 ou chef 4 (50 % / 50 %). Le niveau 5 de monstre viendra plus tard.
  - Le chef compte dans le budget. Puis des ennemis (niveau selon le métal, ligne selon son poids dans le camp) tant que le total plus la moitié du suivant reste dans le budget ; **au plus 100 ennemis, plus le chef** (`max_ennemis` ; Idan, 2026-11-02 : « 100 + chef… j'ai dit 100 pour qu'on n'ait pas vraiment de limites »).
  - **Chef permis** (Idan, 2026-11-02) : le chef du métal doit être permis au niveau de la mission (`niveau_mission_min`, comme les troupes) ; sinon on prend le cran en dessous (chef 4, 3, 2, 1) ; si le peuple du camp n'a aucun chef permis, on tire un autre camp. Sans effet tant que tous les chefs sont au niveau 1.
- **Jours de marche** : tirage de 1 au niveau (jusqu'à 15 jours en 5 étoiles d'or).
- **Récompense** = 5 000 + tirage 30–40 × budget × niveau (`recompense`). Plus de part par jour de marche ni par point.
- **Butin des morts** : l'équipement peut se casser au combat ; chance de récupérer chaque objet porté = 100 % − 10 % par tier (T1 90 %, T2 80 %, T3 70 %, T4 60 % ; `enemy-archetypes.json`, `butin.equipement`). L'équipement de nos morts revient toujours en entier.
- **Coffre** (`coffre`) : la loterie.
  - Or = tirage 1–100 × budget × niveau ÷ 2.
  - Objets : T1 1D6 × niveau ; T2 1D3 × niveau ; T3 ⌈1D6 × niveau ÷ 5⌉ ; T4 ⌈1D6 × niveau ÷ 5⌉ − 2 (au moins 0). La famille de chaque objet est tirée au hasard (arme, armure, objets à bonus). Le T4 se trouve dès 3★ bronze, une fois sur deux : c'est voulu (Idan : « l'idée, c'est qu'on porte du T4 ») ; la destruction d'objets par l'artisanat et les propriétés magiques viendront.
  - Manuels : chaque sort d'une seule école a niveau % de chance d'y être (90 sorts : 0,9 manuel en moyenne en 1★ bronze, 13,5 en 5★ or). Détruire un manuel pour gagner de l'XP de sort viendra.
- **Carte** : 30 × 15 cases (`carte`). Obstacles, défenses et remparts autour du camp : plus tard.

Ordres de grandeur (moyennes) :

| Mission | Budget | Ennemis (+ chef) | Récompense | Or du coffre | Objets T1 / T2 / T3 / T4 | Manuels |
|---|---|---|---|---|---|---|
| 1★ bronze | 50 | 1 à 2 | 6 750 | 1 260 | 3,5 / 2 / 1,2 / 0 | 0,9 |
| 3★ bronze | 150 | ~12 | 20 750 | 11 400 | 10,5 / 6 / 2,5 / 0,7 | 2,7 |
| 5★ bronze | 250 | ~22 | 48 750 | 31 600 | 17,5 / 10 / 3,5 / 1,7 | 4,5 |
| 1★ argent | 420 | ~25 | 93 000 | 63 600 | 21 / 12 / 4,5 / 2,5 | 5,4 |
| 5★ argent | 700 | ~45 | 250 000 | 177 000 | 35 / 20 / 7 / 5 | 9 |
| 1★ or | 1 210 | ~35 | 471 000 | 336 000 | 38 / 22 / 7,5 / 5,7 | 10 |
| 5★ or | 2 250 | ~70 | 1,19 M | 850 000 | 52 / 30 / 10,5 / 8,5 | 13,5 |

Mesuré au simulateur (compagnie de départ complète, une quinzaine de mercenaires, 64 combats par budget, ennemis à 50 % novices et 50 % normaux, chef 1) : budget 50 : 100 % de victoires ; 100 : 88 % (capitaine mort 19 %) ; 150 : 64 % (34 %) ; 250 : 31 % (53 %). En jeu : 42 ennemis en 3★ argent, 88 en 5★ or, sans souci de calcul.

## 17 — Qualités par tier, fiches T4 remesurées (Idan, 2026-11-01)

> « Usé / Correcte / De bonne facture / De luxe. On aura du T5 et du T6 qui vont venir et des cristaux sur les armes. »

Une qualité par tier (`item-qualities.json`, doc 05) : T1 Usée, T2 Correcte, T3 **De bonne facture** (l'ancien « Grand Luxe », mêmes valeurs : +20 % / −20 % / prix × 1,5), T4 **De luxe** (valeurs bénéfiques +40 %, malus −40 %, prix × 2,5). Les 40 fiches équipées en T4 (élites et chefs 2 à 4) passent de +20 % à +40 % : leurs points sont remesurés (même méthode qu'au §15, 200 combats par effectif) et reportés dans les tableaux ci-dessus. Les élites de mêlée prennent le plus (Guerrier orc 51 → 79, Spadassin 58 → 88, Écraseur ogre 54 → 83) ; les tireurs peu. Chefs 4 : Roi des Cavernes 201, Khan des Steppes 261, Roi-Totem 237, Prince des Voleurs 255, Ventre-Roi 136.

## 18 — Taverne à 5 missions (Idan, 2026-11-01)

> « La taverne a 5 missions. On génère aléatoirement une mission. Une fois la mission prise, on laisse 24 h une case vide et on régénère une mission. » « Totalement aléatoire sur le type de missions. On va en avoir une dizaine de types à terme. Le niveau de référence, c'est la réputation de la compagnie. »

- **5 cases** au tableau des missions de la Taverne (`formula-constants.json`, `tavern.missions.slots`). Chaque case tire un type de mission au hasard, chacun avec la même chance : aujourd'hui « Faire le ménage » ou garde du corps. Un nouveau type de mission s'ajoute à ce tirage.
- **Niveau** : le contrat suit la Renommée de la compagnie (§16) ; la garde du corps garde sa règle (le meilleur mercenaire, §12).
- **Case prise** : une offre signée laisse sa case vide jusqu'au lendemain (`tavern.missions.empty_days`, 1 jour), puis une nouvelle mission arrive. Plusieurs escouades peuvent partir en même temps.
- **Offre perdue** : une offre non signée qui dépasse sa date est prise par une autre compagnie et remplacée aussitôt. Le journal le dit ; la notification du jour n'en fait plus une alerte (une seule ligne).
- **Anciennes sauvegardes** : l'offre de contrat et l'offre de garde du corps passent dans les deux premières cases.
- Code : `game-core/campaign.js` (`tavernBoard`, `fillTavernBoard`, `boardOffers`, `boardOffer`) ; interface `prototype-web/contract-ui.js` (une carte par case, « Nouvelle mission demain » pour une case vide).


## 19 — Culte des morts (Idan, 2026-11-06)

> « On ajoute des factions morts-vivants ? Une plutôt basée sur un vampire comme capitaine et l'autre sur un nécromancien… » « Oui, insensibles aux poisons. Squelettes très résistants aux dégâts tranchants, très faibles aux contondants… » « Les portraits arriveront ! »

Sixième peuple de camp (`one-shot-missions.json`, camp « Cimetière profané »), tiré comme les autres (un camp sur six). La Cour de sang (vampire) suivra.

| Culte des morts | Armes | Novice | Normal | Vétéran | Élite |
|---|---|---|---|---|---|
| Squelette guerrier (30) | Épée courte + Rondache | 12 | 22 | 42 | 66 |
| Squelette archer (20) | Arc | 12 | 19 | 31 | 46 |
| Zombie (20) | Griffes (arme naturelle, 1D8) | 8 | 14 | 22 | 32 |
| Acolyte (20) | deux Dagues | 5 | 11 | 20 | 40 |
| Spectre (10) | Toucher spectral (psychique, 1D6) | 12* | 22* | 42* | 66* |

Chefs (Bâton long, école de Nécromancie) : **Nécromancien** (31), **Maître nécromancien** (56), **Seigneur des tombes** (88), **Roi des morts** (130). Leurs sorts (maîtrise 65, 80, 100 et 130 ; 20, 35, 50 et 65 au départ, Idan : « monte la maîtrise à 65 », « le roi des morts… Il devrait être à 130 ! », « le 2 à 80 et le 3 à 100 »), dans l'ordre où l'IA les essaie : Armée d'os, Invocation de spectre (chefs 3 et 4), Résurrection, Malédiction (dès le chef 2), Siphon d'âme (chef 4), Nécrose (chefs 3 et 4), Flèche de mort. Règles des morts-vivants et IA des sorts : doc 04, « Invocations et morts-vivants ».

- **Nécromancien plus fort** (Idan : « pourquoi il est bien plus faible que les autres chefs ? », puis « B, vas-y ») : il a le corps du Chef de brigands, mais un Bâton long sans bouclier ni armure, et ses sorts ne lui apportaient presque rien (contre 2 mercenaires : 48 % de victoires, 52 % sans aucun sort ; 80 % armé comme le Chef de brigands). Depuis : **Réserve de mana doublée** (134, 142, 168, 168), **Armée d'os déjà levée** au début du combat (`sort_initial`), **en retrait** derrière ses troupes (`en_retrait` ; doc 04). Remesurés : 25 → 26, 42 → 46, 62 → 83, 104 → 126 (les chefs 3 et 4 en profitent le plus) ; puis ses sorts à la maîtrise 65, 80, 100 et 130 : 26 → 31, 46 → 56, 83 → 88, 126 → 130 ; encore en dessous des autres peuples (environ 40, 80, 130, 250), compensé par le budget du camp.
- **Morts-vivants** (squelettes, zombies, spectres) : sans peur, insensibles au poison. **Squelettes** : dégâts tranchants × 0,5, contondants × 1,5 (`degats_subis`). **Spectres** : insensibles aux dégâts physiques (tranchants, perforants, contondants : armes et sorts physiques) et au poison ; les dégâts d’eau, de feu et de foudre les blessent (sorts, et Arme enflammée même quand la lame les traverse), comme les sorts psychiques et nécrotiques (Idan : « tous les dégâts eau / feu / foudre devraient le blesser »). À partir du niveau de mission 6 (Idan : « un peu plus tard. 6 ou 7 »).
- **Points** : même méthode qu'au §14 (troupes contre 3 mercenaires générés, chefs contre 1 à 27 ; un combat bloqué compte comme une victoire ennemie), 120 combats par effectif, sur une carte 30 × 15 sans décor. **Recalage × 1,2** : les fiches témoins des Voleurs (Coupe-jarret, Spadassin, Archer, Bandit, Chef de brigands) mesurées le même jour sortent en moyenne 1,2 fois plus bas que leurs points figés ; les points du Culte sont donc les mesures × 1,2, pour rester sur la même échelle que les autres peuples.
- **\* Spectre, points provisoires** (ceux du Squelette guerrier) : il ne se mesure pas. Seul contre 10 mercenaires, il gagne 77 % (novice) à 91 % (élite) des combats, même quand nos mages lancent leurs sorts, car rien d'autre ne le blesse et le combat bloqué compte pour lui. À revoir avec Idan.
- **Ordres** : le chef de village (les tombes ouvertes), le prêtre (`noms_commanditaire` : `pretres`) et l'ordre de l'Empereur. Codes : `village_culte`, `priest_culte`, `emperor_culte`. Noms : `cultes_des_morts`, `necromanciens`.
- **Cimetière** (`mission-landscapes.json`) : tombes (nouveau décor, infranchissable, transparent, couverture partielle), un peu de forêt, de marais, de buissons et d'éboulis ; enceinte de **murets** au lieu de la palissade ; camp au sol.
- Code : `game-core/missions.js` (`applyArchetype` : `attaque`, `mort_vivant`, `insensible_poison`, `immunite_physique`, `degats_subis`, `ecoles`, `sorts`), `game-core/combat-engine.js` (`poisonImmune`, `damageTypeFactor`), `prototype-web/mission.js` (`missionAiSpell`). Test : `tests/undead-cult.test.js`.

## 20 — Cour de sang (Idan, 2026-11-06)

> « Ajoute aussi des chauves-souris. Elles volent donc ignorent les pénalités de mouvement ! J'aimerais bien qu'on donne quelques sorts à notre vampire. » « Elles survolent tout. » « Dans ma tête, les vampires et rejetons sont très classe et dandy, pas bête sauvage. C'est plutôt estoc, drain de vie, sort d'illusions. » « murs ok »

Septième peuple de camp (`one-shot-missions.json`, camp « Château maudit »), tiré comme les autres (un camp sur sept). Même échelle que le Culte des morts (les fiches Voleurs, Humains des Cités libres).

| Cour de sang | Armes | Novice | Normal | Vétéran | Élite |
|---|---|---|---|---|---|
| Garde de sang (25) | Hallebarde, armure de la Cotte de mailles aux plates | 6 | 14 | 31 | 68 |
| Rejeton (20) | Estoc seul ; Drain de vie, Choc psychique (maîtrise 20 à 65) | 7 | 16 | 26 | 52 |
| Arbalétrier asservi (15) | Arbalète | 12 | 22 | 32 | 55 |
| Goule (15) | Griffes (arme naturelle, 1D8) | 11 | 19 | 30 | 48 |
| Loup (15) | Morsure (1D8) | 5 | 10 | 18 | 31 |
| Chauve-souris (10) | Morsure (1D6) ; vole | 5 | 8 | 18 | 34 |

Chefs (Estoc seul, « combat à une main ») : **Vampire** (34), **Seigneur vampire** (66), **Comte de sang** (97), **Prince de la nuit** (184). Ils régénèrent (`regeneration` : 50, 75, 100, 150 ; la règle du sang de troll, que le feu bloque) et lancent, à la maîtrise 65, 80, 100 et 130 comme les nécromanciens, dans l'ordre où l'IA les essaie : Drain de vie, Création de double (chef 4), Désespoir (dès le chef 2), Sommeil, Brouillage mental (chefs 3 et 4), Choc psychique.

- **Morts-vivants** : le vampire, les rejetons et les goules (insensibles au poison). Gardes, arbalétriers, loups et chauves-souris sont vivants.
- **Vol** (`vol`) : les chauves-souris ignorent décor, montées et falaises (1 point par case) et survolent les murs, rochers et maisons sans pouvoir s'y arrêter (doc 04).
- **Drain de vie** : l'IA se le lance (action rapide) quand un ennemi est à portée de ses pas, puis frappe (doc 04).
- **Points** : même méthode et même recalage × 1,2 qu'au §19, 120 combats par effectif. La Cour est plus dure que le Culte : ses chefs se battent eux-mêmes et régénèrent (34, 66, 97, 184, contre environ 40, 80, 130, 250 pour les autres peuples).
- **Ordres** : le chef de village (le château qui se rallume, les gens qui reviennent très pâles et très polis), une famille noble (leur fille partie au bal, `noms_commanditaire` : `nobles`) et l'ordre de l'Empereur. Codes : `village_cour`, `noble_cour`, `emperor_cour`. Noms : `cours_de_sang`, `vampires`.
- **Château en ruine** (`mission-landscapes.json`) : éboulis, murs, gros rochers, buissons, une tombe, un peu de marais ; le camp sur un plateau de hauteur 2, avec ses rampes, entouré de **murs** (qui bloquent la vue : on ne voit dedans, et eux dehors, que par les ouvertures).
- Code : `game-core/missions.js` (`applyArchetype` : `vol`, `regeneration`), `prototype-web/mission.js` (`missionFlies`, `missionAiSpell`). Test : `tests/blood-court.test.js`.

## 21 — Troll (Idan, 2026-11-06)

> « On va ajouter un troll. Niveau 1 à 4. Peut être chez les orcs, les gobelins ou les hommes bêtes à partir de 6*. Il est lent, bête mais fort et très intimidant. Il se régénère et tape avec une grosse massue. En force je dirais : 80/100/140. En PV : 300/600/900/1200. » Puis : « 80/100/120/140 », « ok pour la régénération ».

Une ligne **Troll** (poids 10) dans les camps gobelin, orc et homme-bête, à partir du niveau de mission 6 (1★ argent). **Une seule série de fiches** (Idan : « Ça devrait être les mêmes fiches qui s'intègrent pour les différentes factions ») : `troll_novice`, `troll`, `troll_veteran`, `troll_elite`, de la famille **Créatures** (`enemy-archetypes.json`, faction « Créatures »), qu'un camp appelle par sa ligne (`one-shot-missions.json` : `{"ligne": "Troll", "faction": "Créatures", "poids": 10}`). D'autres créatures partagées (un loup dans un camp gobelin) pourront s'y ajouter.

| Troll | Force | PV | Régénération | Vitesse | Intelligence | Intimidation | Points |
|---|---|---|---|---|---|---|---|
| Novice | 80 | 300 | 100 | 25 | 10 | 70 | 17 |
| Normal | 100 | 600 | 150 | 30 | 12 | 80 | 47 |
| Vétéran | 120 | 900 | 200 | 35 | 14 | 90 | 99 |
| Élite | 140 | 1200 | 300 | 40 | 16 | 100 | 180 |

- **Base** : le Cogneur ogre de même niveau (les autres caractéristiques, les résistances, les compétences), puis Force, PV, Vitesse (lent), Intelligence (bête), Courage (70 à 85) et Intimidation (au-dessus de toutes les autres fiches, 67 au plus) du troll.
- **Grosse massue** : son arme propre (2D8, contondant 80), comme les griffes du zombie : elle ne tombe pas en butin.
- **Régénération** : la règle du sang de troll (au début de chaque activation, 2D6 × (0,5 + Régénération / 50) PV, soit environ 17, 24, 31 et 45 PV) ; brûlé depuis sa dernière activation, rien.
- **Points** : même méthode et même recalage × 1,2 (§19) ; le troll d'élite, trop fort pour la méthode des troupes, est mesuré comme un chef (il bat 15 mercenaires une fois sur deux).
- **Poids** : comme pour toute ligne, la chance qu'un ennemi tiré soit un troll (10 sur 110, soit 9 %), pas la chance par camp ; avec des camps de dizaines d'ennemis à partir du niveau 6, presque chaque camp de ces trois peuples a au moins un troll.
- Test : `tests/troll.test.js`.

### Troll mort-vivant (Idan, 2026-11-06)

> « Un troll mort vivant pour l'équipe du nécromancien… » ; « Non, pas de régénération ».

Quatre fiches de la famille **Créatures** (`undead_troll_novice`, `undead_troll`, `undead_troll_veteran`, `undead_troll_elite`) : le troll (mêmes caractéristiques, PV, Grosse massue, Intimidation), **sans régénération**, mort-vivant (sans peur, insensible au poison). Ligne **Troll mort-vivant** (poids 10) au camp du Culte des morts, à partir du niveau de mission 6. Points (× 1,2, l'élite mesuré comme un chef) : **19, 47, 91, 140** (le troll : 17, 47, 99, 180) ; sans régénération, il coûte moins aux hauts niveaux.

## 22 — Cavalier (Idan, 2026-11-07)

> « On ajoute des montures aux ennemis. » « Faisons une nouvelle ligne, cavalier dans le camp des voleurs, on étendra plus tard avec un jet de proba pour les chefs. » « Restons sur le Destrier pour l'instant. »

Une ligne **Cavalier** (poids 10) au camp de voleurs, dès le niveau de mission 1 : `thief_rider_novice`, `thief_rider`, `thief_rider_veteran`, `thief_rider_elite`, chacun sur un **destrier** (`monture`, `mounts.json` ; les règles du combat à cheval : doc 04).

| Cavalier | Base | Armes | Armure | Compagnon animal | Équidés | Points |
|---|---|---|---|---|---|---|
| Novice | Bandit novice | Lance + Rondache | Gambison | 48 | 36 | 17 |
| Normal | Bandit | Lance + Rondache | Armure de cuir | 54 | 44 | 28 |
| Vétéran | Bandit vétéran | Lance + Rondache | Cuir renforcé | 59 | 51 | 49 |
| Élite | Bandit d'élite | Lance + Rondache | Brigandine | 63 | 57 | 74 |

- **Base** : les caractéristiques, les PV, l'Intimidation et la lance du Bandit de même niveau ; la rondache, l'armure et le port d'armure du Spadassin ; Compagnon animal et Équidés aux centiles des humains générés (P20, P50, P75, P90), soit une part de 0,84 à 1 pour le partage du Courage et de la Volonté avec son cheval.
- **Points** : cavalier et cheval ensemble (le cheval frappe aussi, dans l'activation de son cavalier, en charge et en attaque d'opportunité ; sa fiche complète, Discrétion du couple la plus basse, Intimidation la plus haute : doc 04 ; mesurés sur 360 combats par point ; au départ, 12, 22, 46 et 70), même méthode et même recalage × 1,2 qu'au §19 ; le vétéran et l'élite, trop forts pour la méthode des troupes, sont mesurés seuls contre 3 à 6 mercenaires. Pour comparer, le Bandit vaut 8, 16, 25 et 48. Sa charge (lance, 8 à 16 cases, la moitié de la Force du cheval en plus) frappe très fort : jusqu'à 190–270 PV d'un coup dans les combats de mesure.
- **Butin** : celui du Bandit (100 % − 10 % par tier) ; le cheval tombé peut être capturé après la victoire (test de survie, une place aux Écuries ; doc 11 §8).
- **Mission Test** : le deuxième ennemi est un Cavalier, sur son destrier.
- Test : `tests/mounts.test.js`.

## 23 — Chasses (Idan, 2026-11-07)

> « On va pouvoir travailler sur les missions Éliminez la bête. Récompense de 1000 Po par étoile. 0,25 à 1 jour de marche par étoile. Arrondi sup. Textes cohérents avec l'espèce : Version Meute de Loup : 3D6 par étoile. Version Licorne : 1D6 par étoile. On élimine les animaux. On peut en capturer ou se prendre une pilée ! On génère des missions -2 / +2 étoiles par rapport à l'étoile. » « Les fiches fixes. » « Éliminez la bête, c'est notre nom interne pour classer les missions… On peut trouver mieux et plus variés. »

Deux missions (`one-shot-missions.json`, celles qui ont une `bete`) : **Chasse au loup** (`hunt_wolves`) et **Chasse à la licorne** (`hunt_unicorn`).

- **Difficulté** : le niveau de Renommée de la compagnie + un écart de −2 à +2 (`niveau.ecart`), de 1 à 15.
- **Les bêtes** : **1D6 loups par étoile** (3★ : 3D6, une dizaine), **1D3 licornes par étoile** ; au plus 100. Après le bêta-test (Idan, 2026-11-07 : « On passe la mission loup à 1D6 loups au lieu de 3D6 et les licornes en 1D3 ») ; avant : 3D6 loups et 1D6 licornes par étoile. Elles ont la **fiche fixe** de nos animaux (`mounts.json` : le Loup, la Licorne), quelle que soit l'étoile : pas de chef, pas de niveaux. Elles se battent et fuient comme tout combattant ; la licorne lance sa Création de double.
- **Marche** : étoiles × un tirage de 0,25 à 1, arrondi au jour supérieur.
- **Récompense** : **1 000 PO par étoile**, seule : ni coffre ni butin (l'équipement de nos morts revient). Un échec fait baisser la renommée et une défaite double le jet de mort, comme un contrat.
- **Capture** : après la victoire, chaque bête restée à terre passe le test de survie et rentre avec l'escouade, s'il reste une place au Chenil (loups) ou aux Écuries (licornes ; doc 11 §8).
- **Au tableau** : environ **une case sur cinq** (`tavern.missions.weight_*` : contrat 2, garde du corps 2, chasse 1) ; les loups **3 fois sur 4** (`poids`). Elle se signe comme un contrat (l'escouade part le lendemain matin).
- **Lieux** : « Repaire des loups », « Territoire de la meute », « Bois des hurlements » ; « Bois de la licorne », « Vallon de la licorne », « Sanctuaire de la licorne » ; paysages : **Forêt profonde** (loups), **Clairière** (licornes), sans enceinte (`mission-landscapes.json`).
- **Lettres** : un village d'éleveurs et un seigneur sans gibier pour les loups ; un noble endetté et un alchimiste pour les licornes (`ordres`, noms `alchimistes`).
- Code : `missions.js` (`createHunt`, `rollBeasts`, `huntDistance`, `buildEnemies`), `campaign.js` (tableau), `mission.js`, `contract-ui.js`. Test : `tests/hunts.test.js`.
