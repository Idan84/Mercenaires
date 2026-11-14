"use strict";

// Notification du jour (Idan, 2026-10-31 : « l'essentiel, et joliment ») : à chaque nouvelle journée, ce qui compte,
// de l'urgent au reste — escouade arrivée, contrat perdu, caisse vide ; retours et départs ; guérisons ;
// note du tavernier ; marchand ; travaux du camp ; l'argent en pied. Une ligne n'apparaît que si la chose a eu lieu ; un
// jour sans rien : « Rien à signaler aujourd'hui ». Phrases : data/reference/day-news.json. Construite à
// partir du rapport de la journée (game-core/campaign.js, advanceTime) ; le journal de la barre du bas garde le détail.
const DAY_ICONS={
  alert:'<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 16.8h.01" stroke-width="2.4"/>',
  swords:'<path d="M14.5 4.5h5v5L9 20l-3-3zM4 20l2.5-2.5M7 14l3 3"/><path d="M9.5 4.5h-5v5l3.2 3.2M14 17l3 3 2.5-2.5-3-3"/>',
  back:'<path d="M9 6 4 11l5 5"/><path d="M4 11h10a6 6 0 0 1 0 12h-1"/>',
  march:'<path d="M5 20 9 4M11 20l4-16"/><path d="M15 8h5M14 13h5"/>',
  heal:'<path d="M12 20.5s-7.6-4.4-9.2-9.3C1.7 7.7 3.8 4.5 7.1 4.5c2 0 3.7 1.1 4.9 2.8 1.2-1.7 2.9-2.8 4.9-2.8 3.3 0 5.4 3.2 4.3 6.7-1.6 4.9-9.2 9.3-9.2 9.3z"/>',
  tavern:'<path d="M5 8.5h10V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M15 11h2a2 2 0 0 1 2 2v2.5a2 2 0 0 1-2 2h-2M5 8.5C5 6.5 6.4 5 8 5c1-1.6 3.9-1.6 4.8 0 1.5 0 2.2 1.6 2.2 3.5"/>',
  merchant:'<path d="M4 9.5h16L18.5 21h-13z"/><path d="M8.5 9.5V7a3.5 3.5 0 0 1 7 0v2.5"/>',
  build:'<path d="M13 5.5 18.5 11l-3 3L10 8.5z"/><path d="M11.5 10 3.5 18l2.5 2.5 8-8"/>',
  gold:'<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-.8-1.6-1.2-2.8-1.2-1.7 0-2.8.9-2.8 2.1 0 2.8 5.7 1.5 5.7 4.1 0 1.2-1.2 2.1-2.9 2.1-1.3 0-2.4-.5-3-1.3M12 6.5v1.5M12 16.3v1.5"/>'
};
function dayIcon(kind){
  return `<svg class="day-news-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${DAY_ICONS[kind]||""}</svg>`;
}
// Une phrase de day-news.json, la même pour une journée donnée ; ses variantes s'ajoutent dans les données.
function dayPhrase(key,day){
  const lines=game.referenceData?.dayNews?.[key]||[];
  return typeof variantPhrase==="function"?variantPhrase(lines,key+"|"+day):lines[0]||"";
}
const dayFemale=m=>String(m?.sex||"").trim().toLowerCase().startsWith("f");
const dayPlural=(n,one,many)=>n>1?many:one;

