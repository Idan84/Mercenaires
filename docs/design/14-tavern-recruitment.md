> **Statut : DRAFT — À valider par Idan.**  
> Ce document consolide uniquement les décisions déjà prises sur le recrutement et isole les points ouverts. Il ne doit pas être traité comme une autorisation d'implémenter les règles encore marquées « À décider ».

# Taverne — recrutement V1

La Taverne est le cœur du recrutement au début de partie. Elle ne génère pas des fiches jetables au moment du clic : les candidats sont de vrais mercenaires persistants, avec leur propre identité, leurs caractéristiques réelles et leurs attentes.

## 1 — Principes déjà validés

### Candidats persistants

Un candidat est un objet `Mercenary` complet généré **avant** son recrutement.

Il peut rester visible à la Taverne pendant plusieurs jours ou semaines. Il n'est pas régénéré lorsque le joueur l'ouvre ou décide de lui parler.

Conséquence voulue : un candidat médiocre qui s'éternise peut occuper une place qui aurait pu accueillir plus tard un candidat exceptionnel.

### Recrutement en entretien individuel

Le recrutement a été pensé comme un **speed-dating de candidats** :

1. le candidat se présente ;
2. le joueur peut lui poser des questions ;
3. une négociation salariale peut avoir lieu ;
4. le joueur décide de recruter ou non ;
5. une partie de la vraie valeur du mercenaire n'est découverte qu'après son arrivée au camp et son utilisation réelle.

Une séquence de design antérieure mettait en scène **5 candidats**. Le point encore ouvert est de savoir si cela représente 5 places disponibles, 5 nouveaux arrivants quotidiens, ou seulement la taille du premier lot de recrutement.

### Vérité du personnage et information du joueur

Le mercenaire possède une vérité complète dès sa génération.

Le joueur ne connaît pas nécessairement cette vérité pendant l'entretien. Le système doit pouvoir distinguer au minimum :

- les données réellement connues ;
- les déclarations du candidat ;
- les informations estimées ;
- les données cachées qui seront révélées progressivement au camp ou en mission.

La liste exacte des informations appartenant à chaque catégorie reste à décider.

### Salaire et contrat

Les concepts suivants sont déjà séparés :

- **Salaire demandé** : montant annoncé / demandé par le candidat ;
- **Salaire contractuel** : montant accepté lors du recrutement ou d'une renégociation ;
- **Prime de mission** : rémunération supplémentaire liée à une mission ;
- **Salaire réellement versé** : peut varier selon les politiques de compagnie.

La formule V1 de `SalaireDemande` est définie dans `09-reputation-renown-and-salaries.md`.

L'attribut interne **Prétentions salariales** est caché au joueur et participe au calcul du salaire demandé.

La négociation du salaire contractuel n'est pas encore définie.

## 2 — Attractivité de la compagnie

La renommée de la compagnie doit influencer le recrutement de deux manières déjà validées :

- attirer **davantage** de mercenaires ;
- attirer des mercenaires **de meilleure qualité**.

Les distributions de base de `Create_Mercenary()` ne doivent donc pas être considérées comme définitivement fixes : elles sont destinées à être pondérées par la renommée de la compagnie.

Le capitaine influence déjà certaines distributions du candidat, notamment son peuple, sa culture, son ascendance et son alignement selon les règles du générateur.

## 3 — Temps stratégique

La couche stratégique fonctionne en **jours**.

Le passage du temps doit notamment faire progresser :

- renouvellement des candidats ;
- départ éventuel de candidats ;
- salaires ;
- missions ;
- soins ;
- entraînements ;
- constructions.

Le document `10-mission-time-and-unavailability.md` prévoit conceptuellement une fonction centrale `AdvanceTime(days)`.

**Décision encore à valider :** adopter formellement cette horloge unique comme point d'entrée de tous les systèmes stratégiques.

## 4 — Capacité

Le dortoir de départ peut héberger **20 mercenaires recrutés**.

La capacité d'affichage / d'accueil des **candidats de la Taverne** n'est pas encore définie.

Il faut distinguer :

- capacité du roster / dortoir ;
- capacité de candidats présents à la Taverne ;
- nombre d'arrivées potentielles lors d'un changement de jour.

Cette séparation est nécessaire pour obtenir le comportement voulu où un candidat qui reste peut empêcher un nouveau tirage.

## 5 — Boucle quotidienne à définir

Le système quotidien devra pouvoir répondre sans ambiguïté aux questions suivantes :

1. Quand un nouveau jour commence, combien de candidats tentent d'arriver ?
2. Les arrivées remplissent-elles uniquement les places libres ?
3. Combien de places de candidats possède la Taverne au niveau initial ?
4. Comment les améliorations de la Taverne augmentent-elles cette capacité ou ce flux ?
5. Quand et pourquoi un candidat décide-t-il de partir ?
6. Un candidat peut-il être chassé / refusé définitivement par le joueur ?
7. Un candidat refusé peut-il revenir plus tard ?
8. Que se passe-t-il si le dortoir est plein au moment de signer ?

Ces points sont regroupés dans l'Issue #5.

## 6 — Négociation à définir

La négociation salariale doit encore fixer :

- nombre d'offres / contre-offres ;
- seuils d'acceptation ;
- risque de vexer ou perdre le candidat ;
- possibilité d'accepter moins que le salaire demandé ;
- rôle éventuel du Charisme, de l'Intelligence, de la Réputation, des Prétentions salariales ou d'autres variables déjà existantes ;
- conséquences à long terme d'un contrat très favorable ou défavorable.

Aucune formule ne doit être codée avant validation.

## 7 — Entretien : information à définir

Le recrutement doit conserver l'idée que le joueur **évalue** un individu plutôt que de lire une fiche omnisciente.

À décider pour chaque type d'information :

- identité, peuple, culture, origine ;
- caractéristiques ;
- compétences et maîtrises ;
- équipement ;
- blessures / séquelles ;
- magie ;
- personnalité / alignement ;
- réputation ;
- salaire ;
- autres exigences contractuelles éventuelles.

Chaque donnée pourra être exacte, déclarée, estimée ou cachée selon la règle retenue.

## 8 — Dépendances techniques

La Taverne dépend de :

- `Create_Mercenary()` pour créer les candidats persistants ;
- une horloge stratégique commune si `AdvanceTime(days)` est validé ;
- la renommée de compagnie pour faire évoluer quantité et qualité des candidats ;
- le futur système de contrat pour transformer un candidat en membre du roster ;
- la capacité du dortoir pour finaliser ou refuser un recrutement.

## 9 — Décisions en attente

Voir **Issue #5 — `IDAN — Décision : Taverne V1 — cycle de recrutement`**.

Priorité de décision :

1. modèle de places / arrivées ;
2. durée de présence et départ spontané ;
3. négociation salariale ;
4. informations visibles pendant l'entretien ;
5. interaction avec la capacité du dortoir ;
6. validation de `AdvanceTime(days)`.

Une fois ces six points validés, ce document pourra passer de **DRAFT** à **V1 validée** et être remis à JC3 pour implémentation.
