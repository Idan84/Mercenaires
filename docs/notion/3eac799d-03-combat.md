# 03 — Combat

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3eac799da3d181cfa22deb2373595671?pvs=204
> Dernière édition Notion : 2026-10-01T19:25:08.071Z

Règles de résolution du combat. La V1 conserve un pipeline physique commun et choisit les formules selon le type d'attaque.

> 
	Pipeline physique : **Portée légale → Toucher → Critique positif éventuel → Blesser → Dégâts PV → Courage éventuel**. Le CAC et la distance partagent cette structure mais pas toutes les formules.


Les registres complets de formules, termes et constantes sont rangés dans **05 — Référentiels techniques**.
**Base Notion :** [Types de dégâts](https://app.notion.com/p/5db7647603614c41bb7acc47a89986d6)
[Mécaniques à intégrer ensuite](https://app.notion.com/p/3eac799da3d181fd89ecffed4135a594)
**Base Notion :** [États](https://app.notion.com/p/a2ea68aea2414a24a343f374c6fb19e3)
## Grille, activation & mouvement V1
- Grille **hexagonale**.
- En V1, un personnage standard occupe **1 hexagone**.
- [Page Notion](https://app.notion.com/p/3ebc799da3d181509eced727ad375486) : une activation fournit **Mouvement + Action rapide + Attaque**, dans l'ordre choisi ; le mouvement est fractionnable et l'Attaque peut être remplacée par un second Mouvement.
- [Page Notion](https://app.notion.com/p/3ebc799da3d18139a297ecfe65b067ae) : `MouvementBase` est calculé à partir de Vitesse combat effective, Endurance et Volonté.
- [Page Notion](https://app.notion.com/p/3ebc799da3d181a19905f8c5d3dfa2c6) : une arme de mêlée standard vaut implicitement 1–1 ; les armes d'hast configurées 1–2 utilisent toujours le pipeline CAC.
## Initiative & ordre interne V1
[Page Notion](https://app.notion.com/p/3ecc799da3d181bc98a5edf2469614ac) est calculée **avant la mission** et visible pendant la préparation.
- Les équipes jouent l'une après l'autre ; l'équipe qui commence est fixée par le **scénario**.
- L'initiative ne sert qu'à ordonner les personnages **au sein de leur équipe**.
- Aucun jet aléatoire : `VitesseCombatEffective + 0,25×Intelligence + 0,10×Courage + 0,05×Volonté`.
- Égalité : Courage le plus élevé ; égalité parfaite restante = assert / erreur de développement pour l'instant.
- La Fatigue sera intégrée plus tard comme système global.
## Attaque d'opportunité CAC V1
[Page Notion](https://app.notion.com/p/3ecc799da3d181559829dce0edf3a0d0) formalise les réactions de zone de menace.
- Sortir de la zone menacée par un adversaire déclenche sa réaction ; rester à l'intérieur de sa portée ne suffit pas.
- Chaque adversaire dont on quitte la zone peut réagir.
- L'attaque est résolue **avant** la fin du déplacement ou de l'action qui l'a déclenchée.
- La cible ne conserve que **50 % de son Esquive effective** et sa Perception défensive est supprimée du Toucher.
- Une arme = **un coup**, sans enchaînement ; combat à deux armes = **un coup avec chaque arme**, donc deux coups, sans cadence supplémentaire.
- La fuite peut elle-même déclencher ces réactions.
- Toute attaque d'opportunité bénéficie également de [Page Notion](https://app.notion.com/p/3ecc799da3d1819ba68cc80196e7861e).
## Frappe dans le dos & encerclement V1
[Page Notion](https://app.notion.com/p/3ecc799da3d1819ba68cc80196e7861e) annule la **Perception défensive** au Toucher et divise par deux la **résistance au type de dégâts** utilisée pour Blesser. La Résistance physique % qui réduit ensuite les PV n'est pas modifiée.
- Toute attaque d'opportunité en bénéficie.
- Elle s'applique contre une cible en train de fuir ou à une attaque non détectée.
- [Page Notion](https://app.notion.com/p/3ecc799da3d181ae8e82ccd7c73a1cc7) : deux ennemis au contact sur des cases **non adjacentes entre elles** suffisent ; une fois la cible encerclée, **tous** ses adversaires au CAC bénéficient de Frappe dans le dos.
- Le blocage au bouclier reste possible.
## CAC V1 — Toucher, Blesser & dégâts
1. **Toucher** : [Page Notion](https://app.notion.com/p/3eac799da3d181bbbe04d7e9f08395ce).
2. **Blesser** : [Page Notion](https://app.notion.com/p/3eac799da3d181c5965ef78a521d952c).
3. **Dégâts PV physiques** : [Page Notion](https://app.notion.com/p/3eac799da3d181c38685f9fb040d3bdf).
## Critiques physiques V1
- **Après Toucher réussi** : jet de critique via Chance. En cas de réussite, [Page Notion](https://app.notion.com/p/3ebc799da3d18179891acefabeb182a5) ignore l'armure uniquement pour l'étape Blesser.
- **Toucher naturel 96–100** : test d'échec critique ; échec du test de Chance → **Au Sol** via [Page Notion](https://app.notion.com/p/3ebc799da3d181019ea6cc4583820d39).
- **Après Blesser réussi** : un critique positif peut imposer les dégâts maximum via [Page Notion](https://app.notion.com/p/3ebc799da3d181488d08f35e58215458).
- **Blesser naturel 96–100** : échec du test de Chance → [Page Notion](https://app.notion.com/p/3ebc799da3d181688a91f508768adac2) inflige à l'attaquant les dégâts minimum de son propre coup.
- La V1 distance réutilise ce même principe de critiques ; les exceptions propres à des armes ou sorts seront ajoutées séparément si nécessaire.
## Vitesse, prise et cadence CAC V1
Les règles validées de maniement et cadence sont centralisées ici :
- [Page Notion](https://app.notion.com/p/3ebc799da3d1813daa4ccfafab0ea2c5) : Vitesse après armure et objets tenus.
- [Page Notion](https://app.notion.com/p/3ebc799da3d1811fab4fd320244be6f8) : inertie de l'arme, qualité et compensation par les maîtrises.
- [Page Notion](https://app.notion.com/p/3ebc799da3d18161a2f3c9a50f6b964e) : enchaînement d'attaques avec une arme.
- [Page Notion](https://app.notion.com/p/3ebc799da3d18153820fd1d9f3bcc82b) : prises `1 main`, `2 mains`, `Au choix`.
- [Page Notion](https://app.notion.com/p/3ebc799da3d181358861cee9d366aab5) : combat à deux armes.
## Bouclier physique V1
La même règle de blocage s'applique au **CAC et aux projectiles physiques**, sans malus spécifique au tir. Le bouclier peut également bloquer une Frappe dans le dos / attaque non détectée.
Un bouclier intervient **après un Toucher réussi et avant le critique positif de Toucher** via [Page Notion](https://app.notion.com/p/3ebc799da3d18126b594dcad23bb1b17).
Un blocage réussi signifie que l'attaque n'a pas réellement touché : pas de critique positif, pas de Blesser, pas de dégâts. Il casse l'enchaînement normal. En combat à deux armes, chaque attaque de la paire est testée séparément et la paire peut continuer si au moins une attaque touche réellement.
## Courage post-attaque CAC V1

> 
	**Exceptions positionnelles V1 :** un attaquant participant à un encerclement valide ne teste pas son Courage s'il ne blesse pas ; une cible en sous-nombre utilise [Page Notion](https://app.notion.com/p/3ecc799da3d1812e9014c8e88ce61b72) et teste immédiatement **après chaque blessure reçue**, avec `−10` au score par ennemi de surplus dans la mêlée locale.


La règle ci-dessous reste le cas général hors de ces exceptions.
[Page Notion](https://app.notion.com/p/3ebc799da3d181feab89f2e269b76863) est résolu **une seule fois en fin de séquence offensive** :
- au moins une blessure infligée → le défenseur teste normalement ;
- aucune blessure → l'attaquant teste, mais sa probabilité de fuite est divisée par deux.

> 
	Score de base : **Courage + 0,25 × Volonté − 0,25 × Intimidation adverse**, borné à 5–95 % avant l'ajustement du cas sans blessure.


## Tir & armes à distance V1
Le tir est construit comme un combat physique à distance, sans créer un second moteur.
- **Toucher** : [Page Notion](https://app.notion.com/p/3ebc799da3d181a3ba94d19f810bed85). Aucun malus jusqu'au quart de la portée max ; ensuite le malus croît jusqu'à `−40` au Delta à portée max. La couverture multiplie la probabilité finale par `0,5` ou `0,25`.
- **Blesser** : [Page Notion](https://app.notion.com/p/3ebc799da3d1818e9a97facf95fbd163). La **Perception remplace la Force**.
- **Dégâts physiques** : [Page Notion](https://app.notion.com/p/3ebc799da3d18169904ae0ef89f0b710). Aucun facteur Force : l'énergie est encodée dans les dés et puissances de l'arme.
- **Cadence** : [Page Notion](https://app.notion.com/p/3ebc799da3d181a8b9f8d3348f1180b2) pour les armes `Répétable`.
- **Projectile raté / approximation** : [Page Notion](https://app.notion.com/p/3ebc799da3d181a4be4dcbd527f992e8) peut toucher accidentellement un allié ou ennemi dans le couloir de tir.
- **Courage** : [Page Notion](https://app.notion.com/p/3ebc799da3d181bf854ae3f4850a61d3). Une cible réellement blessée peut fuir ; le tireur ne teste jamais son Courage simplement parce qu'il a raté ou n'a pas blessé.
- **Armes à feu** : [Page Notion](https://app.notion.com/p/3ebc799da3d181f1aa6be53eb35e371e) : pas de stock de munitions normales ; **recharger une arme = 1 Action rapide** ; épée + pistolet et deux pistolets suivent le combat à deux armes, avec inerties cumulées et une attaque de base par arme actuellement utilisable.
Une attaque à distance exige une **ligne de vue**. En V1, les éléments de décor indiquent directement leur protection : aucune, **partielle (****`×0,5`****)**, **forte / quasi-totale (****`×0,25`****)** ou **blocage total de ligne de vue** (tir impossible).
Tirer sur une cible distante alors qu'un ennemi est adjacent reste autorisé, mais provoque l'[Page Notion](https://app.notion.com/p/3ecc799da3d181559829dce0edf3a0d0) de cet ennemi. Tirer sur l'ennemi qui vous menace avec une arme autorisée au contact ne déclenche pas cette réaction.
## Attaques de zone — Toucher V1
[Page Notion](https://app.notion.com/p/3ecc799da3d181828c34f857d4be7366) fournit le noyau commun : l'attaque vise une **case**, puis chaque cible potentielle perd **10 points de probabilité de toucher par hex d'écart** à cette case.
`P_touche(d) = max(0, P_touche_centre − 10×d)`.
La **forme et le rayon** restent propres à l'arme ou au sort. Cette règle doit servir au Tromblon, à la Boule de feu, à la Pluie de glace et aux futures zones.
## Charge & contre-charge V1
- [Page Notion](https://app.notion.com/p/3ebc799da3d181a7b49bdb3808c3ddce) : ligne droite ; distance `MouvementBase` à `2 × MouvementBase` ; 2 % de chute de base ; puissance croissante selon distance parcourue × `Bonus charge base` de l'arme ; V1 = **1** par défaut, **2** pour hast / armes `2 mains`.
- [Page Notion](https://app.notion.com/p/3ebc799da3d18132a479c4110eb08760) : la cible d'une charge peut réagir avec une arme configurée `Contre-charge`. Une réaction **à distance part à mi-course** ; une réaction de mêlée / hast part à sa portée normale.
Si la contre-charge **blesse** le chargeur, son attaque est annulée et il teste immédiatement son Courage. En cas d'échec, il fait demi-tour et consomme tout mouvement de charge restant pour repartir dans la direction opposée.
## En Fuite V1
[Page Notion](https://app.notion.com/p/3ebc799da3d18112bec1e0ee97616436) gère le déplacement au moment où l'état En Fuite est appliqué : tout mouvement restant est utilisé pour s'éloigner de la source de peur. Avec `0` mouvement restant, le personnage reste sur place mais demeure En Fuite.
À partir du tour suivant, [Page Notion](https://app.notion.com/p/3ecc799da3d1817ca2fdd04ed14f0afe) est résolu au début de chaque activation. Une réussite retire immédiatement **En Fuite** et rend au joueur son activation normale complète. En cas d'échec, [Page Notion](https://app.notion.com/p/3ecc799da3d1817eb862f3983cc06338) remplace toute l'activation par un `1D3` : **Course effrénée**, **Cachons-nous** ou **Feu à volonté**. La première valeur à tester est un bonus de **+10 au score de récupération par tour commencé En Fuite** ; les déplacements imposés restent soumis aux attaques d'opportunité normales. Si **Cachons-nous** ne trouve aucun abri total valide, le personnage poursuit sa fuite vers une **sortie de carte**.
[Boîte à idées — Combat](https://app.notion.com/p/3ecc799da3d181c3a45ed60fccf36ebf)
[Fin de mission, temps & indisponibilités](https://app.notion.com/p/3edc799da3d181b593b4d808c233d592)
