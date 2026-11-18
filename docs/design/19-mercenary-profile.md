# Titres des mercenaires

> Décisions d'Idan du 2026-10-31, revues les 2026-11-01 et 2026-11-06. À venir : l'onglet **Conseils** (l'intendant,
> façon adjoint de Football Manager, avec des erreurs volontaires).

## 1 — Ce que voit le joueur

Au-dessus du portrait 9:16 de la fiche, dans chaque onglet qui l'affiche : **un seul titre écrit**, qui fond ses **1 à 3
rôles**, **sans étoiles** (§5), ou **Chair à canon**. Tout se recalcule avec l'équipement porté. On ne montre ni points
faibles ni valeur de combat globale.

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

Une action ne qualifie qu'une seule sous-catégorie (Idan) :

- protéger par la magie → Buffer Protecteur ; par son corps → Tank Garde du corps ;
- le moral, ami ou ennemi → Meneur ; se soigner soi-même → Tank Auto-soigneur ;
- voir par la magie (le corbeau) → Éclaireur magique ;
- arrêter les charges → Tank Gardien de ligne (armes d'hast ; toutes les armes de tir contre-chargent, ce n'est pas une
  spécialité).

Ressusciteur, Garde du corps, Stratège, Summoner de support et Poseur de pièges (pas encore de pièges en combat)
attendent que le jeu le permette : jamais notés. DPS magiques dans la durée vient de l'Embrasement (Feu), Source de mana
de la Source vive (Eau), Anti-mage du Brouillage mental (Illusion).

## 3 — Les notes

Données : `data/reference/mercenary-profile.json`.

- **Sous-catégorie** : la meilleure de ses sources, mesurées avec les formules du combat et l'équipement porté, contre
  un **étalon** jamais montré (caractéristiques médianes des recrues, maîtrise 35, épée longue en gambison ou en armure
  de plates, arc). Exemples : Perce-armure = dégâts par tour contre l'armure de plates ; Esquiveur = chance que l'étalon
  le manque ; Assassin = un coup en sortant du camouflage × chance de rester caché ; Vigie = Perception. Les sorts et
  les créatures sont rangés par sous-catégorie dans les données ; Purge et Célérité n'en ont pas.
- **Ce qu'il ne sait pas faire n'est pas noté** (pas de sort de soin, pas d'arme de tir…).
- **Échelle** : pour chaque source, les recrues qui la pratiquent se répartissent dans les niveaux selon une
  **répartition fixe**, celle de la réputation des recrues avant l'accentuation du domaine (≈ 2 % au niveau 1, 31 % au
  2, 53 % au 3, 13 % au 4, 1 % au 5) ; au-delà, chaque niveau demande × 1,25.
- **Catégorie** : sa meilleure sous-catégorie, étalonnée à son tour de la même façon, pour qu'une catégorie mesurée chez
  tous (Tank, Meneur, Éclaireur) ne sorte pas plus souvent parce qu'elle a plus de sources.

## 4 — Les titres

1. Aucune catégorie à **4★** : **Chair à canon**.
2. **Titre 1** : sa meilleure catégorie.
3. **Titre 2**, puis **titre 3** : la catégorie suivante, si elle a au moins 4★ et **au plus 1★ de moins** que la
   précédente. En cas d'égalité, la mieux placée dans son niveau passe devant.
