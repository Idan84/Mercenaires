"use strict";

// Tableau des missions de la Taverne (doc 17, Idan 2026-10-24, refait le 2026-10-31) : 5 cases (Idan, 2026-11-01), chacune
// un contrat « Faire le ménage » ou une garde du corps tirés au hasard, en cartes au même gabarit ; une case prise reste vide
// jusqu'au lendemain. Les offres et leurs règles sont dans game-core/missions.js et
// game-core/bodyguard.js, le combat dans mission.js.
function missionRules(){
  return game.missionRules||(game.missionRules=MercenairesMissions.createMissionRules({reference:game.referenceData}));
}

// Les 5 cases du tableau (campaign.js) : remplies à l'ouverture si besoin.
function tavernBoardSlots(){
  const c=game.campaign;
  if(!c) return [];
  if(campaignRules().fillTavernBoard(c)) saveGame();
  return campaignRules().tavernSlots(c);
}
function boardOffer(id){ return game.campaign?campaignRules().boardOffer(game.campaign,{id}):null; }

// Date du calendrier du Royaume (camp-calendar.js) : « 4 Brumecendre », et l'an.
function contractDate(day){
  try{
    const d=campaignCalendarDate(day,game.referenceData);
    return {label:d.dayOfMonth+" "+d.month,year:d.year};
  }catch(error){
    return {label:"jour "+day,year:""};
  }
}

function contractOrder(offer){
  const created=contractDate(offer.day),expires=contractDate(offer.expiresDay);
  return missionRules().orderText(offer,{date:created.label,date_expiration:expires.label,an:created.year,récompense:fmt(offer.reward)});
}

// Garde du corps (Idan, 2026-10-25) : payée d'avance, sans combat.
function bodyguardTexts(){ return game.referenceData?.bodyguardMissions?.textes||{}; }
// Les étoiles d'un niveau (1 à 15), comme la réputation.
function levelStars(level,detail=""){
  const info=starRules().byLevel(Number(level)||1);
  return info?renderStarLevel(info,detail):"—";
}

// Tableau des missions (Idan, 2026-10-31) : une carte par mission qui résume (illustration, type, titre, description,
// difficulté en étoiles, récompense, durée), et au clic le détail, joliment présenté. Chaque mission passe par le même
// gabarit (missionCards) : ajouter un type de mission, c'est ajouter un gabarit. L'illustration vient des données
// (illustration : chemin d'une image) ; vide, un emblème la remplace en attendant l'image.
const MISSION_ICONS={
  contract:'<path d="M14.5 4.5h5v5L9 20l-3-3zM4 20l2.5-2.5M7 14l3 3"/><path d="M9.5 4.5h-5v5l3.2 3.2M14 17l3 3 2.5-2.5-3-3"/>',
  bodyguard:'<path d="M12 3 5 6v5c0 4.6 3 8.2 7 10 4-1.8 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  gold:'<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-.8-1.6-1.2-2.8-1.2-1.7 0-2.8.9-2.8 2.1 0 2.8 5.7 1.5 5.7 4.1 0 1.2-1.2 2.1-2.9 2.1-1.3 0-2.4-.5-3-1.3M12 6.5v1.5M12 16.3v1.5"/>',
  days:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  crew:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.6-.3 4.5 1.3 5 4.3"/>',
  enemies:'<path d="M12 3c4.4 0 7 3 7 6.8 0 2.4-1.2 3.9-2.6 4.8V18H7.6v-3.4C6.2 13.7 5 12.2 5 9.8 5 6 7.6 3 12 3z"/><path d="M9.3 11h.01M14.7 11h.01M10 18v3M14 18v3" stroke-width="2.2"/>',
  client:'<path d="M6 3.5h9l3 3V20.5H6z"/><path d="M15 3.5v3h3M9 11h6M9 14.5h6M9 18h4"/>',
  expires:'<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4 4 5 4 8.5s-4 4.5-4 8.5M16 3.5c0 4-4 5-4 8.5s4 4.5 4 8.5"/>',
  // Le sablier de la maquette du dortoir (Idan, 2026-11-14 : « On a pas un sablier qui irait bien ? ») : deux barres, le
  // verre, le sable en bas.
  hourglass:'<path d="M5.5 2.8h13M5.5 21.2h13" stroke-width="2.2"/><path d="M7.4 2.8c0 4.6 3.6 6.1 3.6 9.2s-3.6 4.6-3.6 9.2M16.6 2.8c0 4.6-3.6 6.1-3.6 9.2s3.6 4.6 3.6 9.2"/><path d="M8.6 20.4c.6-2.4 2-3.4 3.4-4.4 1.4 1 2.8 2 3.4 4.4z" fill="currentColor" stroke="none"/>'
};
function missionIcon(kind){
  return `<svg class="mission-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${MISSION_ICONS[kind]||""}</svg>`;
}
const missionDays=n=>n+" jour"+(n>1?"s":"");

