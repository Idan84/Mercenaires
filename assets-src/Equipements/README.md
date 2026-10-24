# Images d'équipement — masters d'Idan (2026-10-23)

Une image par objet et par tier, 1024 × 1024 sur fond noir (pas besoin de détourer : à l'écran, l'image est
posée sur une case noire et son cadre de tier par-dessus).

| Dossier | Contenu | Nom des fichiers |
|---|---|---|
| `Armures/` | les 8 armures de `data/reference/base-armors.json`, T1 à T4 | `<Nom>_<tier>.jpg`, par ex. `Armure_cuir_1.jpg`, `Cotte_mailles_3.jpg` |
| `Armes/` | les 38 armes de `data/reference/weapons.json`, T1 à T4 | `<Nom>_<tier>.jpg`, par ex. `Hache_guerre_2.jpg`, `Arquebuse_1.jpg` |
| `Bottes/` | les 3 bottes de `data/reference/boots.json`, T1 à T4 | `Bottes_<type>_<tier>.jpg`, par ex. `Bottes_vitesse_1.jpg`, `Bottes_esquive_3.jpg` |
| `Ceintures/` | les 3 ceintures de `data/reference/belts.json`, T1 à T4 | `Ceinture_de_<type>_[T]<tier>.jpg`, par ex. `Ceinture_de_mana_T1.jpg`, `Ceinture_d'endurance_T3.jpg` |
| `Frames/` | les cadres posés autour d'un objet selon son tier | `frame_<tier>.jpg` |

Le nom est reconnu sans accents, majuscules, espaces ni petits mots (de, d', des, du, la, le…), dans
n'importe quel ordre, et peut être abrégé s'il reste sans ambiguïté : `Hache_guerre`, `Hache de guerre` et
`hache-de-guerre` désignent la même arme ; `Double_arme_hast` est l'« Arme d'hast double », `Fleau` le
« Fléau d'armes ». Un horodatage final
(`Gambison_2_20261023225327.jpg`) est ignoré. Le T4 n'est pas encore en jeu, mais il est déjà préparé.

Après un ajout ou une retouche, `node scripts/build-equipment.js` régénère les versions du jeu
(`prototype-web/assets/equipment/`, WebP 256 px) et la liste des images disponibles
(`prototype-web/equipment-art.js`). Un fichier dont le nom n'est pas reconnu est signalé.
