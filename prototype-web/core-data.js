"use strict";

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

/* Noms de famille par peuple. Les noms complets sont tirés sans numéro, avec une
   préférence pour les combinaisons encore inédites pendant la session. */
const FAMILY_NAME_BANK={
  Humain:["Valbrune","Montfaucon","D'Aubrecourt","Ferregarde","Rochefort","Bellombre","Hauterive","Dumont","Lenoir","Duval","Sanglier","Vaudrin","Brisefer","Aubépine","Noirval","Corbeau"],
  Elfe:["Feuillebrume","Lunedor","Sylveclaire","Étoilegrise","Ventargent","D'Astriel","Roncebleue","Aubechant","Nuitflore","Lamefeuille","Soleilvoilé","Boisargent","Épineblanche","Florétoile","Roselune","Lysombre"],
  Nain:["Barbefer","Poingdacier","Brisepierre","Hachegrise","Coeurdegranit","Martenclume","Braiseforge","Barbecuivre","Piedroc","Hautmarteau","Rochebrune","Mineprofonde","Piqueforge","Ferrouge","Brassebière","Foudrefer"],
  Orc:["Brisecrâne","Dentrouge","Fendsang","Mainnoire","Briseos","Griffefer","Fendroc","Têtebrute","Hurleflamme","Crocsombre","Hachebrut","Sangfort","Cassecorne","Poingbrut","Ragefer","Œilbalafré"],
  Gobelin:["Pique-Sou","Croc-Poussière","Mange-Miette","Raclefond","Chapardeur","Gratte-Rouille","Louchebourse","Casseclou","Fouille-Poche","Plumecroc","Siffle-Fuite","Tord-Nez","Bricobombe","Lèche-Suie","Coupe-Corde","Rongefer"],
  Halfling:["Petitpré","Grainmoulin","Tourtechaude","Piedléger","Pommedouce","Briocheval","Fleurpot","Courtebranche","Bonpanier","Mielruisseau","Herbebelle","Trèflevert","Rondfoin","Douxfoyer","Longsentier","Champbrun"],
  Gnome:["Rouageson","Brindeboulon","Tournivis","Étincelune","Claquepignon","Lunettefine","Bricofin","Grosressort","Tintabille","Siffleclef","Vifengrenage","Poudrebleue","Cléchantante","Cuivrebrume","Picotrou","Barillet"],
  Ogre:["Gros-Poing","Écrase-Tout","Casse-Mur","Bourrecrâne","Longue-Mâchoire","Briseroc","Deux-Tonnes","Gros-Croc","Piedlourd","Mangegriffe","Rocheventre","Tordchêne","Boum-Boum","Troncsombre","Coupsourd","Fendbaril"],
  Reptilien:["Ssil-Vek","Kra'Ziss","Veth-Arr","Xesh-Taal","Tzek'Ras","Zar-Ssek","Hiss-Vor","Kesh'Rath","Ssar-Zen","Tzalliss","Azh'Keth","Vess-Aar","Szor-Kal","Kraa'Seth","Xill-Vash","Thess'Var"],
  "Homme-bête":["Cornebrume","Crinièregrise","Griffechêne","Fauvebois","Museaucendre","Crocsauvage","Hurlebois","Pattesombre","Longuecorne","Loupdesbois","Crinièrerouge","Sabotfer","Roncegriffes","Cornedefer","Flairenuit","Serrebrune"]
};

