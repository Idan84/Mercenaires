# Tags des mercenaires

> **Les §1 à §10 sont l'historique** (décisions d'Idan du 2026-11-12, niveaux retirés le 2026-11-20) : ce système a été
> retiré du jeu le 2026-11-22 (onglet Rôle et occupations, demandes à l'intendant, « Retaguer la compagnie », moteurs
> `mercenary-tags.js` et `steward-tags.js`, données `mercenary-tags.json` et `steward-tags.json` ; l'historique Git les
> garde). **Le jeu suit la refonte : l'atelier des tags (§11), branché dans le jeu (§12).** La colonne `tags` de
> `spells.json` reste lue par l'atelier.

## 1 — Pourquoi

Le joueur note ce qu'il veut faire de chaque mercenaire, y compris pour les rôles de mission (Idan : « Ce qui compte,
c'est qu'il puisse retrouver rapidement, dans sa compagnie, qui doit faire quoi »). Il interprète les tags comme il veut.

- **Aucun tag n'en exclut un autre** : « Armures de plates + magie, c'est le problème du joueur. »
- **Les sous-tags allument les tags** : cocher Boule de feu allume Feu, puis Entraînement. Éteindre un tag éteint ses
  sous-tags.
- **Tous les tags se cochent**, même seuls (« on peut taguer juste Animal »).
- Aucune règle de jeu ne lit les tags.

## 2 — Les trois colonnes

### Occupations principales (tons rouges) — comment il occupe ses journées

- **Mission** → Camps (une faction par camp : Gobelins, Orcs, Hommes-bêtes, Voleurs, Ogres, Culte des morts, Cour de sang)
  et Chasses (Loups, Licornes, Cerbères, Chiens sauvages, Papillons).
- **Garde du corps**, sans sous-tags.
- **Job** → Bûcheron, Mines, Palais des plaisirs.
- **Entraînement** (à la place des missions) → ce qu'on fait progresser, nommé par ce qu'on travaille et non par le lieu :
  caractéristiques, résistances, armes et styles, Discrétion, Pièges, Réserve de mana, les 9 écoles de magie, les
  familles d'animaux ; puis les apprentissages sans parent (Port d'armure légère, intermédiaire, lourde, Empoisonnement
  des armes). Sous une école, ses sorts ; sous une famille d'animaux, ses montures à apprivoiser.
- **Poste** → Intendant, Médecin, Directeur de l'École, Doctore, Vétéran, Maître des lames, Alchimiste, Maître des
  plaisirs, Dresseur, Officier (pas « lieutenant » : d'autres grades viendront).

Laissés de côté (on ne les prévoit pas) : la Cave, le Cachot, le repos et les soins, la Cantine.

### Équipement (tons verts) — ce qu'il porte ou doit porter

- **Arme** → les familles (Lames longues, Lames courtes, Armes d'hast, Haches, Armes contondantes, Armes articulées,
  Bâtons, Armes de tir, Armes à feu), puis leurs armes.
- **Style de combat** → Une main, Deux armes, Deux mains, Bouclier ; sous Bouclier, les boucliers (Écu, Rondache,
  Pavois).
- **Armure** → Légère, Intermédiaire, Lourde, puis leurs armures ; Vêtements.
- **Caractéristiques** → tout ce qu'un objet augmente (un mage du feu : Intelligence, Puissance magique, Feu, Mana) :
  caractéristiques, Puissance magique, Réserve de mana, écoles de magie, Discrétion, Pièges, Intimidation, Compagnon
  animal, Affinité.

Ni monture ni potion.

### Rôle au combat (tons bleus) — à quoi il sert sur le champ de bataille

Une seule liste, avec sous-catégories et sous-sous-catégories, pensée en JDR général plutôt qu'à partir de ce que le jeu
mesure ; seulement ce qui existe dans le jeu ; rien de ce qui relève de l'équipement (encaisser, esquiver, bloquer…).

- **Dégâts** → De zone, Charge, À distance, Tranchant, Perforant, Contondant, Brûlant, Glaçant, Foudroyant, Corrosif,
  Poison, Nécrotique, Anti morts-vivants, Anti invocations (les types de dégâts directement, sans tag « type de
  dégâts »).
- **Soin** → De zone, Dans la durée.
- **Soutien** → Enchantements, Dégâts élémentaires (Brûlant, Glaçant, Foudroyant), Discrétion, Récupération de mana, Purges.
- **Protection** → Protection élémentaire (Contre le feu, Contre le froid, Contre la foudre), Protection à distance.
- **Entrave** → Immobilisation, Affaiblissement, Démoralisateur, Anti-magie, Anti-soins.
- **Contrôle du terrain**, **Commandement**, **Éclaireur**.
- **Magie** → les 9 écoles.
- **Animal** → les familles qui ont des animaux, puis leurs animaux.
- **Régénération**, **Vol**.

## 3 — Les listes viennent des données

Une liste peut être écrite à la main ou tirée des données du jeu : une nouvelle faction, chasse, entraînement au camp,
sort, arme, armure, bonus d'objet ou un nouvel animal a son tag sans toucher au fichier des tags. Les noms connus ont
leur ordre ; les nouveaux viennent ensuite. Une famille d'animaux du Compagnon animal (Rapaces, Félins…) apparaît le
jour où elle a son premier animal.

L'identifiant d'un tag est son chemin (`role/degats/brulant`). Le mercenaire garde avec lui ses tags : ceux du joueur,
ceux de l'intendant, et les tags de l'intendant que le joueur a éteints.

## 4 — L'onglet Rôle et occupations (phase 1)

« On fait très simple en phase 1 » : un onglet de la fiche avec les tags qu'on allume et éteint.

- Dernier onglet de la fiche, pour ceux de la compagnie (pas un candidat de la Taverne) ; il s'appelle « Rôle et
  occupations ».
- En haut : « Ces tags vous permettent de vous souvenir à quoi peut servir ce mercenaire. »
- Trois colonnes en accordéon ; une couleur par colonne, plus claire à chaque niveau. Une petite flèche à droite du tag
  ouvre la sous-catégorie ; ce qui est ouvert le reste d'une fiche à l'autre. Sur téléphone, les colonnes passent l'une
  sous l'autre.
- Pas de case à cocher : des tags grisés ou non. Le clic allume ou éteint ; éteindre un tag éteint ses sous-tags.
- Les tags de l'intendant portent un petit point ; le joueur l'emporte. Avec un intendant nommé, « Demander à
  l'intendant » en haut de l'onglet (sans intendant : « Nommez un intendant : il proposera ses tags. ») ; à
  l'Intendance, « Retaguer la compagnie ».

## 5 — L'intendant qui tague : les principes (2026-11-12)

Il faut un intendant nommé. D'abord sans biais (on en ajoutera) ; les questions fermées viendront ensuite : les mêmes
constats, mis en phrases.

- **Toujours comparer à la bande, jamais à des recrues générées** (« Le dresseur, il doit pas être bon, il doit être
  parmi les 3 moins mauvais ») : médiane, quarts, rang.
- **La bande** : ceux qui peuvent partir en mission, capitaine compris ; pas l'intendant, le médecin ni les maîtres à
  leur poste.
- **Tout compte** : sorts, compétences, caractéristiques et l'équipement porté (le tank en armure de plates et bouclier
  l'est par son équipement). Un objet à effet compte comme un sort qui réussit toujours (100 %).
- **Ce qu'on a ou pas** (un sort, un objet à effet) donne le tag dès qu'il l'a. **Ce que tout le monde a un peu** (une
  caractéristique, une compétence) donne un tag au-dessus de la médiane de la bande, un sous-tag dans le quart du haut.
- **Classement dans un rôle** : sa meilleure place parmi les sources du rôle.
- **Le vol**, un gros bonus : +25 points sur 100 à sa place dans chacun de ses rôles, plafonné à 100.
- **Les sorts** portent leurs tags dans leurs données (préremplis d'après l'effet et la description, relus par Idan) :
  un nouveau sort arrive avec ses tags.
- **Dynamique** : rien d'écrit en dur sur les camps, les monstres ou les missions (on en ajoutera).
- **Ses tags et ceux du joueur** : un clic sur un tag de l'intendant l'éteint et l'intendant retient le refus ;
  **retaguer** (un bouton à l'Intendance pour toute la compagnie, un dans l'onglet pour un mercenaire) ne remplace que
  ses tags, jamais ceux que le joueur a cochés. Il compare toujours à toute la bande.

## 6 — Les règles du Rôle au combat

