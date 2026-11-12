# Tags des mercenaires

> Décisions d'Idan du 2026-11-12. Codés : l'onglet **Rôle et occupations** de la fiche (trois niveaux) et l'intendant qui
> tague. Données : `data/reference/mercenary-tags.json`, `data/reference/steward-tags.json`, la colonne `tags` de
> `spells.json` ; règles : `game-core/mercenary-tags.js`, `game-core/steward-tags.js` ; fiche : `prototype-web/ui.js`
> (`renderTagsTab`) ; Intendance : `prototype-web/steward-ui.js` ; tests : `tests/mercenary-tags.test.js`,
> `tests/steward-tags.test.js`.

## 1 — Pourquoi

« Pour l'instant je n'arrive pas à lire une fiche, me souvenir que lui, c'est plutôt un bouclier qu'il lui faudrait, ce cac
etc... Y compris pour les rôles de missions. » Le joueur note ce qu'il veut faire de chaque mercenaire. « Le joueur
interprète tous les tags comme il le souhaite et ça n'a aucune importance. Ce qui compte, c'est qu'il puisse retrouver
rapidement, dans sa compagnie, qui doit faire quoi. »

- **Aucun tag n'en exclut un autre** : « Armures de plates + magie, c'est le problème du joueur. C'est lui qui vise ce
  build. Il veut taguer 5 cacs différents, très bien. »
- **Les sous-tags allument les tags** : cocher Boule de feu allume Feu, puis Entraînement. Éteindre un tag éteint ses
  sous-tags.
- **Tous les tags se cochent**, même seuls (« on peut taguer juste Animal »).
- Aucune règle de jeu ne lit les tags.

## 2 — Les trois colonnes

### Occupations principales (tons rouges) — comment il occupe ses journées

- **Mission** → Camps (une faction par camp : Gobelins, Orcs, Hommes-bêtes, Voleurs, Ogres, Culte des morts, Cour de sang)
  et Chasses (Loups, Licornes, Cerbères, Chiens sauvages, Papillons).
- **Garde du corps** (« c'est vraiment différent d'une mission »), sans sous-tags.
- **Job** → Bûcheron, Mines, Palais des plaisirs. Pas la Cave (« à la cave, on décide de rien »).
- **Entraînement** (« c'est à la place des missions ») → ce qu'on fait progresser, nommé par ce qu'on travaille et non
  par le lieu : caractéristiques, résistances, armes et styles, Discrétion, Pièges, Réserve de mana, les 9 écoles de magie,
  les familles d'animaux ; puis les apprentissages sans parent (Port d'armure légère, intermédiaire, lourde, Empoisonnement
  des armes). Sous-sous-tags : sous une école, ses sorts (« Un sort boule de feu, dans magie du feu ») ; sous une famille
  d'animaux, ses montures à apprivoiser.
- **Poste** → Intendant, Médecin, Directeur de l'École, Doctore, Vétéran, Maître des lames, Alchimiste, Maître des
  plaisirs, Dresseur, Officier (« ne mets pas lieutenant, mais officier » : d'autres grades viendront).

Laissés de côté, parce qu'on ne les prévoit pas : la Cave, le Cachot, le repos et les soins, la Cantine.

### Équipement (tons verts) — ce qu'il porte ou doit porter

- **Arme** → les familles (Lames longues, Lames courtes, Armes d'hast, Haches, Armes contondantes, Armes articulées ou
  articulées, Bâtons, Armes de tir, Armes à feu), puis leurs armes.
- **Style de combat** (« on a oublié les styles de combat ! ») → Une main, Deux armes, Deux mains, Bouclier ; sous
  Bouclier, les boucliers (Écu, Rondache, Pavois).
- **Armure** → Légère, Intermédiaire, Lourde, puis leurs armures ; Vêtements.
- **Caractéristiques** → tout ce qu'un objet augmente (« c'est un mage du feu, il doit porter Intelligence, Puissance
  magique, Feu, Mana ») : caractéristiques, Puissance magique, Réserve de mana, écoles de magie, Discrétion, Pièges,
  Intimidation, Compagnon animal, Affinité.

