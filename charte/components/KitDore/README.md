# Kit doré

Le kit doré d'Idan (2026-11-25, `media/charte_graph.zip`) : l'univers global du jeu, commun à toutes les cultures. L'or (cadres, bordures, flèches, icônes) ne change jamais ; le velours, rouge par défaut, se teinte.

- Bouton : `<nom>-velours` dessous, `<nom>-cadre` dessus, en `border-image` (coins jamais déformés). Velours rouge par défaut ; brun par un filtre (`hue-rotate(35deg) saturate(.6) brightness(1.05)`) ; à la couleur d'une culture : le velours en niveaux de gris éclairci (`grayscale(1) brightness(1.9) contrast(1.15)`), puis la couleur (`culture-<culture>-moyen`) posée par-dessus en mode `color`, découpée à la forme du velours. C'est là que les deux univers se mêlent : l'or du kit, le velours de la culture.
- Flèches de page (carrousels, listes) : les flèches-boutons rouges ; flèches de défilement et petits boutons : les pyramides dorées.
- Cadres : `cadre-fin` pour les champs et les lignes, `cadre-large` pour les bandeaux, `cadre-carre` pour les vignettes, `anneau` pour les médaillons, les grands coins ornés pour les panneaux.
- Bordures : séparations de titre, du plus sobre (`separateur-fin`) au plus orné (`separateur-rinceaux`).
- Icônes : actions, états, choix (cases et ronds), dans l'or du kit.
- Lumière : celle des images (douce, venue du haut) ; ombres de la vue dans le même sens.