// Les lignes du jour, de la plus importante à la moins importante : {tone, icon, text, detail, faces, go}.
function dayDigest(report){
  const c=game.campaign,entries=[];
  if(!c||!report) return entries;
  const member=id=>c.company.roster.find(m=>m.id===id)||null;
  const place=e=>e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu;
  const ex=report.expeditions||{};
  // L'urgent.
  for(const e of ex.arrived||[]) entries.push({tone:"alert",icon:"swords",text:"Escouade arrivée au "+place(e),detail:"Le combat vous attend",faces:e.memberIds.map(member)});
  // Désertion (Idan, 2026-11-04 ; desertion-ui.js) : celui qui a filé, celui que la Vigie a repéré.
  if(typeof desertionNews==="function") entries.push(...desertionNews(report.desertion));
  // La mutinerie (Idan, 2026-11-10 ; mutiny-ui.js) : des mutins attendent le capitaine.
  if(typeof mutinyNews==="function") entries.push(...mutinyNews(report.mutiny));
  // L'usurier (Idan, 2026-11-11 ; usurer-ui.js) : sa visite, l'échéance, ses voleurs.
  if(typeof usurerNews==="function") entries.push(...usurerNews(report.usurer));
  // Renégociation salariale (Idan, 2026-11-04 ; salary-review-ui.js) : il veut vous parler de son salaire.
  if(typeof salaryReviewNews==="function") entries.push(...salaryReviewNews(report.salaryReview));
  // Taverne à 5 missions : une offre prise ailleurs est aussitôt remplacée ; une seule ligne, pas d'alerte.
  const lost=(report.offersLost||[]).length;
  if(lost) entries.push({tone:"",icon:"alert",text:lost>1?lost+" offres prises ailleurs":"Une offre prise ailleurs",detail:"Remplacée"+(lost>1?"s":"")+" à la Taverne"});
  // Les dettes (Idan, 2026-11-10 ; debts-ui.js) : la caisse vide, une monture relâchée.
  if(typeof debtNews==="function") entries.push(...debtNews(report));
  // Retours et départs.
  for(const r of ex.returned||[]){
    const e=r.expedition;
    entries.push({tone:r.gold?"good":"",icon:"back",text:e.memberIds.length?"Retour du "+place(e):"Personne ne revient du "+place(e),
      detail:[r.gold?"+"+fmt(r.gold)+" PO":"",r.items?r.items+" "+dayPlural(r.items,"objet","objets")+" à l’Intendance":""].filter(Boolean).join(" · "),
      faces:e.memberIds.map(member)});
  }
  for(const e of ex.departed||[]){
    const bodyguard=e.kind==="bodyguard",days=bodyguard?e.offer.days:e.offer.distance;
    entries.push({icon:"march",text:bodyguard?"Départ en garde du corps : "+e.offer.client.toLocaleLowerCase("fr"):"Départ pour le "+place(e),
      detail:(bodyguard?"Retour dans ":"Arrivée dans ")+days+" "+dayPlural(days,"jour","jours"),faces:e.memberIds.map(member)});
  }
  // La compagnie.
  const healed=(report.recovered||[]).filter(r=>r.kind==="wounded").map(r=>r.mercenary);
  const rested=(report.recovered||[]).filter(r=>r.kind!=="wounded").map(r=>r.mercenary);
  if(healed.length) entries.push({tone:"good",icon:"heal",text:healed.length>1?"Guéris":dayFemale(healed[0])?"Guérie":"Guéri",faces:healed});
  if(rested.length) entries.push({icon:"heal",text:rested.length>1?"Reposés":dayFemale(rested[0])?"Reposée":"Reposé",faces:rested});
  // La Taverne (Idan, 2026-10-31) : une note du tavernier quand de nouvelles têtes arrivent ; les départs ne comptent pas.
  if((report.tavern?.arrivals||[]).length) entries.push({icon:"tavern",text:dayPhrase("taverne",c.day),go:"tavern"});
  // Le marchand.
  const merchant=report.merchant?.arrived;
  if(merchant) entries.push({icon:"merchant",text:(dayFemale(merchant)?"Marchande":"Marchand")+" au camp : "+merchant.name,detail:"Jusqu’à demain matin",go:"merchant"});
  // Les travaux du camp.
  const built=report.built;
  if(built) entries.push({tone:"good",icon:"build",text:built.kind==="lieutenant_quarter"?"Quartier du lieutenant n° "+fmt(built.number)+" prêt"
    :built.kind==="dormitory_quality"?"Dortoir niveau "+fmt(built.level)+" : "+built.name:"Dortoir agrandi : "+fmt(built.capacity)+" places"});
  for(const b of report.buildings||[]) entries.push({tone:"good",icon:"build",text:b.name+" niveau "+fmt(b.level)});
  return entries;
}

