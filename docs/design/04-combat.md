> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# 03 — Combat

Règles de résolution du combat. La V1 conserve un pipeline physique commun et choisit les formules selon le type d'attaque.

<aside>
⚔️

Pipeline physique : **Portée légale → Toucher → Critique positif éventuel → Blesser → Dégâts PV → Courage éventuel**. Le CAC et la distance partagent cette structure mais pas toutes les formules.

</aside>

Les registres complets de formules, termes et constantes sont rangés dans **05 — Référentiels techniques**.

[Types de dégâts](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/03%20%E2%80%94%20Combat/Types%20de%20d%C3%A9g%C3%A2ts%205db7647603614c41bb7acc47a89986d6.csv)

[Mécaniques à intégrer ensuite](/design/#doc=90-mechanics-backlog.md)

[États](https://github.com/Idan84/Mercenaires/blob/main/archive/notion-export/Priv%C3%A9%20et%20partag%C3%A9/Jeu%20de%20Mercenaires/03%20%E2%80%94%20Combat/%C3%89tats%20a2ea68aea2414a24a343f374c6fb19e3.csv)

## Grille, activation & mouvement V1

- Grille **hexagonale**.
- En V1, un personnage standard occupe **1 hexagone**.
- [Activation hexagonale V1](/design/#doc=formulas/activation-hexagonale-v1.md) : une activation fournit **Mouvement + Action rapide + Attaque**, dans l'ordre choisi ; le mouvement est fractionnable et l'Attaque peut être remplacée par un second Mouvement.
- [Mouvement hexagonal V1](/design/#doc=formulas/mouvement-hexagonal-v1.md) : `MouvementBase` est calculé à partir de Vitesse combat effective, Endurance et Volonté.
- [Portée d'arme V1](/design/#doc=formulas/portee-d-arme-v1.md) : une arme de mêlée standard vaut implicitement 1–1 ; les armes d'hast configurées 1–2 utilisent toujours le pipeline CAC.

## Initiative & ordre interne V1

[Initiative interne d'équipe V1](/design/#doc=formulas/initiative-interne-d-equipe-v1.md) est calculée **avant la mission** et visible pendant la préparation.

- Les équipes jouent l'une après l'autre ; l'équipe qui commence est fixée par le **scénario**.
- L'initiative ne sert qu'à ordonner les personnages **au sein de leur équipe**.
- Aucun jet aléatoire : `VitesseCombatEffective + 0,25×Intelligence + 0,10×Courage + 0,05×Volonté`.
- Égalité : Courage le plus élevé ; égalité parfaite restante = assert / erreur de développement pour l'instant.
- La Fatigue sera intégrée plus tard comme système global.

## Attaque d'opportunité CAC V1

[Attaque d'opportunité CAC V1](/design/#doc=formulas/attaque-d-opportunite-cac-v1.md) formalise les réactions de zone de menace.

- Sortir de la zone menacée par un adversaire déclenche sa réaction ; rester à l'intérieur de sa portée ne suffit pas.
- Chaque adversaire dont on quitte la zone peut réagir.
- L'attaque est résolue **avant** la fin du déplacement ou de l'action qui l'a déclenchée.
- La cible ne conserve que **50 % de son Esquive effective** et sa Perception défensive est supprimée du Toucher.
- Une arme = **un coup**, sans enchaînement ; combat à deux armes = **un coup avec chaque arme**, donc deux coups, sans cadence supplémentaire.
- La fuite peut elle-même déclencher ces réactions.
- Toute attaque d'opportunité bénéficie également de [Frappe dans le dos V1](/design/#doc=formulas/frappe-dans-le-dos-v1.md).

## Frappe dans le dos & encerclement V1

[Frappe dans le dos V1](/design/#doc=formulas/frappe-dans-le-dos-v1.md) annule la **Perception défensive** au Toucher et divise par deux la **résistance au type de dégâts** utilisée pour Blesser. La Résistance physique % qui réduit ensuite les PV n'est pas modifiée.

- Toute attaque d'opportunité en bénéficie.
- Elle s'applique contre une cible en train de fuir ou à une attaque non détectée.
- [Encerclement CAC V1](/design/#doc=formulas/encerclement-cac-v1.md) : deux ennemis au contact sur des cases **non adjacentes entre elles** suffisent ; une fois la cible encerclée, **tous** ses adversaires au CAC bénéficient de Frappe dans le dos.
- Pas de blocage au bouclier (Idan, 2026-11-04).

## CAC V1 — Toucher, Blesser & dégâts

1. **Toucher** : [Toucher CAC V1](/design/#doc=formulas/toucher-cac-v1.md).
2. **Blesser** : [Blesser CAC V1](/design/#doc=formulas/blesser-cac-v1.md).
3. **Dégâts PV physiques** : [Dégâts PV physiques V1](/design/#doc=formulas/degats-pv-physiques-v1.md).

## Critiques physiques V1

- **Après Toucher réussi** : jet de critique via Chance. En cas de réussite, [Critique toucher — armure ignorée V1](/design/#doc=formulas/critique-toucher-armure-ignoree-v1.md) ignore l'armure uniquement pour l'étape Blesser.
- **Toucher naturel 96–100** : test d'échec critique ; échec du test de Chance → **Au Sol** via [Échec critique CAC V1](/design/#doc=formulas/echec-critique-cac-v1.md).
- **Après Blesser réussi** : un critique positif peut imposer les dégâts maximum via [Critique de blessure positif CAC V1](/design/#doc=formulas/critique-de-blessure-positif-cac-v1.md).
- **Blesser naturel 96–100** : échec du test de Chance → [Échec critique de blessure CAC V1](/design/#doc=formulas/echec-critique-de-blessure-cac-v1.md) inflige à l'attaquant les dégâts minimum de son propre coup.
- La V1 distance réutilise ce même principe de critiques ; les exceptions propres à des armes ou sorts seront ajoutées séparément si nécessaire.

Choix d'implémentation V1, validés par Idan le 2026-10-20 :
- un seul jet de critique par étape : au Toucher (armure ignorée), puis à Blesser (dégâts maximum), avec la même probabilité Chance / 10 ;
- en charge, la blessure critique et le contrecoup gardent le multiplicateur de charge : seuls le jet de dégâts et la variation de Résistance physique sont imposés ;
- au tir, les quatre critiques s'appliquent avec la formule de dégâts à distance (sans la Force) : un échec critique au Toucher met le tireur Au Sol, un échec critique à Blesser lui inflige le contrecoup ;
- Au Sol dure jusqu'à la prochaine activation du personnage, comme après une chute en charge.

## Vitesse, prise et cadence CAC V1

Les règles validées de maniement et cadence sont centralisées ici :

- [Vitesse combat effective CAC V1](/design/#doc=formulas/vitesse-combat-effective-cac-v1.md) : Vitesse après armure et objets tenus.
- [Malus vitesse arme effectif V1](/design/#doc=formulas/malus-vitesse-arme-effectif-v1.md) : inertie de l'arme, qualité et compensation par les maîtrises.
- [Enchaînement d'attaques CAC V1](/design/#doc=formulas/enchainement-d-attaques-cac-v1.md) : enchaînement d'attaques avec une arme.
- [Prise d'arme et mode deux mains V1](/design/#doc=formulas/prise-d-arme-et-mode-deux-mains-v1.md) : prises `1 main`, `2 mains`, `Au choix`.
- [Combat à deux armes CAC V1](/design/#doc=formulas/combat-a-deux-armes-cac-v1.md) : combat à deux armes.

**Combat à une main** (Idan, 2026-11-02) : avec une arme à une main tenue seule, l'autre main vide — le pistolet compris
(la fronde se tient à deux mains), une arme `Au choix` tant qu'elle n'est pas empoignée à deux mains — **Esquive effective + 0,2 × Combat à
une main** (`combat.one_handed.dodge_factor`), contre tous les jets qui lisent l'Esquive effective (corps à corps, tir,
sorts). Une main à 50 : +10 d'Esquive, une attaque à 50 % passe à 40 %. Au Sol, l'Esquive reste à 0. Le style se tire à la
création comme Combat à deux armes et progresse de +10 XP par attaque (doc 08). Sur la fiche, la ligne « Combat à une
main » apparaît dans le détail de l'Esquive. Plus tard, peut-être : une seconde action rapide (Idan : « on verra plus tard
si besoin »).

**Attaquer à deux mains** (Idan, 2026-11-02) : une arme `Au choix` tenue seule est à une main par défaut ; le bouton
« Attaquer à deux mains » l'empoigne pour l'attaque (dégâts × 1,5, Combat à deux mains au Blesser) et elle le reste jusqu'au
prochain tour du combattant. La charge se fait à une main. L'IA empoigne à deux mains quand Combat à deux mains ≥ Combat
à une main. Voir [Prise d'arme et mode deux mains V1](/design/#doc=formulas/prise-d-arme-et-mode-deux-mains-v1.md).

Choix d'implémentation V1 du combat à deux armes, validés par Idan (2026-10-08 et 2026-10-20) :
- on combat à deux armes quand chaque main du set actif tient une **arme** (un bouclier n'en est pas une) ;
- [Prise d'arme et mode deux mains V1](/design/#doc=formulas/prise-d-arme-et-mode-deux-mains-v1.md) : une arme `2 mains` exige une main secondaire vide. Ce qui serait rangé à côté d'elle (bouclier ou seconde arme), comme une arme `2 mains` rangée en main secondaire, n'est pas tenu : pas de paire, pas de blocage, pas de malus de vitesse (correction après la revue Chatty du 2026-10-20) ;
- la **Dextérité effective** `Dextérité / (2 − Combat à deux armes / 100)` remplace la Dextérité au Toucher (CAC et distance) et dans les enchaînements ;
- à chaque séquence, chaque arme **utilisable** frappe une fois, principale puis secondaire, chacune avec son mode : épée + pistolet = la lame au contact, le pistolet au contact comme à distance ; une arme déchargée ou hors portée est sautée ;
- attaque d'opportunité : un coup avec chaque arme de mêlée, puis un seul test de Courage ; la zone de menace couvre la portée de chaque arme de mêlée tenue ;
- décision Idan du 2026-10-08 : la **charge** et la **contre-charge** se font avec **les deux armes**. À l'arrivée de la charge, chaque arme utilisable frappe une fois, sans séquence suivante (la charge reste une seule attaque) ; chaque arme de mêlée reçoit le bonus de charge selon son propre `Bonus charge base` ; la chute de charge n'est tirée qu'une fois ; un échec critique coupe la seconde arme. En contre-charge, chaque arme qui le permet riposte une fois, à son propre moment (pistolet à mi-course, arme d'hast à l'entrée dans sa portée) ; la première riposte qui blesse brise la charge ;
- deux pistolets : la paire de base seulement, sans séquence suivante (la séquence est une règle CAC) ;
- aucun mercenaire n'a encore de seconde arme à la création : elle viendra avec le système de changement d'équipement (négociation avec le mercenaire, Idan, 2026-10-08).

Choix d'implémentation V1 des enchaînements (attaques CAC et tirs `Répétable`) :
- validés par Idan le 2026-10-08 : la **charge** reste une seule attaque (« arrivée suivie d'une attaque », Charge CAC V1), sans enchaînement ; au tir, les attaques d'opportunité des ennemis au contact sont résolues **une fois**, avant la séquence de tirs, pas avant chaque tir ;
- validés par Idan le 2026-10-20 : la chaîne vise toujours la même cible et s'arrête si elle n'est plus à portée (par exemple après avoir fui) ;
- Courage : un seul test en fin de séquence ([Courage post-attaque CAC V1](/design/#doc=formulas/courage-post-attaque-cac-v1.md), [Courage post-tir V1](/design/#doc=formulas/courage-post-tir-v1.md)) ; une cible en sous-nombre teste après chaque blessure reçue et ne reteste pas en fin de séquence.

## Bouclier physique V1

La même règle de blocage s'applique au **CAC et aux projectiles physiques**, sans malus spécifique au tir. Il est trop fort (Idan, 2026-11-04 : « 3 + limiter à un blocage par tour. C'est surtout ça le problème ») : **pas de blocage contre une Frappe dans le dos** / une attaque non détectée, et **un seul blocage réussi par tour** (les coups suivants passent ; chacun retrouve son blocage au début du tour suivant).

Un bouclier intervient **après un Toucher réussi et avant le critique positif de Toucher** via [Blocage bouclier physique V1](/design/#doc=formulas/blocage-bouclier-physique-v1.md).

Choix d'implémentation V1, validés par Idan le 2026-10-20 :
- le bouclier compte s'il est tenu en main secondaire du **set actif** ;
- son `Bonus blocage base` est lu dans `skills.json` (ligne du bouclier : Rondache 5, Écu 10, Pavois 20), `weapons.json` n'ayant pas cette colonne ;
- son malus de vitesse s'ajoute à celui de l'arme ([Vitesse combat effective CAC V1](/design/#doc=formulas/vitesse-combat-effective-cac-v1.md)), et une arme `Au choix` tenue avec lui passe en mode une main ;
- à la création, aucun mercenaire ne reçoit encore de bouclier : seules les armes principales des sets sont remplies (05-equipment). Le blocage n'apparaîtra en Mission Test qu'avec une règle d'attribution des boucliers.

**Fléau d'armes** (Idan, 2026-10-29) : contre lui, la chance de blocage du bouclier est divisée par deux.

Un blocage réussi signifie que l'attaque n'a pas réellement touché : pas de critique positif, pas de Blesser, pas de dégâts. Il casse l'enchaînement normal. En combat à deux armes, chaque attaque de la paire est testée séparément et la paire peut continuer si au moins une attaque touche réellement.

## Parade du saï (Idan, 2026-10-29)

Un **saï** tenu dans le set actif pare **5 %** des coups **tranchants** de mêlée, **10 %** avec deux saïs (un par main). Le jet a lieu après le Toucher, le blocage éventuel du bouclier et le critique au Toucher, une fois le type de dégâts du coup choisi : un coup perforant ou contondant n'est jamais paré. Comme un blocage, un coup paré n'a pas réellement touché : ni Blesser, ni dégâts, ni enchaînement, ni arme enchantée. La qualité ne change pas la chance. Données : `weapons.json`, colonnes `parade_type` et `parade_chance`.

## Courage post-attaque CAC V1

<aside>
🧠

**Exceptions positionnelles V1 :** un attaquant participant à un encerclement valide ne teste pas son Courage s'il ne blesse pas ; une cible en sous-nombre utilise [Courage en sous-nombre V1](/design/#doc=formulas/courage-en-sous-nombre-v1.md) et teste immédiatement **après chaque blessure reçue**, avec `−10` au score par ennemi de surplus dans la mêlée locale.

</aside>

La règle ci-dessous reste le cas général hors de ces exceptions.

[Courage post-attaque CAC V1](/design/#doc=formulas/courage-post-attaque-cac-v1.md) est résolu **une seule fois en fin de séquence offensive** :

- au moins une blessure infligée → le défenseur teste normalement ;
- aucune blessure → l'attaquant teste, mais sa probabilité de fuite est divisée par deux.

<aside>
🧠

Score de base : **Courage + 0,25 × Volonté − 0,25 × Intimidation adverse**, borné à 5–95 % avant l'ajustement du cas sans blessure.

</aside>

## Tir & armes à distance V1

Le tir est construit comme un combat physique à distance, sans créer un second moteur.

- **Toucher** : [Toucher distance V1](/design/#doc=formulas/toucher-distance-v1.md). Aucun malus jusqu'au quart de la portée max ; ensuite le malus croît jusqu'à `−40` au Delta à portée max. La couverture multiplie la probabilité finale par `0,5` ou `0,25`.
- **Blesser** : [Blesser distance V1](/design/#doc=formulas/blesser-distance-v1.md). La **Perception remplace la Force**.
- **Dégâts physiques** : [Dégâts PV physiques distance V1](/design/#doc=formulas/degats-pv-physiques-distance-v1.md). Aucun facteur Force : l'énergie est encodée dans les dés et puissances de l'arme.
- **Cadence** : [Enchaînement de tirs distance V1](/design/#doc=formulas/enchainement-de-tirs-distance-v1.md) pour les armes `Répétable` : arc, arbalète (Idan, 2026-11-06 : « Pour moi l'arbalète était comme l'arc » ; elle était en `Tir unique`), fronde, sarbacane. Les armes à feu tirent une fois.
- **Projectile raté / approximation** : [Approximation projectile V1](/design/#doc=formulas/approximation-projectile-v1.md) peut toucher accidentellement un allié ou ennemi dans le couloir de tir. **Couloir de tir** (décision Idan du 2026-10-08) : cône de **30°** depuis le tireur, centré sur l'axe tireur → cible, compté de la **moitié de la distance** de la cible jusqu'à la **portée max** de l'arme (constantes `combat.ranged.stray.cone_angle`, `combat.ranged.stray.corridor_start_ratio`).
- **Courage** : [Courage post-tir V1](/design/#doc=formulas/courage-post-tir-v1.md). Une cible réellement blessée peut fuir ; le tireur ne teste jamais son Courage simplement parce qu'il a raté ou n'a pas blessé.
- **Armes à feu** : [Armes à feu — recharge et double pistolet V1](/design/#doc=formulas/armes-a-feu-recharge-et-double-pistolet-v1.md) : pas de stock de munitions normales ; **recharger une arme = 1 Action rapide** ; épée + pistolet et deux pistolets suivent le combat à deux armes, avec inerties cumulées et une attaque de base par arme actuellement utilisable.

Choix d'implémentation V1 de la recharge :
- validés par Idan le 2026-10-08 : toutes les armes à feu sont **chargées au début de la mission** ; l'état chargé ne dure que la mission ;
- validés par Idan le 2026-10-20 : les armes à recharge sont celles marquées `recharge_action_rapide` dans `skills.json` (Pistolet, Arquebuse, Tromblon, Canon à main) ;
- l'arme se décharge dès que le coup part, qu'il touche ou non ;
- l'IA recharge avec son Action rapide quand son arme est déchargée (après un éventuel changement d'arme, qui consomme aussi l'Action rapide).

Choix d'implémentation V1 de l'approximation, validés par Idan le 2026-10-08 :
- elle suit tout tir raté, y compris un échec critique au Toucher, et aussi un tir de contre-charge ; un tir **bloqué** par un bouclier s'arrête là ;
- le candidat touché suit la suite normale d'un toucher : blocage, critique, Blesser, dégâts ; la chaîne de tirs s'arrête, puisque la cible visée n'a pas été touchée ;
- le personnage blessé par accident teste son Courage face au tireur (Courage post-tir V1), même s'il est son allié ;
- un allié mis hors combat par accident ne compte pas pour l'XP de Charisme ;
- le Tromblon, arme de zone dans `skills.json`, n'y est pas soumis (« ne s'applique pas aux attaques de zone ») ;
- la Mission Test n'a ni décor ni couverture : aucun obstacle ne coupe le couloir.

Une attaque à distance exige une **ligne de vue**. En V1, les éléments de décor indiquent directement leur protection : aucune, **partielle (`×0,5`)**, **forte / quasi-totale (`×0,25`)** ou **blocage total de ligne de vue** (tir impossible). Le sort **Brouillard** (doc 12, école de l'Eau) coupe déjà la ligne de vue : aucun tir ni sort à travers, depuis ou vers une case de brouillard (la ligne droite entre les deux cases, extrémités comprises). Le **Champ de protection** (doc 12, Télékinésie) dévie la moitié des projectiles tirés sur le personnage protégé, avant le jet de toucher.

Tirer sur une cible distante alors qu'un ennemi est adjacent reste autorisé, mais provoque l'[Attaque d'opportunité CAC V1](/design/#doc=formulas/attaque-d-opportunite-cac-v1.md) de cet ennemi. Tirer sur l'ennemi qui vous menace avec une arme autorisée au contact ne déclenche pas cette réaction.

## Discrétion et camouflage (Idan, 2026-10-28)

- **Camouflé** : un personnage qu'aucun ennemi n'a encore vu est camouflé, **invisible pour l'armée ennemie**. Au début du combat, tout le monde l'est.
- **Repérage** : au **début de chaque tour** (et au début du combat), chaque personnage fait un test de Perception pour chaque ennemi encore camouflé **dans sa ligne de vue** (le Brouillard l'empêche) : **P = 100 / (1 + e^(−Δ/15))**, **Δ = 2 × (Perception − (Discrétion + couverture)) + 40 − 5 × distance**, de **0,1** à 95 %, jet au centième (`combat.stealth.*` ; Idan : « le mec à 3 cases, on le voit » ; 2026-11-09 : « une courbe qui récompense grandement la discrétion et la perception », « la couverture doit vraiment booster le repérage. Un mec discret qui avance à découvert se fait voir. Mais celui qui a chaque tour est caché derrière un décor... » : l'écart compte double, `combat.stealth.gap_factor`). Un seul succès suffit : l'ennemi est **repéré par toute l'armée, pour toute la partie** (Idan : on ne redevient jamais camouflé).
- **Armure** (Idan, 2026-11-12 : « je pense qu'il faudrait mettre des malus de discrétion sur les grosses armures ») : l'armure retire de la Discrétion les mêmes points que de l'Esquive, × le malus de sa qualité — Plates 16, Écailles 12, Brigandine 9, Mailles 8, Cuir renforcé 5, Cuir 3, Gambison 2, Vêtements 0 (`base-armors.json`, `malus_discretion_base` ; `combat-engine.js`, `effectiveStealth`) ; au repérage comme pour l'éclaireur ; la fiche le montre.
- **Couverture** (Idan : « un bonus de discrétion important ») : **+30** de Discrétion derrière une couverture partielle, **+60** derrière une couverture totale (le décor, 2026-11-06 : section « Décor »).
- **Invisible** : on ne peut ni l'attaquer, ni le charger, ni le viser avec un sort (les sorts de zone le touchent quand même) ; l'IA ne le choisit pas comme cible ; personne ne lui porte d'attaque d'opportunité ni de contre-charge.
- **Il agit sans se découvrir** (Idan : on attaque, tire et lance des sorts « tout en étant et restant camouflé ») : son attaque est une **attaque non détectée**, donc une **Frappe dans le dos V1** (la cible ne se défend pas avec sa Perception ; la résistance de son armure est divisée par deux pour Blesser) ; un sort qui vole comme une flèche ignore lui aussi la Perception de la cible.
- Exemples : un archer gobelin novice (Perception 62) repère un mercenaire de Discrétion 30 à 95 % à 3 comme à 8 cases ; à 6 cases, 72 % derrière une couverture partielle, 4,5 % derrière une couverture totale ; un lancier gobelin novice (Perception 43) à 60 % à 12 cases ; sous Avancée cachée (+52 de Discrétion), l’archer ne le repère plus qu’à 12 % à 6 cases, 0,1 % s'il est en plus derrière une couverture totale. Perception 60 contre Discrétion 100 à 5 cases : 1,3 %.
- **Brouillard de guerre** (Idan, 2026-11-09 : « on les voit sur la carte en grisé. Je voudrais qu'ils disparaissent totalement ») : un ennemi camouflé **n'apparaît nulle part** — ni sur la carte, ni dans la liste, ni dans l'ordre d'initiative, ni dans le journal (« Un ennemi invisible » ; ses déplacements n'y sont pas écrits). Celui qui entre dans une case où se cache un ennemi invisible **tombe nez à nez** avec lui : il s'arrête là, l'ennemi est repéré et les deux camps donnent l'alerte.
- **IA aveugle** (Idan, 2026-11-09 : « l'IA ne doit pas connaître nos mecs pas cachés ! Si elle ne voit personne, elle ne sait pas qu'elle est attaquée, donc elle bouge pas ou fait des rondes ») : au début du combat, la moitié des ennemis font des **rondes** (au plus 2 pas par tour, à 3 cases au plus de leur poste ; `combat.ai.patrol_share`, `combat.ai.patrol_radius`), les autres montent la **garde** (ils ne bougent pas). L'ennemi **donne l'alerte** quand il repère l'un des nôtres, quand l'un des siens est frappé ou touché par un sort (« L’ennemi donne l’alerte. »). Alerté, sans personne en vue, il va **fouiller l'endroit d'où venait le coup** (ou celui où l'un des nôtres a été vu) ; la piste perdue, il reprend sa garde ou sa ronde. L'IA ne vise, ne fuit et ne se range que face à ce qu'elle voit. Notre équipe en combat automatique sait où est le camp ennemi.
- **Second mouvement de l'IA** : un combattant de l'IA qui ne peut pas avancer d'une seule case (un nain lent au pied d'une forêt en montée) renonce à attaquer pour un second mouvement, comme le joueur.
- **L'éclaireur** (Idan, 2026-11-09 : « On peut, avant le combat envoyer un éclaireur choisi parmi les mercenaires de la mission. Il peut ne pas revenir ! ( Test en fonction de sa discrétion et la perception de chaque ennemi) La chance de se faire repérer reste faible. S'il est repéré, on le récupère Indemne comme prisonnier si on gagne la mission. Sinon, il est considéré comme mort » ; « on ne peut pas envoyer un compagnon animal seul. Il peut y aller avec son maître, donc discrétion de son maître » ; « On envoie après les jours de marche, pas depuis la taverne ») : à l'arrivée d'un contrat ou d'une chasse, la fenêtre « Escouade sur place » propose **Envoyer un éclaireur** (les plus discrets d'abord). Chaque ennemi tente de le repérer à **8 cases** (`combat.scout.distance`), l'éclaireur derrière une **couverture totale** (+60), avec **sa propre Discrétion** (son animal le suit) : un garde ordinaire (Perception 60) repère un éclaireur de Discrétion 30 à **1,8 %**, de Discrétion 80 au plancher (0,1 %). **Un seul succès : il est capturé**, avec son animal ; il quitte le combat. Sur une **victoire**, il est libéré **indemne** et rentre avec l'escouade ; sur une **défaite**, il est **perdu** (mort), son animal aussi. Parti seul et capturé : personne ne se bat, la mission est perdue. **Pas vu**, il cherche à son tour chaque ennemi, à 8 cases, à découvert : ceux qu'il voit **commencent le combat repérés** ; il peut en manquer. Code : `resolveScouting` (moteur), `resolveMissionScouting`, `revealMissionScouted`.
- **Son rapport et le déploiement** (Idan, 2026-11-09 : « Il revient et nous donne des infos : La topologie de la carte / Les positions des ennemis qu'il a repéré ( il peut en avoir qu'il ne voit pas) / Et nous permet soit de rebrousser chemin ( mission perdue mais sans mort !). Soit de gérer le déploiement. On peut positionner nos mercenaires où on veut sur une bande de 4 cases autour de la carte ») : revenu, le combat s'ouvre sur la phase **Déploiement · rapport de l'éclaireur** : la carte et les seuls ennemis qu'il a vus. On clique l'un des nôtres, puis sa case sur la **bande de 4 cases** tout autour de la carte (`combat.deploy.band` ; ni décor infranchissable, ni case prise) ; puis **Lancer le combat** (les ennemis vus restent repérés ; notre équipe a l'initiative) ou **Rebrousser chemin** : le contrat est perdu (la renommée de l'échec, −30), **sans combat ni mort**, sans récompense, et l'escouade rentre au camp. Sans éclaireur, ou s'il est capturé, le déploiement reste celui d'avant (le bord gauche). Code : `startMissionDeployment`, `missionDeployCells`, `startMissionAfterDeployment`, `retreatMissionExpedition`.

## Décor (Idan, 2026-11-06)

« Franchissable / infranchissable. Couverture : sans / partiel / totale » ; « je distinguerais ligne de vue et couverture. Le
mec est derrière un gros rocher, on le voit, on peut le viser, mais il est protégé. Derrière une forêt, on voit pas » ; « il
peut y avoir une subtilité dans franchissable : vitesse réduite ». Données : `terrain-decors.json` ; code :
`prototype-web/mission.js` (décor, chemins, vue, couverture), `game-core/combat-engine.js` (`COVER`, `CHARGE_FALL`).

**Trois réglages indépendants par décor** :

| Décor | Passage | Vue | Couverture |
|---|---|---|---|
| Buissons | ½ | laisse voir | partielle |
| Forêt | ½ | bloque | partielle |
| Blé haut | ½ | bloque | sans |
| Marais, eau peu profonde | ⅓ | laisse voir | sans |
| Éboulis | ⅓ | laisse voir | partielle |
| Muret, caisses | infranchissable | laisse voir | partielle |
| Gros rocher | infranchissable | laisse voir | totale |
| Mur, maison | infranchissable | bloque | totale |
| Gouffre, eau profonde | infranchissable | laisse voir | sans |
| Palissade (Idan, 2026-11-06 : « palissade nouvelle ») | infranchissable | laisse voir | partielle |

- **Passage** : entrer dans une case lente coûte **2** (½), **3** (⅓) ou **4** (¼) points de mouvement (Idan : « parfait ») ;
  les chemins prennent le moins cher (à coût égal, le moins de cases) ; une case infranchissable ne se traverse pas (ni
  déplacement, ni charge, ni déplacement forcé : on la heurte ; on n'y invoque rien).
- **Vue** : un décor qui bloque coupe la ligne de vue (ni tir, ni sort visé, ni repérage à travers), comme le Brouillard ;
  **dedans, on ne voit et on n'est vu qu'au contact** (Idan : « oui »). Une ligne qui passe **pile entre deux cases** (elle
  frôle le coin d'un décor) n'est coupée que si **les deux** la coupent (Idan, 2026-11-14 : « Frôler ne bloque pas ») :
  depuis le coin d'un mur, on se penche pour tirer, nous comme l'ennemi, dans toutes les directions (`hexLineSides` ; avant,
  le jeu prenait toujours le même côté, et un mur collé à droite du tireur coupait plus de tirs qu'à gauche). Pareil pour
  l'altitude, le Brouillard et le Blizzard.
- **Couverture** (Idan : « au tir et en défense de charge ») : la cible est couverte par le décor **collé à elle sur la
  ligne** qui vient de l'attaquant (pas la case de l'attaquant : un muret collé au tireur ne gêne pas son tir), ou par
  **sa propre case** (dans les buissons) ; la meilleure des deux. Pour une charge, la ligne part de la case de départ.
  - **partielle** : Toucher **× 0,5** (`combat.cover.partial_hit_factor`), **+30** de Discrétion au repérage ;
  - **totale** : Toucher **× 0,25** (`combat.cover.total_hit_factor`), **+60** de Discrétion ; on le voit et on peut le viser.
  - Aussi contre les **sorts qui volent comme une flèche** (Idan : « oui pour les sorts qui volent ») : Trait de feu, Flèche
    de glace, Éclair, Lancer de pierre, Choc psychique, Flèche de mort, crachat de venin. Pas au corps à corps (hors
    charge), ni contre les zones et les autres sorts.
- **Charge** (Idan : « Elle peut, mais on augmente la proba d'échec critique, pieds dans le tapis ») : elle traverse un
  décor lent ; la chute de charge (2 %) gagne **+5 % × (coût − 1)** par case lente de la course
  (`combat.charge.fall_per_slow_step` ; Idan : « oui ») : +5 % par case à ½, +10 % à ⅓, +15 % à ¼.
- **Affichage** (Idan : « des couleurs pour commencer », puis « Tu peux faire mieux que juste de la couleur ? ») : sous la
  case, la couleur du décor et un motif dessiné (arbres, buissons, épis, roseaux, vagues, pierres, muret, caisses, rocher,
  briques, toit, gouffre ; `styles.css`, en attendant de vraies images) ; plus sombre sur les bords quand on ne la traverse
  pas ; le survol de la case dit ce qu'elle fait ; l'aperçu d'une attaque montre la couverture.
- **Cartes** : la Mission Test pose 4 à 6 groupes de décor au hasard entre les deux lignes de déploiement (étape 1), et du
  relief (étape 2, « Altitude » ci-dessous).
- **Cartes de contrat** (étape 3 ; Idan, 2026-11-06 : « Oui pour les paysages », « camp en hauteur oui ») : un **paysage par
  faction**, tiré au hasard à chaque combat, d'après les lettres de contrat (`mission-landscapes.json`,
  `game-core/mission-terrain.js`) :

  | Faction | Paysage | Décor (poids) | Relief |
  |---|---|---|---|
  | Gobelins | Vieille carrière | éboulis, gros rochers, buissons, caisses, marais | camp sur un plateau de hauteur 2 |
  | Ogres | Carrière | gros rochers, éboulis, buissons, eau peu profonde | camp sur un plateau de hauteur 2 |
  | Orcs | Camp | caisses, murets, gros rochers, buissons, marais | collines basses |
  | Hommes-bêtes | Clairière en forêt | forêt épaisse, buissons, marais ; le camp dans une clairière | collines |
  | Voleurs | Repaire | maisons, murs, caisses, blé haut, eau peu profonde | collines basses |

  10 à 18 groupes de décor (28 à 36 en forêt) sur la carte de 30 × 15 : en moyenne 24 à 37 cases de décor, 130 pour la forêt
  des hommes-bêtes. Sur la carte de 36 × 25 (le camp au centre, Idan 2026-11-09), les groupes de décor et les collines sont
  multipliés par le rapport des surfaces (× 2) : même densité (`carte_reference` de mission-landscapes.json). **Le camp des carrières** est sur un **plateau** (le camp et une case autour) **bordé de falaises**, avec
  **1 ou 2 rampes**, dont une au moins face à votre escouade. Pas de décor à 2 cases ou moins de votre escouade ni sur ses
  colonnes de déploiement, ni à côté des ennemis (4 cases pour la clairière). **Garde-fou** : chacun peut toujours atteindre
  l'ennemi à pied (sinon on retire, jusqu'à 30 fois, puis la carte garde son relief sans décor). Mesure : 1 500 combats
  automatiques sur ces cartes, tous terminés (9 tours en médiane).
- **Enceinte du camp** (étape 3b ; Idan, 2026-11-06 : « palissade nouvelle », « vas-y pour la palissade et l'enceinte ») :
  une **palissade** (bois : infranchissable, laisse voir, couverture partielle ; un motif de pieux) en anneau à **2 cases**
  de l'ennemi le plus proche, avec **2 ou 3 ouvertures de 2 cases**, dont une face à votre escouade, les autres à 4 cases au
  moins l'une de l'autre ; rien devant une ouverture (`mission-landscapes.json`, `enceinte`). **Carrières** (gobelins,
  ogres) : le plateau va jusqu'à l'enceinte, posée sur son bord, et **chaque ouverture a sa rampe**. **Pas d'enceinte dans
  la clairière** des hommes-bêtes (la forêt suffit). La palissade n'est pas tirée au hasard dans la Mission Test. Mesure :
  1 000 combats automatiques avec l'enceinte, tous terminés.
- **L'IA** avance vers sa cible par le vrai chemin, autour du décor. Quand elle ne voit personne (le décor coupe la vue),
  elle va chercher l'ennemi le plus proche (elle sait à peu près où il est), l'attaque si elle le voit alors, sinon un tireur
  que personne ne voit guette (mode sentinelle) : sans cela, un combat sur 12 environ se figeait, chacun attendant l'autre
  derrière le décor (mesure sur 150 combats de Mission Test ; plus aucun sur 300 après).
- **Un tireur qui ne peut pas tirer d'où il est** (trop près : un arc ou une arbalète ne tire pas à moins de 2 cases ; trop
  loin ; hors de vue) **se place pour tirer** : la case la moins chère de son mouvement d'où il a la portée et la vue, en
  provoquant le moins d'attaques d'opportunité ; sinon il avance comme avant. Sans cela, deux archers au contact tournaient
  l'un autour de l'autre sans fin (un combat automatique sur quelques centaines se bloquait ; plus aucun sur 2 000 après).

## Capacités de terrain (Idan, 2026-11-09)

Idan : « J'ai oublié les sangs de fées qui ont aussi vol et charge au niveau 3 » ; « On ajoute aussi quelques compétences » ;
« les mercenaires de sang divin ou sang de dragon de niveau 3 : on leur ajoute Vol + Charge aérienne à la création. On les
mets sur la fiche avec les autres compétences également ».
Données : `terrain-skills.json` (qui les a, ce qu'elles donnent par décor) ; code : `terrainSkillsOf`, `terrainEffect`,
`skillFlies` (moteur), `missionTerrainEffect`, `missionDecorCost`, `missionTerrainStealth` (combat). Le niveau d'un sang :
1 lointain ancêtre, 2 lignée proche, **3 bâtard**. Sur la fiche (onglet Compétences), elles s'affichent avec les
**Aptitudes** ; au survol, ce qu'elles donnent.

- **Vol** — **sang féerique, sang divin ou sang de dragon bâtard** (dès la création) : il vole (comme les chauves-souris : 1 point de mouvement par case, au-dessus du
  décor) et **charge par les airs** (charge aérienne, comme le pégase). À cheval, c'est la monture qui compte : il ne vole pas.
- **Déplacement aquatique** — **tous les Reptiliens, tous les sangs de sirène, les crocodiles invoqués** : pas de malus de
  déplacement dans l'**eau peu profonde** (1 point par case au lieu de 3) et **Discrétion +30 tant qu'il y est** (« boost
  temporaire »).
- **Respiration aquatique** — **sang de sirène bâtard** : il **traverse l'eau profonde** (normalement infranchissable), sans
  malus (1 point par case) ; **couverture totale** sur une case d'eau profonde, **partielle** sur une case d'eau peu profonde
  (Toucher et repérage, comme le décor).
- **Déplacement sylvain** — cultures **Elfes sylvains, Tribus de la jungle, Gnomes des forêts, Tribus des forêts
  anciennes** : pas de malus de déplacement en **forêt** (1 point par case au lieu de 2) et **Discrétion +30 tant qu'il y
  est** (en plus de la couverture partielle de la forêt).
- Plusieurs capacités : le coût le plus bas, les bonus de Discrétion s'ajoutent, la meilleure couverture. **Monté**, il se
  déplace et se cache comme sa monture (le cheval d'un elfe sylvain paie la forêt).

## Altitude (Idan, 2026-11-06)

« Je voudrais aussi qu'on bosse l'altitude » ; « l'idée, c'est de faire des cartes à la Mordheim / X-Com à terme » ; puis,
sur la proposition ci-dessous : « Oui, ça me va, vas-y pour l'altitude ». Première étape, à la Battle Brothers : **une
hauteur par case, de 0 à 3** (`combat.altitude.max`). Code : `prototype-web/mission.js` (`m.relief`, chemins, vue,
couverture, charge), `game-core/combat-engine.js` (`ALTITUDE`, option `heightOf`), `game-core/magic.js` (sorts qui volent).

- **Déplacement** : monter d'un niveau coûte **+1** point de mouvement (`combat.altitude.climb_cost`), en plus du décor
  (forêt en montée : 3) ; **descendre est gratuit**. Un écart de **2 niveaux ou plus** entre deux cases voisines est une
  **falaise** (`combat.altitude.cliff`) : infranchissable dans les deux sens (déplacement, charge ; un déplacement forcé
  s'arrête au pied : « heurte aussitôt la falaise »).
- **Toucher** : **+10** au delta par niveau quand on attaque d'en haut, **−10** par niveau vers le haut
  (`combat.altitude.hit_per_level`), **au tir comme au corps à corps**, et pour les sorts qui volent comme une flèche (et le
  crachat de venin). La hauteur est celle des cases au moment du coup (case d'arrivée d'une charge ou d'une approche).
- **Vue** : une case entre les deux dont le sommet (sa hauteur, **+1** si son décor bloque la vue) dépasse **à la fois le
  tireur et sa cible** coupe la ligne de vue ; plus haut, on voit par-dessus (une forêt au pied d'une colline ne cache plus
  rien à qui est dessus ; une forêt sur la colline, si). Dans une forêt, on n'est toujours vu qu'au contact.
- **Couverture** : un tireur placé **au moins un niveau plus haut** que sa cible ignore la **couverture partielle** (tirs et
  sorts qui volent) ; la couverture **totale** compte toujours. Rien ne change au repérage ni en défense de charge.
- **Charge** : pas de falaise sur la ligne, et **pas de charge qui monte de plus d'un niveau** au total ; la descente ne
  gêne pas.
- **Mission Test** : 1 à 3 collines, au sommet entre les deux lignes de déploiement, de 1 à 3 niveaux ; chaque case prend la
  plus haute des collines moins sa distance au sommet : deux cases voisines ne diffèrent jamais de plus d'un niveau (pas de
  falaise au hasard). Les cartes de mission (étape 3) pourront poser des falaises.
- **Affichage** : par-dessus le décor, la case est un peu plus claire à chaque niveau, avec un contour et son chiffre ; le
  survol dit « altitude N » ; l'aperçu d'une attaque montre la hauteur (« d’en haut », « vers le haut (2 niveaux) ») et le journal la note.

## Mode sentinelle (Idan, 2026-11-06)

« Un personnage avec une arme de tir peut se mettre en sentinelle au lieu de tirer. En mode sentinelle, pendant le tour de
l'adversaire, tire sur la première cible qui se déplace à sa portée. Il a un double bonus : plus de précision et plus de
chance pour enchaîner plusieurs tirs (sauf arme à feu). Il ne peut passer en mode sentinelle que si aucun ennemi ne le voit. »

- **Qui** : un personnage dont l'arme de tir est prête (chargée, pour une arme à feu), qui n'a pas encore attaqué, et
  qu'**aucun ennemi ne voit** : il est **camouflé**, ou **aucun ennemi n'a de ligne de vue** sur lui (Idan : « les deux » ;
  aujourd'hui le Brouillard et le Blizzard, bientôt le décor).
- **Quand** : à son activation, **au lieu de tirer** (bouton « Sentinelle ») ; il peut se déplacer avant ; son activation
  s'arrête là.
- **Le tir** : pendant le tour adverse, le **premier ennemi visible qui fait un pas à sa portée** (déplacement, approche,
  charge, fuite ; pas un déplacement forcé par un sort), et dans sa ligne de vue, essuie aussitôt son tir, avant de
  continuer. Les règles du tir s'appliquent (couloir de tir, attaques des ennemis au contact, Courage post-tir) ; s'il est
  encore camouflé, c'est aussi une attaque non détectée.
- **Les bonus** (`combat.sentinel.*`) : **+20 au Toucher** ; l'**enchaînement** comme au corps à corps : (Dextérité effective
  + Vitesse) / N au lieu de / (1,5 × N), pour les armes `Répétable` (arc, arbalète, fronde, sarbacane).
- **Fin** : après ce tir ; sans cible, au début de sa prochaine activation.
- **Les ennemis aussi** (Idan : « Bien sûr ! ») : un tireur ennemi qui n'a rien à viser après son déplacement, et que
  personne ne voit, se met en sentinelle ; le combat automatique fait de même pour vos mercenaires.

## Invocations et morts-vivants (Idan, 2026-10-28)

- Les **invocations** (zombie, spectre ; corbeau, loups, ours, crocodiles ; doc 12, Nécromancie et Invocation) jouent dans le camp du mage, avec leur propre activation dans l'ordre d'initiative, dès le tour suivant leur arrivée. Au début de chaque tour, le mage les garde (test de Charisme, puis mana) ; elles disparaissent quand il tombe. Elles ne laissent pas de corps et ne passent pas le bilan de fin de mission.
- Un **mort-vivant** ne fait jamais de test de Courage (comme en frénésie) ; les créatures de l'Invocation, si : elles peuvent fuir.
- **Bourbier** (Invocation) : une case où l'on entre mais d'où l'on ne sort plus, tant qu'il dure ; on ne la traverse pas. On y attaque et on y lance des sorts.
- **Immunité aux dégâts physiques** (spectre) : un coup d'arme ou un tir qui touche le traverse sans dégâts ; un sort contondant aussi.
- **Toucher spectral** : dégâts psychiques au contact, sans l'étape Blesser, ni armure ni résistance : 10 × 1D6 × Volonté de l'attaquant / Volonté de la cible (de × 0,5 à × 2).
- **Morts-vivants ennemis** (Culte des morts, doc 17 §19 ; Idan, 2026-11-06) : **insensibles au poison** (ni dégâts, ni
  empoisonnement : sarbacane, fiole, crachat de venin) ; les **squelettes** encaissent les dégâts **tranchants × 0,5** et les
  **contondants × 1,5** (Idan : « très résistants aux dégâts tranchants, très faibles aux contondants » ; chiffres proposés),
  au corps à corps, au tir et par les sorts physiques ; les perforants comptent entiers. Le journal le dit (« tranchant ×
  0,5 »). Données : `enemy-archetypes.json` (`mort_vivant`, `insensible_poison`, `immunite_physique`, `degats_subis`,
  `attaque`) ; code : `combat-engine.js` (`poisonImmune`, `damageTypeFactor`).
- **Sorts de l'IA** : un ennemi dont la fiche donne des sorts (le nécromancien) les essaie dans l'ordre de sa fiche : son
  invocation tant qu'elle n'est pas là (au plus près de l'ennemi), la Résurrection sur un corps, puis ses sorts sur l'ennemi
  visible le plus proche ; hors de portée, il se déplace d'abord vers la case la moins chère d'où il peut le lancer. Un
  ennemi dont la fiche ne donne **aucun sort** n'en lance aucun, soins compris (Idan, 2026-11-07) : la fiche remplace les
  sorts et les écoles de son personnage de base.
- **IA commune, premier jet** (Idan, 2026-11-07, après le bêta-test : « Rendre l'IA plus performante : jouer des sorts.
  Savoir reculer. Se regrouper. Se cacher » ; « Nous et les ennemis » ; « On fait un premier jet ») : la même IA pour les
  ennemis et pour nos mercenaires en combat automatique. Réglages `combat.ai.*` (`formula-constants.json`) ; code :
  `prototype-web/mission.js` (`missionAiSpellCodes`, `missionAiZoneTarget`, `missionAiKeepFormation`, `missionAiRetreat`).
  - **Sorts** : sans fiche (nos mercenaires, l'ennemi généré de la Mission Test), il essaie ses sorts connus dans cet ordre :
    invocations, Résurrection, sorts de zone, sorts sur un ennemi, renforts sur soi ; les soins restent ceux de l'IA
    (allié sous 35 % / 60 %). Il ne tente pas un sort qui réussit moins de **40 %** du temps : il frappe avec son arme.
    Une **zone** vise la case (sur un ennemi en vue) où elle touche le plus d'ennemis, **au moins 2**, et **aucun allié**
    ni le lanceur. Un **renfort sur soi** (Arme électrique, Peau d'écailles…) est lancé **une fois par combat**, quand
    l'ennemi approche ; en action rapide, il frappe encore.
  - **Se regrouper** : avant le contact, un combattant de mêlée n'avance pas à plus de **3 cases** devant le plus en retard
    de ses alliés de mêlée valides (on avance au pas du plus lent) ; le plus en retard avance toujours ; un blessé qui
    souffle à l'arrière (sous 30 % de ses PV) ne retient pas le groupe.
  - **Reculer** : sous **30 %** de ses PV, celui qui n'est au contact d'aucun ennemi recule vers les siens, sur une case
    plus loin des ennemis et sans attaque d'opportunité ; déjà au plus loin, il reste là (« reste en retrait pour
    souffler ») ; un tireur tire encore s'il le peut. Il faut un allié valide pour le couvrir (le nécromancien en retrait
    ne compte pas) ; sinon, il se bat. Pas s'il peut frapper ce
    tour un ennemi sous **25 %** de ses PV (« Je recule pas si je suis à 10% de PV mais que je pense que je vais faire le
    coup de grace »). Les morts-vivants, les invocations, les leurres et le nécromancien ne reculent pas.
  - **Se cacher** : un tireur qui se place pour tirer prend, à risque égal, la case la mieux couverte face à sa cible ;
    encore camouflé et hors de vue, un combattant qui ne pourrait pas frapper au tour suivant n'entre pas dans la vue de
    l'ennemi : il attend en embuscade, au plus **2 tours**. Un combattant repéré le reste jusqu'à la fin du combat
    (Idan : « Non »).
- **Nécromancien** (Idan, 2026-11-06 : « B, vas-y ») : son **Armée d'os est déjà levée** au début du combat, autour de lui,
  sans mana ni jet (`sort_initial`) ; ensuite, mêmes règles qu'une invocation lancée (entretien, test de Charisme). Il reste
  **en retrait** (`en_retrait`) : tant que ses troupes tiennent, il n'avance que pour lancer un sort et ne frappe qu'un
  ennemi à son contact ; seul, il se bat comme les autres. Code : `raiseMissionStartSummons`, `enemyMissionActivation`.
- **Vol** (les chauves-souris de la Cour de sang ; Idan, 2026-11-06 : « Elles volent donc ignorent les pénalités de
  mouvement ! », « Elles survolent tout ») : 1 point de mouvement par case, sans coût de décor, de montée ni de falaise ; un
  volant passe au-dessus d'un décor infranchissable (murs, rochers, maisons), sans pouvoir s'y arrêter. Le bourbier et la
  flaque de magma restent ce qu'ils sont. Données : `enemy-archetypes.json` (`vol`) ; code : `missionFlies`,
  `missionStepCost`, `missionPaths`.
- **Créatures sur plusieurs cases** (Idan, 2026-11-06 : tailles 1, 3 et 7 cases « Parfait » ; « Un cheval, deux cases…
  mais on pourra dompter un dragon » ; plus facile à toucher « Oui ») : `taille` (`enemy-archetypes.json`, `character.taille`)
  = **normale** (1 case), **longue** (2 cases : la tête et le corps derrière elle, dans le sens du déplacement, pour les
  montures), **grande** (3 cases en triangle, qui tourne tout seul pour passer) ou **énorme** (7 cases : une case et son
  anneau). `unit.q, unit.r` = sa case d'ancrage ; `unit.facing` = son sens.
  - **Distance** : de case la plus proche à case la plus proche (portée des armes et des sorts, contact, attaques
    d'opportunité, encerclement) ; on peut entourer une créature énorme à 12.
  - **Déplacement** : toute l'empreinte doit passer (dans la carte, sans personnage ni décor infranchissable, sans falaise
    sous elle) ; un pas coûte la case la plus lente qu'elle couvre, plus la montée de sa case d'ancrage ; une créature
    longue suit son pas (le corps prend la place de la tête). Volante : 1 par case, elle survole tout sans s'arrêter sur un
    décor infranchissable. En fuite, elle sort de la carte dès qu'une de ses cases touche le bord.
  - **Toucher** : + 10 contre une grande, + 20 contre une énorme (corps à corps, tir, sorts qui visent ;
    `combat.taille.toucher_*`, chiffres proposés) ; sa couverture est celle de sa case la plus exposée.
  - **Zones** : une zone qui touche une de ses cases la touche, une fois. **Ni poussée ni attraction.** **Vue** : on la
    voit si on voit une de ses cases. **Hauteur** : celle de sa case d'ancrage. Elle ne charge pas encore ; contre elle, la
    charge vise sa case la plus proche.
  - **Placement** : au début du combat, la case la plus proche de la sienne où toute son empreinte tient. **Affichage** :
    un gros pion au centre de ses cases. **Mission Test** : le troisième ennemi est un **troll géant**, grand ou énorme.
  - Code : `combat-engine.js` (`footprint`, `axialDistance`, `sizeHitBonus`), `mission.js` (`missionFootprint`,
    `missionLargeStep`, `fitMissionLarge`). Test : `tests/mission-size.test.js`.
- **Drain de vie de l'IA** (le vampire et ses rejetons ; Idan : « estoc, drain de vie, sort d'illusions ») : un ennemi dont
  la fiche donne le Drain de vie se le lance (action rapide) quand un ennemi visible est à portée de ses pas et que l'effet
  n'est pas déjà actif, puis frappe. C'est le seul sort sur soi que joue l'IA.
- **Régénération d'une fiche** (le vampire ; Idan : « régénération (bloquée par le feu) ») : `regeneration` donne les points
  de Régénération du personnage ; la règle est celle du sang de troll (au début de chaque activation, 2D6 × (0,5 +
  Régénération / 50) PV ; brûlé depuis sa dernière activation, rien).

## Combat à cheval (Idan, 2026-11-07)

> « On ajoute des montures aux ennemis. La monture est mise KO au combat. » « Au cac, l'attaquant choisit. À distance, jet
> qui dépend de la taille de la monture par rapport au cavalier. » « Le cheval pourra se battre seul autour de son cavalier
> KO, mais il a de grandes chances de fuir (même règles qu'un combattant). » « Tout est validé ! »

- **Monture** (`mounts.json`, une fiche fixe ; aujourd'hui le **Destrier**) : Force 90, Constitution 70, Dextérité 30,
  Vitesse 90, Endurance 85, Esquive 20, Courage 35, Volonté 30, Perception 60, Intelligence 10 ; **270 PV** (la formule de
  nos mercenaires) ; **Sabots** 1D8, contondant 50 ; résistances, Chance et maîtrise des sabots d'un humain moyen (P50).
- **Licorne** (Idan, 2026-11-07 : « C'est un Destrier plus rapide, plus endurant, qui frappe plus fort grâce à sa corne,
  mais qui est un peu moins courageuse. Elle a de plus une grande résistance à la magie » ; « résistances élémentaires
  élevées. Genre 50 » ; « La licorne est intelligente et a une grande volonté ») : le destrier, avec Vitesse 110 (10 cases),
  Endurance 100, Courage 30, Intelligence 80, Volonté 85 (296 PV), **Corne** 1D10 perforant 70, résistances au feu, au
  froid et à la foudre 50 ; loyale bonne. **Son sort**, comme un mercenaire (Idan : « Reprend le sort qui existe déjà. On
  lui donne juste des points de mana et des niveaux de compétences de magie ») : Création de double (doc 12), Illusion 50,
  Réserve de mana 40 (17 mana, portée 5) ; montée, depuis la barre de sorts de son cavalier, seule, pendant sa propre
  activation (`mounts.json`, `competences_magiques`, `sorts`). **Sa fiche à elle** (Idan : « Mana de la licorne + xp
  licorne ») : chacune de nos montures garde son mana d'un combat à l'autre (recharge au camp comme nos mercenaires) et
  progresse avec l'XP de ses combats, avec les règles de nos mercenaires (doc 08 ; stables.js, `ownSheet`).
- **Pégase** (Idan, 2026-11-09 : « Il vole, va vite comme une licorne mais frappe comme un cheval. Il est neutre bon.
  Plutôt intelligent ( comme la licorne) et coûte 40po d'entretien » ; « Volonté 70 » ; « Il est quand-même un peu plus fort
  physiquement que le Destrier et un peu plus résistant » ; « + de PV et un peu plus de résistance ») : le destrier, avec
  Force 100, Constitution 80 (**312 PV**), Vitesse 110 (10 cases, comme la licorne), Intelligence 80, Volonté 70, résistances
  + 2 (physique 7, feu, froid et foudre 6, poison 7), les **Sabots** du cheval (1D8, contondant 50) ; neutre bon. **Il vole**
  (`physiologie`, `Vol`) : monté, **le couple vole** (le vol des chauves-souris : 1 point par case, au-dessus du décor). Et
  la **charge aérienne** (`charge_aerienne` : « toujours », seul ou monté ; section « Charge aérienne »).
- **Cerbère** (Idan, 2026-11-09 : « Il a 3 attaques de morsures séparés. Il est de taille 2. ( Donc à côté des ogres) Il va un
  peu moins vite qu'un destrier, mais il mange 3 loups au Petit déjeuner » ; « on peut le monter ») : Force 100, Constitution
  90 (**339 PV**), Vitesse 75 (7 cases, le destrier 8), Intelligence 20, Volonté 60 ; **trois Morsures** (1D8, perforant 35,
  chacune) : **comme le combat à deux armes**, chacune frappe une fois par séquence avec son propre jet, aussi en charge et en
  attaque d'opportunité, et la séquence peut s'enchaîner (`attaque.attaques` ; `strikeCount`, `severalStrikes`) ; gabarit 2 :
  tout le monde le monte, sauf l'ogre, qui l'emmène à pied (`compagnon`) ; loyal mauvais.
- **Molosse de guerre** (Idan : « Il est assez faible » ; « Personne ne le monte ») : Force 30, Constitution 35 (**145 PV**),
  Vitesse 50, **Morsure** 1D6, perforant 25 ; gabarit 0,5 : personne ne le monte, il se bat à pied à côté de son maître
  (`compagnon`) ; neutre mauvais.
- **Les papillons** (Idan, 2026-11-09), qui **volent** tous :
  - **télépathe** (« le drone de repérage ») : Discrétion **300**, Perception 90, Vitesse 110 ; **il n'attaque pas**
    (`attaque` null : pas d'arme) ; personne ne le monte ;
  - **vénéneux** : Discrétion **150** ; sa **Piqûre** (`empoisonne`, `sans_degats`) : un coup qui blesse n'enlève aucun PV,
    mais **empoisonne comme une sarbacane** (10 PV par tour, 3 tours, jet de résistance à chaque activation) ; il pique sans
    se découvrir (la règle du camouflage) ;
  - **géant** : la taille d'un loup (gabarit 1 : les petits le montent ; le couple vole), Discrétion **100** ; **il ne frappe
    pas** ; **charge aérienne seulement monté** (`charge_aerienne` : « montée »).
  - **Un animal qui n'attaque pas** ne va pas au contact : au contact d'un ennemi qu'il voit, il s'éloigne ; sinon il reste à
    deux cases de son maître (l'IA, et le combat automatique). Il **ne tient pas le terrain** : si seuls des animaux qui
    n'attaquent pas restent debout dans un camp, ce camp a perdu (Idan : « si seuls des papillons qui n'attaquent pas restent
    debout, le combat est perdu : oui »). Test : `tests/greenhouse.test.js`.
- **Une fiche complète, comme un mercenaire** (Idan, 2026-11-07 : « la monture doit avoir une fiche complète comme les
  mercenaires. Les ennemis également » ; valeurs : « Parfait ») : destrier Charisme 30, Intimidation 40, Discrétion 10,
  Puissance magique 0, Réserve de mana 0 ; licorne Charisme 70, Intimidation 20, Discrétion 10, Puissance magique 50,
  Réserve de mana 40 ; ni vision nocturne, ni vol, ni régénération ; artisanat, camp et compétences animales à 0.
- **Discrétion d'un couple** (Idan : « Quand un cavalier est sur une monture, c'est la discrétion minimale des deux qui est
  prise en compte. ( Dur de se camoufler sur un dragon) ») : la plus basse du cavalier et de sa monture (`stealthOf`).
- **Intimidation d'un couple** (Idan, 2026-11-07 : « pour l'intimidation, on prend la plus haute des deux... Le gobelin sur le
  dragon... Bah, c'est pas l'intimidation du Gobelin qui compte ! ») : la plus haute du cavalier et de sa monture, pour le
  test de Courage de ceux qu'il frappe.
- **Gabarit** (Idan : « on fait la même chose que pour le dortoir ») : les places du dortoir du peuple (Gobelin, Gnome,
  Halfling 0,5 ; Ogre 2 ; les autres 1) ; celui de la monture dans sa fiche (destrier 2). **On ne monte qu'une bête plus
  grande que soi** : un ogre ne monte pas un destrier.
- **Un pion, deux fiches** : le cavalier et son cheval sont deux unités (PV, effets, poison, brûlure…), sur les mêmes cases ;
  le couple a la **taille du cheval** (longue : 2 cases) et regarde vers l'adversaire. Le cheval subit ses effets au début de
  l'activation de son cavalier.
- **Le cheval monté a son attaque** (Idan, 2026-11-07 : « oui, il a une attaque. La seule chose, c'est le déplacement
  commun » ; « faut pas que l'animal joue après. Ils jouent en même temps, on rajoute des boutons.. l'attaque principale de
  l'animal qui compte pas pour le mercenaire ») : **pendant l'activation de son cavalier**, le cheval a sa propre action
  principale et sa propre action rapide : le bouton **Attaque de la monture** (au contact du couple ; « Viser le cheval »
  vaut aussi pour elle) et ses sorts dans la barre de sorts, avec son mana. Le déplacement est celui du couple. Ennemis et
  combat automatique : après le cavalier, dans la même activation, un sort, sinon son attaque contre un ennemi au contact.
- **Le cheval monté menace aussi** (Idan, 2026-11-07 : « pourquoi la monture ne fait pas des attaques d'opportunités ? » ;
  « oui ») : un ennemi qui quitte le contact du couple subit l'attaque d'opportunité du cavalier puis celle du cheval.
- **Ce que le cavalier apprend** (Idan : « xp catégorie animal pour le cavalier ») : chaque attaque de sa monture lui donne
  de l'XP comme une arme (doc 08 : 10 par attaque, + 5 si elle touche, + 5 si elle blesse), la famille de la monture
  (Équidés…) comme l'arme et Compagnon animal comme sa catégorie. **Réputation et titre** (Idan : « réputation 1 et le
  titre A ») : les exploits de sa monture comptent pour sa réputation (doc 09) ; sa monture équipée s'ajoute à son titre
  (« à cheval », doc 19).
- **Déplacement** : celui du cheval (8 cases pour le destrier, 5 pour un humain moyen).
- **Qui prend les coups** : au corps à corps et en charge, le joueur choisit (bouton **Viser le cheval** ; sinon le
  cavalier) ; au tir, pour un sort qui vise, pour une attaque d'opportunité et pour les coups de l'IA (Idan, 2026-11-07 :
  « oui »), un jet : le cheval est visé à gabarit du cheval ÷ (gabarit du cheval + gabarit du cavalier) (un humain sur un
  destrier : 2 ÷ 3, un gobelin : 80 %) ; une zone touche les deux. Sur un allié à cheval, **Viser le cheval** donne au cheval
  le sort (un soin…) ou la potion de soins ou de mana que le cavalier lui fait boire (action rapide).
- **Hauteur** : au corps à corps, le cavalier compte comme un niveau plus haut (+ 10 au Toucher pour lui, − 10 contre lui ;
  rien contre le cheval ; `combat.monture.hauteur_cac`).
- **Charge** : avec le déplacement du cheval (8 à 16 cases en ligne droite), la ligne part de la tête et le corps suit ; la
  **moitié de la Force du cheval** s'ajoute à celle du cavalier (Blesser et dégâts ; `combat.monture.force_charge`) ; **le
  cheval frappe aussi** (Idan, 2026-11-07 : « La monture frappe également »), juste après, sur la même cible, avec le bonus
  de charge : c'est son action principale. Les armes de contre-charge restent la parade ; charger le cheval, c'est essuyer
  la contre-charge de son cavalier.
- **Charge aérienne** (Idan, 2026-11-09 : « la charge aérienne : comme tous les trucs un peu massifs qui chargent : ils
  peuvent charger en passant au dessus des ennemis. 50% de contre charge en moins et tous les jets ( toucher/ blessé/
  dégâts)X1.2 » ; « 50% de toucher en moins » ; « on mets la capacité en général qu'on applique à qui on veut. Pas pour les
  chauves-souris. Pegase seul l'a également ») : une **capacité de fiche** (`charge_aerienne` dans `mounts.json`, et dans
  `enemy-archetypes.json` pour qui on veut) : « toujours » (seule ou montée : le pégase) ou « montée » (seulement avec un
  cavalier). Monté sur une bête qui l'a, le cavalier charge par les airs ; une grande bête qui l'a « toujours » charge aussi
  seule, comme un couple.
  - **La ligne** : la charge habituelle (ligne droite, de 1 à 2 fois le déplacement), mais **au-dessus des personnages, du
    décor, du bourbier et de la flaque de magma** (Idan : « oui ») ; seule **l'arrivée**, corps compris, doit être libre.
  - **Pas d'attaque d'opportunité** pendant la course (Idan : « pas d'attaque d'opportunités ») ; un bourbier ne retient qu'à
    l'arrivée.
  - **La contre-charge** garde son moment, avec **deux fois moins de chances de toucher**
    (`combat.charge_aerienne.contre_charge` : × 0,5).
  - **Chaque arme qui frappe dans la charge** (celles du cavalier, l'arme naturelle de la monture) : **Toucher, Blesser et
    dégâts × 1,2** (`combat.charge_aerienne.bonus`), en plus du bonus de charge et de la Force du cheval ; une chance
    plafonnée à 100 %. L'aperçu et le journal le disent (« charge aérienne »).
  - Code : `combat-engine.js` (`aerialCharger`, `AERIAL`, `chargeData`, facteurs de `hitProbability`, `woundProbability`,
    `resolveAttack`), `mission.js` (`missionChargeIfClear`, `moveMissionUnitAlongPath`, `performMissionCharge`). Test :
    `tests/pegasus.test.js`.
- **Courage et Volonté partagés** (Idan : « Montées, elles les partagent avec le cavalier en fonction de son niveau ») : ceux
  du cheval + (ceux du cavalier − ceux du cheval) × part ; part = (Compagnon animal + la famille de la monture, Équidés pour
  le destrier) ÷ 100, au plus 1 (`combat.monture.partage_diviseur`). **Un seul test de Courage pour le couple** (un coup sur
  le cheval fait tester le couple) ; ils fuient ensemble.
- **Cheval KO** : le cavalier tombe **au sol** (jusqu'à sa prochaine activation) et se bat à pied ; le cheval reste couché
  sur sa case : après une victoire, on peut le capturer (doc 11 §8, « La Grange du dresseur et les Écuries »).
- **Cavalier KO** : le cheval reste, seul : il joue dès le tour suivant, **juste après son cavalier** dans l'ordre (Idan,
  2026-11-07 : « La monture n'a pas sa propre initiative »), se bat avec ses sabots et fuit comme tout combattant (son propre
  Courage, 35). Un cavalier qui sort de la carte emporte son cheval.
- **Descendre / Monter** (Idan, 2026-11-07 : « un bouton descendre de la monture / monter. Elle permet tout simplement de
  scinder en deux groupes. La monture joue alors seule dans l'ordre, juste après le mercenaire. Monter : il faut être
  adjacent. Cela prend une action rapide. ») : **Descendre**, action rapide : il pose le pied sur une case libre au contact du
  couple ; la monture joue seule, juste après lui. **Monter**, action rapide, au contact de sa monture ; **seul son cavalier**
  la monte. Les déplacements (« le mercenaire a utilisé deux déplacements et son action rapide pour arriver près de la
  monture - la monture aura son déplacement normal. La monture a utilisé un déplacement. Le cavalier descend : il aura son
  deuxième déplacement et la monture son deuxième à son tour. ») : chacun compte les siens ; le couple a fait le premier de
  chacun s'il a bougé, les deux s'il a fait un second mouvement ; en remontant, le couple repart avec le déplacement de la
  monture si elle n'a pas encore joué ce tour. L'IA ne descend pas d'elle-même. Le même mécanisme servira aux compagnons
  qu'on ne monte pas.
- **Écran** : le pion du couple couvre ses deux cases, avec une seconde barre de PV (le cheval) ; la carte de survol donne
  les PV du cheval et, au tir, sa chance de prendre le coup.
- **Nos mercenaires à cheval** (Idan, 2026-11-07 : « Pour pouvoir l'équiper […], il doit passer du temps chez le dresseur » ;
  « Pour les montures, on les contrôle comme on contrôle un mercenaire. Avec ou sans cavalier. ») : celui qui a apprivoisé sa
  monture et l'a équipée (emplacement Monture ; doc 11 §8, « Apprivoiser ») part à cheval, avec les mêmes règles que le
  Cavalier. Son cavalier KO, le cheval seul rejoint l'ordre du tour de notre équipe : on le joue comme un mercenaire (il fuit
  comme tout combattant). En fin de combat (Idan : « La monture peut mourir indépendamment du cavalier ou être blessée en fin
  de mission. Si le cavalier meurt, elle repart dans l'enclos et peut être attribuée à un autre mercenaire. Globalement, elle
  a la même fiche qu'un mercenaire. ») : notre monture passe la **chaîne de nos mercenaires** (doc 10 : mort → blessure →
  fatigue, avec le jet doublé d'une défaite de contrat) ; morte, elle est perdue ; blessée ou fatiguée, elle se repose aux
  Écuries autant de jours qu'un mercenaire (Dispensaire, médecin, bains chauds) et, d'ici là, son cavalier part à pied. Son
  cavalier mort, elle retourne à l'Intendance, sans propriétaire : un autre mercenaire devra l'apprivoiser.
- **Le loup de combat** (Idan, 2026-11-07 : « Non on limite à un compagnon/ monture pour l'instant » ; les petits peuples
  le montent : « C'est exactement à quoi je pensais ») : la fiche du Loup de la Cour de sang (`mounts.json`, `loup` :
  gabarit 1, une case, **Morsure** 1D8 perforant 35), chaotique neutre. Il prend l'emplacement Monture. **Un petit**
  (gobelin, gnome, halfling : gabarit 0,5) **le monte**, avec les règles du cheval. **Les autres l'emmènent à pied**
  (`compagnon`) : au début du combat, il se pose sur la case libre la plus proche de son maître et joue seul, **juste après
  lui** dans l'ordre (le mécanisme de « Descendre ») ; on le joue comme un mercenaire ; son maître ne peut pas le monter. Sa
  fin de combat est celle d'une monture. Ses attaques donnent à son maître l'XP animale (Canidés, Compagnon animal), comme
  celles d'une monture (Idan : « Oui bien sur ») ; son titre : « à dos de loup », seulement pour celui qui le monte.
- Code : `combat-engine.js` (`mountOf`, `canRide`, `mentalStat`, `mountChargeForce`, `rollShotTarget`), `missions.js`
  (`createMount`), `mission.js` (`missionMountOf`, `attachMissionMount`, `settleMissionMounts`, `settleOwnMissionMounts`,
  `missionAimed`, `deployMissionCompanions`). Tests : `tests/mounts.test.js`, `tests/own-mounts.test.js`, `tests/wolf.test.js`.

## Attaques de zone — Toucher V1

[Précision d'attaque de zone V1](/design/#doc=formulas/precision-d-attaque-de-zone-v1.md) fournit le noyau commun : l'attaque vise une **case**, puis chaque cible potentielle perd **10 points de probabilité de toucher par hex d'écart** à cette case.

`P_touche(d) = max(0, P_touche_centre − 10×d)`.

La **forme et le rayon** restent propres à l'arme ou au sort. Cette règle doit servir au Tromblon, à la Boule de feu, à la Pluie de glace et aux futures zones. **Exception (Idan, 2026-10-25)** : la Boule de feu ne s'évite pas ; elle peut dévier de 1 à 3 cases et ses dégâts diminuent du centre vers le bord (doc 12, « École du Feu »).

## Charge & contre-charge V1

- [Charge CAC V1](/design/#doc=formulas/charge-cac-v1.md) : ligne droite d'hexagones dans n'importe quelle direction, sans personnage, magma ni bourbier entre les deux (Idan, 2026-11-04) ; distance `MouvementBase` à `2 × MouvementBase` ; 2 % de chute de base (plus à travers un décor lent : section « Décor ») ; puissance croissante selon distance parcourue × `Bonus charge base` de l'arme ; V1 = **1** par défaut, **2** pour hast / armes `2 mains`.
- [Contre-charge V1](/design/#doc=formulas/contre-charge-v1.md) : la cible d'une charge peut réagir avec une arme configurée `Contre-charge`. Une réaction **à distance part à mi-course** ; une réaction de mêlée / hast part à sa portée normale.

Si la contre-charge **blesse** le chargeur, son attaque est annulée et il teste immédiatement son Courage. En cas d'échec, il fait demi-tour et consomme tout mouvement de charge restant pour repartir dans la direction opposée.

Mi-course sur une course impaire `2N+1` : la réaction part à la case **N+1** (5 cases → 3e case) — décision Idan du 2026-10-08.

Choix d'implémentation V1, validés par Idan le 2026-10-20 :
- la contre-charge est **automatique** dès que l'arme active de la cible le permet ; une arme à feu doit être chargée et se décharge en tirant ; un personnage En Fuite ne contre-charge pas ;
- c'est une seule attaque normale (Toucher, blocage, critiques, Blesser), sans enchaînement ; si elle ne blesse pas, personne ne teste son Courage et la charge continue ;
- le test du chargeur blessé est le test normal face à la cible, sans malus de sous-nombre ;
- le demi-tour suit la ligne de la charge à rebours ; il s'arrête sur une case occupée ou au bord de la carte, et peut provoquer des attaques d'opportunité ;
- une charge brisée avant son attaque (contre-charge ou attaque d'opportunité pendant la course) compte quand même comme **charge tentée** pour l'XP de Courage (doc 08).

## En Fuite V1

[Mouvement de fuite immédiat V1](/design/#doc=formulas/mouvement-de-fuite-immediat-v1.md) gère le déplacement au moment où l'état En Fuite est appliqué : tout mouvement restant est utilisé pour s'éloigner de la source de peur. Avec `0` mouvement restant, le personnage reste sur place mais demeure En Fuite.

À partir du tour suivant, [Reprise de contrôle — En Fuite V1](/design/#doc=formulas/reprise-de-controle-en-fuite-v1.md) est résolu au début de chaque activation. Une réussite retire immédiatement **En Fuite** et rend au joueur son activation normale complète. En cas d'échec, [Comportement automatique — En Fuite V1](/design/#doc=formulas/comportement-automatique-en-fuite-v1.md) remplace toute l'activation par un `1D3` : **Course effrénée**, **Cachons-nous** ou **Feu à volonté**. La première valeur à tester est un bonus de **+10 au score de récupération par tour commencé En Fuite** ; les déplacements imposés restent soumis aux attaques d'opportunité normales. Si **Cachons-nous** ne trouve aucun abri total valide, le personnage poursuit sa fuite vers une **sortie de carte**.

[Boîte à idées — Combat](/design/#doc=91-combat-ideas.md)

[Fin de mission, temps & indisponibilités](/design/#doc=10-mission-time-and-unavailability.md)
## Mission Test — prototype tactique V1

Le prototype web expose désormais un bouton **Mission Test** qui relie directement `Create_Mercenary()` au moteur physique de combat.

Périmètre actif :

- sélection de **3 mercenaires** ;
- génération automatique de **3 ennemis** ;
- carte **hexagonale 2D vue du dessus**, rectangulaire, de **13×9** cases ; les équipes apparaissent à deux colonnes de leur bord ;
- équipe du joueur en premier, puis équipe ennemie ;
- ordre interne par la formule d'Initiative validée ;
- activation avec Mouvement + Action rapide + Attaque ;
- actions disponibles : **Se déplacer, Attaquer, Charger, Changer de set d'armes, Attaquer à distance, Second mouvement** (l'Attaque est sacrifiée pour une seconde action de Mouvement, [Activation hexagonale V1](/design/#doc=formulas/activation-hexagonale-v1.md)) ;
- IA V1 : attaque si possible, sinon charge si valide, sinon avance vers la cible la plus proche puis attaque si elle entre en portée ;
- [Attaques d'opportunité](/design/#doc=formulas/attaque-d-opportunite-cac-v1.md) avec [Frappe dans le dos](/design/#doc=formulas/frappe-dans-le-dos-v1.md) : en quittant une zone de menace (déplacement ou charge, résolu hexagone par hexagone) et en tirant sur une autre cible que l'adversaire qui menace ; en mode déplacement, la carte signale les destinations qui en provoquent ;
- [Encerclement](/design/#doc=formulas/encerclement-cac-v1.md) : toute attaque au CAC contre une cible encerclée est une Frappe dans le dos ; la carte entoure de pointillés les personnages encerclés ;
- [Courage](/design/#doc=formulas/courage-post-attaque-cac-v1.md) après chaque attaque (CAC, tir, charge, attaque d'opportunité), avec le [sous-nombre](/design/#doc=formulas/courage-en-sous-nombre-v1.md) ; un échec applique [En Fuite](/design/#doc=13-fleeing.md) : fuite immédiate, puis reprise de contrôle et comportement automatique `1D3` aux activations suivantes ; un fuyard qui sort de la carte est hors combat ;
- [aura du capitaine](/design/#doc=13-fleeing.md) : 35 % du Courage + 25 % du Charisme du capitaine présent, équipement compris, en Courage pour ses alliés à 10 cases ou moins (Idan, 2026-10-24) ; un allié qui tient un **fouet** y ajoute **+5 / 10 / 15 / 20 % du Courage de base** (selon le tier du fouet ; Idan, 2026-11-05) des autres alliés à 3 cases ou moins (Idan, 2026-10-29 ; le journal l'indique : « fouet +5 ») ;
- console détaillant mouvements, jets de Toucher/Blesser et dégâts ;
- écran (Idan, 2026-11-04) : l'attaque, la charge ou le sort choisi éclaire sa **portée** ; au survol d'une case qu'il peut viser, un sort de zone éclaire sa **zone** (disque, anneau, ligne, cône, mur) ; en **Attaquer**, un ennemi hors d'atteinte mais à portée de mouvement est cliquable : le personnage s'en approche par le plus court chemin (à égalité, celui qui provoque le moins d'attaques d'opportunité), puis frappe s'il le peut encore ; le survol montre le chemin, sa longueur et ses attaques d'opportunité ;
- aperçu d'un sort au survol (Idan, 2026-11-04) : réussite, coût, Toucher (un trait) ou précision (une zone qui peut dévier), dégâts / soins / mana de tant à tant (après la protection élémentaire de la cible, selon sa Volonté pour un sort psychique, l'étape Blesser et la Résistance physique pour un sort physique), bonus, zone, durée ;
- tour ennemi (Idan, 2026-11-04) : les ennemis jouent l'un après l'autre ; celui qui joue est mis en évidence, ses déplacements et ses coups s'animent, puis une pause d'environ 1 s avant le suivant ; **Accélérer** la raccourcit (le combat automatique joue toujours d'un coup) ;
- fin du test lorsque les trois membres d'une équipe sont **hors combat**.

Le moteur tactique est isolé dans `game-core/combat-engine.js`. La carte web n'est qu'une interface de test.

### Simplifications volontaires du premier test

Le noyau utilise déjà les formules validées de portée, vitesse/esquive effectives, MouvementBase, Toucher, Blesser, résistances d'armure, qualité d'item, dégâts PV, charge, attaques d'opportunité, Frappe dans le dos, encerclement, Courage et Fuite. Les critiques, échecs critiques, le blocage au bouclier, les enchaînements d'attaques et de tirs, la recharge des armes à feu, la contre-charge, l'approximation des projectiles et le combat à deux armes sont branchés. En revanche, ce premier écran ne branche pas encore la couverture et les obstacles.

Choix d'implémentation V1, confirmés en relecture par Chatty (PR #7) : aucune limite au nombre d'attaques d'opportunité par adversaire et par tour ; un personnage Au Sol réagit normalement et compte pour l'encerclement ; plusieurs réactions simultanées sont résolues dans l'ordre d'initiative de l'équipe qui réagit ; une charge ne peut pas traverser une case occupée (ni magma ni bourbier, Idan, 2026-11-04) ; sortir de la carte coûte un hexagone de mouvement depuis une case du bord ; la Mission Test n'ayant aucun abri total, « Cachons-nous » file vers la sortie de carte sans jamais entrer dans une case adjacente à un ennemi (sans trajet sûr vers une sortie, il s'éloigne au mieux par les cases sûres, sinon il reste sur place) ; « Feu à volonté » tire à la cadence de l'arme (Enchaînement de tirs distance V1) et ne recharge pas une arme déchargée.

Dans ce banc de test, `PV <= 0` signifie **hors combat** et déclenche la condition de victoire. La mortalité persistante de fin de mission reste un système séparé. Les PV restent **signés** sous 0 : l'interface affiche 0, mais la profondeur est conservée pour le jet de mort de fin de mission (Issue #13).
