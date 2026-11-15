# Parchemin

Le parchemin d'Idan : la surface de tout ce qu'on lit ou remplit, posée devant la scène.

- Fournir : un `<div class="parch">` avec, dans l'ordre, l'en-tête (`parch-head`, style `en-tete-parchemin`), le titre (`parch-title`, style `titre-parchemin`), un filet (`divider`), le contenu, la navigation (`parch-nav` : « ‹ Retour » et le bouton).
- Image `Interface/parchemin.webp` en `border-image` (bords de `parchemin-bord`, coins jamais déformés), ombre `ombre-parchemin`. Largeur `parchemin-largeur` pour le petit ; les grands font la largeur de la bande des étapes.
- Champs : `<label class="lbl">` (style `etiquette`) puis `<input class="champ">` (style `saisie`, `encre` sur un voile d'encre secondaire, souligné).
- Places réservées : chaque bloc a une hauteur fixe ; survoler ou choisir ne change aucune taille.