// Les gabarits : une carte par case du tableau, toutes au même format ; une case vide attend le lendemain.
// Les gravures (Jean-Mi, 2026-11-14 : encre sur fond blanc) : celles du camp de ce peuple, sinon celles de la mission
// (les bêtes des chasses), sinon son illustration. Il peut y en avoir plusieurs (« c'est plutôt pas mal d'avoir des images
// différentes pour les mêmes missions ») : chaque offre en tire une d'après son identifiant, toujours la même (l'annonce et
// son détail montrent la même gravure).
function stablePick(pics,id){
  if(!pics?.length) return "";
  let h=0;
  for(const ch of String(id)) h=(Math.imul(h,31)+ch.charCodeAt(0))>>>0;
  return pics[h%pics.length];
}
function missionIllustration(def,offer){
  const camp=(def.camps||[]).find(c=>c.faction===offer.faction);
  const pics=camp?.illustrations||(camp?.illustration?[camp.illustration]:null)||def.illustrations;
  return stablePick(pics,offer.id)||def.illustration||"";
}
function contractCard(offer){
  const def=(game.referenceData?.oneShotMissions?.missions||[]).find(m=>m.code===offer.code)||{};
  const order=contractOrder(offer);
  // Une chasse (Idan, 2026-11-07) : la récompense seule, ni coffre ni butin.
  const loot=def.bete?"":" + butin";
  return {id:"contract:"+offer.id,kind:"contract",type:offer.name,title:offer.campName+" de "+offer.fields.lieu,name:offer.campName,place:offer.fields.lieu,
    illustration:missionIllustration(def,offer),description:def.description||"",
    difficulty:{level:offer.difficulty||1,label:"Difficulté"},
    reward:fmt(offer.reward)+" PO",gold:offer.reward,rewardNote:loot.trim(),duration:missionDays(offer.distance)+" de marche",
    facts:[["client","Commanditaire",order?.from||""],["days","Distance",missionDays(offer.distance)+" de marche, "+missionDays(2*offer.distance)+" aller-retour"],
      ["enemies","Ennemis",offer.faction+", "+offer.fields.estimation],["gold","Récompense",fmt(offer.reward)+" PO"+loot],
      ["expires","Expire le",contractDate(offer.expiresDay).label]],
    letter:order,action:{label:"Accepter le contrat",attr:`data-contract-accept="${esc(offer.id)}"`}};
}
function bodyguardCard(guard){
  const t=bodyguardTexts(),plural=guard.count>1;
  return {id:"bodyguard:"+guard.id,kind:"bodyguard",type:t.titre||"Garde du corps",title:guard.client,
    // La gravure du client (Jean-Mi, 2026-11-14), sinon l'illustration commune des gardes du corps.
    illustration:stablePick(game.referenceData?.bodyguardMissions?.illustrations_clients?.[guard.client],guard.id)||game.referenceData?.bodyguardMissions?.illustration||"",
    description:MercenairesRecruitDialogue.fill(t.offre||"",{client:guard.client,n:guard.count,s:plural?"s":"",jours:guard.days},false),
    difficulty:{level:guard.level,label:"Réputation minimale"},
    reward:fmt(guard.payment)+" PO",gold:guard.payment,rewardNote:"d’avance",duration:missionDays(guard.days),
    facts:[["crew","Mercenaires",String(guard.count)],["days","Durée",missionDays(guard.days)+", sans combat"],
      ["gold","Paiement d’avance",fmt(guard.payment)+" PO"],["expires","Expire le",contractDate(guard.expiresDay).label]],
    letter:null,action:{label:plural?"Choisir les gardes":"Choisir le garde",attr:`data-bodyguard-accept="${esc(guard.id)}"`}};
}
function missionCards(){
  return tavernBoardSlots().map((slot,i)=>!slot.offer?{id:"empty:"+i,kind:"empty"}
    :slot.offer.kind==="bodyguard"?bodyguardCard(slot.offer):contractCard(slot.offer));
}