- **Soin** : il connaît un sort qui soigne quelqu'un (Soin rapide, Soin profond, Régénération, Soin de masse, Lien de vie,
  Eau guérissante, Cautérisation). Classement : chance de réussite × soin moyen de son meilleur sort de soin (les calculs
  de l'aperçu des sorts). **De zone**, **Dans la durée** : d'après le sort.
- **Soutien** : un sort lancé sur un allié pour l'aider sans le soigner (pas ceux qui ne visent que le lanceur :
  Célérité, Siphon d'âme, Pacte de sang), ou un objet à aura (le fouet). Classement : la somme des chances de réussite
  de ses sorts de soutien (un objet : 100 %). **Enchantements** (bonus de caractéristique sur un allié, dont Frénésie,
  Crachat de venin, Soutien illusoire, Courage de masse), **Dégâts élémentaires** → Brûlant (Arme enflammée, Torche
  vivante), Glaçant (Arme de glace), Foudroyant (Arme électrique), **Discrétion** (Avancée cachée), **Récupération de
  mana** (Source vive), **Purges** (Purge, Délivrance).
- **Protection** : un sort qui protège un allié ou lui-même (Armure de feu, Armure de froid, Peau d'écailles, Champ de
  protection, Peau de pierre — qui donne aussi Enchantements), ou sa **solidité** au-dessus de la médiane : le nombre de
  coups moyens qu'il encaisse (PV, esquive, bouclier, armure, avec les calculs du combat). Classement : sa meilleure
  place entre sa solidité et ses sorts. **Protection élémentaire** → Contre le feu, Contre le froid, Contre la foudre :
  un sort (croisé : l'Armure de froid protège du feu, l'Armure de feu du froid, la Peau d'écailles des trois) ou sa
  propre résistance dans le quart du haut. **Protection à distance** : un sort contre les projectiles (Champ de
  protection) ; pas le bouclier, qui bloque les tirs comme les coups.
- **Entrave** : **Immobilisation** (Paralysie, Sommeil, Prison de glace, Écrasement), **Affaiblissement** (Gel, Nuée
  d'insectes), **Démoralisateur** (Peur, Désespoir ; ou son Intimidation dans le quart du haut : en combat, « Courage +
  ¼ Volonté − ¼ Intimidation adverse »), **Anti-magie** (Brouillage mental, Siphon d'âme), **Anti-soins**
  (Flétrissement). Classement : sa meilleure place entre ses sorts et son Intimidation.
- **Contrôle du terrain** : les sorts qui changent le terrain ou déplacent (Flaque de magma, Mur de flammes, Brouillard,
  Bourbier, Blizzard, Tempête, Onde de choc, Déplacement, Attraction, Projection). Ni les armes d'hast ni Création de
  double.
- **Commandement**, sur ses troupes seulement : le grade (capitaine, officiers), les sorts Courage de masse et Soutien
  illusoire, un objet à aura (le fouet) ; sinon son aura d'officier (17,5 % du Courage + 12,5 % du Charisme, la formule
  du lieutenant) au-dessus de la médiane. Peur et Désespoir n'en donnent pas.
- **Éclaireur** : la moyenne de ses places en Discrétion (s'il revient) et en Perception (ce qu'il voit) au-dessus de la
  médiane, ou le sort Corbeau.
- **Magie** : au moins un sort. **Une école** : il y connaît un sort, et il y a au moins les trois quarts de la maîtrise
  de sa meilleure école, ou il y est au-dessus de la médiane des mages de la bande ; 3 au plus. Classement : la maîtrise
  de sa meilleure école, parmi les mages.
- **Animal** : un animal apprivoisé ; ses animaux en sous-tags. Classement : Compagnon animal, parmi ceux qui ont un
  animal.
- **Régénération** : sa valeur de Régénération, classée parmi ceux qui en ont.
- **Vol** : il vole (le bonus du §5).
- **Dégâts** : ses dégâts par tour (chance de toucher × dégâts moyens) contre l'ennemi médian des missions au niveau de
  la compagnie, tiré des fiches ennemies ; le tag au-dessus de la médiane de la bande. **Ses attaques qui comptent** :
  la meilleure de chaque genre (corps à corps, distance, magie) si elle atteint les trois quarts de sa meilleure attaque
  ou si elle est au-dessus de la médiane de la bande pour ce genre. Sous-tags tirés de ces attaques : **À distance**,
  **De zone**, **Charge** (ses dégâts en charge dans le quart du haut : bonus de charge de l'arme, monture), les types
  de l'arme (Tranchant, Perforant, Contondant), le type du sort ou de l'arme empoisonnée ou enchantée (Brûlant, Glaçant,
  Foudroyant, Corrosif, Poison, Nécrotique), **Anti morts-vivants** (Restitution, Lumière sacrée), **Anti invocations**
  (Bannissement).

Magie, Animal, Régénération et Vol comptent pour Mission comme les autres rôles.

## 7 — Les règles des Occupations

- **Mission** : rôle par rôle, il ne fait pas partie des 20 % les moins bons de ceux qui tiennent ce rôle, arrondi vers
  le bas (4 dans le rôle : personne d'écarté ; 10 : les 2 derniers). « Ton seul soigneur, même médiocre, part toujours. »
- **Camps et chasses** : l'intendant relève, dans les fiches des ennemis de chaque type de mission, les traits qui
  distinguent ce camp des autres (plus fréquents que la moyenne de tous les types de mission, chasses comprises ; Idan,
  2026-11-16), puis cherche qui a la réponse. Cette moyenne bouge avec chaque bête ajoutée : la Cour de sang (une fiche
  volante sur sept) est signalée pour le vol ou non selon elle. Table générique trait → réponse :
  - mort-vivant → Anti morts-vivants (Démoralisateur inutile) ; insensible au poison → Poison inutile ;
  - encaisse mal ou bien un type de dégâts → ce type (× > 1), pas celui-là (× < 1) ; immunité physique → Magie ;
  - vol → À distance ; régénération → Anti-soins ; lanceurs de sorts → Anti-magie ; meutes nombreuses → De zone ;
  - cavaliers → armes d'hast et armes de tir (elles arrêtent les charges) ;
  - armures portées → les types de dégâts qui les passent le mieux (calculé).

  Le tag d'un camp : il a la réponse et il est au-dessus de la médiane de ceux de la bande qui l'ont, même sans le
  niveau Mission ; une attaque ne répond que si elle compte (voir
  Dégâts) et atteint les trois quarts de la meilleure de son genre. Un camp sans trait distinctif n'est pas tagué par
  l'intendant ; un nouveau genre de trait demande une ligne de plus dans la table.
- **Les meilleurs** (dans le quart du haut d'au moins un de leurs rôles, §9) ne reçoivent jamais Garde du corps ni Job.
- **Garde du corps** (les autres) : s'il atteint le plus bas niveau d'offre (renommée de la compagnie − 4).
- **Job** (les autres), seulement si le bâtiment est construit : **Palais** si ce qu'il y rapporterait (Charisme × (1 +
  0,2 × niveau de réputation)) est au-dessus de la médiane de la bande ; **Bûcheron**, **Mines** pour ceux qui n'ont pas
  le niveau Mission (le travail rapporte du bois ou de la pierre, selon sa Force).
- **Entraînement** (ses faiblesses utiles) : là où le camp entraîne (bâtiment construit), les 3 choses les plus basses
  (sa place dans la bande) parmi ce qui sert son rôle principal ; le style conseillé ; le port
  d'armure suivant si une armure plus lourde que celles qu'il sait porter le rendait plus efficace (Académie de la
  survie : ils s'apprennent dans l'ordre) ; 3 sorts de ses écoles qui servent son rôle principal (École de magie) ; ses
  montures pas encore apprivoisées (Grange du dresseur).
- **Poste** : les 3 meilleurs de la compagnie (capitaine à part) pour ce que demande le poste — Intendance, Médecine, la
  compétence du maître ou ce qu'entraîne sa salle, avec la Transmission du savoir ; l'aura d'officier pour Officier —
  seulement si le bâtiment est construit ; ceux qui sont parmi les meilleurs au combat restent en mission, sauf pour
  Officier.

## 8 — Les règles de l'Équipement

On renforce son rôle par le meilleur équipement. Tout se calcule avec les règles du combat, contre l'ennemi médian
des missions.

- **Caractéristiques** : ce qui sert son rôle principal, d'après d'où il le tient : sa magie (son école, Intelligence,
  Puissance magique, Réserve de mana), son arme de contact (Dextérité, Vitesse, Perception, Force) ou de tir, sa solidité
  (Constitution, Résistance physique, Esquive), Discrétion et Perception pour un éclaireur, Courage et Charisme pour un
  meneur (aura, grade), Intimidation pour un démoralisateur, Compagnon animal.
- **Le profil** : deux styles cachés, soutien et pur distance, sinon son meilleur style visible (deux armes, deux mains,
  bouclier).
  - **Soutien** : son rôle principal vient de sa magie. Une arme de soutien, qui remplace les deux : celle qui augmente
    son école (Trident : Eau ; Épée à deux mains : Feu ; Marteau de guerre : Foudre), sinon la Puissance magique (Bâton
    long), la Réserve de mana (Bâton court) ; le Fouet (Charisme) pour un meneur.
  - **Pur distance** : sa meilleure attaque est à distance, il est sous la médiane de la bande au corps à corps,
    au-dessus en Vitesse, et ce n'est pas un protecteur (il ne fuit pas) : sa meilleure arme de tir, et une lame courte
    de secours.
  - **Son style visible** (tagué dans Style de combat) : sa meilleure arme pour ce style ; avec Bouclier, le bouclier qui
    le rend le plus solide. Un rôle principal tenu par un objet (le fouet) : il le garde.
- **Plusieurs propositions** : pour un camp tagué, sa meilleure arme contre l'ennemi de ce camp si elle n'est pas la même
  et qu'il est au-dessus de la médiane de la bande dans sa famille (la masse contre les squelettes) ; une arme de tir en
  second jeu si son tir compte.
- **Armure** : parmi celles qu'il sait porter, celle qui lui donne la meilleure valeur dans son rôle principal (puis le
  suivant) : ses chances de lancer ses sorts pour un rôle tenu par la magie, ses dégâts, Discrétion + Perception pour un
  éclaireur, sinon sa solidité contre l'ennemi type de chaque camp (moyenne géométrique : un seul adversaire, un
  canonnier, rend toute armure inutile).
- Deux règles de jeu (doc 04, doc 05) : le poison ne prend que sur une arme qui tranche ou perce, jamais sur une arme à
  feu ; une armure retire de la Discrétion autant qu'elle retire d'Esquive.

## 9 — La simulation (2026-11-12) et ses réglages

Compagnies générées de 9 à 41 mercenaires, niveaux 1 à 8, tous les bâtiments construits. Réglages retenus (à valider),
déjà écrits au §7 : les meilleurs = le quart du haut d'un rôle (avec la médiane, presque tout le monde l'était : plus
personne en garde, au travail ou à un poste) ; les 20 % de Mission comptés parmi ceux qui tiennent le rôle ; pour un
camp, la médiane parmi ceux qui ont la réponse et seulement les attaques qui comptent (environ la moitié de la bande pour
le Culte des morts, qui a six traits distinctifs) ; postes : les 3 meilleurs, puis on retire les meilleurs au combat ; un
seul style conseillé et les caractéristiques du seul rôle principal (5 à 6 tags verts en moyenne).

