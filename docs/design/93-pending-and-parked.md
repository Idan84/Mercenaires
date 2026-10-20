# En attente et mis de côté

Page de suivi pour Idan, tenue par JC3 et relue par Chatty. Elle rassemble ce qui attend une décision, ce qu'on a volontairement reporté et ce qu'il faut surveiller en jouant.

À chaque décision d'Idan, la règle part dans son document et la ligne quitte cette page. Les décisions récentes sont dans `docs/TEAM.md`.

**Dernière mise à jour : 2026-10-20.**

## 1 — Attend ta décision

Rien de ce bloc n'est codé : JC3 attend ton choix avant d'y toucher.

- **Affinité — matrice des peuples** : la saisie de Chatty correspond-elle à ta capture ? → [doc 02, fin de page](/design/#doc=02-generation-and-identity.md)
- **Renommée — effets** : comment pèse-t-elle sur la qualité des recrues, les missions proposées, les marchands et les places de Taverne ? → [doc 09 §2](/design/#doc=09-reputation-renown-and-salaries.md), [doc 14](/design/#doc=14-tavern-recruitment.md)
- **Affinité — effets** : quels coefficients sur les négociations (recrutement, équipement, autres) ? → [doc 02](/design/#doc=02-generation-and-identity.md)
- **Attaques de zone** : forme et rayon du Tromblon et des sorts de zone. → [doc 04](/design/#doc=04-combat.md)
- **Camp V1** : arbre des bâtiments et prérequis ; les prix viendront avec le calibrage de l'économie. → [issue #23](https://github.com/Idan84/Mercenaires/issues/23), [doc 11](/design/#doc=11-camp-and-ruined-castle.md)
- **Taverne — consommations** : quels effets positifs ? → [issue #87](https://github.com/Idan84/Mercenaires/issues/87)
- **Sorts — catalogue V0 de Chatty** : à accepter ou corriger avant d'être fusionné. → [PR #32](https://github.com/Idan84/Mercenaires/pull/32), [doc 12](/design/#doc=12-magic.md)
- **Combat interrompu** : recharger la page en plein combat revient à l'état d'avant le combat. Avec les vraies missions : retraite, défaite ou combat sauvegardé ?
- **Trésor négatif** : l'or peut passer sous 0 sans conséquence. Dette, impayés, départs ?
- **Type de dégâts, cas « moyen »** : la formule dit `AVERAGE(matchups)` ; le moteur choisit le type le plus proche de cette moyenne. Moyenne numérique ou type le plus proche ?
- **Lieutenant** : effets du grade. → [doc 01](/design/#doc=01-start-and-generation-functions.md)
- **Loyauté** : formules de loyauté, de départ et d'attractivité. → [doc 09](/design/#doc=09-reputation-renown-and-salaries.md)

## 2 — Reporté volontairement

On en a parlé, et on a choisi d'attendre.

- **Ennemis typés** (Idan, 2026-10-20).
- **Réputation de départ recalculée quand les caractéristiques progressent** (doc 09 §1) : passée après la renommée.
- **Changement d'équipement négocié avec le mercenaire**, dont le bouclier ou la seconde arme (Idan, 2026-10-08).
- **Caractéristiques générées au-delà de 100** : on n'y touche pas pour l'instant (Idan, 2026-10-20).
- **Soins jouables** (Constitution), **magie en combat** et autres compétences.
- **Affinité acquise en jeu** (phase 2).
- **Renommée** : points de missions et développement du camp, quand ces systèmes existeront.
- **Séquelles permanentes** des blessures ([doc 10](/design/#doc=10-mission-time-and-unavailability.md)).
- **Bios évolutives** : une ligne ajoutée après un exploit, une blessure, une trahison ([doc 15](/design/#doc=15-biographies-and-narrative-tags.md)).
- **Prime de risque** selon le danger de la mission ([doc 14](/design/#doc=14-tavern-recruitment.md)).
- **Vol** ([doc 03](/design/#doc=03-character-and-skills.md)), **siège du château** ([doc 11](/design/#doc=11-camp-and-ruined-castle.md)).
- **Terrain, hauteur, détection, camouflage, actions rapides** ([doc 90](/design/#doc=90-mechanics-backlog.md)).
- **Équilibrage** en général : reporté par Idan le 2026-10-03 (section 3).

## 3 — À surveiller en jouant

Des chiffres mesurés, rien n'est décidé. Le détail est dans le [doc 92](/design/#doc=92-balance-questions.md).

- **XP** : la Volonté monte vite (environ 35 XP par mission), la Dextérité lentement.
- **Réputation** : +20 par retour indemne ; une réputation moyenne (137) double en sept missions environ.
- **Courage** : 41 % des tests échouent (E1).
- **Fuite** : les fuyards sortent de la carte dans 71 % des combats (E2).
- **Mort sous 0 PV** : 76 % des mercenaires tombés meurent (E7).

## 4 — Ménage technique

Rien à décider : c'est pour l'équipe.

- **Netlify** : supprimer le projet (Chatty, [issue #64](https://github.com/Idan84/Mercenaires/issues/64)), puis retirer `netlify.toml` (JC3).
- **Migration Hostinger** : faite, l'[issue #60](https://github.com/Idan84/Mercenaires/issues/60) est à fermer.
- **Sorts des 9 écoles** : catalogue en données (Chatty, [issue #28](https://github.com/Idan84/Mercenaires/issues/28)), après ta décision sur la PR #32.

## Voir aussi

- [Graphe des dépendances](/design/graph/) : qui influence quoi dans le jeu.
- `docs/TEAM.md` : décisions récentes, datées.
