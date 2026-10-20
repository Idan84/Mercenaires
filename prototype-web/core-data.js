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

function provisionalName(people){
  const firstNames=NAME_BANK[people]||NAME_BANK.Humain;
  const familyNames=FAMILY_NAME_BANK[people]||FAMILY_NAME_BANK.Humain;
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
