# Calendrier du Royaume — les barres du camp

Décision d'Idan, 21 octobre 2026 : un calendrier gaélico-médiéval cynique, avec une courte citation quotidienne. Le bouton **Jour suivant** quitte la Taverne.

Le même jour, Idan a précisé l'emplacement : le calendrier, en petit, et le bouton vivent dans **la barre du bas**, et non plus sur l'accueil du camp. Depuis le 13 novembre 2026, la date est passée dans **la barre du haut** (voir plus bas).

- **Au centre** : un gros bouton play, qui fait passer au jour suivant. Il n'apparaît qu'au camp, jamais en mission.
- **À droite** : le bouton du lieu et les actions du jour, dont le journal de la compagnie (voir la barre du bas).
- **En combat, pas de barre** (Idan, 2026-11-06 : « Elle n'a pas raison d'être là. Ça permet d'agrandir un peu la
  carte ») : l'écran de combat prend toute la hauteur ; Échap ouvre toujours le menu de pause. Les barres reviennent au camp.

## Les deux barres du camp (Idan, 2026-11-13)

Refonte de l'interface du camp, en trois temps : **1.** le contenu (ce qui suit), **2.** l'habillage graphique (Idan
fournit les images), **3.** des infobulles utiles sur l'or, les salaires et les mercenaires.

**La barre du haut** dit où en est la compagnie (maquette d'Idan, 2026-11-13 : « la barre doit être belle, les infos
lisibles ») :

- **La barre illustrée de la culture du capitaine** (Idan : « la barre qui change en fonction de la culture, et pas du
  peuple ») : un pack par culture, 32 en tout, dessinés par Idan (milieu qui se répète, embout droit). **Pas d'embout à
  gauche** : le milieu sort de l'écran (Idan, 2026-11-14 : « laisse la ligne centre aller tout au bout et sortir de
  l'image »). **Pas de blason** (essai validé le 14 novembre).
- **Dans sa bande sombre** : le **nom** de la compagnie en italique et ses **étoiles** sur la même ligne ; l'**or**, les
  **salaires** du jour et les **mercenaires** (places occupées au dortoir / places), chacun dans un fond sombre sans
  contour avec son picto (pièces, bourse, trois casques) ; puis, après un filet, la **date** sur une ligne
  (« 1 Brumecendre · Jour 1 » ; l'ère et la citation du jour au survol) et le **bouton menu** (Échap), avec de l'air à sa
  droite. Les nombres prennent l'espace des milliers (« 10 000 »). Quand un grand ornement ou un long nom manque de place,
  le nom rétrécit (jusqu'à 80 %), puis passe sur deux lignes.
- **Les mercenaires ouvrent « Mes mercenaires »** (le menu de l'accueil du camp est retiré, voir la barre du bas).
- **Réglée culture par culture** par Idan dans l'**Atelier des barres** (14 novembre) : la **taille de la barre** (Idan :
  « une barre plus fine » ; toute la barre rapetisse ensemble, ornement et contenu compris, et le raccord reste parfait),
  la **largeur de l'embout droit** (l'ornement resserré en largeur seulement), la taille du contenu, la hauteur des fonds
  sombres, l'air à droite du menu et l'écart avec le haut de l'écran (négatif : le haut de l'image passe au-dessus). Ses
  réglages sont dans `scripts/hud-bars-reglages.json`.
- **Une culture peut avoir une autre version de sa barre** (Idan, 14 novembre : « un v2 pour toute la barre ») : les
  Steppes désertiques ont la v2.
- **Proportions de la maquette**, quelle que soit la largeur de l'écran : tout se règle sur la hauteur de la bande sombre
  (85 px pour un écran de 2000 px de large). Chaque pack est mesuré à son arrivée (cadre, bande, ornements des embouts :
  `scripts/build-hud-bars.js`), pour que le texte tombe toujours dans sa bande.
