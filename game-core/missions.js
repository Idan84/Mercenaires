"use strict";

// Missions one shot (doc 17). V1 (Idan, 2026-10-24) : « Faire le ménage », un camp gobelin ☠, seule mission proposée
// à la Taverne, en boucle. Module pur : l'offre du tableau et son ordre de mission, les ennemis fabriqués à partir de
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

    // Camp ☠ (Idan, 2026-10-24) : 1D4+3 novices dont un « normal » (T2) dans 20 % des camps et deux dans 5 %, lignes
    // tirées selon leurs poids, plus un Caïd. Codes d'archétypes.
    function rollCamp(def=definition()){
      const camp=def.camp,count=camp.novices_base+die(camp.novices_faces);
      const roll=random(),normals=roll<camp.chance_deux_normaux?2:roll<camp.chance_deux_normaux+camp.chance_un_normal?1:0;
      const enemies=Array.from({length:count},(_,k)=>archetypeOf(def.faction,weighted(camp.lignes).ligne,k<normals?"normal":"novice")?.code)
        .filter(Boolean);
      return {enemies,chief:camp.chef};
    }

    // Nombre d'ennemis annoncé dans l'ordre : flou par nature (± 2), en toutes lettres (doc 17 §9).
    function estimation(count){
      const list=data.noms?.estimations||[];
      const noisy=Math.max(1,count+die(5)-3);
      return (list.find(e=>noisy<=e.max)||list[list.length-1]||{texte:String(count)}).texte;
    }

    // Récompense du contrat : base + par jour de marche aller-retour + par ennemi (valeurs de départ, à ajuster).
    function contractReward(def,distance,enemyCount){
      const r=def.recompense;
      return r.base+r.par_jour*2*distance+r.par_ennemi*enemyCount;
    }

    // Offre du tableau des contrats (doc 17 §1 et §9) : un des ordres validés pour cette mission et cette faction, tiré
    // au hasard, avec ses noms ; valable de 3 à 6 jours, après quoi une autre compagnie l'a prise.
    function createOffer({day=1,code="cleanup"}={}){
      const def=definition(code);
      if(!def) return null;
      const camp=rollCamp(def),distance=die(def.distance_faces),enemyCount=camp.enemies.length+1;
      const names=data.noms||{};
      const order=pick((data.ordres||[]).filter(o=>o.mission===def.code&&o.faction===def.faction));
      const tribe=pick(names.tribus||[]),target=pick((names.tribus||[]).filter(t=>t!==tribe));
      const [minDays,maxDays]=def.validite_jours||[3,6];
      const fields={
        commanditaire:order.noms_commanditaire?pick(names[order.noms_commanditaire]||[]):"",
        lieu:pick(names.lieux||[]),jours:distance+(distance>1?" jours":" jour"),estimation:estimation(enemyCount),récompense:contractReward(def,distance,enemyCount),
        boss:pick(names.caids||[]),tribu:tribe,tribu_cible:target,signataire:pick(names.signataires||[])
      };
      return {id:`${def.code}-${day}-${Math.floor(random()*1e9).toString(36)}`,code:def.code,name:def.nom,campName:def.nom_camp||def.faction,faction:def.faction,
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
    function chestItemCount(offer){ return Number(definition(offer.code)?.coffre?.objets)||0; }
    function mapSize(offer){ const map=definition(offer.code)?.carte||{}; return {cols:map.colonnes||13,rows:map.lignes||9}; }

    return {definition,archetype,rollCamp,estimation,contractReward,createOffer,orderText,applyArchetype,buildEnemies,
      outcome,deathMultiplier,chestItemCount,mapSize};
  }

  return {createMissionRules};
});
