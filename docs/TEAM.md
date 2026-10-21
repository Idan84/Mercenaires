# Équipe Blood & Wages — tableau de bord

Tableau de bord de l'équipe, pas un roman. À lire au début de chaque session, juste après `AGENTS.md`.

Dernière mise à jour : 2026-10-05 — JC3

## Rôles

| Qui | Rôle | Responsabilités |
|---|---|---|
| 👑 **Idan** | Game Director | Vision, décision finale, validation des règles, direction artistique, tests en conditions réelles (joue les démos). Fait la liaison avec Jean-Mimi et Groky. Ne fusionne rien dans Git et n'a pas à toucher au code. |
| ⚔️ **JC3** (Claude Code) | Lead Dev | Architecture, intégration, moteur de combat et Mission Test, simulations et tests techniques, fusions dans `test`, passage `test` → `main`, déploiement technique. **N'intervient pas sur la direction artistique ni sur le traitement des assets sans validation visuelle.** Tient l'état technique du projet et ce tableau de bord. Peut déléguer du travail à Chatty. |
| 🍺 **Chatty** (ChatGPT) | Co-Game Designer · Copywriter · Reviewer en chef | Design des systèmes avec Idan, rédaction des règles dans `docs/design/`, contenu, fiches, dialogues, revue fonctionnelle des PR (conformité aux règles). Code ponctuellement, sur des domaines précis, à la demande de JC3. |
| 🎨 **Jean-Mimi** (Gemini) | Créa | Visuels, ambiance, cinématiques, portraits, icônes, produits dans Google Flow. Ne travaille pas sur Git : Idan fait la liaison et JC3 intègre les livrables. |
| 🧨 **Groky** (Grok) | Recrue | Regard critique sur le ton et le contenu du jeu, et tâches confiées par JC3 (Issues `GROKY — …`). Pas d'accès au dépôt privé : Idan lui transmet les Issues et rapporte ses réponses. |

## Zones

| Zone | Propriétaire | Notes |
|---|---|---|
| `docs/design/`, `data/reference/` (contenu) | Chatty | Idan valide toute règle avant qu'elle soit codée. |
| `game-core/`, `tests/` | JC3 | |
| `prototype-web/` | JC3 | Intégration technique. Le contenu vient de Chatty ; la direction artistique vient d'Idan / Jean-Mimi. **JC ne recadre, ne redessine, ne détoure, ne recolore, ne régénère et ne compresse pas un asset visuel de sa propre initiative.** |
| hébergement, `.github/`, `scripts/` | JC3 | Hostinger depuis le 2026-10-05 (Netlify abandonné faute de crédits). Mise en ligne automatique de `main` : `docs/DEPLOYMENT.md`. |
| `docs/TEAM.md` | JC3 | Chacun peut mettre à jour sa ligne dans « Chantiers en cours ». |
| `archive/notion-export/` | — | Archive figée, jamais modifiée. |

Avant de toucher au cœur d'une zone qui appartient à quelqu'un d'autre, on le signale (Issue ou PR).

### Règle assets visuels

- **Jean-Mimi produit** les visuels et variantes dans Google Flow.
- **Idan valide** la direction artistique et choisit les assets de référence.
- **Chatty cadre l'usage**, la cohérence UI et peut préparer/détourer/adapter un asset lorsque c'est demandé.
- **JC intègre** les fichiers dans le prototype, sans altérer leur direction artistique.
- Toute opération visuelle qui change l'apparence d'un asset (recadrage, détourage, compression visible, recoloration, régénération, compositing, placement créatif) doit être **explicitement validée** avant intégration.

## Fonctionnement

### Les trois étages Git

