# 💰 Réputation, renommée & salaires

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3edc799da3d1816d8c56ef472f3ea9ec?pvs=204
> Dernière édition Notion : 2026-10-03T03:44:40.042Z


> 
	**Version de travail consolidée — 2 octobre 2026.** Cette page distingue la réputation personnelle d’un mercenaire, la renommée de la compagnie et les mécanismes de rémunération. Les formules non encore chiffrées sont signalées comme telles.


## 1 — Réputation personnelle
La réputation personnelle représente **ce que les autres perçoivent du mercenaire**, et non une mesure parfaite de sa valeur réelle. Elle est calculée dès la création du mercenaire puis **recalculable au cours de sa carrière**, notamment après les combats et les évolutions de caractéristiques / compétences.
### Pool utilisé
Le même pool sert à calculer la **moyenne**, le **maximum** et le **minimum** :
- Force ;
- Constitution ;
- Dextérité ;
- Vitesse ;
- Endurance ;
- Esquive ;
- Chance ;
- Charisme ;
- Courage ;
- Intelligence ;
- Volonté ;
- Perception ;
- Puissance magique ;
- Réserve de mana ;
- les 5 résistances ;
- les 3 meilleures compétences martiales ;
- les 3 meilleures écoles de magie, hors sorts ;
- la meilleure compétence Artisanat ;
- la meilleure compétence Animal ;
- la meilleure compétence Camp ;
- la meilleure compétence Physiologie ;
- la meilleure compétence Social, **comptée deux fois**.
Pour le Social ×2, la même valeur est insérée deux fois dans le pool ; elle n’est pas doublée numériquement.
Seules les valeurs **strictement supérieures à 0** sont retenues pour le calcul de la moyenne, du maximum et du minimum.
### Formule de réputation personnelle
$$
ReputationPerso = MoyennePool \times \left(1+\frac{Charisme}{100}\right) \times \left(1+\frac{MaxPool}{100}\right) \times \left(1+\frac{MinPool}{100}\right)
$$
Le Charisme intervient donc à la fois comme valeur du pool et comme multiplicateur de visibilité / aura.

> 
	La valeur numérique peut rester cachée au joueur et être présentée sous forme qualitative. Elle sert néanmoins de vraie donnée de calcul.


### Exploits et carrière
La réputation personnelle possède désormais une petite composante persistante de carrière en plus du socle calculé.
Événements validés en combat / fin de mission :
- **CC confirmé** : `+1 Réputation` ;
- **EC confirmé** : `−1 Réputation` ;
- **participation à la blessure d’un ennemi** : `+1 % de la RéputationPerso de cet ennemi` ;
- **coup de grâce / ennemi tué** : `+10 % supplémentaires de la RéputationPerso de cet ennemi` ;
- **revient vivant d’une mission mais blessé** : `+10 Réputation` ;
- **revient vivant d’une mission sans blessure** : `+20 Réputation`.
La participation à la blessure est comptée **une seule fois par mercenaire et par ennemi**, dès lors que le mercenaire a effectivement contribué à ses dégâts. Le mercenaire qui porte le coup de grâce reçoit donc normalement le bonus de participation (`1 %`) **plus** le bonus de coup de grâce (`10 %`), soit `11 %` de la réputation de la cible s’il avait participé à sa mise à mort.
Les bonus de retour de mission sont **exclusifs** : un mercenaire indemne reçoit `+20`, pas `+10 +20`. La fatigue seule n’est pas considérée comme une blessure pour cette règle.
On stocke donc un `ReputationCareerDelta` persistant, initialisé à `0`, puis modifié par ces événements.
La réputation totale devient :
$$
ReputationPerso = ReputationCalculee + ReputationCareerDelta
$$
`ReputationCalculee` continue d’être entièrement recalculée à partir du pool après progression ; `ReputationCareerDelta` conserve la mémoire des événements de carrière qui modifient directement la réputation : CC / EC, participation aux blessures d’ennemis, coups de grâce et retours de mission.
## 2 — Renommée de la compagnie
La réputation générale de la compagnie correspond à sa **renommée / célébrité**, pas à sa moralité.
Elle doit servir notamment à :
- attirer davantage de mercenaires ;
- attirer des mercenaires de meilleure qualité ;
- ouvrir l’accès à des missions plus difficiles ;
- fournir une valeur synthétique comparable entre compagnies / parties.
Architecture retenue :
$$
RenommeeCompagnie = PointsMissions + ReputationDeveloppementCamp + PrestigeTop10Mercenaires
$$
Les pondérations exactes restent à définir.
Le bloc **PrestigeTop10Mercenaires** utilise les 10 mercenaires les plus réputés de la compagnie avec une pondération à définir.

