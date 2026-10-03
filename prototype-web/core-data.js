"use strict";

const PEOPLE_PROBABILITIES = {
  Humain: .20, Elfe: .15, Nain: .15, Orc: .15, Gobelin: .08,
  Halfling: .07, Gnome: .07, Ogre: .03, Reptilien: .05, "Homme-bête": .05
};

const CULTURES = {
  Humain: ["Montagnes du Nord", "Steppes désertiques", "Tribus de la jungle", "Cités libres", "Royaumes du Soleil Levant"],
  Elfe: ["Elfes des grandes cités", "Elfes sylvains", "Elfes noirs"],
  Nain: ["Nains des montagnes", "Nains des plaines", "Nains réduits en esclavage dans les colonies"],
  Orc: ["Orcs des steppes", "Orcs noirs", "Orcs des villes"],
  Gobelin: ["Gobelins des cavernes", "Caravanes de ferrailleurs", "Gobelins des villes"],
  Halfling: ["Explorateurs", "Halflings des cités humaines", "Halflings des villages isolés"],
  Gnome: ["Gnomes des forêts", "Gnomes des cavernes", "Gnomes des villes"],
  Ogre: ["Ogres des montagnes", "Ogres des cités humaines", "Ogres des steppes"],
  Reptilien: ["Reptiliens des villes", "Reptiliens des marécages", "Reptiliens des cités-temples"],
  "Homme-bête": ["Esclaves des cités humaines", "Tribus nordiques"]
};

const ORIGINS = ["Noble", "Soldat / Guerrier / Combattant", "Érudit", "Esclave", "Paysan / Ouvrier", "Commerçant", "Hors-la-loi"];
const ORIGIN_OVERRIDES = {
  "Nains réduits en esclavage dans les colonies": ["Soldat / Guerrier / Combattant", "Esclave", "Paysan / Ouvrier", "Hors-la-loi"],
  "Esclaves des cités humaines": ["Soldat / Guerrier / Combattant", "Esclave", "Paysan / Ouvrier", "Hors-la-loi"]
};

const ALIGNMENTS = ["Loyal bon", "Neutre bon", "Chaotique bon", "Loyal neutre", "Neutre", "Chaotique neutre", "Loyal mauvais", "Neutre mauvais", "Chaotique mauvais"];
const ASCENDANCES = ["Sang de démon", "Sang de dragon", "Sang d’elfe", "Sang d’humain", "Sang d’orc", "Sang féerique", "Sang de djinn", "Sang de dryade", "Sang de sirène", "Sang de troll", "Sang divin"];

// PROVISOIRE : la table exhaustive sera réinjectée depuis Notion.
const ASCENDANCE_COMPAT = {
  Ogre: ["Sang de démon", "Sang de dragon"],
  Reptilien: ["Sang de démon", "Sang de dragon", "Sang de djinn", "Sang de sirène"]
};

const CHARACTERISTICS = ["Force", "Constitution", "Dextérité", "Vitesse", "Endurance", "Esquive", "Chance", "Charisme", "Courage", "Intelligence", "Volonté", "Perception", "Puissance magique", "Réserve de mana"];
const RESISTANCES = ["Résistance physique", "Résistance au feu", "Résistance au froid", "Résistance à la foudre", "Résistance au poison"];