const CULTURE_FAMILY_NAME_BANK={
  "Tribus nordiques": [
    "Crocs-de-Givre",
    "Corne-de-Roc",
    "Pelageblanc",
    "Morsurefroide",
    "Loupdesneiges",
    "Griffed'hiver",
    "Hurlevent",
    "Crinière-de-Givre"
  ],
  "Clans des grandes steppes": [
    "Sabot-du-Vent",
    "Corne-de-Sable",
    "Crinièrelibre",
    "Course-Lointaine",
    "Loupdesplaines",
    "Griffe-Sèche",
    "Fils-du-Tonnerre",
    "Pistebrune"
  ],
  "Ogres des cités humaines": [
    "Grossetête",
    "Brisepavé",
    "Portefaix",
    "Cassebrique",
    "Roulebaril",
    "Mâchoiregrise",
    "Portegrue",
    "Mangechariot"
  ],
  "Reptiliens des villes": [
    "Vess'Kar",
    "Sszel-Ven",
    "Keth'Sar",
    "Tzir-Ash",
    "Zek'Vel",
    "Rass-Tek",
    "Iss'Ven",
    "Kess'Zar"
  ],
  "Montagnes du Nord": [
    "Froidecombe",
    "Hautefalaise",
    "Briseglace",
    "Pierrefroide",
    "Loupblanc",
    "Rochevent",
    "Valneige",
    "Fortgivre"
  ],
  "Reptiliens des marécages": [
    "Sszar-Bog",
    "Vesh'Murk",
    "Thiss-Raa",
    "Ziss'Nar",
    "Kesh'Ssul",
    "Ssal-Vek",
    "Rasshiss",
    "Tzek'Moss"
  ],
  "Elfes noirs": [
    "Nuitlame",
    "Sombrelune",
    "Noireépine",
    "Venimombre",
    "Cendrelisse",
    "Voile-noir",
    "Lamecendre",
    "Ombrefiel"
  ],
  "Halflings des cités humaines": [
    "Douxcomptoir",
    "Petitmarché",
    "Bellepièce",
    "Pavédoré",
    "Marchesou",
    "Demiécu",
    "Vifpanier",
    "Bonquartier"
  ],
  "Tribus de la jungle": [
    "Feuilletonnerre",
    "Jaguarrouge",
    "Pluiechaude",
    "Serpentvert",
    "Fleur-de-Sang",
    "Lianegriffe",
    "Rivièrebrune",
    "Oragefeuillu"
  ],
  "Cités libres": [
    "D'Aubrecourt",
    "Bellemur",
    "Portefranc",
    "Valdor",
    "Granderue",
    "Montcendre",
    "Marchandor",
    "Rocheval"
  ],
  "Caravanes de ferrailleurs": [
    "Grattefer",
    "Voleclou",
    "Brasseboulon",
    "Raclecuivre",
    "Casse-roue",
    "Limecroc",
    "Ferraillepoche",
    "Soudepic"
  ],
  "Gnomes des forêts": [
    "Moussebranche",
    "Noisettine",
    "Fougèreroue",
    "Sureauvert",
    "Chantécorce",
    "Roncetige",
    "Lichenlune",
    "Brindemiel"
  ],
  "Explorateurs": [
    "Longsentier",
    "Vifhorizon",
    "Hautecarte",
    "Boussole",
    "Loinbois",
    "Pieddécouvreur",
    "Ventdebout",
    "Ruisseauclair"
  ],
  "Steppes désertiques": [
    "Sablelance",
    "Ventbrûlant",
    "Miragegris",
    "Dunehaute",
    "Faucondesable",
    "Sirocco",
    "Cavalune",
    "Longuesoif"
  ],
  "Orcs noirs": [
    "Fermaudit",
    "Noirécu",
    "Croc-d'Obsidienne",
    "Hachecendre",
    "Sangnoir",
    "Briseacier",
    "Heurtenuit",
    "Plaiefer"
  ],
  "Elfes des grandes cités": [
    "D'Astriel",
    "Verrétoile",
    "Haute-lune",
    "Tourargent",
    "Aubecour",
    "Solenriel",
    "Lysdor",
    "D'Ormeclaire"
  ],
  "Gobelins des cavernes": [
    "Fouilletrou",
    "Crocsilex",
    "Raclepierre",
    "Griffenuit",
    "Mousseglisse",
    "Faimsombre",
    "Mordstalac",
    "Chutedos"
  ],
  "Halflings des villages isolés": [
    "Vertpré",
    "Bonnehaie",
    "Petitchamp",
    "Fleuravoine",
    "Douxfoyer",
    "Mielcolline",
    "Rondpotager",
    "Blédoré"
  ],
  "Orcs des villes": [
    "Rochepavé",
    "Griffequartier",
    "Crocdefer",
    "Fortmarché",
    "Poingsûr",
    "Hautemuraille",
    "Coupebourse",
    "Ruellebrute"
  ],
  "Tribus des forêts anciennes": [
    "Vieillecorne",
    "Roncesauvage",
    "Griffe-mousse",
    "Cerfbrume",
    "Boisfauve",
    "Racinecrocs",
    "Écorcegrise",
    "Loupfeuille"
  ],
  "Gobelins des villes": [
    "Volebourse",
    "Gagne-Sou",
    "Ruellefine",
    "Piquefer",
    "Marchenoire",
    "Coupe-Poche",
    "Clou-Rouillé",
    "Bricotruand"
  ],
  "Royaumes du Soleil Levant": [
    "Kurohana",
    "Hoshikawa",
    "Takemori",
    "Akasora",
    "Mizuhara",
    "Yametsuki",
    "Shirokaze",
    "Morihara"
  ],
  "Orcs des steppes": [
    "Ventcroc",
    "Cavalefer",
    "Lancesèche",
    "Sabotnoir",
    "Sangdesplaines",
    "Hurlesable",
    "Hautegalop",
    "Frappevent"
  ],
  "Nains des montagnes": [
    "Pierremarteau",
    "Ferprofonde",
    "Enclumeroc",
    "Rocheforge",
    "Barbegranite",
    "Hachegivre",
    "Voutefer",
    "Minerouge"
  ],
  "Ogres des montagnes": [
    "Avalanche",
    "Cassefalaise",
    "Grosroc",
    "Brisecombe",
    "Fendmont",
    "Peaugranite",
    "Piedfalaise",
    "Roulegranit"
  ],
  "Gnomes des cavernes": [
    "Écho-boulon",
    "Silexroue",
    "Grotteclique",
    "Cristalvis",
    "Piquelampe",
    "Micaressort",
    "Souterrond",
    "Caverneclef"
  ],
  "Elfes sylvains": [
    "Chêneclair",
    "Feuillevent",
    "Lunedécorce",
    "Rosebois",
    "Sylvebrume",
    "Auberonce",
    "Fougèrelune",
    "Lysdesbois"
  ],
  "Nains des plaines": [
    "Champsforge",
    "Meulefer",
    "Longueforge",
    "Brassegrain",
    "Marteauvert",
    "Forgeplaine",
    "Ventcuivre",
    "Champdacier"
  ],
  "Reptiliens des cités-temples": [
    "Ssar'Thek",
    "Zeth'Kaal",
    "Tzara'Sel",
    "Vash'Ruun",
    "Kess'Thal",
    "Xeth'Zar",
    "Ash'Tek",
    "Rass'Keth"
  ],
  "Nains réduits en esclavage dans les colonies": [
    "Chaînebrisée",
    "Sans-Fer",
    "Libregranit",
    "Marteau-fendu",
    "Cendrebarbe",
    "Rocheenchaînée",
    "Brisefers",
    "Chaînemorte"
  ],
  "Gnomes des villes": [
    "Tournehorloge",
    "Lunetterie",
    "Cliquedor",
    "Pignonbleu",
    "Mécanivis",
    "Boulondor",
    "Ruetictac",
    "Cuivrepressé"
  ],
  "Ogres des steppes": [
    "Sabotgéant",
    "Longuefoulée",
    "Écrasedune",
    "Ventmassue",
    "Grosgalop",
    "Plainebrute",
    "Mangehorizon",
    "Fendherbe"
  ]
};

