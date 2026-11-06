# Titres des mercenaires

> Décisions d'Idan du 2026-10-31 (version 2, qui remplace les facettes, points forts et points faibles). Étape codée :
> notes des catégories et sous-catégories, attribution des titres, titres écrits (section 5 ; v3 du 2026-11-06). À venir : l'onglet **Conseils**
> (l'intendant, façon adjoint de Football Manager, avec des erreurs volontaires).

## 1 — Ce que voit le joueur

Au-dessus du portrait 9:16 de la fiche, dans chaque onglet qui l'affiche : **un seul titre écrit**, qui fond ses **1 à 3
rôles**, **sans étoiles** (v3, 2026-11-06 ; section 5), ou **Chair à canon**. Tout se recalcule avec l'équipement porté.
On ne montre ni points faibles ni valeur de combat globale.

## 2 — Les 10 catégories et leurs sous-catégories

| Catégorie | Sous-catégories |
|---|---|
| Healer | Urgentiste, De masse, Dans la durée, Ressusciteur |
| Summoner | De masse, De DPS, De support, Gardien, Nécromancien |
| Buffer | De masse, De DPS, Accélérateur, Source de mana, Protecteur |
| Contrôleur | Des foules, Des boss, Placeur, Anti-mage |
| DPS au CAC | Perce-armure, De foules, Assassin, Dans la durée, Chargeur |
| DPS à distance | Perce-armure, De foules, Tireur d'élite, Dans la durée |
| DPS magiques | De foules, Tueur de cible, Dans la durée, Perce-résistances |
| Tank | Inblessable, Esquiveur, Auto-soigneur, Garde du corps, Gardien de ligne |
| Éclaireur | Vigie, Infiltrateur, Éclaireur magique, Poseur de pièges |
| Meneur | Soutien de ses troupes, Démoralisateur, Stratège |

Une action ne qualifie qu'une seule sous-catégorie (Idan) : protéger par la magie → Buffer Protecteur (déplacé du Healer le 2026-11-01 : un Soigneur doit soigner), par son corps →
Tank Garde du corps ; le moral, ami ou ennemi → Meneur ; se soigner soi-même → Tank Auto-soigneur ; voir par la magie (le
corbeau) → Éclaireur magique ; arrêter les charges → Tank Gardien de ligne (armes d'hast : toutes les armes de tir
contre-chargent, ce n'est pas une spécialité). Ressusciteur, Garde du corps, Stratège,
Summoner de support et Poseur de pièges (les pièges n'existent pas encore en combat ; 2026-11-01) attendent que le jeu le permette : ils ne sont jamais notés. DPS magiques dans la durée est noté depuis l'Embrasement (Feu), Source de mana depuis la Source vive (Eau ; 2026-11-01), Anti-mage depuis le Brouillage mental (Illusion ; 2026-11-01).

## 3 — Les notes

- **Sous-catégorie** : la meilleure de ses sources (`mercenary-profile.json`, `sources`), mesurées avec les formules du
  combat et l'équipement porté, contre un **étalon** jamais montré (caractéristiques médianes des recrues, maîtrise 35,
  épée longue en gambison ou en armure de plates, arc). Exemples : Perce-armure = dégâts par tour contre l'armure de
  plates ; Esquiveur = chance que l'étalon le manque ; Assassin = un coup en sortant du camouflage × chance de rester
  caché ; Vigie = Perception. Les sorts et les créatures sont rangés par sous-catégorie dans les données (`sorts`,
  `creatures`) ; Purge et Célérité n'en ont pas.
- **Ce qu'il ne sait pas faire n'est pas noté** (pas de sort de soin, pas d'arme de tir…).
- **Échelle de la réputation** : pour chaque source, les recrues qui la pratiquent se répartissent dans les niveaux comme
  leur réputation (≈ 2 % au niveau 1, 31 % au 2, 53 % au 3, 13 % au 4, 1 % au 5) ; au-delà, chaque niveau demande × 1,25.
- **Catégorie** : sa meilleure sous-catégorie, étalonnée à son tour de la même façon, pour qu'une catégorie mesurée chez
  tous (Tank, Meneur, Éclaireur) ne sorte pas plus souvent qu'une autre parce qu'elle a plus de sources.

## 4 — Les titres

1. Aucune catégorie à **4★** : **Chair à canon**.
2. **Titre 1** : sa meilleure catégorie.
3. **Titre 2**, puis **titre 3** : la catégorie suivante, si elle a au moins 4★ et **au plus 1★ de moins** que la
   précédente. En cas d'égalité, la mieux placée dans son niveau passe devant.
4. **Spécificité** (v2) : un titre prend sa meilleure sous-catégorie si elle a **au moins 2★ de plus** que toutes les autres
   (6★ contre 5★ : générique), ou s'il ne sait faire qu'elle (au moins 3★). Sinon il reste générique. Depuis la v3
   (section 5), le titre écrit prend toujours le « comment » de sa meilleure sous-catégorie : la spécificité n'est plus
   montrée (elle reste dans la mesure de l'étalonnage).

Les étoiles de chaque rôle servent à choisir ses rôles et le mot de niveau ; le joueur ne les voit plus (v3).

Mesure d'origine (2026-10-31, 4 000 recrues) : 50 % de Chair à canon, 33 % un titre, 12 % deux, 5 % trois ; un titre sur trois est précisé
(surtout Tank et Meneur : leurs sous-catégories varient indépendamment ; celles des DPS viennent de la même arme et se
détachent rarement chez les recrues).

### Seulement ce qui agit, et le calage (Idan, 2026-11-01)

« On peut pas dire que quelqu'un est un DPS magique s'il n'a aucun sort de dégâts » ; « un intimidateur en meneur, pourquoi
pas, mais on doit vraiment sentir que c'est son rôle » ; « certains trucs sont trop surestimés ce qui fait qu'ils ont trois
titres au début ».

- **Un titre seulement pour ce qui agit** :
  - **Soigneur** : un sort qui soigne vraiment (PV ou états : Délivrance) ; les protections (armures de feu et de froid,
    Peau de pierre, Peau d'écailles, Champ de protection, Robustesse de l'ours, Agilité du chat) passent au
    **Renforceur · Protecteur** (« boucliers magiques ») ;
  - **Meneur · Soutien de ses troupes** : l'aura compte seulement pour le **capitaine**, un **lieutenant** (la moitié) ou
    celui qui tient un **fouet** ; une recrue n'en a pas. Les sorts de moral comptent toujours ;
  - **Meneur · Démoralisateur** : l'Intimidation agit en combat (−0,25 × Intimidation au Courage de l'ennemi) ; il reste ;
  - **Poseur de pièges** : plus noté tant que les pièges n'existent pas.
- **Calage** : les niveaux suivent une **répartition fixe** (`selection.repartition` : 2 / 31 / 53 / 13 / 1 % des
  praticiens aux niveaux 1 à 5, la réputation des recrues avant le domaine), et non plus la réputation du moment, qui a
  monté avec l'accentuation du domaine. Les **rôles que tout le monde pratique** (Tank, Éclaireur, Meneur : plus de 90 %
  des recrues les pratiquent) ont une répartition plus exigeante (`selection.repartition_tous` : 4★ pour les 5 % du
  haut).
- **Domaine** : une catégorie hors du domaine du mercenaire demande **une étoile de plus** (`selection.domaines`,
  `ecart_hors_domaine`) : un mage n'est « DPS au CAC » qu'à 5★.
- **Domaine évolutif** (Idan, 2026-11-06 : « le statut (l'icône) évolue dans le temps et le cadre suit cette évolution » ;
  « on garde le frein, et un message dans le journal, mais on utilise le terme de combat rapproché ») : à chaque recalcul du
  titre — **fin de mission** (expérience), **changement d'équipement** (échange, relance, réaménagement), **chaque matin**
  au camp (entraînements, apprentissages) —, le domaine prend celui du **premier rôle du titre qui dit comment il se bat**
  (`selection.domaine_par_role`) : DPS au CAC → Combat rapproché ; DPS à distance → Distance ; DPS magiques, Healer, Buffer,
  Contrôleur, Summoner → Mage. Un Tank, un Éclaireur ou un Meneur **porté par ses sorts** compte Mage
  (`selection.domaine_sorts`) ; sinon on passe au rôle suivant. Sans titre, ou sans rôle qui le dise, il ne change pas.
  **Le frein reste** : hors de son domaine, un rôle demande une étoile de plus pour entrer dans le titre ; un mage passe au
  combat rapproché quand l'épée a vraiment pris le dessus (exemple du test : un mage gnome en épée à deux mains, compétences
  au maximum, n'y passe qu'avec +40 en Force, Dextérité et Vitesse : 5★ au CAC), et il faudra ensuite une étoile de plus à
  sa magie pour revenir. À la génération, le titre suit le domaine tiré : personne ne change au premier matin. Le journal
  de la compagnie le dit (« Malik passe au combat rapproché. », « … au combat à distance. », « … à la magie. »), le journal
  du combat aussi en fin de mission. Le picto de la fiche suit. Code : `titleDomain` (`game-core/mercenary-profile.js`),
  `refreshMercenaryDomains` (`prototype-web/ui.js`).
- **Cadre de combat** (Idan, 2026-11-06 : « un cadre de couleur pour nos personnages ? Archer / CAC / Magie » ; « combat
  seulement », « on ne touche pas aux ennemis ») : en combat, l'anneau de nos personnages prend la couleur de leur domaine
  du moment : **bleu** (combat rapproché), **vert** (distance), **violet** (magie), sur le pion, la barre d'ordre de jeu et
  la liste de l'équipe. Le personnage actif reste doré ; les ennemis gardent leur rouge et leurs cadres de rang ; les
  invocations gardent leur anneau.
- **Mesure** (4000 recrues) : Chair à canon 65.8 %, un titre 28.4 %, deux 5.1 %, trois 0.7 %
  (avant : 27 / 37 / 24 / 12 %). Titres par catégorie : DPS au CAC 9.2 %, DPS à distance 8.2 %, Tank 5 %, Éclaireur 4.9 %, Meneur 4.6 %, Contrôleur 2.6 %, DPS magiques 2.5 %, Buffer 2 %, Summoner 1.2 %, Healer 0.7 %.
  Titre principal hors du domaine : 2 sur 655 (avant : 7 %). Capitaines : Meneur pour 11 % (aura nettement au-dessus de
  la moyenne).

## 5 — Les titres écrits (v3)

Décisions d'Idan du 2026-11-06 (remplacent les titres écrits du 2026-11-01 : mot du rôle, petite ligne de spécialité, un
titre par ligne avec ses étoiles). Données : `data/reference/mercenary-titles.json` ; code : `composeTitle`
(`game-core/mercenary-profile.js`) ; affichage : `renderEvaluation` (`prototype-web/ui.js`).

« Ce qu'il fait sur le terrain × comment il le fait » ; « l'idée du titre, c'est de faire un résumé de la fiche du
personnage » ; « on ajoute surtout pas de petite ligne » ; « pas d'étoile » ; « le 3 titres c'est bien. On rajoute un
niveau comme on avait déjà ».

- **Un seul titre** : ses 1 à 3 rôles (section 4) fondus en un titre, **sans étoiles**, ou **Chair à canon**.
- **Le comment** : l'**arme** qui porte le rôle (le set qui donne la meilleure valeur), le **style** quand aucune arme ne
  domine, l'**école** de son meilleur sort, ou la **sous-catégorie** qui a son propre mot (Assassin, Rempart, Rôdeur…).
  On y lit toujours l'arme ou l'école, et ce qu'il fait.
- **L'écriture** : le nom de métier quand il dit l'arme (Épéiste, Lancier, Archer, Marteleur…), sinon un nom qui a du
  cachet suivi de l'arme (« Assommeur à la massue ») ; pour la magie, le nom de l'école quand il est transparent
  (Pyromancien, Hydromancien, Nécromancien, Illusionniste), sinon « Mage de [école] ».
- **Plusieurs rôles** : rôle principal (son titre) + autres rôles (leur forme courte) + armes en complément ;
  à trois rôles, « et » avant le dernier. Un rôle déjà dit n'est pas répété (« Mage de Foudre paralyseur » dit déjà ses
  dégâts de Foudre). Exemples : *Archer éclaireur*, *Guérisseur à la hache de guerre*, *Guetteur insaisissable et
  intimidateur*, *Assassin rôdeur à l'épée longue et à l'arc*.
