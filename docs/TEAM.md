# Équipe Mercenaires — tableau de bord

Tableau de bord de l'équipe, pas un roman. À lire au début de chaque session, juste après `AGENTS.md`.

Dernière mise à jour : 2026-10-03 — JC3

## Rôles

| Qui | Rôle | Responsabilités |
|---|---|---|
| 👑 **Idan** | Game Director | Vision, décision finale, validation des règles, direction artistique, tests en conditions réelles (joue les démos). Fait la liaison avec Jean-Mimi et Groky. Ne fusionne rien dans Git et n'a pas à toucher au code. |
| ⚔️ **JC3** (Claude Code) | Lead Dev | Architecture, intégration, moteur de combat et Mission Test, simulations et tests techniques, fusions dans `test`, passage `test` → `main`, déploiements Netlify. Tient l'état technique du projet et ce tableau de bord. Peut déléguer du travail à Chatty. |
| 🍺 **Chatty** (ChatGPT) | Co-Game Designer · Copywriter · Reviewer en chef | Design des systèmes avec Idan, rédaction des règles dans `docs/design/`, contenu, fiches, dialogues, revue fonctionnelle des PR (conformité aux règles). Code ponctuellement, sur des domaines précis, à la demande de JC3. |
| 🎨 **Jean-Mimi** (Gemini) | Créa | Visuels, ambiance, cinématiques, portraits, icônes, produits dans Google Flow. Ne travaille pas sur Git : Idan fait la liaison et JC3 intègre les livrables. |
| 🧨 **Groky** (Grok) | Recrue | Regard critique sur le ton et le contenu du jeu, et tâches confiées par JC3 (Issues `GROKY — …`). Pas d'accès au dépôt privé : Idan lui transmet les Issues et rapporte ses réponses. |

## Zones

| Zone | Propriétaire | Notes |
|---|---|---|
| `docs/design/`, `data/reference/` (contenu) | Chatty | Idan valide toute règle avant qu'elle soit codée. |
| `game-core/`, `tests/` | JC3 | |
| `prototype-web/` | JC3 | Le contenu des fiches et des dialogues vient de Chatty. |
| `netlify.toml`, `.github/`, `scripts/` | JC3 | |
| `docs/TEAM.md` | JC3 | Chacun peut mettre à jour sa ligne dans « Chantiers en cours ». |
| `archive/notion-export/` | — | Archive figée, jamais modifiée. |

Avant de toucher au cœur d'une zone qui appartient à quelqu'un d'autre, on le signale (Issue ou PR).

## Fonctionnement

### Les trois étages Git

- `main` : la version officielle, celle du site public. On ne la casse pas.
- `test` : l'atelier commun, où l'on assemble ce qui est assez propre pour être testé ensemble.
- Branches courtes : une par chantier, créées à partir de `test`.

### Le circuit d'une modification

1. Le travail se fait sur une branche de chantier.
2. Une Pull Request (PR) est ouverte vers `test`. Si une relecture est souhaitée, la description le dit : `Review Chatty : vérifier la conformité avec Combat V1`.
3. Les tests automatiques doivent être verts. Tout changement de règle ou de comportement de jeu est relu par Chatty ; une correction purement technique, qui ne change aucun comportement défini, n'attend pas sa relecture.
4. JC3 fusionne dans `test`.
5. Idan reçoit au plus un lien de prévisualisation et une question : « Essaie ça, ça te plaît ? »
6. Quand `test` est stable et qu'Idan donne son feu vert, JC3 passe `test` dans `main`.

### Messagerie : GitHub Issues

- Une tâche = une Issue, avec tout le contexte nécessaire pour être reprise sans historique de conversation.
- Le titre commence par le destinataire : `CHATTY — Définir la négociation salariale de la Taverne`, `JC — …`, `IDAN — Décision : …`, `JM — …`, `GROKY — …`.
- Le dépôt est privé : une Issue destinée à Jean-Mimi ou Groky doit se suffire à elle-même (règles recopiées dedans), pour qu'Idan puisse la transmettre telle quelle.
- Une Issue se ferme quand la tâche est faite, avec un lien vers la PR ou le document concerné.

### Rituel de session

1. Lire `AGENTS.md`, puis ce fichier.
2. Lire les Issues ouvertes à son nom et les PR en attente de relecture.
3. Travailler.
4. Mettre à jour sa ligne dans « Chantiers en cours ».

Aucun agent ne travaille spontanément : il faut qu'une session soit lancée. GitHub conserve et transmet le travail d'une session à l'autre.

### Règle d'or

