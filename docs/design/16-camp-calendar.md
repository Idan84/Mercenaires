# Calendrier du Royaume — les barres du camp

Un calendrier gaélico-médiéval cynique, avec une courte citation par jour (Idan, 2026-10-21). Au camp, deux barres :
celle du haut dit où en est la compagnie, celle du bas sert à se déplacer et à agir. En combat, pas de barre (« Ça
permet d'agrandir un peu la carte ») ; Échap ouvre le menu de pause.

## La barre du haut

- **La barre illustrée de la culture du capitaine** (pas du peuple) : un pack par culture, 32 en tout, dessinés par
  Idan. Pas d'embout à gauche : le milieu sort de l'écran. Pas de blason.
- **Dans sa bande sombre** : le nom de la compagnie et ses étoiles ; l'**or**, le **bois**, la **pierre**, les
  **salaires** du jour et les **mercenaires** (places occupées / places au dortoir), chacun dans un fond sombre avec son
  picto ; puis la **date** (« 1 Brumecendre · Jour 1 » ; l'ère et la citation au survol) et le **bouton menu** (Échap).
- Les mercenaires ouvrent « Mes mercenaires ».
- **Réglée culture par culture** par Idan dans l'**Atelier des barres** (taille de la barre, largeur de l'embout, taille
  du contenu, hauteur des fonds…). Une culture peut avoir une v2 de sa barre (les Terres des Deux Fleuves).
- **Les cultures refaites avec leur kit graphique** (les trois cultures elfes ; les trois cultures naines, réglages de
  départ repris des Elfes sylvains ; cinq cultures humaines, réglages de départ repris des Nains des montagnes, à
  régler) : leurs deux barres sont faites des pièces du kit (bande de cuir entre deux
  sangles, emblème au bout, ornement suspendu dessous). Les Elfes des grandes cités,
  au cuir ivoire, ont leurs textes et pictos **dorés** (« pastilles or pâle, chiffres à l'encre »). Réglages :
  `data/reference/culture-kits.json`.
- Tout garde les proportions de la maquette, quelle que soit la largeur de l'écran. Le logo Blood & Wages reste sur
  l'écran titre.

## La barre du bas

- **Le milieu de la barre de la culture**, d'un bord à l'autre de l'écran.
- **Au centre, le bouton Jour suivant** (dessin d'Idan) dans **l'anneau de la culture** ; il n'apparaît qu'au camp.
- **À gauche, les six lieux** en pictos (le nom au survol) : **Château**, **Taverne**, **Dortoir**, **Marchand**,
  **Intendance**, **Construction**. Le lieu où l'on est et les pictos sans rien à faire restent en couleurs, à **50 %
  d'opacité** (Idan, 2026-11-18). Au survol, un léger grossissement ; au clic, il s'enfonce et rebondit.
- **À droite** : **Combat** (grisé tant qu'aucune escouade n'est arrivée ; sinon « Commencer le combat », ou un menu s'il
  y en a plusieurs), **Nouvelles** (le pigeon : rouvre les nouvelles du jour), **Journal** (s'ouvre au-dessus des
  actions), **Discussions**, puis le **bouton du lieu** (son menu reprend les zones du lieu ; à la Taverne : Parler au
  tavernier, Trouver une mission, Recruter, La Cave, La Cantine ; en attendant son dessin, un rond « ••• »).
- **Discussions** : ceux qui attendent une réponse (déserteur, mutins, usurier, demande d'augmentation). Le matin, leurs
  scènes s'ouvrent toutes seules l'une après l'autre ; on peut les **fermer sans répondre** (« Plus tard » ou Échap) et y
  revenir par le picto. Le bouton Jour suivant rouvre la première qui attend.
- Le menu de l'accueil du camp n'existe plus : on se déplace avec la barre ; chaque lieu garde « ← Retour au camp ».
- Réglée culture par culture dans l'Atelier des barres (hauteur, bouton, anneau, pictos et leurs écarts).

## Le calendrier

Source : `data/reference/camp-calendar.json`.

- **365 jours**, 12 mois de 31/28/31/30/31/30/31/31/30/31/30/31 jours, pas d'année bissextile.
- 7 jours : **Lunbrume**, **Martel**, **Druiden**, **Sermentel**, **Soldren**, **Bastor**, **Dimcairn**.
- 12 mois : **Brumecendre**, **Corbenaël**, **Bourbevent**, **Florémort**, **Beltefeu**, **Soldehaut**, **Fauchefer**,
  **Lughraille**, **Brandebruyne**, **Cerfombre**, **Samhargne**, **Neigedette**.
- **Jour 1 = Lunbrume, 1 Brumecendre, an 842 — Âge des Couronnes Brisées.** La semaine continue au changement d'année.
- Trois citations par mois tournent d'un jour à l'autre.
- Le calendrier se déduit du numéro du jour de campagne : rien d'autre à sauvegarder.

## Au jour J, on organise J+1 (Idan, 2026-11-02)

« A jour J, on organise la journée de J+1. […] Pendant la journée, on peut encore changer les plans. »

- **Missions et garde du corps** : signées au jour J, elles partent le lendemain matin ; d'ici là, on peut **annuler le
  départ** (l'offre revient au tableau). La paie d'une garde du corps arrive au départ : annuler ne rembourse rien.
- **Sort à apprendre ou perfectionner** : il entre à l'École le lendemain matin ; « Annuler » rend le manuel, sans effet
  sur l'affinité.
- **Recrue** : dans la compagnie tout de suite (on l'équipe, on l'inscrit pour une mission de demain) ; premier salaire
  et premier poste possible le lendemain matin.
- **Entraînement du capitaine** : la salle choisie vaut pour le lendemain matin.
- **Les oisifs** s'entraînent pendant la journée ; on peut les envoyer en mission pour le lendemain.
- **Équipement** : immédiat, même pendant un entraînement.