const EXTRA_FIRST_NAMES={
  Humain:["Armand","Célian","Edric","Florine","Iseult","Jorvan","Léonie","Morgane","Octave","Renaud","Solenne","Théobald"],
  Elfe:["Aerendyl","Belthir","Calaena","Daerion","Eluniel","Ilyra","Kaelith","Laerwen","Miralys","Nimrion","Oriella","Vaelith"],
  Nain:["Baldur","Brunna","Dorin","Edda","Falki","Gerta","Hargrim","Inga","Korrin","Magda","Nori","Torhild"],
  Orc:["Argosh","Borga","Draz","Goruk","Hargra","Krogar","Lurka","Mazg","Ragash","Thurka","Urzog","Zarga"],
  Gobelin:["Brik","Dik-Dik","Flek","Gozzi","Krib","Nix","Pik","Rik-Rik","Snag","Tik","Vrik","Zonk"],
  Halfling:["Alba","Bram","Callie","Elsie","Fenn","Hob","Jasper","Lottie","Merri","Nell","Perry","Tansy"],
  Gnome:["Arkie","Bop","Cogs","Delli","Gimzi","Jib","Kippa","Moxi","Nanna","Pim","Sprok","Tinka"],
  Ogre:["Bruga","Drog","Gorga","Hruk","Krum","Lugga","Mork","Norga","Rog","Throg","Urga","Zug"],
  Reptilien:["Akriss","Dzeh","Isska","Kzesh","Nass","Rasz","Sshira","Tashk","Vezra","Xzath","Zhir","Zsiss"],
  "Homme-bête":["Arnek","Borr","Cairn","Dreka","Fennok","Garr","Herka","Korr","Maega","Narek","Skarn","Verr"]
};
for(const [people,entries] of Object.entries(EXTRA_FIRST_NAMES)) NAME_BANK[people].push(...entries);
const usedCharacterNames=new Set();

const game = {
  captain: null,
  initialSquad: [],
  generated: [],
  idCounter: 1,
  generator: null,
  audit: null,
  mission: null,
  campaign: null
};

const $ = (id) => document.getElementById(id);
const round1 = (n) => Math.round(Number(n) * 10) / 10;
const esc = (s) => String(s ?? "").replace(/[&<>'"]/g, c => ({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  "'":"&#39;",
  '"':"&quot;"
}[c]));

function provisionalName(people, culture){
  const firstNames=NAME_BANK[people]||NAME_BANK.Humain;
  const familyNames=CULTURE_FAMILY_NAME_BANK[culture]||FAMILY_NAME_BANK[people]||FAMILY_NAME_BANK.Humain;
  const possible=firstNames.length*familyNames.length;
  let firstName,familyName,name;
  // Ne recycle pas une combinaison tant que le stock de ce peuple n'est pas épuisé.
  for(let i=0;i<Math.min(60,possible);i++){
    firstName=firstNames[Math.floor(Math.random()*firstNames.length)];
    familyName=familyNames[Math.floor(Math.random()*familyNames.length)];
    name=firstName+" "+familyName;
    if(!usedCharacterNames.has(name))break;
  }
  if(usedCharacterNames.has(name)){
    const available=[];
    for(const first of firstNames)for(const family of familyNames){
      const full=first+" "+family;
      if(!usedCharacterNames.has(full))available.push({firstName:first,familyName:family,name:full});
    }
    if(available.length){
      const pick=available[Math.floor(Math.random()*available.length)];
      ({firstName,familyName,name}=pick);
    }
  }
  usedCharacterNames.add(name);
  return {firstName,familyName,name};
}

// Une fois la partie créée, tous les identifiants viennent du même compteur que les candidats de la Taverne.
function nextCharacterId() {
  return game.campaign ? game.campaign.nextId++ : game.idCounter++;
}
