# Cadre doré

Le cadre doré du bouton d'Idan, repris partout où il faut un fin contour d'or (Idan, 2026-11-25 : « tu le fais pour le contour des avatars ? ») : une moulure d'or usée, aux coins coupés, éclairée comme le reste de la vue.

- Images (groupe Cadre doré, tirées de `Interface/bouton.webp` en attendant les PNG qu'Idan prépare) : `cadre-or.webp` (le cadre seul, intérieur transparent), `velours-brun.webp` (le velours du bouton passé du rouge au brun), `barre-defilement-haut|milieu|bas.webp` (le bouton tourné à la verticale, velours brun).
- Vignette (portrait de la boîte de dialogue, 120 × 120) : `cadre-or.webp` en `border-image` (tranche 45, bord 12 px, coins jamais déformés) ; le portrait taillé aux mêmes coins coupés (12 px) ; sans portrait, les initiales (Cinzel, `or-clair`) sur `velours-brun.webp`. L'ombre suit la forme (filtre `drop-shadow`), dans le sens de la lumière de la vue.
- Barre de défilement : le haut et le bas aux coins coupés, le milieu (suivi de son reflet) répété un nombre entier de fois (`round`) pour retomber juste sur les deux bouts ; par-dessus, les flèches dorées (les pyramides du kit), le creusé et le curseur.
- Curseur : une tige taillée dans la barre du kit doré, entre deux embouts en pointe (`curseur-defilement-haut|milieu|bas.webp`, dans `assets/creation/`). La barre est étirée à l'épaisseur des embouts et sa lumière recalée ligne par ligne sur la leur ; la coupe des embouts est fondue sur la tige. Un raccord sur métal se vérifie à gauche, à droite et au centre : l'ombrage doit continuer (Idan, 2026-11-25).
- À ne pas faire : redessiner le cadre en CSS (dégradés, traits), le recolorer, déformer ses coins.
