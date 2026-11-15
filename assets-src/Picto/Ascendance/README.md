# Gouttes d'ascendance — masters d'Idan (2026-11-15)

Déposées sur Hostinger dans `media/pictos/Ascendance/` : PNG 1254 × 1254, des gouttes « parfaitement de la même taille et
avec un visuel plus lisible ». Toile entière, sans recadrage (comme les peuples) : le halo animé se pose exactement autour
de chaque goutte. Réduites par `scripts/build-pictos.sh` en `prototype-web/assets/pictos/` (256 × 256).

Dans le jeu, une ascendance s'affiche en trois calques (`prototype-web/goutte-ui.js`) : le halo animé derrière, la goutte
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
| `goutte-halo.webp` | Le halo animé (80 images, 4 s, 512 px ; réduit à 256 px, 10 Mo → 0,8 Mo) | `halo-magique-anime/halo-magique.webp` |

Les anciens masters JPG sur fond blanc (détourés par le script) sont remplacés ; ils restent dans l'historique git. Le halo
fixe (`Halo magique cramoisi et blanc.png`) ne sert pas.
