"use strict";

// L'intendant qui tague (Idan, 2026-11-12 ; doc 20 §5 à §8) : « On doit pouvoir lui demander de le qualifier tout seul.
// L'intendant met les tags qu'il veut. » Scénario sans biais. Il lit tout ce qu'a le mercenaire (sorts, compétences,
// caractéristiques, équipement porté) et le compare toujours à la bande (« Il faut jamais comparer à la génération de X
// mercenaires… Son rôle dépend des autres mercenaires qui existent dans la compagnie ») : médiane, quarts, rang.
// La bande : ceux qui peuvent partir en mission (pas l'intendant, le médecin ni les maîtres à leur poste), capitaine
// compris. Données : data/reference/steward-tags.json (seuils, ce qui sert chaque rôle, traits des camps, postes) et les
// tags de chaque sort (spells.json, tags). Rien d'écrit en dur sur les camps, les monstres ou les missions.
// Sortie : pour chaque mercenaire, ses tags (une liste d'identifiants, sans niveau : un tag est posé ou non), à poser avec
// mercenary-tags.js (setSteward), plus ce qu'il a constaté (facts) pour les questions à venir.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesStewardTags=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const num=(v,f=0)=>{ const n=Number(v); return Number.isFinite(n)?n:f; };
  const SUMMON_EFFECTS=new Set(["invocation"]);
  const PHYSICAL={tranchant:"puissance_tranchante_base",perforant:"puissance_perforante_base",contondant:"puissance_contondante_base"};
  const TYPE_TAG={tranchant:"tranchant",perforant:"perforant",contondant:"contondant",brulant:"brulant",glacant:"glacant",
    foudroyant:"foudroyant",corrosif:"corrosif",poison:"poison",necrotique:"necrotique"};

  // Place d'une valeur parmi d'autres, de 0 à 100 (rang moyen : la médiane d'un seul vaut 50).
  function placeAmong(values,v){
    const n=values.length;
    if(!n) return 0;
    let below=0,equal=0;
    for(const x of values){ if(x<v-1e-9) below++; else if(Math.abs(x-v)<=1e-9) equal++; }
    return 100*(below+equal/2)/n;
  }
  const below=(values,v)=>values.filter(x=>x<v-1e-9).length;

  function createStewardTags({reference,engine,magic,profile,missions,tags,stars,campPosts=null,lieutenants=null,armorPorts=null}={}){
    const D=reference?.stewardTags||{},S=D.seuils||{};
    const seuil=(k,f)=>num(S[k],f);
    const MEDIAN=seuil("mediane",50),TOP_QUARTER=seuil("quart_haut",75),THREE_QUARTERS=seuil("trois_quarts",0.75);
    const spellRows=new Map(rows(reference?.spells).map(s=>[s.code,s]));
    const weaponRows=rows(reference?.weapons),armorRows=rows(reference?.baseArmors);
    const weaponByName=new Map(weaponRows.map(w=>[w.nom,w]));
    const skillRows=rows(reference?.skills);
    const familyOf=name=>skillRows.find(s=>s.nom===name)?.parent||null;
    const buildingRows=new Map(rows(reference?.campBuildings).map(b=>[b.code,b]));
    const summonRows=new Map(rows(reference?.summonArchetypes).map(a=>[a.code,a]));
    const mountRows=new Map(rows(reference?.mounts).map(m=>[m.code,m]));
    const archetypes=rows(reference?.enemyArchetypes);
    const aura=S.aura_officier||{courage:0.175,charisme:0.125};
    const captainAura={courage:0.35,charisme:0.25};
    const spellTags=code=>spellRows.get(code)?.tags||[];
    const T=id=>tags.has(id)?id:null;

    // ---- Unités ----
    const unitOf=(c,set=1,extra={})=>({character:c,activeSet:set,...extra});
    const stat=(c,name)=>num(engine.statWithGear(unitOf(c),name));
    const knownSpells=c=>(c?.spells||[]).filter(s=>spellRows.has(s.code));
    const castP=(c,code)=>num(magic?.castChance(unitOf(c),code)?.p)/100;
    const buildingLevel=(state,code)=>num(state?.company?.camp?.buildings?.[code]?.level);
    const built=(state,code)=>buildingLevel(state,code)>=1;

    // Un ennemi tiré d'une fiche figée (enemy-archetypes.json), sur une base vide.
    function enemyUnit(arch){
      const base={id:"ref-"+arch.code,name:arch.nom,stats:{},resistances:{},skills:{martial:{},magic:{},social:{},physiology:{},animal:{},camp:{}},
        equipment:{slots:{weapon_set_1_main:null,weapon_set_1_off:null,weapon_set_2_main:null,weapon_set_2_off:null,armor:null}},items:[]};
      return unitOf(missions.applyArchetype(base,arch,{idPrefix:"ref-"+arch.code}));
    }
    // L'ennemi médian des missions au niveau de la compagnie (doc 20 : « l'ennemi médian des missions au niveau de la
    // compagnie, tiré des fiches ennemies ») : les niveaux de monstres du budget de « Faire le ménage » à ce niveau,
    // les fiches des camps qui y ont droit, la médiane de leurs points. faction : celle d'un camp.
    const enemyCache=new Map();
    function referenceEnemy(level,faction=null){
      const key=level+"|"+(faction||"");
      if(enemyCache.has(key)) return enemyCache.get(key);
      const def=missions.definition("cleanup");
      const budgets=def?.budgets||[];
      const budget=budgets.find(b=>level>=num(b.niveaux?.[0])&&level<=num(b.niveaux?.[1]))||budgets[budgets.length-1]||{};
      const tiers=new Map((budget.monstres||[]).map(m=>[m.niveau,num(m.poids,1)]));
      const factions=new Set(faction?[faction]:campFactions());
      let pool=archetypes.filter(a=>factions.has(a.faction)&&tiers.has(a.niveau)&&num(a.niveau_mission_min)<=level);
      if(!pool.length) pool=archetypes.filter(a=>factions.has(a.faction));
      pool.sort((a,b)=>num(a.points)-num(b.points));
      const weights=pool.map(a=>tiers.get(a.niveau)||1),total=weights.reduce((s,w)=>s+w,0);
      let acc=0,pick=pool[0];
      for(let i=0;i<pool.length;i++){ acc+=weights[i]; if(acc>=total/2){ pick=pool[i]; break; } }
      const unit=pick?enemyUnit(pick):null;
      enemyCache.set(key,unit);
      return unit;
    }
    const campFactions=()=>[...new Set((reference?.oneShotMissions?.ordres||[]).filter(o=>o.mission==="cleanup").map(o=>o.faction))];

    // Une créature invoquée (summon-archetypes.json) : comme en combat (mission.js, missionCreatureCharacter).
    function creatureUnit(arch){
      const a=arch.attaque||{},id="steward-"+arch.code;
      const weapon={id:id+"-weapon",itemType:"weapon",name:a.nom,natural:true,category:"Armes naturelles",
        template:{nom:a.nom,domaine:"Armes naturelles",prise:"1 main",degats_pv_base:a.degats_pv_base,degats_type:a.degats_type||null,
          puissance_tranchante_base:num(a.puissance_tranchante),puissance_perforante_base:num(a.puissance_perforante),
          puissance_contondante_base:num(a.puissance_contondante),malus_vitesse_arme_base:0,bonus_charge_base:num(a.bonus_charge,1),contre_charge:false,
          empoisonne:Boolean(a.empoisonne),immobilise:num(a.immobilise)}};
      return unitOf({id,name:arch.nom,role:arch.nom,archetype:arch.code,undead:Boolean(arch.mort_vivant),immunePhysical:Boolean(arch.immunite_physique),
        stats:{...arch.caracteristiques},resistances:{...arch.resistances},pvMax:arch.pv,skills:{martial:{...arch.competences_martiales},social:{},magic:{}},
        spells:[],mana:0,items:[weapon],equipment:{slots:{weapon_set_1_main:weapon.id}}});
    }

    // ---- Ses attaques ----
    const weaponTypes=w=>Object.entries(PHYSICAL).filter(([,col])=>num(w?.[col])>0).map(([type])=>type);
    // Une arme tenue dans un set, contre l'ennemi de référence.
    function weaponAttack(c,set,ranged,foe){
      const held=profile.setWeapon(c,set,ranged);
      if(!held||!foe) return null;
      const value=num(profile.setDamage(c,set,ranged,foe));
      if(!(value>0)) return null;
      const w=held.weapon;
      const poison=Boolean(w.empoisonne)||(engine.canPoisonWeapon(held.unit)&&engine.poisonableWeapon(w));
      return {genre:ranged?"distance":"contact",value,weapon:w.nom,family:familyOf(w.nom),types:[...weaponTypes(w),...(poison?["poison"]:[])],
        ranged,counterCharge:Boolean(w.contre_charge)||ranged,zone:Boolean(w.attaque_de_zone),set};
    }
    // La charge (doc 04) : élan de 1,5 × son mouvement × le bonus de charge de l'arme.
    function chargeValue(c,foe){
      let best=0;
      for(const set of [1,2]){
        const held=profile.setWeapon(c,set,false);
        if(!held||!foe) continue;
        const travel=Math.round(1.5*num(engine.movementBase(held.unit),1));
        const quality=num(engine.quality(held.item)?.multiplicateur_qualite,1);
        const chargePower=travel*num(held.weapon.bonus_charge_base,1)*quality;
        best=Math.max(best,num(profile.strike(held.unit,foe,"melee",1,{chargePower}).damage));
      }
      return best;
    }
    // Un sort de dégâts : sa chance × son effet moyen (les calculs de l'aperçu) ; une invocation : ses créatures, leurs
    // dégâts par tour, leur nombre moyen, la chance de les garder.
    function spellAttack(c,known,foe){
      const row=spellRows.get(known.code),own=spellTags(known.code);
      if(!row||!own.includes("role/degats")) return null;
      if(own.some(t=>/anti-morts-vivants|anti-invocations/.test(t))) return null;
      const unit=unitOf(c);
      let value=0;
      if(SUMMON_EFFECTS.has(row.effet)&&summonRows.has(row.creature)&&foe){
        const count=num(row.invocation_nb_des)&&num(row.invocation_de)?num(row.invocation_nb_des)*(num(row.invocation_de)+1)/2
          +(num(row.invocation_pas_maitrise)>0?Math.floor(num(magic.mastery(unit,known.code))/num(row.invocation_pas_maitrise)):0):1;
        value=castP(c,known.code)*count*num(profile.perTurn(creatureUnit(summonRows.get(row.creature)),foe,"melee",1))*num(magic.holdChance(unit,known.code))/100;
      }else if(!SUMMON_EFFECTS.has(row.effet)&&row.effet!=="resurrection"){
        value=num(profile.spellValue(unit,known,row,"montant"));
      }
      if(!(value>0)) return null;
      return {genre:"magie",value,spell:row.nom,code:row.code,tags:own};
    }
    function attacksOf(c,foe){
      const list=[];
      for(const set of [1,2]) for(const ranged of [false,true]){ const a=weaponAttack(c,set,ranged,foe); if(a) list.push(a); }
      for(const known of knownSpells(c)){ const a=spellAttack(c,known,foe); if(a) list.push(a); }
      const best={};
      for(const a of list) if(!best[a.genre]||a.value>best[a.genre].value) best[a.genre]=a;
      return {list,best};
    }

    // ---- Ce qu'il sait faire (valeurs brutes) ----
    const sumCast=(c,test)=>knownSpells(c).filter(s=>spellTags(s.code).some(test)).reduce((sum,s)=>sum+castP(c,s.code),0);
    const spellsWith=(c,test)=>knownSpells(c).filter(s=>spellTags(s.code).some(test));
    const auraItems=c=>{
      const slots=c.equipment?.slots||{},ids=new Set(["weapon_set_1_main","weapon_set_1_off","weapon_set_2_main","weapon_set_2_off"].map(k=>slots[k]).filter(Boolean));
      return (c.items||[]).filter(i=>ids.has(i.id)&&weaponByName.get(i.name)?.aura_caracteristique);
    };
    function solidity(c,foe){
      if(!foe) return 0;
      const unit=unitOf(c);
      const hit=profile.strike(foe,unit,"melee",1);
      const block=num(engine.blockChance(unit))/100,parry=Math.min(100,num(engine.parryChance(unit,"melee")))/100;
      const taken=Math.max(0.1,hit.pHit*(1-block)*(1-parry)*hit.hit);
      return num(engine.maxHp(unit))/taken;
    }
    function healValue(c){
      let best=0;
      for(const known of spellsWith(c,t=>t==="role/soin")){
        const row=spellRows.get(known.code);
        const v=profile.spellValue(unitOf(c),known,row,"montant");
        best=Math.max(best,v!=null&&Number.isFinite(v)?v:castP(c,known.code));
      }
      return best;
    }
    function schoolsOf(c){
      const out={};
      for(const known of knownSpells(c)){ const school=spellRows.get(known.code)?.ecole; if(school) out[school]=num(engine.statWithGear(unitOf(c),school)); }
      return out;
    }
    const tamedMounts=c=>(c.items||[]).filter(i=>i.itemType==="mount"&&i.tamedBy===c.id&&mountRows.has(i.mountCode));
    const untamedMounts=c=>(c.items||[]).filter(i=>i.itemType==="mount"&&i.tamedBy!==c.id&&mountRows.has(i.mountCode));
    const flies=c=>Boolean(engine.skillFlies?.(unitOf(c)));
    const elemental=(c,element)=>{ const p=engine.elementalProtection?.(unitOf(c),element); return p?num(p.resistance)+num(p.armor):0; };

    function measure(c,ctx){
      const foe=ctx.foe;
      const attacks=attacksOf(c,foe);
      const bestAttack=Math.max(0,...Object.values(attacks.best).map(a=>a.value));
      return {
        attacks,bestAttack,charge:chargeValue(c,foe),
        heal:healValue(c),
        supportSpells:sumCast(c,t=>t.startsWith("role/soutien")),supportItems:auraItems(c).length,
        support:sumCast(c,t=>t.startsWith("role/soutien"))+auraItems(c).length,
        protectSpells:sumCast(c,t=>t.startsWith("role/protection")),solidity:solidity(c,foe),
        hinderSpells:sumCast(c,t=>t.startsWith("role/entrave")),intimidation:stat(c,"Intimidation"),
        control:sumCast(c,t=>t==="role/controle-du-terrain"),
        commandSpells:sumCast(c,t=>t==="role/commandement"),
        commandItems:auraItems(c).filter(i=>weaponByName.get(i.name)?.aura_caracteristique==="Courage").length,
        aura:(ctx.captain?captainAura.courage:aura.courage)*stat(c,"Courage")+(ctx.captain?captainAura.charisme:aura.charisme)*stat(c,"Charisme"),
        grade:Boolean(ctx.captain||ctx.officer),
        stealth:num(engine.effectiveStealth?engine.effectiveStealth(unitOf(c)):stat(c,"Discrétion")),perception:stat(c,"Perception"),
        raven:sumCast(c,t=>t==="role/eclaireur"),
        schools:schoolsOf(c),
        animal:tamedMounts(c).length?stat(c,"Compagnon animal"):0,
        regeneration:num(c.skills?.physiology?.["Régénération"]),
        flies:flies(c),
        speed:num(engine.effectiveSpeed?engine.effectiveSpeed(unitOf(c)):stat(c,"Vitesse")),
        resist:{feu:elemental(c,"feu"),froid:elemental(c,"froid"),foudre:elemental(c,"foudre")}
      };
    }

    // ---- Les camps : traits relevés dans les fiches ennemies (dynamiques) ----
    function missionTypes(state,level){
      const out=[];
      for(const faction of campFactions()){
        const list=archetypes.filter(a=>a.faction===faction);
        out.push({id:T(tags.childNamed("occupation/mission/camps",faction)),faction,kind:"camp",sheets:list,foe:referenceEnemy(level,faction)});
      }
      for(const def of (reference?.oneShotMissions?.missions||[]).filter(m=>m.bete)){
        const sheet=mountRows.get(def.bete.code);
        if(!sheet) continue;
        const count=num(def.bete.des)*(num(def.bete.faces)+1)/2+(def.bete.plus?num(def.bete.plus.des)*(num(def.bete.plus.faces)+1)/2:0);
        out.push({id:T(tags.childNamed("occupation/mission/chasses",def.bete.faction)),faction:def.bete.faction,kind:"chasse",
          sheets:[sheet],count,foe:missions.createMount?unitOf(missions.createMount(sheet.code)):null});
      }
      return out.filter(m=>m.id);
    }
    // La part des fiches qui ont un trait ; les dégâts subis par type ; les types qui passent le mieux les armures.
    function traitsOf(type){
      const sheets=type.sheets,n=Math.max(1,sheets.length);
      const share=test=>sheets.filter(test).length/n;
      const phys=s=>s.physiologie||{};
      const t={
        mort_vivant:share(s=>s.mort_vivant),
        insensible_poison:share(s=>s.insensible_poison),
        immunite_physique:share(s=>s.immunite_physique),
        vol:share(s=>s.vol||phys(s).Vol===true),
        regeneration:share(s=>num(s.regeneration)>0||num(phys(s)["Régénération"])>0),
        monture:share(s=>s.monture),
        sorts:share(s=>Array.isArray(s.sorts)&&s.sorts.length)
      };
      const factors={};
      for(const s of sheets) for(const [type2,f] of Object.entries(s.degats_subis||{})) (factors[type2]=factors[type2]||[]).push(num(f,1));
      t.degats_subis=Object.fromEntries(Object.entries(factors).map(([k,v])=>[k,v.reduce((a,b)=>a+b,0)/n+(n-v.length)/n]));
      const resist={};
      for(const type2 of Object.keys(PHYSICAL)){
        const values=sheets.map(s=>armorRows.find(a=>a.nom===s.armure)).filter(Boolean).map(a=>num(a["resistance_"+type2]));
        resist[type2]=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
      }
      t.armures=resist;
      t.nombreux=type.count||0;
      return t;
    }
    // Les traits qui distinguent ce type de mission des autres : plus fréquents que la moyenne.
    function distinctive(types){
      const all=types.map(traitsOf);
      const mean=key=>all.reduce((s,t)=>s+num(t[key]),0)/Math.max(1,all.length);
      const hunts=types.filter(t=>t.kind==="chasse");
      const meanCount=hunts.reduce((s,t)=>s+num(t.count),0)/Math.max(1,hunts.length);
      return types.map((type,i)=>{
        const t=all[i],out=[];
        for(const key of ["mort_vivant","insensible_poison","immunite_physique","vol","regeneration","monture","sorts"]) if(num(t[key])>0&&num(t[key])>mean(key)+1e-9) out.push({code:key});
        for(const [dtype,f] of Object.entries(t.degats_subis)) if(f>1.05) out.push({code:"degats_subis",type:dtype});
        // Armures : le type qui passe le mieux leurs armures, s'il passe nettement mieux qu'ailleurs.
        const avg=type2=>{ const v=all.map(x=>x.armures[type2]).filter(x=>x!=null); return v.length?v.reduce((a,b)=>a+b,0)/v.length:null; };
        const gaps=Object.keys(PHYSICAL).map(type2=>{ const own=t.armures[type2],ref=avg(type2); return own!=null&&ref>0?{type2,ratio:own/ref}:null; })
          .filter(Boolean).sort((x,y)=>x.ratio-y.ratio);
        if(gaps[0]&&gaps[0].ratio<=0.8) out.push({code:"armures",type:gaps[0].type2});
        if(type.kind==="chasse"&&num(t.nombreux)>meanCount+1e-9) out.push({code:"nombreux"});
        return {...type,traits:out};
      });
    }
    // La valeur de sa réponse à un trait. Ses attaques : celles des genres qui comptent (« il peut tirer à l'arc mais touche
    // jamais… non »), à au moins les trois quarts de la meilleure de leur genre.
    function answerValue(code,trait,m,c){
      const genres=new Set((m.counted||[]).map(a=>a.genre));
      const attacks=m.attacks.list.filter(a=>genres.has(a.genre)&&a.value>=THREE_QUARTERS*num(m.attacks.best[a.genre]?.value));
      if(code==="anti_morts_vivants") return sumCast(c,t=>t==="role/degats/anti-morts-vivants");
      if(code==="anti_soins") return sumCast(c,t=>t==="role/entrave/anti-soins");
      if(code==="anti_magie") return sumCast(c,t=>t==="role/entrave/anti-magie");
      if(code==="magie") return Math.max(0,...attacks.filter(a=>a.genre==="magie").map(a=>a.value));
      if(code==="distance") return Math.max(0,...attacks.filter(a=>a.genre==="distance"||(a.genre==="magie"&&a.tags.includes("role/degats/a-distance"))).map(a=>a.value));
      if(code==="contre_charge") return Math.max(0,...attacks.filter(a=>a.counterCharge).map(a=>a.value));
      if(code==="de_zone") return Math.max(0,...attacks.filter(a=>a.zone||(a.tags||[]).includes("role/degats/de-zone")).map(a=>a.value));
      if(code==="type"&&trait.type) return Math.max(0,...attacks.filter(a=>(a.types||[]).includes(trait.type)||(a.tags||[]).includes("role/degats/"+TYPE_TAG[trait.type])).map(a=>a.value));
      return 0;
    }

    // ---- Les rôles ----
    function scoreOf(m,key){
      if(key==="degats") return m.bestAttack;
      if(key==="soin") return m.heal;
      if(key==="soutien") return m.support;
      if(key==="controle-du-terrain") return m.control;
      if(key==="magie") return Math.max(0,...Object.values(m.schools));
      if(key==="animal") return m.animal;
      if(key==="regeneration") return m.regeneration;
      return 0;
    }
    // Rôle → s'il le tient (doc 20 §6), puis sa place parmi ceux de la bande qui le tiennent (les rôles à plusieurs
    // sources : sa meilleure place, et d'où elle vient — magie, carac, objet, grade), le vol en plus.
    function roleTable(members,ms,band){
      const B=band.map(c=>ms.get(c.id));
      const all=fn=>B.map(fn);
      const pBest=all(m=>m.bestAttack),pSolid=all(m=>m.solidity),pIntim=all(m=>m.intimidation);
      const pAura=all(m=>m.aura),pStealth=all(m=>m.stealth),pPerc=all(m=>m.perception);
      const scout=m=>(placeAmong(pStealth,m.stealth)+placeAmong(pPerc,m.perception))/2;
      const holdsOf=new Map();
      for(const c of members){
        const m=ms.get(c.id);
        holdsOf.set(c.id,{
          degats:m.bestAttack>0&&placeAmong(pBest,m.bestAttack)>=MEDIAN,
          soin:m.heal>0,
          soutien:m.support>0,
          protection:m.protectSpells>0||placeAmong(pSolid,m.solidity)>=MEDIAN,
          entrave:m.hinderSpells>0||(m.intimidation>0&&placeAmong(pIntim,m.intimidation)>=TOP_QUARTER),
          "controle-du-terrain":m.control>0,
          commandement:m.grade||m.commandSpells>0||m.commandItems>0||placeAmong(pAura,m.aura)>=MEDIAN,
          eclaireur:m.raven>0||scout(m)>=MEDIAN,
          magie:Object.keys(m.schools).length>0,
          animal:m.animal>0,
          regeneration:m.regeneration>0
        });
      }
      const holders=key=>band.filter(c=>holdsOf.get(c.id)[key]).map(c=>ms.get(c.id));
      const among=(list,fn,m)=>placeAmong(list.map(fn).filter(v=>v>0),fn(m));
      // Ses sources pour un rôle : [d'où, place].
      const sources=(key,m)=>{
        if(key==="protection") return [["carac",placeAmong(pSolid,m.solidity)],["magie",m.protectSpells>0?among(B,x=>x.protectSpells,m):0]];
        if(key==="entrave") return [["carac",placeAmong(pIntim,m.intimidation)],["magie",m.hinderSpells>0?among(B,x=>x.hinderSpells,m):0]];
        if(key==="commandement") return [["carac",placeAmong(pAura,m.aura)],["magie",m.commandSpells>0?among(B,x=>x.commandSpells,m):0],
          ["objet",m.commandItems>0?100:0],["grade",m.grade?100:0]];
        if(key==="eclaireur") return [["carac",scout(m)],["magie",m.raven>0?among(B,x=>x.raven,m):0]];
        const pct=placeAmong(holders(key).map(x=>scoreOf(x,key)),scoreOf(m,key));
        if(key==="degats") return [[m.attacks.best.magie&&m.attacks.best.magie.value>=m.bestAttack?"magie":"arme",pct]];
        if(key==="soutien") return [[m.supportSpells>0?"magie":"objet",pct]];
        if(key==="animal"||key==="regeneration") return [["carac",pct]];
        return [["magie",pct]];
      };
      const out=new Map();
      for(const c of members){
        const m=ms.get(c.id),roles={};
        for(const [key,on] of Object.entries(holdsOf.get(c.id))){
          if(!on) continue;
          const [source,pct]=sources(key,m).sort((a,b)=>b[1]-a[1])[0];
          const bonus=m.flies?seuil("vol_bonus",25):0;
          roles[key]={pct:Math.min(100,pct+bonus),raw:pct,source,holders:holders(key).length};
        }
        out.set(c.id,roles);
      }
      return out;
    }

    // ---- L'équipement : essayer une arme, une armure ----
    function withItems(c,changes){
      const items=(c.items||[]).filter(i=>!changes.drop?.(i));
      const slots={...(c.equipment?.slots||{})};
      for(const [slot,item] of Object.entries(changes.put||{})){
        if(item){ items.push(item); slots[slot]=item.id; } else slots[slot]=null;
      }
      return {...c,items,equipment:{...(c.equipment||{}),slots}};
    }
    const currentTier=(c,slot)=>{ const id=c.equipment?.slots?.[slot]; return num((c.items||[]).find(i=>i.id===id)?.tier,1)||1; };
    const weaponItem=(name,tier,suffix="")=>({id:"steward-w-"+name+suffix,name,itemType:"weapon",tier,qualityCode:null,category:familyOf(name),
      grip:weaponByName.get(name)?.prise||null});
    // Ses dégâts avec cette arme dans le set 1 (main secondaire : off ; deux mains : twoHands).
    function tryWeapon(c,name,foe,{off=null,twoHands=false}={}){
      const tier=currentTier(c,"weapon_set_1_main");
      const main=weaponItem(name,tier),second=off?weaponItem(off,tier,"-off"):null;
      const clone=withItems(c,{put:{weapon_set_1_main:main,weapon_set_1_off:second}});
      if(twoHands) clone.twoHandGrip=true;
      const ranged=engine.isRangedWeapon(weaponByName.get(name));
      return num(profile.setDamage(clone,1,ranged,foe));
    }
    function trySolidity(c,foe,{weapon=null,shield=null,armor=undefined}={}){
      const put={};
      if(weapon) put.weapon_set_1_main=weaponItem(weapon,currentTier(c,"weapon_set_1_main"));
      if(shield) put.weapon_set_1_off=weaponItem(shield,currentTier(c,"weapon_set_1_main"),"-shield");
      if(armor!==undefined) put.armor=armor;
      return solidity(withItems(c,{put}),foe);
    }
    const armorItem=(row,tier)=>row?{id:"steward-a-"+row.code,name:row.nom,itemType:"armor",tier,qualityCode:null,templateId:"armor:"+row.code}:null;

    // ---- L'évaluation de toute la compagnie ----
    function evaluate(state,{level=1}={}){
      const company=state?.company;
      if(!company) return new Map();
      const roster=(company.roster||[]).filter(c=>c&&!c.dead&&c.stats);
      const postHolders=new Set([company.intendantId,company.medicId,...(campPosts?.POSTS||[]).map(p=>company[p.key+"Id"])].filter(x=>x!=null));
      const band=roster.filter(c=>!postHolders.has(c.id));
      const officers=new Set(company.lieutenantIds||[]);
      const foe=referenceEnemy(level);
      const ms=new Map(roster.map(c=>[c.id,measure(c,{foe,captain:c.id===company.captainId,officer:officers.has(c.id)})]));
      const B=band.map(c=>ms.get(c.id));
      for(const m of ms.values()) m.counted=countedAttacks(null,m,B);
      const roles=roleTable(roster,ms,band);
      const out=new Map();
      const result=c=>{ if(!out.has(c.id)) out.set(c.id,{tags:[],facts:{}}); return out.get(c.id); };
      const put=(c,id)=>{ if(!id||!tags.has(id)) return; const r=result(c).tags; if(!r.includes(id)) r.push(id); };

      // Rôle principal, Mission, « les meilleurs ».
      const meilleur=new Set(),eligible=new Set(),main=new Map();
      // Mission : rôle par rôle, pas dans les 20 % les moins bons de ceux de la bande qui le tiennent (arrondi vers le bas).
      const holderPcts=key=>band.map(x=>roles.get(x.id)?.[key]?.pct).filter(v=>v!=null);
      for(const c of roster){
        for(const [key,r] of Object.entries(roles.get(c.id)||{})){
          const list=holderPcts(key),k=Math.floor(seuil("mission_bas",0.2)*list.length);
          if(below(list,r.pct)>=k) eligible.add(c.id);
        }
      }
      for(const c of roster){
        const own=roles.get(c.id)||{};
        const entries=Object.entries(own);
        const best=entries.sort((a,b)=>b[1].pct-a[1].pct)[0];
        if(best) main.set(c.id,best[0]);
        if(entries.some(([,r])=>r.pct>=seuil("meilleur",TOP_QUARTER))) meilleur.add(c.id);
        result(c).facts={main:best?.[0]||null,roles:Object.fromEntries(entries.map(([k,r])=>[k,Math.round(r.pct)])),sources:Object.fromEntries(entries.map(([k,r])=>[k,r.source])),meilleur:meilleur.has(c.id),
          eligible:eligible.has(c.id)};
      }

      // Rôle au combat.
      for(const c of roster){
        const own=roles.get(c.id)||{},m=ms.get(c.id);
        for(const key of Object.keys(own)) put(c,"role/"+key);
        // Sous-tags des sorts qui comptent pour leur rôle.
        for(const known of knownSpells(c)){
          for(const id of spellTags(known.code)){
            const key=id.split("/")[1];
            if(key==="degats"||!own[key]) continue;
            if(castP(c,known.code)<=0) continue;
            put(c,id);
          }
        }
        if(own.entrave&&m.intimidation>0&&placeAmong(B.map(x=>x.intimidation),m.intimidation)>=TOP_QUARTER) put(c,"role/entrave/demoralisateur");
        if(own.soutien||own.commandement) for(const item of auraItems(c)){
          if(own.soutien) put(c,"role/soutien/enchantements");
          if(own.commandement&&weaponByName.get(item.name)?.aura_caracteristique==="Courage") put(c,"role/commandement");
        }
        if(own.protection) for(const [element,tag] of [["feu","contre-le-feu"],["froid","contre-le-froid"],["foudre","contre-la-foudre"]]){
          if(placeAmong(B.map(x=>x.resist[element]),m.resist[element])>=TOP_QUARTER&&m.resist[element]>0)
            put(c,"role/protection/protection-elementaire/"+tag);
        }
        // Magie : les écoles qui comptent (3 au plus).
        if(own.magie){
          const schools=Object.entries(m.schools).sort((a,b)=>b[1]-a[1]),top=schools[0]?.[1]||0;
          const mages=B.filter(x=>Object.keys(x.schools).length);
          const keep=schools.filter(([school,v],i)=>i===0||v>=THREE_QUARTERS*top||placeAmong(mages.filter(x=>x.schools[school]!=null).map(x=>x.schools[school]),v)>=MEDIAN)
            .slice(0,seuil("ecoles_max",3));
          result(c).facts.schools=keep.map(([s])=>s);
          for(const [school] of keep) put(c,T(tags.childNamed("role/magie",school)));
        }
        if(own.animal) for(const item of tamedMounts(c)){
          const sheet=mountRows.get(item.mountCode);
          put(c,T(tags.childNamed(tags.childNamed("role/animal",sheet.espece)||"",sheet.nom)));
        }
        if(m.flies) put(c,"role/vol");
        // Dégâts : ses attaques qui comptent.
        const counted=m.counted;
        result(c).facts.attacks=counted.map(a=>a.genre+":"+(a.weapon||a.spell));
        if(own.degats){
          for(const a of counted){
            if(a.genre==="distance") put(c,"role/degats/a-distance");
            if(a.zone) put(c,"role/degats/de-zone");
            for(const type of a.types||[]) put(c,"role/degats/"+TYPE_TAG[type]);
            for(const id of a.tags||[]) if(id.startsWith("role/degats/")) put(c,id);
          }
          if(counted.some(a=>a.genre==="contact")&&m.charge>0&&placeAmong(B.map(x=>x.charge),m.charge)>=TOP_QUARTER) put(c,"role/degats/charge");
        }
        // Anti morts-vivants, anti invocations : des sorts faits pour eux.
        for(const known of knownSpells(c)) for(const id of spellTags(known.code))
          if(/anti-morts-vivants|anti-invocations/.test(id)&&own.degats&&castP(c,known.code)>0) put(c,id);
      }

      // Occupations.
      const types=distinctive(missionTypes(state,level));
      const repLevel=c=>num(stars?.personal?.(c.reputation)?.level,1);
      const bandGain=B.length?band.map(c=>stat(c,"Charisme")*(1+0.2*repLevel(c))):[];
      for(const c of roster){
        const m=ms.get(c.id),best=meilleur.has(c.id),ok=eligible.has(c.id);
        if(ok) put(c,"occupation/mission");
        // Camps et chasses : une réponse à un trait qui distingue ce type, au-dessus de la médiane de ceux de la bande qui
        // ont cette réponse (sinon l'avoir suffirait).
        const camps=[];
        for(const type of types){
          for(const trait of type.traits){
            const def=(D.traits||[]).find(t=>t.code===trait.code);
            for(const answer of def?.reponses||[]){
              const value=answerValue(answer,trait,m,c);
              if(!(value>0)) continue;
              const values=band.map(x=>answerValue(answer,trait,ms.get(x.id),x)).filter(v=>v>0);
              if(placeAmong(values,value)>=MEDIAN){ put(c,type.id); camps.push({type,trait,answer}); }
            }
          }
        }
        result(c).facts.camps=[...new Set(camps.map(x=>x.type.faction))];
        if(!best){
          if(repLevel(c)>=level+seuil("garde_ecart",-4)) put(c,"occupation/garde-du-corps");
          if(built(state,"pleasure_palace")&&placeAmong(bandGain,stat(c,"Charisme")*(1+0.2*repLevel(c)))>=MEDIAN) put(c,"occupation/job/palais-des-plaisirs");
          if(!ok&&built(state,"lumber_camp")) put(c,"occupation/job/bucheron");
          if(!ok&&built(state,"miners_guild")) put(c,"occupation/job/mines");
        }
      }

      // Équipement et Entraînement (ils découlent du rôle : « il faut déjà connaître le rôle »).
      for(const c of roster) equipmentAndTraining(state,c,{m:ms.get(c.id),own:roles.get(c.id)||{},mainKey:main.get(c.id),B,band,ms,types,put,result,foe,level});

      // Postes : les 3 meilleurs de la compagnie pour ce que demande le poste, pas trop bons au combat.
      postTags(state,roster,ms,meilleur,put);
      return out;
    }

    // Ses attaques qui comptent : la meilleure de chaque genre, si elle atteint les trois quarts de sa meilleure attaque ou
    // si elle est au-dessus de la médiane de ceux de la bande qui attaquent ainsi.
    function countedAttacks(c,m,B){
      const top=m.bestAttack;
      return Object.values(m.attacks.best).filter(a=>{
        if(!(a.value>0)) return false;
        if(a.value>=THREE_QUARTERS*top) return true;
        const values=B.map(x=>x.attacks.best[a.genre]?.value).filter(v=>v>0);
        return placeAmong(values,a.value)>=MEDIAN;
      });
    }

    function equipmentAndTraining(state,c,{m,own,mainKey,B,band,ms,types,put,result,foe,level}){
      const bonusNames=new Set((tags.node("equipment/caracteristiques")?.enfants||[]).map(n=>n.nom));
      const counted=m.counted;
      const facts=result(c).facts;
      // Ce qui sert chaque rôle (steward-tags.json, usages), d'après d'où il le tient.
      const sourceOf=key=>own[key]?.source||null;
      const usageKeys=key=>{
        const src=sourceOf(key);
        if(key==="degats") return counted.map(a=>a.genre==="magie"?"magie":a.genre);
        if(key==="entrave") return src==="magie"?["magie"]:["demoralisateur"];
        if(key==="protection") return src==="magie"?["magie"]:["protection"];
        if(key==="commandement") return src==="magie"?["magie"]:src==="objet"?[]:["commandement"];
        if(key==="eclaireur") return src==="magie"?["magie"]:["eclaireur"];
        if(key==="animal") return ["animal"];
        if(key==="regeneration") return [];
        return src==="magie"?["magie"]:[];
      };
      const schools=facts.schools||Object.keys(m.schools);
      const expand=name=>name==="@ecole"?schools:name==="@arme"?[counted.find(a=>a.genre==="contact")?.family].filter(Boolean)
        :name==="@tir"?[counted.find(a=>a.genre==="distance")?.family].filter(Boolean):[name];
      // Caractéristiques : celles de son rôle principal (« On renforce son rôle »).
      if(mainKey){
        for(const usage of usageKeys(mainKey)) for(const name of (D.usages?.[usage]||[]).flatMap(expand))
          if(bonusNames.has(name)) put(c,T(tags.childNamed("equipment/caracteristiques",name)));
      }

      // Le profil : deux cachés (Soutien : son rôle principal vient de sa magie ; Pur distance : il tire, il est mauvais au
      // corps à corps et assez rapide pour fuir — pas un protecteur, qui ne fuit pas), sinon son meilleur style visible.
      const styleNodes=tags.node("equipment/style-de-combat")?.enfants||[];
      const topStyle=styleNodes.map(n=>({n,v:num(c.skills?.martial?.[n.competence])})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v)[0]||null;
      const bestGenre=Object.values(m.attacks.best).sort((a,b)=>b.value-a.value)[0]?.genre||null;
      const contactValues=B.map(x=>x.attacks.best.contact?.value).filter(v=>v>0);
      const speedPlace=placeAmong(B.map(x=>x.speed),m.speed);
      const support=sourceOf(mainKey)==="magie";
      const pureRange=!support&&mainKey!=="protection"&&bestGenre==="distance"&&placeAmong(contactValues,m.attacks.best.contact?.value||0)<MEDIAN&&speedPlace>=MEDIAN;
      const visibleStyle=topStyle?.n||styleNodes.find(n=>n.competence==="Combat à une main")||null;
      const profileName=support?"soutien":pureRange?"pur_distance":(visibleStyle?.competence||null);
      facts.profile=profileName;
      // Style de combat : le style conseillé (les profils cachés n'en ont pas).
      if(!support&&!pureRange&&visibleStyle) put(c,visibleStyle.id);
      const weaponTag=name=>{ const fam=familyOf(name); return fam?T(tags.childNamed(tags.childNamed("equipment/arme",fam)||"",name)):null; };
      const shieldTag=name=>T(tags.childNamed("equipment/style-de-combat/bouclier",name));
      const melee=weaponRows.filter(w=>engine.isMeleeWeapon(w)&&!engine.isRangedWeapon(w)&&familyOf(w.nom)!=="Boucliers");
      const ranged=weaponRows.filter(w=>engine.isRangedWeapon(w));
      const bestOf=(list,fn)=>list.map(w=>({w,v:fn(w)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v)[0]?.w||null;
      const weapons=[];
      if(support){
        // Une arme qui sert sa magie : son école, puis la Puissance magique, le mana ; le Fouet pour un meneur.
        const wanted=[...(mainKey==="commandement"?["Charisme"]:[]),...schools,"Puissance magique","Réserve de mana"];
        for(const target of wanted){
          const w=weaponRows.find(x=>x.bonus_caracteristique===target);
          if(w){ weapons.push(w.nom); break; }
        }
      }else if(pureRange){
        const bow=bestOf(ranged,w=>tryWeapon(c,w.nom,foe));
        if(bow) weapons.push(bow.nom);
        const dagger=bestOf(melee.filter(w=>familyOf(w.nom)==="Lames courtes"),w=>tryWeapon(c,w.nom,foe));
        if(dagger) weapons.push(dagger.nom);
      }else{
        const twoHands=profileName==="Combat à deux mains";
        const fits=w=>twoHands?(w.prise==="2 mains"||w.prise==="Au choix"):(w.prise==="1 main"||w.prise==="Au choix");
        const candidates=melee.filter(fits);
        const off=profileName==="Combat à deux armes";
        const evalWeapon=(w,enemy)=>tryWeapon(c,w.nom,enemy,{twoHands:twoHands&&w.prise==="Au choix",off:off?w.nom:null});
        // Son rôle principal vient d'un objet (le fouet et son aura) : il le garde.
        const kept=sourceOf(mainKey)==="objet"?weaponByName.get(auraItems(c)[0]?.name):null;
        const main=kept||bestOf(candidates,w=>evalWeapon(w,foe));
        if(main) weapons.push(main.nom);
        // Un camp tagué peut changer le choix (la masse contre les squelettes) : sa meilleure arme contre ce camp, s'il est
        // au-dessus de la médiane de la bande dans sa famille.
        for(const type of types){
          if(!result(c).tags.includes(type.id)||!type.foe) continue;
          const alt=bestOf(candidates,w=>evalWeapon(w,type.foe));
          if(!alt||alt.nom===main?.nom) continue;
          const fam=familyOf(alt.nom),mine=num(c.skills?.martial?.[fam]);
          if(mine>0&&placeAmong(band.map(x=>num(x.skills?.martial?.[fam])).filter(v=>v>0),mine)>=MEDIAN) weapons.push(alt.nom);
        }
        if(profileName==="Boucliers"&&main){
          const shields=weaponRows.filter(w=>familyOf(w.nom)==="Boucliers");
          const shield=bestOf(shields,w=>trySolidity(c,foe,{weapon:main.nom,shield:w.nom}));
          if(shield) put(c,shieldTag(shield.nom));
        }
        // Le deuxième jeu d'armes : une arme à distance, si son tir compte.
        if(counted.some(a=>a.genre==="distance")){
          const bow=bestOf(ranged,w=>tryWeapon(c,w.nom,foe));
          if(bow) weapons.push(bow.nom);
        }
      }
      for(const name of weapons) put(c,weaponTag(name));
      facts.weapons=weapons;

      // L'armure : celle qui lui donne la meilleure valeur dans son rôle principal (à égalité, le suivant). Sa solidité :
      // contre l'ennemi type de chaque camp (moyenne géométrique), pas un seul adversaire (un canonnier rend toute armure
      // inutile).
      const panel=[...new Set(types.filter(t=>t.kind==="camp"&&t.foe).map(t=>t.foe))];
      const panelSolidity=clone=>{
        const list=panel.length?panel:[foe];
        return Math.exp(list.reduce((sum,f)=>sum+Math.log(Math.max(1e-6,solidity(clone,f))),0)/list.length);
      };
      const portLevel=armorPorts?armorPorts.portLevel(c):3;
      const classes=["Légère","Intermédiaire","Lourde"];
      const allowed=lvlMax=>armorRows.filter(a=>a.type_armure==="Vêtement"||classes.indexOf(a.type_armure)+1<=lvlMax);
      const tier=currentTier(c,"armor");
      const roleOrder=Object.entries(own).sort((a,b)=>b[1].pct-a[1].pct).map(([k])=>k);
      const roleMeasure=(key,clone)=>{
        if(sourceOf(key)==="magie") return knownSpells(clone).reduce((s,k)=>s+castP(clone,k.code),0);
        if(key==="degats") return attacksOf(clone,foe).list.reduce((best,a)=>Math.max(best,a.value),0);
        if(key==="eclaireur") return num(engine.effectiveStealth?engine.effectiveStealth(unitOf(clone)):0)+stat(clone,"Perception");
        return panelSolidity(clone);
      };
      const bestArmor=lvlMax=>{
        let pick=null,score=null;
        for(const a of allowed(lvlMax)){
          const clone=withItems(c,{put:{armor:armorItem(a,tier)}});
          const s=roleOrder.slice(0,2).map(k=>roleMeasure(k,clone));
          if(!s.length) s.push(panelSolidity(clone));
          if(!score||s[0]>score[0]*1.01||(Math.abs(s[0]-score[0])<=score[0]*0.01&&(s[1]||0)>(score[1]||0))){ pick=a; score=s; }
        }
        return {pick,score};
      };
      const now=bestArmor(portLevel);
      if(now.pick){
        const classId=now.pick.type_armure==="Vêtement"?"equipment/armure":tags.childNamed("equipment/armure",now.pick.type_armure);
        put(c,T(tags.childNamed(classId||"",now.pick.nom)));
        facts.armor=now.pick.nom;
      }

      // Entraînement : ses faiblesses utiles (les 3 plus basses de ce qui sert son rôle principal), là où le camp entraîne.
      const trainable=new Set();
      for(const [code,b] of buildingRows){ if(!built(state,code)) continue; if(b.entraine) trainable.add(b.entraine); if(b.ecole) trainable.add(b.ecole); }
      const trainingId=name=>T(tags.childNamed("occupation/entrainement",name));
      if(mainKey){
        const names=[...new Set(usageKeys(mainKey).flatMap(u=>(D.usages?.[u]||[]).flatMap(expand)))].filter(n=>trainable.has(n)&&trainingId(n));
        const valueOf=(x,n)=>n in (x.skills?.magic||{})?num(engine.statWithGear(unitOf(x),n)):stat(x,n)||num(x.skills?.martial?.[n]);
        const weak=names.map(n=>({n,p:placeAmong(band.map(x=>valueOf(x,n)),valueOf(c,n))})).sort((a,b)=>a.p-b.p).slice(0,seuil("faiblesses",3));
        for(const {n} of weak) put(c,trainingId(n));
        facts.training=weak.map(w=>w.n);
      }
      // Le style conseillé, s'il s'entraîne au camp.
      if(!support&&!pureRange&&visibleStyle&&trainable.has(visibleStyle.competence)) put(c,trainingId(visibleStyle.competence));
      // Un port d'armure : si une armure plus lourde que celles qu'il sait porter le rendait plus efficace, le port suivant
      // (l'Académie les fait apprendre dans l'ordre).
      if(portLevel<3&&built(state,"survival_academy")&&now.score){
        const heavier=bestArmor(3);
        if(heavier.pick&&classes.indexOf(heavier.pick.type_armure)+1>portLevel&&heavier.score[0]>now.score[0]*1.01)
          put(c,trainingId("Port d’armure "+classes[portLevel].toLocaleLowerCase("fr")));
      }
      // Des sorts de ses écoles qui servent son rôle principal (l'École de magie construite).
      if(mainKey&&built(state,"magic_school")){
        const knownCodes=new Set(knownSpells(c).map(s=>s.code));
        const want="role/"+mainKey;
        const learn=[...spellRows.values()].filter(s=>schools.includes(s.ecole)&&!knownCodes.has(s.code)&&(s.tags||[]).some(t=>t===want||t.startsWith(want+"/")))
          .slice(0,seuil("sorts_a_apprendre",3));
        for(const s of learn) put(c,T(tags.childNamed(trainingId(s.ecole)||"",s.nom)));
      }
      // Ses montures à apprivoiser (la Grange du dresseur).
      if(built(state,"trainer_barn")) for(const item of untamedMounts(c)){
        const sheet=mountRows.get(item.mountCode);
        put(c,T(tags.childNamed(trainingId(sheet.espece)||"",sheet.nom)));
      }
    }

    function postTags(state,roster,ms,meilleur,put){
      const company=state.company;
      const candidates=roster.filter(c=>c.id!==company.captainId);
      for(const def of D.postes||[]){
        const id=T(tags.childNamed("occupation/poste",def.tag));
        if(!id) continue;
        let value,open=true;
        if(def.valeur==="aura_officier"){
          value=c=>aura.courage*stat(c,"Courage")+aura.charisme*stat(c,"Charisme");
          open=!lieutenants?.openPosts||num(lieutenants.openPosts(state))>0||(company.lieutenantIds||[]).length>0;
        }else if(String(def.valeur||"").startsWith("camp:")){
          const skill=def.valeur.slice(5);
          value=c=>num(c.skills?.camp?.[skill]);
        }else if(def.poste){
          const post=campPosts?.postByKey(def.poste);
          if(!post){ continue; }
          open=built(state,post.building);
          const hall=buildingRows.get(post.building);
          value=c=>{
            const lv=post.skill?num(engine.statWithGear(unitOf(c),post.skill)):def.poste==="director"
              ?Math.max(stat(c,"Puissance magique"),...Object.values(ms.get(c.id)?.schools||{}),0):hall?.entraine?stat(c,hall.entraine)||num(c.skills?.martial?.[hall.entraine]):0;
            return (1+lv/100)*(1+num(c.skills?.camp?.["Transmission du savoir"])/100);
          };
        }else continue;
        if(!open) continue;
        // Les 3 meilleurs de la compagnie pour ce poste ; ceux qui sont parmi les meilleurs au combat restent en mission.
        const pool=candidates.map(c=>({c,v:value(c)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,seuil("postes_meilleurs",3));
        for(const {c} of pool) if(def.meilleurs_admis||!meilleur.has(c.id)) put(c,id);
      }
    }

    return {evaluate,referenceEnemy,measure,placeAmong,missionTypes:(state,level)=>distinctive(missionTypes(state,level))};
  }

  return {createStewardTags,placeAmong};
});