function renderDayFaces(faces){
  const shown=faces.filter(Boolean).slice(0,6),more=faces.filter(Boolean).length-shown.length;
  return shown.length?`<span class="day-news-faces">${shown.map(m=>`<span class="day-news-face" title="${esc(m.name)}">${renderAvatar(m,{variant:"compact",kind:"portrait"})}</span>`).join("")}${more>0?`<span class="day-news-more">+${more}</span>`:""}</span>`:"";
}
function renderDayEntry(e){
  return `<li class="day-news-entry${e.tone?" day-news-entry--"+e.tone:""}">
    <span class="day-news-icon">${dayIcon(e.icon)}</span>
    <span class="day-news-text"><b>${esc(e.text)}</b>${e.detail?`<small>${esc(e.detail)}</small>`:""}</span>
    ${e.faces?renderDayFaces(e.faces):""}
    ${e.go?`<button type="button" class="day-news-go" data-day-news-go="${esc(e.go)}">Voir</button>`:""}
  </li>`;
}

// Les nouvelles du jour, gardées (Idan, 2026-11-14 : le pigeon de la barre du bas les rouvre, même après un rechargement de
// la page) : les lignes, avec des visages juste ce qu'il faut pour leur portrait (un déserteur n'est plus dans la
// compagnie), et ce que la caisse a payé ce matin. Gardées avec la partie (save-ui.js), à côté du journal.
function dayNewsFace(m){ return m?{id:m.id,name:m.name,people:m.people,sex:m.sex,avatar:m.avatar}:null; }
function dayNewsOf(day,report){
  const entries=dayDigest(report).map(e=>e.faces?{...e,faces:e.faces.map(dayNewsFace).filter(Boolean)}:e);
  return {day,entries,salaries:report?.salaries?.paid??report?.salaries?.total??0,upkeep:report?.stable?.paid??report?.stable?.total??0};
}
// Le pigeon : celles du jour ; une partie d'avant (rien de gardé) : « Rien à signaler ».
function showTodayNews(){
  if(!game.campaign) return;
  const day=game.campaign.day;
  showDayNews(game.dayNews?.day===day?game.dayNews:dayNewsOf(day,null));
}

function showDayNews(news){
  const dialog=$("day-news-dialog");
  if(!dialog||!game.campaign||!news) return;
  const day=news.day,entries=news.entries||[];
  const date=game.referenceData?.campCalendar?campaignCalendarDate(day,game.referenceData):null;
  $("day-news-title").textContent=date?`${date.weekday} ${date.dayOfMonth} ${date.month}`:"Jour "+day;
  $("day-news-sub").textContent=date?`Jour ${day} · An ${date.year}`:"";
  // Un jour calme (Idan, 2026-10-31) : la fenêtre s'ouvre quand même, « Rien à signaler aujourd'hui ».
  $("day-news-list").innerHTML=entries.length?entries.map(renderDayEntry).join(""):`<li class="day-news-calm">${esc(dayPhrase("calme",day))}</li>`;
  // Ce que la caisse a payé ce matin ; ce qui reste dû est dans les dettes (debts-ui.js).
  const salaries=news.salaries||0,gold=Math.round(game.campaign.company.gold);
  const upkeep=news.upkeep||0;
  const debts=typeof debtTotal==="function"?debtTotal(game.campaign):0;
  $("day-news-money").innerHTML=`${dayIcon("gold")}<span>${salaries?`Salaires <b>−${fmt(salaries)} PO</b> · `:""}${upkeep?`Animaux <b>−${fmt(upkeep)} PO</b> · `:""}Caisse <b${gold<0?' class="is-negative"':""}>${fmt(gold)} PO</b>${debts?` · ${esc(debtCopy().money||"")} <b class="is-negative">${fmt(debts)} PO</b>`:""}</span>`;
  if(dialog.open) dialog.close();
  dialog.showModal();
}

function initializeDayNews(){
  document.addEventListener("click",event=>{
    const go=event.target.closest?.("[data-day-news-go]");
    if(go){
      $("day-news-dialog").close();
      if(typeof openCampScene==="function") openCampScene(go.dataset.dayNewsGo);
      return;
    }
    if(event.target.closest?.("#day-news-ok")) $("day-news-dialog").close();
  });
}

if(typeof document!=="undefined") initializeDayNews();
