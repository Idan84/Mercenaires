# Catalogue des données du jeu

Git est la source de vérité. Les JSON ci-dessous sont les référentiels structurés.

| Fichier | Lignes | Colonnes |
|---|---:|---|
| alignments.json | 9 | nom |
| ancestries.json | 11 | nom, idees_bonus |
| culture-origin-compatibility.json | 224 | association, culture, note, origine_sociale, possible |
| ancestry-compatibility.json | 110 | association, ascendance, peuple, poids_relatif, possible |
| cultures.json | 32 | nom, idees_bonus, idees_malus, peuples |
| generation-matrix.json | 106 | cible, caravanes_de_ferrailleurs, cites_libres, clans_des_grandes_steppes, commercant, date, domaine, elfe, elfes_des_grandes_cites, elfes_noirs, elfes_sylvains, esclave, explorateurs, gnome, gnomes_des_cavernes, gnomes_des_forets, gnomes_des_villes, gobelin, gobelins_des_cavernes, gobelins_des_villes, halfling, halflings_des_cites_humaines, halflings_des_villages_isoles, homme_bete, hors_la_loi, humain, lieu, montagnes_du_nord, nain, nains_des_montagnes, nains_des_plaines, nains_reduits_en_esclavage_dans_les_colonies, niveau, noble, ogre, ogres_des_cites_humaines, ogres_des_montagnes, ogres_des_steppes, orc, orcs_des_steppes, orcs_des_villes, orcs_noirs, ordre, paysan_ouvrier, reptilien, reptiliens_des_cites_temples, reptiliens_des_marecages, reptiliens_des_villes, royaumes_du_soleil_levant, sang_de_djinn, sang_de_dragon, sang_de_dryade, sang_de_demon, sang_de_sirene, sang_de_troll, sang_divin, sang_d_elfe, sang_d_humain, sang_d_orc, sang_feerique, soldat_guerrier_combattant, sous_element, steppes_desertiques, tribus_de_la_jungle, tribus_des_forets_anciennes, tribus_nordiques, type, erudit, element_parent |
| ancestry-levels.json | 3 | nom, multiplicateur_d_effet, probabilite_de_base |
| social-origins.json | 7 | nom |
| peoples.json | 10 | nom, alignement_principal, probabilite_de_base, probabilite_d_ascendance |
| d6-generation-scale.json | 3 | intensite, ascendance_niveau_1_d6, ascendance_niveau_2_d6, ascendance_niveau_3_d6, standard_nombre_de_d6 |
| generation-steps.json | 12 | etape, entrees, ordre, regle, sortie |
| characteristics.json | 33 | nom, cache, description, est_utilise_dans_les_formules, famille, genere_a_la_creation, maximum, minimum, ordre, type_de_valeur, unite, evolutif |
| skills.json | 94 | nom, acquisition_possible, alteration_magique_base, attaque_de_zone, bonus_blocage_base, bonus_charge_base, cadence_tir, contre_charge, description, domaine, degats_pv_base, exemples, malus_vitesse_arme_base, mode, niveau, ordre, parent, portee_max_hex, portee_min_hex, prise, puissance_contondante_base, puissance_perforante_base, puissance_tranchante_base, recharge_action_rapide, type_de_valeur, types_de_degats, valeur_maximale, ecoles_d_influence, ecoles_opposees |
| damage-types.json | 7 | nom, code, description, famille |
| states.json | 2 | nom, categorie, code, effet_mecanique, utilise_l_esquive_en_defense |
| base-armors.json | 8 | nom, alteration_magique_base, code, description, malus_esquive_base, malus_vitesse_base, resistance_brulant, resistance_contondant, resistance_corrosif, resistance_foudroyant, resistance_glacant, resistance_perforant, resistance_tranchant, type_armure |
| item-qualities.json | 3 | nom, code, description, multiplicateur_malus, multiplicateur_qualite |
| ranged-weapons.json | 8 | nom, domaine, portee_min_hex, portee_max_hex, cadence_tir, recharge_action_rapide, contre_charge, attaque_de_zone, degats_pv_base, puissance_perforante_base, prise, malus_vitesse_arme_base |
| weapons.json | 38 | nom, domaine, prise, malus_vitesse_arme_base, portee_min_hex, portee_max_hex, bonus_charge_base, contre_charge, degats_pv_base, puissance_tranchante_base, puissance_perforante_base, puissance_contondante_base |
| formula-constants.json | 72 | nom, code, description, formule, valeur, version |
| game-formulas.json | 43 | nom, code, domaine, expression, maximum, minimum, notes, statut, type_attaque, version, etape |
| formula-terms.json | 13 | nom, caracteristique, code_variable, coefficient, cote, description, formule, ordre, source |

| binary-aptitude-grants.json | 6 | aptitude, domaine, mode, automatic, bonuses_pp, armor, reason |

| alignment-generation.json | 1 | distribution, neighborhood, grid, notes |
| spells.json | 66 | id, nom, ecoles, palier, cible, forme, portee, duree, type_degats, effet, ton, notes |
| biography-packs.json | 30 | id, short, rumor, motto, hard_tags, soft_tags, weight |
