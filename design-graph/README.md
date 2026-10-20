# Design Graph — prototype de cartographie des dépendances

Ouvrir `design-graph/index.html` dans un navigateur. Aucun build, CDN ou serveur requis.

## Périmètre
- 60+ nœuds : identité, caractéristiques, compétences, combat, équipement, progression, réputation, affinité, économie, recrutement, missions et camp.
- Explorer conséquences et causes (1, 2, 3 niveaux ou graphe complet), rechercher un nœud, filtrer par statut, zoomer et déplacer.
- Largeur des liens : **force qualitative estimée** (faible, moyenne, forte), pas une mesure de sensibilité mathématique.
- Couleurs : **codé**, **validé mais non intégré**, **idée**.
- Chaque lien contient une référence de module ou de document et parfois une explication.

## Limites importantes
Ce graphe est une **cartographie manuelle initiale**. Il n'analyse pas automatiquement les fonctions JS, ne mesure pas les variations chiffrées et n'injecte aucune modification dans les sauvegardes. Certains liens du moteur de combat restent à vérifier avec JC3. Le module d'affinité est sur la PR #114, pas encore dans `test`. Les effets de réputation de compagnie sur les marchands, missions et recrues ne sont pas codés. Les influences qualitatives ne doivent pas être prises pour des coefficients validés.

## Prochaines étapes
1. Revue JC3 sur les liens combat/XP/blessures ; revue Chatty sur UI et navigation.
2. Brancher une entrée **Design Labs** dans l'interface du jeu après identification du routeur/menu actuel.
3. Construire un registre de dépendances co-localisé avec les fonctions et constantes pour éviter la dérive.
4. Ajouter le mode simulation avant/après en appelant les véritables fonctions pures du moteur et en affichant des deltas chiffrés.
5. Tester la carte contre les formules et la mettre à jour à chaque PR de gameplay.

Ne pas exposer les coefficients des systèmes futurs comme s'ils étaient déjà implémentés.