- **Le niveau** : le mot du rôle principal, aux paliers d'étoiles d'avant (4–5★, 6–8★, 9–10★, 11–14★, 15★), placé
  **avant l'arme** ou **à la fin** selon le mot (`paliers_place`) : *Assommeur en herbe à la massue*, *Combattant à la
  hache de guerre qu'on évite*, *Meneur au fouet à la grosse voix*.
- **Infobulle** : deux lignes sur le rôle principal (ou sa sous-catégorie), comme avant.
- **Masculin et féminin** (Idan, 2026-11-06 : « je te laisse faire la version féminine ») : *Archère éclaireuse*,
  *Assommeuse dévastatrice à la massue*, *Cheffe de guerre*, *Mage de Foudre paralyseuse*, *Transmutatrice*. Restent
  identiques : Épéiste, Samouraï, Coupe-jarret, Brise-plates, Bâtonniste, Rétiaire, Ambidextre, Duelliste, Mage de…,
  Télékinésiste, Illusionniste, Forgeflamme, Rempart, Insaisissable, Increvable, Augure.

| Rôle | 4–5★ | 6–8★ | 9–10★ | 11–14★ | 15★ |
|---|---|---|---|---|---|
| Soin | en herbe | de garde | aux doigts de fée *(fin)* | qui recoud tout *(fin)* | miraculeux |
| Invocation | en herbe | de basse-cour | de ménagerie | des hordes | intarissable |
| Renfort | en herbe | vitaminé | gonflé à bloc | électrisant | survolté |
| Entrave | en herbe | agaçant | exaspérant | tyrannique | implacable |
| Corps à corps | en herbe | de taverne | qu'on évite *(fin)* | dévastateur | apocalyptique |
| Distance | en herbe | de foire | à l'œil de lynx *(fin)* | qui décoiffe *(fin)* | infaillible |
| Dégâts magiques | en herbe | pétaradant | explosif | ravageur | cataclysmique |
| Protection | en herbe | rembourré | blindé | inébranlable | indestructible |
| Éclaireur | en herbe | fouineur | qui voit tout *(fin)* | fantôme | invisible |
| Meneur | en herbe | à la grosse voix *(fin)* | qu'on écoute *(fin)* | qu'on acclame *(fin)* | qu'on suivrait en enfer *(fin)* |