- **Les 32 cultures ont leur barre** (13 novembre 2026). Une culture ajoutée plus tard, sans pack, aurait un cadre
  provisoire aux mêmes proportions.
- Le logo Blood & Wages n'apparaît plus au camp : il reste sur l'écran titre.

**La barre du bas** sert à se déplacer et à agir. On la fait pas à pas (Idan, 2026-11-14 : « c'est pas grave si tout
n'est pas fonctionnel immédiatement, on commence par la barre ») :

- **Le milieu de la barre de la culture**, sans ses embouts, d'un bord à l'autre de l'écran (Idan : « en bas, on va mettre
  que la partie centre de la barre et on va l'étendre jusqu'au bout ») ; sa bande sombre touche le bas de l'écran (« le
  fond sombre touche le bas de l'image »).
- **Au centre, le bouton Jour suivant** dessiné par Idan (`next.png`), dans **l'anneau de la culture**
  (`ornement_central`, les 32 cultures) ; le bord du bouton passe sous l'anneau.
- **À gauche de l'anneau, les six lieux** en pictos d'Idan (« que des pictos » ; le nom au survol), dans l'ordre de ses
  images : **Château** (l'écran du camp), **Taverne** (elle mène juste à la taverne, sans menu déroulant : ses zones
  donnent les salles), **Dortoir**, **Marchand** (grisé sans marchand), **Intendance**, **Construction** (l'actuel Ma
  Compagnie, à réorganiser). Ils se rangent contre l'anneau, à sa hauteur. Le picto du lieu où l'on est est grisé (Idan :
  « quand on est sur le château, on le grise ») ; au survol, un très léger grossissement ; au clic, il s'enfonce et
  rebondit au relâchement.
- **Le menu de l'accueil du camp est retiré** (Idan : « on peut retirer les boutons du menu principal ») : on se déplace
  avec la barre ; « Mes mercenaires » s'ouvre depuis les mercenaires de la barre du haut. Chaque lieu garde son bouton
  « ← Retour au camp », et la Taverne ses zones cliquables.
- **À droite de l'anneau** (Idan, 2026-11-14), rangés contre lui de la même façon :
  - **le bouton du lieu** (« à droite du bouton play, on va mettre un bouton contextuel ») : son menu reprend les zones
    cliquables du lieu où l'on est. Dans la **taverne**, ses cinq zones, dans l'ordre d'Idan (« Tavernier - missions -
    recrutement - cave - menu ») : Parler au tavernier, Trouver une mission, Recruter, La Cave, La Cantine. Ailleurs, pas de
    bouton pour l'instant (« au château, on n'en a pas pour l'instant »), mais sa place reste. Son dessin viendra (« on va
    le designer ce bouton pour qu'il soit joli ») : en attendant, un rond sombre « ••• » ;
  - **Combat** : les missions du jour (la vue Missions de la taverne : les offres, et les escouades arrivées) ;
  - **Nouvelles** (le pigeon) : rouvre la fenêtre des nouvelles du jour (le rapport du dernier jour passé dans cette
    session ; après un rechargement de la page, « Rien à signaler ») ;
  - **Journal** : il remplace le journal au-dessus de la barre (« on peut l'ouvrir en cliquant dessus ») ; il s'ouvre
    au-dessus des actions et défile ; un clic ailleurs ou Échap le referme ;
  - **Discussions** : pour parler avec les mercenaires qui viennent nous voir (fuite, augmentation de salaire…) ; grisé
    pour l'instant, son fonctionnement reste à décider.
- **Réglée culture par culture** par Idan dans l'**Atelier des barres** (14 novembre) : la hauteur de la barre, la taille
  du bouton et de l'anneau, leur hauteur, la taille des pictos, leur écart, leur écart avec l'anneau, leur hauteur, et un
  bord du bas à cacher sous l'écran. Ses réglages sont dans `scripts/hud-bars-reglages.json` ; `scripts/build-hud-bars.js`
  en tire la barre de chaque culture.

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