function renderMissionArt(card,big=false){
  return `<div class="mission-art mission-art--${esc(card.kind)}${big?" mission-art--big":""}">${card.illustration
    ?`<img src="${esc(card.illustration)}" alt="" loading="lazy">`
    :`<span class="mission-emblem">${missionIcon(card.kind)}</span>`}</div>`;
}
// Trouver une mission (Idan, 2026-11-14) : sur le panneau de bois, les annonces sur notre parchemin ; l'illustration (vide pour
// l'instant), le titre, la difficulté, la récompense (le picto or de la barre du haut), la durée (le sablier) ; ni type, ni
// description, ni case vide (« Rien. Même pas de parchemin. On a le fond en bois »). Une mission qui part demain reste
// affichée, avec « Annuler » (« Parfait sur la fiche elle-même »).
const BOARD_PAGE_SIZE=3;
const boardState={page:0};
function boardNotices(){
  const scheduled=(game.campaign?.expeditions||[]).filter(e=>e.status==="scheduled")
    .map(e=>({...(e.kind==="bodyguard"?bodyguardCard(e.offer):contractCard(e.offer)),scheduled:e.id}));
  return [...scheduled,...missionCards().filter(c=>c.kind!=="empty")];
}
// Selon la charte de la création du capitaine (Idan, 2026-11-14 : « Ça manque de détails de matière, de mise en page. Peut-être
// un choix de police pour le titre ») : le lieu en Cinzel, « de … » en Garamond italique, un filet à la fleur de lys,
// l'illustration dans un double filet d'or. Une mission qui part demain porte le tampon « Départ demain ».
const goldAmount=n=>Math.round(Number(n)||0).toLocaleString("fr-FR");
// Chaque annonce a son allure, toujours la même pour la même offre (tirée de son identifiant, pas du hasard du jeu) :
// un peu de travers, son papier, une auréole de chope ou non (dans un coin du bas, loin du texte), et ce qui la tient au
// bois (un clou, deux punaises, de la cire).
function noticeLook(id){
  let h=2166136261;
  for(const ch of String(id)){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); }
  const r=()=>{ h^=h>>>13; h=Math.imul(h,0x5bd1e995); h^=h>>>15; return (h>>>0)/4294967296; };
  const tilt=(r()*2-1)*3.2,dy=(r()*2-1)*9,tone=.9+r()*.12,hue=(r()*2-1)*7;
  const stain=r()<.45,side=r()<.5,sx=side?14+r()*14:72+r()*14,sy=72+r()*16,pinRoll=r();
  const pin=pinRoll<.5?"clou":pinRoll<.8?"punaises":"cire";
  // La cire (Jean-Mi, 2026-11-14) : un cachet rouge, noir ou bleu.
  const wax=["rouge","noire","bleue"][Math.floor(r()*3)];
  // Les têtes de clou et de punaise (Jean-Mi, 2026-11-14) : trois de chaque, la seconde punaise prend la suivante.
  const head=1+Math.floor(r()*3);
  // La gravure en pleine page s'estompe vers les bords : un des quatre masques (estompe-1…4.webp).
  const fade=1+Math.floor(r()*4);
  // Idan, 2026-11-14 : un papier tirait trop vers le rouge. Le teint ne part plus vers le rouge ; ceux qui y seraient
  // allés le plus loin (un sur quatre environ) sont des papiers plus vieux : moins saturés, salis par endroits.
  const old=hue<-3,paperHue=old?1:hue<0?hue*.3:hue;
  const dirt=old?`;--sat:.72;--sale:1;--sale-x1:${(15+r()*70).toFixed(0)}%;--sale-y1:${(10+r()*80).toFixed(0)}%;--sale-x2:${(15+r()*70).toFixed(0)}%;--sale-y2:${(10+r()*80).toFixed(0)}%`:"";
  // Idan, 2026-11-14 : « trop le même gabarit, les mêmes défauts ». La feuille (une des huit feuilles vierges de Jean-Mi,
  // feuille-1…8), la taille, les plis, le froissé et les taches changent d'une annonce à l'autre. Les feuilles au coin
  // du haut arraché (1, 6, 7) ne prennent pas de punaises : l'une flotterait dans le vide.
  let paper=1+Math.floor(r()*8);
  if(pin==="punaises") paper={1:2,6:5,7:8}[paper]||paper;
  const w=.9+r()*.1,ht=.83+r()*.09;
  const pct=(a,b)=>(a+r()*(b-a)).toFixed(0)+"%",num=(a,b,d=0)=>(a+r()*(b-a)).toFixed(d);
  // les chiures de mouche restent dans les marges : au milieu, on les prendrait pour des fautes d'impression
  const margin=()=>r()<.5?pct(6,20):pct(80,94);
  const folds=`;--pli1:${pct(24,40)};--pli2:${pct(58,75)};--pli2-o:${r()<.7?1:0};--pli-a:${num(-1.6,1.6,1)}deg;--pliv:${pct(38,62)};--pliv-o:${r()<.35?1:0}`;
  const crumple=`;--froisse-x:${num(0,300)};--froisse-y:${num(0,300)};--froisse-s:${num(240,360)}`;
  const blotch=r()<.45,drip=r()<.3,damp=r()<.4,specks=r()<.35;
  const marks=(blotch?`;--tache-o:1;--tache-x:${pct(12,88)};--tache-y:${pct(14,88)};--tache-r:${num(12,30)}`:"")
    +(drip?`;--coul-o:1;--coul-x:${pct(10,90)}`:"")
    +(damp?`;--bord-o:1;--bord-a:${[0,90,180,270][Math.floor(r()*4)]}deg`:"")
    +(specks?";--points-o:1"+[1,2,3,4].map(k=>`;--p${k}x:${margin()};--p${k}y:${pct(10,92)}`).join(""):"");
  return {pin,wax,head,fade,paper,style:`--tilt:${tilt.toFixed(2)}deg;--dy:${dy.toFixed(1)};--tone:${tone.toFixed(3)};--hue:${paperHue.toFixed(1)}deg;--stain-o:${stain?1:0};--stain-x:${sx.toFixed(0)}%;--stain-y:${sy.toFixed(0)}%${dirt};--w:${w.toFixed(3)};--h:${ht.toFixed(3)}${folds}${crumple}${marks}`};
}
// Idan, 2026-11-14 : « réduis la police des longs titres » (sur les feuilles étroites, « Camp d'hommes-bêtes » passait
// sur trois lignes). Trois crans selon le nombre de lettres du titre.
function nameSize(name){
  const n=String(name||"").length;
  return n>24?" board-notice-name--xl":n>17?" board-notice-name--l":n>13?" board-notice-name--m":"";
}
function renderBoardNotice(card){
  const look=noticeLook(card.id);
  // Argent et Or (Idan, 2026-11-14) : le métal du niveau de la mission (6 à 10 : argent, 11 à 15 : or) se voit sur
  // l'annonce (titre à la feuille de métal, étoiles plus grandes, une dague plantée).
  const metal=starRules().byLevel(Number(card.difficulty?.level)||1)?.metalKey;
  const metalAttr=metal==="silver"||metal==="gold"?` data-metal="${metal}"`:"";
  const art=card.illustration?`<img src="${esc(card.illustration)}" alt="" loading="lazy">`:"";
  const open=card.scheduled?"":` data-mission-open="${esc(card.id)}" role="button" tabindex="0"`;
  // Argent et Or : une dague plantée tient l'annonce, à la place du clou, des punaises ou du cachet.
  const pin=metalAttr?"dague":look.pin;
  return `<article class="board-notice${card.scheduled?" board-notice--scheduled":""}"${open} aria-label="${esc(card.title)}" data-pin="${pin}"${pin==="cire"?` data-wax="${look.wax}"`:` data-head="${look.head}"`} style="${look.style}" data-paper="${look.paper}"${metalAttr}>
    <span class="board-notice-paper" aria-hidden="true"></span>
    <span class="board-notice-pins" aria-hidden="true"><i></i>${pin==="punaises"?"<i></i>":""}</span>
    <div class="board-notice-art"${art?` data-fade="${look.fade}"`:""}>${art}</div>
    <h3 class="board-notice-title"><span class="board-notice-name${nameSize(card.name||card.title)}">${esc(card.name||card.title)}</span>${card.place?`<span class="board-notice-place">de ${esc(card.place)}</span>`:""}</h3>
    <span class="board-notice-rule" aria-hidden="true"><i></i></span>
    <span class="board-notice-level" title="${esc(card.difficulty.label)}">${levelStars(card.difficulty.level,card.difficulty.label)}</span>
    <div class="board-notice-stats">
      <span title="Récompense"><img class="board-notice-gold" src="assets/hud/picto-or.webp" alt=""><b>${esc(goldAmount(card.gold))}</b></span>
      <span title="Durée">${missionIcon("hourglass")}${esc(card.duration)}</span>
    </div>
    ${card.scheduled?`<p class="board-notice-stamp">Départ demain</p>
    <p class="board-notice-departure"><button type="button" data-expedition-cancel="${esc(card.scheduled)}" title="Au jour J, on organise J+1 : on peut encore changer d’avis avant le départ.">Annuler le départ</button></p>`:""}
  </article>`;
}
function boardPageHtml(notices,page){
  return `<div class="board-page">${notices.slice(page*BOARD_PAGE_SIZE,(page+1)*BOARD_PAGE_SIZE).map(renderBoardNotice).join("")}</div>`;
}
// Les flèches : cachées s'il n'y a qu'une page, grisées au début et à la fin.
function updateBoardArrows(count){
  const pages=Math.max(1,Math.ceil(count/BOARD_PAGE_SIZE));
  for(const [dir,id] of [[-1,"prev"],[1,"next"]]){
    const arrow=document.querySelector?.(`.mission-board-arrow--${id}`);
    if(!arrow) continue;
    arrow.hidden=pages<2;
    arrow.disabled=dir<0?boardState.page<=0:boardState.page>=pages-1;
  }
}

