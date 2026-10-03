# Équipe Mercenaires — tableau de bord

Tableau de bord de l'équipe, pas un roman. À lire au début de chaque session, juste après `AGENTS.md`.

Dernière mise à jour : 2026-10-03 — JC3

## Rôles

| Qui | Rôle | Responsabilités |
|---|---|---|
| 👑 **Idan** | Game Director | Vision, décision finale, validation des règles, tests en conditions réelles (joue les démos). Ne fusionne rien dans Git et ne touche pas au code. |
| ⚔️ **JC3** (Claude Code) | Lead Dev | Architecture, intégration, moteur de combat et Mission Test, simulations et tests techniques, fusions dans `test`, passage `test` → `main`, déploiements Netlify. Tient l'état technique du projet et ce tableau de bord. Peut déléguer du travail à Chatty. |
| 🍺 **Chatty** (ChatGPT) | Co-Game Designer · Copywriter · Reviewer en chef | Design des systèmes avec Idan, rédaction des règles dans `docs/design/`, contenu, fiches, dialogues, revue fonctionnelle des PR (conformité aux règles). Code ponctuellement, sur des domaines précis, à la demande de JC3. |
| 🎨 **Jean-Mimi** (Gemini) | Stagiaire DA — *recrutement en cours* | Prototypes graphiques, ambiance, palette, portraits, icônes, références UI. Peut recevoir une règle ou une démo à casser (QA : exploits, cas limites, incohérences). Pas d'accès Git : ses livrables passent par Idan et sont intégrés par JC3. |

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
3. Les tests automatiques doivent être verts. Tout changement de règle ou de mécanique est relu par Chatty.
4. JC3 fusionne dans `test`.
5. Idan reçoit au plus un lien de prévisualisation et une question : « Essaie ça, ça te plaît ? »
6. Quand `test` est stable et qu'Idan donne son feu vert, JC3 passe `test` dans `main`.

### Messagerie : GitHub Issues

- Une tâche = une Issue, avec tout le contexte nécessaire pour être reprise sans historique de conversation.
- Le titre commence par le destinataire : `CHATTY — Définir la négociation salariale de la Taverne`, `JC — …`, `IDAN — Décision : …`, `JM — …`.
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
| Tableau de bord d'équipe (ce fichier) | JC3 | `claude/friendly-bardeen-edzi87` | En relecture |
| Combat lot 1 : Attaque d'opportunité → Frappe dans le dos → Encerclement → Courage → Fuite | JC3 | — | À démarrer |
| Corrections Mission Test : Force de charge au Blesser, second Mouvement, carte coupée à droite | JC3 | — | À faire |
| Taverne : design du cycle de recrutement | Chatty + Idan | — | À démarrer |
| Recrutement de Jean-Mimi | Idan | — | En cours |

## Décisions récentes

- **2026-10-03** — Répartition des rôles ci-dessus.
- **2026-10-03** — Circuit Git : PR vers `test`, fusion par JC3, `test` → `main` sur feu vert d'Idan. Idan ne fusionne rien.
- **2026-10-03** — Tâches et échanges entre agents via GitHub Issues et PR.

## En attente de décision

- **Sélection du type de dégâts, cas « moyen »** (Idan + Chatty) : la formule dit `AVERAGE(matchups)`, le moteur choisit le type le plus proche de cette moyenne. Faut-il une moyenne numérique, ou le type le plus proche ?
- **Passage du temps** (Idan) : JC3 propose un `AdvanceTime(days)` unique dans `game-core/`, auquel la Taverne, les soins, les salaires et les retours de mission viendront se brancher.

## Dépendances

- La Taverne a besoin de la boucle de temps (`AdvanceTime`) et du générateur de mercenaires.
- Combat lot 1 : l'Attaque d'opportunité et l'Encerclement appliquent la Frappe dans le dos ; la Fuite dépend du Courage et peut déclencher des Attaques d'opportunité.
