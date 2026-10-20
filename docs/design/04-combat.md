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
- Le blocage au bouclier reste possible.

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

Choix d'implémentation V1, à confirmer en relecture :
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

Choix d'implémentation V1 du combat à deux armes, validés par Idan (2026-10-08 et 2026-10-20) :
- on combat à deux armes quand chaque main du set actif tient une **arme** (un bouclier n'en est pas une) ;
- la **Dextérité effective** `Dextérité / (2 − Combat à deux armes / 100)` remplace la Dextérité au Toucher (CAC et distance) et dans les enchaînements ;
- à chaque séquence, chaque arme **utilisable** frappe une fois, principale puis secondaire, chacune avec son mode : épée + pistolet = la lame au contact, le pistolet au contact comme à distance ; une arme déchargée ou hors portée est sautée ;
- attaque d'opportunité : un coup avec chaque arme de mêlée, puis un seul test de Courage ; la zone de menace couvre la portée de chaque arme de mêlée tenue ;
- décision Idan du 2026-10-08 : la **charge** et la **contre-charge** se font avec **les deux armes**. À l'arrivée de la charge, chaque arme utilisable frappe une fois, sans séquence suivante (la charge reste une seule attaque) ; chaque arme de mêlée reçoit le bonus de charge selon son propre `Bonus charge base` ; la chute de charge n'est tirée qu'une fois ; un échec critique coupe la seconde arme. En contre-charge, chaque arme qui le permet riposte une fois, à son propre moment (pistolet à mi-course, arme d'hast à l'entrée dans sa portée) ; la première riposte qui blesse brise la charge ;
- deux pistolets : la paire de base seulement, sans séquence suivante (la séquence est une règle CAC) ;
- aucun mercenaire n'a encore de seconde arme à la création : elle viendra avec le système de changement d'équipement (négociation avec le mercenaire, Idan, 2026-10-08).

Choix d'implémentation V1 des enchaînements (attaques CAC et tirs `Répétable`) :
- validés par Idan le 2026-10-08 : la **charge** reste une seule attaque (« arrivée suivie d'une attaque », Charge CAC V1), sans enchaînement ; au tir, les attaques d'opportunité des ennemis au contact sont résolues **une fois**, avant la séquence de tirs, pas avant chaque tir ;
- à confirmer en relecture : la chaîne vise toujours la même cible et s'arrête si elle n'est plus à portée (par exemple après avoir fui) ;
- Courage : un seul test en fin de séquence ([Courage post-attaque CAC V1](/design/#doc=formulas/courage-post-attaque-cac-v1.md), [Courage post-tir V1](/design/#doc=formulas/courage-post-tir-v1.md)) ; une cible en sous-nombre teste après chaque blessure reçue et ne reteste pas en fin de séquence.

## Bouclier physique V1

La même règle de blocage s'applique au **CAC et aux projectiles physiques**, sans malus spécifique au tir. Le bouclier peut également bloquer une Frappe dans le dos / attaque non détectée.

Un bouclier intervient **après un Toucher réussi et avant le critique positif de Toucher** via [Blocage bouclier physique V1](/design/#doc=formulas/blocage-bouclier-physique-v1.md).

Choix d'implémentation V1, à confirmer en relecture :
- le bouclier compte s'il est tenu en main secondaire du **set actif** ;
- son `Bonus blocage base` est lu dans `skills.json` (ligne du bouclier : Rondache 5, Écu 10, Pavois 20), `weapons.json` n'ayant pas cette colonne ;
- son malus de vitesse s'ajoute à celui de l'arme ([Vitesse combat effective CAC V1](/design/#doc=formulas/vitesse-combat-effective-cac-v1.md)), et une arme `Au choix` tenue avec lui passe en mode une main ;
- à la création, aucun mercenaire ne reçoit encore de bouclier : seules les armes principales des sets sont remplies (05-equipment). Le blocage n'apparaîtra en Mission Test qu'avec une règle d'attribution des boucliers.

Un blocage réussi signifie que l'attaque n'a pas réellement touché : pas de critique positif, pas de Blesser, pas de dégâts. Il casse l'enchaînement normal. En combat à deux armes, chaque attaque de la paire est testée séparément et la paire peut continuer si au moins une attaque touche réellement.

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
- **Cadence** : [Enchaînement de tirs distance V1](/design/#doc=formulas/enchainement-de-tirs-distance-v1.md) pour les armes `Répétable`.
- **Projectile raté / approximation** : [Approximation projectile V1](/design/#doc=formulas/approximation-projectile-v1.md) peut toucher accidentellement un allié ou ennemi dans le couloir de tir. **Couloir de tir** (décision Idan du 2026-10-08) : cône de **30°** depuis le tireur, centré sur l'axe tireur → cible, compté de la **moitié de la distance** de la cible jusqu'à la **portée max** de l'arme (constantes `combat.ranged.stray.cone_angle`, `combat.ranged.stray.corridor_start_ratio`).
- **Courage** : [Courage post-tir V1](/design/#doc=formulas/courage-post-tir-v1.md). Une cible réellement blessée peut fuir ; le tireur ne teste jamais son Courage simplement parce qu'il a raté ou n'a pas blessé.
- **Armes à feu** : [Armes à feu — recharge et double pistolet V1](/design/#doc=formulas/armes-a-feu-recharge-et-double-pistolet-v1.md) : pas de stock de munitions normales ; **recharger une arme = 1 Action rapide** ; épée + pistolet et deux pistolets suivent le combat à deux armes, avec inerties cumulées et une attaque de base par arme actuellement utilisable.

Choix d'implémentation V1 de la recharge :
- validés par Idan le 2026-10-08 : toutes les armes à feu sont **chargées au début de la mission** ; l'état chargé ne dure que la mission ;
- à confirmer en relecture : les armes à recharge sont celles marquées `recharge_action_rapide` dans `skills.json` (Pistolet, Arquebuse / Mousquet, Tromblon, Canon à main) ;
- l'arme se décharge dès que le coup part, qu'il touche ou non ;
- l'IA recharge avec son Action rapide quand son arme est déchargée (après un éventuel changement d'arme, qui consomme aussi l'Action rapide).

Choix d'implémentation V1 de l'approximation, validés par Idan le 2026-10-08 :
- elle suit tout tir raté, y compris un échec critique au Toucher, et aussi un tir de contre-charge ; un tir **bloqué** par un bouclier s'arrête là ;
- le candidat touché suit la suite normale d'un toucher : blocage, critique, Blesser, dégâts ; la chaîne de tirs s'arrête, puisque la cible visée n'a pas été touchée ;
- le personnage blessé par accident teste son Courage face au tireur (Courage post-tir V1), même s'il est son allié ;
- un allié mis hors combat par accident ne compte pas pour l'XP de Charisme ;
- le Tromblon, arme de zone dans `skills.json`, n'y est pas soumis (« ne s'applique pas aux attaques de zone ») ;
- la Mission Test n'a ni décor ni couverture : aucun obstacle ne coupe le couloir.

Une attaque à distance exige une **ligne de vue**. En V1, les éléments de décor indiquent directement leur protection : aucune, **partielle (`×0,5`)**, **forte / quasi-totale (`×0,25`)** ou **blocage total de ligne de vue** (tir impossible).

Tirer sur une cible distante alors qu'un ennemi est adjacent reste autorisé, mais provoque l'[Attaque d'opportunité CAC V1](/design/#doc=formulas/attaque-d-opportunite-cac-v1.md) de cet ennemi. Tirer sur l'ennemi qui vous menace avec une arme autorisée au contact ne déclenche pas cette réaction.

## Attaques de zone — Toucher V1

[Précision d'attaque de zone V1](/design/#doc=formulas/precision-d-attaque-de-zone-v1.md) fournit le noyau commun : l'attaque vise une **case**, puis chaque cible potentielle perd **10 points de probabilité de toucher par hex d'écart** à cette case.

`P_touche(d) = max(0, P_touche_centre − 10×d)`.

La **forme et le rayon** restent propres à l'arme ou au sort. Cette règle doit servir au Tromblon, à la Boule de feu, à la Pluie de glace et aux futures zones.

## Charge & contre-charge V1

- [Charge CAC V1](/design/#doc=formulas/charge-cac-v1.md) : ligne droite ; distance `MouvementBase` à `2 × MouvementBase` ; 2 % de chute de base ; puissance croissante selon distance parcourue × `Bonus charge base` de l'arme ; V1 = **1** par défaut, **2** pour hast / armes `2 mains`.
- [Contre-charge V1](/design/#doc=formulas/contre-charge-v1.md) : la cible d'une charge peut réagir avec une arme configurée `Contre-charge`. Une réaction **à distance part à mi-course** ; une réaction de mêlée / hast part à sa portée normale.

Si la contre-charge **blesse** le chargeur, son attaque est annulée et il teste immédiatement son Courage. En cas d'échec, il fait demi-tour et consomme tout mouvement de charge restant pour repartir dans la direction opposée.

Mi-course sur une course impaire `2N+1` : la réaction part à la case **N+1** (5 cases → 3e case) — décision Idan du 2026-10-08.

Choix d'implémentation V1, à confirmer en relecture :
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
- console détaillant mouvements, jets de Toucher/Blesser et dégâts ;
- fin du test lorsque les trois membres d'une équipe sont **hors combat**.

Le moteur tactique est isolé dans `game-core/combat-engine.js`. La carte web n'est qu'une interface de test.

### Simplifications volontaires du premier test

Le noyau utilise déjà les formules validées de portée, vitesse/esquive effectives, MouvementBase, Toucher, Blesser, résistances d'armure, qualité d'item, dégâts PV, charge, attaques d'opportunité, Frappe dans le dos, encerclement, Courage et Fuite. Les critiques, échecs critiques, le blocage au bouclier, les enchaînements d'attaques et de tirs, la recharge des armes à feu, la contre-charge, l'approximation des projectiles et le combat à deux armes sont branchés. En revanche, ce premier écran ne branche pas encore la couverture et les obstacles.

Choix d'implémentation V1, confirmés en relecture par Chatty (PR #7) : aucune limite au nombre d'attaques d'opportunité par adversaire et par tour ; un personnage Au Sol réagit normalement et compte pour l'encerclement ; plusieurs réactions simultanées sont résolues dans l'ordre d'initiative de l'équipe qui réagit ; une charge ne peut pas traverser une case occupée ; sortir de la carte coûte un hexagone de mouvement depuis une case du bord ; la Mission Test n'ayant aucun abri total, « Cachons-nous » file vers la sortie de carte sans jamais entrer dans une case adjacente à un ennemi (sans trajet sûr vers une sortie, il s'éloigne au mieux par les cases sûres, sinon il reste sur place) ; « Feu à volonté » tire à la cadence de l'arme (Enchaînement de tirs distance V1) et ne recharge pas une arme déchargée.

Dans ce banc de test, `PV <= 0` signifie **hors combat** et déclenche la condition de victoire. La mortalité persistante de fin de mission reste un système séparé. Les PV restent **signés** sous 0 : l'interface affiche 0, mais la profondeur est conservée pour le jet de mort de fin de mission (Issue #13).
