# Combat à deux armes CAC V1

> Miroir depuis Notion — synchronisé le 2026-10-03.
> Source : https://app.notion.com/p/3ebc799da3d181358861cee9d366aab5?pvs=204
> Dernière édition Notion : 2026-09-30T20:05:05.971Z

## Dextérité effective
Avec deux armes :
$$
DexteriteEffective=\frac{Dexterite}{2-\frac{MaitriseDeuxArmes}{100}}
$$
À maîtrise 0 : Dex/2. À 50 : Dex/1,5. À 100 : Dextérité complète.
## Poids des deux armes
Les **deux Malus vitesse arme effectifs sont additionnés** pour tous les jets de la séquence : toucher avec l'une ou l'autre arme et tests de poursuite.
## Une séquence = deux attaques
Pour chaque séquence :
1. attaque complète avec l'arme 1 ;
2. attaque complète avec l'arme 2 ;
3. si **au moins une des deux a réellement touché après éventuel blocage au bouclier**, qu'aucun critique négatif n'a interrompu la chaîne et que la cible reste valide, test pour ouvrir la séquence suivante.
Pour ouvrir la séquence numéro $`N`$ :
$$
P_N=\min\left(100,\frac{DexteriteEffective+VitesseCombatEffective}{N}\right)
$$
Une séquence suivante donne à nouveau **deux chances de toucher**.
## Interruptions
Un critique négatif au Toucher ou à Blesser interrompt immédiatement toute la chaîne, y compris avant la seconde arme. Un critique positif ne l'interrompt pas.
Si la première arme tue la cible, la deuxième attaque de la paire peut toujours être exécutée techniquement ; elle n'a simplement plus d'effet sur le combat.

> 
	Une arme `Au choix` portée avec une seconde arme fonctionne obligatoirement en mode **une main** : aucun bonus de prise à deux mains.