### Armes (dégâts au corps à corps et à distance)

| Arme | Titre | En second rôle |
|---|---|---|
| Dague | Poignardeur | à la dague |
| Épée courte | Spadassin à l'épée courte | à l'épée courte |
| Kukri | Coupe-jarret au kukri | au kukri |
| Sai | Combattant aux saïs | aux saïs |
| Estoc | Bretteur | à l'estoc |
| Sabre | Sabreur | au sabre |
| Épée longue | Épéiste | à l'épée longue |
| Katana | Samouraï | au katana |
| Épée double | Danseur à l'épée double | à l'épée double |
| Épée à deux mains | Épéiste à deux mains | à l'épée à deux mains |
| Hachette | Bûcheron à la hachette | à la hachette |
| Hache de guerre | Combattant à la hache de guerre | à la hache de guerre |
| Hache double | Fendeur à la hache double | à la hache double |
| Massue | Assommeur à la massue | à la massue |
| Masse d'armes | Massier | à la masse d'armes |
| Marteau de guerre | Marteleur | au marteau de guerre |
| Pic de guerre | Brise-plates au pic de guerre | au pic de guerre |
| Fléau d'armes | Moissonneur au fléau | au fléau d'armes |
| Nunchaku | Combattant au nunchaku | au nunchaku |
| Fouet | Dompteur au fouet | au fouet |
| Bâton court | Bâtonniste | au bâton court |
| Bâton long | Pèlerin au bâton long | au bâton long |
| Lance | Lancier | à la lance |
| Trident | Rétiaire au trident | au trident |
| Hallebarde | Hallebardier | à la hallebarde |
| Bardiche | Faucheur à la bardiche | à la bardiche |
| Arme d'hast double | Combattant à l'arme d'hast double | à l'arme d'hast double |
| Arc | Archer | à l'arc |
| Arbalète | Arbalétrier | à l'arbalète |
| Fronde | Frondeur | à la fronde |
| Sarbacane | Souffleur de dards | à la sarbacane |
| Pistolet | Pistolier | au pistolet |
| Arquebuse | Arquebusier | à l'arquebuse |
| Tromblon | Tireur au tromblon | au tromblon |
| Canon à main | Canonnier | au canon à main |

