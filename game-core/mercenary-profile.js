"use strict";

// Titres des mercenaires (Idan, 2026-10-31, version 2) : chaque mercenaire est noté dans 10 catégories de rôle (Healer,
// Summoner, Buffer, Contrôleur, DPS au CAC, DPS à distance, DPS magiques, Tank, Éclaireur, Meneur). Une catégorie est
// faite de sous-catégories mesurées avec les formules du combat (game-core/combat-engine.js, game-core/magic.js) et
// l'équipement porté, notées sur les 15 niveaux de la réputation. Il a 1 à 3 rôles, ou « Chair à canon » ; ses rôles se
// fondent en un seul titre écrit (v3, 2026-11-06 : composeTitle). Tout se recalcule quand l'équipement change.
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
    const AURA={courage:constant("captain.aura.courage_ratio",0.35),charisma:constant("captain.aura.charisma_ratio",0.25),
      lieutenant:constant("lieutenant.aura.share",0.5)};

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
    const stat=(character,name)=>engine.statWithGear({character,activeSet:1},name);

    // Objets à la ceinture (belt_item_1 à 4) : potions et fioles.
    function beltPotions(character){
      const slots=character.equipment?.slots||{};
      const ids=new Set(Object.entries(slots).filter(([slot,id])=>/^belt_item/.test(slot)&&id).map(([,id])=>id));
      return (character.items||[]).filter(item=>item.itemType==="potion"&&ids.has(item.id))
        .map(item=>potionRows.find(r=>r.nom===item.name||"potion:"+r.code===item.templateId)).filter(Boolean);
    }
    // Poison : dégâts × tours × chance qu'un coup blesse × chance que l'étalon ne résiste pas.
    // La fiole ne compte que s'il sait empoisonner une arme (Idan, 2026-11-03) ; l'étalonnage (calibrate) la mesure chez
    // tous ceux qui en portent une, pour poser les seuils, comme l'aura.
    function poisonSet(character,set,ranged,context={}){
      const skilled=context.calibrate||engine.canPoisonWeapon({character});
      const vial=skilled?beltPotions(character).find(p=>p.effet==="poison_arme"):null;
      const defender=refs().leger;
      const resisted=engine.poisonResistChance(defender)/100;
      const turns=Number(engine.POISON?.turns)||3;
      const held=setWeapon(character,set,ranged);
      if(!held) return null;
      const quality=Number(engine.quality(held.item)?.multiplicateur_qualite)||1;
      const dice=Number(String(held.weapon.degats_pv_base||"").match(/^(\d+)/)?.[1])||1;
      const blowgun=held.weapon.empoisonne?Math.ceil(10*dice*quality-1e-9):0;
      const amount=Math.max(blowgun,vial?Number(vial.degats_poison)||0:0);
      if(!amount) return null;
      const hit=strike(held.unit,defender,ranged?"ranged":"melee",ranged?midRange(held.unit):1);
      return amount*turns*hit.pHit*hit.pWound*(1-resisted);
    }

    // ---- Sources (data/reference/mercenary-profile.json, sources) ----
    // Les sources d'arme se mesurent set par set (le titre dit quelle arme porte le rôle) ; la source garde le meilleur set.
    const SET_SOURCES={
      contact_lourd:(c,set)=>setDamage(c,set,false,refs().lourd),
      contact_leger:(c,set)=>setDamage(c,set,false,refs().leger),
      tir_lourd:(c,set)=>setDamage(c,set,true,refs().lourd),
      tir_leger:(c,set)=>setDamage(c,set,true,refs().leger),
      tir_loin:(c,set)=>setDamage(c,set,true,refs().leger,"max"),
      assassin:(c,set)=>{
        const held=setWeapon(c,set,false);
        if(!held) return null;
        const hidden=1-engine.detectionChance(refs().leger,held.unit,3)/100;
        return strike(held.unit,refs().leger,"melee",1,{backstab:true}).damage*hidden;
      },
      charge:(c,set)=>{
        const held=setWeapon(c,set,false);
        if(!held) return null;
        const travel=Math.round(1.5*engine.movementBase(held.unit));
        const quality=Number(engine.quality(held.item)?.multiplicateur_qualite)||1;
        const chargePower=travel*(Number(held.weapon.bonus_charge_base)||1)*quality;
        return strike(held.unit,refs().leger,"melee",1,{chargePower}).damage;
      },
      poison_contact:(c,set,context)=>poisonSet(c,set,false,context),
      poison_tir:(c,set,context)=>poisonSet(c,set,true,context),
      // Toutes les armes de tir contre-chargent : seule l'arme d'hast en fait une spécialité de contact.
      contre_charge:(c,set)=>{
        const held=setWeapon(c,set,false);
        return held?.weapon.contre_charge?strike(held.unit,refs().leger,"melee",1).damage:null;
      }
    };
    const SOURCES={
      ...Object.fromEntries(Object.keys(SET_SOURCES).map(key=>[key,(c,context)=>best([1,2].map(set=>SET_SOURCES[key](c,set,context)))])),
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
      // Aura (Idan, 2026-11-01 : un titre seulement pour ce qui agit) : celle du capitaine, la moitié pour un lieutenant,
      // ou celle d'un fouet tenu dans un set (sa part du Courage de l'étalon). Une recrue sans rien de cela n'en a pas.
      // context.calibrate : l'étalonnage mesure la formule du capitaine chez tous, pour poser les seuils.
      aura:(c,context={})=>{
        const formula=AURA.courage*stat(c,"Courage")+AURA.charisma*stat(c,"Charisme");
        if(context.calibrate||context.captain) return formula;
        if(context.lieutenant) return AURA.lieutenant*formula;
        return whipAura(c);
      }
    };
    // Le fouet (weapons.json, aura_caracteristique Courage, aura_t1 à aura_t4 selon son tier) : dans la main principale ou
    // secondaire d'un set.
    function whipAura(character){
      const slots=character.equipment?.slots||{};
      const courage=Number(etalon.caracteristiques?.Courage)||0;
      return best(["weapon_set_1_main","weapon_set_1_off","weapon_set_2_main","weapon_set_2_off"].map(slot=>{
        const item=(character.items||[]).find(i=>i.id===slots[slot]);
        const row=item&&weaponRows.find(w=>w.nom===item.name);
        const tier=Math.min(4,Math.max(1,Math.round(Number(item?.tier)||1)));
        return row?.aura_caracteristique==="Courage"?courage*(Number(row["aura_t"+tier])||0)/100:null;
      }));
    }

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
    // context : captain, lieutenant (son rôle dans la compagnie) ; calibrate (étalonnage).
    function measure(character,context={}){
      const out={};
      const needed=new Set(categories.flatMap(cat=>cat.sous.filter(sub=>!sub.a_venir).flatMap(sub=>sub.sources.filter(s=>s!=="sorts"))));
      for(const key of needed){
        const value=SOURCES[key]?.(character,context);
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
    function evaluate(character,context={}){
      if(!engine||!character?.stats) return null;
      const values=measure(character,context);
      const scored=categories.map(cat=>{
        const subs=cat.sous.map(sub=>{
          if(sub.a_venir) return null;
          const levels=sub.sources.map(source=>{
            const key=source==="sorts"?"sorts:"+sub.key:source;
            const found=level(key,values[key]);
            return found&&{...found,source:key};
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
      // Domaine (Idan, 2026-11-01 : « on doit vraiment sentir que c'est son rôle ») : une catégorie hors de son domaine
      // (selection.domaines) demande ecart_hors_domaine étoile de plus ; elle ne passe pas devant les autres pour autant.
      const min=S.titre_min??4,max=S.max_titres??3;
      const domain=character.domain||character.equipment?.profile?.type||null;
      const inDomain=code=>!domain||!S.domaines?.[domain]||S.domaines[domain].includes(code);
      const minFor=cat=>min+(inDomain(cat.code)?0:(S.ecart_hors_domaine??0));
      const eligible=scored.filter(cat=>cat.level>=minFor(cat));
      const titles=[];
      if(eligible[0]){
        titles.push(eligible[0]);
        for(const next of eligible.slice(1)){
          const previous=titles[titles.length-1];
          if(titles.length>=max||previous.level-next.level>(S.ecart_titre??1)) break;
          titles.push(next);
        }
      }
      // Spécificité : la meilleure sous-catégorie, si elle se détache d'au moins ecart_specificite, ou s'il ne sait faire
      // qu'elle (au moins specificite_min) ; sinon le titre reste générique.
      const result=titles.map(cat=>{
        const [top,second]=cat.subs;
        const specific=second?top.level-second.level>=(S.ecart_specificite??2):top.level>=(S.specificite_min??3);
        const sub=specific?{code:top.code,nom:top.nom}:null;
        return {category:cat.code,categoryName:cat.nom,sub,level:cat.level,label:sub?cat.nom+" · "+sub.nom:cat.nom,
          top:{code:top.code,source:top.source}};
      });
      return {values,categories:scored,titles:result,cannonFodder:!result.length};
    }

    // Domaine évolutif (Idan, 2026-11-06 : « le statut (l'icône) évolue dans le temps ») : à chaque recalcul du titre, le
    // domaine prend celui de son premier rôle qui dit comment il se bat (selection.domaine_par_role) ; un Tank, un Éclaireur
    // ou un Meneur porté par ses sorts compte pour selection.domaine_sorts ; sinon on passe au rôle suivant. Sans titre, ou
    // sans rôle qui le dise : null, le domaine ne change pas. Le frein reste dans evaluate (« on garde le frein ») : un rôle
    // hors du domaine demande ecart_hors_domaine étoile de plus pour entrer dans le titre.
    function titleDomain(result){
      const byRole=S.domaine_par_role||{};
      for(const title of result?.titles||[]){
        if(byRole[title.category]) return byRole[title.category];
        if(/^sorts(:|$)/.test(String(title.top?.source||""))&&S.domaine_sorts) return S.domaine_sorts;
      }
      return null;
    }

    // ---- Titres écrits (Idan, 2026-11-06, v3 ; mercenary-titles.json) ----
    // « Ce qu'il fait × comment il le fait » : chaque rôle (catégorie) s'écrit avec l'arme, le style, l'école ou la
    // sous-catégorie qui le porte ; ses 1 à 3 rôles se fondent en un seul titre, suivi du mot de niveau du rôle principal.
    // Pas d'étoiles ; au masculin et au féminin (titre et court : m, f ; Idan : « je te laisse faire la version féminine »).
    const titleData=reference?.mercenaryTitles||null;
    // Sa monture équipée (Idan, 2026-11-07 : « titre A » ; « on prend en compte la monture équipée. Si elle est pas équipée,
    // mais equipable dans l'inventaire ( blessée quelques jours par exemple, on change rien. ) ») : « à cheval », « à dos de
    // licorne » (mounts.json, titre), à la fin du titre ; une monture au repos reste équipée.
    const mountTitles=new Map(rows(reference?.mounts).map(row=>[row.code,row.titre||""]));
    function mountTitle(character){
      const id=character?.equipment?.slots?.mount;
      const item=id==null?null:(character.items||[]).find(i=>String(i.id)===String(id)&&i.itemType==="mount");
      return item?mountTitles.get(item.mountCode)||"":"";
    }
    const withMount=(name,character)=>{ const extra=mountTitle(character); return extra?name+" "+extra:name; };
    const titleRows=new Map(rows(titleData).map(row=>[row.code,row]));
    function tierIndex(stars){
      const mins=titleData?.paliers||[];
      let index=0;
      mins.forEach((min,i)=>{ if(stars>=min) index=i; });
      return index;
    }
    const isShieldRow=weapon=>/Boucliers/.test(String(weapon?.domaine||""));
    const weaponCategoryName=weapon=>String(weapon?.domaine||"").split(",")[0].trim();
    const holdsTwoHands=held=>held.main?.prise==="2 mains"||(held.main?.prise==="Au choix"&&!held.off);
    // L'arme (ou le style) qui porte un rôle de dégâts : le set qui donne la meilleure valeur à sa source. Le style, quand
    // aucune arme ne domine : le set tient deux armes différentes (Ambidextre), ou l'autre set frappe au même niveau avec
    // une autre arme (deux armes à deux mains, une même catégorie, deux boucliers, deux armes à une main ; au tir, Tireur).
    function weaponPick(character,source,context){
      const measureSet=SET_SOURCES[source];
      if(!measureSet) return null;
      const sets=[1,2].map(set=>{
        const value=measureSet(character,set,context);
        if(value==null||!Number.isFinite(value)) return null;
        const unit={character,activeSet:set};
        return {value,level:level(source,value)?.level||0,dual:engine.isDualWielding(unit),
          main:engine.weaponTemplate(engine.activeWeaponItem(unit)),off:engine.weaponTemplate(engine.activeOffhandItem(unit))};
      }).filter(held=>held?.main).sort((a,b)=>b.value-a.value);
      const [first,other]=sets;
      if(!first) return null;
      const styles=titleData?.styles||{};
      const style=(code,category)=>{
        const entry=styles[code];
        if(!entry) return null;
        const fill=text=>text&&String(text).replace("{categorie}",String(category||"").toLowerCase());
        return {entry:{titre:entry.titre,apres:fill(entry.apres),complement:fill(entry.complement)},weapon:null};
      };
      const ranged=engine.isRangedWeapon(first.main);
      if(!ranged&&first.dual&&first.off?.nom!==first.main.nom) return style("deux_armes");
      if(other&&other.level===first.level&&other.main.nom!==first.main.nom){
        if(ranged) return style("tir");
        if(holdsTwoHands(first)&&holdsTwoHands(other)) return style("deux_mains");
        if(weaponCategoryName(first.main)===weaponCategoryName(other.main)) return style("categorie",weaponCategoryName(first.main));
        if(isShieldRow(first.off)&&isShieldRow(other.off)) return style("bouclier");
        if(!first.off&&!other.off) return style("une_main");
      }
      const entry=titleData?.armes?.[first.main.nom]||{titre:ranged?"Tireur":"Combattant"};
      return {entry,weapon:first.main.nom};
    }
    // L'école du meilleur sort d'une sous-catégorie.
    function spellSchool(character,subKey){
      const sub=subByKey.get(subKey);
      if(!magic||!sub) return null;
      const unit={character,activeSet:1};
      let top=null;
      for(const known of character.spells||[]){
        const spell=magic.spell(known.code);
        if(spellRole(spell)!==subKey) continue;
        const value=spellValue(unit,known,spell,sub.sorts);
        if(value!=null&&Number.isFinite(value)&&(!top||value>top.value)) top={value,school:spell.ecole||known.school||null};
      }
      return top?.school||null;
    }
    // Un rôle écrit : titre (rôle principal), apres (la suite du titre principal), court (rôle en second), complement (son
    // arme, en second), ecole.
    function rolePiece(title,character,context){
      const role=titleData?.roles?.[title.category]||{};
      const top=title.top||{};
      const own=role.sous?.[top.code]||null;
      const fallback=role.defaut||{titre:title.categoryName,court:String(title.categoryName||"").toLowerCase()};
      if(role.arme){
        const pick=weaponPick(character,top.source,context);
        const weapon=pick?.entry||fallback;
        if(!own) return {...weapon,category:title.category};
        const complement=(own.sans_complement||[]).includes(pick?.weapon)?"":weapon.complement||"";
        return {titre:own.titre,apres:complement,court:own.court,complement,category:title.category};
      }
      if(String(top.source||"").startsWith("sorts:")){
        const school=spellSchool(character,top.source.slice(6));
        const bySchool=role.ecoles?.[school];
        const entry=(bySchool?.titre?bySchool:bySchool?.[top.code])||own||fallback;
        return {...entry,school,category:title.category};
      }
      let entry=own||fallback;
      if(own?.bouclier&&engine.blockChance({character,activeSet:1})!=null) entry=own.bouclier;
      if(own?.fouet&&top.source==="aura"&&!context.captain&&!context.lieutenant) entry=own.fouet;
      return {...entry,category:title.category};
    }
    // Le titre : rôle principal + autres rôles (« Archer éclaireur ») + mot de niveau « avant » + armes (« à la massue »,
    // « à la hache de guerre et au fouet ») + mot de niveau de « fin ». Trois rôles : « et » avant le dernier. Un rôle déjà
    // dit n'est pas répété (même mot, ou dégâts d'une école déjà nommée). L'infobulle : celle du rôle principal (ou de sa
    // sous-catégorie). result : evaluate(character, context) ; female : le titre au féminin.
    function composeTitle(character,result,context={},{female=false}={}){
      if(!titleData||!result) return null;
      const g=female?"f":"m";
      const gendered=value=>value==null||typeof value==="string"?value:value[g]??value.m;
      if(result.cannonFodder){
        const fodder=titleData.chair_a_canon;
        return fodder?{name:withMount(gendered(fodder.titre),character),lines:fodder.infobulle[g]||fodder.infobulle.m}:null;
      }
      const pieces=result.titles.map(title=>{
        const piece=rolePiece(title,character,context);
        return {...piece,titre:gendered(piece.titre),court:gendered(piece.court)};
      });
      const main=pieces[0];
      const words=[main.titre],complements=main.apres?[main.apres]:[];
      const schools=new Set(main.school?[main.school]:[]);
      let kept=1;
      for(const piece of pieces.slice(1)){
        const said=words.join(" ").toLowerCase();
        const repeated=piece.category==="dps_magie"&&piece.school&&schools.has(piece.school);
        const word=!repeated&&piece.court&&!said.includes(piece.court.toLowerCase())?piece.court:"";
        const complement=piece.complement&&!complements.includes(piece.complement)?piece.complement:"";
        if(!word&&!complement) continue;
        kept++;
        if(word) words.push(word);
        if(complement) complements.push(complement);
        if(piece.school) schools.add(piece.school);
      }
      const joinWithEt=kept===3&&(words.length===3||(words.length===2&&!main.apres));
      const head=joinWithEt?words.slice(0,-1).join(" ")+" et "+words[words.length-1]:words.join(" ");
      const first=result.titles[0];
      const row=titleRows.get(first.category);
      const index=tierIndex(first.level);
      const tier=(row?.paliers?.[g]||row?.paliers?.m)?.[index]||"";
      const place=row?.paliers_place?.[index]||"fin";
      const name=withMount([head,place==="avant"?tier:"",complements.join(" et "),place==="fin"?tier:""].filter(Boolean).join(" "),character);
      const spec=(row?.specialites||[]).find(s=>s.code===first.top?.code);
      const tip=(spec||row)?.infobulle;
      return {name,lines:tip?.[g]||tip?.m||[]};
    }

    return {measure,level,evaluate,titleDomain,strike,perTurn,categories,spellRole,composeTitle,tierIndex};
  }

  return {createProfileRules};
});
