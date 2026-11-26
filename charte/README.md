Blood & Wages est un jeu de gestion de mercenaires en dark fantasy. L'écran montre d'abord une scène sombre ; tout ce qu'on lit ou remplit est posé sur le parchemin d'Idan ; l'or, l'encre et les ornements tirés des planches d'Idan font le reste. Cette charte rassemble ce qui est déjà validé. Avant de dessiner ou de coder un écran, partir d'ici ; s'il manque quelque chose, le proposer à Idan avant de l'inventer.

## Principes

1. La scène d'abord : le décor occupe l'écran ; les grands parchemins passent devant lui. Pas de mouvement de caméra.
2. La réplique de Cruxor toujours en haut ; dessous, toujours le même écart avant le contenu.
3. Tout ce qui est à lire ou à remplir va sur le parchemin d'Idan (`Interface/parchemin.webp`, coins jamais déformés : bords de `parchemin-bord`). Seuls les médaillons (peuples, cultures, ascendances) se posent sur la scène.
4. Rien ne saute : chaque parchemin a ses places réservées (lignes fixes) ; survoler ou choisir ne change aucune taille.
5. Navigation dans le parchemin, centrée en bas : « ‹ Retour » (absent du premier écran) et le bouton d'Idan, éteint tant que le choix manque.
6. Ce qu'on choisit : une image s'allume d'un halo doré qui épouse sa forme (jamais de cerclage) ; un texte se coche d'une croix tracée à la plume (`Ornements de la charte/croix.svg`).
7. Le cachet de cire (`Interface/cachet.webp`) signe le registre seulement.
8. Tout proportionnel (Idan, 2026-11-19) : chaque écran est réglé pour 1920 × 1080, puis suit la taille de l'écran d'un bloc, barres comprises, sans plancher ni plafond : échelle = le plus petit des rapports largeur / 1920 et hauteur / 1080 (`--ui-scale`, posée par `screen-ui.js` ; l'échelle d'interface d'Unreal au portage). Tout le contenu (`.app-shell`), les fenêtres, le menu pause et les bulles flottantes sont mis à cette échelle (`zoom`) ; les barres ont la leur (`--hb-B`). Pour écrire un écran : des pixels de 1080 ; une taille en part d'écran passe par `--vw`, `--vh`, `--dvh` (l'écran de référence) ; une position calculée en JavaScript, en pixels d'écran, se divise par le `currentCSSZoom` de l'élément.
9. Une lumière cohérente par vue (Idan, 2026-11-25) : dans une même vue, toutes les ombres sont identiques et portent dans le même sens, et tous les reliefs s'éclairent de la même lumière ; sa direction peut changer d'une vue à l'autre. C'est une lumière d'ambiance, à la bougie (« pas un spot de boîte de nuit ») : douce, peu de contraste entre le clair et l'ombre, ni reflet blanc ni noir franc ; tout se joue dans la subtilité. Boîte de dialogue : lumière en haut à gauche, ombres vers le bas à droite ; la fenêtre pose sur la fiche une ombre douce de contact.
10. Pas d'aplat de couleur (Idan, 2026-11-25) : tout est matière (parchemin, bois, cuir, métal, pierre…) et porte une texture ; un dégradé seul ne suffit pas.

## Écriture

- Écrire pour un joueur : pas de mode d'emploi (« survolez… ») ni de jargon de développeur.
- Le jeu vouvoie le joueur. Exemples réels : « Alors, capitaine… d'où venez-vous ? », « Le vieux capitaine vous appelait Bob. Corrigeons ça. », « Quel est votre nom ? ».
- Titres et phrases d'origine au masculin pour tous, hommes et femmes, comme on dit « Madame le Président » : « Canonnier en herbe », « Nain des montagnes au sang de dragon ».
- Capitales seulement en Cinzel (étiquettes, titres courts) ; le reste en minuscules, ponctuation française (« », espaces fines).

## Couleurs

- Sur le parchemin : `encre` pour le texte principal, `encre-secondaire` pour les en-têtes, étiquettes, filets et « ‹ Retour ».
- Sur la scène sombre : `or-clair` pour le texte du bouton et les titres, `or` pour les filets et numéros, `ivoire` pour les répliques, `texte-inactif` pour ce qui n'est pas encore atteint, `laiton` pour ce qui est franchi.
- `ink`, `line`, `line-2`, `gold`, `gold-hi`, `text`, `muted`, `pick` viennent de l'interface d'origine ; pour un nouvel écran, partir des couleurs de la charte ci-dessus.
- Chaque culture a trois tons, tirés de la texture de sa barre (même teinte, trois luminosités) : `culture-<culture>-moyen` (validé : la phrase d'origine, sur `hc-page`), `culture-<culture>-sombre` et `culture-<culture>-clair` (proposés).
- La phrase d'origine en ton moyen sur `hc-page` atteint 3:1 au moins : elle reste en gras, à 20 px ou plus.

## Typographie

- Deux familles : `titre` (Cinzel, 700, en capitales espacées) et `texte` (EB Garamond, 500 à 700). Rien de maigre.
- Cinzel : `marque`, `titre-fiche-parchemin`, `bouton`, `en-tete-parchemin`, `etiquette`.
- EB Garamond : `titre-parchemin`, `saisie`, `texte`, `lien-retour` ; en italique pour les répliques (`replique`) et la description d'une fiche (`texte-fiche`).
- Fiche au survol : `nom-fiche` (réduit à partir de 20 caractères), `titre-fiche` (italique, une ligne, deux s'il le faut), `phrase-origine`.

## Ornements et filets

- Un filet est épais près de son motif et s'affine jusqu'à disparaître (`fil`, `fil-centre`, `fil-v`) ; il entre toujours dans son motif par le milieu.
- Motifs petits, pris dans les ornements d'Idan : pointe de lance (`lance.svg`), couronne (`couronne.svg`), fleur de lys (`fleur-de-lys.svg`). Le losange (`losange.svg`) seulement pour les étapes.
- Chaque culture a son ornement de titre (groupe Ornements du titre), en miroir de part et d'autre du titre de la fiche au survol, couleur `hc-parchemin`, tous sur la même ligne.
- Les SVG d'ornements sont noirs, d'une seule encre : on s'en sert comme masque (`mask`) et la couleur vient du jeton (`encre-secondaire`, `or`, `hc-parchemin`).
- Le fin contour d'or, c'est le cadre doré du bouton d'Idan (composant Cadre doré, Idan, 2026-11-25) : vignettes des portraits, barre de défilement, et partout où il faut un contour doré. On ne le redessine pas en CSS. Son velours passé au brun sert de fond (`velours-brun.webp`).

## Composants réutilisables

À reprendre tels quels quand un autre écran en a besoin, avant d'en dessiner un nouveau.

- Barre de défilement du parchemin (Idan, 2026-11-25 : « on a une scrollbar pour parchemin qu'on peut réutiliser ») : le cadre du bouton d'Idan tourné à la verticale, velours brun, les flèches et le curseur du kit doré, le creusé, l'ombre portée sur le parchemin (composant Cadre doré). Aujourd'hui sur la conversation de la boîte de dialogue (`.conv .talk-log`) ; pour un autre parchemin, régénérer avec `scripts/build-parchment-scrollbar.py` en changeant le sélecteur. Le curseur se refait avec `scripts/build-scrollbar-thumb.js`.

La boîte de dialogue (Idan, 2026-11-25/26, `prototype-web/styles.css`, règles `.conv*` et `.conv-*`) est le modèle des
fenêtres du jeu. Ses pièces se reprennent pour tout écran qui en a besoin :

- **Grand cadre de cuir et de métal** (`.conv::before` / `::after`) : un cadre complet fourni par Idan en une image
  (`assets-src/Kits/cadre-dialogue/cadre-idan.webp`), découpé par `scripts/build-dialog-frame-idan.js` en deux moitiés
  (`creation/cadre-dialogue-gauche|droite.webp`), chacune en `border-image` : 5 colonnes (coin | cuir uni qui se répète |
  demi-ornement ‖ demi-ornement | cuir uni | coin) × 3 rangées (haut | milieu qui se répète | bas). Les coins et les
  ornements du milieu restent entiers ; seul le cuir uni se répète (avec un fondu : aucun raccord). Il tient à toutes les
  tailles (876 px fiche ouverte, 1612 px repliée). Pour un autre cadre : demander à Idan l'image complète (« tu as juste à
  découper ») plutôt que de l'assembler soi-même à partir de pièces de planche.
- **Parchemin à filet doré collé** (`.conv-page`) : le parchemin d'Idan, son contour doré (`cadre-or.webp`) collé dessus,
  angles coupés de 11 px. Dans un grand cadre, son angle coupé se cale **en diagonale** sur la tête de la volute du coin et
  l'angle coupé du cadre, avec de l'air entre eux (environ 30 px le long de la diagonale).
- **Plateau des boutons** (`.conv #recruit-talk-choices`) : le cuir du fond vu à travers, assombri de 40 %, angles coupés
  de 11 px ; un éclat diffus en haut à gauche et une pénombre en bas à droite (ombres internes très floues), une ombre
  portée floue mais bien visible vers le bas à droite, qui suit les angles coupés et est évidée sous le plateau
  (pseudo-élément ; une `box-shadow` serait coupée par le `clip-path`). Marges visibles de 16 à 18 px.
- **Boutons de réponse** (`.conv .talk-options`) : le bouton d'Idan au velours brun, rouge au survol (`bouton-brun|rouge`,
  grain du velours répété, `scripts/build-dialog-buttons.js`), le numéro dans un petit rond brun / rouge posé sur l'angle
  du haut à gauche ; grille de 3 colonnes, 19 px entre les lignes (24 fiche repliée).
- **Emblème** (`.conv-emblem`) : un médaillon rond au velours rouge (`kit/boutons/rond-rouge.webp`, 130 px) et une icône
  passée à l'or du kit (`scripts/build-gold-icon.js`), centré sur le filet doré du haut du cadre et mordant sur le
  parchemin ; de part et d'autre, les lauriers de Chatty (planche 2, 180 px) posés sur le liseré doré du parchemin.
- **Bouton rond de coin** (la croix, `.conv-close`) : rond au velours brun (`rond-brun.webp`) et icône dorée du kit, rouge
  au survol. Sur un coin coupé du cadre : son centre près du croisement des milieux des deux grosses barres, il dépasse un
  peu en haut et à droite et cache l'angle (63 px ici) ; la volute de ce coin est effacée.
- **Languette** (`.conv-fold`, replier / déplier la fiche) : le bouton d'Idan tourné à la verticale (brun, rouge au
  survol), une flèche dorée du kit ; son milieu sur le milieu de la grosse barre du cadre, au milieu de sa hauteur.

### Règles de mise en page apprises avec Idan

- Les marges se comptent depuis ce qui est **dessiné** (la barre de métal, le bord doré d'un bouton, le haut d'un rond),
  jamais depuis la boîte CSS. Autour d'un cadre, mêmes marges à droite, en haut et en bas, comptées depuis la barre de
  métal ; un ornement qui dépasse (le losange du bas) ne compte pas.
- « Aligné » se juge à l'œil, selon la pièce : un ornement posé sur une barre a son milieu sur le milieu de la barre ; un
  rond de coin dépasse un peu et cache l'angle ; dans un coin, les angles cassés et la volute se suivent en diagonale, avec
  de l'espace. Pas de règle géométrique appliquée aveuglément (une tangente, par exemple) : régler, montrer, ajuster.
- Quand le contenu est à l'étroit, agrandir le contenant plutôt que rentrer le contenu (« ressortir la tête »).
- Ombres et éclats : toujours dans le sens de la lumière (en haut à gauche) ; floues mais visibles.
- Ne toucher qu'à ce qui est demandé ; quand une pièce propre manque, demander le fichier à Idan plutôt que de la
  reconstruire. Montrer chaque étape en capture, l'ensemble et le détail.

## Pictos et images

- Pictos des origines : Peuples, Cultures, Ascendances, Écoles de magie (WebP 128 × 128). Sur la fiche au survol : `picto-origine` (52 px), `ecart-pictos-origine` entre eux, ombre `ombre-picto`.
- Barre du camp : Pictos du camp ; les textures de la barre de chaque culture : Textures des cultures.
- Le kit doré d'Idan (`prototype-web/assets/kit/` ; groupes Cadres dorés, Boutons dorés, Velours, Bordures dorées, Flèches dorées, Icônes dorées, Curseurs dorés ; Idan, 2026-11-25 ; et le kit du cadre de dialogue de Chatty, `kit/cadre-dialogue/` : 64 pièces découpées de ses 4 planches, masters dans `assets-src/Kits/cadre-dialogue/`) : des ressources à disposition, à prendre avant de dessiner quoi que ce soit en CSS. Rien n'y est figé : on peut en faire d'autres et les adapter si besoin (recolorer, recadrer, adoucir), en gardant l'original et en notant d'où vient la pièce adaptée (`assets/creation/`).
- Avant de dessiner un picto, un ornement ou une icône, chercher d'abord dans les bibliothèques libres (game-icons.net, CC BY 3.0, via Iconify ; les autres collections libres d'Iconify), proposer des candidats à Idan, et noter l'auteur et la licence pour les crédits du jeu. Budget : 0 €.

## Mouvement

- 120 ms pour les états des boutons (survol : plus lumineux ; appui : il descend de 2 px) ; arrivée orchestrée des écrans ; pas de zoom.
- Rien ne bouge si le système demande moins de mouvement.
