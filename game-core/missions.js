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

    // Camps (Idan, 2026-11-01) : le peuple du camp est tiré au hasard (camps[], poids), chacun avec ses lignes, son chef et
    // ses noms. Points de combat : chaque fiche vaut ses points (enemy-archetypes.json, un mercenaire moyen = 10). Le camp
    // prend son chef, puis tire des ennemis (lignes selon leurs poids, « normal » avec chance_normal, sinon novice) tant que
    // le total se rapproche du budget de sa difficulté, tiré entre min et max : 55 à 75 à la difficulté 1, soit 5 à 8
    // gobelins (6,5 en moyenne, comme l'ancien camp à 1D4+4) ou 3 à 6 orcs. Codes d'archétypes.
    const MAX_ENEMIES=20;
    function campsOf(def){ return Array.isArray(def?.camps)&&def.camps.length?def.camps:[]; }
    function points(code){ return Number(archetype(code)?.points)||0; }
    function budgetOf(def){
      const budgets=def?.budgets||{};
      return budgets[String(def?.difficulte||1)]||budgets["1"]||{min:55,max:75,chance_normal:0.05};
    }
    function rollCamp(def=definition(),camp=null){
      const chosen=camp||weighted(campsOf(def).map(c=>({...c,poids:Number(c.poids)||1})));
      const b=budgetOf(def),budget=b.min+Math.floor(random()*(b.max-b.min+1));
      let total=points(chosen.chef);
      const enemies=[];
      while(enemies.length<MAX_ENEMIES){
        const level=random()<(Number(b.chance_normal)||0)?"normal":"novice";
        const code=archetypeOf(chosen.faction,weighted(chosen.lignes).ligne,level)?.code;
        if(!code||total+points(code)/2>budget) break;
        enemies.push(code);
        total+=points(code);
      }
      return {faction:chosen.faction,campName:chosen.nom_camp||chosen.faction,enemies,chief:chosen.chef,points:total,budget,names:chosen.noms||{}};
    }

    // Nombre d'ennemis annoncé dans l'ordre : flou par nature (± 2), en toutes lettres (doc 17 §9).
    function estimation(count){
      const list=data.noms?.estimations||[];
      const noisy=Math.max(1,count+die(5)-3);
      return (list.find(e=>noisy<=e.max)||list[list.length-1]||{texte:String(count)}).texte;
    }

    // Récompense du contrat : base + par jour de marche aller-retour + 35 PO par point de combat du camp (Idan,
    // 2026-11-01 ; valeurs de départ, à ajuster).
    function contractReward(def,distance,campPoints){
      const r=def.recompense;
      return r.base+r.par_jour*2*distance+Math.round(r.par_point*campPoints);
    }

    // Offre du tableau des contrats (doc 17 §1 et §9) : un des ordres validés pour cette mission et cette faction, tiré
    // au hasard, avec ses noms ; valable de 3 à 6 jours, après quoi une autre compagnie l'a prise.
    function createOffer({day=1,code="cleanup"}={}){
      const def=definition(code);
      if(!def) return null;
      const camp=rollCamp(def),distance=die(def.distance_faces),enemyCount=camp.enemies.length+1;
      const names=data.noms||{},tribes=names[camp.names.tribus||"tribus"]||[];
      const order=pick((data.ordres||[]).filter(o=>o.mission===def.code&&o.faction===camp.faction));
      const tribe=pick(tribes),target=pick(tribes.filter(t=>t!==tribe));
      const [minDays,maxDays]=def.validite_jours||[3,6];
      const fields={
        commanditaire:order.noms_commanditaire?pick(names[order.noms_commanditaire]||[]):"",
        lieu:pick(names.lieux||[]),jours:distance+(distance>1?" jours":" jour"),estimation:estimation(enemyCount),récompense:contractReward(def,distance,camp.points),
        boss:pick(names[camp.names.chefs||"caids"]||[]),tribu:tribe,tribu_cible:target,signataire:pick(names.signataires||[])
      };
      return {id:`${def.code}-${day}-${Math.floor(random()*1e9).toString(36)}`,code:def.code,name:def.nom,campName:camp.campName,faction:camp.faction,
        difficulty:def.difficulte,day,expiresDay:day+minDays+Math.floor(random()*(maxDays-minDays+1)),distance,camp,enemyCount,
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

    // Issue (doc 17 §8). Victoire : récompense du contrat, coffre (or et objets) et l'équipement de tous les morts des
    // deux camps, sans propriétaire. Défaite : rien, et la renommée baisse ; l'équipement de nos morts est perdu.
    function outcome(offer,{victory,deadEnemies=[],deadMercenaries=[],chestItems=[]}={}){
      const def=definition(offer.code);
      if(!victory) return {victory:false,reward:0,chestGold:0,chestItems:[],loot:[],renown:Number(def.echec?.renommee)||0};
      const chest=def.coffre||{};
      let chestGold=0;
      for(let i=0;i<(chest.or_des||0);i++) chestGold+=die(chest.or_faces||6);
      chestGold*=chest.or_unite||1;
      const loot=[...deadEnemies,...deadMercenaries].flatMap(c=>(c.items||[]).map(it=>({...it,owner:null})));
      return {victory:true,reward:offer.reward,chestGold,chestItems:chestItems.map(it=>({...it,owner:null})),loot,renown:0};
    }

    function deathMultiplier(offer,victory){ return victory?1:Number(definition(offer.code)?.defaite?.multiplicateur_mort)||1; }
    // Coffre (Idan, 2026-10-25) : objets_des D objets_faces objets (1D3), chacun au tier tiré dans coffre.tiers (T2 ou T3).
    function chestItemCount(offer){
      const chest=definition(offer.code)?.coffre||{};
      if(!chest.objets_faces) return Number(chest.objets)||0;
      let count=0;
      for(let i=0;i<(chest.objets_des||1);i++) count+=die(chest.objets_faces);
      return count;
    }
    function chestTier(offer){
      const tiers=(definition(offer.code)?.coffre?.tiers||[]).map(t=>({tier:t.tier,poids:t.poids}));
      return tiers.length?weighted(tiers).tier:1;
    }
    function mapSize(offer){ const map=definition(offer.code)?.carte||{}; return {cols:map.colonnes||13,rows:map.lignes||9}; }

    return {definition,archetype,points,campsOf,budgetOf,rollCamp,estimation,contractReward,createOffer,orderText,applyArchetype,buildEnemies,
      outcome,deathMultiplier,chestItemCount,chestTier,mapSize};
  }

  return {createMissionRules};
});
