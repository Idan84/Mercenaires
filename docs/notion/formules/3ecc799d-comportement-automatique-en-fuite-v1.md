# Comportement automatique — En Fuite V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ecc799da3d1817eb862f3983cc06338?pvs=204
> Dernière édition Notion : 2026-10-01T19:23:12.945Z

## Échec du test de Courage : `1D3`
### 1 — Course effrénée
Le personnage consacre toute son activation à fuir.
$$
BudgetMouvement=2\times MouvementBase
$$
À chaque étape, il choisit une trajectoire qui **augmente autant que possible sa distance avec l'ennemi le plus proche**. S'il existe un chemin permettant de quitter la carte, la sortie devient prioritaire.
Le déplacement peut provoquer normalement des **attaques d'opportunité**.
### 2 — Cachons-nous
Le personnage cherche l'**abri total le plus proche situé dans la direction opposée à l'ennemi le plus proche**.
Il peut consacrer jusqu'à :
$$
2\times MouvementBase
$$
à ce déplacement.
Le chemin choisi ne doit **jamais entrer dans un hexagone adjacent à un ennemi**. S'il commence déjà au contact, le premier mouvement permettant de quitter la zone reste susceptible de provoquer une attaque d'opportunité.
S'il n'atteint pas l'abri pendant cette activation, il progresse vers lui jusqu'à épuisement de son budget de mouvement.
**S'il n'existe aucun abri total valide**, le comportement bascule vers une fuite vers la **sortie de carte** la plus logique / accessible, tout en cherchant à augmenter la distance avec les ennemis. Les attaques d'opportunité restent applicables.
### 3 — Feu à volonté
Le personnage cible l'**ennemi le plus proche**.
S'il dispose, dans son état actuel, d'au moins une attaque à distance légale contre cette cible, il tire **au maximum de ce que son équipement et sa cadence permettent** :
- arme répétable : utiliser la cadence normale jusqu'à arrêt de la chaîne ;
- deux pistolets chargés : un tir avec chacun ;
- arme à feu déchargée : elle ne tire pas automatiquement et n'est pas rechargée par ce comportement.
S'il ne peut effectuer aucun tir légal contre l'ennemi le plus proche, il **reste sur place**.
## Tour suivant
Si l'état **En Fuite** persiste, le même processus recommence au début du tour suivant : nouveau test de reprise de contrôle, puis nouveau `1D3` seulement en cas d'échec.
