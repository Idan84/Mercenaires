> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.

# Combat à deux armes CAC V1

Code: combat.melee.dual_wield
Domaine: Combat
Expression: effective_dexterity = dexterity / (2 - dual_wield_mastery/100); effective_speed uses sum of both weapon speed penalties; each sequence attacks weapon_1 then weapon_2; each attack can be blocked separately by defender shield; if at least one attack_real_hit && no negative_critical && target_alive: p_next_sequence=min(100,(effective_dexterity+effective_speed)/(sequence_number+1))
Maximum: 100
Minimum: 0
Statut: Validée
Type attaque: CAC
Version: V1
Étape: Autre

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

Pour ouvrir la séquence numéro $N$ :

$$
P_N=\min\left(100,\frac{DexteriteEffective+VitesseCombatEffective}{N}\right)
$$

Une séquence suivante donne à nouveau **deux chances de toucher**.

## Interruptions

Un critique négatif au Toucher ou à Blesser interrompt immédiatement toute la chaîne, y compris avant la seconde arme. Un critique positif ne l'interrompt pas.

Si la première arme tue la cible, la deuxième attaque de la paire peut toujours être exécutée techniquement ; elle n'a simplement plus d'effet sur le combat.

<aside>
🗡️

Une arme `Au choix` portée avec une seconde arme fonctionne obligatoirement en mode **une main** : aucun bonus de prise à deux mains.

</aside>