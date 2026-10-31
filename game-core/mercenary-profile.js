"use strict";

// Évaluation d'un mercenaire (Idan, 2026-10-31) : des facettes mesurées avec les formules du combat et l'équipement
// porté (game-core/combat-engine.js, game-core/magic.js), notées sur les 15 niveaux de la réputation, puis ce qui ressort
// (points forts, points faibles, gêne d'équipement) et un titre qui dit à quoi il sert. Tout se recalcule quand
// l'équipement change. Données : data/reference/mercenary-profile.json (facettes, seuils, sélection, titres) ; les seuils
// sont mesurés sur les recrues par scripts/build-mercenary-profile.js.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesProfile=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const ATTACK_FAMILIES=new Set(["contact","tir","magie"]);
  // Effets des sorts (spells.json, effet) par facette de magie.
  const SPELL_FACETS={
    degats:"magie_attaque",degats_rebonds:"magie_attaque",degats_paire:"magie_attaque",
    degats_zone:"magie_zone",
    soin:"soin",soin_sur_duree:"soin",
    soin_de_zone:"soin_masse",
    bonus_caracteristiques:"soutien",bonus_zone:"soutien",arme_elementaire:"soutien",protection_elementaire:"soutien",
    protection_projectiles:"soutien",crachat_venin:"soutien",drain_de_vie:"soutien",purge_poison:"soutien",
    invocation:"invocation",resurrection:"invocation",transposition:"invocation",
    peur:"controle",bourbier:"controle",terrain_infranchissable:"controle",brouillard:"controle",
    malus_caracteristiques:"controle",deplacement_force:"controle",fletrissement:"controle",frenesie:"controle"
  };
  // Sorts chiffrés (soins ou dégâts) : leur effet moyen compte ; les autres, la réussite et le mana seulement.
  const AMOUNT_FACETS=new Set(["magie_attaque","magie_zone","soin","soin_masse"]);

  function createProfileRules({reference,engine,magic=null}={}){
    const data=reference?.mercenaryProfile||{};
    const facetDefs=data.facettes||[];
    const facetByCode=new Map(facetDefs.map(f=>[f.code,f]));
    const groups=data.groupes||[];
    const groupOf=new Map(groups.flatMap(g=>g.facettes.map(code=>[code,g])));
    const S=data.selection||{};
    const titles=data.titres||{};
    const weaponRows=rows(reference?.weapons);

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

    // ---- Mesures ----
    // Dégâts attendus d'un coup : toucher × blesser (meilleur type contre l'armure) × dégâts moyens (avant le D3 de la
    // Résistance physique, pris au milieu).
    function strike(attacker,defender,mode,distance){
      const weapon=engine.weaponTemplate(engine.activeWeaponItem(attacker));
      const matchups=engine.damageMatchups(defender,weapon).sort((a,b)=>b.matchup-a.matchup);
      const pHit=engine.hitProbability(attacker,defender,mode,distance)/100;
      const pWound=engine.woundProbability(attacker,defender,mode,matchups[0]||{matchup:0})/100;
      const low=engine.physicalDamage(attacker,defender,mode,0,{roll:"min",resistanceRoll:2}).damage;
      const high=engine.physicalDamage(attacker,defender,mode,0,{roll:"max",resistanceRoll:2}).damage;
      return pHit*pWound*(low+high)/2;
    }
    // Un set : la main principale, et la main secondaire au combat à deux armes si elle frappe de la même façon.
    function setDamage(character,set,ranged,defender){
      const unit={character,activeSet:set};
      const weapon=engine.weaponTemplate(engine.activeWeaponItem(unit));
      if(!weapon||engine.isRangedWeapon(weapon)!==ranged||!(ranged||engine.isMeleeWeapon(weapon))) return null;
      const mode=ranged?"ranged":"melee";
      const distance=ranged?Math.max(1,Math.round((Number(engine.weaponRange(unit).max)||2)/2)):1;
      let total=strike(unit,defender,mode,distance);
      if(engine.isDualWielding(unit)){
        total+=engine.withHand(unit,"off",()=>{
          const off=engine.weaponTemplate(engine.activeWeaponItem(unit));
          return off&&engine.isRangedWeapon(off)===ranged?strike(unit,defender,mode,distance):0;
        });
      }
      return total;
    }
    function bestSet(character,ranged,defender){
      const values=[1,2].map(set=>setDamage(character,set,ranged,defender)).filter(v=>v!=null);
      return values.length?Math.max(...values):null;
    }
    function spellFacets(character){
      const out={};
      if(!magic) return out;
      const unit={character,activeSet:1};
      const manaMax=magic.manaMax(unit);
      for(const known of character.spells||[]){
        const spell=magic.spell(known.code);
        const facet=spell&&SPELL_FACETS[spell.effet];
        if(!facet) continue;
        const cost=magic.manaCost(unit,known.code);
        const sustain=cost>0?Math.min(1,manaMax/(3*cost)):1;
        const success=magic.castChance(unit,known.code).p/100;
        let value=success*sustain;
        if(AMOUNT_FACETS.has(facet)&&magic.dice(known.code).count){
          const range=magic.effectRange(unit,known.code);
          const turns=spell.effet==="soin_sur_duree"?Math.max(1,magic.duration(unit,known.code)):1;
          value*=(range.min+range.max)/2*turns;
        }
        out[facet]=Math.max(out[facet]??0,value);
      }
      return out;
    }
    // Valeur brute de chaque facette ; null : elle ne le concerne pas (pas d'arme de ce genre, pas de sort de ce genre).
    function measure(character){
      const unit={character,activeSet:1},{leger,lourd,archer}=refs();
      const hp=engine.maxHp(unit);
      const taken=(attacker,mode,distance)=>Math.max(0.1,strike(attacker,unit,mode,distance));
      return {
        contact_leger:bestSet(character,false,leger),
        contact_lourd:bestSet(character,false,lourd),
        tir_leger:bestSet(character,true,leger),
        tir_lourd:bestSet(character,true,lourd),
        magie_attaque:null,magie_zone:null,soin:null,soin_masse:null,soutien:null,invocation:null,controle:null,
        ...spellFacets(character),
        encaisser_coups:hp/taken(leger,"melee",1),
        encaisser_fleches:hp/taken(archer,"ranged",6),
        moral:engine.statWithGear(unit,"Courage")+0.25*engine.statWithGear(unit,"Volonté"),
        initiative:engine.initiative(unit),
        discretion:engine.statWithGear(unit,"Discrétion"),
        reperage:engine.statWithGear(unit,"Perception")
      };
    }

    // Niveau 1 à 15 : seuils[code] = valeur minimale des niveaux 2 à 15.
    function level(code,value){
      if(value==null||!Number.isFinite(value)) return null;
      const steps=data.seuils?.[code]||[];
      let lvl=1;
      for(const min of steps) if(value>=min) lvl++;
      return Math.min(15,lvl);
    }

    // ---- Lecture : ce qui ressort ----
    // Les lignes affichables : un groupe fusionné (« Au contact ») si ses deux facettes sont proches, sinon chacune.
    function entries(levels){
      const out=[],done=new Set();
      for(const def of facetDefs){
        if(done.has(def.code)) continue;
        const group=groupOf.get(def.code);
        if(group){
          group.facettes.forEach(code=>done.add(code));
          const parts=group.facettes.map(code=>({code,level:levels[code]})).filter(p=>p.level!=null);
          if(!parts.length) continue;
          const spread=Math.max(...parts.map(p=>p.level))-Math.min(...parts.map(p=>p.level));
          if(parts.length>1&&spread>(S.ecart_groupe??1)){
            for(const p of parts) out.push({code:p.code,name:facetByCode.get(p.code).nom,family:def.famille,level:p.level,secondary:false});
          }else{
            out.push({code:group.code,name:group.nom,family:def.famille,group:true,
              level:Math.round(parts.reduce((s,p)=>s+p.level,0)/parts.length),secondary:false});
          }
          continue;
        }
        done.add(def.code);
        if(levels[def.code]==null) continue;
        out.push({code:def.code,name:def.nom,family:def.famille,level:levels[def.code],secondary:Boolean(def.secondaire)});
      }
      return out;
    }

    function hasMeleeWeapon(character){
      return [1,2].some(set=>{
        const weapon=engine.weaponTemplate(engine.activeWeaponItem({character,activeSet:set}));
        return weapon&&engine.isMeleeWeapon(weapon);
      });
    }
    function withoutArmor(character){
      const slots={...(character.equipment?.slots||{})};
      if(!slots.armor) return null;
      slots.armor=null;
      return {...character,equipment:{...character.equipment,slots}};
    }
    const female=character=>String(character?.sex||"").trim().toLowerCase().startsWith("f");
    const word=(entry,character)=>entry?(female(character)?entry.f:entry.m)||entry.m||"":"";

    // Le titre : son premier point fort dit à quoi il sert ; au contact et au tir, le rapport de ses dégâts contre une
    // armure lourde et contre une armure légère le nuance (au moins perce_ratio : il perce les plates ; au plus
    // leger_ratio : il ne sert que contre les armures légères) ; le contact qui encaisse aussi fait un pilier. Le
    // complément vient de son point fort suivant, d'une autre famille.
    const LEAD_KEYS={defense:"bouclier",discretion:"eclaireur",moral:"moral",vitesse:"initiative"};
    const COMPLEMENT_KEYS={defense:"encaisser",vitesse:"initiative"};
    function title(character,values,strengths){
      const principal=titles.principal||{},complement=titles.complement||{};
      const lead=strengths[0]||null;
      let key="rang";
      const used=new Set();
      if(lead){
        used.add(lead.family);
        if(lead.family==="contact"||lead.family==="tir"){
          const light=values[lead.family+"_leger"],heavy=values[lead.family+"_lourd"];
          const ratio=light>0?heavy/light:1;
          if(ratio>=(S.perce_ratio??1)) key=lead.family+"_perce";
          else if(ratio<=(S.leger_ratio??0.5)) key=lead.family+"_leger";
          else if(lead.family==="contact"&&strengths.some(s=>s.family==="defense")){ key="contact_pilier"; used.add("defense"); }
          else key=lead.family;
        }else if(lead.family==="defense"&&strengths.some(s=>s.family==="contact")){ key="contact_pilier"; used.add("contact"); }
        else key=lead.family==="magie"?lead.code:LEAD_KEYS[lead.family]||"rang";
        if(lead.family==="discretion") used.add("discretion");
      }
      const second=strengths.find(s=>!used.has(s.family));
      const complementKey=second?(COMPLEMENT_KEYS[second.family]||(second.family==="discretion"?second.code:second.family)):null;
      return {key,complementKey,text:word(principal[key],character)+word(complement[complementKey],character)};
    }

    function evaluate(character){
      if(!engine||!character?.stats) return null;
      const values=measure(character);
      const levels=Object.fromEntries(Object.entries(values).map(([code,value])=>[code,level(code,value)]));
      const list=entries(levels);
      const main=list.filter(e=>!e.secondary);
      const mean=main.length?main.reduce((s,e)=>s+e.level,0)/main.length:0;
      const strengths=list.filter(e=>e.secondary?e.level>=mean+(S.secondaire_ecart??2):e.level>=mean+(S.fort_ecart??1))
        .sort((a,b)=>(b.level-mean)-(a.level-mean)||ATTACK_FAMILIES.has(b.family)-ATTACK_FAMILIES.has(a.family))
        .slice(0,S.max_forts??3);
      // Un mercenaire moyen partout garde son meilleur trait, s'il dépasse sa moyenne.
      if(!strengths.length){
        const top=[...main].sort((a,b)=>b.level-a.level||ATTACK_FAMILIES.has(b.family)-ATTACK_FAMILIES.has(a.family))[0];
        if(top&&top.level>mean) strengths.push(top);
      }
      const weak=list.filter(e=>e.secondary?e.level<=Math.min(1,mean-(S.secondaire_ecart??2)):e.level<=mean-(S.faible_ecart??1)||e.level===1)
        .sort((a,b)=>(a.level-mean)-(b.level-mean));
      const weaknesses=[];
      if(!hasMeleeWeapon(character)) weaknesses.push({code:"sans_contact",name:"Aucune arme de contact",family:"contact",level:null});
      weaknesses.push(...weak.slice(0,Math.max(0,(S.max_faibles??2)-weaknesses.length)));
      // Gêne d'équipement : sans son armure, une facette d'attaque, de magie ou l'initiative gagnerait au moins gene_niveaux
      // niveau et vaudrait au moins gene_ratio fois plus ; la plus forte est retenue.
      let hindrance=null;
      const bare=withoutArmor(character);
      if(bare){
        const freed=measure(bare);
        for(const code of Object.keys(values)){
          const def=facetByCode.get(code);
          if(!def||!(ATTACK_FAMILIES.has(def.famille)||code==="initiative")||levels[code]==null) continue;
          const gain=level(code,freed[code])-levels[code];
          const ratio=freed[code]/Math.max(1e-9,values[code]);
          if(gain>=(S.gene_niveaux??1)&&ratio>=(S.gene_ratio??1.5)&&(!hindrance||ratio>hindrance.ratio)) hindrance={code,name:def.nom,level:levels[code],gain,ratio,cause:"armor"};
        }
      }
      return {values,levels,entries:list,mean,strengths,weaknesses,hindrance,title:title(character,values,strengths)};
    }

    return {measure,level,evaluate,facets:facetDefs};
  }

  return {createProfileRules,SPELL_FACETS};
});