Ni monture ni potion (Idan).

### Rôle au combat (tons bleus) — à quoi il sert sur le champ de bataille

« Une seule liste. Des sous-cat. Des sous-sous cat. » Pensé en JDR général plutôt qu'à partir de ce que le jeu mesure
(« Oublie ce qu'on mesure ») ; seulement ce qui existe dans le jeu ; rien de ce qui relève de l'équipement (encaisser,
esquiver, bloquer…).

- **Dégâts** → De zone, Charge, À distance, Tranchant, Perforant, Contondant, Brûlant, Glaçant, Foudroyant, Corrosif,
  Poison, Nécrotique, Anti morts-vivants, Anti invocations (les types de dégâts directement : « Personne ne coche "type
  de dégâts" seul »).
- **Soin** → De zone, Dans la durée.
- **Soutien** → Enchantements, Dégâts élémentaires (Brûlant, Glaçant, Foudroyant), Discrétion, Récupération de mana, Purges.
- **Protection** → Protection élémentaire (Contre le feu, Contre le froid, Contre la foudre), Protection à distance.
- **Entrave** → Immobilisation, Affaiblissement, Démoralisateur, Anti-magie, Anti-soins.
- **Contrôle du terrain**, **Commandement**, **Éclaireur**.
- **Magie** → les 9 écoles.
- **Animal** → les familles qui ont des animaux, puis leurs animaux.
- **Régénération**, **Vol**.

## 3 — Les listes viennent des données

Dans `mercenary-tags.json`, une liste peut être écrite à la main (`enfants`) ou tirée des données du jeu (`source`) : une
nouvelle faction, une nouvelle chasse, un nouvel entraînement au camp, un nouveau sort, une nouvelle arme, une nouvelle
armure, un nouveau bonus d'objet ou un nouvel animal a son tag sans toucher au fichier. `ordre` range les noms connus ;
les nouveaux viennent ensuite. Une famille d'animaux du Compagnon animal (Rapaces, Félins…) apparaît le jour où elle a son
premier animal.

L'identifiant d'un tag est son chemin (`role/degats/brulant`). Le mercenaire garde, sauvegardés avec lui, ses tags et
leur niveau (`tags` : ceux du joueur ; `stewardTags` : ceux de l'intendant ; `stewardRefused` : les tags de l'intendant
que le joueur a éteints). Une ancienne liste de tags (phase 1) compte au niveau plein.

## 4 — L'onglet Rôle et occupations (phase 1)

« On fait très simple en phase 1 : Ajoute un onglet dans la fiche mercenaire avec les tags qu'on peut cocher décocher. »

- Dernier onglet de la fiche, pour ceux de la compagnie (pas un candidat de la Taverne). Son nom : « À la place de tags,
  on met rôle et occupations ».
- En haut, une petite phrase : « Ces tags vous permettent de vous souvenir à quoi peut servir ce mercenaire. »
- Trois colonnes en accordéon ; une couleur par colonne, plus claire à chaque niveau.
- « Pas de case à cocher. Des tags grisés ou pas grisés » ; trois niveaux (pâle, moyen, plein) : le clic fait le tour
  grisé → pâle → moyen → plein → grisé ; un tag est au moins aussi fort que son sous-tag le plus fort ; éteindre un tag
  éteint ses sous-tags.
- Un petit point sur les tags de l'intendant ; le joueur l'emporte. Avec un intendant nommé, « Demander à l'intendant »
  en haut de l'onglet (sans intendant : « Nommez un intendant : il proposera ses tags. ») ; à l'Intendance, « Retaguer la
  compagnie ». Il compare toujours à toute la bande, et ne remplace que ses propres tags.
- « Une petite flèche à droite du tag pour ouvrir la sous-catégorie. » Ce qui est ouvert le reste d'une fiche à l'autre.
- Sur téléphone, les colonnes passent l'une sous l'autre.

## 5 — L'intendant qui tague : les principes (validés le 2026-11-12, codés)

« On doit pouvoir lui demander de le qualifier tout seul. L'intendant met les tags qu'il veut. » Scénario sans biais
d'abord (« rajouter des biais après sera facile »). Il faut un intendant nommé. Les questions fermées viendront ensuite :
les mêmes constats, mis en phrases.

- **Toujours comparer à la bande, jamais à des recrues générées** (Idan : « Il faut jamais comparer à la génération de X
  mercenaires… Dans une compagnie 15★ ça n'a plus de sens… Son rôle dépend des autres mercenaires qui existent dans la
  compagnie » ; « Le dresseur, il doit pas être bon, il doit être parmi les 3 moins mauvais ») : médiane, quarts, rang.
- **La bande** : ceux qui peuvent partir en mission, capitaine compris ; pas l'intendant, le médecin ni les maîtres à leur
  poste.
- **Tout compte** : sorts, compétences, caractéristiques et l'équipement porté (« On l'a équipé ainsi… donc il a un rôle de
  soutien… Le mec qui fait tank en armure de plaques et bouclier… c'est à cause de son équipement »). Un objet à effet
  compte comme un sort qui réussit toujours (100 %).
- **Ce qu'on a ou pas** (un sort, un objet à effet) donne le tag dès qu'il l'a. **Ce que tout le monde a un peu** (une
  caractéristique, une compétence) donne un tag au-dessus de la médiane de la bande, un sous-tag dans le quart du haut.
- **Classement dans un rôle** : sa meilleure place parmi les sources du rôle.
- **Le vol** : « pas forcément, mais c'est un gros bonus » : +25 points sur 100 à sa place dans chacun de ses rôles,
  plafonné à 100.
- **Les sorts** portent leurs tags dans leurs données (une colonne de spells.json, préremplie d'après l'effet et la
  description, relue par Idan) : un nouveau sort arrive avec ses tags.
- **Dynamique** : rien d'écrit en dur sur les camps, les monstres ou les missions (« On va rajouter des missions, des
  monstres, même peut-être des ennemis au camp orc… Donc rien de tout ça doit être statique »).
