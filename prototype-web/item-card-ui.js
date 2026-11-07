"use strict";

// Carte d'objet au survol (Idan, 2026-10-24) : titre selon le tier, image dans son cadre, effets réels
// (game-core/item-card.js) mis en forme pour le joueur. La carte flotte près de la case survolée ou qui a le
// focus, sans sortir de l'écran ; elle vit dans la fenêtre ouverte (fiche) ou dans la page.
let itemCards=null;
function itemCardRules(){
  if(!itemCards&&game.referenceData) itemCards=MercenairesItemCard.createItemCards({reference:game.referenceData});
  return itemCards;
}

// Nom public d'un objet (Idan, 2026-10-30 : « T1, T2, T3… ça ne doit apparaître nulle part ») : son titre selon le
// tier (item-titles.json). Le tier se lit au cadre de couleur. Les potions gardent leur nom.
function itemPublicName(item){
  if(!item) return "";
  if(item.itemType==="potion") return item.name;
  // Une monture : son nom (stables.js, giveName).
  if(item.itemType==="mount") return item.petName||item.name;
  return itemCardRules()?.title(item)||item.name;
}
// Nom de base, en petit sous le nom public quand il en diffère (« Épée longue » sous « Lame ébréchée »).
function itemBaseName(item){
  if(!item) return "";
  if(item.itemType==="potion") return "Usage unique";
  return itemPublicName(item)!==item.name?item.name:"";
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

// Dégâts d'une arme en PV, qualité comprise, avant la Force du porteur et l'armure de la cible (Idan, 2026-10-30 :
// pas de dés ni de recette de calcul, ce que l'arme fait) : 10 × le dé, du plus petit au plus grand jet.
function damageRange(dice,factor=1){
  const m=String(dice||"").match(/^(\d*)D(\d+)$/i);
  if(!m) return "—";
  const count=Number(m[1]||1),sides=Number(m[2]);
  return `${Math.ceil(10*count*factor)} à ${Math.ceil(10*count*sides*factor)} PV`;
}
const RANGED_CATEGORIES=new Set(["Armes de tir","Armes à feu"]);

function weaponCardBody(card){
  const range=card.range.max<=1?"Contact":card.range.min===card.range.max?`${card.range.max} cases`:`${card.range.min} à ${card.range.max} cases`;
  const ranged=RANGED_CATEGORIES.has(card.category);
  const rows=[
    cardRow("Dégâts",damageRange(card.damage.dice,card.damage.factor)),
    card.powers.length?`<p class="item-card-group">Pénétration d’armure</p>`:"",
    ...card.powers.map(p=>cardRow(p.type,cardNumber(p.value))),
    `<p class="item-card-group">Maniement</p>`,
    cardRow("Portée",range),
    cardRow("Prise",esc(ITEM_GRIPS[card.grip]||card.grip||"—")),
    card.weight>0?cardRow("Poids",`${cardNumber(-card.weight)} Vitesse`,"malus"):"",
    // La charge est un assaut au corps à corps : rien à dire pour un arc ou une arquebuse.
    card.charge&&!ranged?cardRow("Charge",`+${cardNumber(card.charge,1)} % de dégâts par case d’élan`):"",
    card.block?cardRow("Blocage",`+${cardNumber(card.block,1)} %`,"bonus"):"",
    card.stat?cardRow(card.stat.name,`+${cardNumber(card.stat.percent)} %`,"bonus"):"",
    card.parry?cardRow("Parade",`${cardNumber(card.parry.chance)} % (coups ${card.parry.type}s)`,"bonus"):"",
    card.aura?cardRow(`${card.aura.name} des alliés`,`+${cardNumber(card.aura.percent)} % à ${cardNumber(card.aura.range)} cases`,"bonus"):"",
    card.blockCut?cardRow("Bouclier adverse",`blocage −${cardNumber(card.blockCut)} %`,"bonus"):"",
    card.attackBonus?cardRow(`${card.attackBonus.stat} en attaque`,`+${cardNumber(card.attackBonus.percent)} % ${esc(card.attackBonus.source)}`,"bonus"):""
  ];
  const traits=[
    card.grip==="Au choix"?"À deux mains : dégâts ×1,5, poids ÷2":"",
    card.counterCharge?"Contre-charge : frappe avant celui qui le charge":"",
    card.chainShots?"Tirs enchaînés tant qu’ils font mouche":"",
    card.reload?"Une action rapide pour recharger après chaque tir":"",
    card.area?"Attaque de zone":"",
    card.poison?"Une fléchette qui blesse empoisonne la cible (3 tours)":""
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
  // « Protection » (Idan, 2026-10-30) : ce que l'armure oppose à la Pénétration d'armure, pour ne pas la confondre
  // avec la Résistance physique du porteur.
  const rows=[`<p class="item-card-group">Protection</p>`,...resist,
    hindrance.length?`<p class="item-card-group">Handicap</p>`:"",...hindrance];
  return {rows,traits:[],flavor:card.description};
}

// Bottes, ceintures, amulettes, capes, gants, culottes et bagues (Idan, 2026-10-24) : un pourcentage de la valeur de base
// du porteur, ou des points (cape de résistance physique, Slip d’Affinité).
const STAT_GEAR_KINDS=["boots","belt","amulet","cape","gloves","pants","ring","helmet"];
// Les lignes disent tout (Idan, 2026-10-30 : « ça sert à rien de répéter deux fois la même chose ») : pas de phrases dessous.
function statGearCardBody(card){
  // Slip d’Affinité : des points d’affinité avec le capitaine, pas une caractéristique.
  if(card.stat==="Affinité") return {rows:[cardRow("Affinité avec le capitaine",`+${cardNumber(card.bonus)}`,"bonus")],traits:[],flavor:null};
  if(card.points) return {rows:[cardRow(card.stat,`+${cardNumber(card.bonus)}`,"bonus")],traits:[],flavor:null};
  const rows=[cardRow(card.stat,`+${cardNumber(card.bonus)} %`,"bonus")];
  // Bague de magie : les deux écoles opposées baissent ; Casque de constitution : la Puissance magique.
  if(card.malus&&card.opposites?.length) rows.push(...card.opposites.map(o=>cardRow(o,`−${cardNumber(card.malus)} %`,"malus")));
  // Poids du casque (Idan, 2026-10-25).
  if(card.speed) rows.push(cardRow("Vitesse",`−${cardNumber(card.speed)}`,"malus"));
  return {rows,traits:[],flavor:null};
}

// Potions et fioles (Idan, 2026-10-29) : usage unique, sur soi, par une action rapide en combat.
function potionCardBody(card){
  const rows=card.effect==="soin"?[cardRow("Soins",`+${cardNumber(card.percent)} % des PV max`,"bonus")]
    :card.effect==="mana"?[cardRow("Mana",`+${cardNumber(card.percent)} % du mana max`,"bonus")]
    :[cardRow("Arme empoisonnée",`${cardNumber(card.turns)} tours`,"bonus"),cardRow("Poison",`${cardNumber(card.poison)} PV par tour`)];
  const traits=["Action rapide en combat, sur soi",
    card.effect==="poison_arme"?"Chaque coup qui blesse empoisonne la cible (corps à corps et tir)":""].filter(Boolean);
  return {rows,traits,flavor:card.description};
}

function renderItemCard(item){
  const card=itemCardRules()?.card(item);
  if(!card) return "";
  // L'image de l'objet dans le cadre de la carte (Idan, 2026-10-30 : « pas juste posée en extérieur »).
  const art=typeof equipmentArtLarge==="function"?equipmentArtLarge(item):typeof equipmentArt==="function"?equipmentArt(item):null;
  const gear=STAT_GEAR_KINDS.includes(card.kind);
  const potion=card.kind==="potion";
  const body=card.kind==="armor"?armorCardBody(card):gear?statGearCardBody(card):potion?potionCardBody(card):weaponCardBody(card);
  // Sous-titre sans doublon (« Vêtements », pas « Vêtements · Vêtement »).
  const armorClass=ARMOR_CLASSES[card.category]||card.category||"Armure";
  const armorSub=card.title!==card.name&&!String(card.name).toLowerCase().startsWith(String(armorClass).toLowerCase())?card.name+" · "+armorClass:card.title!==card.name?card.name:armorClass;
  const subtitle=card.kind==="armor"?armorSub:gear?card.name:potion?"Potion":[card.name,card.category].filter(Boolean).join(" · ");
  return `<div class="item-card-wrap"><div class="item-card item-card--t${card.tier}">
    ${art?`<figure class="item-card-art"><img src="${art}" alt=""></figure>`:""}
    <div class="item-card-head">
      <div class="item-card-names">
        <strong class="item-card-title">${esc(card.title)}</strong>
        <span class="item-card-sub">${esc(subtitle)}</span>
        ${potion?`<span class="item-card-tier">Usage unique</span>`:""}
      </div>
    </div>
    <dl class="item-card-stats">${body.rows.join("")}</dl>
    ${body.traits.length?`<ul class="item-card-traits">${body.traits.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}
    ${body.flavor?`<p class="item-card-flavor">${esc(body.flavor)}</p>`:""}
  </div></div>`;
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
  // Dans un menu (Donner, Troquer…), la carte se met à côté du menu, pas sur ses options.
  const menu=tile.closest(".deal-menu");
  const box=(menu||tile).getBoundingClientRect(),row=tile.getBoundingClientRect(),card=float.getBoundingClientRect(),gap=12,margin=8;
  let left=box.right+gap;
  if(left+card.width>innerWidth-margin) left=box.left-gap-card.width;
  left=Math.max(margin,Math.min(left,innerWidth-margin-card.width));
  const top=Math.max(margin,Math.min(row.top+row.height/2-card.height/2,innerHeight-margin-card.height));
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
