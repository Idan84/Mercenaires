# Titres des mercenaires

> Décisions d'Idan du 2026-10-31 (version 2, qui remplace les facettes, points forts et points faibles). Étape codée :
> notes des catégories et sous-catégories, attribution des titres, titres écrits (section 5 ; 2026-11-01). À venir : l'onglet **Conseils**
> (l'intendant, façon adjoint de Football Manager, avec des erreurs volontaires).

## 1 — Ce que voit le joueur

Au-dessus du portrait 9:16 de la fiche, dans chaque onglet qui l'affiche : **1 à 3 titres**, chacun avec ses étoiles de
réputation en dessous (15 niveaux : bronze, argent, or), ou **Chair à canon**. Tout se recalcule avec l'équipement porté.
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
4. **Spécificité** : un titre prend sa meilleure sous-catégorie si elle a **au moins 2★ de plus** que toutes les autres
   (6★ contre 5★ : générique), ou s'il ne sait faire qu'elle (au moins 3★). Sinon il reste générique.

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
- **Mesure** (4000 recrues) : Chair à canon 65.8 %, un titre 28.4 %, deux 5.1 %, trois 0.7 %
  (avant : 27 / 37 / 24 / 12 %). Titres par catégorie : DPS au CAC 9.2 %, DPS à distance 8.2 %, Tank 5 %, Éclaireur 4.9 %, Meneur 4.6 %, Contrôleur 2.6 %, DPS magiques 2.5 %, Buffer 2 %, Summoner 1.2 %, Healer 0.7 %.
  Titre principal hors du domaine : 2 sur 655 (avant : 7 %). Capitaines : Meneur pour 11 % (aura nettement au-dessus de
  la moyenne).

## 5 — Les titres écrits

Décisions d'Idan du 2026-11-01. Données : `data/reference/mercenary-titles.json` ; code : `titleCopy`
(`game-core/mercenary-profile.js`) ; affichage : `renderEvaluation` (`prototype-web/ui.js`).

- **Explicite d'abord** : le rôle est toujours dit par le même mot (Healer → **Soigneur**).
- **Le décalage est dans le niveau** : un mot par palier d'étoiles, propre au rôle — 4–5★, 6–8★, 9–10★, 11–14★, 15★.
- **Spécialisation** (format A) : le titre reste celui de la catégorie ; une petite ligne « spécialité : … » s'ajoute dessous.
- **Les titres sont séparés** : 1 à 3 lignes, comme avant, chacune avec ses étoiles.
- **Infobulle** : deux lignes qui décrivent le rôle (ou la spécialité), avec humour ; elle ne dit pas au joueur quoi faire. Le titre brut n'est plus montré.
- Tout est écrit à la main, au masculin et au féminin.

| Catégorie | Mot | 4–5★ | 6–8★ | 9–10★ | 11–14★ | 15★ |
|---|---|---|---|---|---|---|
| Healer | Soigneur / Soigneuse | en herbe | de garde | aux doigts de fée | qui recoud tout | miraculeux |
| Summoner | Invocateur / Invocatrice | en herbe | de basse-cour | de ménagerie | des hordes | intarissable |
| Buffer | Renforceur / Renforceuse | en herbe | vitaminé | gonflé à bloc | électrisant | survolté |
| Contrôleur | Entraveur / Entraveuse | en herbe | agaçant | exaspérant | tyrannique | implacable |
| DPS au CAC | Cogneur / Cogneuse | en herbe | de taverne | qu'on évite | dévastateur | apocalyptique |
| DPS à distance | Tireur / Tireuse | en herbe | de foire | à l'œil de lynx | qui décoiffe | infaillible |
| DPS magiques | Mage de guerre / Mage de guerre | en herbe | pétaradant | explosif | ravageur | cataclysmique |
| Tank | Encaisseur / Encaisseuse | en herbe | rembourré | blindé | inébranlable | indestructible |
| Éclaireur | Éclaireur / Éclaireuse | en herbe | fouineur | qui voit tout | fantôme | invisible |
| Meneur | Meneur / Meneuse | en herbe | à la grosse voix | qu'on écoute | qu'on acclame | qu'on suivrait en enfer |

Chair à canon ne change pas.

| Catégorie | Spécialités (sous-catégorie → étiquette) |
|---|---|
| Healer | Urgentiste → urgences ; De masse → soins de groupe ; Dans la durée → soins au long cours |
| Summoner | De masse → nuées ; De DPS → bêtes de combat ; Gardien → gardiens ; Nécromancien → morts-vivants |
| Buffer | De masse → toute la troupe ; De DPS → coups plus forts ; Accélérateur → vitesse ; Source de mana → mana des autres ; Protecteur → boucliers magiques |
| Contrôleur | Des foules → foules ; Des boss → gros morceaux ; Placeur → déplacements ; Anti-mage → anti-magie |
| DPS au CAC | Perce-armure → perce-armure ; De foules → coups en rafale ; Assassin → coups en traître ; Dans la durée → lames empoisonnées ; Chargeur → charges |
| DPS à distance | Perce-armure → perce-armure ; De foules → tirs en rafale ; Tireur d'élite → tir de loin ; Dans la durée → traits empoisonnés |
| DPS magiques | De foules → sorts de zone ; Tueur de cible → une cible à la fois ; Dans la durée → brûlures et maléfices ; Perce-résistances → perce-résistances |
| Tank | Inblessable → carapace ; Esquiveur → esquive ; Auto-soigneur → se soigne tout seul ; Gardien de ligne → contre-charges |
| Éclaireur | Vigie → guet ; Infiltrateur → infiltration ; Éclaireur magique → yeux magiques ; Poseur de pièges → pièges |
| Meneur | Soutien de ses troupes → moral des troupes ; Démoralisateur → terreur |

Les infobulles (deux lignes par rôle et par spécialité) sont dans les données.

## 6 — Code et données

- `game-core/mercenary-profile.js` : sources, notes, titres (`createProfileRules`, `evaluate`, `measure`, `spellRole`).
- `data/reference/mercenary-profile.json` : sélection, catégories, sources, sorts et créatures par sous-catégorie (à la
  main) ; étalon, seuils et mesure (par le script).
- `scripts/build-mercenary-profile.js` : étalonnage sur 4 000 recrues ; à relancer quand la génération, le combat, les
  sorts ou les sous-catégories changent.
- **Garde-fous** (Idan, 2026-10-31) : la publication bloque si un sort ou une créature n'a pas de rôle (`sorts`,
  `creatures`, ou `sans_role` pour Purge et Célérité), et si l'étalonnage n'est plus celui que donnent les règles
  (`node scripts/build-mercenary-profile.js --check`). L'équipement et la progression, eux, suivent tout seuls : les
  mesures passent par les règles du combat.
- `data/reference/mercenary-titles.json` : titres écrits (section 5).
- `prototype-web/ui.js` (`renderEvaluation`) ; tests : `tests/mercenary-profile.test.js`, `tests/mercenary-titles.test.js`.