const MARTIAL_SKILLS = ["Dague", "Épée courte", "Épée longue", "Estoc", "Grande épée", "Sabre", "Katana", "Hachette", "Hache de guerre", "Hache double", "Masse d’armes", "Marteau de guerre", "Pic de guerre", "Massue / Gourdin", "Lance", "Hallebarde", "Bardiche", "Trident", "Arc", "Arbalète", "Fronde", "Sarbacane", "Pistolet", "Arquebuse / Mousquet", "Tromblon", "Bâton court", "Bâton long", "Rondache", "Écu", "Combat à mains nues"];
const ANIMAL_SKILLS = ["Araignées géantes", "Canidés", "Dragons", "Félins", "Grands monstres", "Papillons", "Rapaces", "Sangliers de combat", "Équidés"];
const MAGIC_SCHOOLS = ["Illusion", "Invocation", "Vie", "Nécromancie", "Feu", "Foudre", "Eau", "Télékinésie", "Transmutation"];
const CRAFT_SKILLS = ["Alchimie", "Couture", "Enchantement", "Forge", "Joaillerie", "Travail du bois", "Travail du cuir"];
const CAMP_SKILLS = ["Intendance", "Transmission du savoir"];
const SOCIAL_SKILLS = ["Intimidation"];

const MODIFIERS = {
  Elfe: {"Constitution":-1,"Dextérité":1,"Endurance":-1,"Esquive":1,"Chance":-1,"Intelligence":1,"Perception":1,"Puissance magique":2,"Résistance au feu":-1,"Résistance à la foudre":1},
  Nain: {"Constitution":1,"Vitesse":-1,"Endurance":1,"Esquive":-1,"Volonté":1,"Puissance magique":-1,"Résistance au feu":1,"Résistance au froid":1,"Résistance à la foudre":1},
  Orc: {"Force":1,"Constitution":1,"Endurance":1,"Courage":-1,"Intelligence":-1,"Volonté":-1,"Résistance au poison":1},
  Gobelin: {"Constitution":-1,"Dextérité":1,"Vitesse":1,"Esquive":1,"Charisme":-1,"Courage":-2,"Intelligence":-1,"Volonté":-1,"Perception":1,"Résistance physique":-1,"Résistance au poison":1},
  Halfling: {"Force":-1,"Endurance":-1,"Esquive":-1,"Chance":1,"Charisme":-1,"Volonté":1,"Perception":2},
  Gnome: {"Force":-2,"Constitution":-1,"Dextérité":1,"Vitesse":1,"Endurance":-2,"Esquive":1,"Chance":2,"Intelligence":1,"Réserve de mana":1,"Résistance physique":-1},
  Ogre: {"Force":3,"Constitution":2,"Endurance":3,"Courage":1,"Intelligence":-2,"Puissance magique":-2,"Réserve de mana":-2,"Résistance physique":1},
  Reptilien: {"Dextérité":1,"Endurance":1,"Esquive":1,"Charisme":-1,"Courage":-2,"Intelligence":1,"Réserve de mana":1,"Résistance au froid":1,"Résistance au poison":2},
  "Homme-bête": {"Force":2,"Constitution":1,"Vitesse":1,"Endurance":2,"Courage":-2,"Intelligence":-2,"Volonté":-2,"Résistance physique":1,"Résistance au froid":1},
  "Sang de démon": {"Force":2,"Puissance magique":1,"Résistance au feu":1},
  "Sang de dragon": {"Force":2,"Constitution":1,"Puissance magique":1,"Résistance au feu":2},
  "Sang d’elfe": {"Dextérité":1,"Esquive":1,"Intelligence":1},
  "Sang d’humain": {"Charisme":1,"Courage":1},
  "Sang d’orc": {"Force":1,"Endurance":1},
  "Sang féerique": {"Vitesse":1,"Chance":2,"Puissance magique":1},
  "Sang de djinn": {"Esquive":1,"Réserve de mana":2,"Résistance à la foudre":2},
  "Sang de dryade": {"Intelligence":1,"Perception":1,"Réserve de mana":1,"Résistance au poison":2},
  "Sang de sirène": {"Chance":1,"Charisme":2,"Résistance au froid":2},
  "Sang de troll": {"Force":1,"Endurance":2,"Résistance physique":1},
  "Sang divin": {"Chance":2,"Puissance magique":2,"Réserve de mana":2,"Résistance physique":1},
  "Montagnes du Nord": {"Force":1,"Endurance":1,"Intelligence":-1,"Résistance au froid":2},
  "Steppes désertiques": {"Vitesse":1,"Résistance au feu":1},
  "Tribus de la jungle": {"Constitution":1,"Courage":1,"Perception":1,"Résistance au froid":-1,"Résistance au poison":2},
  "Cités libres": {"Chance":1,"Charisme":1,"Intelligence":1,"Perception":-1},
  "Royaumes du Soleil Levant": {"Dextérité":1,"Esquive":1,"Volonté":1},
  "Elfes des grandes cités": {"Intelligence":1,"Réserve de mana":1},
  "Elfes sylvains": {"Esquive":1,"Perception":2},
  "Elfes noirs": {"Dextérité":1,"Charisme":-1,"Résistance à la foudre":2,"Résistance au poison":1},
  "Nains des montagnes": {"Force":1,"Vitesse":-1,"Esquive":-1,"Résistance au froid":2},
  "Nains des plaines": {"Esquive":1,"Volonté":-1,"Perception":-1},
  "Nains réduits en esclavage dans les colonies": {"Endurance":1,"Chance":1,"Charisme":-1,"Volonté":1,"Réserve de mana":-1},
  "Orcs des steppes": {"Vitesse":1,"Esquive":1},
  "Orcs noirs": {"Force":2,"Résistance physique":1,"Résistance à la foudre":-1},
  "Orcs des villes": {"Charisme":1,"Courage":-1,"Intelligence":1,"Perception":1},
  "Gobelins des cavernes": {"Esquive":1,"Intelligence":-1,"Perception":1,"Résistance au feu":-1,"Résistance au poison":1},
  "Caravanes de ferrailleurs": {"Chance":1,"Courage":-1,"Intelligence":1,"Puissance magique":-1,"Résistance au froid":1,"Résistance à la foudre":-1},
  "Gobelins des villes": {"Force":-1,"Dextérité":1,"Courage":-1,"Volonté":-1},
  Explorateurs: {"Chance":2,"Courage":1,"Perception":1,"Résistance au froid":1},
  "Halflings des cités humaines": {"Esquive":1,"Charisme":1,"Courage":-1,"Intelligence":1,"Volonté":-1,"Résistance physique":1},
  "Halflings des villages isolés": {"Force":-1,"Endurance":-1,"Puissance magique":1,"Réserve de mana":1},
  "Gnomes des forêts": {"Volonté":1,"Perception":1,"Résistance au poison":1},
  "Gnomes des cavernes": {"Volonté":1,"Résistance au feu":1},
  "Gnomes des villes": {"Force":-1,"Esquive":1,"Intelligence":1,"Puissance magique":1},
  "Ogres des montagnes": {"Constitution":1,"Résistance au froid":2},
  "Ogres des cités humaines": {"Intelligence":1,"Résistance au poison":2},
  "Ogres des steppes": {"Endurance":1,"Résistance au feu":2},
  "Reptiliens des villes": {"Dextérité":2,"Intelligence":1},
  "Reptiliens des marécages": {"Vitesse":1,"Esquive":1,"Perception":2,"Résistance au poison":1},
  "Reptiliens des cités-temples": {"Charisme":1,"Puissance magique":1,"Réserve de mana":1,"Résistance à la foudre":2},
  "Tribus nordiques": {"Force":1,"Résistance au froid":2},
  Noble: {"Endurance":-1,"Chance":2,"Volonté":1},
  "Soldat / Guerrier / Combattant": {"Force":2,"Dextérité":1,"Intelligence":-1,"Résistance physique":1},
  "Érudit": {"Constitution":-1,"Charisme":1,"Intelligence":2,"Résistance à la foudre":1},
  Esclave: {"Endurance":2,"Chance":-1,"Volonté":1,"Résistance physique":1},
  "Paysan / Ouvrier": {"Constitution":2,"Courage":1,"Perception":-1,"Résistance au froid":1},
  Commerçant: {"Force":-1,"Charisme":2,"Intelligence":1},
  "Hors-la-loi": {"Dextérité":2,"Courage":-1,"Perception":1,"Résistance au poison":1}
};

