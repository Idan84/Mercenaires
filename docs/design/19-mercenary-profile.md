# Titres des mercenaires

> Décisions d'Idan du 2026-10-31 (version 2, qui remplace les facettes, points forts et points faibles). Étape codée :
> notes des catégories et sous-catégories, attribution des titres, affichage brut (« DPS au CAC · Perce-armure » et ses
> étoiles). À venir : les vrais titres, drôles et simples, pour chaque palier d'étoiles ; l'onglet **Conseils**
> (l'intendant, façon adjoint de Football Manager, avec des erreurs volontaires).

## 1 — Ce que voit le joueur

Au-dessus du portrait 9:16 de la fiche, dans chaque onglet qui l'affiche : **1 à 3 titres**, chacun avec ses étoiles de
réputation en dessous (15 niveaux : bronze, argent, or), ou **Chair à canon**. Tout se recalcule avec l'équipement porté.
On ne montre ni points faibles ni valeur de combat globale.

## 2 — Les 10 catégories et leurs sous-catégories

| Catégorie | Sous-catégories |
|---|---|
| Healer | Urgentiste, De masse, Dans la durée, Protecteur, Ressusciteur |
| Summoner | De masse, De DPS, De support, Gardien, Nécromancien |
| Buffer | De masse, De DPS, Accélérateur, Source de mana |
| Contrôleur | Des foules, Des boss, Placeur, Anti-mage |
| DPS au CAC | Perce-armure, De foules, Assassin, Dans la durée, Chargeur |
| DPS à distance | Perce-armure, De foules, Tireur d'élite, Dans la durée |
| DPS magiques | De foules, Tueur de cible, Dans la durée, Perce-résistances |
| Tank | Inblessable, Esquiveur, Auto-soigneur, Garde du corps, Gardien de ligne |
| Éclaireur | Vigie, Infiltrateur, Éclaireur magique, Poseur de pièges |
| Meneur | Soutien de ses troupes, Démoralisateur, Stratège |

Une action ne qualifie qu'une seule sous-catégorie (Idan) : protéger par la magie → Healer Protecteur, par son corps →
Tank Garde du corps ; le moral, ami ou ennemi → Meneur ; se soigner soi-même → Tank Auto-soigneur ; voir par la magie (le
corbeau) → Éclaireur magique ; arrêter les charges → Tank Gardien de ligne (armes d'hast : toutes les armes de tir
contre-chargent, ce n'est pas une spécialité). Ressusciteur, Source de mana, Anti-mage, Garde du corps, Stratège,
Summoner de support et DPS magiques dans la durée attendent que le jeu les permette : ils ne sont jamais notés.

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

Sur 4 000 recrues : 50 % de Chair à canon, 33 % un titre, 12 % deux, 5 % trois ; un titre sur trois est précisé
(surtout Tank et Meneur : leurs sous-catégories varient indépendamment ; celles des DPS viennent de la même arme et se
détachent rarement chez les recrues).

## 5 — Les titres écrits (à venir)

Un titre drôle et simple par rôle (catégorie générique et chaque sous-catégorie) et par palier : **4–5★** (bronze),
**6–8★** (argent 1 à 3), **9–10★** (argent 4–5), **11–14★** (or 1 à 4), **15★** (pour la gloire) ; environ 265 titres,
au masculin et au féminin.

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
- `prototype-web/ui.js` (`renderEvaluation`) ; test : `tests/mercenary-profile.test.js`.
