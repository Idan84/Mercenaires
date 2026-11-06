"use strict";

// Domaine évolutif et cadre de combat (Idan, 2026-11-06) : « un cadre de couleur pour nos personnages ? Archer / CAC /
// Magie » ; « combat seulement », « on ne touche pas aux ennemis » ; « le statut (l'icône) évolue dans le temps et le cadre
// suit cette évolution » ; « on garde le frein, et un message dans le journal, mais on utilise le terme de combat
// rapproché ».
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createMagicRules} = require("../game-core/magic.js");
const {createProfileRules} = require("../game-core/mercenary-profile.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const read = file => fs.readFileSync(path.join(ROOT, "prototype-web", file), "utf8");

// 1. Les données : chaque rôle qui dit comment il se bat mène à un domaine ; les sorts mènent à Mage.
const S = reference.mercenaryProfile.selection;
const domains = reference.domains.rows.map(r => r.code);
const categories = reference.mercenaryProfile.categories.map(c => c.code);
assert.deepEqual(S.domaine_par_role, {dps_cac: "melee", dps_distance: "ranged", dps_magie: "magic", healer: "magic", buffer: "magic",
  controleur: "magic", summoner: "magic"});
for (const [role, domain] of Object.entries(S.domaine_par_role)) {
  assert.ok(categories.includes(role), role);
  assert.ok(domains.includes(domain), domain);
}
assert.equal(S.domaine_sorts, "magic");
assert.ok(S.ecart_hors_domaine >= 1, "le frein reste");

// 2. La règle : le premier rôle du titre qui dit comment il se bat ; Tank, Éclaireur ou Meneur par les sorts : Mage ;
// sinon le rôle suivant ; sans titre ou sans rôle qui le dise : null (le domaine ne change pas).
const random = (() => { let seed = 11; return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); })();
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const engine = createCombatEngine(reference, {});
const magic = createMagicRules({reference, combat: engine});
const profile = createProfileRules({reference, engine, magic});
const role = (category, source = "x") => ({category, top: {code: "x", source}});
const domainOf = (...titles) => profile.titleDomain({titles});
assert.equal(domainOf(role("dps_cac")), "melee");
assert.equal(domainOf(role("dps_distance")), "ranged");
for (const code of ["dps_magie", "healer", "buffer", "controleur", "summoner"]) assert.equal(domainOf(role(code, "sorts:x")), "magic", code);
assert.equal(domainOf(role("tank", "encaisser"), role("dps_distance")), "ranged", "le Tank ne dit pas comment : le rôle suivant");
assert.equal(domainOf(role("tank", "sorts:auto_soigneur"), role("dps_cac")), "magic", "un Tank qui se soigne par ses sorts");
assert.equal(domainOf(role("eclaireur", "sorts:magique")), "magic");
assert.equal(domainOf(role("meneur", "sorts:soutien")), "magic");
assert.equal(domainOf(role("meneur", "aura"), role("eclaireur", "perception")), null, "rien ne dit comment il se bat");
assert.equal(domainOf(), null, "Chair à canon : pas de changement");
assert.equal(profile.titleDomain(null), null);
// À la génération, le titre suit le domaine tiré : personne ne change de domaine au premier matin.
const captain = generator.createCaptain({id: 1});
const recruits = Array.from({length: 150}, (_, i) => generator.createMercenary({id: 10 + i, captain}));
for (const m of recruits) {
  const next = profile.titleDomain(profile.evaluate(m));
  assert.ok(next === null || next === m.domain, m.name + " : " + m.domain + " → " + next);
}

// 3. Le mage en armure de plates avec une épée à deux mains (Idan) : il passe au combat rapproché quand l'épée prend le
// dessus, pas avant (le frein : hors de son domaine, un rôle demande une étoile de plus).
function arm(character, name) {
  const item = {id: "dom-" + character.id, name, itemType: "weapon", slot: "weapon_set_1_main", owner: character.id, qualityCode: "standard", tier: 1};
  character.items = [...character.items.filter(i => i.itemType !== "weapon"), item];
  character.equipment = {...character.equipment, slots: {...character.equipment.slots, weapon_set_1_main: item.id, weapon_set_1_off: null,
    weapon_set_2_main: null, weapon_set_2_off: null}};
}
const mage = recruits.find(m => m.domain === "magic" && profile.titleDomain(profile.evaluate(m)) === "magic");
assert.ok(mage, "un mage titré");
const swordsman = boost => {
  const m = JSON.parse(JSON.stringify(mage));
  for (const k of ["Épée à deux mains", "Lames longues", "Combat à deux mains"]) m.skills.martial[k] = 100;
  for (const k of ["Force", "Dextérité", "Vitesse"]) m.stats[k] += boost;
  arm(m, "Épée à deux mains");
  return m;
};
const brake = S.titre_min + S.ecart_hors_domaine;
let switched = 0;
for (const boost of [0, 10, 20, 30, 40, 50, 60]) {
  const m = swordsman(boost), result = profile.evaluate(m), melee = result.categories.find(c => c.code === "dps_cac");
  const next = profile.titleDomain(result);
  if (next === "melee") { switched++; assert.ok(melee.level >= brake, "le frein : " + melee.level + " étoiles"); }
  else assert.equal(next, "magic");
}
assert.ok(switched > 0, "assez fort à l'épée, il change de domaine");
assert.equal(profile.titleDomain(profile.evaluate(swordsman(60))), "melee");

