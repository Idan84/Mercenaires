# Game core

Noyau de logique indépendant de l'interface, préparé pour un futur portage Unreal. Chaque module est un fichier JavaScript autonome (utilisable dans le navigateur et sous Node), reçoit ses données de `data/reference/` et son générateur aléatoire en paramètre.

| Module | Rôle | Règles |
|---|---|---|
| `mercenary-generator.js` | Génération des mercenaires et de leur équipement de départ | `01-start-and-generation-functions.md`, `05-equipment.md` |
| `combat-engine.js` | Résolution du combat : Toucher, Blesser, Dégâts, critiques et échecs critiques, attaques d'opportunité, Encerclement, Courage, Fuite | `04-combat.md`, `13-fleeing.md` |
| `progression.js` | Progression naturelle : journal par combattant pendant la mission, XP → niveau, application en fin de mission | `08-progression-and-experience.md` |
| `mission-end.js` | Fin de mission : jet de mort, blessure, fatigue, durées d'indisponibilité | `10-mission-time-and-unavailability.md` |
| `tavern.js` | Taverne : candidats, entretien, négociation | `14-tavern-recruitment.md` |
| `recruit-dialogue.js` | Taverne : salutation selon l'affinité, réponses sincères du candidat, répliques de la négociation (textes dans `tavern-dialogue.json`) | `14-tavern-recruitment.md` §6 bis |
| `biography.js` | Biographies : choix d'un pack de texte tagué compatible avec le mercenaire, sans réutilisation | `15-biographies-and-narrative-tags.md` (proposition) |
| `avatars.js` | Avatars : choix du visage le plus proche du mercenaire, unicité, sexe donné par l'image | décisions d'Idan du 2026-10-04 (`docs/TEAM.md`) |
| `avatar-catalog.js` | Catalogue des avatars depuis les images et leurs mots-clés Bridge (Git ou Hostinger) | `docs/DEPLOYMENT.md` |
| `avatar-demand.js` | Besoin en avatars par culture : cases culture × ascendance × arme ou école, besoin binomial, un avatar par case, repli sur le profil (onglet Avatars du Design Lab, sans effet sur le jeu ; mesures `data/reference/avatar-demand.json`) | `02-generation-and-identity.md` |
| `spell-manuals.js` | Manuels de sorts : un par sort, apprendre à l'Intendance (sort au niveau 1, manuel consommé) | `12-magic.md` |
| `regeneration.js` | Régénération (sang de troll) : PV par activation en combat, convalescence au camp | `02-generation-and-identity.md` |
| `merchants.js` | Marchands : passage du jour selon la renommée, étal de 10 articles (liste du marchand, tier selon la renommée), affinité acquise, prix d'achat et de rachat (quantité, rareté, plafond), aide de l'intendant, achat et vente | `18-merchants.md` |
| `mercenary-profile.js` | Titres des mercenaires : sous-catégories mesurées avec le combat et l'équipement, notes des 10 catégories sur l'échelle de la réputation (seuils dans `mercenary-profile.json`), 1 à 3 titres ou « Chair à canon », spécificité | `19-mercenary-profile.md` |
| `campaign.js` | État de partie, horloge `AdvanceTime(days)`, signature, Intendant, sauvegarde | `07-architecture.md`, `10-mission-time-and-unavailability.md` |

Les tests sont dans `tests/`.
