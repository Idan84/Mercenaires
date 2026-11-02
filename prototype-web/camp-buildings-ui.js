"use strict";

// Constructions du camp (Idan, 2026-10-25). Ma Compagnie montre le dortoir (places, qualité, chantier) et un bouton pour
// y aller, puis les bâtiments de soins (Dispensaire, Bains chauds ; 2026-11-01) et l'École de magie avec ses salles ; l'écran Dortoir, sur le fond de son niveau de qualité (images de Jean-Mimi, dormitory-quality.json, image),
// propose de l'agrandir (+5 places), d'améliorer sa qualité (dix niveaux : Renommée et affinité) ou d'y construire un
// quartier du lieutenant (un par niveau pair de qualité). Les règles (prix, durée, un chantier à la fois au dortoir) sont
// dans game-core/campaign.js.
const DORMITORY_ART_DIR="assets/dormitory/";

function campDays(n){ return fmt(n)+" jour"+(n>1?"s":""); }

function campWorkText(work,day){
  const left=campDays(work.endDay-day);
  if(work.kind==="lieutenant_quarter") return `Chantier en cours : quartier du lieutenant n° ${fmt(work.number)}, prêt dans ${left}.`;
  return work.kind==="dormitory_quality"
    ?`Chantier en cours : ${esc(work.name)} (niveau ${fmt(work.level)}), prêt dans ${left}.`
    :`Chantier en cours : +${fmt(work.places)} places, prêtes dans ${left}.`;
}

function lieutenantQuartersLine(c){
  const n=campaignRules().lieutenantQuarters(c);
  return `Quartiers du lieutenant : ${n?fmt(n):"aucun"}`;
}

function dormitoryPlacesLine(c){
  const rules=campaignRules();
  return `${dormitoryPlacesText(rules.dormitoryUsed(c))} / ${fmt(c.company.camp.dormitoryCapacity)} places occupées`;
}

// Bâtiments de soins (Idan, 2026-11-01) : ce que fait le niveau atteint, en quelques mots (rien encore pour l'École de
// magie et ses salles).
function campBuildingEffectText(code,effects){
  if(code==="dispensary") return `blessures −${fmt(Math.round((1-effects.woundFactor)*100))} %`;
  if(code==="baths") return `fatigue −${campDays(effects.fatigueRelief)}, mana +${fmt(effects.manaBonus)} % par jour`;
  return "";
}
// Le chantier en cours, ou le bouton du prochain niveau avec son prix (grisé s'il manque de l'or ou, pour une salle de
// l'École de magie, si l'École n'a pas encore ce niveau).
function campBuildingAction(c,code,level){
  const rules=campaignRules(),work=rules.buildingWork(c,code),next=rules.nextBuildingLevel(c,code);
  if(work) return `<span class="building-work">Chantier en cours : niveau ${fmt(work.level)}, prêt dans ${campDays(work.endDay-c.day)}.</span>`;
  if(!next) return `<span class="building-work">Niveau maximal.</span>`;
  const short=c.company.gold<next.gold;
  const why=next.locked?` · ${esc(next.requires.name)} niveau ${fmt(next.level)} requise`:short?" · pas assez d’or":"";
  return `<div class="building-action"><button type="button" class="primary" data-camp-build="${esc(code)}"${short||next.locked?" disabled":""}>${level?"Améliorer : niveau "+fmt(next.level):"Construire"}</button>
      <span class="building-cost">${fmt(next.gold)} PO · ${campDays(next.days)}${why}</span></div>`;
}
// Entraînement libre (Idan, 2026-11-02) : les élèves du jour dans une salle (entrées de camp.schoolDay).
function schoolStudents(c,code){
  const day=campaignRules().schoolDayOf?campaignRules().schoolDayOf(c):null;
  return day?day.entries.filter(e=>e.code===code):[];
}
function schoolStudentsTitle(c,students){
  const name=id=>c.company.roster.find(m=>m.id===id)?.name||"?";
  return students.length?"Aujourd’hui : "+students.map(e=>`${name(e.id)} (+${fmt(e.xp)} XP)`).join(", "):"Personne aujourd’hui";
}
function campBuildingState(c,code,level){
  if(!level) return "À construire";
  const rules=campaignRules(),effect=campBuildingEffectText(code,rules.campBuildingEffects(c));
  const places=rules.buildingPlaces?rules.buildingPlaces(c,code):0;
  if(!places) return `Niveau ${fmt(level)}${effect?" · "+effect:""}`;
  // Places prises aujourd'hui / places ; qui s'entraîne, au survol.
  const students=schoolStudents(c,code);
  return `Niveau ${fmt(level)} · <span class="building-places" title="${esc(schoolStudentsTitle(c,students))}">${fmt(students.length)}/${fmt(places)} place${places>1?"s":""}</span>${effect?" · "+effect:""}`;
}
// Le capitaine (Idan, 2026-11-02 : « on choisit pour le cap et on est prioritaire ») : sa salle, chaque matin, avant les
// autres et sans test.
function captainTrainingChoice(c,code){
  const rules=campaignRules();
  if(code!=="magic_school"||!rules.schoolRooms||!rules.buildingLevel(c,code)) return "";
  const current=rules.captainTraining(c)||"";
  const options=[["","À la taverne"],...rules.schoolRooms(c).map(room=>[room.code,room.school?room.name:"Salle généraliste"])];
  return `<label class="building-captain" title="Chaque matin, avant les autres et sans test ; à partir de demain.">Le capitaine
      <select data-captain-training>${options.map(([value,label])=>`<option value="${esc(value)}"${value===current?" selected":""}>${esc(label)}</option>`).join("")}</select></label>`;
}
// École de magie (Idan, 2026-11-01) : une ligne par salle, une fois l'École construite.
function campRoomsList(c,code){
  const rules=campaignRules(),rooms=rules.campRoomCodes?rules.campRoomCodes(code):[];
  if(!rooms.length||!rules.buildingLevel(c,code)) return "";
  return `<div class="building-rooms">${rooms.map(room=>{
    const row=rules.campBuildingRow(room),level=rules.buildingLevel(c,room);
    return `<div class="building-room building-room--${esc(room)}">
        <div class="building-info"><strong title="${esc(row.description)}">${esc(row.nom)}</strong><span>${campBuildingState(c,room,level)}</span></div>
        ${campBuildingAction(c,room,level)}
      </div>`;
  }).join("")}</div>`;
}
// Ma Compagnie : un encart par bâtiment (à construire, puis ses niveaux ; un chantier par bâtiment), les salles de
// l'École de magie dans le sien.
function campBuildingCard(c,code){
  const rules=campaignRules(),row=rules.campBuildingRow(code);
  if(!row||row.requiert) return "";
  const level=rules.buildingLevel(c,code);
  return `<article class="building-card building-card--care building-card--${esc(code)}">
      <div class="building-info"><strong title="${esc(row.description)}">${esc(row.nom)}</strong><span>${campBuildingState(c,code,level)}</span></div>
      ${campBuildingAction(c,code,level)}
      ${campRoomsList(c,code)}
      ${captainTrainingChoice(c,code)}
    </article>`;
}

