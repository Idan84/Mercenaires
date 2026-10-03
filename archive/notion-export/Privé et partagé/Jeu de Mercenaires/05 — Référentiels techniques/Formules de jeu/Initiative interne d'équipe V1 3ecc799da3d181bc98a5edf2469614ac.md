# Initiative interne d'équipe V1

Code: http://combat.team.initiative_order
Domaine: Combat
Expression: initiative = effective_speed + 0.25intelligence + 0.10courage + 0.05*will; sort team descending by initiative; on equal initiative sort descending by courage; exact remaining tie => development_assert
Notes: Calculée avant la mission, sans jet aléatoire. Elle ordonne uniquement les personnages au sein d'une même équipe. L'équipe qui joue en premier est déterminée par le scénario. La Fatigue sera intégrée plus tard comme mécanique globale.
Statut: Validée
Type attaque: N/A
Version: V1
Étape: Initiative

## Principe

L'initiative ordonne uniquement les personnages **au sein d'une même équipe**. Les équipes jouent l'une après l'autre ; l'équipe qui commence est déterminée par le scénario.

## Formule

$$
Initiative=VitesseCombatEffective+0.25\times Intelligence+0.10\times Courage+0.05\times Volonte
$$

Aucun jet aléatoire n'intervient.

## Moment du calcul

L'ordre est calculé **avant le combat / avant l'entrée en mission** et est visible par le joueur pendant la préparation.

## Départage

1. Initiative la plus élevée ;
2. en cas d'égalité : Courage le plus élevé ;
3. égalité parfaite Initiative + Courage : **assert / erreur de développement volontaire** pour l'instant.

La Fatigue n'est pas encore incluse.