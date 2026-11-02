"use strict";

// Apprentissage d'un sort à l'École de magie, interface (Idan, 2026-11-02). « Apprendre à… » (Intendance, onglet
// Manuels) propose le sort à un membre de la compagnie ; sa réponse passe par la boîte de dialogue des échanges. Dans
// l'encart de l'École (Ma Compagnie) : chaque élève, son sort, ses jours, son professeur (« Ajouter un professeur »,
// « Libérer ») et « Le faire sortir ». Le journal du matin dit qui connaît désormais son sort.
// Règles : game-core/spell-study.js ; textes : data/reference/spell-study-dialogue.json.
function spellStudyRules(){ return campaignRules().spellStudy; }
function spellStudyCopy(){ return game.referenceData?.spellStudyDialogue||{}; }
function studyFemale(m){ return String(m?.sex||"").trim().toLowerCase().startsWith("f"); }
function studyFill(text,m,vars={}){
  return MercenairesRecruitDialogue.fill(text,{prenom:MercenairesRecruitDialogue.firstName(m),...vars},studyFemale(m));
}
function studyMember(id){ return game.campaign?.company.roster.find(m=>String(m.id)===String(id))||null; }

// Intendance : « Apprendre à… » sur un manuel ; le capitaine apprend sans test.
function studyLearnMenu(item){
  const company=game.campaign.company,rules=spellStudyRules(),spell=manualRules().spellOf(item);
  const members=[...company.roster].sort((a,b)=>(b.id===company.captainId)-(a.id===company.captainId));
  const rows=members.map(m=>{
    const captain=m.id===company.captainId;
    const head=`<div class="deal-member"><b>${esc(m.name)}${captain?" · capitaine":""}</b>`;
    // Perfectionner (Idan, 2026-11-02) : il connaît déjà le sort ; une journée à l'École, sans test.
    if((m.spells||[]).some(s=>s.code===spell?.code)){
      const perfect=rules.canPerfect(game.campaign,m,item);
      return head+(perfect.ok
        ?`<button type="button" class="deal-slot" data-study-perfect="${esc(m.id)}" data-study-item="${esc(item.id)}">Perfectionner<small>+${fmt(rules.perfectXp(game.campaign,m,perfect.room.code))} XP · une journée</small></button>`
        :`<small class="deal-menu-note">${esc(perfect.reason)}</small>`)+`</div>`;
    }
    const check=rules.canStudy(game.campaign,m,item);
    return head+(check.ok
      ?`<button type="button" class="deal-slot" data-study-offer="${esc(m.id)}" data-study-item="${esc(item.id)}">${captain?"Apprendre":"Lui proposer"}<small>${esc(check.room.name)}</small></button>`
      :`<small class="deal-menu-note">${esc(check.reason)}</small>`)+`</div>`;
  }).join("");
  return `<p class="deal-menu-title">Apprendre à…</p><p class="deal-menu-current">${esc(spell?.nom||item.name)} · ${esc(spell?.ecole||"")}</p>${rows}`;
}

