> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Progression & expérience

<aside>
🧪

**Version de travail validée au 1er octobre 2026.** Le système sépare l’**XP naturelle**, gagnée par ce que le mercenaire vit réellement, et l’**XP choisie**, obtenue par formation au camp.

</aside>

## 1 — Courbe universelle XP → niveau

Même fonction pour les caractéristiques et les compétences :

$$
XP_{cumulé}=10\times Niveau^2
$$

$$
Niveau=\sqrt{XP/10}
$$

Le rendement de l’XP est donc décroissant : chaque point supplémentaire demande davantage d’XP que le précédent.

Le coût marginal d’un niveau est :

$$
XP(L\rightarrow L+1)=10(2L+1)
$$

Pour les caractéristiques, **pas de plafond maximum**. Le plafond éventuel des compétences reste à confirmer.

### Repères de progression

| Passage | XP nécessaire sur la tranche | XP cumulé à l’arrivée |
| --- | --- | --- |
| 0 → 10 | 1 000 | 1 000 |
| 10 → 20 | 3 000 | 4 000 |
| 20 → 30 | 5 000 | 9 000 |
| 30 → 40 | 7 000 | 16 000 |
| 40 → 50 | 9 000 | 25 000 |
| 50 → 60 | 11 000 | 36 000 |
| 60 → 70 | 13 000 | 49 000 |
| 70 → 80 | 15 000 | 64 000 |
| 80 → 90 | 17 000 | 81 000 |
| 90 → 100 | 19 000 | 100 000 |
| 100 → 110 | 21 000 | 121 000 |
| 110 → 120 | 23 000 | 144 000 |
| 120 → 130 | 25 000 | 169 000 |
| 130 → 140 | 27 000 | 196 000 |
| 140 → 150 | 29 000 | 225 000 |

## 2 — XP naturelle

Principe général : les caractéristiques progressent en conséquence d’actions et de résultats d’actions en combat. Un plafond de gain par mission est envisagé mais **pas encore chiffré**.

### Chance — « La chance tourne »

- **EC confirmé** : `+30 XP Chance`.
- **CC** : `−5 XP Chance`.
- L’XP ne descend jamais sous 0.

Avec les formules actuelles de CC/EC, le système crée un équilibre statistique naturel autour de **Chance 75** : en dessous, la tendance moyenne est à la hausse ; au-dessus, à la baisse.

### Résistances — « Ce qui ne te tue pas te rend plus fort »

À chaque **blessure effectivement subie** d’un type de dégâts :

- résistance correspondant au type : `+8 XP` ;
- chacune des quatre autres résistances : `−2 XP` ;
- aucune résistance ne descend sous `0 XP` ;
- aucun plafond maximum.

Types concernés : Physique, Feu, Froid, Foudre, Poison.

**Dégâts mixtes :** chaque composante est traitée séparément. Exemple Physique + Feu : résolution complète du gain/perte Physique, puis résolution complète du gain/perte Feu.

**Attaques multiples et DOT :** même règle. Ce qui compte est chaque blessure effectivement subie, quelle que soit sa source ou sa fréquence.

### Constitution — « Y’a quelque chose dans ta potion, non ? »

Pour chaque **1 PV réellement restauré par un soin** :

- `+1 XP Constitution`.
- Les PV de soin qui dépassent les PV max ne rapportent rien.
- Seuls les PV réellement récupérés comptent.

### Courage — « Courage, fuyons ! »