4. **Spécificité** : une sous-catégorie qui a **au moins 2★ de plus** que toutes les autres (6★ contre 5★ : générique),
   ou la seule qu'il sait faire (au moins 3★). Elle n'est plus montrée (elle reste dans la mesure de l'étalonnage) : le
   titre écrit prend toujours le « comment » de sa meilleure sous-catégorie (§5).

Les étoiles de chaque rôle servent à choisir ses rôles et le mot de niveau ; le joueur ne les voit pas.

### Seulement ce qui agit, et le calage (Idan, 2026-11-01)

« On peut pas dire que quelqu'un est un DPS magique s'il n'a aucun sort de dégâts. »

- **Un titre seulement pour ce qui agit** :
  - **Soigneur** : un sort qui soigne vraiment (PV ou états : Délivrance) ; les protections (armures de feu et de froid,
    Peau de pierre, Peau d'écailles, Champ de protection, Robustesse de l'ours, Agilité du chat) vont au **Renforceur ·
    Protecteur** (« boucliers magiques ») ;
  - **Meneur · Soutien de ses troupes** : l'aura compte seulement pour le **capitaine**, un **lieutenant** (la moitié) ou
    celui qui tient un **fouet** ; une recrue n'en a pas. Les sorts de moral comptent toujours ;
  - **Meneur · Démoralisateur** : reste, car l'Intimidation agit en combat (−0,25 × Intimidation au Courage de
    l'ennemi).
- **Calage** : les **rôles que tout le monde pratique** (Tank, Éclaireur, Meneur : plus de 90 % des recrues) ont une
  répartition plus exigeante : 4★ pour les 5 % du haut.
- **Domaine** : une catégorie hors du domaine du mercenaire demande **une étoile de plus** : un mage n'est « DPS au
  CAC » qu'à 5★.
- **Domaine évolutif** (Idan, 2026-11-06) : à chaque recalcul du titre (**fin de mission**, **changement
  d'équipement**, **chaque matin** au camp), le domaine devient celui du **premier rôle du titre qui dit comment il se
  bat** : DPS au CAC → Combat rapproché ; DPS à distance → Distance ; DPS magiques, Healer, Buffer, Contrôleur,
  Summoner → Mage. Un Tank, un Éclaireur ou un Meneur **porté par ses sorts** compte Mage ; sinon on passe au rôle
  suivant. Sans titre, ou sans rôle qui le dise, il ne change pas.
  - **Le frein reste** : hors de son domaine, un rôle demande une étoile de plus pour entrer dans le titre. Un mage gnome
    en épée à deux mains, compétences au maximum, ne passe au combat rapproché qu'avec +40 en Force, Dextérité et
    Vitesse (5★ au CAC) ; il faut ensuite une étoile de plus à sa magie pour revenir.
  - À la génération, le titre suit le domaine tiré : personne ne change au premier matin.
  - Le journal de la compagnie le dit (« Malik passe au combat rapproché. », « … au combat à distance. », « … à la
    magie. »), le journal du combat aussi en fin de mission.
- **Cadre de combat** (Idan, 2026-11-06) : en combat seulement, l'anneau de nos personnages prend la couleur de leur
  domaine du moment : **bleu** (combat rapproché), **vert** (distance), **violet** (magie), sur le pion, la barre
  d'ordre de jeu et la liste de l'équipe. Le personnage actif reste doré ; les ennemis gardent leur rouge et leurs
  cadres de rang ; les invocations gardent leur anneau.
- **Mesure** (4 000 recrues) : Chair à canon 65,8 %, un titre 28,4 %, deux 5,1 %, trois 0,7 %. Par catégorie : DPS au
  CAC 9,2 %, DPS à distance 8,2 %, Tank 5 %, Éclaireur 4,9 %, Meneur 4,6 %, Contrôleur 2,6 %, DPS magiques 2,5 %,
  Buffer 2 %, Summoner 1,2 %, Healer 0,7 %. Titre principal hors du domaine : 2 sur 655. Capitaines : Meneur pour 11 %
  (aura nettement au-dessus de la moyenne).

## 5 — Les titres écrits (v3)

Décisions d'Idan du 2026-11-06 : « Ce qu'il fait sur le terrain × comment il le fait ». Données :
`data/reference/mercenary-titles.json`.

- **Un seul titre** : ses 1 à 3 rôles (§4) fondus en un titre, **sans étoiles**, ou **Chair à canon**. Pas de petite
  ligne de spécialité.
- **Le comment** : l'**arme** qui porte le rôle (le set qui donne la meilleure valeur), le **style** quand aucune arme ne
  domine, l'**école** de son meilleur sort, ou la **sous-catégorie** qui a son propre mot (Assassin, Rempart, Rôdeur…).
  On y lit toujours l'arme ou l'école, et ce qu'il fait.
- **L'écriture** : le nom de métier quand il dit l'arme (Épéiste, Lancier, Archer, Marteleur…), sinon un nom qui a du
  cachet suivi de l'arme (« Assommeur à la massue ») ; pour la magie, le nom de l'école quand il est transparent
  (Pyromancien, Hydromancien, Nécromancien, Illusionniste), sinon « Mage de [école] ».
- **Plusieurs rôles** : rôle principal (son titre) + autres rôles (leur forme courte) + armes en complément ; à trois
  rôles, « et » avant le dernier. Un rôle déjà dit n'est pas répété (« Mage de Foudre paralyseur » dit déjà ses dégâts
  de Foudre). Exemples : *Archer éclaireur*, *Guérisseur à la hache de guerre*, *Guetteur insaisissable et
  intimidateur*, *Assassin rôdeur à l'épée longue et à l'arc*.
- **Le niveau** : le mot du rôle principal, par paliers d'étoiles (4–5★, 6–8★, 9–10★, 11–14★, 15★), placé **avant
  l'arme** ou **à la fin** selon le mot : *Assommeur en herbe à la massue*, *Combattant à la hache de guerre qu'on
  évite*, *Meneur au fouet à la grosse voix*.
- **Sa monture équipée** (Idan, 2026-11-07 : « Pour pas changer en permanence son titre et sa réputation : on prend en
  compte la monture équipée ») : à la fin du titre, « à cheval », « à dos de licorne » (`mounts.json`) : *Lancier
  vétéran à cheval*, *Chair à canon à cheval*. Une monture au repos (blessée, fatiguée) reste équipée : le titre ne
  bouge pas ; une monture dans l'inventaire ne compte pas. Le loup : « à dos de loup » pour un petit qui le monte ; rien
  pour celui qui l'emmène à pied (il faut pouvoir la monter).
- **Infobulle** : deux lignes sur le rôle principal (ou sa sous-catégorie).
- **Affichés au masculin pour tous** (Idan, 2026-11-15 : « garde au masculin (neutre) l'ensemble des titres »), sur la
  fiche complète comme au survol. La version féminine reste dans les données, sans servir : *Archère éclaireuse*,
  *Assommeuse dévastatrice à la massue*, *Cheffe de guerre*, *Mage de Foudre paralyseuse*, *Transmutatrice* ; restent
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
au kukri ») ; **Empoisonneur** (« Empoisonneur à la sarbacane »). Les autres (perce-armure, de foules, charge, tir de
loin) gardent le titre de l'arme.

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
(Soigneur, Entraveur, Renforceur, Invocateur, Mage de guerre). **Renforceur** plutôt que « de soutien », qui ne se
compose pas (« Rôdeur guérisseur et de soutien »).

**Mesure** (4 000 recrues, 2026-11-06) : 234 titres différents ; Chair à canon 66 %, un rôle 28 %, deux 5 %, trois
0,9 %. Les plus fréquents : Intimidateur, Fendeur à la hache double, Canonnier, Insaisissable, Arquebusier, Marteleur,
Rempart, Archer, Arbalétrier, Guetteur, Mage de Foudre (« en herbe » pour presque tous : 4–5★).

## 6 — Étalonnage et garde-fous

- L'étalonnage (étalon, seuils, mesure) se fait sur 4 000 recrues ; il est à refaire quand la génération, le combat, les
  sorts ou les sous-catégories changent. L'équipement et la progression suivent tout seuls : les mesures passent par les
  règles du combat.
- **Garde-fous** (Idan, 2026-10-31) : la publication bloque si un sort ou une créature n'a pas de rôle (sauf Purge et
  Célérité, sans rôle), ou si l'étalonnage n'est plus celui que donnent les règles.
