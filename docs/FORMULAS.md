# Formules validées

## Progression universelle

`XP cumulée = 10 × Valeur²`

`Valeur = sqrt(XP / 10)`

## Réputation personnelle — socle calculé

Pool : caractéristiques, résistances, top 3 martial, top 3 écoles de magie, max Artisanat, max Animal, max Camp, max Physiologie, max Social dupliqué deux fois. Seules les valeurs > 0 sont retenues.

`RéputationCalculée = MoyennePool × (1 + Charisme/100) × (1 + MaxPool/100) × (1 + MinPool/100)`

`RéputationPerso = RéputationCalculée + ReputationCareerDelta`

Événements de carrière validés :
- CC confirmé : `+1` réputation.
- EC confirmé : `-1` réputation.
- participation à la blessure d'un ennemi : `+1%` de sa réputation, une seule fois par mercenaire et par ennemi.
- coup de grâce : `+10%` supplémentaires de la réputation de la cible.
- retour vivant blessé : `+10`.
- retour vivant sans blessure : `+20`.

## Salaire demandé V1

La réputation fournit la valeur principale ; prétentions et intelligence la déforment.

`SalaireBase = max(1, RéputationPerso / 30)`

`FacteurPrétentions = 1 + (PrétentionsSalariales - 35) / 100`

`FacteurIntelligence = 1 + 0.25 × ((Intelligence - 100) / 100)²`

`SalaireDemandé = SalaireBase × FacteurPrétentions × FacteurIntelligence`

Pas de plafond. La zone `1–10 PO/jour` est une plage normale, pas une limite absolue.
