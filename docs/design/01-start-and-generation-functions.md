# Démarrage de partie & fonctions de génération

Une nouvelle partie crée le **capitaine**, puis l'**escouade initiale**. Ensuite, chaque mercenaire généré reçoit le
capitaine comme contexte de pondération (ses biais : `data/reference/formula-constants.json`).

## Création du capitaine

Le joueur choisit : son prénom (et un nom de famille s'il le veut) ; le peuple ; s'il veut une ascendance ; la culture ;
l'origine sociale ; son arme favorite, sa tenue, ses affinités spirituelles et son caractère (ci-dessous) ; son
portrait ; l'alignement (par défaut, le plus fréquent de son peuple ou de sa culture) ; le nom et le blason de sa
compagnie.

Les jets ne sont **jamais améliorés, relancés ou modifiés par l'identité** : mêmes jets bruts qu'un mercenaire normal
(caractéristiques fondamentales `20 + 3D20`, résistances `1D6`). Les choix décident seulement quels modificateurs et
quelles tables s'appliquent.

**Ascendance** : il choisit son type parmi ceux compatibles avec son peuple et la reçoit au **niveau 3** (modificateurs
de la Matrice de génération, échelle D6 du niveau 3).

### Choix de personnalité (Idan, 2026-11-12)

Quatre questions, après l'ascendance (« on peut se retrouver à jouer un healer alors qu'on est un bourrin »). Les gains
ne s'affichent jamais. Ils s'appliquent une fois le profil tiré (après la remise à 1 des compétences non pratiquées) et
avant les valeurs dérivées (PV, réputation, équipement, salaire).

| Question | Effet |
|---|---|
| Arme favorite (toutes les armes du jeu, sans les boucliers) | +3D6 dans l'arme, +2D6 dans sa famille |
| « Vestimentairement, vous êtes plutôt ? » | Ports d'armure : le vent = aucun ; un petit truc léger = légère ; mon cuir = légère et intermédiaire ; une vraie boîte de conserve = les trois |
| « Sur le plan spirituel, vous avez des affinités » | +2D6 dans l'école (bain = Eau, barbecues = Feu, foudre = Foudre, chaque chose vivante = Vie, changer d'apparence = Transmutation, refuser de croire en la mort = Nécromancie, animaux de compagnie = Invocation, faire voler les choses = Télékinésie, ne croire que ce qu'on ne voit pas = Illusion) |
| « Franchement aucune ! » | Les points de ses écoles (au-dessus de 1, la valeur « non pratiquée ») sont répartis au hasard, point par point, dans ses caractéristiques non magiques (toutes sauf Puissance magique et Réserve de mana) ; il perd ses sorts ; un capitaine mage change de domaine |
| « Pour bien vous comprendre » | +2D6 dans la caractéristique : Vitesse, Perception, Courage, Intelligence, Force ou Dextérité |

## Escouade initiale

**X mercenaires** dont le **peuple** et la **culture** sont forcés à ceux du capitaine ; tout le reste suit la génération
normale.

| Peuple du capitaine | Sans ascendance | Avec ascendance |
| --- | --- | --- |
| Ogre | `1D3 + 1` | `1D3` |
| Elfe / Reptilien / Homme-bête | `2D6 + 3` | `2D6` |
| Nain / Orc / Humain | `3D6 + 4` | `3D6` |
| Gnome / Gobelin / Halfling | `4D6 + 6` | `4D6` |

## Création d'un mercenaire et biais du capitaine

1. **Peuple** (sauf s'il est forcé) : **+9 points de pourcentage** pour le peuple du capitaine, **−1** pour chacun des
   9 autres (le total reste 100 %). Puis les modificateurs de caractéristiques du peuple ; ceux de compétences sont mis
   de côté.
2. **Ascendance** : la probabilité d'en avoir une ne change pas. Si le mercenaire est du peuple du capitaine, a une
   ascendance, et que celle du capitaine est compatible, le **poids de l'ascendance du capitaine est × 2** (tirage
   normalisé). Puis le niveau et les modificateurs.
3. **Culture** (forcée et compatible, ou tirée) : si celle du capitaine est compatible avec le peuple, son **poids est
   × 2**. Puis ses modificateurs.
4. **Origine sociale**, tirée parmi celles de la culture ; ses modificateurs.
5. **Alignement** (sauf s'il est forcé) : celui du peuple, ou de l'exception culturelle ; puis l'**alignement exact du
   capitaine gagne +15 points**, les autres baissent **proportionnellement** (7,5 % → 22,5 %). Seule l'orientation
   change. L'alignement choisi du capitaine reste forcé.
6. **Compétences brutes**, puis tous les modificateurs de compétences mis de côté.
7. **Valeurs dérivées.**

**Décision de conception** : les jets de la génération doivent aussi être **pondérés par la réputation du capitaine / de
sa compagnie**. `20 + 3D20`, `1D20`, `2D20`… sont des distributions de base, pas des constantes : plus la compagnie est
réputée, plus le niveau des candidats peut monter.

## Ouverture narrative

En **vue subjective**, un château en ruines au milieu d'une bataille entre Orcs, Elfes et Humains. Le personnage-joueur
fuit et se réfugie dans une petite pièce. Un homme en armure, blessé à l'abdomen, s'effondre près de lui : barbe blanche
parfaitement taillée, cheveux courts, allure de vieux « Prince Charmant ». La bataille est perdue, Garreth, Ludwig et
les autres sont morts ; il a toujours cru en lui et lui demande de les venger. Il lui remet sa chevalière :

> « Bob, tu es le capitaine à présent. Tu es le dernier vivant, mais je suis certain que tu seras un bon capitaine. Tu
> t'appelles bien Bob ? »

Puis : **« Vous vous appelez Bob ? Tapez votre nom : »** et la création guidée. Un seul bouton, « Vous n'êtes pas
Bob ? », pas de « C'est moi » ; texte et voix d'Idan (Idan, 2026-10-04). Le thème « Blood & Wages » accompagne l'arrivée
au camp. Le château en ruines devient le **camp** de la compagnie, restauré et agrandi pendant la partie. L'escouade
initiale existe quand même ; sa justification narrative pourra être affinée.

## Hiérarchie de compagnie

**Capitaine → Lieutenants → Mercenaires** : un seul capitaine ; lieutenant est un rang porté par un mercenaire (effets :
[doc 11 §4](/design/#doc=11-camp-and-ruined-castle.md)). **Pas de succession : la mort du capitaine est un Game Over.**
