# Jeu de Mercenaires — Blood & Wages

Spécification de référence du jeu. Une **seule source de vérité par mécanique**, assez claire pour être codée dans le
moteur JS, puis portée sous Unreal. La liste complète des documents est dans `docs/design/README.md`.

Socle : [démarrage de partie](/design/#doc=01-start-and-generation-functions.md) →
[génération & identité](/design/#doc=02-generation-and-identity.md) →
[personnage & compétences](/design/#doc=03-character-and-skills.md) → [combat](/design/#doc=04-combat.md) →
[équipement](/design/#doc=05-equipment.md) → [référentiels techniques](/design/#doc=06-technical-reference.md) →
[architecture & objets de jeu](/design/#doc=07-architecture.md).

## Repères

- **Titre** : **Blood & Wages**, accroche **« Manage your HR. Send them to die. »** (Idan, 2026-10-04, après vote de
  l'équipe). Le dépôt garde son nom de code « Mercenaires ».
- **Cible** : **PC / Steam** ; le téléphone n'est pas prioritaire (Idan, 2026-10-03).
- **Musique par lieu** (Idan, 2026-10-21) : menu principal, camp et Taverne ont chacun leur musique, en boucle, un seul
  morceau à la fois, en fondu ; silence pendant l'introduction (la voix d'Idan), la création du capitaine, les missions
  et la fin de partie. Au camp, plusieurs morceaux au hasard, jamais deux fois le même de suite : le thème
  « Blood & Wages », la musique du menu et les thèmes des cultures, un par culture et par sexe ; le premier est celui
  de la culture et du sexe du capitaine, s'il existe (Idan, 2026-11-15 et 2026-11-16).
- **Fenêtres** (Idan, 2026-10-24) : un clic à l'extérieur d'une fenêtre ouverte (fiche, dialogues, choix de mission) ou
  du menu de pause la ferme, comme Échap ; seule la fenêtre du dessus se ferme.
- **Pictos sans médaillon** (Idan, 2026-10-23) : seul le monogramme d'un choix sans picto garde son cercle.