// 4. Le jeu : le domaine change, un message dans le journal (« combat rapproché ») ; rien quand il ne change pas.
const ui = read("ui.js");
const code = ui.slice(ui.indexOf("function mercenaryDomain("), ui.indexOf("function domainBadge("));
const journal = [];
const refresh = new Function("profileRules", "evaluationContext", "gameAction", code + "\nreturn refreshMercenaryDomains;")
  (() => profile, () => ({}), message => journal.push(message));
const fighter = swordsman(60);
const logged = [];
assert.deepEqual(refresh([fighter], {log: m => logged.push(m)}), [fighter]);
assert.equal(fighter.domain, "melee");
assert.deepEqual(journal, [fighter.name + " passe au combat rapproché."]);
assert.deepEqual(logged, journal, "et dans le journal du combat");
assert.deepEqual(refresh([fighter]), [], "une seule fois");
const plain = recruits.find(m => profile.titleDomain(profile.evaluate(m)) === null);
assert.deepEqual(refresh([plain]), [], "sans titre, il garde son domaine");
assert.match(code, /ranged: "passe au combat à distance", magic: "passe à la magie"/);
assert.doesNotMatch(code, /CAC/);
// Quand : à la fin d'une mission, après un changement d'équipement, chaque matin au camp.
assert.match(read("tavern-ui.js"), /logDayReport\(report\);\n[^\n]*\n\s+if\(typeof refreshMercenaryDomains==="function"\) refreshMercenaryDomains\(game\.campaign\.company\.roster\);/);
assert.equal((read("deal-ui.js").match(/refreshMercenaryDomains\(\[m\]\)/g) || []).length, 3, "échange, relance, réaménagement");
assert.match(read("mission.js"), /refreshMercenaryDomains\(\(report\.progression\|\|\[\]\)\.map\(p=>p\.mercenary\),\{log:text=>missionLog\(text,"gear"\)\}\)/);

// 5. Le cadre en combat : la couleur du domaine du moment, pour nos personnages seulement (ni ennemis, ni invocations).
const mission = read("mission.js");
const attr = new Function("game", mission.slice(mission.indexOf("function missionDomainAttr("), mission.indexOf("function renderMissionPortrait(")) + "\nreturn missionDomainAttr;")({});
assert.equal(attr({team: "player", character: {domain: "ranged"}}), ' data-domain="ranged"');
assert.equal(attr({team: "player", character: fighter}), ' data-domain="melee"', "le domaine du moment");
assert.equal(attr({team: "player", character: {equipment: {profile: {type: "magic"}}}}), ' data-domain="magic"');
assert.equal(attr({team: "enemy", character: {domain: "magic"}}), "", "on ne touche pas aux ennemis");
assert.equal(attr({team: "player", summon: true, character: {domain: "magic"}}), "", "ni aux invocations");
assert.equal((mission.match(/\$\{missionDomainAttr\((u|x|unit)\)\}/g) || []).length, 3, "pion, ordre de jeu, liste");
const css = read("styles.css");
for (const [rule, active] of [[".mission-token[data-domain=\"ranged\"] .token-ring{border-color:#6cc25a}", ".mission-token.active .token-ring{"],
  [".mission-init[data-domain=\"magic\"]{border-color:#a97be6}", ".mission-init.active{"]]) {
  assert.ok(css.includes(rule), rule);
  assert.ok(css.indexOf(rule) < css.indexOf(active), "l'actif reste doré : " + active);
}
assert.ok(css.includes(".mission-roster-row[data-domain=\"ranged\"] .avatar-frame--compact{border-color:#6cc25a}"));
console.log("Domaine évolutif (titre, frein, journal) et cadre de combat par domaine — OK");