- **Trois niveaux d'importance** (« que le mec puisse mettre arc et épée, mets arc plus important… C'est important y
  compris pour le joueur et pour le générateur de titres ») : grisé, pâle, moyen, plein ; le clic fait le tour ; un tag est
  au moins aussi fort que son sous-tag le plus fort. L'intendant : plein pour son rôle principal (là où il est le mieux
  classé), moyen au-dessus de la médiane, pâle sinon.
- **Ses tags et ceux du joueur** : un petit point sur ceux de l'intendant ; un clic sur l'un d'eux l'éteint et
  l'intendant retient le refus ; **retaguer** ne remplace que ses tags, jamais ceux que le joueur a cochés (« l'intendant
  fait des tags à un moment T… Il faudra une option retaguer tous les mercenaires ») : un bouton à l'Intendance pour toute
  la compagnie, un dans l'onglet pour un mercenaire.

## 6 — Les règles du Rôle au combat

- **Soin** : il connaît un sort qui soigne quelqu'un (Soin rapide, Soin profond, Régénération, Soin de masse, Lien de vie,
  Eau guérissante, Cautérisation). Classement : chance de réussite × soin moyen de son meilleur sort de soin (les calculs de
  l'aperçu des sorts). **De zone**, **Dans la durée** : d'après le sort.
- **Soutien** : un sort lancé sur un allié pour l'aider sans le soigner (pas ceux qui ne visent que le lanceur : Célérité,
  Siphon d'âme, Pacte de sang), ou un objet à aura (le fouet). Classement : la somme des chances de réussite de ses sorts de
  soutien (un objet : 100 %). **Enchantements** (bonus de caractéristique sur un allié, dont Frénésie, Crachat de venin,
  Soutien illusoire, Courage de masse), **Dégâts élémentaires** → Brûlant (Arme enflammée, Torche vivante), Glaçant (Arme
  de glace), Foudroyant (Arme électrique), **Discrétion** (Avancée cachée), **Récupération de mana** (Source vive),
  **Purges** (Purge, Délivrance).
- **Protection** : un sort qui protège un allié ou lui-même (Armure de feu, Armure de froid, Peau d'écailles, Champ de
  protection, Peau de pierre — qui donne aussi Enchantements), ou sa **solidité** au-dessus de la médiane : le nombre de
  coups moyens qu'il encaisse (PV, esquive, bouclier, armure, avec les calculs du combat). Classement : sa meilleure place
  entre sa solidité et ses sorts. **Protection élémentaire** → Contre le feu, Contre le froid, Contre la foudre : un sort
  (croisé : l'Armure de froid protège du feu, l'Armure de feu du froid, la Peau d'écailles des trois) ou sa propre
  résistance dans le quart du haut. **Protection à distance** : un sort contre les projectiles (Champ de protection) ; pas le
  bouclier, qui bloque les tirs comme les coups.
- **Entrave** : **Immobilisation** (Paralysie, Sommeil, Prison de glace, Écrasement), **Affaiblissement** (Gel, Nuée
  d'insectes), **Démoralisateur** (Peur, Désespoir ; ou son Intimidation dans le quart du haut : en combat, « Courage + ¼
  Volonté − ¼ Intimidation adverse »), **Anti-magie** (Brouillage mental, Siphon d'âme), **Anti-soins** (Flétrissement).
  Classement : sa meilleure place entre ses sorts et son Intimidation.
- **Contrôle du terrain** : les sorts qui changent le terrain ou déplacent (Flaque de magma, Mur de flammes, Brouillard,
  Bourbier, Blizzard, Tempête, Onde de choc, Déplacement, Attraction, Projection). Ni les armes d'hast ni Création de double.
- **Commandement**, sur ses troupes seulement (« on commande pas à l'ennemi ») : le grade (capitaine, officiers), les sorts
  Courage de masse et Soutien illusoire, un objet à aura (le fouet) ; sinon son aura d'officier (17,5 % du Courage + 12,5 %
  du Charisme, la formule du lieutenant) au-dessus de la médiane. Peur et Désespoir n'en donnent pas.
- **Éclaireur** : la moyenne de ses places en Discrétion (s'il revient) et en Perception (ce qu'il voit) au-dessus de la
  médiane, ou le sort Corbeau.
- **Magie** : au moins un sort. **Une école** (« que quand c'est pertinent… il peut avoir deux écoles ou même trois ») : il y
  connaît un sort, et il y a au moins les trois quarts de la maîtrise de sa meilleure école, ou il y est au-dessus de la
  médiane des mages de la bande ; 3 au plus. Classement : la maîtrise de sa meilleure école, parmi les mages.
- **Animal** : un animal apprivoisé ; ses animaux en sous-tags. Classement : Compagnon animal, parmi ceux qui ont un
  animal.
- **Régénération** : sa valeur de Régénération, classée parmi ceux qui en ont.
- **Vol** : il vole (le bonus ci-dessus).
- **Dégâts** : ses dégâts par tour (chance de toucher × dégâts moyens) contre l'ennemi médian des missions au niveau de la
  compagnie, tiré des fiches ennemies ; le tag au-dessus de la médiane de la bande. **Ses attaques qui comptent** : la
  meilleure de chaque genre (corps à corps, distance, magie) si elle atteint les trois quarts de sa meilleure attaque ou si
  elle est au-dessus de la médiane de la bande pour ce genre (« Il est bon à l'arc, à la magie et au cac, il peut avoir les
  3… il peut tirer à l'arc mais touche jamais… non »). Sous-tags tirés de ces attaques : **À distance**, **De zone**,
  **Charge** (ses dégâts en charge dans le quart du haut : bonus de charge de l'arme, monture), les types de l'arme
  (Tranchant, Perforant, Contondant), le type du sort ou de l'arme empoisonnée ou enchantée (Brûlant, Glaçant, Foudroyant,
  Corrosif, Poison, Nécrotique), **Anti morts-vivants** (Restitution, Lumière sacrée), **Anti invocations** (Bannissement).

Magie, Animal, Régénération et Vol comptent pour Mission comme les autres rôles (« Le mec qui vole et qui se régénère,
c'est pas utile en mission ? »).

## 7 — Les règles des Occupations

- **Mission** : rôle par rôle, il ne fait pas partie des 20 % les moins bons de ceux qui tiennent ce rôle, arrondi vers le
  bas (4 dans le rôle : personne d'écarté ; 10 : les 2 derniers). « Ton seul soigneur, même médiocre, part toujours. »
- **Camps et chasses** : l'intendant relève, dans les fiches des ennemis de chaque type de mission, les traits qui
  distinguent ce camp des autres (plus fréquents que la moyenne des camps), puis cherche qui a la réponse. Table générique
  trait → réponse : mort-vivant → Anti morts-vivants (Démoralisateur inutile) ; insensible au poison → Poison inutile ;
  encaisse mal ou bien un type de dégâts → ce type (× > 1), pas celui (× < 1) ; immunité physique → Magie ; vol → À
  distance ; régénération → Anti-soins ; cavaliers → armes d'hast et armes de tir (elles arrêtent les charges) ; lanceurs de
  sorts → Anti-magie ; armures portées → les types de dégâts qui les passent le mieux (calculé) ; meutes nombreuses → De
  zone. Le tag d'un camp : il a la réponse et il est au-dessus de la médiane de ceux de la bande qui l'ont, même sans le
  niveau Mission (« camp mort-vivants ok, mais sinon, à la mine ! ») ; une attaque ne répond que si elle compte (voir
  Dégâts) et atteint les trois quarts de la meilleure de son genre. Un camp sans trait distinctif n'est pas tagué par
  l'intendant ; un nouveau genre de trait demande une ligne de plus dans la table.
- **Les meilleurs** (dans le quart du haut d'au moins un de leurs rôles ; réglage de la simulation, voir §9) ne
  reçoivent jamais Garde du corps ni Job (« Il faut évincer les meilleurs des gardes et job, sinon on va le mettre à tout
  le monde »).
- **Garde du corps** (les autres) : s'il atteint le plus bas niveau d'offre (renommée de la compagnie − 4).
- **Job** (les autres), seulement si le bâtiment est construit : **Palais** si ce qu'il y rapporterait (Charisme × (1 + 0,2
  × niveau de réputation)) est au-dessus de la médiane de la bande ; **Bûcheron**, **Mines** pour ceux qui n'ont pas le
  niveau Mission (le travail retire un jour de chantier, qui que ce soit).
- **Entraînement** (« pour entraînement et équipement, il faut déjà connaître le rôle » ; « Le plus intéressant pour
  lui… ses faiblesses utiles ») : là où le camp entraîne (bâtiment construit), les 3 choses les plus basses (sa place dans
  la bande) parmi ce qui sert son rôle principal (`usages`), la plus basse en plein ; le style conseillé ; le port
  d'armure suivant si une armure plus lourde que celles qu'il sait porter le rendait plus efficace (Académie de la
  survie : ils s'apprennent dans l'ordre) ; 3 sorts de ses écoles qui servent son rôle principal (École de magie) ; ses
  montures pas encore apprivoisées (Grange du dresseur).
- **Poste** (« Faut pas qu'il soit trop bon au combat… sinon on veut pas le mettre en poste ») : les 3 meilleurs de la
  compagnie (capitaine à part) pour ce que demande le poste — Intendance, Médecine, la compétence du maître ou ce
  qu'entraîne sa salle, avec la Transmission du savoir ; l'aura d'officier pour Officier — seulement si le bâtiment est
  construit ; ceux qui sont parmi les meilleurs au combat restent en mission, sauf pour Officier.

## 8 — Les règles de l'Équipement

« On renforce son rôle par le meilleur équipement… Il a des dégâts d'eau… un Trident même s'il fera pas mal au CAC. »
Tout se calcule avec les règles du combat, contre l'ennemi médian des missions.

- **Caractéristiques** : ce qui sert son rôle principal, d'après d'où il le tient (`usages`) : sa magie (son école,
  Intelligence, Puissance magique, Réserve de mana), son arme de contact (Dextérité, Vitesse, Perception, Force) ou de tir,
  sa solidité (Constitution, Résistance physique, Esquive), Discrétion et Perception pour un éclaireur, Courage et
  Charisme pour un meneur (aura, grade), Intimidation pour un démoralisateur, Compagnon animal.
- **Le profil** : deux styles cachés (« L'arme de soutien peut remplacer les deux même… deux styles cachés… soutien et
  pur distance »), sinon son meilleur style visible (« on retombe sur deux armes, deux mains, bouclier »).
  - **Soutien** : son rôle principal vient de sa magie. Une arme de soutien, qui remplace les deux : celle qui augmente
    son école (Trident : Eau ; Épée à deux mains : Feu ; Marteau de guerre : Foudre), sinon la Puissance magique (Bâton
    long), la Réserve de mana (Bâton court) ; le Fouet (Charisme) pour un meneur.
  - **Pur distance** (« être mauvais au cac et assez rapide pour fuir ») : sa meilleure attaque est à distance, il est sous
    la médiane de la bande au corps à corps, au-dessus en Vitesse, et ce n'est pas un protecteur (il ne fuit pas) : sa
    meilleure arme de tir, et une lame courte de secours.
  - **Son style visible** (tagué dans Style de combat) : sa meilleure arme pour ce style ; avec Bouclier, le bouclier qui
    le rend le plus solide. Un rôle principal tenu par un objet (le fouet) : il le garde.
- **Plusieurs propositions** (« Avoir plusieurs propositions, c'est pas gênant… trancher sur les armes ayant le même rôle
  ») : pour un camp tagué, sa meilleure arme contre l'ennemi de ce camp si elle n'est pas la même et qu'il est au-dessus de
  la médiane de la bande dans sa famille (la masse contre les squelettes) ; une arme de tir en second jeu si son tir
  compte.
- **Armure** (« faut voir ce qui le rend le plus efficace ») : parmi celles qu'il sait porter, celle qui lui donne la
  meilleure valeur dans son rôle principal (puis le suivant) : ses chances de lancer ses sorts pour un rôle tenu par la
  magie, ses dégâts, Discrétion + Perception pour un éclaireur, sinon sa solidité contre l'ennemi type de chaque camp
  (moyenne géométrique : un seul adversaire, un canonnier, rend toute armure inutile).
- Deux règles de jeu décidées en chemin (doc 04, doc 05) : le poison ne prend que sur une arme qui tranche ou perce, jamais
  sur une arme à feu ; une armure retire de la Discrétion autant qu'elle retire d'Esquive (« parfait »).

## 9 — La simulation (2026-11-12) et ses réglages

Idan : « générer des mercenaires pour voir si ça marche bien dans le fond ». Compagnies générées de 9 à 41 mercenaires,
niveaux 1 à 8, tous les bâtiments construits. Réglages faits pour que les tags disent quelque chose (à valider) :

- **Les meilleurs** : le quart du haut d'un de leurs rôles (`seuils.meilleur`, 75) au lieu de la médiane. Avec la médiane,
  13 mercenaires sur 13 l'étaient (avec onze rôles, presque tout le monde passe la médiane quelque part) : personne en
  garde, personne au travail, personne à un poste.
- **Mission** : la règle des 20 % se compte bien parmi ceux qui tiennent le rôle. Dans une petite compagnie, presque tout
  le monde garde le niveau Mission (c'est la règle : 4 dans un rôle, personne n'est écarté).
- **Camps** : la médiane parmi ceux qui ont la réponse, et seulement les attaques qui comptent (sinon une arbalète de
  secours suffisait) : de 10 sur 13 à environ la moitié pour le Culte des morts, qui a six traits distinctifs.
- **Postes** : les 3 meilleurs de la compagnie, puis on retire les meilleurs au combat (au lieu des 3 meilleurs parmi les
  autres, qui donnait 9 postes au même mercenaire).
- **Un seul style conseillé**, et les caractéristiques du **seul rôle principal** (12 tags verts en moyenne avant, 5 à 6
  après).

## 10 — Pas encore décidé

Les questions fermées à l'intendant, ses biais, l'endroit où les tags ressortent ailleurs (liste des mercenaires, choix de
l'équipe d'une mission…) et des titres plus drôles (historique, classement dans la compagnie) : à discuter.
