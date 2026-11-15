# Gouttes d'ascendance — masters d'Idan (2026-11-15)

Déposées sur Hostinger dans `media/pictos/Ascendance/` : PNG 1254 × 1254, des gouttes « parfaitement de la même taille et
avec un visuel plus lisible ». Toile entière, sans recadrage (comme les peuples) : le halo animé se pose exactement autour
de chaque goutte. Réduites par `scripts/build-pictos.sh` en `prototype-web/assets/pictos/` (256 × 256).

Dans le jeu, une ascendance s'affiche en trois calques (`prototype-web/picto-ui.js`) : le halo animé derrière, la goutte
rubis, puis la goutte à emblème qui apparaît en fondu d'une seconde (Idan : « la goutte arrive toujours par opacité d'une
seconde sur la goutte rubis puis on fait jouer en boucle le webp derrière pour faire le halo »).

| Fichier | Rôle | Fichier d'origine sur Hostinger |
|---|---|---|
| `ascendance-sang-d-orc.png` | Sang d'orc | `Sigle orc blanc sur goutte rouge-1.png` |
| `ascendance-sang-divin.png` | Sang divin | `Étoile divine sur goutte rouge-2.png` |
| `ascendance-sang-de-demon.png` | Sang de démon | `Goutte rouge, emblème démoniaque-3.png` |
| `ascendance-sang-de-dryade.png` | Sang de dryade | `Goutte rouge ornée d’un arbre blanc-4.png` |
| `ascendance-sang-de-troll.png` | Sang de troll | `Goutte rouge, emblème de troll-5.png` |
| `ascendance-sang-de-dragon.png` | Sang de dragon | `Goutte rouge, emblème de dragon-6.png` |
| `ascendance-sang-de-djinn.png` | Sang de djinn | `Goutte rubis, emblème de djinn.png` |
| `ascendance-sang-d-elfe.png` | Sang d'elfe | `Goutte rouge à l’emblème elfe-8.png` |
| `ascendance-sang-de-sirene.png` | Sang de sirène | `Emblème sirène sur goutte rouge-9.png` |
| `ascendance-sang-feerique.png` | Sang féerique | `Emblème de fée sur goutte rouge-10.png` |
| `ascendance-sang-d-humain.png` | Sang d'humain | `Goutte de rubis à emblème humain-11.png` |
| `goutte-rubis.png` | La goutte sous l'emblème | `Goutte de rubis brillante sur transparence.png` |
| `goutte-sombre.png` | « Aucune » ascendance (création du capitaine) | `sang_basique.png` |
| `goutte-halo.webp` | Le halo animé (80 images, 4 s, 512 px), mis en place par `scripts/build-halo.js` (voir plus bas) | `halo-magique-anime/halo-magique.webp` |

Les anciens masters JPG sur fond blanc (détourés par le script) sont remplacés ; ils restent dans l'historique git. Le halo
fixe (`Halo magique cramoisi et blanc.png`) ne sert pas.

## Le halo dans le jeu (Idan, 2026-11-15)

`scripts/build-halo.js` fabrique `prototype-web/assets/pictos/goutte-halo.webp` (256 × 256, la toile de la goutte, 0,9 Mo).
Les images du master sont décodées par le navigateur : ImageMagick lit mal ce WebP animé et épaississait les volutes.
Le halo est recentré sur la goutte et agrandi de 22 %, puis viennent les réglages choisis par Idan sur la planche de choix
(« Le B avec 105% -0,5% -5% 75% 84% ») : le halo et son reflet (deux couches à 93 %), taille 105 %, décalage −0,5 % vers
la droite et 5 % vers le haut, étirement horizontal 75 % et vertical 84 %. Les réglages sont en tête du script.
