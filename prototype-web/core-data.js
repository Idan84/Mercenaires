"use strict";

const game = {
  captain: null,
  initialSquad: [],
  generated: [],
  idCounter: 1,
  generator: null,
  nameRules: null,
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

// Une fois la partie créée, tous les identifiants viennent du même compteur que les candidats de la Taverne.
function nextCharacterId() {
  return game.campaign ? game.campaign.nextId++ : game.idCounter++;
}