Sous-catégories qui ont leur mot, avec l'arme en complément : **Assassin** (la dague va de soi : « Assassin », « Assassin
au kukri ») ; **Empoisonneur** (« Empoisonneur à la sarbacane »). Les autres (perce-armure, de foules, charge, tir de loin)
gardent le titre de l'arme.

### Styles (aucune arme ne domine)

Le set tient deux armes différentes, ou l'autre set frappe au **même niveau** avec une autre arme :

| Cas | Titre |
|---|---|
| Deux armes différentes dans les mains | Ambidextre |
| Deux armes tenues à deux mains | Combattant à deux mains |
| Deux armes d'une même catégorie | Combattant aux [catégorie] (« Combattant aux lames longues ») |
| Deux armes avec bouclier | Combattant au bouclier |
| Deux armes à une main, main libre | Duelliste |
| Deux armes de tir | Tireur |

### Protection, Éclaireur, Meneur

| Rôle · comment | Titre | En second rôle |
|---|---|---|
| Protection · encaisser, avec bouclier | Rempart | rempart |
| Protection · encaisser, sans bouclier | Cuirassé | cuirassé |
| Protection · esquive | Insaisissable | insaisissable |
| Protection · se soigne (Drain de vie, potions) | Increvable | increvable |
| Protection · arrête les charges (armes d'hast) | Piquier | piquier |
| Éclaireur · Perception | Guetteur | éclaireur |
| Éclaireur · Discrétion | Rôdeur | rôdeur |
| Éclaireur · Corbeau | Augure au corbeau | augure |
| Meneur · aura du capitaine ou d'un lieutenant | Chef de guerre | chef de guerre |
| Meneur · aura du fouet | Meneur au fouet | meneur (au fouet) |
| Meneur · sorts de moral (Illusion) | Illusionniste galvaniseur | galvaniseur |
| Meneur · Intimidation | Intimidateur | intimidateur |
| Meneur · sorts de peur (Illusion) | Illusionniste épouvanteur | épouvanteur |

### Magie (école du meilleur sort × rôle)

| École | Dégâts | Soin | Entrave | Renfort | Invocation |
|---|---|---|---|---|---|
| Feu | Pyromancien | — | Pyromancien entraveur | Forgeflamme | — |
| Eau | Hydromancien | Hydromancien guérisseur | Cryomancien | Hydromancien renforceur | — |
| Foudre | Mage de Foudre | — | Mage de Foudre paralyseur | Mage de Foudre renforceur | — |
| Vie | Mage de Vie | Guérisseur | — | Mage de Vie renforceur | — |
| Transmutation | — | Transmutateur guérisseur | — | Transmutateur | — |
| Télékinésie | Télékinésiste | — | Télékinésiste entraveur | Télékinésiste protecteur | — |
| Illusion | Illusionniste | — | Illusionniste envoûteur | Illusionniste renforceur | — |
| Nécromancie | Nécromancien | — | Nécromancien flétrisseur | — | Leveur de morts |
| Invocation | — | — | Invocateur entraveur | — | Invocateur de bêtes |

En second rôle : l'école de dégâts (pyromancien, mage de Foudre…), guérisseur, entraveur (paralyseur, envoûteur,
flétrisseur), renforceur (protecteur), leveur de morts, invocateur. Une école sans entrée prend le mot du rôle
(Soigneur, Entraveur, Renforceur, Invocateur, Mage de guerre).

