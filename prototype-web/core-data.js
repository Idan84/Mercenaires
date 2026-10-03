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

const game = {
  captain: null,
  initialSquad: [],
  generated: [],
  idCounter: 1,
  generator: null,
  audit: null
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

function provisionalName(people, id) {
  const bank = NAME_BANK[people] || ["Mercenaire"];
  const base = bank[Math.floor(Math.random() * bank.length)];
  return `${base} ${id ?? ""}`.trim();
}

function nextCharacterId() {
  return game.idCounter++;
}