// Ma Compagnie : le dortoir et le bouton pour y aller, puis les autres bâtiments.
function renderCampBuildings(){
  const box=$("camp-buildings"),c=game.campaign;
  if(!box) return;
  if(!c){ box.innerHTML=""; return; }
  const rules=campaignRules(),work=c.company.camp.construction,quality=rules.dormitoryQuality(c);
  box.innerHTML=`<h3>Constructions</h3>
    <article class="building-card building-card--link">
      <div class="building-info"><strong>Dortoir</strong><span>${dormitoryPlacesLine(c)} · ${esc(quality.nom)}</span>${work?`<span class="building-work">${campWorkText(work,c.day)}</span>`:""}</div>
      <button type="button" class="primary" data-open-camp-scene="dormitory" data-destination="Dortoir">Aller au dortoir</button>
    </article>`+(rules.campBuildingCodes?rules.campBuildingCodes().map(code=>campBuildingCard(c,code)).join(""):"");
  renderDormitory();
}

// Écran Dortoir : le fond de son niveau de qualité, son état, et le choix d'agrandir, d'améliorer ou de construire un
// quartier du lieutenant.
function renderDormitory(){
  const box=$("dormitory-view"),c=game.campaign;
  if(!box||!c) return;
  const rules=campaignRules(),work=c.company.camp.construction,quality=rules.dormitoryQuality(c);
  if(quality.image&&typeof document!=="undefined"){
    document.body.style.setProperty("--dormitory-bg",`url("${new URL(DORMITORY_ART_DIR+quality.image,document.baseURI).href}")`);
  }
  let actions;
  if(work){
    actions=`<p class="building-work">${campWorkText(work,c.day)}</p>`;
  }else{
    const gold=c.company.gold,expand=rules.nextDormitoryExpansion(c),upgrade=rules.nextDormitoryQuality(c);
    const quarter=rules.nextLieutenantQuarter(c),locked=quarter&&quality.niveau<quarter.quality;
    const short=cost=>gold<cost?" · pas assez d’or":"";
    actions=`<div class="building-action"><button type="button" class="primary" data-dorm-expand${gold<expand.gold?" disabled":""}>Agrandir : +${fmt(expand.places)} places</button>
      <span class="building-cost">${fmt(expand.gold)} PO · ${campDays(expand.days)}${short(expand.gold)}</span></div>`
      +(upgrade
        ?`<div class="building-action"><button type="button" class="primary" data-dorm-quality${gold<upgrade.gold?" disabled":""}>Améliorer : ${esc(upgrade.name)}</button>
      <span class="building-cost">${fmt(upgrade.gold)} PO · ${campDays(upgrade.days)} · Renommée +${fmt(upgrade.renown)}, affinité +${fmt(upgrade.affinity)}${short(upgrade.gold)}</span></div>`
        :`<p class="building-work">Qualité maximale.</p>`)
      +(quarter
        ?`<div class="building-action"><button type="button" class="primary" data-dorm-quarter${locked||gold<quarter.gold?" disabled":""}>Construire : quartier du lieutenant n° ${fmt(quarter.number)}</button>
      <span class="building-cost">${fmt(quarter.gold)} PO · ${campDays(quarter.days)}${locked?` · dortoir de niveau ${fmt(quarter.quality)} requis`:short(quarter.gold)}</span></div>`
        :`<p class="building-work">Tous les quartiers du lieutenant sont construits.</p>`);
  }
  box.innerHTML=`<button type="button" class="secondary dormitory-back" data-open-camp-scene="company" data-destination="Ma Compagnie">← Ma Compagnie</button>
    <p class="eyebrow">Dortoir</p>
    <h2>${esc(quality.nom)}</h2>
    <p class="dormitory-meta">Niveau ${fmt(quality.niveau)} · ${dormitoryPlacesLine(c)} · ${lieutenantQuartersLine(c)}</p>
    <div class="building-actions">${actions}</div>`;
}

