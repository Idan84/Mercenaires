# 01 — Génération & identité

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3eac799da3d181c491e3d99c69fa2317?pvs=204
> Dernière édition Notion : 2026-10-02T22:17:14.804Z

Référentiels et règles utilisés pour générer l’identité initiale d’un mercenaire.

> 
	Le pipeline ci-dessous décrit la génération statistique commune. Son point d’entrée dépend de la fonction appelante : `Create_Captain_Mercenary` laisse le joueur choisir son identité sans modifier les jets bruts ; `Create_Mercenary` utilise les tirages aléatoires et les biais liés au capitaine. Voir [Page Notion](https://app.notion.com/p/3ebc799da3d18106a6d0dc0a410e55a8).


## Pipeline actuel
1. **Tirage brut des caractéristiques** : caractéristiques fondamentales = **20 + 3D20** ; résistances = **1D6**. Ces distributions seront plus tard pondérées par la renommée / réputation du capitaine-compagnie.
2. **Tirage du peuple** selon sa probabilité de base.
3. **Lecture des modificateurs du peuple** : appliquer immédiatement les caractéristiques / résistances ; mémoriser les bonus ou malus de compétences pour la phase compétences.
4. **Ascendance** : jet de présence ; si oui, tirage parmi les ascendances compatibles puis tirage du niveau.
5. **Lecture des modificateurs d’ascendance** : appliquer caractéristiques / résistances ; mémoriser les modificateurs de compétences.
6. **Tirage de la culture** parmi celles associées au peuple.
7. **Lecture des modificateurs de culture** : appliquer caractéristiques / résistances ; mémoriser les modificateurs de compétences.
8. **Tirage de l’origine sociale** parmi celles compatibles avec la culture.
9. **Lecture des modificateurs d’origine sociale** : appliquer caractéristiques / résistances ; mémoriser les modificateurs de compétences.
10. **Génération brute des compétences** selon les règles propres à chaque famille, en sachant déjà si un bonus de génération existe.
11. **Application des modificateurs numériques de compétences** accumulés depuis la Matrice de génération.
12. **Post-traitement** : valeurs dérivées initiales, réputation personnelle initiale et autres calculs dépendant du profil complet.

> 
	**La Matrice de génération est la source de vérité pour l’équilibrage.** Une case vide ou `0` signifie « aucun effet ». `+1 / +2 / +3` sont des bonus ; `−1 / −2 / −3` des malus. Les vues **Peuples / Ascendances / Cultures / Origines**, chacune déclinée en **Caractéristiques / Résistances / Compétences**, permettent de modifier les valeurs comme dans un tableau à double entrée sans toucher à la structure générale.



> 
	**Échelle D6 standard** : intensité 1 = `2D6`, 2 = `4D6`, 3 = `6D6`. Pour les ascendances : niveau 1 = `2D6 / 4D6 / 6D6` ; niveau 2 = `4D6 / 8D6 / 12D6` ; niveau 3 = `6D6 / 10D6 / 15D6`. Les prétentions salariales sont traitées comme un attribut Social caché avec leur propre tirage brut.



> 
	**Scalabilité du recrutement** — Tous les jets de dés de `Create_Mercenary` doivent pouvoir être pondérés par la réputation du capitaine / de la compagnie. Les dés indiqués dans les règles de génération sont des **distributions de base**, pas des valeurs à coder en dur. À forte réputation, les candidats générés doivent pouvoir être sensiblement meilleurs qu'au début de partie.


## Génération brute des compétences — règles en cours
### Compétences martiales
Pour chaque sous-catégorie martiale :
- si le mercenaire possède un bonus issu du peuple, de l'ascendance, de la culture ou de l'origine : `2D20` ;
- sinon : `1D20`.
La valeur de la **catégorie martiale** est dérivée de sa meilleure sous-catégorie :
`Catégorie martiale = Max(sous-catégories) × Rand(0,8 ; 1,2)`.
### Animal
Pour chaque sous-compétence Animal :
- si bonus de génération : `2D20` ;
- sinon : 50 % de chance d'obtenir `1`, 50 % de chance d'obtenir `1D20`.
La valeur de la **catégorie Animal** est dérivée de sa meilleure sous-compétence :
`Animal = Max(sous-compétences Animal) × Rand(0,8 ; 1,2)`.
### Écoles de magie
Pour chaque école de magie :
- si le mercenaire possède un bonus sur cette école **ou** réussit un jet de présence à 50 %, alors : `École = Moyenne(Intelligence, Puissance magique, Réserve de mana) × Rand(0,5 ; 1,5)` ;
- sinon : `École = 1`.
### Camp
Pour chaque compétence de la famille Camp :
`Camp = (0,5 + Charisme / 100 + 0,5 + Intelligence / 100) × 6D6`
Soit, sous forme simplifiée :
`Camp = (1 + (Charisme + Intelligence) / 100) × 6D6`.
### Artisanat
Pour chaque compétence de la famille Artisanat :
`Artisanat = (0,5 + Dextérité / 100 + 0,5 + Intelligence / 100) × 6D6`
Soit, sous forme simplifiée :
`Artisanat = (1 + (Dextérité + Intelligence) / 100) × 6D6`.
### Physiologie
- `Régénération = 0` au tirage brut initial.
### Social
Pour chaque compétence sociale :
`Social = 10D6`.
**Prétentions salariales** est conceptuellement un **attribut Social caché** et suit également un tirage brut `10D6`, mais reste stocké parmi les attributs cachés. Il est exclu du `Max Social` utilisé dans la réputation personnelle.
Ces règles sont elles aussi soumises au principe général de pondération future par la réputation du capitaine / de la compagnie. Les modificateurs de peuple, ascendance, culture et origine restent appliqués par le pipeline de génération après le tirage brut.

> 
	**Ordre d’implémentation des compétences :** les bonus de peuple / ascendance / culture / origine doivent pouvoir être connus avant le tirage brut d’une compétence, puisqu’ils déterminent parfois si elle reçoit `1D20` ou `2D20`. En code, les bonus de compétences peuvent donc être **collectés / mis en attente** pendant la génération de l’identité, puis le tirage brut des compétences est effectué, puis les modificateurs numériques de la Matrice sont appliqués. Ne pas appliquer un bonus numérique à une compétence encore non initialisée.


**Base Notion :** [Peuples](https://app.notion.com/p/9a5cd156f4444837ae630b1862f60541)
**Base Notion :** [Ascendances](https://app.notion.com/p/e2bd4f129d754ce1885acf62ea90f487)
**Base Notion :** [Cultures](https://app.notion.com/p/901364a7f401459594940d1e11ed10d2)
**Base Notion :** [Origines sociales](https://app.notion.com/p/17bc7a7e1e6a45ef861358747dbafb83)
**Base Notion :** [Alignements](https://app.notion.com/p/268aef3cc286435ea9aa0bcaaa5be428)
**Base Notion :** [Étapes de génération](https://app.notion.com/p/905a18852ebc4f148f18e0b10c2ecca6)
**Base Notion :** [Niveaux d’ascendance](https://app.notion.com/p/5b78a963a81e43f7869b1920e369efcd)
**Base Notion :** [Compatibilités d’ascendance](https://app.notion.com/p/2104bbf4810e484ea41807534924b989)
**Base Notion :** [Compatibilités culture–origine sociale](https://app.notion.com/p/84e0baa713b547da90526b430d76a29c)
**Base Notion :** [Matrice de génération](https://app.notion.com/p/fb435c78a6e74068965f53f164b0d8e7)
**Base Notion :** [Échelle D6 — génération](https://app.notion.com/p/b949e703e1b7435396a99b36ecf6e417)
## Backlog narratif — biographies de mercenaires
Piste de conception retenue pour le futur générateur narratif : créer une **grande banque de biographies courtes, plutôt drôles et marquées**, puis faire correspondre ces biographies aux profils générés plutôt que rédiger systématiquement un texte depuis zéro.
Le matching pourra s'appuyer sur peuple, culture, origine sociale, caractéristiques dominantes/faibles, compétences, équipement, personnalité et particularités. Le système précis et le volume de biographies restent à définir.

