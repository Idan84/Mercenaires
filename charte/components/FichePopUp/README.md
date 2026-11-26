# FichePopUp

La fiche des pop-ups sur un mercenaire (Idan, 2026-11-26 : « enregistrer cette fiche (sans le texte) comme fiche pop up »). Elle sert d'abord au pop-up de bienvenue, après la signature d'une recrue. On la reprend telle quelle pour tout autre pop-up sur un mercenaire, avant d'en dessiner une nouvelle.

- C'est la fiche au survol, coupée à la hauteur du portrait. Le portrait est carré, agrandi de 100 px (« agrandir le portrait en hauteur et en largeur… ça fait plus d'espace en bas ») : 392 × 392 px. La carte fait 960 × 409 px, la largeur d'une rangée de trois boutons capitaine.
- Le cartouche (nom et titre) et la page gardent les places et les tailles de la fiche au survol, décalés de l'élargissement. La page claire (`hc-page`, papier froissé) est vide : chaque pop-up y met son contenu, avec 40 px de marge de chaque côté, parce que les ornements de la séparation entrent dans la page.
- Le cadre du kit de la culture (le même que sur la fiche au survol) est posé par le jeu, à la taille de la carte. Les ornements gardent leur place par rapport à la page et à la séparation. Un ornement de la séparation plus long que la carte remonte pour rester dedans. L'aperçu ne montre pas ce cadre.
- Sous la carte, les boutons capitaine (`.mission-btn`), 44 px plus bas ; le tout est centré sur l'écran, sur le fond noir flou de la discussion.
- Dans le jeu : `renderPopupCard(mercenaire, {body, pageClass})` (`prototype-web/hover-card-ui.js`), règles `.hover-card--popup` (`prototype-web/styles.css`). Le pop-up de bienvenue : `renderWelcomeCard`.
