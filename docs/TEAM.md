# Équipe Blood & Wages — tableau de bord

À lire au début de chaque session, juste après `AGENTS.md`. Les décisions de jeu vivent dans `docs/design/`.

Dernière mise à jour : 2026-11-18.

## Rôles

| Qui | Rôle | Responsabilités |
|---|---|---|
| 👑 **Idan** | Game Director | Vision, décision finale, validation des règles, direction artistique, tests en conditions réelles (joue les démos). Fait la liaison avec Jean-Mimi et Groky. Ne fusionne rien dans Git et n'a pas à toucher au code. |
| ⚔️ **JC3** (Claude Code) | Lead Dev | Architecture, intégration, moteur de combat et Mission Test, simulations et tests techniques, fusions dans `test`, passage `test` → `main`, déploiement technique. **N'intervient pas sur la direction artistique ni sur le traitement des assets sans validation visuelle.** Tient l'état technique du projet et ce tableau de bord. Peut déléguer du travail à Chatty. |
| 🍺 **Chatty** (ChatGPT) | Co-Game Designer · Copywriter · Reviewer en chef | Design des systèmes avec Idan, rédaction des règles dans `docs/design/`, contenu, fiches, dialogues, revue fonctionnelle des PR (conformité aux règles). Code ponctuellement, à la demande de JC3. |
| 🎨 **Jean-Mimi** (Gemini) | Créa | Visuels, ambiance, cinématiques, portraits, icônes, dans Google Flow. Hors Git : Idan fait la liaison et JC3 intègre les livrables. |
| 🧨 **Groky** (Grok) | Recrue | Regard critique sur le ton et le contenu, tâches confiées par JC3 (Issues `GROKY — …`). Sans accès au dépôt privé : Idan lui transmet les Issues et rapporte ses réponses. |

## Zones

| Zone | Propriétaire | Notes |
|---|---|---|
| `docs/design/`, `data/reference/` (contenu) | Chatty | Idan valide toute règle avant qu'elle soit codée. |
| `game-core/`, `tests/` | JC3 | |
| `prototype-web/` | JC3 | Intégration technique. Le contenu vient de Chatty ; la direction artistique d'Idan / Jean-Mimi. **JC ne recadre, ne redessine, ne détoure, ne recolore, ne régénère et ne compresse pas un asset visuel de sa propre initiative.** |
| hébergement, `.github/`, `scripts/` | JC3 | Hostinger depuis le 2026-10-05 (Netlify abandonné faute de crédits). Mise en ligne automatique de `main` : `docs/DEPLOYMENT.md`. |
| `docs/TEAM.md` | JC3 | Chacun peut mettre à jour sa ligne dans « Chantiers en cours ». |
| `archive/notion-export/` | — | Archive figée, jamais modifiée. |

Avant de toucher au cœur d'une zone qui appartient à quelqu'un d'autre, on le signale (Issue ou PR).

### Règle assets visuels (Idan, 2026-10-05)

**JC intègre mais ne crée ni ne transforme les assets visuels de sa propre initiative.** Idan est le directeur
artistique.

- **Jean-Mimi produit** les visuels et variantes dans Google Flow.
- **Idan valide** la direction artistique et choisit les assets de référence.
- **Chatty cadre l'usage**, la cohérence UI, et peut préparer, détourer ou adapter un asset quand c'est demandé.
- **JC intègre** les fichiers dans le prototype, sans altérer leur direction artistique.
- Toute opération qui change l'apparence d'un asset (recadrage, détourage, compression visible, recoloration,
  régénération, compositing, placement créatif) doit être **explicitement validée** avant intégration.

## Fonctionnement

### Les trois étages Git

- `main` : la version officielle, celle du site public (https://bloodandwages.idanwizen.com, mis à jour
  automatiquement). On ne la casse pas.
- `test` : l'atelier commun, où l'on assemble ce qui est assez propre pour être testé ensemble.
- Branches courtes : une par chantier, créées à partir de `test`.

### Le circuit d'une modification

1. Le travail se fait sur une branche de chantier.
2. Une Pull Request (PR) est ouverte vers `test`. Si une relecture est souhaitée, la description le dit :
   `Review Chatty : vérifier la conformité avec Combat V1`.
3. Les tests automatiques doivent être verts. Tout changement de règle ou de comportement de jeu est relu par Chatty ;
   une correction purement technique, qui ne change aucun comportement défini, n'attend pas sa relecture.
4. JC3 fusionne dans `test`.
5. Idan reçoit au plus un lien et une question : « Essaie ça, ça te plaît ? »
6. Quand `test` est stable et qu'Idan donne son feu vert, JC3 passe `test` dans `main`.

La mise en ligne (`test` → `main`) attend le feu vert d'Idan.

### Messagerie : GitHub Issues

- Une tâche = une Issue, avec tout le contexte pour être reprise sans historique de conversation.
- Le titre commence par le destinataire : `CHATTY — Définir la négociation salariale de la Taverne`, `JC — …`,
  `IDAN — Décision : …`, `JM — …`, `GROKY — …`.
- Le dépôt est privé : une Issue pour Jean-Mimi ou Groky se suffit à elle-même (règles recopiées dedans), pour qu'Idan
  la transmette telle quelle.
- Une Issue se ferme quand la tâche est faite, avec un lien vers la PR ou le document concerné.

### Rituel de session

1. Lire `AGENTS.md`, puis ce fichier.
2. Lire les Issues ouvertes à son nom et les PR en attente de relecture.
3. Travailler.
4. Mettre à jour sa ligne dans « Chantiers en cours ».
5. Après une décision d'Idan : l'écrire dans son document de design. Un sujet reporté ou en attente va dans
   `docs/design/93-pending-and-parked.md`.

Aucun agent ne travaille spontanément : il faut qu'une session soit lancée. GitHub garde et transmet le travail d'une
session à l'autre.

### Règle d'or

`docs/design/` est la règle, le code est son implémentation. Si les deux divergent, on ne choisit pas en silence : on
ouvre une Issue `IDAN — Décision : …`.

## Chantiers en cours

Une ligne par chantier ouvert ; on la retire quand il est fusionné.

| Chantier | Responsable | Branche / PR | État |
|---|---|---|---|

## En attente de décision

Tout est rassemblé, pour Idan, dans [`docs/design/93-pending-and-parked.md`](design/93-pending-and-parked.md) (Design
Lab, bouton « À décider ») : décisions attendues, sujets reportés, équilibrage à surveiller, ménage technique.

## Dépendances

- Le temps avance par une seule fonction, jour par jour (doc 10 §1) : missions, retours, blessures, fatigue, paie et
  constructions passent par elle, et toute modification de l'état de partie est sauvegardée par un même point central,
  jamais par un chemin à part (review Chatty).
- Combat : l'attaque d'opportunité et l'encerclement appliquent la Frappe dans le dos ; la Fuite dépend du Courage et
  peut déclencher des attaques d'opportunité.
