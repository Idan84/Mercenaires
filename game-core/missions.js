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
    const mountByCode=new Map(rows(reference?.mounts).map(x=>[x.code,x]));
    // Réputation d'une fiche d'ennemi (Idan, 2026-11-08) : 3 × ses points de combat (reputation.enemy.points_factor).
    const enemyReputationFactor=Number(rows(reference?.formulaConstants).find(r=>r.code==="reputation.enemy.points_factor")?.valeur??3);
    // Accessoires sur les morts (Idan, 2026-11-08) : chance (%) par emplacement d'accessoire.
    const accessoryChance=Number(rows(reference?.formulaConstants).find(r=>r.code==="loot.accessory.chance_per_slot")?.valeur??2);
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
    // Le chef (Idan, 2026-11-02) : celui du métal s'il est permis à ce niveau de mission (niveau_mission_min), sinon le
    // cran en dessous (chef 4, 3, 2, 1) ; null si ce peuple n'en a aucun.
    const chiefRank=level=>Number(String(level).match(/\d+/)?.[0])||1;
    // maxPoints : seulement les chefs qui ne dépassent pas ce nombre de points de combat.
    function chiefFor(faction,chiefLevel,missionLevel,maxPoints=Infinity){
      return archetypes.filter(a=>a.faction===faction&&a.ligne==="Chef"&&chiefRank(a.niveau)<=chiefRank(chiefLevel)&&missionMin(a)<=missionLevel
        &&(Number(a.points)||0)<=maxPoints)
        .sort((x,y)=>chiefRank(y.niveau)-chiefRank(x.niveau))[0]?.code||null;
    }
    // Le chef au plus la moitié du budget (Idan, 2026-11-08 : « PC du chef au max 50 % du PC total. Les missions jusqu'à
    // 3★ peuvent ne pas avoir de chef ») : le chef du cran en dessous s'il tient dans la part ; jusqu'à 3★, un camp sans
    // chef si aucun ne tient (le plus fort de la troupe porte alors le nom du chef de la lettre : buildEnemies) ; au-delà,
    // toujours un chef (le plus petit permis si aucun ne tient).
    function cappedChief(def,faction,chiefLevel,missionLevel,budget){
      const rule=def?.chef||{},share=rule.part_max_budget==null?1:Number(rule.part_max_budget);
      const capped=chiefFor(faction,chiefLevel,missionLevel,budget*share);
      if(capped||missionLevel<=(Number(rule.sans_chef_jusqu_au_niveau)||0)) return capped;
      return archetypes.filter(a=>a.faction===faction&&a.ligne==="Chef"&&chiefRank(a.niveau)<=chiefRank(chiefLevel)&&missionMin(a)<=missionLevel)
        .sort((x,y)=>chiefRank(x.niveau)-chiefRank(y.niveau))[0]?.code||null;
    }
    // Le camp : le chef, puis des ennemis (niveau selon le métal, ligne selon les poids du camp) tant que le total plus la
    // moitié du suivant reste dans le budget ; au plus max_ennemis (100), plus le chef (Idan, 2026-11-02 : « 100 + chef »).
    // Si le peuple du camp n'a aucun chef permis, un autre camp est tiré (Idan, 2026-11-02).
    function rollCamp(def=definition(),camp=null,{level:missionLevel=1}={}){
      const weightedCamp=list=>weighted(list.map(c=>({...c,poids:Number(c.poids)||1})));
      let chosen=camp||weightedCamp(campsOf(def));
      const tier=budgetOf(def,missionLevel),budget=rollBudget(tier,missionLevel);
      const chiefLevel=weighted((tier?.chefs||[{niveau:"chef 1",poids:1}]).map(c=>({...c,poids:Number(c.poids)||1}))).niveau;
      let chief=chiefFor(chosen.faction,chiefLevel,missionLevel);
      if(!chief&&!camp){
        const others=campsOf(def).filter(c=>chiefFor(c.faction,chiefLevel,missionLevel));
        if(others.length){ chosen=weightedCamp(others); chief=chiefFor(chosen.faction,chiefLevel,missionLevel); }
      }
      if(chief) chief=cappedChief(def,chosen.faction,chiefLevel,missionLevel,budget);
      const levels=(tier?.monstres||[{niveau:"novice",poids:1}]).map(m=>({...m,poids:Number(m.poids)||0}));
      const max=Number(def?.max_ennemis)||100;
      let total=points(chief);
      const enemies=[];
      while(enemies.length<max){
        const level=weighted(levels).niveau;
        // Une ligne peut venir d'une autre famille de fiches (faction : les Créatures, comme le troll ; Idan, 2026-11-06 :
        // « Ça devrait être les mêmes fiches qui s'intègrent pour les différentes factions »).
        const lines=(chosen.lignes||[]).filter(l=>allowedAt(l.faction||chosen.faction,l.ligne,level,missionLevel));
        const line=lines.length?weighted(lines):null;
        const code=line?allowedAt(line.faction||chosen.faction,line.ligne,level,missionLevel).code:null;
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
      if(def.bete) return createHuntOffer(def,{day,renown,level});
      const missionLevel=level==null?rollMissionLevel(def,renown):clampLevel(level);
      const camp=rollCamp(def,null,{level:missionLevel}),distance=randInt(1,missionLevel),enemyCount=camp.enemies.length+(camp.chief?1:0);
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

    // Les chasses (Idan, 2026-11-07 : « Récompense de 1000 Po par étoile. 0,25 à 1 jour de marche par étoile. Arrondi sup.
    // Textes cohérents avec l'espèce : Version Meute de Loup : 3D6 par étoile. Version Licorne : 1D6 par étoile. On
    // élimine les animaux. On peut en capturer ou se prendre une pilée ! On génère des missions -2 / +2 étoiles par
    // rapport à l'étoile » ; « Les fiches fixes ») : les missions qui ont une bête (one-shot-missions.json, bete), tirées
    // selon leur poids ; les bêtes ont la fiche fixe de nos animaux (mounts.json) ; ni coffre ni butin.
    const hunts=()=>(data.missions||[]).filter(m=>m.bete);
    // Le nombre de bêtes : les dés de la bête pour chaque étoile (1D6 loups, 1D3 licornes depuis le bêta-test ; Idan,
    // 2026-11-07), au plus max_ennemis.
    function rollBeasts(def,level){
      const b=def.bete||{};
      let count=0;
      for(let star=0;star<level;star++) for(let d=0;d<(Number(b.des)||1);d++) count+=die(Number(b.faces)||6);
      return Math.min(Number(def.max_ennemis)||100,Math.max(1,count));
    }
    // Jours de marche : étoiles × un tirage de 0,25 à 1, arrondi au jour supérieur.
    function huntDistance(def,level){
      const [low,high]=def.marche?.facteur||[0.25,1];
      return Math.max(1,Math.ceil(level*(low+random()*(high-low))-1e-9));
    }
    function createHuntOffer(def,{day=1,renown=0,level=null}={}){
      const missionLevel=level==null?rollMissionLevel(def,renown):clampLevel(level);
      const b=def.bete,count=rollBeasts(def,missionLevel),distance=huntDistance(def,missionLevel);
      const names=data.noms||{};
      const order=pick((data.ordres||[]).filter(o=>o.mission===def.code&&o.faction===b.faction));
      const place=pick(b.lieux||[])||def.nom;
      const camp={faction:b.faction,campName:place,enemies:[],chief:null,beast:{code:b.code,count},points:0,budget:0,names:{}};
      const [minDays,maxDays]=def.validite_jours||[3,6];
      const reward=(Number(def.recompense?.par_niveau)||0)*missionLevel;
      const fields={
        commanditaire:order?.noms_commanditaire?pick(names[order.noms_commanditaire]||[]):"",
        lieu:pick(names.lieux||[]),jours:distance+(distance>1?" jours":" jour"),estimation:estimation(count),récompense:reward,
        signataire:pick(names.signataires||[])
      };
      return {id:`${def.code}-${day}-${Math.floor(random()*1e9).toString(36)}`,code:def.code,name:def.nom,campName:place,faction:b.faction,
        difficulty:missionLevel,level:missionLevel,day,expiresDay:day+minDays+Math.floor(random()*(maxDays-minDays+1)),distance,camp,enemyCount:count,
        reward,order:order?.code||null,fields,hunt:true};
    }
    // Une chasse au tableau : l'une des missions de chasse, selon son poids (les loups 3 fois sur 4).
    function createHunt({day=1,renown=0,level=null}={}){
      const list=hunts();
      if(!list.length) return null;
      const def=weighted(list.map(m=>({...m,poids:Number(m.poids)||1})));
      return createHuntOffer(definition(def.code),{day,renown,level});
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
      // Sa réputation est celle de sa fiche, pas celle du personnage de base (Idan, 2026-11-08 : un gobelin novice valait
      // autant qu'un chef) : 3 × ses points de combat ; tuer en rapporte 10 % (doc 09).
      c.reputation=enemyReputationFactor*(Number(arch.points)||0);
      c.reputationCareerDelta=0;
      delete c.reputationBreakdown;
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
      // Arme naturelle (griffes du zombie, toucher du spectre ; Idan, 2026-11-06) : son gabarit voyage avec l'objet, comme
      // celui des créatures invoquées (combat-engine.js, weaponTemplate).
      if(arch.attaque){
        const it=item(naturalWeapon(arch.attaque,arch.code));
        items.unshift(it);
        slots.weapon_set_1_main=it.id;
      }
      c.items=items;
      c.equipment={...(c.equipment||{}),slots,profile:{...(c.equipment?.profile||{}),type:items[0]?.combatFamily||"melee"}};
      // Morts-vivants (Idan, 2026-11-06) : sans peur (mort_vivant), insensibles au poison, insensibles aux armes (le spectre),
      // dégâts subis selon le type (squelettes : « très résistants aux dégâts tranchants, très faibles aux contondants »).
      if(arch.mort_vivant) c.undead=true;
      if(arch.insensible_poison) c.immunePoison=true;
      if(arch.immunite_physique) c.immunePhysical=true;
      if(arch.degats_subis) c.damageTypeFactors={...arch.degats_subis};
      // Sorts de la fiche (le nécromancien ; Idan, 2026-11-06) : ses écoles, ses sorts et leur maîtrise, dans l'ordre où l'IA
      // les essaie (aiSpells) ; la fiche remplace ceux tirés à la génération ; mana plein au départ. Une fiche sans sorts
      // n'en lance aucun (Idan, 2026-11-07 : le troll lançait les sorts de son personnage de base).
      {
        const sorts=Array.isArray(arch.sorts)?arch.sorts:[];
        c.spells=sorts.map(x=>({code:x.code,mastery:Number(x.maitrise)||1}));
        c.aiSpells=sorts.map(x=>x.code);
        c.skills.magic={...Object.fromEntries(Object.keys(c.skills?.magic||{}).map(k=>[k,0])),...(arch.ecoles||{})};
        delete c.mana;
      }
      // Nécromancien (Idan, 2026-11-06 : « B, vas-y ») : son armée est déjà levée au début du combat (sort_initial, une
      // invocation, sans mana ni jet) ; il reste derrière ses troupes tant qu'elles tiennent (en_retrait).
      if(arch.sort_initial) c.startSpells=[arch.sort_initial];
      if(arch.en_retrait) c.staysBehind=true;
      // Cour de sang (Idan, 2026-11-06) : les chauves-souris volent (« Elles survolent tout ») ; le vampire régénère (la
      // règle du sang de troll, game-core/regeneration.js : Régénération = points de la fiche ; le feu la bloque).
      if(arch.vol) c.flies=true;
      // Taille (doc 04) : normale, longue (2 cases), grande (3) ou énorme (7).
      if(arch.taille) c.taille=arch.taille;
      // La mana du personnage de base ne dépasse pas la Réserve de la fiche (un troll affichait « 66/37 »).
      if(Number.isFinite(Number(c.mana))&&Number.isFinite(Number(c.stats?.["Réserve de mana"]))) c.mana=Math.min(Number(c.mana),Number(c.stats["Réserve de mana"]));
      if(arch.regeneration!=null) c.skills.physiology={...(c.skills.physiology||{}),"Régénération":Number(arch.regeneration)||0};
      // Cavalier (Idan, 2026-11-07) : ses compétences animales (Compagnon animal et la famille de sa monture) et sa monture
      // (mounts.json), que l'écran de combat lui donne s'il est assez petit pour la monter.
      if(arch.competences_animales){
        const animal=Object.fromEntries(Object.keys(c.skills?.animal||{}).map(k=>[k,0]));
        c.skills.animal={...animal,...arch.competences_animales};
      }
      if(arch.monture) c.mountCode=arch.monture; else delete c.mountCode;
      return c;
    }

    function naturalWeapon(a,code){
      return {templateId:"natural:"+code,name:a.nom,itemType:"weapon",slot:"weapon_set_1_main",natural:true,
        category:"Armes naturelles",combatFamily:"melee",grip:"1 main",
        template:{nom:a.nom,domaine:"Armes naturelles",prise:"1 main",degats_pv_base:a.degats_pv_base,degats_type:a.degats_type||null,
          puissance_tranchante_base:Number(a.puissance_tranchante)||0,puissance_perforante_base:Number(a.puissance_perforante)||0,
          puissance_contondante_base:Number(a.puissance_contondante)||0,malus_vitesse_arme_base:0,bonus_charge_base:Number(a.bonus_charge)||1,
          contre_charge:false,portee_min_hex:1,portee_max_hex:1}};
    }

    // Montures (Idan, 2026-11-07 ; mounts.json) : une fiche fixe. Le personnage du cheval : ses caractéristiques, ses
    // résistances, son arme naturelle (les sabots du destrier), sa taille au combat (longue : 2 cases), son gabarit (places
    // du dortoir : on ne monte qu'une bête plus grande que soi) et la famille de compétence animale qui le mène (Équidés).
    // Ses PV suivent la formule de nos mercenaires (pas de « archetype »).
    function mountSheet(code){ return mountByCode.get(code)||null; }
    // own : la fiche propre d'une de nos montures (stables.js, ownSheet) : ses valeurs après progression, son mana.
    function createMount(code,{id=null,name=null,own=null}={}){
      const s=mountSheet(code);
      if(!s) return null;
      if(own){
        const base=createMount(code,{id,name});
        return Object.assign(base,{stats:{...base.stats,...own.stats},resistances:{...base.resistances,...own.resistances},
          skills:Object.fromEntries(Object.entries(base.skills).map(([group,values])=>[group,{...values,...(own.skills?.[group]||{})}])),
          spells:(own.spells||base.spells).map(x=>({...x})),aiSpells:(own.spells||base.spells).map(x=>x.code)},
          Number.isFinite(Number(own.mana))?{mana:Number(own.mana)}:{});
      }
      const weapon={id:`${id??s.code}-1`,owner:id,...naturalWeapon(s.attaque||{},s.code)};
      return {id,name:name||s.nom,role:s.nom,people:"",mount:{code:s.code,capturable:s.capturable!==false},
        gabarit:Number(s.gabarit)||1,taille:s.taille||"normale",mountSkill:s.espece||null,
        stats:{...s.caracteristiques},resistances:{...s.resistances},
        // Sa fiche complète, comme un mercenaire (Idan, 2026-11-07) : artisanat, camp et compétences animales à 0.
        skills:{martial:{...(s.competences_martiales||{})},animal:{},social:{...(s.competences_sociales||{})},magic:{...(s.competences_magiques||{})},
          craft:{},camp:{},technique:{},physiology:{...(s.physiologie||{})}},
        // Ses sorts, comme un mercenaire (la licorne : Création de double) ; l'IA les essaie dans l'ordre.
        spells:(s.sorts||[]).map(x=>({code:x.code,mastery:Number(x.maitrise)||1})),aiSpells:(s.sorts||[]).map(x=>x.code),
        items:[weapon],equipment:{slots:{weapon_set_1_main:weapon.id},profile:{type:"melee"}}};
    }

    // Les ennemis du camp, chef en dernier : makeBase(archétype) donne le personnage de base. Les doublons sont numérotés
    // (« Frondeur gobelin novice 2 ») ; le chef porte le nom de l'offre. Un camp sans chef (jusqu'à 3★) : le plus fort de
    // la troupe (le premier tiré à points égaux) prend sa place, en dernier, avec le nom du chef de la lettre.
    function buildEnemies(offer,makeBase){
      // Une chasse : les bêtes, la fiche fixe de nos animaux (« Loup 1 », « Loup 2 »…).
      const beast=offer.camp?.beast;
      if(beast){
        const sheet=mountSheet(beast.code);
        return Array.from({length:Number(beast.count)||0},(_,i)=>createMount(beast.code,{id:`${offer.id}-b${i}`,
          name:beast.count>1?`${sheet?.nom||beast.code} ${i+1}`:sheet?.nom})).filter(Boolean);
      }
      const troops=[...offer.camp.enemies];
      let boss=offer.camp.chief;
      if(!boss&&troops.length){
        const strongest=troops.reduce((best,code,i)=>points(code)>points(troops[best])?i:best,0);
        boss=troops.splice(strongest,1)[0];
      }
      const codes=[...troops,boss],seen=new Map();
      const total=new Map();
      for(const code of troops) total.set(code,(total.get(code)||0)+1);
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
    // Les 13 emplacements d'accessoire de la fiche (equipment-slots.json : le corps sans l'armure, et les 6 bagues) et la
    // famille d'objet de chacun (casque, amulette, cape, gants, ceinturon, culotte, bottes, bague).
    const ACCESSORY_SLOTS=(()=>{
      const slots=rows(reference?.equipmentSlots).filter(s=>(s.group==="body"&&s.id!=="armor")||s.group==="rings").map(s=>s.id);
      const list=slots.length?slots:["head","amulet","cape","gloves","belt","pants","boots","ring_1","ring_2","ring_3","ring_4","ring_5","ring_6"];
      return list.map(slot=>({slot,type:slot==="head"?"helmet":/^ring_/.test(slot)?"ring":slot}));
    })();
    // Accessoires laissés par un ennemi mort (Idan, 2026-11-08 : « Sur chaque mort, on a 2% de chance de dropper un
    // accessoire par slot d'un tier equivalent au tier de l'ennemi mort ») : un tirage par emplacement, un objet de sa
    // famille au tier de la fiche ; seulement les humanoïdes (« La règle, c'est plutôt humanoïde ou non » : ni loup ni
    // chauve-souris ; les goules, zombies, spectres et trolls, oui).
    function accessoryDrops(arch){
      if(!arch||arch.humanoide===false) return [];
      const tier=Number(arch.tier)||1;
      return ACCESSORY_SLOTS.filter(()=>random()*100<accessoryChance).map(({type})=>({type,tier}));
    }
    function enemyLoot(c,makeItem){
      const arch=archetype(c?.archetype),b=lootOf(arch);
      // Une arme naturelle (griffes, toucher spectral) ne se ramasse pas.
      const kept=(c?.items||[]).filter(it=>!it.natural).filter(()=>b.equipement>=100||random()*100<b.equipement);
      const extra=b.objets.filter(o=>random()*100<(Number(o.chance)||0)).map(o=>makeItem?makeItem(o.type,o.nom,Number(o.tier)||1):null).filter(Boolean);
      // Sans nom : makeItem tire un objet de la famille au hasard.
      const accessories=accessoryDrops(arch).map(o=>makeItem?makeItem(o.type,null,o.tier):null).filter(Boolean);
      return [...kept,...extra,...accessories];
    }

    // Issue (doc 17 §8). Victoire : récompense du contrat, coffre (or et objets), le butin des ennemis morts (selon leur
    // fiche) et l'équipement de nos morts, sans propriétaire. Défaite : rien, et la renommée baisse ; l'équipement de nos
    // morts est perdu.
    function outcome(offer,{victory,deadEnemies=[],deadMercenaries=[],chestItems=[],makeItem=null}={}){
      const def=definition(offer.code);
      if(!victory) return {victory:false,reward:0,chestGold:0,chestItems:[],loot:[],renown:Number(def.echec?.renommee)||0,hunt:Boolean(def.bete)};
      const chestGold=rollChestGold(offer);
      const loot=[...deadEnemies.flatMap(c=>enemyLoot(c,makeItem)),...deadMercenaries.flatMap(c=>c.items||[])].map(it=>({...it,owner:null}));
      return {victory:true,reward:offer.reward,chestGold,chestItems:chestItems.map(it=>({...it,owner:null})),loot,renown:0,hunt:Boolean(def.bete)};
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

    return {definition,archetype,points,missionMin,lootOf,accessoryDrops,ACCESSORY_SLOTS,campsOf,budgetOf,rollBudget,renownLevel,rollMissionLevel,rollCamp,estimation,contractReward,
      createOffer,createHunt,rollBeasts,huntDistance,orderText,applyArchetype,buildEnemies,outcome,deathMultiplier,rollChestGold,chestPlan,mapSize,mountSheet,createMount};
  }

  return {createMissionRules};
});