## 10 — Pas encore décidé

Les questions fermées à l'intendant, ses biais, l'endroit où les tags ressortent ailleurs (liste des mercenaires, choix de
l'équipe d'une mission…) et des titres plus drôles (historique, classement dans la compagnie) : à discuter.

## 11 — La refonte (atelier des tags, 2026-11-20 à 22)

> Travail en cours d'Idan dans l'artefact « Atelier des tags ». Copie de ses données du 2026-11-22 :
> `data/reference/tag-workshop.json` ; l'outil se reconstruit avec `scripts/atelier-tags/` (voir son README). Le jeu
> applique encore les §2 à §10 ; cette refonte n'y est pas branchée (§12).

### Les principes (Idan)

- Un tag dit seulement **à quoi sert le mercenaire en combat**. Il est calculé, toujours visible, et jugé à l'instant T
  (équipement et armure compris). 3 ou 4 tags affichés au plus ; le titre viendra ensuite des tags.
- Les tags forment un arbre combiné : un tag peut avoir plusieurs parents, et il tombe si l'un d'eux tombe.
- Des **tests** éliminent des tags. Ils sont rangés en arbre (« posé seulement si ») : un test qui n'est pas posé
  n'élimine rien.
- Seul le tag le plus bas de chaque branche s'affiche. Une catégorie peut ne garder que ses X tags de plus haut rang
  (Soigneur : garde 1) ; à égalité, l'ordre de la liste. Un tag ne s'efface que devant un enfant **réellement
  affiché** : un enfant écarté par une catégorie limitée ne cache pas son parent (Idan, 2026-11-24).