> 
	La renommée de la compagnie doit également influencer les distributions de génération de `Create_Mercenary()` : les jets de début de partie sont des distributions de base, pas des constantes rigides.


## 3 — Alignement de compagnie
L’alignement est distinct de la renommée.
Le capitaine est l’identité de la compagnie : **l’alignement du capitaine fait donc office d’alignement de compagnie**.
Il évolue selon les choix du joueur et influence notamment :
- les profils de mercenaires attirés ;
- les types de missions proposés ;
- les tensions / départs des mercenaires d’alignement très opposé ;
- certains conflits internes.
Ces effets doivent être probabilistes plutôt que des exclusions automatiques.
## 4 — Salaire : formule V1
Le salaire ne mesure pas la valeur réelle du mercenaire.
> **On n’est pas payé ce qu’on vaut : on est payé selon ce que les autres perçoivent et selon la manière dont on se vend.**
La **Réputation personnelle** fournit la part principale du salaire. **Prétentions salariales** et **Intelligence** ne créent pas la valeur marchande : elles la **déforment**.
La caractéristique maximale n’intervient plus directement dans le salaire : elle influence déjà indirectement la Réputation personnelle via le pool et `MaxPool`.
### Salaire de base — Réputation
$$
SalaireBase = max\left(1, \frac{ReputationPerso}{30}\right)
$$
`1–10 PO/jour` correspond à la plage normale d’un mercenaire ordinaire, **pas à un plafond**. Un vétéran célèbre ou une légende peut dépasser largement `10 PO/jour`.
### Déformation — Prétentions salariales
Avec `PretentionsSalariales = 10D6`, centrées autour de `35` :
$$
FacteurPretentions = 1 + \frac{PretentionsSalariales - 35}{100}
$$
Ordres de grandeur : `10 → ×0,75`, `35 → ×1`, `60 → ×1,25`.
### Déformation — Intelligence
L’Intelligence suit une courbe en U centrée sur `100` :
$$
FacteurIntelligence = 1 + 0,25 \times \left(\frac{Intelligence - 100}{100}\right)^2
$$
- autour de `100` : déformation minimale ;
- sous `100` : le mercenaire peut se **survendre** ;
- au-dessus de `100` : il sait mieux **négocier sa valeur**.
### Formule finale V1
$$
SalaireDemande = max\left(1, \frac{ReputationPerso}{30}\right) \times \left(1 + \frac{PretentionsSalariales - 35}{100}\right) \times \left[1 + 0,25 \times \left(\frac{Intelligence - 100}{100}\right)^2\right]
$$
Le résultat est exprimé en **pièces d’or par jour** et n’a pas de plafond.
## 5 — Prétentions salariales
`Prétentions salariales` reste un **attribut caché**, mais appartient conceptuellement au domaine **Social caché**.
Tirage brut initial :
$$
PretentionsSalariales = 10D6
$$
Cette valeur :
- est générée à la création ;
- est évolutive ;
- entre dans les futures formules de salaire ;
- **n’entre jamais dans le Max Social utilisé pour calculer la réputation personnelle**.
## 6 — Éléments de rémunération
Le salaire de base est une **rémunération journalière**, cohérente avec la couche gestion en jours.
À distinguer conceptuellement :
- **salaire demandé** : prétention du mercenaire ;
- **salaire contractuel** : rémunération acceptée lors du recrutement / renégociée ;
- **prime de mission** : rémunération supplémentaire liée à une mission ;
- **salaire réellement versé** : peut dépendre des politiques de la compagnie.
Règle retenue pour les primes : **la prime de mission est payée au mercenaire s’il revient**.
## 7 — Politique des blessés — « T’es pas à la Sécu ici »
La compagnie pourra définir un **taux de salaire des blessés de 0 à 100 %**.
Un taux faible :
- économise de l’or à court terme ;
- rend la compagnie moins attractive ;
- augmente le risque de départ des blessés ;
- peut conduire un mercenaire à partir avec l’équipement qui lui avait été confié.
Les formules exactes de loyauté, départ et attractivité restent à définir.
## 8 — Points encore ouverts
- négociation du salaire contractuel ;
- évolution des prétentions salariales ;
- règles de renégociation en cours de carrière ;
- arrondi / granularité d’affichage du salaire demandé ;
- pondération exacte du Top 10 dans la renommée de compagnie ;
- conversion des points de mission et du développement du camp en renommée ;
- éventuels nouveaux gains directs de réputation liés au camp.
