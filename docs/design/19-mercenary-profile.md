# Évaluation d'un mercenaire

> Décisions d'Idan du 2026-10-31. Étape 1 codée : facettes, étoiles, points forts et faibles, gêne d'équipement, titre,
> au-dessus du portrait de la fiche ; Caractéristiques rangées par fonction, avec les protections de l'armure. À venir :
> l'onglet **Conseils** (l'intendant, façon adjoint de Football Manager, avec des erreurs volontaires ; fiabilité,
> rapport valeur / salaire).

## 1 — Ce que voit le joueur

Au-dessus du portrait 9:16 de la fiche, dans chaque onglet qui l'affiche :

- un **titre** qui dit à quoi sert le mercenaire, clair et sans jargon (« Destructeur de boîtes de conserve à distance »,
  « Médecin chef pour les masses », « Médecin d'élite pour les grands blessés ») ;
- ses **points forts** et ses **points faibles**, en étoiles de réputation (15 niveaux : bronze, argent, or) ;
- une **gêne d'équipement**, s'il y en a une (« Sorts d'attaque — gêné par son armure »).

Tout se recalcule avec l'équipement porté : une armure de plates sur un mage fait monter « Encaisser », baisser la
magie, et peut changer le titre.

On ne montre ni valeur de combat globale ni toutes les facettes (Idan : la réputation reste « trompeuse » ; le
joueur ne lit que ce qui ressort).

## 2 — Les facettes

Chacune est mesurée avec les formules du combat (`combat-engine.js`, `magic.js`) et l'équipement porté, contre un
**étalon** jamais montré : les caractéristiques médianes des recrues, une maîtrise de 35, en gambison (armure légère) ou
en armure de plates (armure lourde).

| Facette | Mesure |
|---|---|
| Au contact, contre une armure légère / lourde | dégâts attendus par tour (toucher × blesser × dégâts, les deux mains au combat à deux armes, enchaînements compris), meilleur des deux sets |
| Au tir, contre une armure légère / lourde | dégâts attendus par tour à mi-portée de l'arme, tirs enchaînés compris (arc, fronde, sarbacane), meilleur des deux sets |
| Sorts d'attaque, de zone, soins, soins de groupe | meilleur sort de la famille : réussite × effet moyen × mana (assez pour 3 lancers ?) |
| Sorts de soutien, invocations, contrôle | meilleur sort de la famille : réussite × mana × maîtrise du sort (durée, bonus, portée en dépendent) |
| Encaisser les coups / les flèches | PV / dégâts attendus par tour de l'étalon à l'épée / à l'arc |
| Moral | Courage + 0,25 × Volonté |
| Initiative, discrétion, repérage (secondaires) | initiative au combat, Discrétion, Perception |

Une facette d'attaque ne compte que s'il s'en sert (arme du genre, sort de la famille). Défense et moral comptent
toujours. Purge n'a pas de facette : elle ne sert que contre le poison et ne dit pas à quoi il sert.

## 3 — L'échelle : celle de la réputation

Idan : « la réputation doit être en gros au barycentre de nos résultats ». Pour chaque facette, les recrues se
répartissent dans les niveaux comme leur réputation (≈ 2 % au niveau 1, 31 % au 2, 53 % au 3, 13 % au 4, 1 % au 5) ;
au-delà de la meilleure recrue, chaque niveau demande × 1,25, comme la réputation. Les seuils sont fixes (mesurés une
fois, `data/reference/mercenary-profile.json`) : un mercenaire qui progresse, ou mieux équipé, monte vers l'argent et
l'or.

Vérification sur 4 000 recrues : la moyenne de ses facettes tombe en moyenne à 0,06 niveau de sa réputation, à un
niveau près pour 88 % d'entre elles.

## 4 — Ce qui ressort

- **Ce qu'il fait mène** (Idan, 2026-10-31 : un mage qui connaît un soin et un sort d'attaque doit le montrer ; un
  archer n'est pas un « pilier de la mêlée » ; jamais de titre sans étoile) : sa meilleure façon d'agir (arme, sorts),
  même dans sa moyenne, ouvre la liste et donne le titre. Un autre point fort (encaisser, moral…) ne la remplace que
  s'il la dépasse d'au moins deux niveaux ; elle le suit alors. À niveau égal, une arme ou un sort chiffré (dégâts,
  soins) passe devant un sort de soutien, de contrôle ou d'invocation, et l'arme du set 1 devant celle du set 2 ; sinon,
  la mieux placée dans son niveau. Ses autres façons d'agir à un niveau près suivent (l'archer qui
  soigne aussi montre ses soins), sauf si ce sont des points faibles.
- **Point fort** : au moins un demi-niveau au-dessus de sa moyenne (le barycentre des facettes qui comptent). Au plus 3
  lignes fortes en tout.
- **Point faible** : au moins un niveau en dessous, ou le niveau 1 ; **aucune arme de contact** en est un. Au plus 2.
- **Facettes secondaires** (initiative, discrétion, repérage) : seulement à deux niveaux de sa moyenne.
- **Groupes** : « Au contact », « Au tir », « Encaisser » fusionnent leurs deux facettes si elles ont au plus un niveau
  d'écart ; sinon les deux s'affichent.
- **Gêne d'équipement** : sans son armure, une facette d'attaque, de magie ou l'initiative gagnerait au moins un niveau
  et vaudrait au moins 1,5 fois plus.

## 5 — Le titre

- **Principal** : la première ligne forte (ce qu'il fait, le plus souvent). Au contact et au tir, le rapport de ses dégâts contre une armure lourde et
  contre une armure légère le nuance : au moins 1 (il garde ses dégâts face aux plates : marteau, masse, hache double,
  arquebuse, canon à main) → « Briseur d'armures », « Destructeur de boîtes de conserve à distance » ; au plus 0,5 (dague,
  sabre, fouet, sarbacane) → « Faucheur de piétaille », « Harceleur à distance ». Contact et encaisser → « Pilier de la
  mêlée ». « Homme de rang » ne reste que pour celui qui n'a rien à mesurer.
- **Complément** : son point fort suivant, d'une autre famille (« , dur au mal », « qui manie aussi la magie »,
  « , inébranlable »…) : un vrai point fort, ou la magie (« qui manie aussi la magie » est un fait).
- Les mots, au masculin et au féminin : `mercenary-profile.json` (`titres`), à corriger par Idan.

## 6 — Code et données

- `game-core/mercenary-profile.js` : mesures, niveaux, lecture, titre (`createProfileRules`, `evaluate`).
- `data/reference/mercenary-profile.json` : facettes, groupes, sélection, titres (à la main) ; étalon, seuils et mesure
  (par le script).
- `scripts/build-mercenary-profile.js` : étalonnage sur 4 000 recrues ; à relancer quand la génération, le combat ou les
  facettes changent.
- `prototype-web/ui.js` (`renderEvaluation`) ; test : `tests/mercenary-profile.test.js`.
