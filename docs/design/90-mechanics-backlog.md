> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Mécaniques à intégrer ensuite

Cette page ne contient que les **chantiers encore ouverts**. Les règles validées pour mouvement, tir, charge, attaques d'opportunité, encerclement, Frappe dans le dos, boucliers physiques, moral, fuite, initiative interne et Toucher de zone sont désormais sorties du backlog et intégrées au Combat V1.

## Décor, ligne de vue & terrain futur

Fait (Idan, 2026-11-06, doc 04 « Décor ») : trois réglages par décor, passage (normal, ½, ⅓, ¼, infranchissable), vue
(laisse voir, bloque) et couverture (sans, partielle × 0,5, totale × 0,25) ; la charge à travers un décor lent. Fait
aussi (doc 04 « Altitude ») : une hauteur de 0 à 3 par case (montée +1, falaises, Toucher ±10 par niveau, vue, couverture
vue d'en haut, charge).

Restent pour plus tard :

- cartes à étages façon Mordheim / X-Com (passerelles, échelles, toits) ;
- décor des autres missions à venir (l'enceinte des camps de contrat est faite : doc 04, « Décor ») ;
- couverture destructible ;
- géométrie du **couloir de tir** utilisé par l'approximation (un tir raté qui finit dans le décor) ;
- murs, portes, mobilier, cordes, leviers et interactions de décor.

## Détection, camouflage & attaques non détectées

[Frappe dans le dos V1](/design/#doc=formulas/frappe-dans-le-dos-v1.md) sait déjà traiter une attaque **non détectée**. Fait (Idan, 2026-10-28, doc 04 « Discrétion et camouflage ») : camouflage au début du combat, test de repérage (Perception, Discrétion, distance, couverture), repéré pour toute la partie, attaques depuis le camouflage. Il reste à définir :

- le brouillard de guerre (cacher les ennemis camouflés sur la carte) ;
- le décor et ses couvertures ;
- rôle éventuel de l'Intelligence ;
- compétences et sorts qui créent explicitement une attaque non détectée.

## Actions rapides — catalogue à compléter

Principe : une Action rapide sert surtout à **préparer, manipuler, communiquer ou modifier** une action ; elle ne doit normalement pas devenir une seconde Attaque complète.

Déjà réglé :

- [Permutation de set d'armes V1](/design/#doc=formulas/permutation-de-set-d-armes-v1.md) : changer de set d'armes ;
- [Armes à feu — recharge et double pistolet V1](/design/#doc=formulas/armes-a-feu-recharge-et-double-pistolet-v1.md) : recharger une arme à feu.

À formaliser plus tard : boire / donner une potion, poison, dégainer / ranger / lâcher, changement de prise `Au choix`, consommables spéciaux, posture / garde, encouragement / intimidation / provocation, ordres, petites interactions et certains sorts rapides.

**Viser** est volontairement sorti du backlog prioritaire et rangé dans [Boîte à idées — Combat](/design/#doc=91-combat-ideas.md).

## Tir — réglages encore ouverts

- géométrie du couloir d'approximation ;
- munitions spéciales ;
- exceptions éventuelles de cadence par arme ;

Le bouclier contre les projectiles physiques est désormais réglé par [Blocage bouclier physique V1](/design/#doc=formulas/blocage-bouclier-physique-v1.md).

## Charge — réglages futurs

Les `Bonus charge base` sont renseignés : **1** par défaut, **2** pour les armes d'hast et les armes `2 mains`. La contre-charge à distance se déclenche à **mi-course**.

Restent pour plus tard :

- terrain modifiant le risque de chute ;
- futures montures / vitesses extrêmes ;
- convention de case médiane sur une charge de distance impaire.

## Attaques de zone — à reprendre avec la magie

Le Toucher de base est fixé par [Précision d'attaque de zone V1](/design/#doc=formulas/precision-d-attaque-de-zone-v1.md) : `−10 points` par hex d'écart à la case ciblée.

La forme, le rayon, les obstacles, le friendly fire et les zones persistantes seront définis **avec les premiers sorts de zone**. Le Tromblon sera ensuite adapté au même moteur générique.

## En Fuite — équilibrage restant

La reprise de contrôle et les trois comportements automatiques sont définis. Si **Cachons-nous** ne trouve aucun abri total valide, le personnage continue sa fuite vers une **sortie de carte**, en s'éloignant des ennemis.

Il reste seulement à playtester le bonus de récupération `+10 par tour` et la létalité de l'enchaînement **sous-nombre → blessure → Fuite → attaques d'opportunité + Frappe dans le dos**.

## Magie — moteur à chiffrer

Les principes d'apprentissage, incantation et le premier catalogue sont regroupés dans [Magie — apprentissage, incantation & premier catalogue](/design/#doc=12-magic.md).

À construire :

1. formule d'apprentissage au camp ;
2. coût en mana ;
3. formule d'incantation école + Intelligence vs difficulté du sort ;
4. scaling via Puissance magique ;
5. résistances élémentaires ;
6. dégâts / soins / durée / buffs ;
7. critiques / échecs critiques éventuels ;
8. terrain, invocation et zones magiques.

## Progression & fin de mission — désormais partiellement formalisées

La progression sans niveaux globaux est désormais documentée dans [Progression & expérience](/design/#doc=08-progression-and-experience.md).

La résolution post-mission, le temps stratégique, la mort, les blessures et la fatigue sont documentés dans [Fin de mission, temps & indisponibilités](/design/#doc=10-mission-time-and-unavailability.md).

Restent encore à formaliser ici ou dans des pages dédiées :

- conditions exactes de victoire / défaite / abandon ;
- extraction / fuite / personnages laissés sur place ;
- objectifs secondaires et conséquences de scénario ;
- règles détaillées de retour lorsque des événements spéciaux modifient le trajet.

## Fatigue, stress & blessures persistantes

Le **déclenchement post-mission** de la fatigue et des blessures est désormais posé dans [Fin de mission, temps & indisponibilités](/design/#doc=10-mission-time-and-unavailability.md).

Restent ouverts :

- effets chiffrés de Fatigue sur Vitesse, initiative, Toucher, Esquive, mouvement, etc. ;
- Stress ;
- séquelles permanentes ;
- interactions avec moral et équipement.

La formule d'initiative V1 reste volontairement **sans Fatigue** pour l'instant.

## Scénarios & ordre des équipes

[Initiative interne d'équipe V1](/design/#doc=formulas/initiative-interne-d-equipe-v1.md) ordonne les personnages à l'intérieur d'une équipe. Le **scénario** déterminera quelle équipe commence et les éventuelles règles spéciales de déploiement / embuscade.

## Occupation de plusieurs hexagones & montures

La grille V1 considère `1 personnage = 1 hex`. Les Ogres, Dragons, grandes montures et autres créatures multi-hex devront disposer plus tard d'une empreinte, de règles de rotation, de portée et de déplacement adaptées.