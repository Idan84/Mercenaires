# Post-traitement — valeurs dérivées

Entrées: Caractéristiques, résistances et compétences initiales finales
Ordre: 12
Règle: Après la génération identitaire et les compétences, calculer les valeurs dérivées connues. PV maximum = ceil(3 × (Constitution + 0,2 × Endurance + 0,1 × Volonté)). PV actuels = PV maximum. Mana actuel = Réserve de mana. Calculer également la réputation personnelle initiale à partir de son pool dédié. Les autres valeurs dérivées sont calculées selon leurs formules lorsqu’elles existent.
Sortie: Mercenaire initialisé : PV max + PV actuels + Mana actuel + réputation personnelle + autres valeurs dérivées