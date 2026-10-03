# Encerclement CAC V1

Code: combat.position.encirclement
Domaine: Combat
Expression: encircled = exists hostile A,B threatening target in melee such that contact_hex(A) and contact_hex(B) are not adjacent around target; if encircled: all hostile melee attackers currently threatening target gain backstab
Notes: Dès que deux assaillants occupent des positions de contact non adjacentes autour de la cible, tous les attaquants au CAC contre cette cible bénéficient de Frappe dans le dos. Deux assaillants sur des cases adjacentes ne suffisent pas.
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Autre

## Géométrie

Autour d'une cible standard occupant 1 hex, les six hexagones adjacents forment son cercle de contact.

La cible est **encerclée** dès qu'au moins deux ennemis au CAC occupent des cases de contact **non adjacentes entre elles**.

## Conséquence

Une fois l'encerclement établi, **tous les attaquants au CAC** contre cette cible bénéficient de Frappe dans le dos : deux, trois ou six assaillants.

Deux ennemis côte à côte sur deux cases adjacentes ne suffisent pas à encercler.