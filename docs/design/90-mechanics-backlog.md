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

**Sorts bi-école** (Idan, 2026-11-06 : « on pourra peut-être ajouter des sorts bi-école plus tard », « sort très puissant mais
basé sur le min des deux écoles ! ») : un sort qui demande deux écoles (par exemple Nécromancie et Illusion pour le vampire),
nettement plus puissant qu'un sort d'une seule école, mais dont le niveau d'école retenu (incantation, effet, Maîtrise) est le
plus faible des deux. À chiffrer et à cataloguer.

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

Fait (doc 04, « Créatures sur plusieurs cases », 2026-11-06) : tailles normale, longue (2 cases), grande (3) et énorme (7), empreinte, distance, déplacement, Toucher. Fait (doc 04, « Combat à cheval », 2026-11-07) : le cavalier ennemi sur son destrier (Cavalier des voleurs). Fait (doc 11 §8, 2026-11-07) : la capture des montures, la Grange du dresseur et les Écuries ; la licorne, le marché des montures (doc 18 §12 bis), la proposition à un mercenaire ; le Dresseur et l'apprivoisement. Fait (doc 04, 2026-11-07) : nos mercenaires à cheval, le cheval seul joué comme un mercenaire. Fait aussi : le cheval monté qui attaque juste après son cavalier (déplacement commun), la Création de double de la licorne, la fin de mission de nos montures comme un mercenaire. Reste : le mana de la licorne gardé d'un combat à l'autre, la fiche de la monture qui évolue (XP), la capture des licornes, Pégase, un dragon dompté, la charge d'une grande créature, et les bêtes de la mission « Éliminer la bête ! ».

## Ennemis : force aux hauts niveaux de mission

Idan, 2026-11-06 : « Tu prends les centiles, pas le niveau qu'auront les mercenaires 12 ou 15 étoiles d'une compagnie. […] on a le temps si on veut renforcer. » Les fiches ennemies (`enemy-archetypes.json`) suivent les centiles des personnages **tout juste générés** (novice P20, normal P50, vétéran P75, élite P90 ; chefs P75 à P99), et leurs points sont mesurés contre des mercenaires générés (doc 17 §14). Une compagnie à 12 ou 15 étoiles aura des mercenaires progressés (XP, compétences, équipement T3–T4) : aux niveaux d'Or, élites et chefs 3–4 seront trop faibles un à un ; seul le budget du camp (niveau² × 8–12) compense, par le nombre. Piste : mesurer les mercenaires réels à 5, 10 et 15 étoiles (campagne simulée), y caler vétérans, élites et chefs, puis remesurer les points contre eux. Idan : « il faudra une logique d'équilibrage. Par défaut, pour équilibrer il faut un point de repère ! » : définir d'abord ce repère (le mercenaire type de chaque palier d'étoiles), puis équilibrer tous les peuples dessus.
