# Silhouettes du panneau Équipement

**Choix validé par Idan le 21 octobre 2026 :** une silhouette au crayon noir par peuple et par sexe, intégrée de façon discrète dans le panneau d'Équipement, sans fond blanc.

Le code de la PR attend **20 fichiers WebP transparents** dans ce dossier :
`<peuple>-<sexe>.webp`, où `sexe` vaut `homme` ou `femme`.

Peuples : `humain`, `elfe`, `nain`, `orc`, `gobelin`, `halfling`, `gnome`, `ogre`, `reptilien`, `homme-bete`.

**Livraison des assets binaires :** le paquet `equipment-silhouettes-pack.zip` a été fourni par Chatty à Idan dans la conversation du 21 octobre 2026. Les 20 images originalement transmises en JPG y sont recadrées, redimensionnées et converties en WebP transparent (hachures conservées) ; aucune image supplémentaire ne doit être créée.

**Pour JC3 :** extraire le dossier `assets/silhouettes/` du ZIP ici, puis ajouter les 20 fichiers à Git avant de fusionner dans `test`. Le connecteur GitHub de Chatty ne transfère pas directement les fichiers binaires locaux.

Le code affiche le mannequin neutre historique si le sexe n'est pas connu ou si l'image est absente/illisible ; ce repli disparaît après chargement du WebP. Aucun paramètre de gameplay ou de sauvegarde ne change. Ne pas fusionner vers `main` sans accord d'Idan.

La paire Gnome/Gobelin est attribuée selon la morphologie des silhouettes fournies ; si une des associations homme/femme ne correspond pas au choix d'Idan, il suffit de permuter les noms des deux fichiers du peuple.
