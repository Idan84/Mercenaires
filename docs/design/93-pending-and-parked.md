# En attente et mis de côté

Ce qui attend une décision d'Idan, ce qu'on a reporté et ce qu'il faut surveiller en jouant. À chaque décision, la règle
part dans son document et la ligne quitte cette page.

**Dernière mise à jour : 2026-11-18.**

## 0 — Feuille de route (Idan, 2026-11-06)

Les gros chantiers à venir, dans l'ordre d'Idan.

1. **Interface et images** : des menus ouvrables en cliquant partout, une vraie carte interactive du château.
2. **Refonte de l'interface des missions.**
3. **Nombreuses nouvelles missions variées**, avec les pièges en combat et de nouveaux **ennemis** (ennemis typés,
   monstres de niveau 5, factions ; docs 07 et 17).
4. **Fabrication d'objets** (craft).
5. **Cristaux de magie** (forge magique), et les tiers au-delà du T4 (au moins jusqu'au T6 ;
   [doc 05](/design/#doc=05-equipment.md)).
6. **Sorts multi-écoles** : 49 idées gardées ; à décider : la maîtrise (moyenne ou somme des deux écoles),
   l'apprentissage, l'Élémentaire ([doc 12](/design/#doc=12-magic.md)).
7. **Apprendre une arme précise.**
8. **Salles spéciales et bâtiments complémentaires** (le Ring).
9. **Fatigue** après une corvée ou un apprentissage.
10. **Amourettes du capitaine.**
11. **Montures et animaux** : un dragon, les Ogres sur plusieurs cases, le « Lancier chargeur » des titres
    ([doc 90](/design/#doc=90-mechanics-backlog.md)).
12. **Économie** : recaler l'or de départ et les revenus.
13. **Onglet Conseils** (Idan : « super important ») : l'intendant façon adjoint de Football Manager, avec des erreurs
    volontaires ([doc 19](/design/#doc=19-mercenary-profile.md)).
14. **Traumatismes physiques et psychologiques après une mission** (Idan, 2026-11-06) ; ils reprennent les séquelles
    permanentes des blessures ([doc 10](/design/#doc=10-mission-time-and-unavailability.md)). Exemple d'Idan
    (2026-11-16) : blessé par des gobelins, il peut garder le trait « Phobie des gobelins », −30 en Courage face aux
    gobelins. La fiche leur réserve déjà une place.
15. **Marchands** : leurs portraits et la négociation du capitaine ([doc 18](/design/#doc=18-merchants.md)).
16. **Rompre le contrat d'un mercenaire** (Idan, 2026-11-16) : plusieurs moyens, aux conséquences diverses, dont le
    licenciement définitif, la nuit, pendant son sommeil (« C'est ce qu'on appelle être un vrai cost killer ! »). Ni les
    moyens ni leurs conséquences ne sont définis. Aujourd'hui, on ne peut pas renvoyer un mercenaire.
17. **Refonte de « Mes mercenaires »** (Idan, 2026-11-16) : filtres et tri. Pas de score de combat global (écarté le
    2026-10-31, [doc 19](/design/#doc=19-mercenary-profile.md)) ; piste de JC3 : trier par rôle avec les étoiles cachées
    du titre, sans les afficher.
18. **Après les cases carrées** ([doc 04](/design/#doc=04-combat.md), « Passage aux cases carrées ») : la vue
    isométrique, puis le brouillard de guerre et la découverte des adversaires à la X-COM (notes de « Repérage »).

## 1 — Attend ta décision

- **Affinité — matrice des peuples** : la saisie de Chatty correspond-elle à ta capture ? →
  [doc 02, fin de page](/design/#doc=02-generation-and-identity.md)
- **Tromblon** : forme et rayon de sa zone. → [doc 04](/design/#doc=04-combat.md)
- **Camp V1** : arbre des bâtiments et prérequis ; les prix viendront avec le calibrage de l'économie. →
  [issue #23](https://github.com/Idan84/Mercenaires/issues/23), [doc 11](/design/#doc=11-camp-and-ruined-castle.md)
- **Taverne — consommations** : quels effets positifs ? → [issue #87](https://github.com/Idan84/Mercenaires/issues/87)
- **Combat interrompu** : recharger la page en plein combat revient à l'état d'avant. Avec les vraies missions :
  retraite, défaite ou combat sauvegardé ?
- **Type de dégâts, cas « moyen »** : la formule dit `AVERAGE(matchups)` ; le moteur choisit le type le plus proche de
  cette moyenne. Moyenne numérique ou type le plus proche ?
- **Missions one shot** : les points à trancher ([doc 17 §6](/design/#doc=17-one-shot-missions.md)).
- **Loyauté** : formules de loyauté, de départ et d'attractivité. → [doc 09](/design/#doc=09-reputation-renown-and-salaries.md)
- **Propositions du 2026-11-08** (après la partie n°5 de 365 jours) :
  - **Progression au combat** : XP de victoire partagée (points du camp ÷ taille de l'escouade) ; entraînement fiable
    (affecter un mercenaire à une salle sans tirage, facteur Intelligence adouci, fatigués à mi-gain) ; moins de fatigue
    après une mission sans dégâts.
  - **Niveau des missions** : tableau en trois tiers (facile / à sa mesure / ambitieux), ou niveau selon la force réelle
    de la compagnie ; l'héritage des morts ne compterait plus dans la renommée.
  - **Gardes du corps de haut rang** : 300 à 800 PO par personne et par jour, sans risque, à 5★–7★ (28 600 PO pour
    2 personnes et 19 jours) ; elles dominent l'économie à partir du jour 250.

## 2 — Reporté volontairement

- **Ennemis typés** (Idan, 2026-10-20).
- **« Utiliser ma partie en cours »** dans le simulateur du graphe, sans fichier de sauvegarde (Idan, 2026-10-20).
- **Caractéristiques générées au-delà de 100** : on n'y touche pas (Idan, 2026-10-20).
- **Affinité acquise en jeu** (phase 2, doc 02).
- **Renommée** : conversion des points de missions et du développement du camp (doc 09 §8).
- **Bios évolutives** : une ligne ajoutée après un exploit, une blessure, une trahison
  ([doc 15](/design/#doc=15-biographies-and-narrative-tags.md)).
- **Prime de risque** selon le danger de la mission ([doc 14](/design/#doc=14-tavern-recruitment.md)).
- **Siège du château** ([doc 11](/design/#doc=11-camp-and-ruined-castle.md)).
- **Équilibrage** en général (Idan, 2026-10-03 ; section 3).
- **Passe sur le texte de l'interface** : retirer tout ce qui est évident, pour l'immersion (Idan, 2026-10-30 : « on va
  virer du texte un peu partout »).

## 3 — À surveiller en jouant

Des chiffres mesurés, rien n'est décidé ([doc 92](/design/#doc=92-balance-questions.md)).

- **XP** : la Volonté monte vite (environ 35 XP par mission), la Dextérité lentement.
- **Courage** : 41 % des tests échouent (E1).
- **Fuite** : les fuyards sortent de la carte dans 71 % des combats (E2).
- **Étoiles** : l'échelle (réputation 93 → 18 100, × 1,5 par niveau, renommée × 4) reste à éprouver ; 5 étoiles d'or
  doit rester rare ([doc 09](/design/#doc=09-reputation-renown-and-salaries.md)).
- **Partie n°3** (2026-11-08) :
  - un mercenaire qui panique fuit, puis meurt souvent d'une attaque d'opportunité ; en fuite, il ne boit jamais sa
    potion de soins ;
  - accessoires : 13 emplacements par mercenaire (6 anneaux), mais peu d'objets trouvés ; au jour 40, la capitaine porte
    les 13, la plupart des autres 0 à 3 ;
  - le nom d'un objet ne dit pas toujours sa famille (« Lanière de charretier » est un fouet).

## 4 — Ménage technique

- **Netlify** : supprimer le projet `mercenaires-s708` ([issue #64](https://github.com/Idan84/Mercenaires/issues/64)).
- **Hostinger** : migration faite, fermer l'[issue #60](https://github.com/Idan84/Mercenaires/issues/60).

## Voir aussi

[Graphe des dépendances](/design/graph/) : qui influence quoi dans le jeu.