// La réponse, dans la boîte de dialogue des échanges.
function openStudyAnswer(m,kind,result,vars){
  const copy=spellStudyCopy()[kind]||{};
  const lines=copy[result.accepted?"accepted":"refused"]||[];
  const reply=variantPhrase(lines,`${m.id}|${game.campaign.day}|study-${kind}`);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent="École de magie";
  const you=studyFill(copy.proposal,m,vars);
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(you)} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(m))}</b><span>« ${esc(studyFill(reply,m,vars))} »</span></p>
    <p class="talk-note">${esc(studyFill(result.accepted?copy.outcome_accepted:copy.outcome_refused,m,vars))}</p>`;
  $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}

function offerSpellStudy(memberId,itemId){
  if(typeof closeDealMenu==="function") closeDealMenu();
  const m=studyMember(memberId);
  if(!m) return;
  const result=spellStudyRules().offer(game.campaign,m.id,itemId);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  saveGame();
  renderGame();
  if(m.id===game.campaign.company.captainId){
    tavernLog(`Le capitaine entrera demain matin à la ${result.room.name} pour apprendre ${result.spell.nom}.`,"gear");
    return;
  }
  openStudyAnswer(m,"offer",result,{sort:result.spell.nom,salle:result.room.name});
}
function perfectSpell(memberId,itemId){
  if(typeof closeDealMenu==="function") closeDealMenu();
  const m=studyMember(memberId);
  if(!m) return;
  const result=spellStudyRules().perfect(game.campaign,m.id,itemId);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(`${m.name} passera demain la journée à la ${result.room.name} pour perfectionner ${result.spell.nom} (+${fmt(result.xp)} XP le surlendemain matin).`,"gear");
  saveGame();
  renderGame();
}
function offerStudyTeacher(studyId,teacherId){
  const t=studyMember(teacherId);
  if(!t) return;
  const result=spellStudyRules().offerTeacher(game.campaign,studyId,t.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  saveGame();
  renderGame();
  const vars={sort:result.study.spellName,eleve:MercenairesRecruitDialogue.firstName(result.student)};
  if(t.id===game.campaign.company.captainId){
    tavernLog(`Dès demain matin, le capitaine enseigne ${vars.sort} à ${result.student.name}.`,"gear");
    return;
  }
  openStudyAnswer(t,"teacher",result,vars);
}
function releaseStudyTeacher(studyId){
  const result=spellStudyRules().releaseTeacher(game.campaign,studyId);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(`${result.mercenary?.name||"Le professeur"} n’enseigne plus ${result.study.spellName}.`,"info");
  saveGame();
  renderGame();
}
function stopSpellStudy(studyId){
  const study=spellStudyRules().studyById(game.campaign,studyId);
  const m=study?studyMember(study.studentId):null;
  if(!study||!m) return;
  // Pas encore entré (au jour J, on organise J+1) : on change d'avis, le manuel revient.
  const planned=spellStudyRules().isPlanned(study);
  if(!planned&&typeof confirm==="function"&&!confirm(`Faire sortir ${m.name} de l’École ? Le manuel de ${study.spellName} est perdu et rien n’est acquis.`)) return;
  const result=spellStudyRules().stop(game.campaign,studyId);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(planned?`${m.name} n’entrera pas à l’École : le manuel de ${study.spellName} revient à l’Intendance.`
    :`${m.name} sort de l’École sans avoir appris ${study.spellName}.`,planned?"info":"bad");
  saveGame();
  renderGame();
}

// Encart de l'École : les élèves en cours d'apprentissage.
function studyListHtml(c){
  const rules=c&&typeof campaignRules==="function"?campaignRules().spellStudy:null;
  const studies=rules?rules.studiesOf(c):[];
  if(!studies.length) return "";
  const rows=studies.map(study=>{
    const m=c.company.roster.find(x=>x.id===study.studentId);
    if(!m) return "";
    const room=campaignRules().campBuildingRow(study.room);
    // Au jour J, on organise J+1 : inscrit pour demain, on peut encore annuler (le manuel revient).
    const planned=rules.isPlanned(study);
    const cancel=`<button type="button" class="secondary" data-study-stop="${esc(study.id)}" title="Il n’est pas encore entré : le manuel revient à l’Intendance.">Annuler</button>`;
    // Perfectionner : une journée, l'XP le matin suivant ; ni professeur ni sortie.
    if(study.kind==="perfect") return `<div class="study-row">
        <div class="building-info"><strong>${esc(m.name)}</strong><span>${esc(study.spellName)} · ${esc(room?.nom||"")} · ${planned?"perfectionne, entre demain matin":`perfectionne (+${fmt(rules.perfectXp(c,m,study.room))} XP demain)`}</span></div>
        ${planned?`<div class="study-actions">${cancel}</div>`:""}
      </div>`;
    const chance=Math.round(rules.dailyChance(c,study).chance);
    const teacher=study.teacherId==null?null:c.company.roster.find(x=>x.id===study.teacherId);
    let teach;
    if(teacher){
      teach=`<span class="study-teacher">Professeur : ${esc(teacher.name)}${study.teacherStarted===false?" (dès demain)":""}</span><button type="button" class="secondary" data-study-release="${esc(study.id)}">Libérer</button>`;
    }else{
      // Ceux qui connaissent le sort et sont au camp ; déjà sollicités aujourd'hui : grisés.
      const picks=c.company.roster.filter(t=>{ const check=rules.canTeach(c,study,t); return check.ok||check.reason==="Vous lui en avez déjà parlé aujourd’hui."; });
      const options=picks.map(t=>{
        const asked=t.id!==c.company.captainId&&t.teachOfferDay===c.day;
        const transmission=Math.round(Number(t.skills?.camp?.["Transmission du savoir"])||0);
        return `<button type="button" class="steward-pick" data-study-teacher="${esc(study.id)}" data-teacher-id="${esc(t.id)}"${asked?" disabled title=\"déjà sollicité aujourd’hui\"":""}><b>${esc(t.name)}</b><small>Transmission ${fmt(transmission)}</small></button>`;
      }).join("");
      teach=options?`<details class="study-teacher-offer"><summary class="talk-offer-btn" title="Il doit connaître le sort ; il peut refuser. Il reste à l’École jusqu’à la fin.">Ajouter un professeur</summary><div class="steward-picks">${options}</div></details>`
        :`<span class="study-teacher study-teacher--none">Personne ne connaît ce sort</span>`;
    }
    return `<div class="study-row">
        <div class="building-info"><strong>${esc(m.name)}</strong>${planned
          ?`<span>${esc(study.spellName)} · ${esc(room?.nom||"")} · entre demain matin</span>`
          :`<span title="Chance de le savoir demain matin : ${fmt(chance)} %">${esc(study.spellName)} · ${esc(room?.nom||"")} · jour ${fmt(study.days+1)}</span>`}</div>
        <div class="study-actions">${teach}${planned?cancel:`<button type="button" class="secondary" data-study-stop="${esc(study.id)}" title="Le manuel est perdu et rien n’est acquis.">Le faire sortir</button>`}</div>
      </div>`;
  }).join("");
  return `<div class="study-list"><h4>Apprentissages</h4>${rows}</div>`;
}

// Journal du matin : les sorts appris.
function logSpellStudy(report){
  for(const go of report?.started||[]){
    const room=campaignRules().campBuildingRow(go.study.room)?.nom||"l’École";
    tavernLog(`${go.mercenary.name} entre à la ${room} pour ${go.study.kind==="perfect"?"perfectionner":"apprendre"} ${go.study.spellName}.`,"turn");
  }
  for(const done of report?.perfected||[]){
    tavernLog(`${done.mercenary.name} perfectionne ${done.study.spellName} : niveau ${fmt(Math.floor(done.before))} → ${fmt(Math.floor(done.after))} (+${fmt(done.xp)} XP).`,"turn");
  }
  for(const done of report?.learned||[]){
    const teacher=done.teacher?`, avec ${done.teacher.name}`:"";
    tavernLog(`${done.mercenary.name} connaît désormais ${done.study.spellName} (niveau ${fmt(done.level)}), après ${fmt(done.days)} jour${done.days>1?"s":""}${teacher}.`,"turn");
  }
}

function initializeSpellStudy(){
  document.addEventListener("click",event=>{
    const perfect=event.target.closest?.("[data-study-perfect]");
    if(perfect){ perfectSpell(perfect.dataset.studyPerfect,perfect.dataset.studyItem); return; }
    const offer=event.target.closest?.("[data-study-offer]");
    if(offer){ offerSpellStudy(offer.dataset.studyOffer,offer.dataset.studyItem); return; }
    const teacher=event.target.closest?.("[data-study-teacher]");
    if(teacher){ offerStudyTeacher(teacher.dataset.studyTeacher,teacher.dataset.teacherId); return; }
    const release=event.target.closest?.("[data-study-release]");
    if(release){ releaseStudyTeacher(release.dataset.studyRelease); return; }
    const stop=event.target.closest?.("[data-study-stop]");
    if(stop) stopSpellStudy(stop.dataset.studyStop);
  });
}

if(typeof document!=="undefined") initializeSpellStudy();
