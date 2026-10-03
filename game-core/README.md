# Game core

Noyau de logique indépendant de l'interface, préparé pour un futur portage Unreal. Chaque module est un fichier JavaScript autonome (utilisable dans le navigateur et sous Node), reçoit ses données de `data/reference/` et son générateur aléatoire en paramètre.

| Module | Rôle | Règles |
|---|---|---|
| `mercenary-generator.js` | Génération des mercenaires et de leur équipement de départ | `01-start-and-generation-functions.md`, `05-equipment.md` |
| `combat-engine.js` | Résolution du combat : Toucher, Blesser, Dégâts, attaques d'opportunité, Encerclement, Courage, Fuite | `04-combat.md`, `13-fleeing.md` |
| `mission-end.js` | Fin de mission : jet de mort, blessure, fatigue, durées d'indisponibilité | `10-mission-time-and-unavailability.md` |
| `tavern.js` | Taverne : candidats, entretien, négociation | `14-tavern-recruitment.md` |
| `biography.js` | Biographies : choix d'un pack de texte tagué compatible avec le mercenaire, sans réutilisation | `15-biographies-and-narrative-tags.md` (proposition) |
| `campaign.js` | État de partie, horloge `AdvanceTime(days)`, signature, Intendant, sauvegarde | `07-architecture.md`, `10-mission-time-and-unavailability.md` |

Les tests sont dans `tests/`.
