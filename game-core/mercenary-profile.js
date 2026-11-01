"use strict";

// Titres des mercenaires (Idan, 2026-10-31, version 2) : chaque mercenaire est noté dans 10 catégories de rôle (Healer,
// Summoner, Buffer, Contrôleur, DPS au CAC, DPS à distance, DPS magiques, Tank, Éclaireur, Meneur). Une catégorie est
// faite de sous-catégories mesurées avec les formules du combat (game-core/combat-engine.js, game-core/magic.js) et
// l'équipement porté, notées sur les 15 niveaux de la réputation. Il reçoit 1 à 3 titres, ou « Chair à canon » ; un titre
// prend sa sous-catégorie quand elle se détache. Tout se recalcule quand l'équipement change.
// Données : data/reference/mercenary-profile.json (catégories, sorts et créatures par sous-catégorie, sélection, seuils) ;
// les seuils sont mesurés sur les recrues par scripts/build-mercenary-profile.js.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesProfile=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  // Effets qui passent par une créature (creatures) plutôt que par le code du sort (sorts).
  const SUMMON_EFFECTS=new Set(["invocation","resurrection"]);

  function createProfileRules({reference,engine,magic=null}={}){
    const data=reference?.mercenaryProfile||{};
    const S=data.selection||{};
    const categories=(data.categories||[]).map(cat=>({...cat,sous:(cat.sous||[]).map(sub=>({...sub,key:cat.code+"."+sub.code}))}));
    const subByKey=new Map(categories.flatMap(cat=>cat.sous.map(sub=>[sub.key,sub])));
    const spellRoles=data.sorts||{},creatureRoles=data.creatures||{};
    const weaponRows=rows(reference?.weapons),potionRows=rows(reference?.potions);
    const constant=(code,fallback)=>{
      const value=Number(rows(reference?.formulaConstants).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    };
    const AURA={courage:constant("captain.aura.courage_ratio",0.35),charisma:constant("captain.aura.charisma_ratio",0.25)};

    // ---- L'étalon : adversaire de mesure, jamais montré ----
    const etalon=data.etalon||{};
    function etalonUnit(kind){
      const gear=etalon.armes?.[kind]||{};
      const row=weaponRows.find(w=>w.nom===gear.arme)||{};
      const category=String(row.domaine||"").split(",")[0].trim();
      const mastery=Number(etalon.maitrise)||0;
      return {character:{id:"etalon-"+kind,name:"Étalon",stats:{...(etalon.caracteristiques||{})},resistances:{},
        skills:{martial:{[category]:mastery,[gear.arme]:mastery},magic:{}},spells:[],
        items:[{id:"w",name:gear.arme,itemType:"weapon",tier:1,qualityCode:"standard",category},
          {id:"a",name:gear.armure,itemType:"armor",tier:1,qualityCode:"standard"}],
        equipment:{slots:{weapon_set_1_main:"w",armor:"a"}}},activeSet:1};
    }
    let etalons=null;
    const refs=()=>etalons||(etalons={leger:etalonUnit("leger"),lourd:etalonUnit("lourd"),archer:etalonUnit("archer")});

    // ---- Coups ----
    // Un coup : chance de toucher, chance de blesser, et dégâts attendus = toucher × blesser (meilleur type contre
    // l'armure) × dégâts moyens (avant le D3 de la Résistance physique, pris au milieu). context : backstab, chargePower.
    function strike(attacker,defender,mode,distance,context={}){
      const weapon=engine.weaponTemplate(engine.activeWeaponItem(attacker));
      const matchups=engine.damageMatchups(defender,weapon,{backstab:context.backstab}).sort((a,b)=>b.matchup-a.matchup);
      const pHit=engine.hitProbability(attacker,defender,mode,distance,{backstab:context.backstab})/100;
      const pWound=engine.woundProbability(attacker,defender,mode,matchups[0]||{matchup:0},{chargePower:context.chargePower})/100;
      const charge=context.chargePower||0;
      const low=engine.physicalDamage(attacker,defender,mode,charge,{roll:"min",resistanceRoll:2}).damage;
      const high=engine.physicalDamage(attacker,defender,mode,charge,{roll:"max",resistanceRoll:2}).damage;
      const hit=pWound*(low+high)/2;
      return {pHit,pWound,hit,damage:pHit*hit};
    }
    // Nombre moyen d'attaques (ou de paires) par tour avec les enchaînements : l'attaque n s'ouvre si la précédente a
    // touché, avec la chance d'enchaînement du moteur (au contact toujours ; au tir, armes « Répétable » seulement).
    function chainFactor(unit,mode,pHit){
      if(mode==="ranged"&&!engine.isRepeatable(engine.weaponTemplate(engine.activeWeaponItem(unit)))) return 1;
      let total=1,open=1;
      for(let n=2;n<=12&&open>1e-3;n++){
        open*=pHit*Math.min(100,engine.chainChance(unit,n,mode))/100;
        total+=open;
      }
      return total;
    }
    // Dégâts attendus par tour d'un attaquant contre un défenseur, enchaînements compris.
    function perTurn(attacker,defender,mode,distance){
      const hit=strike(attacker,defender,mode,distance);
      return hit.damage*chainFactor(attacker,mode,hit.pHit);
    }
    // L'arme principale d'un set, si elle frappe de cette façon (au contact ou au tir).
    function setWeapon(character,set,ranged){
      const unit={character,activeSet:set};
      const item=engine.activeWeaponItem(unit),weapon=engine.weaponTemplate(item);
      if(!weapon||engine.isRangedWeapon(weapon)!==ranged||!(ranged||engine.isMeleeWeapon(weapon))) return null;
      return {unit,weapon,item};
    }
    const midRange=unit=>Math.max(1,Math.round((Number(engine.weaponRange(unit).max)||2)/2));
    // Un set : la main principale, et la main secondaire au combat à deux armes si elle frappe de la même façon ; la paire
    // s'enchaîne si l'une des deux touche, et seulement au contact. reach : "mid" (mi-portée) ou "max" (bout de portée).
    function setDamage(character,set,ranged,defender,reach="mid"){
      const held=setWeapon(character,set,ranged);
      if(!held) return null;
      const {unit}=held,mode=ranged?"ranged":"melee";
      const distance=!ranged?1:reach==="max"?Math.max(1,Number(engine.weaponRange(unit).max)||1):midRange(unit);
      const main=strike(unit,defender,mode,distance);
      const off=engine.isDualWielding(unit)?engine.withHand(unit,"off",()=>{
        const item=engine.weaponTemplate(engine.activeWeaponItem(unit));
        return item&&engine.isRangedWeapon(item)===ranged?strike(unit,defender,mode,distance):null;
      }):null;
      if(!off) return main.damage*chainFactor(unit,mode,main.pHit);
      const pAny=1-(1-main.pHit)*(1-off.pHit);
      return (main.damage+off.damage)*(ranged?1:chainFactor(unit,"melee",pAny));
    }
    const best=values=>{ const v=values.filter(x=>x!=null&&Number.isFinite(x)); return v.length?Math.max(...v):null; };
    const bestSet=(character,ranged,defender,reach)=>best([1,2].map(set=>setDamage(character,set,ranged,defender,reach)));
    const stat=(character,name)=>engine.statWithGear({character,activeSet:1},name);

    // Objets à la ceinture (belt_item_1 à 4) : potions et fioles.
    function beltPotions(character){
      const slots=character.equipment?.slots||{};
      const ids=new Set(Object.entries(slots).filter(([slot,id])=>/^belt_item/.test(slot)&&id).map(([,id])=>id));
      return (character.items||[]).filter(item=>item.itemType==="potion"&&ids.has(item.id))
        .map(item=>potionRows.find(r=>r.nom===item.name||"potion:"+r.code===item.templateId)).filter(Boolean);
    }
    // Poison : dégâts × tours × chance qu'un coup blesse × chance que l'étalon ne résiste pas.
    function poisonValue(character,ranged){
      const vial=beltPotions(character).find(p=>p.effet==="poison_arme");
      const defender=refs().leger;
      const resisted=engine.poisonResistChance(defender)/100;
      const turns=Number(engine.POISON?.turns)||3;
      return best([1,2].map(set=>{
        const held=setWeapon(character,set,ranged);
        if(!held) return null;
        const quality=Number(engine.quality(held.item)?.multiplicateur_qualite)||1;
        const dice=Number(String(held.weapon.degats_pv_base||"").match(/^(\d+)/)?.[1])||1;
        const blowgun=held.weapon.empoisonne?Math.ceil(10*dice*quality-1e-9):0;
        const amount=Math.max(blowgun,vial?Number(vial.degats_poison)||0:0);
        if(!amount) return null;
        const hit=strike(held.unit,defender,ranged?"ranged":"melee",ranged?midRange(held.unit):1);
        return amount*turns*hit.pHit*hit.pWound*(1-resisted);
      }));
    }

    // ---- Sources (data/reference/mercenary-profile.json, sources) ----
    const SOURCES={
      contact_lourd:c=>bestSet(c,false,refs().lourd),
      contact_leger:c=>bestSet(c,false,refs().leger),
      tir_lourd:c=>bestSet(c,true,refs().lourd),
      tir_leger:c=>bestSet(c,true,refs().leger),
      tir_loin:c=>bestSet(c,true,refs().leger,"max"),
      assassin:c=>best([1,2].map(set=>{
        const held=setWeapon(c,set,false);
        if(!held) return null;
        const hidden=1-engine.detectionChance(refs().leger,held.unit,3)/100;
        return strike(held.unit,refs().leger,"melee",1,{backstab:true}).damage*hidden;
      })),
      charge:c=>best([1,2].map(set=>{
        const held=setWeapon(c,set,false);
        if(!held) return null;
        const travel=Math.round(1.5*engine.movementBase(held.unit));
        const quality=Number(engine.quality(held.item)?.multiplicateur_qualite)||1;
        const chargePower=travel*(Number(held.weapon.bonus_charge_base)||1)*quality;
        return strike(held.unit,refs().leger,"melee",1,{chargePower}).damage;
      })),
      poison_contact:c=>poisonValue(c,false),
      poison_tir:c=>poisonValue(c,true),
      // Toutes les armes de tir contre-chargent : seule l'arme d'hast en fait une spécialité de contact.
      contre_charge:c=>best([1,2].map(set=>{
        const held=setWeapon(c,set,false);
        return held?.weapon.contre_charge?strike(held.unit,refs().leger,"melee",1).damage:null;
      })),
      encaisser:c=>{
        const unit={character:c,activeSet:1};
        const block=(Number(engine.blockChance(unit))||0)/100;
        const taken=(strike(refs().leger,unit,"melee",1).hit+strike(refs().archer,unit,"ranged",6).hit)/2;
        return engine.maxHp(unit)/Math.max(0.1,(1-block)*taken);
      },
      esquive:c=>{
        const unit={character:c,activeSet:1};
        const parry=Math.min(100,Number(engine.parryChance(unit,"melee"))||0)/100;
        const melee=strike(refs().leger,unit,"melee",1).pHit*(1-parry),ranged=strike(refs().archer,unit,"ranged",6).pHit;
        return 1-(melee+ranged)/2;
      },
      potions_soin:c=>{
        const heal=beltPotions(c).filter(p=>p.effet==="soin").reduce((sum,p)=>sum+(Number(p.pourcentage)||0),0);
        return heal?heal/100*engine.maxHp({character:c,activeSet:1}):null;
      },
      perception:c=>stat(c,"Perception"),
      discretion:c=>stat(c,"Discrétion"),
      pieges:c=>stat(c,"Pièges"),
      intimidation:c=>stat(c,"Intimidation"),
      aura:c=>AURA.courage*stat(c,"Courage")+AURA.charisma*stat(c,"Charisme")
    };

    // Sous-catégorie d'un sort : par sa créature pour les invocations, sinon par son code.
    function spellRole(spell){
      if(!spell) return null;
      return SUMMON_EFFECTS.has(spell.effet)?creatureRoles[spell.creature]||null:spellRoles[spell.code]||null;
    }
    // Valeur d'un sort selon la mesure de sa sous-catégorie (montant, maitrise, invocation).
    function spellValue(unit,known,spell,kind){
      const manaMax=magic.manaMax(unit),cost=magic.manaCost(unit,known.code);
      const sustain=cost>0?Math.min(1,manaMax/(3*cost)):1;
      const base=magic.castChance(unit,known.code).p/100*sustain;
      if(kind==="montant"){
        if(!magic.dice(known.code).count) return null;
        const range=magic.effectRange(unit,known.code);
        const turns=["soin_sur_duree","degats_sur_duree","aura_de_feu"].includes(spell.effet)?Math.max(1,magic.duration(unit,known.code)):1;
        return base*(range.min+range.max)/2*turns;
      }
      if(kind==="invocation"){
        if(spell.effet==="resurrection") return base*magic.zombieShare(unit,known.code)/100;
        const count=Number(spell.invocation_nb_des)||0,sides=Number(spell.invocation_de)||0,step=Number(spell.invocation_pas_maitrise)||0;
        const expected=count&&sides?count*(sides+1)/2+(step>0?Math.floor(magic.mastery(unit,known.code)/step):0):1;
        return base*expected*magic.holdChance(unit,known.code)/100;
      }
      return base*magic.mastery(unit,known.code)/100;
    }
    // Ses sorts, rangés par sous-catégorie : le meilleur de chacune.
    function spellSources(character){
      const out={};
      if(!magic) return out;
      const unit={character,activeSet:1};
      for(const known of character.spells||[]){
        const spell=magic.spell(known.code),key=spellRole(spell),sub=key&&subByKey.get(key);
        if(!sub||!sub.sources.includes("sorts")) continue;
        const value=spellValue(unit,known,spell,sub.sorts);
        if(value!=null&&Number.isFinite(value)) out["sorts:"+key]=Math.max(out["sorts:"+key]??0,value);
      }
      return out;
    }
    // Toutes les mesures brutes : clé de source → valeur ; absente, il ne sait pas le faire.
    function measure(character){
      const out={};
      const needed=new Set(categories.flatMap(cat=>cat.sous.flatMap(sub=>sub.sources.filter(s=>s!=="sorts"))));
      for(const key of needed){
        const value=SOURCES[key]?.(character);
        if(value!=null&&Number.isFinite(value)) out[key]=value;
      }
      return {...out,...spellSources(character)};
    }

    // ---- Niveaux ----
    // Seuils d'une source (ou d'une catégorie : categorie:code) ; une source de sorts trop rare chez les recrues prend
    // ceux de sa famille.
    function steps(key){
      const own=data.seuils?.[key];
      if(own) return own;
      const sub=key.startsWith("sorts:")&&subByKey.get(key.slice(6));
      return sub?data.seuils?.["sorts_"+sub.sorts]||[]:[];
    }
    // Niveau 1 à 15, avec sa place dans la tranche (3,8 : haut du niveau 3) pour départager deux égalités.
    function level(key,value){
      if(value==null||!Number.isFinite(value)) return null;
      const list=steps(key);
      let lvl=1;
      for(const min of list) if(value>=min) lvl++;
      lvl=Math.min(15,lvl);
      const low=lvl>1?list[lvl-2]:0,high=list[lvl-1];
      const fine=high>low?lvl+Math.min(0.999,Math.max(0,(value-low)/(high-low))):lvl;
      return {level:lvl,fine};
    }
    const byLevel=(a,b)=>b.level-a.level||b.fine-a.fine;

    // ---- Lecture ----
    function evaluate(character){
      if(!engine||!character?.stats) return null;
      const values=measure(character);
      const scored=categories.map(cat=>{
        const subs=cat.sous.map(sub=>{
          if(sub.a_venir) return null;
          const levels=sub.sources.map(source=>{
            const key=source==="sorts"?"sorts:"+sub.key:source;
            return level(key,values[key]);
          }).filter(Boolean).sort(byLevel);
          return levels[0]?{...levels[0],code:sub.code,key:sub.key,nom:sub.nom}:null;
        }).filter(Boolean).sort(byLevel);
        if(!subs.length) return null;
        // La catégorie suit sa meilleure sous-catégorie, étalonnée à son tour sur la réputation des recrues : une catégorie
        // mesurée chez tous (Tank, Meneur, Éclaireur) ne sort pas plus souvent qu'une autre parce qu'elle a plus de sources.
        const own=level("categorie:"+cat.code,subs[0].fine);
        return {code:cat.code,nom:cat.nom,raw:subs[0].fine,...(data.seuils?.["categorie:"+cat.code]?own:{level:subs[0].level,fine:subs[0].fine}),subs};
      }).filter(Boolean).sort(byLevel);

      // Titre 1 : sa meilleure catégorie, à titre_min étoiles au moins ; titres 2 et 3 : la suivante, au moins aussi
      // haut que titre_min et à ecart_titre près de la précédente.
      const min=S.titre_min??4,max=S.max_titres??3;
      const titles=[];
      if(scored[0]&&scored[0].level>=min){
        titles.push(scored[0]);
        for(const next of scored.slice(1)){
          const previous=titles[titles.length-1];
          if(titles.length>=max||next.level<min||previous.level-next.level>(S.ecart_titre??1)) break;
          titles.push(next);
        }
      }
      // Spécificité : la meilleure sous-catégorie, si elle se détache d'au moins ecart_specificite, ou s'il ne sait faire
      // qu'elle (au moins specificite_min) ; sinon le titre reste générique.
      const result=titles.map(cat=>{
        const [top,second]=cat.subs;
        const specific=second?top.level-second.level>=(S.ecart_specificite??2):top.level>=(S.specificite_min??3);
        const sub=specific?{code:top.code,nom:top.nom}:null;
        return {category:cat.code,categoryName:cat.nom,sub,level:cat.level,label:sub?cat.nom+" · "+sub.nom:cat.nom};
      });
      return {values,categories:scored,titles:result,cannonFodder:!result.length};
    }

    return {measure,level,evaluate,strike,perTurn,categories,spellRole};
  }

  return {createProfileRules};
});
