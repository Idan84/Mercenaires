# Design Graph — laboratoire d'influences

**Page canonique :** `prototype-web/design/graph/index.html`, accessible depuis le Design Lab via `/design/graph/` après déploiement. L'ancienne copie à la racine a été supprimée pour éviter les divergences.

## Fonctionnalités

- Carte interactive des dépendances orientées : caractéristiques, identités, compétences, équipement, combat, blessures, fatigue, moral, progression, réputation, héritage, affinité, recrutement, salaires, contrats, missions et trésorerie.
- Navigation dans les deux sens, recherche, niveaux d'exploration, filtrage **codé / validé non branché / simple idée**, zoom et déplacement.
- Flèches à épaisseur **qualitative** dans la vue normale, avec provenance par module / documentation.
- Dans le simulateur, les nœuds modifiés sont mis en évidence ; les flèches directement reliées à la variable testée reçoivent une épaisseur proportionnelle à la **variation relative observée dans ce scénario**. Cela n'est **pas** un coefficient universel de sensibilité.
- Simulation **avant / après** : choisir un domaine, un paramètre et sa nouvelle valeur ; comparer les sorties modifiées ou toutes les sorties.
- Quatre domaines pris en charge par l'adaptateur pur `simulation-core.js` : **économie/recrutement**, **combat**, **progression de mission**, **affinité**.
- Import local facultatif d'une sauvegarde JSON de Blood & Wages (format `mercenaires-save`) : calcul de la réputation de compagnie avec **l'effectif complet**, le capitaine et l'héritage historique ; préremplissage des paramètres du candidat à la taverne.

## Sources réelles

`simulation-core.js` appelle les **fonctions du jeu** :

| Domaine | Fonctions |
| --- | --- |
| Économie | `MercenairesCampaign.createCampaignRules(...).companyRenown`, `MercenairesTavern.createTavernRules(...).missionBonusDemand`, `negotiationResistance`, `engagedElsewhereChance`, `makeOffer` |
| Combat | `MercenairesCombat.createCombatEngine(...).hitProbability`, `woundProbability`, `damageMatchups`, `criticalChance`, `initiative`, `movementBase`, `chainChance` |
| Progression | `MercenairesProgression.createProgressionRules(...).gains`, `apply`, `reputationGains` |
| Affinité | `MercenairesAffinity.createAffinityRules(...).affinity` |

Les données proviennent de `/data/*.json` au chargement, dont les constantes, armes, armures, alignements et matrice des peuples. Le calcul se fait dans le navigateur ; aucune écriture serveur ni mutation de la sauvegarde.

Le combat utilise un scénario statique (attaquant/défenseur) et les vraies armes du référentiel. Blesser est une **probabilité conditionnelle** après Toucher et utilise, dans cet écran, la meilleure composante physique de l'arme : ce n'est pas un combat complet avec les jets et choix aléatoires. La négociation fixe le RNG pour obtenir les probabilités calculées sans tirer de résultat aléatoire.

## Limites importantes

- La carte générale est encore un **inventaire de dépendances documenté manuellement**, pas une extraction automatique du code ; les scores d'intensité initiaux (1–3) sont qualitatifs.
- L'import de sauvegarde couvre actuellement la **réputation de compagnie** et les **paramètres de candidat**. Il ne reconstruit pas une bataille ou une progression complète à partir des personnages importés.
- Le salaire demandé du simulateur est un **paramètre du scénario** : changer la réputation ne recalcule pas automatiquement ce salaire. C'est conforme au fait que les nouveaux salaires ne sont pas encore recalculés dynamiquement dans la campagne.
- Le score d'affinité est calculé, mais **son effet futur sur les négociations n'est pas chiffré**. Les effets futurs sont distincts dans le graphe.
- Une cible hors de portée donne `Toucher : —`, pas une chance artificielle.
- Le mode XP applique les événements à une **copie** d'un personnage fictif avec caractéristiques uniformes, jamais au personnage sauvegardé.
- Le dossier `prototype-web/` appartient techniquement à JC3 ; la branche doit être relue et testée en navigateur avant fusion vers `test`. Rien n'est fusionné automatiquement dans `main`.

## Vérification et maintenance

Exécuter :

```bash
node tests/design-graph-simulation.test.js
node tests/design-graph-integrity.test.js
```

Les tests vérifient les comparaisons du moteur, l'import non destructif, l'identité des nœuds, les liens orphelins, les statuts et quelques invariants de design.

Quand une formule de gameplay change, vérifier et mettre à jour les dépendances et les scénarios dans la **même PR**. En cas de désaccord entre carte et code, **le code du moteur + les décisions validées font autorité** ; ne jamais modifier la mécanique pour « réparer » le graphe sans accord d'Idan.
