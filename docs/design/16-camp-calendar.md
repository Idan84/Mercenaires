# Calendrier du Royaume — barre du bas

Décision d'Idan, 21 octobre 2026 : un calendrier gaélico-médiéval cynique, avec une courte citation quotidienne. Le bouton **Jour suivant** quitte la Taverne.

Le même jour, Idan a précisé l'emplacement : le calendrier, en petit, et le bouton vivent dans **la barre du bas**, et non plus sur l'accueil du camp.

- **Au centre** : un gros bouton play, qui fait passer au jour suivant. Il n'apparaît qu'au camp, jamais en mission.
- **Juste à sa gauche** : la date, le jour de campagne et l'an. L'ère et la citation du jour s'affichent au survol.
- **À gauche** : la compagnie et ses étoiles de renommée, puis l'or, l'entretien de la compagnie et l'effectif, chacun avec son picto.
- **À droite** : le journal de la compagnie. La barre montre sa dernière ligne ; un clic le déplie au-dessus de la barre.

## Référentiel et convention d'affichage

Source structurée : `data/reference/camp-calendar.json`.

- 12 mois de 31/28/31/30/31/30/31/31/30/31/30/31 jours : **365 jours** exactement.
- 7 jours : **Lunbrume**, **Martel**, **Druiden**, **Sermentel**, **Soldren**, **Bastor**, **Dimcairn**.
- 12 mois : **Brumecendre**, **Corbenaël**, **Bourbevent**, **Florémort**, **Beltefeu**, **Soldehaut**, **Fauchefer**, **Lughraille**, **Brandebruyne**, **Cerfombre**, **Samhargne**, **Neigedette**.
- Convention initiale (présentation seulement) : **Jour de campagne 1 = Lunbrume, 1 Brumecendre, an 842 — Âge des Couronnes Brisées**.
- Les 7 jours de la semaine se poursuivent au changement d'année ; pas d'année bissextile.
- Trois citations par mois tournent à chaque nouveau jour de ce mois. Une citation n'est donc pas nécessairement unique sur les 365 jours.

La barre affiche le **numéro absolu du jour de campagne**, le jour de semaine, le quantième, le mois et l'année ; l'ère et la citation s'affichent au survol. Le joueur ne perd donc jamais ses repères dans les systèmes qui utilisent `campaign.day`.

## Temps stratégique

Le bouton **Jour suivant** a simplement changé de place : il appelle toujours `campaignRules().advanceTime(campaign, 1)`, le traitement existant de la Taverne étant réutilisé pour les salaires, guérisons, départs et arrivées des candidats, journalisation et sauvegarde.

Le calendrier est **dérivé de `campaign.day`** : aucune date secondaire à sauvegarder, aucune formule de combat, de recrutement ou d'économie modifiée.
