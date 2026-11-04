"use strict";

// Directeur de l'École de magie, interface (Idan, 2026-11-01 : « même mécanisme pour la nomination que l'intendant ») :
// en haut de l'Intendance, à côté de l'intendant et du médecin. Sans directeur et avec une École construite : « Nommer
// un directeur de l'École » ouvre la liste des mercenaires (meilleure école de chacun) ; avec un directeur : son
// portrait, son nom, et « Le renvoyer sur le terrain ». Ses réponses passent par la boîte de dialogue des échanges, comme
// celles de l'intendant et du médecin.
// Les maîtres (Idan, 2026-11-03 : « Oui pour les maîtres ») : le Doctore, le Vétéran, le Maître des lames, à côté du
// directeur ; leur panneau n'apparaît qu'une fois leur bâtiment construit ; la liste montre la valeur de chacun dans ce
// que travaille la salle principale (Résistance physique, Boucliers, Dextérité : son nom en info-bulle).
// Règles : game-core/school-director.js, camp-posts.js ; textes : school-director-dialogue.json, camp-masters-dialogue.json.
const schoolDirectorRulesCache={};
function schoolDirectorRules(post="director"){
  if(!schoolDirectorRulesCache[post]&&game.referenceData) schoolDirectorRulesCache[post]=MercenairesSchoolDirector.createSchoolDirectorRules({reference:game.referenceData,
    dormitory:{free:state=>campaignRules().dormitoryFree(state),places:m=>campaignRules().dormitoryPlaces(m)},
    buildingLevel:(state,code)=>campaignRules().buildingLevel(state,code),post});
  return schoolDirectorRulesCache[post];
}
function schoolDirectorCopy(){ return game.referenceData?.schoolDirectorDialogue||{}; }
// Les textes d'un poste : ceux du directeur, ou ceux du maître par-dessus les textes communs des maîtres.
function campPostCopy(post="director"){
  if(post==="director") return schoolDirectorCopy();
  const all=game.referenceData?.campMastersDialogue||{},common=all.common||{},own=all.masters?.[post]||{};
  return {...own,panel:{...common.panel,...own.panel},offer:{...common.offer,...own.offer},recall:{...common.recall,...own.recall}};
}
function currentSchoolDirector(post="director"){ return game.campaign?schoolDirectorRules(post).directorOf(game.campaign):null; }
// Sa meilleure école de magie (valeur de base) : { name, value } ou null.
function directorBestSchool(m){
  const schools=Object.entries(m?.skills?.magic||{}).map(([name,value])=>({name,value:Number(value)||0})).filter(x=>x.value>0);
  return schools.sort((a,b)=>b.value-a.value)[0]||null;
}
function directorSchoolText(m){
  const best=directorBestSchool(m);
  return best?`${best.name} ${fmt(best.value)}`:"aucune école";
}
// Un maître : sa valeur dans ce que travaille la salle principale de son bâtiment ({ name, value }).
function masterSkill(post,m){
  const P=MercenairesSchoolDirector.POSTS.find(p=>p.key===post),building=P?.building;
  // Le Maître des plaisirs : son Charisme (la salle principale du Palais n'entraîne rien).
  const name=P?.skill||(building?campaignRules().campBuildingRow(building)?.entraine:null);
  if(!name) return {name:"",value:0};
  for(const group of [m?.stats,m?.resistances,m?.skills?.martial,m?.skills?.magic]) if(group&&name in group) return {name,value:Number(group[name])||0};
  return {name,value:0};
}
const postSkillValue=(post,m)=>post==="director"?directorBestSchool(m)?.value||0:masterSkill(post,m).value;
function postSkillText(post,m){
  if(post==="director") return directorSchoolText(m);
  const skill=masterSkill(post,m);
  return `${skill.name} ${fmt(skill.value)}`;
}
function directorFill(text,m,vars={}){
  const female=String(m?.sex||"").trim().toLowerCase().startsWith("f");
  return MercenairesRecruitDialogue.fill(text,{prenom:MercenairesRecruitDialogue.firstName(m),...vars},female);
}
// Son titre court (effectif, fiche) : Directeur, Doctore, Vétéran, Maître des lames.
function campPostLabel(post,m){
  if(post==="director") return String(m?.sex||"").toLowerCase().startsWith("f")?"Directrice":"Directeur";
  return directorFill(campPostCopy(post).label||"",m);
}
const CAMP_POST_PANELS={director:"director-panel",doctore:"doctore-panel",veteran:"veteran-panel",bladeMaster:"blade-master-panel",
  alchemist:"alchemist-panel",pleasureMaster:"pleasure-master-panel"};

