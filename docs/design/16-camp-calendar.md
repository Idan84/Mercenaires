# Calendrier du Royaume — barre du bas

Décision d'Idan, 21 octobre 2026 : un calendrier gaélico-médiéval cynique, avec une courte citation quotidienne. Le bouton **Jour suivant** quitte la Taverne.

Le même jour, Idan a précisé l'emplacement : le calendrier, en petit, et le bouton vivent dans **la barre du bas**, et non plus sur l'accueil du camp.

- **Au centre** : un gros bouton play, qui fait passer au jour suivant. Il n'apparaît qu'au camp, jamais en mission.
- **Juste à sa gauche** : la date, le jour de campagne et l'an. L'ère et la citation du jour s'affichent au survol.
- **À gauche** : la compagnie et ses étoiles de renommée, puis l'or, l'entretien de la compagnie et l'effectif, chacun avec son picto.
- **À droite** : le journal de la compagnie. La barre montre sa dernière ligne ; un clic le déplie au-dessus de la barre.
- **En combat, pas de barre** (Idan, 2026-11-06 : « Elle n'a pas raison d'être là. Ça permet d'agrandir un peu la
  carte ») : l'écran de combat prend toute la hauteur ; Échap ouvre toujours le menu de pause. La barre revient au camp.

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

## Au jour J, on organise J+1 (Idan, 2026-11-02)

« A jour J, on organise la journée de J+1. […] Pendant la journée, on peut encore changer les plans. […] Pour
l'équipement, ou pour planifier son prochain entraînement, le fait qu'il soit en entraînement ne gêne pas. On vient juste
lui parler, c'est instantané. »

- **Missions et garde du corps** : signées au jour J, elles partent le lendemain matin (doc 17) ; jusque-là, on peut
  **annuler le départ** (« Annuler le départ » sur l'expédition programmée) : l'offre revient au tableau. Le paiement d'une
  garde du corps arrive **au départ** (« Les SEPA heroic fantasy, c'est long ») : annuler ne rembourse donc rien.
- **Apprendre ou perfectionner un sort** : accepté au jour J, il **entre à l'École le lendemain matin** (doc 12) ; le
  manuel est mis de côté et la place réservée ; « Annuler » le rend à l'Intendance, sans effet sur l'affinité. Au matin, le
  manuel est détruit et l'affinité appliquée. Un professeur ajouté enseigne dès le lendemain matin. Pendant qu'il étudie,
  on ne planifie pas sa journée suivante.
- **Recrue** : signée au jour J, elle est **dans la compagnie tout de suite** (on l'équipe, on l'inscrit pour une mission
  qui part demain matin) ; son premier salaire est payé le lendemain matin ; aucun poste (intendant, médecin, directeur de
  l'École, lieutenant) avant le lendemain matin (« Il rejoint la compagnie demain matin. ») ; effectif : « Disponible
  demain » (doc 14 §10 bis).
- **Entraînement du capitaine** : la salle choisie vaut pour le lendemain matin (doc 11 §7) ; on peut la changer jusque-là.
- **Les oisifs** s'entraînent pendant la journée (entraînement libre du matin, doc 11 §7) ; on peut les envoyer en mission
  pour le lendemain.
- **Équipement** : immédiat, même pendant un entraînement.

Code : `game-core/campaign.js` (`signCandidate`, `departExpedition`, `departBodyguard`, `cancelExpedition`),
`game-core/spell-study.js` (statut `planned`), `steward.js`, `medic.js`, `school-director.js`, `lieutenants.js`. Tests :
`tests/recruit-next-day.test.js`, `tests/spell-study.test.js`, `tests/spell-perfect.test.js`, `tests/bodyguard.test.js`.