const NAME_BANK = {
  Humain: ["Aldric", "Bastien", "Corvin", "Daria", "Elise", "Gaspard", "Mara", "Nils", "Ysabeau"],
  Elfe: ["Aelion", "Caelys", "Eryndra", "Faelar", "Lytha", "Naeris", "Sylwen", "Thalion"],
  Nain: ["Borin", "Dagna", "Gromli", "Hilda", "Kelda", "Rurik", "Thrain", "Yrsa"],
  Orc: ["Brakka", "Dorg", "Grishka", "Karg", "Morga", "Ruz", "Ugra", "Vark"],
  Gobelin: ["Bik", "Crik", "Fizzi", "Gnak", "Mik-Mik", "Ratch", "Skrub", "Zib"],
  Halfling: ["Beryl", "Clem", "Dottie", "Milo", "Pip", "Rosie", "Tobin", "Willa"],
  Gnome: ["Bimble", "Fizzwick", "Lulla", "Nim", "Pock", "Tilli", "Wizzle", "Zanna"],
  Ogre: ["Brog", "Dunda", "Gorma", "Krosh", "Mog", "Romba", "Tug", "Vorga"],
  Reptilien: ["Azhiss", "Kesh", "Ssara", "Tzarek", "Vess", "Xill", "Zekka", "Zssar"],
  "Homme-bête": ["Brann-Corne", "Drusk", "Gor", "Karn", "Malk", "Rauk", "Thesk", "Varn"]
};

