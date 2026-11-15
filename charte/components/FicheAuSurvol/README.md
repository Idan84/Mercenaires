# FicheAuSurvol

La fiche qui s'ouvre au survol d'un mercenaire : ici ses deux zones validées, le cartouche du nom et les origines.

- Taille fixe : `fiche-largeur` × `fiche-hauteur`, fond `hc-fond`, ombre `ombre-fiche` ; le portrait à gauche (34 % de la largeur), le cartouche en haut à droite, la page (`hc-page`, papier froissé) dessous.
- Zone 1, le cartouche : la texture de la barre de la culture ; le nom (style `nom-fiche`, réduit à partir de 20 caractères) et le titre (style `titre-fiche`, au masculin pour tous), lettres remplies de la texture du parchemin sur `hc-parchemin`, ombres `ombre-nom-fiche` et `ombre-titre-fiche` ; de part et d'autre du titre, l'ornement de la culture et son miroir.
- Zone 2, les origines : deux ou trois pictos (peuple, culture, ascendance) centrés, alignés, `picto-origine`, ombre `ombre-picto` ; dessous, une seule phrase (style `phrase-origine`) dans le ton moyen de la culture : peuple + culture (« Nain des montagnes », « Gobelin des caravanes de ferrailleurs ») puis « au sang de… ».
- Le reste de la fiche (caractéristiques, tags…) n'est pas encore dans la charte.
