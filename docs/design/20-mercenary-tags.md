# Tags des mercenaires

> Décisions d'Idan du 2026-11-12. Phase 1 codée : l'onglet **Tags** de la fiche. Données : `data/reference/mercenary-tags.json` ;
> règles : `game-core/mercenary-tags.js` ; fiche : `prototype-web/ui.js` (`renderTagsTab`) ; test : `tests/mercenary-tags.test.js`.

## 1 — Pourquoi

« Pour l'instant je n'arrive pas à lire une fiche, me souvenir que lui, c'est plutôt un bouclier qu'il lui faudrait, ce cac
etc... Y compris pour les rôles de missions. » Le joueur note ce qu'il veut faire de chaque mercenaire. « Le joueur
interprète tous les tags comme il le souhaite et ça n'a aucune importance. Ce qui compte, c'est qu'il puisse retrouver
rapidement, dans sa compagnie, qui doit faire quoi. »

- **Aucun tag n'en exclut un autre** : « Armures de plates + magie, c'est le problème du joueur. C'est lui qui vise ce
  build. Il veut taguer 5 cacs différents, très bien. »
- **Les sous-tags allument les tags** : cocher Boule de feu allume Feu, puis Entraînement. Éteindre un tag éteint ses
  sous-tags.
- **Tous les tags se cochent**, même seuls (« on peut taguer juste Animal »).
- Aucune règle de jeu ne lit les tags.

## 2 — Les trois colonnes

### Occupations principales (tons rouges) — comment il occupe ses journées

- **Mission** → Camps (une faction par camp : Gobelins, Orcs, Hommes-bêtes, Voleurs, Ogres, Culte des morts, Cour de sang)
  et Chasses (Loups, Licornes, Cerbères, Chiens sauvages, Papillons).
- **Garde du corps** (« c'est vraiment différent d'une mission »), sans sous-tags.
- **Job** → Bûcheron, Mines, Palais des plaisirs. Pas la Cave (« à la cave, on décide de rien »).
- **Entraînement** (« c'est à la place des missions ») → ce qu'on fait progresser, nommé par ce qu'on travaille et non
  par le lieu : caractéristiques, résistances, armes et styles, Discrétion, Pièges, Réserve de mana, les 9 écoles de magie,
  les familles d'animaux ; puis les apprentissages sans parent (Port d'armure légère, intermédiaire, lourde, Empoisonnement
  des armes). Sous-sous-tags : sous une école, ses sorts (« Un sort boule de feu, dans magie du feu ») ; sous une famille
  d'animaux, ses montures à apprivoiser.
- **Poste** → Intendant, Médecin, Directeur de l'École, Doctore, Vétéran, Maître des lames, Alchimiste, Maître des
  plaisirs, Dresseur, Officier (« ne mets pas lieutenant, mais officier » : d'autres grades viendront).

Laissés de côté, parce qu'on ne les prévoit pas : la Cave, le Cachot, le repos et les soins, la Cantine.

### Équipement (tons verts) — ce qu'il porte ou doit porter

- **Arme** → les familles (Lames longues, Lames courtes, Armes d'hast, Haches, Armes contondantes, Armes flexibles ou
  articulées, Bâtons, Boucliers, Armes de tir, Armes à feu), puis leurs armes.
- **Armure** → Légère, Intermédiaire, Lourde, puis leurs armures ; Vêtements.
- **Caractéristiques** → tout ce qu'un objet augmente (« c'est un mage du feu, il doit porter Intelligence, Puissance
  magique, Feu, Mana ») : caractéristiques, Puissance magique, Réserve de mana, écoles de magie, Discrétion, Pièges,
  Intimidation, Compagnon animal, Affinité.

Ni monture ni potion (Idan).

### Rôle au combat (tons bleus) — à quoi il sert sur le champ de bataille

« Une seule liste. Des sous-cat. Des sous-sous cat. » Pensé en JDR général plutôt qu'à partir de ce que le jeu mesure
(« Oublie ce qu'on mesure ») ; seulement ce qui existe dans le jeu ; rien de ce qui relève de l'équipement (encaisser,
esquiver, bloquer…).

- **Dégâts** → De zone, Charge, À distance, Tranchant, Perforant, Contondant, Brûlant, Glaçant, Foudroyant, Corrosif,
  Poison, Nécrotique, Anti morts-vivants, Anti invocations (les types de dégâts directement : « Personne ne coche "type
  de dégâts" seul »).
- **Soin** → De zone, Dans la durée.
- **Soutien** → Enchantements, Dégâts élémentaires (Brûlant, Glaçant, Foudroyant), Discrétion, Récupération de mana, Purges.
- **Protection** → Protection élémentaire (Contre le feu, Contre le froid, Contre la foudre), Protection à distance.
- **Entrave** → Immobilisation, Affaiblissement, Démoralisateur, Anti-magie, Anti-soins.
- **Contrôle du terrain**, **Commandement**, **Éclaireur**.
- **Magie** → les 9 écoles.
- **Animal** → les familles qui ont des animaux, puis leurs animaux.
- **Régénération**, **Vol**.

## 3 — Les listes viennent des données

Dans `mercenary-tags.json`, une liste peut être écrite à la main (`enfants`) ou tirée des données du jeu (`source`) : une
nouvelle faction, une nouvelle chasse, un nouvel entraînement au camp, un nouveau sort, une nouvelle arme, une nouvelle
armure, un nouveau bonus d'objet ou un nouvel animal a son tag sans toucher au fichier. `ordre` range les noms connus ;
les nouveaux viennent ensuite. Une famille d'animaux du Compagnon animal (Rapaces, Félins…) apparaît le jour où elle a son
premier animal.

L'identifiant d'un tag est son chemin (`role/degats/brulant`) ; le mercenaire garde la liste de ses tags allumés
(`tags`), sauvegardée avec lui.

## 4 — L'onglet Tags (phase 1)

« On fait très simple en phase 1 : Ajoute un onglet dans la fiche mercenaire avec les tags qu'on peut cocher décocher. »

- Dernier onglet de la fiche, pour ceux de la compagnie (pas un candidat de la Taverne).
- Trois colonnes en accordéon ; une couleur par colonne, plus claire à chaque niveau.
- « Pas de case à cocher. Des tags grisés ou pas grisés » : un clic sur le tag l'allume ou l'éteint.
- « Une petite flèche à droite du tag pour ouvrir la sous-catégorie. » Ce qui est ouvert le reste d'une fiche à l'autre.
- Sur téléphone, les colonnes passent l'une sous l'autre.

## 5 — Pas encore décidé

Les conseils de l'intendant autour des tags (« on adaptera l'intendant et pas l'inverse »), l'endroit où les tags
ressortent ailleurs (liste des mercenaires, choix de l'équipe d'une mission…) et des titres plus drôles (historique,
classement dans la compagnie) : à discuter.
