"use strict";

// Carte d'objet au survol (Idan, 2026-10-24) : titre selon le tier, image dans son cadre, effets réels
// (game-core/item-card.js) mis en forme pour le joueur. La carte flotte près de la case survolée ou qui a le
// focus, sans sortir de l'écran ; elle vit dans la fenêtre ouverte (fiche) ou dans la page.
let itemCards=null;
function itemCardRules(){
  if(!itemCards&&game.referenceData) itemCards=MercenairesItemCard.createItemCards({reference:game.referenceData});
  return itemCards;
}

function cardNumber(value,decimals=0){
  const factor=10**decimals;
  return String(Math.round(value*factor)/factor).replace(".",",").replace("-","−");
}
function signed(value,decimals=0){
  return (value>0?"+":"")+cardNumber(value,decimals);
}

const ITEM_GRIPS={"1 main":"Une main","2 mains":"Deux mains","Au choix":"Une ou deux mains"};
const ARMOR_CLASSES={"Lourde":"Armure lourde","Intermédiaire":"Armure intermédiaire","Légère":"Armure légère","Vêtement":"Vêtement"};

function cardRow(label,value,tone=""){
  return `<div class="item-card-row${tone?" item-card-row--"+tone:""}"><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
}

// Effet de la qualité sur les dégâts : « +20 % » en vert, « −20 % » en rouge.
function qualityShift(factor){
  if(!factor||factor===1) return "";
  const percent=Math.round((factor-1)*100);
  return ` <em class="item-card-shift item-card-shift--${percent>0?"up":"down"}">${signed(percent)} %</em>`;
}

function weaponCardBody(card){
  const range=card.range.max<=1?"Contact":card.range.min===card.range.max?`${card.range.max} cases`:`${card.range.min} à ${card.range.max} cases`;
  const rows=[
    cardRow("Dégâts",`${esc(card.damage.dice||"—")}${qualityShift(card.damage.factor)}`),
    ...card.powers.map(p=>cardRow(p.type,cardNumber(p.value))),
    cardRow("Portée",range),
    cardRow("Prise",esc(ITEM_GRIPS[card.grip]||card.grip||"—")),
    card.weight>0?cardRow("Lourdeur",`${cardNumber(-card.weight)} Vitesse`,"malus"):"",
    card.charge?cardRow("Charge",`+${cardNumber(card.charge,1)} % dégâts / case`):"",
    card.block?cardRow("Blocage",`+${cardNumber(card.block,1)} %`,"bonus"):""
  ];
  const traits=[
    card.grip==="Au choix"?"À deux mains : dégâts ×1,5, lourdeur ÷2":"",
    card.counterCharge?"Contre-charge : frappe avant celui qui le charge":"",
    card.chainShots?"Tirs enchaînés tant qu’ils font mouche":"",
    card.reload?"Une action rapide pour recharger après chaque tir":"",
    card.area?"Attaque de zone":""
  ].filter(Boolean);
  return {rows,traits,flavor:card.examples};
}

function armorCardBody(card){
  const resist=card.resistances.map(r=>cardRow(r.type,signed(r.value),r.value<0?"malus":r.value>0?"bonus":""));
  const hindrance=[
    card.dodge>0?cardRow("Esquive",cardNumber(-card.dodge),"malus"):"",
    card.speed>0?cardRow("Vitesse",cardNumber(-card.speed),"malus"):"",
    card.magic>0?cardRow("Magie",cardNumber(-card.magic),"malus"):""
  ].filter(Boolean);
  const rows=[`<p class="item-card-group">Résistances</p>`,...resist,
    hindrance.length?`<p class="item-card-group">Handicap</p>`:"",...hindrance];
  return {rows,traits:[],flavor:card.description};
}

// La qualité en une phrase : ce qui monte, ce qui baisse.
function qualityLine(card){
  const up=Math.round((card.quality.good-1)*100),down=Math.round((card.quality.bad-1)*100);
  if(!up&&!down) return "";
  const effects=card.kind==="armor"?"résistances":"dégâts, charge et blocage";
  const hindrance=card.kind==="armor"?"handicap":"lourdeur";
  return `<p class="item-card-quality">${esc(card.quality.name||"")} : ${effects} ${signed(up)} %, ${hindrance} ${signed(down)} %.</p>`;
}

function renderItemCard(item){
  const card=itemCardRules()?.card(item);
  if(!card) return "";
  const art=typeof equipmentArt==="function"?equipmentArt(item):null;
  const body=card.kind==="armor"?armorCardBody(card):weaponCardBody(card);
  const subtitle=card.kind==="armor"?(ARMOR_CLASSES[card.category]||card.category||"Armure"):[card.name,card.category].filter(Boolean).join(" · ");
  return `<div class="item-card item-card--t${card.tier}">
    <div class="item-card-head">
      ${art?`<span class="gear-tile gear-tile--art gear-tile--t${card.tier} item-card-art"><img class="gear-art" src="${art}" alt=""></span>`:""}
      <div class="item-card-names">
        <strong class="item-card-title">${esc(card.title)}</strong>
        <span class="item-card-sub">${esc(card.kind==="armor"&&card.title!==card.name?card.name+" · "+subtitle:subtitle)}</span>
        <span class="item-card-tier">T${card.tier} · ${esc(card.quality.name||"")}</span>
      </div>
    </div>
    <dl class="item-card-stats">${body.rows.join("")}</dl>
    ${body.traits.length?`<ul class="item-card-traits">${body.traits.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}
    ${qualityLine(card)}
    ${body.flavor?`<p class="item-card-flavor">${esc(body.flavor)}</p>`:""}
  </div>`;
}

// Carte flottante : copie la carte de la case (modèle caché) et la place à côté, dans l'écran.
function itemCardFloat(){
  let float=document.getElementById("item-card-float");
  if(!float){
    float=document.createElement("div");
    float.id="item-card-float";
    float.setAttribute("role","tooltip");
  }
  const host=document.querySelector("dialog[open]")||document.body;
  if(float.parentElement!==host) host.appendChild(float);
  return float;
}

function showItemCard(tile){
  const template=tile.querySelector("template.item-card-template");
  if(!template) return;
  const float=itemCardFloat();
  float.innerHTML=template.innerHTML;
  float.classList.add("is-visible");
  const box=tile.getBoundingClientRect(),card=float.getBoundingClientRect(),gap=12,margin=8;
  let left=box.right+gap;
  if(left+card.width>innerWidth-margin) left=box.left-gap-card.width;
  left=Math.max(margin,Math.min(left,innerWidth-margin-card.width));
  const top=Math.max(margin,Math.min(box.top+box.height/2-card.height/2,innerHeight-margin-card.height));
  float.style.left=left+"px";
  float.style.top=top+"px";
}

function hideItemCard(){
  document.getElementById("item-card-float")?.classList.remove("is-visible");
}

function initializeItemCards(){
  const tileOf=event=>event.target?.closest?.(".gear-tile.is-filled");
  document.addEventListener("mouseover",event=>{ const tile=tileOf(event); if(tile) showItemCard(tile); });
  document.addEventListener("mouseout",event=>{
    const tile=tileOf(event);
    if(tile&&!tile.contains(event.relatedTarget)) hideItemCard();
  });
  document.addEventListener("focusin",event=>{ const tile=tileOf(event); if(tile) showItemCard(tile); else hideItemCard(); });
  document.addEventListener("focusout",event=>{ if(tileOf(event)) hideItemCard(); });
  document.addEventListener("scroll",hideItemCard,true);
  document.addEventListener("close",hideItemCard,true);
}

if(typeof document!=="undefined") initializeItemCards();