- `main` : la version officielle, celle du site public (https://bloodandwages.idanwizen.com, mis à jour automatiquement). On ne la casse pas.
- `test` : l'atelier commun, où l'on assemble ce qui est assez propre pour être testé ensemble.
- Branches courtes : une par chantier, créées à partir de `test`.

### Le circuit d'une modification

1. Le travail se fait sur une branche de chantier.
2. Une Pull Request (PR) est ouverte vers `test`. Si une relecture est souhaitée, la description le dit : `Review Chatty : vérifier la conformité avec Combat V1`.
3. Les tests automatiques doivent être verts. Tout changement de règle ou de comportement de jeu est relu par Chatty ; une correction purement technique, qui ne change aucun comportement défini, n'attend pas sa relecture.
4. JC3 fusionne dans `test`.
5. Idan reçoit au plus un lien et une question : « Essaie ça, ça te plaît ? »
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
5. Après une décision d'Idan, ou quand un sujet est reporté : mettre à jour `docs/design/93-pending-and-parked.md`.

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
| Fin de mission V1 : design (blessures, fatigue, indisponibilité) | Chatty + Idan | Issue #14 | Valeurs PLAYTEST, à ajuster en jeu |
| Fin de mission V1, étape 1 : règles (`game-core/mission-end.js`) et bilan dans la Mission Test | JC3 | PR #18 | Fusionné |
| Fin de mission V1, étape 2 : bilan appliqué à la compagnie (morts, indisponibilités, guérison, primes, Game Over) et bouton d'or de test | JC3 | PR #20 | Fusionné |
| Fin de mission : zone du jet de blessure portée à 0–50 % des PV | JC3 | PR #25 | Fusionné |
| Or de départ : 10 000 PO | JC3 | PR #24 | Fusionné |
| Avatars des mercenaires : plein pied et portrait carré | Chatty, images Jean-Mimi | PR #21 | Fusionné ; images à intégrer (Idan les tague) |
| Fiche mercenaire en onglets (Profil, Caractéristiques, Compétences, Équipement, Magie) | JC3 + Chatty | PR #30 | Fusionné |
| Bios taguées : design (`15-biographies-and-narrative-tags.md`) et catalogue de sorts V0 élargi (`12-magic.md`) | Chatty | PR #32 | Proposition, décision d'Idan attendue |
| Bios taguées : moteur (`game-core/biography.js`) et affichage dans la fiche | JC3 | PR #34 | Proposition, relecture Chatty |
| Sorts : catalogue en données (`spells.json`) et grimoire branché | Chatty, puis JC3 | Issue #28 | À faire après la décision sur le catalogue |
| Camp V1 : règles de construction (proposition Groky consolidée par Chatty) | Chatty + Idan | Issue #23 | Décision d'Idan attendue ; prix après calibrage de l'économie |
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
- **2026-10-03** — Avatars : chaque mercenaire a un plein pied et un portrait carré (`avatar = {id, full, portrait}`) ; **c'est l'image attribuée qui donne le sexe du mercenaire** (Idan).
- **2026-10-03** — Mort du capitaine = Game Over, la sauvegarde est effacée. La prime de mission est payée aux survivants sous contrat, Mission Test comprise. Bouton d'or de test dans le prototype (Idan).
- **2026-10-03** — Fin de mission V1 (Issue #14) : tout survivant non blessé est fatigué (pas de jet) ; courbe de blessure plus agressive, pour faire tourner le roster ; séquelles permanentes reportées ; une blessure dure de 7 à 60 jours, la fatigue approche la semaine ; les morts de la Mission Test seront définitives. Les valeurs PLAYTEST sont codées et s'ajustent dans les données.
- **2026-10-03** — Profil temporaire d'équipement (Issue #12) : la meilleure école de magie est divisée par 2, comme la meilleure arme.
- **2026-10-03** — Taverne (PR #11) : l'Intendant est un rôle assigné par le joueur (aucun par défaut) ; départ après refus durci (coefficient 1,5, plafond 95 %) pour que les offres très basses ne soient pas une loterie.
- **2026-10-03** — Dortoir initial porté à **40 places** : l'escouade initiale peut compter jusqu'à 30 mercenaires plus le capitaine.
- **2026-10-03** — Taverne V1 (Issues #5 et #9) et horloge stratégique unique `AdvanceTime(days)`, résolue jour par jour : validées par Idan.
- **2026-10-03** — Combat V1 (PR #7) : toute attaque contre un personnage En Fuite est une Frappe dans le dos ; panique hors de sa propre activation = fuite immédiate de `MouvementBase` ; choix d'implémentation des attaques d'opportunité confirmés par Chatty.
- **2026-10-03** — Fuite V1 (Issue #8) : pas de nouveau test de Courage En Fuite ; un fuyard ne fait pas d'attaque d'opportunité ; ennemi actif = vivant et pas En Fuite ; sortie de carte prioritaire si atteignable ce tour-ci ; Mission Test : sortie de carte = hors combat.
- **2026-10-03** — Or de départ porté à **10 000 PO** (les salaires avaient été multipliés par 10) ; l'or de départ et les revenus seront recalés ensemble. Cible : **PC / Steam**, le téléphone n'est pas prioritaire.
- **2026-10-04** — Bios : principe validé, textes V0 acceptés tels quels ; la bio se découvre **au recrutement**, pas à la Taverne (Idan).
- **2026-10-04** — Fin de mission : la convalescence commence **dès la fin du combat**, le trajet de retour compte (Idan).
- **2026-10-04** — Camp V1 (Issue #23) : or et jours seulement ; un seul chantier majeur à la fois ; accélération par les mercenaires peut-être plus tard ; prérequis rares et logiques, sous forme d'**arbre** ; Dortoir de 40 places utilisable dès le jour 1 (Idan).
- **2026-10-04** — Nouvelle partie (Idan) : introduction du capitaine mourant (texte et voix d'Idan), puis création guidée ; un seul bouton « Vous n'êtes pas Bob ? », **pas de bouton « C'est moi »**. Le thème « Blood & Wages » accompagne l'arrivée au camp.
- **2026-10-04** — Avatars V1 (Idan) : même peuple obligatoire, le sexe vient de l'image ; attribution à la création de la compagnie et dès l'arrivée à la Taverne ; jamais deux fois le même visage en même temps ; un candidat qui repart libère le sien, celui d'un mort n'est plus attribué. Idan tague ses images dans **Bridge** (mots-clés : peuple, sexe, profil, magie, arme, culture, origine…) et le jeu choisit l'avatar le plus proche du mercenaire.
- **2026-10-04** — Paie V1 validée (Idan, après la review de Chatty) : contrat initial aux conditions demandées, sans négociation ; capitaine sans salaire ; blessés et fatigués payés à 100 % **pour l'instant**, le taux deviendra une option de l'**Intendance** ; trésor négatif sans conséquence **pour l'instant** ; 10 à 15 jours de réserve avec 10 000 PO : bon rythme, le bouton d'or sert aux tests.
- **2026-10-04** — L'**escouade initiale est sous contrat** ; l'or de départ sera ajusté si besoin (Idan). `test` et `main` : même rôle de version de test, mise en ligne autorisée.
- **2026-10-04** — Titre du jeu : **Blood & Wages**, accroche **« Manage your HR. Send them to die. »** (Idan, après vote de l'équipe). Le dépôt garde son nom de code « Mercenaires ».
- **2026-10-03** — Fin de mission : on tue assez, on ne blesse pas assez. La zone du jet de blessure passe de 0–20 % à **0–50 % des PV** ; les morts ne changent pas (Idan).

- **2026-10-21** — Taverne, musique : `assets/audio/tavern.mp3` (déposée sur Hostinger) joue en boucle dès qu'on entre à la Taverne et s'arrête en fondu quand on en sort ; le thème du camp se tait (Idan).
- **2026-10-21** — Taverne, conseils du tavernier (doc 14 §7) : candidat → groupe → caractéristique, 1 PO la question, sans limite ; il rapporte la vantardise du candidat (×1,10 à ×3,00) en phrase, située dans la compagnie ; une rumeur reste figée (Idan).
- **2026-10-21** — Taverne, écran Recruter (doc 14 §6 bis) : cartes en pied avec nom, peuple, culture, réputation et jours de présence ; « Aller lui parler » ouvre un dialogue : salutation selon l'affinité (20 phrases), réponses sincères (arme, style, tir, magie, origine), prétentions, puis Négocier / Signer, réponses dialoguées ; négociation inchangée (§9). Les trois questions chiffrées avec Intendant ne sont plus proposées (règle gardée dans le code, à arbitrer) (Idan).
- **2026-10-21** — Taverne, accueil : « Trouver une mission » et « Recruter » à gauche (taille des boutons du camp) ; une bulle sur le tavernier ouvre un dialogue façon jeu de rôle (« Salut [Prénom] ! Comment vont les affaires ? », phrase à varier plus tard) : bière (1 PO), tournée (1 PO par membre), conseils (grisé), partir ; le résultat va dans le journal (Idan).
- **2026-10-21** — Génération (doc 03) : Combat à mains nues, Pièges et Discrétion, tirés des caractéristiques, sont multipliés par 0,5 pour revenir à l'échelle des armes (1D20 / 2D20) ; seuls les nouveaux mercenaires sont concernés (Idan).
- **2026-10-21** — Magie (doc 12) : deux écoles opposées peuvent coexister chez un mercenaire ; mais progresser dans une école fait baisser ses opposées, ampleur à définir (Idan).
- **2026-10-21** — Fiche mercenaire, onglet Magie (provisoire) : puissance magique et réserve de mana en tête ; trois écoles de prédilection avec pictos ; roue des neuf écoles où chaque école fait face à ses deux opposées (`skills.json`) et dont la surface montre les points ; « Grimoire » à venir (Idan).
- **2026-10-21** — Barre du bas (doc 16) : petit calendrier et gros bouton play « Jour suivant » au centre ; or, entretien et effectif avec pictos à gauche ; journal de la compagnie intégré à droite ; plus d'almanach sur l'accueil du camp (Idan).
- **2026-10-21** — Noms (doc 02) : le prénom respecte le sexe donné par l'avatar ; les humains portent des noms de la consonance de leur culture : Soleil Levant japonais, Tribus de la jungle africain, Cités libres Europe de l'Ouest, Montagnes du Nord scandinave ou russe, Steppes désertiques indien (Idan).
- **2026-10-21** — Avatars : seul `media/avatars/` sur Hostinger compte, les anciens avatars de Git sont retirés ; le Design Lab liste les avatars à retaguer (« Affiner les tags ») ; la fiche montre l'affinité en dix cœurs et une phrase (PR #137) (Idan).
- **2026-10-20** — Affichage (doc 09) : réputation et renommée en étoiles dans le jeu, 15 niveaux (1 à 5 étoiles de bronze, d'argent, d'or) ; 5 étoiles d'or difficilement atteignables ; échelle proposée par JC3 (réputation 100 → 2 000, renommée × 4), à ajuster en jouant (Idan).
- **2026-10-20** — Recrutement (docs 14 et 09) : la renommée améliore les recrues, le tavernier présente le meilleur de N prétendants (N = 1 + ⌊(Renommée − 500) / 250⌋, de 1 à 5) ; l'affinité avec le capitaine déforme le salaire demandé (× (1 − 0,2 × Affinité / 100), escouade de départ comprise) et la résistance à la négociation (− 0,25 × Affinité) ; places de Taverne selon la renommée : plus tard (Idan).
- **2026-10-20** — Réputation de carrière (doc 09 §1) : « revenir blessé » = finir la mission avec le statut « Blessé » de fin de mission ; « Fatigué » compte comme indemne (Idan).
- **2026-10-20** — Affinité à la Taverne (docs 02 et 14 §6) : le score d'affinité avec le capitaine est visible sur la carte du candidat et dans l'entretien, même s'il laisse deviner une partie de l'alignement caché ; le détail des composantes reste réservé à la fiche des membres (Idan).
- **2026-10-20** — Affinité capitaine ↔ mercenaire, phase 1 (doc 02, PR #114) : score de −100 à +100 = peuple (matrice d'Idan, ligne mercenaire / colonne capitaine) + culture commune +2 + alignement 4 − 2 × distance sur la grille 3×3, normalisé sur deux branches ; affichage numérique sans libellé ; pas d'effet sur les négociations avant les coefficients d'Idan (Idan, via Chatty).
- **2026-10-20** — Renommée de compagnie (doc 09 §2, issue #111) : capitaine entier + membres vivants pondérés par rang (réputation / rang^1,5) + héritage permanent de 20 % de la contribution d'un mort au combat ; points de missions et développement du camp ajoutés plus tard, quand ils existeront ; plusieurs morts d'une même mission pondérés sur le classement du début de mission ; à réputation égale, le plus ancien est mieux classé (Idan).
- **2026-10-20** — Réputation de carrière (doc 09 §1) : le barème du doc 09 est confirmé, de préférence au barème proposé dans l'issue #110 (retour blessé +10 / indemne +20 exclusifs, CC +1, EC −1, 1 % de la réputation de chaque ennemi blessé, +10 % pour le coup de grâce) ; mise hors combat : JC3 tranche selon l'intention d'Idan (« une armée de troufions » ou « un dragon » rapportent, « un gobelin sans intérêt » peu) et garde la part proportionnelle à la réputation de l'ennemi (Idan).
- **2026-10-20** — Mise en ligne : jusqu'à nouvel ordre, JC3 met en ligne (`test` → `main`) sans redemander : Idan est le seul joueur et testeur sur Hostinger (Idan).
- **2026-10-20** — XP naturelle (doc 08) : Dextérité = enchaînements réussis ; Esquive = coups encaissés qui blessent ; Endurance = cases en armure lourde ; Volonté = tests de Courage réussis et reprises de contrôle ; Intelligence = pire choix de type de dégâts (apprendre de ses erreurs) ; sources multiples possibles. Compétences plafonnées à 100 (bonus temporaires ou magiques possibles plus tard ; génération au-delà de 100 non touchée pour l'instant), niveau continu (30,6) ; XP de pratique des armes, catégories, styles et Intimidation ; **on progresse au détriment des autres** : régression sur les armes des autres catégories, les autres catégories et les autres styles (Idan).
- **2026-10-20** — Combat (docs 04 et 08) : tous les choix d'implémentation des critiques, du combat à deux armes, des enchaînements, du bouclier, de la recharge et de la contre-charge sont **validés**, ainsi que l'XP de Chance (critiques au Toucher et à Blesser, échecs critiques confirmés, contrecoup compté comme blessure) ; fin de mission (doc 10) : la chaîne mort → blessure → fatigue s'applique après une victoire comme après une défaite, un mercenaire sorti de la carte en fuite la passe avec ses PV restants, les ennemis ne la passent pas (Idan).
- **2026-10-08** — Combat à deux armes (doc 04) : la **charge et la contre-charge utilisent les deux armes** ; deux pistolets tirent leur paire de base sans séquence suivante ; la seconde arme viendra avec un système de changement d'équipement négocié avec le mercenaire (Idan).
- **2026-10-08** — Combat (doc 04) : la **charge reste une seule attaque**, sans enchaînement ; au tir, les attaques d'opportunité des ennemis au contact sont résolues **une fois avant la séquence de tirs** ; contre-charge sur une distance impaire 2N+1 : réaction à la **case N+1** ; projectile raté : couloir de tir en **cône de 30°** (15° de part et d'autre de l'axe tireur → cible, sommet au tireur), compté de la moitié de la distance tireur–cible jusqu'à la portée max de l'arme ; armes à feu chargées au début de chaque mission, état chargé limité à la mission (Idan).
- **2026-10-07** — Force (doc 08) : XP par activation en mission = 20 × max(0 ; Charge ÷ Force − 0,25), Charge = malus de vitesse de base de l'armure et de toutes les armes équipées ; pas de poids distinct ; démarrage des valeurs générées au milieu de leur tranche validé (Idan).
- **2026-10-06** — XP naturelle (doc 08) : **calculée et appliquée en fin de mission** ; la valeur d'une caractéristique est son niveau (XP = 10 × Niveau²) et peut monter ou descendre ; Courage = **charge tentée** ; Charisme = **adversaire mis hors combat** ; récapitulatif pour le joueur dans le bilan ; toutes les valeurs en constantes d'équilibrage (Idan).
- **2026-10-05** — Hébergement : **Netlify est abandonné** faute de crédits. Le prototype web doit migrer vers **Hostinger** (Idan).
- **2026-10-05** — Gouvernance visuelle : **JC intègre mais ne crée ni ne transforme les assets visuels de sa propre initiative**. Direction artistique = Idan ; production = Jean-Mimi ; cadrage / cohérence d'usage = Chatty ; intégration technique = JC.

## En attente de décision

Tout est rassemblé, pour Idan, dans [`docs/design/93-pending-and-parked.md`](design/93-pending-and-parked.md) (Design Lab, bouton « À décider ») : décisions attendues, sujets reportés, équilibrage à surveiller, ménage technique.

## Dépendances

- La Taverne a besoin de la boucle de temps (`AdvanceTime`), d'un état de partie persistant (`Game` / `Company`) et du générateur de mercenaires.
- Sauvegarde (review Chatty, PR #15) : quand missions, retour, blessures, fatigue, paie et constructions passeront par `AdvanceTime`, toute modification de l'état de partie devra être sauvegardée par un même point central, jamais par un chemin à part.
- Combat lot 1 : l'Attaque d'opportunité et l'Encerclement appliquent la Frappe dans le dos ; la Fuite dépend du Courage et peut déclencher des Attaques d'opportunité.