const game = { captain: null, initialSquad: [], generated: [], idCounter: 1 };

const $ = (id) => document.getElementById(id);
const roll = (sides) => Math.floor(Math.random() * sides) + 1;
const rollDice = (count, sides) => Array.from({length: count}, () => roll(sides)).reduce((a,b)=>a+b,0);
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const round1 = (n) => Math.round(n*10)/10;
const esc = (s) => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function weightedChoice(weights) {
  const entries = Object.entries(weights).filter(([,w]) => w > 0);
  const total = entries.reduce((s,[,w]) => s+w, 0);
  let x = Math.random() * total;
  for (const [value, w] of entries) { x -= w; if (x <= 0) return value; }
  return entries.at(-1)?.[0];
}

function compatibleAscendances(people) {
  return ASCENDANCE_COMPAT[people] || ASCENDANCES;
}

function originsForCulture(culture) {
  return ORIGIN_OVERRIDES[culture] || ORIGINS;
}

function rollAscendanceLevel() {
  const x = Math.random();
  if (x < .4) return 1;
  if (x < .8) return 2;
  return 3;
}

function modifierDiceCount(intensity, kind, ascLevel = 1) {
  const n = Math.abs(intensity);
  if (kind !== "ascendance") return ({1:2,2:4,3:6})[n] || 0;
  const maps = {
    1: {1:2,2:4,3:6},
    2: {1:4,2:8,3:12},
    3: {1:6,2:10,3:15}
  };
  return maps[ascLevel]?.[n] || 0;
}

function applyIdentityModifier(character, source, kind, ascLevel) {
  const mods = MODIFIERS[source];
  if (!mods) return;
  for (const [target, intensity] of Object.entries(mods)) {
    const dice = modifierDiceCount(intensity, kind, ascLevel);
    const delta = rollDice(dice, 6) * Math.sign(intensity);
    if (target in character.stats) character.stats[target] += delta;
    else if (target in character.resistances) character.resistances[target] += delta;
  }
}

function generateBaseStats() {
  return Object.fromEntries(CHARACTERISTICS.map(k => [k, 20 + rollDice(3,20)]));
}
function generateResistances() {
  return Object.fromEntries(RESISTANCES.map(k => [k, roll(6)]));
}
