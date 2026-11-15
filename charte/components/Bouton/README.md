# Bouton

Le bouton d'Idan : l'action qui fait avancer, centrée en bas du parchemin, avec « ‹ Retour » à sa gauche.

- Fournir : un `<button class="btn">` avec un libellé court (il s'affiche en capitales, style `bouton`, couleur `or-clair`) et, pour avancer, la flèche `<span class="fl">→</span>`. Taille fixe : `bouton-largeur` × `bouton-hauteur`, image `Interface/bouton.webp`, ombre `ombre-bouton`.
- États (120 ms) : survol plus lumineux ; appui, il descend de 2 px (`ombre-bouton-appui`) ; `disabled` tant que le choix manque (texte or clair à 42 %, image désaturée) ; focus, contour `or-clair`.
- « ‹ Retour » : `<button class="retour">`, style `lien-retour`, `encre-secondaire` souligné d'un `fil-centre` ; `encre` au survol. Absent du premier écran.
- À ne pas faire : déformer l'image du bouton, changer sa taille, l'écrire en minuscules, en mettre deux côte à côte.
