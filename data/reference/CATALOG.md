# Catalogue des données du jeu

Git est la source de vérité. Les JSON ci-dessous sont les référentiels structurés.

| Fichier | Lignes | Colonnes |
|---|---:|---|
| alignments.json | 9 | nom |
| ancestries.json | 11 | nom, idees_bonus |
| culture-origin-compatibility.json | 224 | association, culture, note, origine_sociale, possible |
| ancestry-compatibility.json | 110 | association, ascendance, peuple, poids_relatif, possible |
| cultures.json | 32 | nom, idees_bonus, idees_malus, peuples, ecole_magie, compensation_sans_ecole |
| generation-matrix.json | 106 | cible, caravanes_de_ferrailleurs, cites_libres, clans_des_grandes_steppes, commercant, date, domaine, elfe, elfes_des_grandes_cites, elfes_noirs, elfes_sylvains, esclave, explorateurs, gnome, gnomes_des_cavernes, gnomes_des_forets, gnomes_des_villes, gobelin, gobelins_des_cavernes, gobelins_des_villes, halfling, halflings_des_cites_humaines, halflings_des_villages_isoles, homme_bete, hors_la_loi, humain, lieu, montagnes_du_nord, nain, nains_des_montagnes, nains_du_chaos, nains_reduits_en_esclavage_dans_les_colonies, niveau, noble, ogre, ogres_des_cites_humaines, ogres_des_montagnes, ogres_des_steppes, orc, orcs_des_steppes, orcs_des_villes, orcs_noirs, ordre, paysan_ouvrier, reptilien, reptiliens_des_cites_temples, reptiliens_des_marecages, reptiliens_des_villes, royaumes_du_soleil_levant, sang_de_djinn, sang_de_dragon, sang_de_dryade, sang_de_demon, sang_de_sirene, sang_de_troll, sang_divin, sang_d_elfe, sang_d_humain, sang_d_orc, sang_feerique, soldat_guerrier_combattant, sous_element, steppes_desertiques, tribus_de_la_jungle, tribus_des_forets_anciennes, tribus_nordiques, type, erudit, element_parent |
| ancestry-levels.json | 3 | nom, multiplicateur_d_effet, probabilite_de_base |
| social-origins.json | 7 | nom |
| peoples.json | 10 | nom, alignement_principal, probabilite_de_base, probabilite_d_ascendance, places_dortoir (places au dortoir : ogre 2 ; halfling, gnome, gobelin 0,5 ; les autres 1) |
| d6-generation-scale.json | 3 | intensite, ascendance_niveau_1_d6, ascendance_niveau_2_d6, ascendance_niveau_3_d6, standard_nombre_de_d6 |
| generation-steps.json | 12 | etape, entrees, ordre, regle, sortie |
| characteristics.json | 33 | nom, cache, description, est_utilise_dans_les_formules, famille, genere_a_la_creation, maximum, minimum, ordre, type_de_valeur, unite, evolutif |
| skills.json | 94 | nom, acquisition_possible, alteration_magique_base, attaque_de_zone, bonus_blocage_base, bonus_charge_base, cadence_tir, contre_charge, description, domaine, degats_pv_base, exemples, malus_vitesse_arme_base, mode, niveau, ordre, parent, portee_max_hex, portee_min_hex, prise, puissance_contondante_base, puissance_perforante_base, puissance_tranchante_base, recharge_action_rapide, type_de_valeur, types_de_degats, valeur_maximale, ecoles_d_influence, ecoles_opposees |
| damage-types.json | 7 | nom, code, description, famille |
| states.json | 2 | nom, categorie, code, effet_mecanique, utilise_l_esquive_en_defense |
| base-armors.json | 8 | nom, alteration_magique_base, code, description, malus_esquive_base, malus_vitesse_base, resistance_brulant, resistance_contondant, resistance_corrosif, resistance_foudroyant, resistance_glacant, resistance_perforant, resistance_tranchant, type_armure, prix_base (prix de base en pièces d’or, doc 05 « Valeur d’un objet ») |
| boots.json | 3 | nom, code, caracteristique, bonus_t1, bonus_t2, bonus_t3, bonus_t4, prix_base (bottes : bonus en % de la caractéristique de base selon le tier) |
| belts.json | 3 | nom, code, caracteristique, bonus_t1, bonus_t2, bonus_t3, bonus_t4, prix_base (ceintures : bonus en % de la caractéristique de base selon le tier, comme les bottes) |
| amulets.json | 3 | nom, code, caracteristique, bonus_t1, bonus_t2, bonus_t3, bonus_t4, prix_base (amulettes : bonus en % de la caractéristique de base selon le tier, comme les bottes et les ceintures) |
| capes.json | 3 | nom, code, caracteristique, type_bonus, bonus_t1, bonus_t2, bonus_t3, bonus_t4, prix_base (capes : bonus selon le tier, en % de la valeur de base ou en points pour la Résistance physique) |
| gloves.json | 3 | nom, code, caracteristique, type_bonus, bonus_t1, bonus_t2, bonus_t3, bonus_t4, prix_base (gants : bonus en % de la valeur de base selon le tier, comme les bottes) |
| enemy-archetypes.json | 24 | nom, code, faction, peuple, culture, ligne, niveau, centile, caracteristiques, resistances, pv, competences_martiales, intimidation, port_d_armure, armes, armure, tier, qualite, menace (archétypes d’ennemis fixes, doc 17 §10 ; ennemis de la mission « Faire le ménage ») |
| one-shot-missions.json | 1 | missions (camp, distance, carte, récompense, coffre, échec, défaite), ordres (trois ordres de mission validés), noms (lieux, commanditaires, tribus, caïds, signataires, estimations) — missions one shot, doc 17 |
| bodyguard-missions.json | 1 | missions de garde du corps : mercenaires, durée, validité, niveaux de réputation, décalage, paiement, retour (50/25/25), réputation, renommée, clients, textes — doc 17 §12 |
| spells.json | 25 | nom, code, ecole, palier, action, cible, ligne_de_vue, effet, element, toucher, effet_base, effet_nb_des, effet_de, effet_puissance_facteur, effet_maitrise_base, portee_base, portee_pas_maitrise, portee_max, duree_base, duree_pas_maitrise, duree_max, zone_rayon_base, zone_rayon_pas_maitrise, zone_rayon_max, zone_anneau_min, zone_degressive, precision_base, precision_part_maitrise, precision_par_case, deviation_max, zone_forme, zone_longueur_base, zone_longueur_pas_maitrise, zone_longueur_max, caracteristiques, bonus_base, bonus_pas_maitrise, bonus_unite, tir_portee_min, tir_portee_max, cumulable, critique, mana_base, mana_diviseur_maitrise, difficulte, icone, cadre, description (sorts, doc 12 : écoles de la Vie, du Feu, de l'Eau et de la Transmutation) |
| dormitory-quality.json | 11 | niveau, nom, prix, jours, renommee, affinite, image (qualité du dortoir, doc 11 §4 : niveaux 0 à 10, prix et durée du chantier, Renommée et affinité gagnées, fond de l'écran Dortoir) |
| rings.json | 11 | nom, code, caracteristique, type_bonus, bonus_t1, bonus_t2, bonus_t3, bonus_t4, malus_opposees_t1, malus_opposees_t2, malus_opposees_t3, malus_opposees_t4, prix_base (bagues : Chance et Courage en %, une bague par école de magie avec malus sur les deux écoles opposées ; cumulables) |
| helmets.json | 3 | nom, code, caracteristique, type_bonus, bonus_t1…t4, malus_caracteristique, malus_t1…t4, vitesse_t1…t4, prix_base (casques et chapeaux : Constitution, Intelligence, Compagnon animal en % ; le Casque de constitution retire de la Puissance magique et de la Vitesse) |
| pants.json | 3 | nom, code, caracteristique, type_bonus, bonus_t1, bonus_t2, bonus_t3, bonus_t4, prix_base (culottes : Charisme et Intimidation en % de la valeur de base, Affinité avec le capitaine en points) |
| item-qualities.json | 3 | nom, code, description, multiplicateur_malus, multiplicateur_qualite, multiplicateur_prix |
| ranged-weapons.json | 8 | nom, domaine, portee_min_hex, portee_max_hex, cadence_tir, recharge_action_rapide, contre_charge, attaque_de_zone, degats_pv_base, puissance_perforante_base, prise, malus_vitesse_arme_base |
| weapons.json | 38 | nom, domaine, prise, malus_vitesse_arme_base, portee_min_hex, portee_max_hex, bonus_charge_base, contre_charge, degats_pv_base, puissance_tranchante_base, puissance_perforante_base, puissance_contondante_base, prix_base (prix de base en pièces d’or, doc 05 « Valeur d’un objet ») |
| formula-constants.json | 207 | nom, code, description, formule, valeur, version |
| game-formulas.json | 43 | nom, code, domaine, expression, maximum, minimum, notes, statut, type_attaque, version, etape |
| formula-terms.json | 13 | nom, caracteristique, code_variable, coefficient, cote, description, formule, ordre, source |

| binary-aptitude-grants.json | 6 | aptitude, domaine, mode, automatic, bonuses_pp, armor, reason |

| camp-calendar.json | 12 mois, 7 jours, 3 citations par mois | year_start, era, days_per_year, weekday_names, months (name, days, quotes) : calendrier narratif du camp |
| reputation-stars.json | 15 | niveau, metal, etoiles, reputation_min, renommee_min, phrase, variantes (affichage en étoiles de la réputation et de la renommée ; phrase de réputation de la fiche) |
| affinity-phrases.json | 10 | niveau, affinite_max, phrase, variantes (phrase d'affinité envers le capitaine, avec les cœurs de la fiche et de la carte du mercenaire ; trois variantes de même sens par niveau) |
| character-sheet-copy.json | 11 + 7 | ancestries (nom, famille, parent), origins (nom, homme, femme) : phrases de l'onglet Profil de la fiche |
| tavern-dialogue.json | 20 + 38 | greetings (min, max, texte) selon l'affinité ; questions, answers et lines du dialogue de recrutement ; weapons (nom, avec_article) : textes de la Taverne |
| equipment-dialogue.json | 8 × 4 | proposals (par action), replies (action, accord, humeur, lignes), outcomes, menu : dialogues des échanges d’équipement Donner / Retirer / Troquer |
| steward-dialogue.json | 2 × 16 + 8 | offer et recall (proposition, répliques accepted / flattered / vexed / neutral, issues), talk (accueil, options, évaluation des candidats), panel : dialogues de l’intendant |
| lieutenant-dialogue.json | 9 + 22 + 13 + 4 | panel (encart de Ma Compagnie), promote (proposition, demande, négociation, répliques accepted / counter / refused, issues), talk (parler au lieutenant : demandes courage et respect) et report (son rapport du lendemain) : dialogues du lieutenant |
| item-titles.json | 78 | nom, famille (arme, armure, bottes, ceinture, amulette, cape, gants, culotte, bague ou casque), t1, t2, t3, t4 : titre de l’objet selon son tier, en tête de la carte d’objet (textes de JC, Idan 2026-10-24) |
| renamed-names.json | 3 | ancien, nouveau, famille (culture ou arme), date : noms changés par Idan ; les sauvegardes et les mots-clés Bridge des avatars restent compatibles |
| character-names.json | 46 | id, peuple, culture, consonance, poids, prenoms_femme, prenoms_homme, noms, noms_femme (noms des personnages générés : genre et consonance des cultures humaines) |
| equipment-silhouettes.json | 20 | fichier, peuple, sexe (silhouettes d'équipement de media/Avatars_Equipements dont le nom ne donne pas le peuple et le sexe) |
| people-affinity.json | 10 | peoples, matrix (ligne : peuple du mercenaire ; colonne : peuple du capitaine) |
| alignment-generation.json | 1 | distribution, neighborhood, grid, notes |

| biographies.json | 30 | id, short, rumor, motto, tags, gender, weight, statut |

| avatars.json | 0 | id, people, sex, tags, full, portrait, source (vide depuis le 2026-10-21 : tous les avatars sont sur Hostinger, `media/avatars/`, voir `docs/DEPLOYMENT.md` ; régénéré par `scripts/build-avatars.js`) |

| captain-creation-copy.json | 69 | peoples, cultures, origins, ancestries, alignments : nom, description, force, faiblesse (textes de Chatty pour la création du capitaine) |