function openMissionDetail(id){
  const card=missionCards().find(c=>c.id===id);
  const dialog=$("mission-detail");
  if(!card||!dialog) return;
  $("mission-detail-body").innerHTML=`${renderMissionArt(card,true)}
    <header class="mission-detail-head">
      <p class="mission-type">${esc(card.type)}</p>
      <h2 id="mission-detail-title">${esc(card.title)}</h2>
      <span class="mission-detail-level" title="${esc(card.difficulty.label)}"><small>${esc(card.difficulty.label)}</small>${levelStars(card.difficulty.level,card.difficulty.label)}</span>
    </header>
    <p class="mission-detail-description">${esc(card.description)}</p>
    <dl class="mission-facts">${card.facts.filter(([, ,value])=>value).map(([icon,label,value])=>`<div><dt>${missionIcon(icon)}${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
    ${card.letter?`<div class="contract-letter">${card.letter.paragraphs.map(p=>`<p>${esc(p)}</p>`).join("")}<p class="contract-signature">${esc(card.letter.signature)}</p></div>`:""}
    <footer class="mission-detail-actions"><button type="button" class="secondary" data-mission-close>Fermer</button><button type="button" class="primary" ${card.action.attr}>${esc(card.action.label)}</button></footer>`;
  if(!dialog.open) dialog.showModal();
}

function renderContractBoard(){
  const box=$("tavern-contracts");
  if(!box) return;
  const notices=boardNotices();
  boardState.page=Math.max(0,Math.min(boardState.page,Math.ceil(notices.length/BOARD_PAGE_SIZE)-1));
  box.innerHTML=notices.length?boardPageHtml(notices,boardState.page):"";
  updateBoardArrows(notices.length);
}
// Trois autres annonces : la nouvelle page pousse l'ancienne, par la droite ou par la gauche.
function turnBoardPage(dir){
  const box=$("tavern-contracts"),notices=boardNotices(),pages=Math.ceil(notices.length/BOARD_PAGE_SIZE);
  const next=boardState.page+dir;
  if(!box||next<0||next>=pages) return;
  boardState.page=next;
  const old=box.querySelector?.(".board-page");
  box.insertAdjacentHTML("beforeend",boardPageHtml(notices,next));
  updateBoardArrows(notices.length);
  const fresh=box.lastElementChild;
  if(!old||!fresh?.animate||window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){ old?.remove(); return; }
  const timing={duration:420,easing:"cubic-bezier(.45,0,.25,1)"};
  old.animate([{transform:"translateX(0)"},{transform:`translateX(${-dir*100}%)`}],timing).finished.then(()=>old.remove(),()=>old.remove());
  fresh.animate([{transform:`translateX(${dir*100}%)`},{transform:"translateX(0)"}],timing);
}
// Au clic, l'annonce s'avance un peu (« une sorte de zoom sur la fiche »), puis la fiche s'ouvre en grand.
function zoomMissionNotice(notice){
  const id=notice.dataset.missionOpen;
  if(!notice.animate||window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){ openMissionDetail(id); return; }
  notice.classList.add("is-zooming");
  notice.animate([{scale:"1"},{scale:"1.14"}],{duration:220,easing:"ease-out",fill:"forwards"}).finished
    .then(()=>{ openMissionDetail(id); notice.getAnimations().forEach(a=>a.cancel()); notice.classList.remove("is-zooming"); });
}

// Accepter une offre (contrat ou garde du corps) : le choix de l'escouade s'ouvre.
function acceptOffer(id){
  const offer=boardOffer(id);
  if(offer) openMissionSelection(offer);
}

// Au jour J, on organise J+1 (Idan, 2026-11-02) : une mission qui part demain matin peut encore être annulée ; le contrat
// retourne au tableau, la garde du corps n'a encore rien payé. On peut ensuite la reprendre avec une autre escouade.
function cancelScheduledExpedition(id){
  const result=campaignRules().cancelExpedition(game.campaign,id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  const e=result.expedition;
  tavernLog((e.kind==="bodyguard"?"Garde du corps annulée ("+e.offer.client.toLocaleLowerCase("fr")+")":"Départ annulé pour le "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu)
    +(result.returned?" : l’offre retourne au tableau.":"."),"info");
  saveGame();
  renderGame();
  renderContractBoard();
}

// Journal du jour et, si une escouade arrive, la fenêtre « Commencer le combat ». « Plus tard » laisse finir la journée
// au camp (équiper, recruter…), mais le jour suivant attend le combat (canAdvanceDay).
function logExpeditionReport(report){
  if(!report) return;
  // Missions programmées la veille : départ ce matin.
  const name=id=>game.campaign?.company.roster.find(m=>m.id===id)?.name||"?";
  for(const e of report.departed||[]){
    if(e.kind==="bodyguard") tavernLog(e.memberIds.map(name).join(", ")+" part"+(e.memberIds.length>1?"ent":"")+" en garde du corps ("+e.offer.client.toLocaleLowerCase("fr")+") : retour dans "+e.offer.days+" jours"+(e.paid?", +"+fmt(e.paid)+" PO d’acompte":"")+".","turn");
    else tavernLog("L’escouade part pour le "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+" : arrivée dans "+e.offer.distance+" jour"+(e.offer.distance>1?"s":"")+".","turn");
  }
  for(const e of report.arrived) tavernLog("L’escouade est arrivée au "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+" : le combat vous attend.","turn");
  for(const r of report.returned){
    const e=r.expedition;
    tavernLog(e.memberIds.length
      ?"L’escouade du "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+" est rentrée"+(r.gold?" : +"+fmt(r.gold)+" PO":"")+(r.items?", "+r.items+" objet"+(r.items>1?"s":"")+" à l’Intendance":"")+(r.bonusPaid?", primes versées "+fmt(r.bonusPaid)+" PO":"")+(r.bonusOwed?", "+fmt(r.bonusOwed)+" PO de primes restent dues":"")+"."
      :"Personne ne revient du "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+".",r.gold?"gear":"info");
    if(typeof logStableArrivals==="function") logStableArrivals(r.mounts);
  }
  if(report.waiting.length) game.pendingExpeditionDialog=report.waiting[0].id;
  for(const r of report.bodyguards||[]) queueBodyguardReturn(r);
}

// Retour de garde du corps (Idan, 2026-10-25) : une fenêtre par mission, une ligne par mercenaire.
function bodyguardReturnLine(r){
  const t=bodyguardTexts(),female=String(r.mercenary?.sex||"").trim().toLowerCase().startsWith("f");
  return MercenairesRecruitDialogue.fill(t[r.issue]||"",{prenom:MercenairesRecruitDialogue.firstName(r.mercenary)},female);
}
function queueBodyguardReturn(report){
  const female=m=>String(m?.sex||"").trim().toLowerCase().startsWith("f");
  const state=r=>(r.issue==="blesse"?"Blessé":"Fatigué")+(female(r.mercenary)?"e":"");
  const lines=report.results.map(r=>({id:r.mercenary.id,text:bodyguardReturnLine(r),
    detail:[r.days?`${state(r)} ${r.days} jour${r.days>1?"s":""}`:"",r.reputation?`réputation +${fmt(r.reputation)}`:"",r.bonus?`prime ${fmt(r.bonus)} PO${r.owed?` (${fmt(r.owed)} PO dues)`:""}`:""].filter(Boolean).join(" · ")}));
  for(const line of lines) tavernLog(line.text,"turn");
  if(report.renown) tavernLog("Garde du corps : renommée de la compagnie +"+fmt(report.renown)+".","gear");
  (game.bodyguardReturns||(game.bodyguardReturns=[])).push({client:report.expedition.offer.client,lines});
  // Plusieurs gardes du corps peuvent rentrer le même matin : ne pas écraser la fenêtre déjà ouverte (correctif de
  // Chatty, PR #310, repris pour le tableau à 5 missions).
  if(!$("bodyguard-return-dialog")?.open) showNextBodyguardReturn();
}
function showNextBodyguardReturn(){
  const dialog=$("bodyguard-return-dialog");
  if(!dialog) return;
  const next=game.bodyguardReturns?.shift();
  if(!next){ if(dialog.open) dialog.close(); return; }
  const member=id=>game.campaign?.company.roster.find(m=>m.id===id);
  $("bodyguard-return-title").textContent=bodyguardTexts().retour_titre||"Retour de garde du corps";
  $("bodyguard-return-client").textContent=next.client;
  $("bodyguard-return-list").innerHTML=next.lines.map(line=>`<div class="bodyguard-return-row">
    ${member(line.id)?renderAvatar(member(line.id),{variant:"compact",kind:"portrait"}):""}
    <p><span>${esc(line.text)}</span>${line.detail?`<small>${esc(line.detail)}</small>`:""}</p></div>`).join("");
  $("bodyguard-return-ok").textContent=bodyguardTexts().ok||"D’accord";
  if(!dialog.open) dialog.showModal();
}

function openExpeditionDialog(id){
  const e=(game.campaign?.expeditions||[]).find(x=>x.id===id&&x.status==="arrived");
  const dialog=$("expedition-dialog");
  if(!e||!dialog) return;
  const name=mid=>game.campaign.company.roster.find(m=>m.id===mid)?.name||"?";
  $("expedition-dialog-title").textContent=e.offer.campName+" de "+e.offer.fields.lieu;
  $("expedition-dialog-text").textContent="Après "+e.offer.distance+" jour"+(e.offer.distance>1?"s":"")+" de marche, l’escouade est sur place : "+e.memberIds.map(name).join(", ")+". Elle attend vos ordres ; le jour suivant attendra son combat.";
  $("expedition-dialog-fight").dataset.expeditionFight=e.id;
  $("expedition-dialog-scout").dataset.expeditionScout=e.id;
  $("expedition-dialog-scout").hidden=false;
  $("expedition-scout").hidden=true;
  $("expedition-scout-list").innerHTML="";
  if(!dialog.open) dialog.showModal();
}
// L'éclaireur (Idan, 2026-11-09 : « On peut, avant le combat envoyer un éclaireur choisi parmi les mercenaires de la mission »
// ; « On envoie après les jours de marche, pas depuis la taverne ») : un mercenaire de l'escouade (son animal le suit ; un
// animal ne part pas seul), avec sa Discrétion.
function openExpeditionScoutChoice(id){
  const e=(game.campaign?.expeditions||[]).find(x=>x.id===id&&x.status==="arrived");
  if(!e) return;
  const discretion=m=>Math.round(combatEngine().statWithGear({character:m,activeSet:1},"Discrétion"));
  // Les plus discrets d'abord.
  const members=e.memberIds.map(mid=>game.campaign.company.roster.find(m=>m.id===mid)).filter(Boolean)
    .sort((a,b)=>discretion(b)-discretion(a));
  const animal=m=>typeof missionMountOf==="function"?missionMountOf(m)?.item?.petName||"":"";
  $("expedition-scout-list").innerHTML=members.map(m=>`<button type="button" class="secondary" data-expedition-scout-go="${esc(e.id)}" data-scout-id="${esc(m.id)}">
    ${esc(m.name)} · Discrétion ${fmt(discretion(m))}${animal(m)?" · avec "+esc(animal(m)):""}</button>`).join("");
  $("expedition-scout").hidden=false;
  $("expedition-dialog-scout").hidden=true;
}

// Le cadre du panneau dans l'image (panneau-missions.webp, 2000 × 1116) : un clic en dehors (le mur) ramène à la taverne.
const MISSION_BOARD_FRAME={left:.128,right:.877,top:.072,bottom:.926};
function missionBoardOutside(board,event){
  const r=board.getBoundingClientRect?.();
  if(!r||!r.width) return false;
  const x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height,f=MISSION_BOARD_FRAME;
  return x<f.left||x>f.right||y<f.top||y>f.bottom;
}
function initializeExpeditionUi(){
  // Fenêtre fermée par Échap : les retours suivants s'affichent quand même.
  $("bodyguard-return-dialog")?.addEventListener("close",()=>{
    if(game.bodyguardReturns?.length) showNextBodyguardReturn();
  });
  document.addEventListener("click",event=>{
    const open=event.target.closest("[data-mission-open]");
    if(open){ if(open.classList?.contains("board-notice")) zoomMissionNotice(open); else openMissionDetail(open.dataset.missionOpen); return; }
    const turn=event.target.closest("[data-board-page]");
    if(turn){ turnBoardPage(Number(turn.dataset.boardPage)); return; }
    const board=event.target.closest("[data-mission-board]");
    if(board&&missionBoardOutside(board,event)){ showTavernView("home"); return; }
    if(event.target.closest("[data-mission-close]")){ $("mission-detail").close(); return; }
    // Accepter depuis le détail : la fenêtre se ferme, le choix de l'escouade s'ouvre.
    if(event.target.closest("[data-contract-accept],[data-bodyguard-accept]")&&$("mission-detail")?.open) $("mission-detail").close();
    // Le bouton est dans la fenêtre de détail (hors du tableau) : on l'écoute ici, pour le contrat comme pour la garde.
    const accept=event.target.closest("[data-contract-accept],[data-bodyguard-accept]");
    if(accept){ acceptOffer(accept.dataset.contractAccept||accept.dataset.bodyguardAccept); return; }
    if(event.target.closest("#bodyguard-return-ok")){ showNextBodyguardReturn(); return; }
    const fight=event.target.closest("[data-expedition-fight]");
    if(fight) startExpeditionCombat(fight.dataset.expeditionFight);
    const scout=event.target.closest("[data-expedition-scout]");
    if(scout) openExpeditionScoutChoice(scout.dataset.expeditionScout);
    const go=event.target.closest("[data-expedition-scout-go]");
    if(go) startExpeditionCombat(go.dataset.expeditionScoutGo,{scoutId:Number(go.dataset.scoutId)});
    const cancel=event.target.closest("[data-expedition-cancel]");
    if(cancel) cancelScheduledExpedition(cancel.dataset.expeditionCancel);
    if(event.target.closest("[data-expedition-later]")) $("expedition-dialog").close();
  });
  document.addEventListener("keydown",event=>{
    const card=event.target.closest?.("[data-mission-open]");
    if(!card||(event.key!=="Enter"&&event.key!==" ")) return;
    event.preventDefault();
    if(card.classList?.contains("board-notice")) zoomMissionNotice(card); else openMissionDetail(card.dataset.missionOpen);
  });
}