- **Renforceur** plutôt que « de soutien » (brouillon) : « de soutien » ne se compose pas (« Rôdeur guérisseur et de
  soutien »).
- **Mesure** (4 000 recrues, 2026-11-06) : 234 titres différents ; Chair à canon 66 %, un rôle 28 %, deux 5 %, trois
  0,9 %. Les plus fréquents : Intimidateur, Fendeur à la hache double, Canonnier, Insaisissable, Arquebusier, Marteleur,
  Rempart, Archer, Arbalétrier, Guetteur, Mage de Foudre (« en herbe » pour presque tous : 4–5★).

## 6 — Code et données

- `game-core/mercenary-profile.js` : sources, notes, rôles, titre écrit (`createProfileRules`, `evaluate`, `measure`,
  `spellRole`, `composeTitle`) ; les sources d'arme se mesurent set par set (`SET_SOURCES`), pour dire quelle arme porte
  le rôle.
- `data/reference/mercenary-profile.json` : sélection, catégories, sources, sorts et créatures par sous-catégorie (à la
  main) ; étalon, seuils et mesure (par le script).
- `scripts/build-mercenary-profile.js` : étalonnage sur 4 000 recrues ; à relancer quand la génération, le combat, les
  sorts ou les sous-catégories changent.
- **Garde-fous** (Idan, 2026-10-31) : la publication bloque si un sort ou une créature n'a pas de rôle (`sorts`,
  `creatures`, ou `sans_role` pour Purge et Célérité), et si l'étalonnage n'est plus celui que donnent les règles
  (`node scripts/build-mercenary-profile.js --check`). L'équipement et la progression, eux, suivent tout seuls : les
  mesures passent par les règles du combat.
- `data/reference/mercenary-titles.json` : titres écrits (section 5) : armes, styles, rôles (écoles, sous-catégories,
  variantes), mots de niveau et leur place, infobulles.
- `prototype-web/ui.js` (`renderEvaluation`) ; tests : `tests/mercenary-profile.test.js`, `tests/mercenary-titles.test.js`.