function renderSchoolDirectorPanel(post="director"){
  const panel=$(CAMP_POST_PANELS[post]);
  if(!panel||!game.campaign) return;
  const all=campPostCopy(post),copy=all.panel||{},director=currentSchoolDirector(post),c=game.campaign,rules=campaignRules();
  const postAttr=post==="director"?"":` data-post="${esc(post)}"`;
  if(director){
    const days=schoolDirectorRules(post).daysAsDirector(c);
    const skill=post==="director"?directorFill(copy.school,director,{ecole:directorSchoolText(director)}):postSkillText(post,director);
    const detail=[skill,directorFill(days?copy.since:copy.since_today,director,{jours:stewardDays(days)})].join(" · ");
    const title=post==="director"?copy.director_title:copy.title;
    panel.innerHTML=`<div class="steward-card director-card" title="${esc(detail)}">
      <button type="button" class="steward-face" data-character-id="${esc(director.id)}" aria-label="Voir la fiche de ${esc(director.name)}">${renderAvatar(director,{variant:"compact",kind:"portrait"})}</button>
      <div class="steward-info"><small>${esc(directorFill(title,director))}</small><strong>${esc(director.name)}</strong></div>
      <button type="button" class="talk-offer-btn"${postAttr} data-director-recall>${esc(copy.recall||"")}</button>
    </div>`;
    return;
  }
  const building=schoolDirectorRules(post).post.building;
  if(!(rules.buildingLevel(c,building)>0)){
    // Les maîtres n'apparaissent qu'une fois leur bâtiment construit.
    panel.innerHTML=post==="director"?`<p class="medic-locked" title="${esc(copy.no_school||"")}">${esc(copy.appoint||"")}</p>`:"";
    return;
  }
  const company=c.company,lieutenants=company.lieutenantIds||[];
  const picks=company.roster.filter(m=>m.id!==company.captainId&&m.id!==company.intendantId&&m.id!==company.medicId
      &&!lieutenants.includes(m.id)&&!MercenairesCampPosts.postOf(c,m)&&!rules.expeditionOf(c,m.id))
    .sort((a,b)=>postSkillValue(post,b)-postSkillValue(post,a)).map(m=>{
      const asked=m[post+"OfferDay"]===c.day,school=postSkillText(post,m),arriving=Number(m.contract?.joinDay)>c.day;
      return `<button type="button" class="steward-pick"${postAttr} data-director-offer="${esc(m.id)}"${asked||arriving?` disabled title="${esc(arriving?"Il rejoint la compagnie demain matin.":copy.asked_today||"")}"`:` title="${esc(school)}"`}>
        ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b><small>${esc(post==="director"?school:fmt(postSkillValue(post,m)))}</small></button>`;
    }).join("");
  panel.innerHTML=picks?`<details class="steward-offer"><summary class="talk-offer-btn" title="${esc(copy.appoint_tip||"")}">${esc(copy.appoint||"")}</summary><div class="steward-picks">${picks}</div></details>`:"";
}
// Les panneaux des trois maîtres.
function renderCampMasterPanels(){
  for(const post of ["doctore","veteran","bladeMaster","alchemist","pleasureMaster"]) renderSchoolDirectorPanel(post);
}

// Réponse à une proposition (poste ou retour sur le terrain), dans la boîte de dialogue des échanges.
function openSchoolDirectorAnswer(m,kind,result,post="director"){
  const all=campPostCopy(post),copy=all[kind]||{};
  const lines=copy[result.accepted?"accepted":result.mood]||copy.neutral||[];
  const reply=variantPhrase(lines,`${m.id}|${game.campaign.day}|${post}-${kind}`);
  const first=MercenairesRecruitDialogue.firstName(m);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent=post==="director"?"École de magie":all.origin||"";
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(copy.proposal||"")} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(first)}</b><span>« ${esc(directorFill(reply,m))} »</span></p>
    <p class="talk-note">${esc(directorFill(result.accepted?copy.outcome_accepted:copy.outcome_refused,m))}</p>`;
  $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}

function offerSchoolDirectorPost(id,post="director"){
  const m=game.campaign?.company.roster.find(x=>String(x.id)===String(id));
  if(!m) return;
  const result=schoolDirectorRules(post).offer(game.campaign,m.id);
  if(!result.ok) return;
  saveGame();
  renderGame();
  openSchoolDirectorAnswer(m,"offer",result,post);
}
function recallSchoolDirector(post="director"){
  const m=currentSchoolDirector(post);
  if(!m) return;
  const result=schoolDirectorRules(post).recall(game.campaign);
  if(!result.ok){ if(typeof tavernLog==="function") tavernLog(result.dormFull?campPostCopy(post).recall?.dorm_full||result.reason:result.reason,"info"); return; }
  saveGame();
  renderGame();
  openSchoolDirectorAnswer(m,"recall",result,post);
}

function initializeSchoolDirector(){
  document.addEventListener("click",event=>{
    const offer=event.target.closest?.("[data-director-offer]");
    if(offer){ offerSchoolDirectorPost(offer.dataset.directorOffer,offer.dataset.post||"director"); return; }
    const recall=event.target.closest?.("[data-director-recall]");
    if(recall) recallSchoolDirector(recall.dataset.post||"director");
  });
}

if(typeof document!=="undefined") initializeSchoolDirector();
