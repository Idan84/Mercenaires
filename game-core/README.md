# Game core

Noyau de logique indépendant de l'interface, préparé pour un futur portage Unreal. Chaque module est un fichier JavaScript autonome (utilisable dans le navigateur et sous Node), reçoit ses données de `data/reference/` et son générateur aléatoire en paramètre.

| Module | Rôle | Règles |
|---|---|---|
| `mercenary-generator.js` | Génération des mercenaires et de leur équipement de départ | `01-start-and-generation-functions.md`, `05-equipment.md` |
| `combat-engine.js` | Résolution du combat : Toucher, Blesser, Dégâts, attaques d'opportunité, Encerclement, Courage, Fuite | `04-combat.md`, `13-fleeing.md` |
| `mission-end.js` | Fin de mission : jet de mort, blessure, fatigue, durées d'indisponibilité | `10-mission-time-and-unavailability.md` |
| `tavern.js` | Taverne : candidats, entretien, négociation | `14-tavern-recruitment.md` |
| `biography.js` | Biographies : choix d'un pack de texte tagué compatible avec le mercenaire, sans réutilisation | `15-biographies-and-narrative-tags.md` (proposition) |
| `avatars.js` | Avatars : choix du visage le plus proche du mercenaire, unicité, sexe donné par l'image | décisions d'Idan du 2026-10-04 (`docs/TEAM.md`) |
| `avatar-catalog.js` | Catalogue des avatars depuis les images et leurs mots-clés Bridge (Git ou Hostinger) | `docs/DEPLOYMENT.md` |
| `avatar-coverage.js` | Couverture des avatars par peuple : besoin, cultures, profils, armes, magie et ascendances à produire (onglet Avatars du Design Lab, sans effet sur le jeu) | `docs/DEPLOYMENT.md` |
| `campaign.js` | État de partie, horloge `AdvanceTime(days)`, signature, Intendant, sauvegarde | `07-architecture.md`, `10-mission-time-and-unavailability.md` |

Les tests sont dans `tests/`.
