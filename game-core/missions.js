"use strict";

// Missions one shot (doc 17). V1 (Idan, 2026-10-24) : « Faire le ménage », un camp ennemi ☠ (gobelin ou orc, tiré au
// hasard ; Idan, 2026-11-01), seule mission proposée à la Taverne, en boucle. Module pur : l'offre du tableau et son ordre de mission, les ennemis fabriqués à partir de
// leurs fiches figées, le butin et la récompense. La campagne gère l'expédition
// (campaign.js), l'interface le combat.
// Données : one-shot-missions.json, enemy-archetypes.json, weapons.json, base-armors.json, skills.json,
// item-qualities.json.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMissions=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);
  function normalizeKey(value){
    return String(value??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/’/g,"'")
      .replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  }

  function createMissionRules({reference,random=Math.random}={}){
    const data=reference?.oneShotMissions||{};
    const archetypes=rows(reference?.enemyArchetypes);
    const byCode=new Map(archetypes.map(a=>[a.code,a]));
    const weapons=new Map(rows(reference?.weapons).map(w=>[w.nom,w]));
    const armors=new Map(rows(reference?.baseArmors).map(a=>[a.nom,a]));
    const skills=new Map(rows(reference?.skills).map(s=>[s.nom,s]));
    const qualityCode=new Map(rows(reference?.itemQualities).map(q=>[q.nom,q.code]));
    const die=sides=>1+Math.floor(random()*sides);
    const pick=list=>list.length?list[Math.floor(random()*list.length)]:"";
    function weighted(list){
      let r=random()*list.reduce((sum,x)=>sum+x.poids,0);
      for(const x of list){ if((r-=x.poids)<0) return x; }
      return list[list.length-1];
    }

    function definition(code="cleanup"){ return (data.missions||[]).find(m=>m.code===code)||null; }
    function archetype(code){ return byCode.get(code)||null; }
    function archetypeOf(faction,line,level){ return archetypes.find(a=>a.faction===faction&&a.ligne===line&&a.niveau===level)||null; }

    // Camps (Idan, 2026-11-01) : le peuple du camp est tiré au hasard (camps[], poids), chacun avec ses lignes et ses
    // noms. Points de combat : chaque fiche vaut ses points (enemy-archetypes.json, un mercenaire moyen = 10).
    function campsOf(def){ return Array.isArray(def?.camps)&&def.camps.length?def.camps:[]; }
    function points(code){ return Number(archetype(code)?.points)||0; }
    const randInt=(min,max)=>Math.min(max,min+Math.floor(random()*(max-min+1)));
    const clampLevel=n=>Math.min(15,Math.max(1,Math.round(Number(n)||1)));

    // Niveau de la mission (Idan, 2026-11-01) : niveau de Renommée de la compagnie (1 à 15 : 1 à 5 étoiles de bronze, puis
    // d'argent, puis d'or ; reputation-stars.json) + un écart tiré entre −3 et +2, chaque écart avec la même chance, borné
    // de 1 à 15.
    const starRows=[...rows(reference?.reputationStars)].sort((a,b)=>a.niveau-b.niveau);
    function renownLevel(renown){
      let level=1;
      for(const row of starRows) if((Number(renown)||0)>=Number(row.renommee_min)) level=Number(row.niveau)||level;
      return level;
    }
    function rollMissionLevel(def,renown){
      const [low,high]=def?.niveau?.ecart||[-3,2];
      return clampLevel(renownLevel(renown)+randInt(low,high));
    }

    // Budget par métal (Idan, 2026-11-01) : Bronze (niveaux 1 à 5) = tirage 40–60 × niveau ; Argent (6 à 10) = 60–80 ×
    // niveau ; Or (11 à 15) = niveau² × tirage 8–12 (puissance 2). Chaque métal a ses niveaux de monstres (Bronze
    // novice / normal 50–50 ; Argent novice / normal / vétéran 25–50–25 ; Or vétéran / élite 50–50) et son chef (chef 1,
    // chef 2, chef 3 ou 4). Le chef compte dans le budget.
    function budgetOf(def,level=1){
      const list=Array.isArray(def?.budgets)?def.budgets:[];
      return list.find(b=>level>=b.niveaux[0]&&level<=b.niveaux[1])||list[list.length-1]||null;
    }
    function rollBudget(tier,level){
      const [low,high]=tier?.facteur||[40,60];
      return randInt(low,high)*Math.pow(level,Number(tier?.puissance)||1);
    }
    // Niveau de mission minimum (Idan, 2026-11-01 : « un troll […] à partir de mission 2★ argent ») : une créature ne
    // sort que dans une mission de son niveau ou plus (1 à 15, comme les étoiles). Sans valeur : dès le niveau 1.
    function missionMin(arch){ return Math.max(1,Number(arch?.niveau_mission_min)||1); }
    function allowedAt(faction,line,level,missionLevel){
      const arch=archetypeOf(faction,line,level);
      return arch&&missionMin(arch)<=missionLevel?arch:null;
    }
    // Le camp : le chef, puis des ennemis (niveau selon le métal, ligne selon les poids du camp) tant que le total plus la
    // moitié du suivant reste dans le budget ; au plus max_ennemis (100).
    function rollCamp(def=definition(),camp=null,{level:missionLevel=1}={}){
      const chosen=camp||weighted(campsOf(def).map(c=>({...c,poids:Number(c.poids)||1})));
      const tier=budgetOf(def,missionLevel),budget=rollBudget(tier,missionLevel);
      const chiefLevel=weighted((tier?.chefs||[{niveau:"chef 1",poids:1}]).map(c=>({...c,poids:Number(c.poids)||1}))).niveau;
      const chief=archetypeOf(chosen.faction,"Chef",chiefLevel)?.code||archetypeOf(chosen.faction,"Chef","chef 1")?.code||null;
      const levels=(tier?.monstres||[{niveau:"novice",poids:1}]).map(m=>({...m,poids:Number(m.poids)||0}));
      const max=Number(def?.max_ennemis)||100;
      let total=points(chief);
      const enemies=[];
      while(enemies.length<max){
        const level=weighted(levels).niveau;
        const lines=(chosen.lignes||[]).filter(l=>allowedAt(chosen.faction,l.ligne,level,missionLevel));
        const code=lines.length?allowedAt(chosen.faction,weighted(lines).ligne,level,missionLevel).code:null;
        if(!code||total+points(code)/2>budget) break;
        enemies.push(code);
        total+=points(code);
      }
      return {faction:chosen.faction,campName:chosen.nom_camp||chosen.faction,enemies,chief,points:total,budget,names:chosen.noms||{}};
    }

    // Nombre d'ennemis annoncé dans l'ordre : flou par nature (± 2), en toutes lettres (doc 17 §9).
    function estimation(count){
      const list=data.noms?.estimations||[];
      const noisy=Math.max(1,count+die(5)-3);
      return (list.find(e=>noisy<=e.max)||list[list.length-1]||{texte:String(count)}).texte;
    }

    // Récompense du contrat (Idan, 2026-11-01) : base fixe (5 000) + tirage 30–40 × budget × niveau de la mission.
    function contractReward(def,budget,level){
      const r=def.recompense||{},[low,high]=r.facteur||[30,40];
      return (Number(r.base)||0)+randInt(low,high)*budget*level;
    }

    // Offre du tableau des contrats (doc 17 §1 et §9) : un des ordres validés pour cette mission et cette faction, tiré
    // au hasard, avec ses noms ; valable de 3 à 6 jours, après quoi une autre compagnie l'a prise. Niveau : celui de la
    // Renommée de la compagnie (renown) plus l'écart, ou level s'il est donné. Jours de marche : tirage 1 à niveau.
    function createOffer({day=1,code="cleanup",renown=0,level=null}={}){
      const def=definition(code);
      if(!def) return null;
      const missionLevel=level==null?rollMissionLevel(def,renown):clampLevel(level);
      const camp=rollCamp(def,null,{level:missionLevel}),distance=randInt(1,missionLevel),enemyCount=camp.enemies.length+1;
      const names=data.noms||{},tribes=names[camp.names.tribus||"tribus"]||[];
      const order=pick((data.ordres||[]).filter(o=>o.mission===def.code&&o.faction===camp.faction));
      const tribe=pick(tribes),target=pick(tribes.filter(t=>t!==tribe));
      const [minDays,maxDays]=def.validite_jours||[3,6];
      const fields={
        commanditaire:order.noms_commanditaire?pick(names[order.noms_commanditaire]||[]):"",
        lieu:pick(names.lieux||[]),jours:distance+(distance>1?" jours":" jour"),estimation:estimation(enemyCount),récompense:contractReward(def,camp.budget,missionLevel),
        boss:pick(names[camp.names.chefs||"caids"]||[]),tribu:tribe,tribu_cible:target,signataire:pick(names.signataires||[])
      };
      return {id:`${def.code}-${day}-${Math.floor(random()*1e9).toString(36)}`,code:def.code,name:def.nom,campName:camp.campName,faction:camp.faction,
        difficulty:missionLevel,level:missionLevel,day,expiresDay:day+minDays+Math.floor(random()*(maxDays-minDays+1)),distance,camp,enemyCount,
        reward:fields.récompense,order:order.code,fields};
    }

    // Texte de l'ordre : les accolades remplacées par les champs de l'offre et par extra (dates mises en forme,
    // récompense écrite à la française…).
    function orderText(offer,extra={}){
      const order=(data.ordres||[]).find(o=>o.code===offer?.order);
      if(!order) return null;
      const values={...offer.fields,...extra};
      const fill=text=>String(text).replace(/\{([^}]+)\}/g,(all,key)=>key in values?String(values[key]):all);
      return {title:order.titre,from:order.commanditaire,paragraphs:order.texte.map(fill),signature:fill(order.signature)};
    }

    // Un ennemi à partir de sa fiche figée (enemy-archetypes.json, doc 17 §10) : base = un personnage généré du même
    // peuple (nom, avatar, taille…), dont on remplace caractéristiques, résistances, PV, compétences et équipement.
    function applyArchetype(base,arch,{idPrefix="enemy",name}={}){
      const c=base;
      c.role=arch.nom;
      c.archetype=arch.code;
      c.name=name||arch.nom;
      c.stats={...c.stats,...arch.caracteristiques};
      c.resistances={...c.resistances,...arch.resistances};
      c.pvMax=c.pv=arch.pv;
      const martial={};
      for(const [key,value] of Object.entries(c.skills?.martial||{})) martial[key]=typeof value==="boolean"?false:0;
      Object.assign(martial,arch.competences_martiales);
      for(const port of arch.port_d_armure||[]) martial[port]=true;
      c.skills={...c.skills,martial,social:{...(c.skills?.social||{}),Intimidation:arch.intimidation}};
      let sequence=0;
      const item=payload=>({id:`${idPrefix}-${++sequence}`,owner:c.id??null,tier:arch.tier,
        qualityCode:qualityCode.get(arch.qualite)||null,qualityName:arch.qualite,...payload});
      const slots=Object.fromEntries(Object.keys(c.equipment?.slots||{}).map(key=>[key,null]));
      const items=[];
      arch.armes.forEach((name,k)=>{
        const weapon=weapons.get(name),slot=k===0?"weapon_set_1_main":"weapon_set_1_off";
        const it=item({templateId:"weapon:"+normalizeKey(name),name,itemType:"weapon",slot,category:skills.get(name)?.parent||null,
          combatFamily:/Armes de tir|Armes à feu/.test(String(weapon?.domaine||""))?"ranged":"melee",grip:weapon?.prise||null});
        items.push(it);
        slots[slot]=it.id;
      });
      const armor=armors.get(arch.armure);
      if(armor){
        const it=item({templateId:"armor:"+(armor.code||normalizeKey(armor.nom)),name:armor.nom,itemType:"armor",slot:"armor",
          category:armor.type_armure,description:armor.description||null});
        items.push(it);
        slots.armor=it.id;
      }
      c.items=items;
      c.equipment={...(c.equipment||{}),slots,profile:{...(c.equipment?.profile||{}),type:items[0]?.combatFamily||"melee"}};
      return c;
    }

    // Les ennemis du camp, chef en dernier : makeBase(archétype) donne le personnage de base. Les doublons sont numérotés
    // (« Frondeur gobelin novice 2 ») ; le chef porte le nom de l'offre.
    function buildEnemies(offer,makeBase){
      const codes=[...offer.camp.enemies,offer.camp.chief],seen=new Map();
      const total=new Map();
      for(const code of offer.camp.enemies) total.set(code,(total.get(code)||0)+1);
      return codes.map((code,index)=>{
        const arch=archetype(code);
        if(!arch) return null;
        const chief=index===codes.length-1;
        const n=(seen.get(code)||0)+1;
        seen.set(code,n);
        const name=chief?`${offer.fields.boss||arch.nom} (${arch.nom})`:total.get(code)>1?`${arch.nom} ${n}`:arch.nom;
        return applyArchetype(makeBase(arch),arch,{idPrefix:`${offer.id}-e${index}`,name});
      }).filter(Boolean);
    }

    // Butin par créature (Idan, 2026-11-01 ; enemy-archetypes.json, butin) : equipement = chance (%) de récupérer chaque
    // objet porté par un ennemi mort ; objets = tirages en plus, chacun avec sa chance ({type, nom, tier, chance}),
    // fabriqués par makeItem(type, nom, tier). Sans fiche ni valeur : tout l'équipement, rien en plus.
    function lootOf(arch){
      const b=arch?.butin||{};
      return {equipement:b.equipement==null?100:Number(b.equipement)||0,objets:Array.isArray(b.objets)?b.objets:[]};
    }
    function enemyLoot(c,makeItem){
      const b=lootOf(archetype(c?.archetype));
      const kept=(c?.items||[]).filter(()=>b.equipement>=100||random()*100<b.equipement);
      const extra=b.objets.filter(o=>random()*100<(Number(o.chance)||0)).map(o=>makeItem?makeItem(o.type,o.nom,Number(o.tier)||1):null).filter(Boolean);
      return [...kept,...extra];
    }

    // Issue (doc 17 §8). Victoire : récompense du contrat, coffre (or et objets), le butin des ennemis morts (selon leur
    // fiche) et l'équipement de nos morts, sans propriétaire. Défaite : rien, et la renommée baisse ; l'équipement de nos
    // morts est perdu.
    function outcome(offer,{victory,deadEnemies=[],deadMercenaries=[],chestItems=[],makeItem=null}={}){
      const def=definition(offer.code);
      if(!victory) return {victory:false,reward:0,chestGold:0,chestItems:[],loot:[],renown:Number(def.echec?.renommee)||0};
      const chestGold=rollChestGold(offer);
      const loot=[...deadEnemies.flatMap(c=>enemyLoot(c,makeItem)),...deadMercenaries.flatMap(c=>c.items||[])].map(it=>({...it,owner:null}));
      return {victory:true,reward:offer.reward,chestGold,chestItems:chestItems.map(it=>({...it,owner:null})),loot,renown:0};
    }

    function deathMultiplier(offer,victory){ return victory?1:Number(definition(offer.code)?.defaite?.multiplicateur_mort)||1; }
    // Coffre (Idan, 2026-11-01 : « la partie loterie du butin », fourchettes très larges) : or = tirage 1–100 × budget ×
    // niveau ÷ 2 ; objets par tier = ⌈dés × niveau ÷ diviseur⌉ − moins (au moins 0) : T1 1D6 × niveau, T2 1D3 × niveau,
    // T3 ⌈1D6 × niveau ÷ 5⌉, T4 ⌈1D6 × niveau ÷ 5⌉ − 2 ; la famille de chaque objet est tirée au hasard ; chaque sort
    // d'une seule école a niveau % de chance d'y être, en manuel.
    const monoSchoolSpells=rows(reference?.spells).filter(sp=>sp.ecole&&!String(sp.ecole).includes("/")&&!(Array.isArray(sp.ecoles)&&sp.ecoles.length>1));
    function offerLevel(offer){ return clampLevel(offer?.level??offer?.difficulty??1); }
    function rollChestGold(offer){
      const gold=definition(offer?.code)?.coffre?.or||{},[low,high]=gold.facteur||[1,100];
      return Math.floor(randInt(low,high)*(Number(offer?.camp?.budget)||0)*offerLevel(offer)/(Number(gold.diviseur)||1));
    }
    function chestPlan(offer){
      const chest=definition(offer?.code)?.coffre||{},level=offerLevel(offer),tiers=[];
      for(const o of chest.objets||[]){
        let dice=0;
        for(let i=0;i<(Number(o.des)||1);i++) dice+=die(Number(o.faces)||6);
        const count=Math.max(0,Math.ceil(dice*level/(Number(o.diviseur)||1)-1e-9)-(Number(o.moins)||0));
        for(let k=0;k<count;k++) tiers.push(Number(o.tier)||1);
      }
      const chance=(Number(chest.manuels?.chance_par_niveau)||0)*level;
      const manuals=chance>0?monoSchoolSpells.filter(()=>random()*100<chance).map(sp=>sp.code):[];
      return {tiers,manuals};
    }
    // Carte (Idan, 2026-11-01 : « une ambiance à la X-com ») : 30 × 15 cases pour les contrats.
    function mapSize(offer){ const map=definition(offer.code)?.carte||{}; return {cols:map.colonnes||30,rows:map.lignes||15}; }

    return {definition,archetype,points,missionMin,lootOf,campsOf,budgetOf,rollBudget,renownLevel,rollMissionLevel,rollCamp,estimation,contractReward,
      createOffer,orderText,applyArchetype,buildEnemies,outcome,deathMultiplier,rollChestGold,chestPlan,mapSize};
  }

  return {createMissionRules};
});
