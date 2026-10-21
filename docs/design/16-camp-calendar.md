# Calendrier du Royaume — affichage au camp

Décision d'Idan, 21 octobre 2026 : un calendrier gaélico-médiéval cynique, avec une courte citation quotidienne, est visible sur **l'accueil du camp**. C'est désormais ici que se trouve le bouton **Jour suivant** ; il disparaît de la Taverne.

## Référentiel et convention d'affichage

Source structurée : `data/reference/camp-calendar.json`.

- 12 mois de 31/28/31/30/31/30/31/31/30/31/30/31 jours : **365 jours** exactement.
- 7 jours : **Lunbrume**, **Martel**, **Druiden**, **Sermentel**, **Soldren**, **Bastor**, **Dimcairn**.
- 12 mois : **Brumecendre**, **Corbenaël**, **Bourbevent**, **Florémort**, **Beltefeu**, **Soldehaut**, **Fauchefer**, **Lughraille**, **Brandebruyne**, **Cerfombre**, **Samhargne**, **Neigedette**.
- Convention initiale (présentation seulement) : **Jour de campagne 1 = Lunbrume, 1 Brumecendre, an 842 — Âge des Couronnes Brisées**.
- Les 7 jours de la semaine se poursuivent au changement d'année ; pas d'année bissextile.
- Trois citations par mois tournent à chaque nouveau jour de ce mois. Une citation n'est donc pas nécessairement unique sur les 365 jours.

L'almanach affiche simultanément le **numéro absolu du jour de campagne**, le jour de semaine, le quantième, le mois, l'année et la citation. Le joueur ne perd donc jamais ses repères dans les systèmes qui utilisent `campaign.day`.

## Temps stratégique

Le bouton **Jour suivant** a simplement changé de scène : il appelle toujours `campaignRules().advanceTime(campaign, 1)`, le traitement existant de la Taverne étant réutilisé pour les salaires, guérisons, départs et arrivées des candidats, journalisation et sauvegarde.

Le calendrier est **dérivé de `campaign.day`** : aucune date secondaire à sauvegarder, aucune formule de combat, de recrutement ou d'économie modifiée.
