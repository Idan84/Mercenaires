# Mécaniques à intégrer ensuite

Cette page ne contient que les **chantiers encore ouverts**. Les règles validées pour mouvement, tir, charge, attaques d'opportunité, encerclement, Frappe dans le dos, boucliers physiques, moral, fuite, initiative interne et Toucher de zone sont désormais sorties du backlog et intégrées au Combat V1.

## Décor, ligne de vue & terrain futur

Principe V1 retenu pour la couverture : **le décor porte explicitement son type de couverture**. Un élément peut fournir aucune couverture, une couverture partielle (`×0,5`), forte / quasi-totale (`×0,25`) ou bloquer totalement la ligne de vue (tir impossible).

Restent pour plus tard :

- types de terrain et coûts / effets de déplacement ;
- hauteur et différences de niveau ;
- couverture destructible ;
- géométrie du **couloir de tir** utilisé par l'approximation ;
- effets du terrain sur la charge et son risque de chute ;
- murs, portes, mobilier, cordes, leviers et interactions de décor.

## Détection, camouflage & attaques non détectées

[Frappe dans le dos V1](../05%20%E2%80%94%20R%C3%A9f%C3%A9rentiels%20techniques/Formules%20de%20jeu/Frappe%20dans%20le%20dos%20V1%203ecc799da3d1819ba68cc80196e7861e.md) sait déjà traiter une attaque **non détectée**. Il reste à définir :

- tests / seuils de détection ;
- camouflage, invisibilité et dissimulation ;
- rôle de Perception / Intelligence ;
- perte et reprise de détection ;
- compétences et sorts qui créent explicitement une attaque non détectée.

## Actions rapides — catalogue à compléter

Principe : une Action rapide sert surtout à **préparer, manipuler, communiquer ou modifier** une action ; elle ne doit normalement pas devenir une seconde Attaque complète.

Déjà réglé :

- [Permutation de set d'armes V1](../05%20%E2%80%94%20R%C3%A9f%C3%A9rentiels%20techniques/Formules%20de%20jeu/Permutation%20de%20set%20d'armes%20V1%203ecc799da3d1817dbe21fd70f8711f59.md) : changer de set d'armes ;
- [Armes à feu — recharge et double pistolet V1](../05%20%E2%80%94%20R%C3%A9f%C3%A9rentiels%20techniques/Formules%20de%20jeu/Armes%20%C3%A0%20feu%20%E2%80%94%20recharge%20et%20double%20pistolet%20V1%203ebc799da3d181f1aa6be53eb35e371e.md) : recharger une arme à feu.

À formaliser plus tard : boire / donner une potion, poison, dégainer / ranger / lâcher, changement de prise `Au choix`, consommables spéciaux, posture / garde, encouragement / intimidation / provocation, ordres, petites interactions et certains sorts rapides.

**Viser** est volontairement sorti du backlog prioritaire et rangé dans [Boîte à idées — Combat](Bo%C3%AEte%20%C3%A0%20id%C3%A9es%20%E2%80%94%20Combat%203ecc799da3d181c3a45ed60fccf36ebf.md).

## Tir — réglages encore ouverts

- géométrie du couloir d'approximation ;
- munitions spéciales ;
- exceptions éventuelles de cadence par arme ;

Le bouclier contre les projectiles physiques est désormais réglé par [Blocage bouclier physique V1](../05%20%E2%80%94%20R%C3%A9f%C3%A9rentiels%20techniques/Formules%20de%20jeu/Blocage%20bouclier%20physique%20V1%203ebc799da3d18126b594dcad23bb1b17.md).

## Charge — réglages futurs

Les `Bonus charge base` sont renseignés : **1** par défaut, **2** pour les armes d'hast et les armes `2 mains`. La contre-charge à distance se déclenche à **mi-course**.

Restent pour plus tard :

- terrain modifiant le risque de chute ;
- futures montures / vitesses extrêmes ;
- convention de case médiane sur une charge de distance impaire.

## Attaques de zone — à reprendre avec la magie

Le Toucher de base est fixé par [Précision d'attaque de zone V1](../05%20%E2%80%94%20R%C3%A9f%C3%A9rentiels%20techniques/Formules%20de%20jeu/Pr%C3%A9cision%20d'attaque%20de%20zone%20V1%203ecc799da3d181828c34f857d4be7366.md) : `−10 points` par hex d'écart à la case ciblée.

La forme, le rayon, les obstacles, le friendly fire et les zones persistantes seront définis **avec les premiers sorts de zone**. Le Tromblon sera ensuite adapté au même moteur générique.

## En Fuite — équilibrage restant

La reprise de contrôle et les trois comportements automatiques sont définis. Si **Cachons-nous** ne trouve aucun abri total valide, le personnage continue sa fuite vers une **sortie de carte**, en s'éloignant des ennemis.

Il reste seulement à playtester le bonus de récupération `+10 par tour` et la létalité de l'enchaînement **sous-nombre → blessure → Fuite → attaques d'opportunité + Frappe dans le dos**.

## Magie — moteur à chiffrer

Les principes d'apprentissage, incantation et le premier catalogue sont regroupés dans [Magie — apprentissage, incantation & premier catalogue](../02%20%E2%80%94%20Personnage%20&%20comp%C3%A9tences/Magie%20%E2%80%94%20apprentissage,%20incantation%20&%20premier%20catal%203ecc799da3d18183b4a9e6b17170afdf.md).

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

La progression sans niveaux globaux est désormais documentée dans [Progression & expérience](../02%20%E2%80%94%20Personnage%20&%20comp%C3%A9tences/Progression%20&%20exp%C3%A9rience%203ecc799da3d1815fbc4cef440b53d83b.md).

La résolution post-mission, le temps stratégique, la mort, les blessures et la fatigue sont documentés dans [Fin de mission, temps & indisponibilités](Fin%20de%20mission,%20temps%20&%20indisponibilit%C3%A9s%203edc799da3d181b593b4d808c233d592.md).

Restent encore à formaliser ici ou dans des pages dédiées :

- conditions exactes de victoire / défaite / abandon ;
- extraction / fuite / personnages laissés sur place ;
- objectifs secondaires et conséquences de scénario ;
- règles détaillées de retour lorsque des événements spéciaux modifient le trajet.

## Fatigue, stress & blessures persistantes

Le **déclenchement post-mission** de la fatigue et des blessures est désormais posé dans [Fin de mission, temps & indisponibilités](Fin%20de%20mission,%20temps%20&%20indisponibilit%C3%A9s%203edc799da3d181b593b4d808c233d592.md).

Restent ouverts :

- effets chiffrés de Fatigue sur Vitesse, initiative, Toucher, Esquive, mouvement, etc. ;
- Stress ;
- séquelles permanentes ;
- interactions avec moral et équipement.

La formule d'initiative V1 reste volontairement **sans Fatigue** pour l'instant.

## Scénarios & ordre des équipes

[Initiative interne d'équipe V1](../05%20%E2%80%94%20R%C3%A9f%C3%A9rentiels%20techniques/Formules%20de%20jeu/Initiative%20interne%20d'%C3%A9quipe%20V1%203ecc799da3d181bc98a5edf2469614ac.md) ordonne les personnages à l'intérieur d'une équipe. Le **scénario** déterminera quelle équipe commence et les éventuelles règles spéciales de déploiement / embuscade.

## Occupation de plusieurs hexagones & montures

La grille V1 considère `1 personnage = 1 hex`. Les Ogres, Dragons, grandes montures et autres créatures multi-hex devront disposer plus tard d'une empreinte, de règles de rotation, de portée et de déplacement adaptées.