Chaque **charge tentée contre un ennemi**, même ratée ou finie en chute (« le courage, c'est de tenter » — Idan, 2026-10-06) :

- `+50 XP Courage`.

### Vitesse — « Cours Forest, cours ! »

Chaque **case parcourue en état de fuite** :

- `+2 XP Vitesse`.

### Charisme — « Triste Monde ! »

Chaque **adversaire mis hors combat** par le mercenaire (décision Idan, 2026-10-06 : les ennemis ne font pas de jet de mort, « tué » = hors combat) :

- `+50 XP Charisme`.

Le Charisme inclut ici l’idée d’aura, de présence et de réputation martiale, pas seulement l’aisance sociale.

### Perception — « C’est comme ça que le métier rentre »

Chaque fois qu’un mercenaire est **effectivement blessé par une attaque reçue dans le dos** :

- `+10 XP Perception`.

### Force

**À définir.** Ne pas inventer de « test de Force » tant que cette mécanique n’existe pas réellement dans le système de combat.

### Application en fin de mission (V1 — décisions Idan du 2026-10-06)

- La **valeur** d'une caractéristique ou d'une résistance **est son niveau** : une valeur de 50 correspond à 25 000 XP cumulés.
- Pendant la mission, chaque mercenaire tient un **journal** de ce qu'il vit ; l'XP naturelle est calculée et appliquée **en fin de mission**, aux survivants (y compris ceux qui ont fui le combat).
- Une valeur **monte ou descend** selon son XP ; l'XP ne descend jamais sous 0, ni la valeur sous son minimum.
- Une valeur générée, qui n'a pas encore d'XP, démarre au **milieu de la tranche** de son niveau (constante `progression.xp_curve.start_position` = 0,5, proposition JC3 à valider) : sans cela, la première petite perte ferait tomber un point.
- Le joueur voit un **récapitulatif** dans le bilan de fin de mission : XP gagnée ou perdue par caractéristique, et valeurs qui ont changé.
- Toutes les valeurs de cette section sont des **constantes d'équilibrage** (`data/reference/formula-constants.json`, codes `progression.*`).
- Branché dans le prototype : Résistances, Courage, Vitesse, Charisme, Perception. En attente : **Chance** (critiques pas encore joués par le moteur de combat) et **Constitution** (pas encore de soins en combat).

## 3 — XP choisie : formation au camp

L’XP choisie permet au joueur d’orienter volontairement la progression d’un mercenaire en échange de **temps, argent et disponibilité opérationnelle**.

### Boucle hebdomadaire

1. Choisir une caractéristique ou compétence à entraîner.
2. Affecter un **professeur**.
3. Affecter un ou plusieurs **élèves**.
4. Payer le coût de la formation.
5. Résoudre les tests de formation.
6. Attribuer l’XP obtenue à la caractéristique ou compétence visée.

### Professeur

- Normalement un mercenaire présent au camp.
- Doit posséder un **niveau minimum** dans la caractéristique ou compétence enseignée.
- Sa compétence **Transmission du savoir** modifie/multiplie le gain d’XP des élèves.
- Certains événements peuvent faire apparaître temporairement un instructeur PNJ, par exemple un **BootCamp**.

### Élèves

- Leur progression dépend de tests, notamment **Intelligence** et d’autres caractéristiques pertinentes selon la matière.
- Le résultat de ces tests détermine si l’élève progresse et de combien.

### Contraintes

- Une formation dure **une semaine**.
- Professeur et élèves affectés sont **indisponibles pour partir en mission** pendant la formation.
- La formation **coûte de l’argent**.

### Salles dédiées envisagées

- **Salle de sport** : caractéristiques physiques.
- **Salle de torture** : caractéristiques psychologiques.
- **Cabinet médical / prison** : médecine, alchimie et certaines formations magiques.
- D’autres bâtiments spécialisés pourront être ajoutés selon les domaines d’apprentissage.

La qualité/niveau de la salle pourra servir de multiplicateur ou modificateur de formation. Les valeurs exactes restent à équilibrer.

## 4 — Principe de conception

> Un mercenaire progresse naturellement parce qu’il **vit certaines situations**, et progresse volontairement parce que le joueur accepte de **sacrifier une semaine de disponibilité et de l’argent pour le former**.
> 

Cette asymétrie est volontaire : toutes les caractéristiques n’ont pas besoin du même nombre de sources d’XP, ni de règles symétriques.