function startCampWork(result){
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCampBuildings(); return; }
  const w=result.construction;
  if(w.kind==="building"){
    tavernLog(`Construction lancée : ${w.name} (niveau ${fmt(w.level)}), ${fmt(w.gold)} PO, prêt dans ${campDays(w.days)}.`,"gear");
    saveGame();
    renderGame();
    return;
  }
  tavernLog(w.kind==="lieutenant_quarter"
    ?`Construction lancée : quartier du lieutenant n° ${fmt(w.number)}, ${fmt(w.gold)} PO, prêt dans ${campDays(w.days)}.`
    :w.kind==="dormitory_quality"
    ?`Amélioration du dortoir lancée : ${w.name} (niveau ${fmt(w.level)}), ${fmt(w.gold)} PO, prêt dans ${campDays(w.days)}.`
    :`Agrandissement du dortoir lancé : ${fmt(w.gold)} PO, +${fmt(w.places)} places dans ${campDays(w.days)}.`,"gear");
  saveGame();
  renderGame();
}
function expandDormitory(){ startCampWork(campaignRules().startDormitoryExpansion(game.campaign)); }
function improveDormitory(){ startCampWork(campaignRules().startDormitoryQuality(game.campaign)); }
function buildLieutenantQuarter(){ startCampWork(campaignRules().startLieutenantQuarter(game.campaign)); }
function buildCampBuilding(code){ startCampWork(campaignRules().startBuilding(game.campaign,code)); }
function chooseCaptainTraining(code){
  const result=campaignRules().setCaptainTraining(game.campaign,code||null);
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCampBuildings(); return; }
  const room=campaignRules().schoolRooms(game.campaign).find(r=>r.code===result.code);
  tavernLog(room?`Dès demain matin, le capitaine s’entraîne : ${room.school?room.name:"salle généraliste"}.`:"Dès demain, le capitaine passe ses journées à la taverne.","info");
  saveGame();
  renderGame();
}

// Journal du matin : l'entraînement libre du jour, en une ligne (Idan, 2026-11-02).
function logSchoolDay(report){
  const students=(report?.entries||[]).filter(e=>e.code);
  if(!students.length) return;
  tavernLog(`École de magie : ${fmt(students.length)} élève${students.length>1?"s":""} aujourd’hui.`,"turn");
}

// Journal du matin : les bâtiments (et les salles) qui montent d'un niveau.
function logCampBuildings(list){
  for(const b of list||[]){
    const effect=campBuildingEffectText(b.code,campaignRules().campBuildingEffects(game.campaign));
    tavernLog(`${b.name} : niveau ${fmt(b.level)} terminé${effect?" ("+effect+")":""}.`,"turn");
  }
}

// Journal du matin : le chantier terminé.
function logCampWork(built){
  if(!built) return;
  if(built.kind==="lieutenant_quarter"){
    tavernLog(`Le quartier du lieutenant n° ${fmt(built.number)} est prêt au dortoir.`,"turn");
  }else if(built.kind==="dormitory_quality"){
    tavernLog(`Le dortoir passe au niveau ${fmt(built.level)} : ${built.name}. Renommée +${fmt(built.renown)} ; affinité +${fmt(built.affinity)} pour ${fmt(built.members)} mercenaire${built.members>1?"s":""}.`,"turn");
  }else{
    tavernLog("Le dortoir est agrandi : +"+fmt(built.places)+" places, "+fmt(built.capacity)+" en tout.","turn");
  }
}

function initializeCampBuildingsUi(){
  document.addEventListener("click",event=>{
    if(event.target.closest("[data-dorm-expand]")) expandDormitory();
    else if(event.target.closest("[data-dorm-quality]")) improveDormitory();
    else if(event.target.closest("[data-dorm-quarter]")) buildLieutenantQuarter();
    else if(event.target.closest("[data-camp-build]")) buildCampBuilding(event.target.closest("[data-camp-build]").dataset.campBuild);
  });
  document.addEventListener("change",event=>{
    const select=event.target.closest?.("[data-captain-training]");
    if(select) chooseCaptainTraining(select.value);
  });
}