`docs/design/` est la règle, le code est son implémentation. Si les deux divergent, on ne choisit pas en silence : on ouvre une Issue `IDAN — Décision : …`.

## Chantiers en cours

| Chantier | Responsable | Branche / PR | État |
|---|---|---|---|
| Combat lot 1 complet : Attaques d'opportunité, Frappe dans le dos, Encerclement, Courage, Fuite (+ Force de charge au Blesser) | JC3 | PR #7 | Fusionné |
| Corrections Mission Test : second Mouvement, carte 13×9 rectangulaire et entièrement visible | JC3 | PR #7 | Fusionné |
| Sauvegarde de la partie (automatique, « Continuer » au démarrage) | JC3 | PR #15 | Fusionné |
| Correctifs : profil Magie (Issue #12), PV négatifs (Issue #13) | JC3 | PR #16 | Fusionné |
| Fin de mission V1 : blessures, fatigue, indisponibilité | Chatty + Idan | Issue #14 | Design en cours ; code JC3 après validation des valeurs |
| Registre d'équilibrage (`docs/design/92-balance-questions.md`) | JC3, puis Idan + Chatty | PR #7 | Équilibrage reporté par Idan |
| Taverne : design V1 (`docs/design/14-tavern-recruitment.md`) | Chatty + Idan | PR #6 | Fusionné |
| Taverne : code V1, étape 1 — état de partie, `AdvanceTime`, boucle quotidienne, entretien, négociation (`game-core/`) | JC3 | PR #11 | Fusionné |
| Taverne : code V1, étape 2 — écran Taverne dans le prototype | JC3 | PR #11 | Fusionné |
| Tâche test : casser les règles de Fuite | Groky | Issue #4 | Terminée, décisions dans l'Issue #8 |

## Décisions récentes

- **2026-10-03** — Répartition des rôles ci-dessus.
- **2026-10-03** — Circuit Git : PR vers `test`, fusion par JC3, `test` → `main` sur feu vert d'Idan. Idan ne fusionne rien.
- **2026-10-03** — Tâches et échanges entre agents via GitHub Issues et PR.
- **2026-10-03** — Jean-Mimi travaille dans Google Flow, hors Git, avec Idan en liaison. Groky rejoint l'équipe.
- **2026-10-03** — Profil temporaire d'équipement (Issue #12) : la meilleure école de magie est divisée par 2, comme la meilleure arme.
- **2026-10-03** — Taverne (PR #11) : l'Intendant est un rôle assigné par le joueur (aucun par défaut) ; départ après refus durci (coefficient 1,5, plafond 95 %) pour que les offres très basses ne soient pas une loterie.
- **2026-10-03** — Dortoir initial porté à **40 places** : l'escouade initiale peut compter jusqu'à 30 mercenaires plus le capitaine.
- **2026-10-03** — Taverne V1 (Issues #5 et #9) et horloge stratégique unique `AdvanceTime(days)`, résolue jour par jour : validées par Idan.
- **2026-10-03** — Combat V1 (PR #7) : toute attaque contre un personnage En Fuite est une Frappe dans le dos ; panique hors de sa propre activation = fuite immédiate de `MouvementBase` ; choix d'implémentation des attaques d'opportunité confirmés par Chatty.
- **2026-10-03** — Fuite V1 (Issue #8) : pas de nouveau test de Courage En Fuite ; un fuyard ne fait pas d'attaque d'opportunité ; ennemi actif = vivant et pas En Fuite ; sortie de carte prioritaire si atteignable ce tour-ci ; Mission Test : sortie de carte = hors combat.

## En attente de décision

- **Escouade initiale sans contrat** (Idan + Chatty) : à décider avant de brancher la paie quotidienne, sinon l'escouade initiale travaillerait gratuitement pour toujours.
- **Sélection du type de dégâts, cas « moyen »** (Idan + Chatty) : la formule dit `AVERAGE(matchups)`, le moteur choisit le type le plus proche de cette moyenne. Faut-il une moyenne numérique, ou le type le plus proche ?

## Dépendances

- La Taverne a besoin de la boucle de temps (`AdvanceTime`), d'un état de partie persistant (`Game` / `Company`) et du générateur de mercenaires.
- Sauvegarde (review Chatty, PR #15) : quand missions, retour, blessures, fatigue, paie et constructions passeront par `AdvanceTime`, toute modification de l'état de partie devra être sauvegardée par un même point central, jamais par un chemin à part.
- Combat lot 1 : l'Attaque d'opportunité et l'Encerclement appliquent la Frappe dans le dos ; la Fuite dépend du Courage et peut déclencher des Attaques d'opportunité.
