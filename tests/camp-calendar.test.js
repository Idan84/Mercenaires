"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const calendar = require("../prototype-web/camp-calendar.js");
const reference = {campCalendar: JSON.parse(fs.readFileSync(path.join(root,"data/reference/camp-calendar.json"),"utf8"))};
const index = fs.readFileSync(path.join(root,"prototype-web/index.html"),"utf8");
const tavernUI = fs.readFileSync(path.join(root,"prototype-web/tavern-ui.js"),"utf8");
const ui = fs.readFileSync(path.join(root,"prototype-web/ui.js"),"utf8");
const calendarUI = fs.readFileSync(path.join(root,"prototype-web/camp-calendar.js"),"utf8");
const screenUI = fs.readFileSync(path.join(root,"prototype-web/screen-ui.js"),"utf8");
const loader = fs.readFileSync(path.join(root,"prototype-web/reference-data.js"),"utf8");
const css = fs.readFileSync(path.join(root,"prototype-web/styles.css"),"utf8");

const table = reference.campCalendar;
assert.equal(table.months.length,12);
assert.equal(table.weekday_names.length,7);
assert.equal(table.days_per_year,365);
assert.equal(table.months.reduce((total,m)=>total+m.days,0),365);
assert.ok(table.months.every(m=>m.quotes.length>=3), "trois citations saisonnières par mois");
const date = n => calendar.campaignCalendarDate(n,reference);
assert.deepEqual(
  [date(1).weekday,date(1).dayOfMonth,date(1).month,date(1).year,date(1).campaignDay],
  ["Lunbrume",1,"Brumecendre",842,1]
);
assert.equal(date(7).weekday,"Dimcairn");
assert.equal(date(8).weekday,"Lunbrume");
assert.deepEqual([date(31).dayOfMonth,date(31).month],[31,"Brumecendre"]);
assert.deepEqual([date(32).dayOfMonth,date(32).month],[1,"Corbenaël"]);
assert.deepEqual([date(59).dayOfMonth,date(59).month],[28,"Corbenaël"]);
assert.deepEqual([date(60).dayOfMonth,date(60).month],[1,"Bourbevent"]);
assert.deepEqual([date(365).dayOfMonth,date(365).month,date(365).year],[31,"Neigedette",842]);
assert.deepEqual([date(366).dayOfMonth,date(366).month,date(366).year,date(366).weekday],[1,"Brumecendre",843,"Martel"]);
assert.deepEqual([date(731).year,date(731).month],[844,"Brumecendre"]);
assert.notEqual(date(1).quote,date(2).quote);
assert.notEqual(date(2).quote,date(3).quote);
assert.equal(date(4).quote,date(1).quote,"citation tournante à l'intérieur du mois");
assert.throws(()=>date(0),RangeError);
assert.throws(()=>date(1.5),RangeError);
assert.throws(()=>date("1"),RangeError);
assert.throws(()=>calendar.campaignCalendarDate(1,{campCalendar:{months:[],weekday_names:[]}}),/incomplet/);
for(let day=1;day<=365*3;day++){
  const d=date(day);
  assert.ok(d.dayOfMonth>=1 && d.dayOfMonth<=31);
  assert.ok(table.months.some(m=>m.name===d.month));
  assert.ok(d.quote,"citation pour le jour "+day);
}

assert.match(loader,/campCalendar:\s*"camp-calendar.json"/);
// Barre du bas (Idan, 2026-10-21) : petit calendrier et gros bouton play au centre ; plus d'almanach au camp.
assert.match(index,/id="hud-calendar"/);
assert.match(index,/id="hud-date"/);
assert.match(index,/id="hud-day"/);
assert.match(index,/id="hud-next-day-btn"/);
assert.match(index,/src="camp-calendar.js"/);
assert.doesNotMatch(index,/id="tavern-next-day-btn"|id="camp-next-day-btn"|class="camp-calendar"/);
assert.match(tavernUI,/\$\("hud-next-day-btn"\)\.addEventListener\("click",advanceCampDay\)/);
assert.doesNotMatch(tavernUI,/tavern-next-day-btn|camp-next-day-btn|advanceTavernDay/);
assert.match(ui,/renderGameHud\(\);/);
assert.match(screenUI,/renderCampCalendar\(\);/);
assert.match(css,/\.hud-play\{/);
assert.doesNotMatch(css,/\.camp-calendar/);

const extract=(source,begin,end)=>{
  const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);
  assert.ok(a>=0 && b>a,begin+" → "+end);
  return source.slice(a,b);
};
const node=()=>({textContent:"",title:"",offsetWidth:0,classList:{add(){},remove(){}}});
const nodes=Object.fromEntries(["hud-calendar","hud-date","hud-day"].map(id=>[id,node()]));
const fakeGame={campaign:{day:31,company:{}},referenceData:reference,tavernSelected:null};
const render = new Function("game","document","campaignCalendarDate",
  extract(calendarUI,"function renderCampCalendar()","if (typeof module")+
  "\nreturn renderCampCalendar;"
)(
  fakeGame,{getElementById:id=>nodes[id]},calendar.campaignCalendarDate
);
render();
assert.equal(nodes["hud-date"].textContent,"Druiden 31 Brumecendre");
assert.equal(nodes["hud-day"].textContent,"Jour 31 · An 842");
assert.match(nodes["hud-calendar"].title,/^An 842 — Âge des Couronnes Brisées\n« .+ »$/);
fakeGame.campaign.day=32;
render();
assert.match(nodes["hud-date"].textContent,/1 Corbenaël$/);

// Le bouton du camp réutilise exactement le moteur AdvanceTime : salaires,
// soins, mouvements à la Taverne, sauvegarde et réaffichage. Aucune double horloge.
let advanced=0,saved=0,redrawn=0,interviewed=0;
const logged=[];
let screen="camp";
const advance = new Function("game","campaignRules","tavernLog","fmt","saveGame","renderGame","renderInterview","currentScreen",
  extract(tavernUI,"function advanceCampDay()","// Valeurs qu'une question")+
  "\nreturn advanceCampDay;"
)(
  fakeGame,()=>({advanceTime:(state,days)=>{
    assert.equal(days,1);
    advanced++;
    state.day+=days;
    return [{recovered:[{mercenary:{name:"Brakka"},kind:"wounded"}],
      salaries:{total:35,count:2},
      tavern:{departures:[],arrivals:[{mercenary:{name:"Erik"}}]}}];
  }}),
  (message)=>logged.push(message),String,
  ()=>saved++,()=>{redrawn++;render();},()=>interviewed++,()=>screen
);
advance();
assert.equal(fakeGame.campaign.day,33);
assert.equal(advanced,1);
assert.equal(saved,1);
assert.equal(redrawn,1);
assert.equal(interviewed,0);
assert.ok(logged.some(m=>m.includes("guéri")));
assert.ok(logged.some(m=>m.includes("Salaires versés : 35")));
assert.ok(logged.some(m=>m.includes("Nouveaux candidats : Erik")));
assert.equal(nodes["hud-day"].textContent,"Jour 33 · An 842");
// Jamais pendant une mission.
screen="mission";
advance();
assert.equal(fakeGame.campaign.day,33);
assert.equal(advanced,1);
console.log("Calendrier camp : mois, semaines, citations et horloge unique — OK");