- **Tags qui regroupent** (Idan, 2026-11-24 : « On va limiter le nombre de tags en trichant… Mais je veux pas que ça
  bloque les spécialistes ») : un enfant commun à deux tags les remplace. **Bélier** (Spécialiste de la charge +
  Perce-armure) ; **Bélier légendaire** par deux chemins (Bélier + Charge légendaire, ou Bélier + Ouvre-boîte
  professionnel : deux tags du même nom, un seul s'affiche). Rangs des Armures : Ouvre-boîte et Écailleur 1,
  Perce-armure 2, Bélier 3, professionnels 4, Bélier légendaire 5, Destructeur d'armure 6 ; un spécialiste plus haut
  (Écailleur professionnel, Destructeur) fait s'effacer le Bélier, et la charge reste visible.
- Les seuils suivent les **étoiles de la compagnie** (on juge un vétéran, pas une recrue) et sont des constantes
  réglables.
- Les niveaux 1 / 2 / 3 des tags sont retirés du jeu (2026-11-20).
- Un tag **inactif** (Idan, 2026-11-21) n'est pas encore dans le jeu : il est éliminé d'office, sans test, avec ses
  enfants (Poseur de pièges et Démineur, tant que les pièges n'existent pas).

### Le Soigneur (garde 1)

| Rang | Tag | Parents |
|---|---|---|
| 1 | Soigneur occasionnel | Soigneur |
| 2 | Soigneur dans la durée | Soigneur occasionnel |
| 3 | Soigneur des masses | Soigneur occasionnel |
| 4 | Soigneur reconnu | Soigneur occasionnel |
| 5 | Grand soigneur dans la durée | Soigneur dans la durée |
| 6 | Grand soigneur des masses | Soigneur des masses |
| 7 | Soigneur complet | Soigneur dans la durée, Soigneur des masses |
| 8 | Un hôpital sur le champ de bataille | Soigneur reconnu |
| 9 | Grand Maître du soin | Soigneur complet, Un hôpital sur le champ de bataille, Grand soigneur des masses, Grand soigneur dans la durée |

### Les caracs exceptionnelles (Idan, 2026-11-21)

Dans « Ce qu'il est », un tag par caractéristique exceptionnelle, et un tag au-dessous pour la plus haute :

- **tag du haut** : la carac > 100 + étoiles de la compagnie (constante « base carac exceptionnelle ») ;
- **tag du dessous** : la carac > (100 + étoiles) × 1,5 (« facteur carac superieure ») **et** la meilleure valeur de la
  compagnie (ex æquo compris) ;
- **à l'instant T** : la valeur que montre la fiche du jeu (équipement, armure, armes, casque, combat à deux armes).

| Tag | Carac | Tag du dessous |
|---|---|---|
| Grosse Brute | Force | Force de la nature |
| Insaisissable | Esquive | Roi de l'esquive |
| Cerveau sur pattes | Intelligence | Le génie |
| Doigts agiles | Dextérité | Aux mains d'argent |
| 6ème sens | Perception | Oracle |
| Veinard | Chance | Béni des dieux |
| Roc | Constitution, Endurance ou Résistance physique | Increvable |
| Bolide | Vitesse | Flash |
| Sans peur | Courage | Tête brûlée |
| Volonté de Fer | Volonté | Volonté de diamant |
| Effrayant | Intimidation (compétence) | Terrorisant |
| Séducteur | Charisme | Irrésistible |

Résistances (Ignifugé, Paratonnerre, Frigorifugé, Mithridatisé) : la protection du combat (résistance avec l'équipement +
armure portée + bonus) > 100 + étoiles (« base resistance exceptionnelle ») : il est immunisé. Pour que ce soit possible,
le jeu n'a plus de plafond (Idan, 2026-11-21) : ni 75 % pour les éléments, ni 50 % pour la Résistance physique ; au-delà de
100 %, le feu, le froid, la foudre et le poison le soignent (doc 12).

L'onglet « Essayer » tire une compagnie au hasard (taille réglable, lui compris) : les calculs lisent
`compagnie.max.<variable>`, la meilleure valeur de la compagnie.

### Éclaireur et contrôle du terrain (Idan, 2026-11-21)

- **Contrôleur du terrain** : il connaît au moins un sort de contrôle du terrain (altération du terrain ou déplacement des
  personnages : Flaque de magma, Mur de flammes, Brouillard, Blizzard, Tempête, Attraction, Projection, Déplacement, Onde
  de choc, Bourbier, et Transposition, ajoutée le 2026-11-21), et sa réserve de mana lui permet d'en lancer 2 × étoiles de
  la compagnie, au coût moyen de ses sorts de terrain.
- **Maître du champ de bataille** : au moins 3 sorts de contrôle du terrain, et assez de mana pour en lancer 3 × étoiles,
  au coût moyen.
- **Éclaireur** : un animal éclaireur (un des 3 papillons), ou le Corbeau lancé 2 × étoiles avec sa réserve, ou Discrétion
  + Perception (équipement compris) > 100 + étoiles × 10.
- **Éclaireur vétéran** : un animal éclaireur haut de gamme (le papillon télépathe), ou Discrétion + Perception > 150 +
  étoiles × 10.
- Poseur de pièges, Démineur : inactifs (les pièges ne sont pas encore dans le jeu).
- Les étoiles de la compagnie vont de 1 à 15 (doc 09).

### Le Tireur (garde 1 ; Idan, 2026-11-22)

Les tags du Tireur ne dépendent pas des titres (doc 19) : les titres viendront des tags. Trois valeurs du moteur de combat,
avec son **arme de tir la plus efficace** (le set qui fait le plus de dégâts contre l'étalon en gambison), sans le pistolet
(« particulier ») :

- **Précision** (toucher) = Dextérité + 0,2 × (Armes de tir ou Armes à feu + compétence de l'arme + Perception + Vitesse) ;
- **Puissance au tir** (blesser) = Perception + 0,2 × (Armes de tir ou Armes à feu + compétence de l'arme) ;
- **Dextérité + Vitesse** (enchaîner les tirs), avec le malus de l'armure ;
- **PM** = (Vitesse + ¼ Endurance + 1/10 Volonté) ÷ 15, arrondi au-dessus.

| Rang | Condition (étoiles de la compagnie × 10 sur chaque base) |
|---|---|
| 1 | Précision, Puissance et Dextérité + Vitesse > 60 ; puis le tag de son arme (Arc → Archer, Arbalète → Arbalétrier, Fronde → Frondeur, Sarbacane → Sarbacanier, Arquebuse → Arquebusier, Canon à main → Canonnier, Tromblon → Tromblonnier) |
| 2 | les trois > 100 : le tag « d'élite » de son arme ; les rangs 3 demandent le rang 2 |
| 3 | Sniper : Précision > 130 et Discrétion (armure comprise) > 40 · Maître de la salve : une arme qui enchaîne les tirs (arc, arbalète, fronde, sarbacane ; plus tard des arquebuses automatiques, « Répétable ») et Dextérité + Vitesse > 150 · Tireur d'escarmouche : PM > 6 (sans étoiles) · Maître de la poudre noire : une arme à feu en set 1 et une autre, différente, en set 2 (proposition de JC, à valider) |
| 4, 5 | se cumulent par l'arbre : Maître sniper (Sniper + Maître de la salve), Sniper tacticien (Sniper + Escarmouche), Maître harceleur (Salve + Escarmouche), Grand maître du combat à distance (les trois) |

| Rang | Tag | Parents |
|---|---|---|
| 1 | Archer | Tireur |
| 1 | Arbalétrier | Tireur |
| 1 | Frondeur | Tireur |
| 1 | Sarbacanier | Tireur |
| 1 | Arquebusier | Tireur |
| 1 | Canonier | Tireur |
| 1 | Tromblonnier | Tireur |
| 2 | Tromblonnier d'élite | Tromblonnier |
| 2 | Canonier d'élite | Canonier |
| 2 | Arquebusier d'élite | Arquebusier |
| 2 | Sarbacanier d'éli | Sarbacanier |
| 2 | Frondeur d'élite | Frondeur |
| 2 | Arbalétrier d'élite | Arbalétrier |
| 2 | Archer d'élite | Archer |
| 3 | Sniper | Tireur |
| 3 | Maitre de la salve | Tireur |
| 3 | Tireur d'escarmouche | Tireur |
| 3 | Maitre de la poudre noire | Tireur |
| 4 | Maitre sniper | Sniper, Maitre de la salve |
| 4 | Sniper tacticien | Sniper, Tireur d'escarmouche |
| 4 | Maître harceleur | Maitre de la salve, Tireur d'escarmouche |
| 5 | Grand maître du combat à distance | Sniper, Tireur d'escarmouche, Maitre de la salve |

### Les tests, dans l'ordre de l'arbre

Un retrait (→) veut dire « posé seulement si le test du dessus répond oui ». « Élimine » : les tags retirés quand
la réponse est non. Un calcul vide est à écrire.

| Test | Formule (Idan) | Calcul | Élimine si non |
|---|---|---|---|
| Vole-t-il ? | Il sait voler ou est équipé d'une monture volante. | `capacite.vol ou monture.vol` | Vol |
| A-t-il de la Régénération ? | Il a de la Régénération (valeur au-dessus de 0). | `capacite.regeneration > 0` | Régénération |
| Respire-t-il sous l'eau ? | Respiration aquatique : il traverse l'eau profonde, normalement infranchissable, et s'y couvre. | `capacite.respiration_aquatique` | Amphibie |
| Grosse Brute : Force exceptionnelle ? | Force > 100 + étoiles de la compagnie (équipement compris). | `carac.force > base_carac_exceptionnelle + compagnie.etoiles` | Grosse Brute |
| → Force de la nature : Force hors norme et la meilleure de la compagnie ? | Force > (100 + étoiles de la compagnie) × 1,5, et la meilleure Force de la compagnie (ex æquo compris). | `carac.force > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.force >= compagnie.max.carac.force` | Force de la nature |
| Insaisissable : Esquive exceptionnelle ? | Esquive > 100 + étoiles de la compagnie (équipement compris). | `carac.esquive > base_carac_exceptionnelle + compagnie.etoiles` | Insaisissable |
| → Roi de l'esquive : Esquive hors norme et la meilleure de la compagnie ? | Esquive > (100 + étoiles de la compagnie) × 1,5, et la meilleure Esquive de la compagnie (ex æquo compris). | `carac.esquive > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.esquive >= compagnie.max.carac.esquive` | Roi de l'esquive |
| Cerveau sur pattes : Intelligence exceptionnelle ? | Intelligence > 100 + étoiles de la compagnie (équipement compris). | `carac.intelligence > base_carac_exceptionnelle + compagnie.etoiles` | Cerveau sur pattes |
| → Le génie : Intelligence hors norme et la meilleure de la compagnie ? | Intelligence > (100 + étoiles de la compagnie) × 1,5, et la meilleure Intelligence de la compagnie (ex æquo compris). | `carac.intelligence > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.intelligence >= compagnie.max.carac.intelligence` | Le génie |
| Doigts agiles : Dextérité exceptionnelle ? | Dextérité > 100 + étoiles de la compagnie (équipement compris). | `carac.dexterite > base_carac_exceptionnelle + compagnie.etoiles` | Doigts agiles |
| → Aux mains d'argent : Dextérité hors norme et la meilleure de la compagnie ? | Dextérité > (100 + étoiles de la compagnie) × 1,5, et la meilleure Dextérité de la compagnie (ex æquo compris). | `carac.dexterite > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.dexterite >= compagnie.max.carac.dexterite` | Aux mains d'argent |
| 6ème sens : Perception exceptionnelle ? | Perception > 100 + étoiles de la compagnie (équipement compris). | `carac.perception > base_carac_exceptionnelle + compagnie.etoiles` | 6ème sens |
| → Oracle : Perception hors norme et la meilleure de la compagnie ? | Perception > (100 + étoiles de la compagnie) × 1,5, et la meilleure Perception de la compagnie (ex æquo compris). | `carac.perception > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.perception >= compagnie.max.carac.perception` | Oracle |
| Veinard : Chance exceptionnelle ? | Chance > 100 + étoiles de la compagnie (équipement compris). | `carac.chance > base_carac_exceptionnelle + compagnie.etoiles` | Veinard |
| → Béni des dieux : Chance hors norme et la meilleure de la compagnie ? | Chance > (100 + étoiles de la compagnie) × 1,5, et la meilleure Chance de la compagnie (ex æquo compris). | `carac.chance > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.chance >= compagnie.max.carac.chance` | Béni des dieux |
| Roc : Constitution, Endurance ou Résistance physique exceptionnelle ? | L'une des trois (Constitution, Endurance ou Résistance physique) > 100 + étoiles de la compagnie (équipement compris). | `carac.constitution > base_carac_exceptionnelle + compagnie.etoiles ou carac.endurance > base_carac_exceptionnelle + compagnie.etoiles ou res.physique > base_carac_exceptionnelle + compagnie.etoiles` | Roc |
| → Increvable : Constitution, Endurance ou Résistance physique hors norme et la meilleure de la compagnie ? | L'une des trois > (100 + étoiles de la compagnie) × 1,5, et la meilleure de la compagnie dans cette caractéristique (ex æquo compris). | `(carac.constitution > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.constitution >= compagnie.max.carac.constitution) ou (carac.endurance > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.endurance >= compagnie.max.carac.endurance) ou (res.physique > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et res.physique >= compagnie.max.res.physique)` | Increvable |
| Bolide : Vitesse exceptionnelle ? | Vitesse > 100 + étoiles de la compagnie (équipement compris). | `carac.vitesse > base_carac_exceptionnelle + compagnie.etoiles` | Bolide |
| → Flash : Vitesse hors norme et la meilleure de la compagnie ? | Vitesse > (100 + étoiles de la compagnie) × 1,5, et la meilleure Vitesse de la compagnie (ex æquo compris). | `carac.vitesse > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.vitesse >= compagnie.max.carac.vitesse` | Flash |
| Sans peur : Courage exceptionnel ? | Courage > 100 + étoiles de la compagnie (équipement compris). | `carac.courage > base_carac_exceptionnelle + compagnie.etoiles` | Sans peur |
| → Tête brulée : Courage hors norme et le meilleur de la compagnie ? | Courage > (100 + étoiles de la compagnie) × 1,5, et le meilleur Courage de la compagnie (ex æquo compris). | `carac.courage > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.courage >= compagnie.max.carac.courage` | Tête brulée |
| Volonté de Fer : Volonté exceptionnelle ? | Volonté > 100 + étoiles de la compagnie (équipement compris). | `carac.volonte > base_carac_exceptionnelle + compagnie.etoiles` | Volonté de Fer |
| → Volonté de diamant : Volonté hors norme et la meilleure de la compagnie ? | Volonté > (100 + étoiles de la compagnie) × 1,5, et la meilleure Volonté de la compagnie (ex æquo compris). | `carac.volonte > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.volonte >= compagnie.max.carac.volonte` | Volonté de diamant |
| Effrayant : Intimidation exceptionnelle ? | Intimidation > 100 + étoiles de la compagnie (équipement compris). | `comp.intimidation > base_carac_exceptionnelle + compagnie.etoiles` | Effrayant |
| → Terrorisant : Intimidation hors norme et la meilleure de la compagnie ? | Intimidation > (100 + étoiles de la compagnie) × 1,5, et la meilleure Intimidation de la compagnie (ex æquo compris). | `comp.intimidation > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et comp.intimidation >= compagnie.max.comp.intimidation` | Terrorisant |
| Séducteur : Charisme exceptionnel ? | Charisme > 100 + étoiles de la compagnie (équipement compris). | `carac.charisme > base_carac_exceptionnelle + compagnie.etoiles` | Séducteur |
| → Irresistible : Charisme hors norme et le meilleur de la compagnie ? | Charisme > (100 + étoiles de la compagnie) × 1,5, et le meilleur Charisme de la compagnie (ex æquo compris). | `carac.charisme > (base_carac_exceptionnelle + compagnie.etoiles) * facteur_carac_superieure et carac.charisme >= compagnie.max.carac.charisme` | Irresistible |
| Ignifugé : Résistance au feu exceptionnelle ? | Protection contre le feu (résistance avec l'équipement + armure portée + bonus, sans plafond) > 100 + étoiles de la compagnie : à 100, il ne prend plus rien ; au-delà, il absorbe le feu et se soigne de ce qui dépasse. | `res.feu > base_resistance_exceptionnelle + compagnie.etoiles` | Ignifugé  |
| Paratonerre : Résistance à la foudre exceptionnelle ? | Protection contre la foudre (résistance avec l'équipement + armure portée + bonus, sans plafond) > 100 + étoiles de la compagnie : à 100, il ne prend plus rien ; au-delà, il absorbe la foudre et se soigne de ce qui dépasse. | `res.foudre > base_resistance_exceptionnelle + compagnie.etoiles` | Paratonerre |
| Frigorifugé : Résistance au froid exceptionnelle ? | Protection contre le froid (résistance avec l'équipement + armure portée + bonus, sans plafond) > 100 + étoiles de la compagnie : à 100, il ne prend plus rien ; au-delà, il absorbe le froid et se soigne de ce qui dépasse. | `res.froid > base_resistance_exceptionnelle + compagnie.etoiles` | Frigorifugé  |
| Mithridatisé : Résistance au poison exceptionnelle ? | Protection contre le poison (résistance avec l'équipement + bonus, sans plafond) > 100 + étoiles de la compagnie : à 100, il ne prend plus rien ; au-delà, il absorbe le poison et se soigne de ce qui dépasse. | `res.poison > base_resistance_exceptionnelle + compagnie.etoiles` | Mithridatisé  |
| Sait-il lancer un sort ? |  | `nb_sorts > 0` | Magie |
| → Connaît-il un sort de soin ? | Il connaît un sort qui soigne un allié. | `sorts.soin > 0` | Soigneur |
| → → Ses soins marchent-ils vraiment ? | Réussite moyenne de ses sorts de soin supérieure à 50 %, et assez de mana pour lancer un soin (coût moyen de ses soins) une fois par étoile de la compagnie. | `moy.chance.soin > seuil_soin_occasionnel et lancers.soin >= compagnie.etoiles` | Soigneur occasionnel |
| → → Ses soins sont-ils puissants ? | Puissance magique + niveau de l'école de ses soins > 100 + étoiles de la compagnie × 10. École : la moyenne des écoles de ses sorts de soin, équipement compris. | `carac.puissance_magique + moy.ecole.soin > base_puissance_soin + puissance_soin_par_etoile * compagnie.etoiles` | Soigneur reconnu, Grand soigneur des masses, Grand soigneur dans la durée, Un hôpital sur le champ de bataille |
| → → Connait il un sort de soin de zone |  | `sorts.soin.de_zone > 0` | Soigneur des masses |
| → → → est-il assez efficaces pour etre grand soigneur des masses | Plusieurs tests imbriqués dans la formule à faire : Reserve de mana totale > cout du sort de soin de zone x nombre d'étoile de la compagnie et taux de réussite du sort > (79 + nombre d'étoiles de la compagnie) % et nombre de sort de soin >1 | `carac.reserve_de_mana > cout.soin.de_zone * compagnie.etoiles et chance.soin.de_zone > base_grand_soin + compagnie.etoiles et sorts.soin > 1` | Grand soigneur des masses |
| → → Connait il un sort de soin multi tour ? |  | `sorts.soin.dans_la_duree > 0` | Soigneur dans la durée |
| → → → Est-il assez efficace pour être grand soigneur dans la durée ? | Comme le grand soigneur des masses : réserve de mana totale > coût du soin sur la durée × étoiles de la compagnie, et réussite de ce soin > 79 + étoiles. En plus : son soin tient au moins 3 tours. | `carac.reserve_de_mana > cout.soin.dans_la_duree * compagnie.etoiles et chance.soin.dans_la_duree > base_grand_soin + compagnie.etoiles et duree.soin.dans_la_duree >= duree_min_soin` | Grand soigneur dans la durée |
| → → As-t-il plus de 70% de chance de réussir ses sorts de soin ? | taux de réussite du sort > (80 nombre d'étoile de la compagnie)% | `moy.chance.soin > seuil_soin + compagnie.etoiles` | Soigneur reconnu |
| → → → Est-il un hôpital sur le champ de bataille ? | Il peut lancer au moins 2 × étoiles de la compagnie soins avec sa réserve de mana (coût moyen de ses soins), sa réussite moyenne en soin dépasse 79 + étoiles, et il connaît un soin en action rapide. (Proposition de JC, à valider.) | `lancers.soin >= 2 * compagnie.etoiles et moy.chance.soin > base_grand_soin + compagnie.etoiles et sorts.soin_rapide > 0` | Un hôpital sur le champ de bataille |
| → → A-t-il une purge ou un soin rapide ? | Le soigneur complet peut être un peu moins fiable sur le soin pur, mais il a une purge, ou au moins un soin rapide (Idan). Fiabilité demandée : celle de Soigneur reconnu, 70 + étoiles (proposition de JC, à valider). | `(sorts.soutien.purges > 0 ou sorts.soin_rapide > 0) et moy.chance.soin > seuil_soin + compagnie.etoiles` | Soigneur complet |
| → Connaît-il un sort de soutien ? | Tout sort qui cible un allié et qui augmente leur caractéristiques | à écrire | Soutien |
| → Connait il un sort d'entrave ? | Tout sort qui cible un ennemi et qui reduit les carac | à écrire | Entrave |
| As-t-il une arme de tir ou arme à feu ? | On ne prends pas un compte le pistolet qui est particulier | `((arme1.categorie = "Armes de tir" ou arme1.categorie = "Armes à feu") et arme1 != "Pistolet") ou ((arme2.categorie = "Armes de tir" ou arme2.categorie = "Armes à feu") et arme2 != "Pistolet")` | Tireur |
| → Tireur, rang 1 : tire-t-il au niveau de la compagnie ? | Avec son arme de tir la plus efficace (hors pistolet) : Précision, Puissance au tir et Dextérité + Vitesse (équipement compris) > 60 + étoiles de la compagnie × 10 (Idan, 2026-11-22). | `tir.precision > base_tir_rang_1 + tir_par_etoile * compagnie.etoiles et tir.puissance > base_tir_rang_1 + tir_par_etoile * compagnie.etoiles et tir.dex_vit > base_tir_rang_1 + tir_par_etoile * compagnie.etoiles` | Tireur |
| → → Son arme de tir la plus efficace est-elle : Arc ? | L'arme de tir avec laquelle il fait le plus de dégâts est : Arc (Archer). | `tir.arme = "Arc"` | Archer |
| → → Son arme de tir la plus efficace est-elle : Arbalète ? | L'arme de tir avec laquelle il fait le plus de dégâts est : Arbalète (Arbalétrier). | `tir.arme = "Arbalète"` | Arbalétrier |
| → → Son arme de tir la plus efficace est-elle : Fronde ? | L'arme de tir avec laquelle il fait le plus de dégâts est : Fronde (Frondeur). | `tir.arme = "Fronde"` | Frondeur |
| → → Son arme de tir la plus efficace est-elle : Sarbacane ? | L'arme de tir avec laquelle il fait le plus de dégâts est : Sarbacane (Sarbacanier). | `tir.arme = "Sarbacane"` | Sarbacanier  |
| → → Son arme de tir la plus efficace est-elle : Arquebuse ? | L'arme de tir avec laquelle il fait le plus de dégâts est : Arquebuse (Arquebusier). | `tir.arme = "Arquebuse"` | Arquebusier |
| → → Son arme de tir la plus efficace est-elle : Canon à main ? | L'arme de tir avec laquelle il fait le plus de dégâts est : Canon à main (Canonnier). | `tir.arme = "Canon à main"` | Canonier |
| → → Son arme de tir la plus efficace est-elle : Tromblon ? | L'arme de tir avec laquelle il fait le plus de dégâts est : Tromblon (Tromblonnier). | `tir.arme = "Tromblon"` | Tromblonnier  |
| → → Tireur, rang 2 : est-il un tireur d'élite ? | Précision, Puissance au tir et Dextérité + Vitesse > 100 + étoiles × 10. Les rangs 3 demandent le rang 2 (Idan, 2026-11-22). | `tir.precision > base_tir_rang_2 + tir_par_etoile * compagnie.etoiles et tir.puissance > base_tir_rang_2 + tir_par_etoile * compagnie.etoiles et tir.dex_vit > base_tir_rang_2 + tir_par_etoile * compagnie.etoiles` | Archer d'élite, Arbalétrier d'élite, Frondeur d'élite, Sarbacanier  d'éli, Arquebusier d'élite, Canonier d'élite, Tromblonnier  d'élite, Sniper, Maitre de la salve, Tireur d'escarmouche, Maitre de la poudre noire |
| → → → Sniper : précis et discret ? | Précision > 130 + étoiles × 10, et Discrétion (armure comprise) > 40 + étoiles × 10 (Idan, 2026-11-22). | `tir.precision > base_sniper_precision + tir_par_etoile * compagnie.etoiles et comp.discretion_effective > base_sniper_discretion + tir_par_etoile * compagnie.etoiles` | Sniper |
| → → → Maître de la salve : enchaîne-t-il les tirs ? | Son arme enchaîne les tirs (arc, arbalète, fronde, sarbacane ; plus tard les arquebuses automatiques), et Dextérité + Vitesse > 150 + étoiles × 10 (Idan, 2026-11-22). | `tir.repetable et tir.dex_vit > base_salve + tir_par_etoile * compagnie.etoiles` | Maitre de la salve |
| → → → Tireur d'escarmouche : se déplace-t-il vite ? | PM > 6 (Idan, 2026-11-22). | `pm > pm_escarmouche` | Tireur d'escarmouche |
| → → → Maître de la poudre noire : deux armes à feu différentes en set 1 et en set 2 ? | D'après la note du tag : une arme à feu en set 1 et une autre, différente, en set 2 (pistolet compris). Le niveau : celui du rang 2. (Proposition de JC, à valider.) | `arme1.categorie = "Armes à feu" et arme2.categorie = "Armes à feu" et arme1 != arme2` | Maitre de la poudre noire |
| Connaît-il un sort de contrôle du terrain ? | Il connaît au moins un sort de contrôle du terrain (altération du terrain ou déplacement des personnages). | `sorts.controle_du_terrain > 0` | Contrôleur du terrain, Maitre du champ de bataille |
| → Peut-il lancer son sort de terrain 2 fois par étoile ? | Avec sa réserve de mana (équipement compris), il peut lancer 2 × étoiles de la compagnie sorts de contrôle du terrain, au coût moyen de ses sorts de terrain (Idan, 2026-11-21). | `carac.reserve_de_mana >= moy.cout.controle_du_terrain * 2 * compagnie.etoiles` | Contrôleur du terrain, Maitre du champ de bataille |
| → → Maîtrise-t-il assez de sorts de terrain pour être Maître du champ de bataille ? | Il connaît au moins 3 sorts de contrôle du terrain, et sa réserve de mana (équipement compris) lui permet d'en lancer 3 × étoiles de la compagnie, au coût moyen de ses sorts de terrain (Idan, 2026-11-21). | `sorts.controle_du_terrain >= min_sorts_maitre_terrain et carac.reserve_de_mana >= moy.cout.controle_du_terrain * 3 * compagnie.etoiles` | Maitre du champ de bataille |
| Est-il éclaireur ? | Il a un animal éclaireur (un des 3 papillons), ou il peut invoquer le Corbeau 2 × étoiles de la compagnie fois avec sa réserve de mana, ou sa Discrétion + Perception (équipement compris) dépasse 100 + étoiles × 10 (Idan, 2026-11-21). | `monture contient "Papillon" ou (sorts.eclaireur > 0 et carac.reserve_de_mana >= cout.eclaireur * 2 * compagnie.etoiles) ou comp.discretion_effective + comp.perception_effective > base_eclaireur + eclaireur_par_etoile * compagnie.etoiles` | Éclaireur, Eclaireur vétéran |
| → Est-il éclaireur vétéran ? | Il a un animal éclaireur haut de gamme (le papillon télépathe), ou sa Discrétion + Perception (équipement compris) dépasse 150 + étoiles × 10 (Idan, 2026-11-21). | `monture = "Papillon télépathe" ou comp.discretion_effective + comp.perception_effective > base_eclaireur_veteran + eclaireur_par_etoile * compagnie.etoiles` | Eclaireur vétéran |

### Les constantes

| Constante | Valeur | Note |
|---|---|---|
| seuil soin | 70 | Réussite du meilleur soin pour Soigneur reconnu, en % : seuil = cette base + étoiles de la compagnie (Idan, 2026-11-21 : « 70 + étoiles »). |
| base grand soin | 79 | Réussite pour les « Grand » soigneurs et l'hôpital, en % : seuil = cette base + étoiles de la compagnie (Idan, 2026-11-21 : « 79 + étoiles »). |
| duree min soin | 3 | Nombre de tours minimum du soin sur la durée pour Grand soigneur dans la durée. |
| seuil soin occasionnel | 50 | Réussite minimale de son meilleur soin pour être Soigneur occasionnel, en % (Idan, 2026-11-21 : « réussite supérieure à 50 % »). |
| base puissance soin | 100 | Puissance des soins : Puissance magique + école moyenne de ses soins > cette base + (par étoile) × étoiles de la compagnie (Idan, 2026-11-21). |
| puissance soin par etoile | 10 | Ce que chaque étoile de la compagnie ajoute au seuil de puissance des soins (Idan, 2026-11-21 : « 100 + étoiles × 10 »). |
| base carac exceptionnelle | 100 | Carac exceptionnelle (« Ce qu'il est ») : carac > cette base + étoiles de la compagnie (Idan, 2026-11-21 : « 100 + nombre d'étoiles de la compagnie »). |
| facteur carac superieure | 1.5 | Tag du dessous : carac > (base + étoiles de la compagnie) × ce facteur, et la meilleure valeur de la compagnie (Idan, 2026-11-21 : « x1.5 et avoir la meilleure stat de la compagnie »). |
| base resistance exceptionnelle | 100 | Résistances exceptionnelles : protection > cette base + étoiles de la compagnie (Idan, 2026-11-21 : même règle que les caracs ; le plafond de 75 % est retiré du jeu, à 100 on ne prend plus rien de l'élément, au-delà il soigne). |
| base éclaireur | 100 | Éclaireur : Discrétion + Perception (équipement compris) > cette base + étoiles de la compagnie × « éclaireur par étoile » (Idan, 2026-11-21 : « 100 + nombre d'étoiles × 10 »). |
| base éclaireur vétéran | 150 | Éclaireur vétéran : Discrétion + Perception > cette base + étoiles × « éclaireur par étoile » (Idan, 2026-11-21 : « 150 + nombre d'étoiles × 10 »). |
| éclaireur par étoile | 10 | Ce qu'ajoute chaque étoile de la compagnie aux seuils d'éclaireur (Idan, 2026-11-21 : × 10). |
| min sorts maître terrain | 3 | Maître du champ de bataille : nombre minimum de sorts de contrôle du terrain (Idan, 2026-11-21 : 3). |
| tir par étoile | 10 | Ce qu'ajoute chaque étoile de la compagnie aux seuils du Tireur (Idan, 2026-11-22 : × 10). |
| base tir rang 1 | 60 | Rang 1 (Archer, Arbalétrier…) : Précision, Puissance et Dextérité + Vitesse > cette base + étoiles × 10 (Idan, 2026-11-22). |
| base tir rang 2 | 100 | Rang 2 (… d'élite) : les trois mêmes valeurs > cette base + étoiles × 10 (Idan, 2026-11-22). |
| base sniper precision | 130 | Sniper : Précision > cette base + étoiles × 10 (Idan, 2026-11-22). |
| base sniper discretion | 40 | Sniper : Discrétion (armure comprise) > cette base + étoiles × 10 (Idan, 2026-11-22). |
| base salve | 150 | Maître de la salve : Dextérité + Vitesse > cette base + étoiles × 10, avec une arme qui enchaîne les tirs (Idan, 2026-11-22). |
| pm escarmouche | 6 | Tireur d'escarmouche : PM > cette valeur (Idan, 2026-11-22). |

Variables du profil : `scripts/atelier-tags/profils.js` (caractéristiques, résistances, compétences, ports d'armure,
écoles, capacités, armes, armure, monture, sorts par tag de rôle, réussite / coût / durée par tag de sort, moyennes des
soins, `lancers.soin` = réserve ÷ coût moyen, `moy.cout.<tag de sort>` = coût moyen de ses sorts de ce tag ; par école
(Idan, 2026-11-23, tags des écoles de magie, calqués sur les soins) `sorts.ecole.<école>`, `moy.chance.ecole.<école>`,
`moy.cout.ecole.<école>`, `lancers.ecole.<école>`, et sur tous ses sorts `nb_ecoles_sorts`, `moy.chance.sorts`,
`moy.cout.sorts`, `lancers.sorts` ; fonctions `arrondi_sup` et `arrondi_inf` ; le tir
`tir.arme`, `tir.precision`, `tir.puissance`, `tir.dex_vit`, `tir.repetable`, `tir.degats_tour`, `pm`, `compagnie.etoiles`
de 1 à 15).

### La simulation des soigneurs (2026-11-21)

1000 recrues générées, dont 51 connaissent un sort de soin. Sans équipement, un tag de soigneur s'affiche chez 44 / 41 /
29 / 14 / 0 d'entre eux à 1 / 2 / 3 / 5 / 10 étoiles. Avec le meilleur équipement de soigneur sur les 1000 (amulette de
Puissance magique, Bâton long, Chapeau d'intelligence, Ceinture de mana, 6 bagues d'école, Vêtements) :

| Tier | 1★ | 2★ | 3★ | 5★ | 10★ |
|---|---|---|---|---|---|
| T1 | 51 | 49 | 42 | 18 | 0 |
| T2 | 51 | 51 | 44 | 25 | 0 |
| T3 | 51 | 51 | 45 | 26 | 1 |
| T4 | 51 | 51 | 48 | 34 | 5 |

La réussite plafonne vers 94 % ; à beaucoup d'étoiles, c'est la mana qui bloque. D'où la **Bague de mana** (Idan,
2026-11-21 : +5 / 10 / 15 / 20 % de réserve de mana, doc 05), pas encore dans ces chiffres.

### La simulation des caracs exceptionnelles (2026-11-21)

1000 recrues, à 1★ ; pour chaque tag, tous les objets qui augmentent la carac visée (bagues × 6, elles se cumulent), arme et
armure de la recrue gardées (pour les éléments, la meilleure armure contre l'élément). Recrues qui ont le tag (entre
parenthèses : celles qui passent aussi le seuil × 1,5, sans la condition « meilleur de la compagnie ») :

| Tag | Objets | Sans | T1 | T2 | T3 | T4 |
|---|---|---|---|---|---|---|
| Veinard | Amulette + 6 Bagues de la chance | 2 | 69 | 323 (12) | 594 (78) | 777 (221) |
| Sans peur | Ceinture + 6 Bagues du courage | 0 | 18 | 213 (2) | 502 (23) | 687 (137) |
| Insaisissable | Cape + Bottes d'esquive | 0 | 2 | 11 | 42 | 94 |
| Grosse Brute | Gants de force | 16 | 23 | 35 | 53 (1) | 66 (2) |
| Roc | Casque, Ceinture, Cape | 3 | 7 | 25 | 42 | 63 |
| 6ème sens | Bottes de perception | 7 | 13 | 26 | 46 | 59 |
| Cerveau sur pattes | Chapeau d'intelligence | 7 | 9 | 20 | 34 | 50 |
| Doigts agiles | Gants de dextérité | 2 | 5 | 21 | 28 | 41 |
| Séducteur | String du Charisme | 0 | 1 | 3 | 6 | 12 |
| Volonté de fer | Amulette de volonté | 0 | 0 | 0 | 1 | 2 |
| Bolide, Effrayant | Bottes de vitesse, Culotte d'Intimidation | 0 | 0 | 0 | 0 | 0 |
| Résistances | la meilleure armure (rien contre le poison) | 0 | 0 | 0 à 1 | 0 à 1 | 0 à 1 |

Le palier est haut pour presque toutes les caracs ; Chance et Courage débordent à cause des 6 bagues identiques. Idan,
2026-11-21 : « On laisse comme ça pour l'instant ».

### La simulation du Tireur (2026-11-22)

1000 recrues, dont 642 ont une arme de tir (sans le pistolet). Avec l'équipement d'un tireur au tier T4 (gants de
dextérité, cape de discrétion, et une seule paire de bottes : perception ou vitesse) :

| Étoiles | Sans équipement | T4, bottes de perception | T4, bottes de vitesse |
|---|---|---|---|
| 1 | rang 1 : 380 · rang 2 : 28 · Sniper : 2 | rang 1 : 502 · rang 2 : 101 · Sniper : 38 · Salve : 8 · Escarmouche : 1 | rang 1 : 403 · rang 2 : 41 · Sniper : 16 · Salve : 8 · Escarmouche : 2 |
| 3 | rang 1 : 137 | rang 1 : 279 · rang 2 : 18 · Sniper : 1 | rang 1 : 166 · rang 2 : 2 |
| 5 | rang 1 : 28 | rang 1 : 101 | rang 1 : 41 |
| 8 | 0 | rang 1 : 4 | rang 1 : 1 |

L'équipement ajoute au plus 15 par valeur ; au-delà de 5 étoiles, la progression doit venir de l'XP (caracs et
compétences), que cette simulation n'a pas. Escarmouche (7 PM) est très rare.

### Pour plus tard

- Les autres rôles (Soutien, Entrave, Protection, Commandement, Dégâts) et le CAC : tests à écrire avec Idan.
- Tireur : vérifier les seuils sur des mercenaires entraînés ; Maître de la poudre noire à valider ; le pistolet
  sans tag ; des arquebuses automatiques (« façon kalachnikov », Idan, 2026-11-22).
- Retirer les tests de l'ancien intendant (Cruxor, §5 à §9) quand la refonte sera branchée.
- Le titre tiré des tags (un seul tag de soigneur peut donner le titre), des titres d'exploits (« Soigneur de masse des
  ennemis »), les tags de création pour affiner les avatars (phase 2).
- Monter le niveau des recrues de la taverne avec les étoiles de la compagnie.
- Caracs exceptionnelles : un palier par carac, ou limiter le cumul des bagues identiques (Chance, Courage, écoles).
- Brancher la refonte dans le jeu, une fois les rôles décidés.

## 12 — Brancher la refonte dans le jeu (Idan, 2026-11-22)

> Codé le 2026-11-22, **pas encore en ligne** (mise en ligne quand Idan le dit). Le code : `game-core/tag-engine.js` (le
> moteur de l'atelier), `game-core/company-tags.js` (les biais, la compagnie), `prototype-web/ui.js` (companyTagRules,
> mercenaryTagLists), la fiche au survol, le choix de l'escouade. Les constantes : `formula-constants.json` (`tags.*`).

### Ce qui change

- **Calcul automatique** : les tags de l'atelier (§11) sont recalculés à chaque mise à jour du mercenaire (équipement,
  XP, étoiles, sorts, monture…). Plus de demande de tags.
- **Où on les voit** : sur la fiche au survol, à la place des tags d'aujourd'hui ; plus tard sur la fiche complète v2.
- **Ce qu'on retire** : l'onglet de l'intendant qui tague (Cruxor, §5 à §9), l'onglet « Rôle et formation » de la fiche
  complète et tous les boutons de demande de tags.
- **Le titre** (doc 19) reste calculé comme aujourd'hui ; il viendra plus tard des tags.
- **L'atelier passe dans le Design Lab** (Idan, 2026-11-22 : « je voudrais intégrer l'atelier dans le design lab et que
  le jeu le lise pour générer les tags ») : Idan y règle tags, tests et constantes, ses enregistrements sont rangés sur
  Hostinger, et le jeu les lit au chargement, comme les réglages des cultures (doc DEPLOYMENT). Sans eux (serveur local,
  tests), la copie du dépôt (`data/reference/tag-workshop.json`). Le même moteur (`game-core/tag-engine.js`) calcule les
  tags dans le jeu et dans l'onglet « Essayer » de l'atelier.
- **Préparé (2026-11-22), pas encore en ligne** : le moteur des tags (`game-core/tag-engine.js` : le langage des
  calculs, l'arbre, les tags affichés, les variables d'un mercenaire), utilisé par l'artefact ; la page de l'atelier dans
  le Design Lab (`design/atelier/`, bouton « Atelier des tags ») ; son enregistrement sur Hostinger
  (`media/atelier/actuel.json`, la dernière version ; un historique des versions ; deux onglets ne s'écrasent pas).
  **La bascule** : l'artefact reste la référence tant qu'Idan y travaille ; au moment de basculer, JC recopie sa base dans
  `data/reference/tag-workshop.json` et met en ligne ; la première modification dans le Design Lab crée la version 1
  sur Hostinger, et l'artefact n'est plus utilisé.

### Deux sortes de tags, un même calcul

Les mêmes tests de l'atelier, sur des valeurs vues à travers un **biais** :

- **Le candidat**, avant son recrutement, se décrit lui-même : il se vante (doc 14 §7). Toutes ses valeurs × un même
  tirage entre **1,10 et 3,00**, une fois par candidat. Ses tags s'affichent sur sa fiche à la Taverne (la case « Tags »).
- **L'intendant** décrit nos mercenaires (Cruxor Limortel, ou celui qu'on a nommé) :

```
Compétence = 0,75 × Intendance + 0,25 × Intelligence        (bornée de 0 à 100)
ErreurMax  = 50 % × (1 − Compétence / 100) ^ 1,5
Taille     = Rand(0 ; ErreurMax)                              (tirée pour chaque mercenaire)
R          = Clamp((étoiles du mercenaire − étoiles de la compagnie) / 5 ; −1 ; 1)
P(surestimer) = 50 % + 25 % × Affinité(intendant → mercenaire) / 100 + 25 % × R
Biais      = + Taille avec la chance P, sinon − Taille
ValeurVue  = Valeur × (1 + Biais)
```

| Intendant | Intendance | Intelligence | Erreur au plus |
|---|---|---|---|
| Excellent | 90 | 70 | 3 % |
| Correct | 80 | 70 | 5 % |
| Cruxor Limortel | 30 | 50 | 26 % |
| Mauvais | 25 | 40 | 30 % |
| Nul | 0 | 30 | 45 % |

- **Cruxor Limortel** reste celui du doc 11 (chaque mercenaire l'apprécie comme le capitaine), avec **30 d'Intendance**
  (Idan, 2026-11-22 ; 10 avant). Il n'a pas d'Intelligence : 50 pour la formule.
- **Un tirage par couple intendant / mercenaire** (taille et sens), gardé tant que rien ne change ; on retire quand le
  mercenaire change d'étoile de réputation ou quand on change d'intendant. La taille est tirée entre 0 et l'erreur au plus
  (Idan, 2026-11-22 : « sinon le biais sera trop marqué… je veux qu'il diffère pour chaque mercenaire ») : un mauvais
  intendant tombe parfois juste.
- **Ce qui reçoit le biais** : les capacités (caractéristiques, compétences, résistances, Précision, Puissance au tir,
  Dextérité + Vitesse, réserve de mana, chances de réussite des sorts, Discrétion, PM). **Pas** les oui / non, les noms,
  les nombres de sorts, les coûts en mana, les durées des sorts ni les étoiles de la compagnie (sinon le biais
  s'annulerait, par exemple réserve de mana et coût d'un sort).
- **« Le meilleur de la compagnie »** : l'intendant compare ce qu'il voit, chaque mercenaire avec son propre biais.
- Un tag ne bascule que si le mercenaire est près d'un seuil : les très bons et les très mauvais restent bien vus.

### Ce que JC a dû préciser en codant (à valider par Idan)

- **Le capitaine** est décrit par l'intendant comme les mercenaires (il est dans « le meilleur de la compagnie »).
- **Sans intendant** (Cruxor parti et personne au poste) : aucun tag ne s'affiche (Idan, 2026-11-22).
- **La fiche du candidat** (Idan, 2026-11-22) : « C'est normalement la fiche au survol avec des ? quand on ne connait pas
  les infos. En lui parlant, en parlant à l'aubergiste ou à l'intendant, on doit remplir les cases » (doc 14 §6 bis).
- **Les écoles de magie** comptent comme des compétences (elles reçoivent le biais). **La réserve de mana** aussi
  (« mana » et `carac.reserve_de_mana`) ; le nombre de soins qu'il peut lancer (`lancers.soin`) suit sa réserve vue.
- **Le candidat** compare ses valeurs annoncées à la compagnie telle que l'intendant la voit. Son tirage est gardé sur
  lui (`tagSelfBias`). Ses tags sont calculés (`candidateTags`) mais **pas encore affichés** : la fiche du candidat à la
  Taverne, avec sa case « Tags » (doc 14 §6), reste à faire avec le dialogue de recrutement.
- **Le choix de l'escouade** : les onglets de filtre prennent les nouveaux tags (« Tous », puis les tags que portent les
  mercenaires de la galerie, les plus portés d'abord, au-delà de quatre dans « Autres compétences », Idan, 2026-11-22) ; l'onglet du tag de la
  mission (camp, chasse, garde du corps) disparaît : l'atelier n'a pas de tags de mission.
- **La fiche au survol** : les tags de l'atelier, dans l'ordre de l'atelier, en bleu comme l'ancien rôle au combat ; au
  plus 5 plaques, comme avant (« N autres rôles »).
- **Les auras de courage** (Commandement, test 24 ; Idan, 2026-11-22) : `role` (capitaine, lieutenant ou rien, donné par le
  jeu ; une recrue n'en a pas), `aura.officier` (points de Courage de son aura d'officier : capitaine 0,35 × Courage +
  0,25 × Charisme, lieutenant la moitié), `aura.fouet` (5 / 10 / 15 / 20 % selon le tier), `bonus.<tag>` (le bonus de son
  meilleur sort de ce tag, dont `bonus.commandement`), `aura.courage` (la plus forte, officier ou sort, comparée à la
  compagnie). Elles reçoivent le biais de l'intendant (Idan : « Oui »). Seuils : 30 et 40 points, + 2 par étoile.
