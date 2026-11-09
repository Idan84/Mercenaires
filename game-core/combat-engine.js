"use strict";

(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCombat=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const PHYSICAL_TYPES=[
    {name:"tranchant",weapon:"puissance_tranchante_base",armor:"resistance_tranchant"},
    {name:"perforant",weapon:"puissance_perforante_base",armor:"resistance_perforant"},
    {name:"contondant",weapon:"puissance_contondante_base",armor:"resistance_contondant"}
  ];
  // Dégâts élémentaires (doc 12, Idan 2026-10-25) : la résistance du personnage et la valeur de l'armure portée.
  const ELEMENTS={
    feu:{resistance:"Résistance au feu",armor:"resistance_brulant"},
    froid:{resistance:"Résistance au froid",armor:"resistance_glacant"},
    foudre:{resistance:"Résistance à la foudre",armor:"resistance_foudroyant"},
    // Poison (Crachat de venin ; Idan, 2026-10-27) : seule la Résistance au poison protège, l'armure ne compte pas.
    poison:{resistance:"Résistance au poison",armor:null}
  };

  function createCombatEngine(reference,options={}){
    const random=options.random||Math.random;
    // Altitude (doc 04 ; Idan, 2026-11-06) : options.heightOf(unit) = la hauteur de sa case (0 à 3), donnée par la carte.
    const heightOf=typeof options.heightOf==="function"?options.heightOf:null;
    const rows={};
    for(const [name,payload] of Object.entries(reference||{})) rows[name]=payload?.rows||[];

    const weapons=rows.weapons||[];
    const armors=rows.baseArmors||[];
    const qualities=rows.itemQualities||[];
    const skills=rows.skills||[];
    const boots=rows.boots||[];
    const belts=rows.belts||[];
    const amulets=rows.amulets||[];
    const capes=rows.capes||[];
    const gloves=rows.gloves||[];
    const pants=rows.pants||[];
    const rings=rows.rings||[];
    const helmets=rows.helmets||[];
    const helmetByName=new Map(helmets.map(x=>[x.nom,x]));

    const weaponByName=new Map(weapons.map(x=>[x.nom,x]));
    const armorByCode=new Map(armors.map(x=>[x.code,x]));
    const qualityByCode=new Map(qualities.map(x=>[x.code,x]));
    const skillByName=new Map(skills.map(x=>[x.nom,x]));
    // Équipement à bonus de caractéristique : l'emplacement et ses modèles (bottes, ceinture, amulette, cape, gants,
    // culotte, et les six bagues, qui se cumulent).
    const STAT_GEAR=[{slot:"boots",byName:new Map(boots.map(x=>[x.nom,x]))},{slot:"belt",byName:new Map(belts.map(x=>[x.nom,x]))},
      {slot:"amulet",byName:new Map(amulets.map(x=>[x.nom,x]))},{slot:"cape",byName:new Map(capes.map(x=>[x.nom,x]))},
      {slot:"gloves",byName:new Map(gloves.map(x=>[x.nom,x]))},{slot:"pants",byName:new Map(pants.map(x=>[x.nom,x]))},
      ...[1,2,3,4,5,6].map(k=>({slot:"ring_"+k,byName:new Map(rings.map(x=>[x.nom,x]))})),{slot:"head",byName:helmetByName}];
    // Écoles de magie (skills.json) et leurs deux écoles opposées.
    const MAGIC_SCHOOLS=skills.filter(x=>x.domaine==="Magie"&&x.niveau==="Catégorie").map(x=>x.nom);
    const opposites=school=>String(skillByName.get(school)?.ecoles_opposees||"").split(",").map(x=>x.trim()).filter(Boolean);

    function die(sides){ return Math.floor(random()*sides)+1; }
    function d100(){ return die(100); }
    function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
    function constant(code,fallback){
      const value=Number((rows.formulaConstants||[]).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    }
    const ONE_HAND_DODGE=constant("combat.one_handed.dodge_factor",0.2);
    const CRIT={
      min:constant("combat.melee.crit.min",1),
      max:constant("combat.melee.crit.max",25),
      luckDivisor:constant("combat.melee.crit.luck_divisor",10),
      fumbleThreshold:constant("combat.melee.fumble.threshold",96)
    };
    // Aura du capitaine (Idan, 2026-10-24) : courage × son Courage + charisma × son Charisme, en Courage pour ses alliés
    // à range cases ou moins.
    const AURA={
      courage:constant("captain.aura.courage_ratio",0.35),
      charisma:constant("captain.aura.charisma_ratio",0.25),
      range:constant("captain.aura.range_hex",10),
      lieutenant:constant("lieutenant.aura.share",0.5)
    };
    const CHAIN={
      max:constant("combat.melee.chain.max_probability",100),
      rangedDivisor:constant("combat.ranged.chain.divisor",1.5)
    };
    // Approximation projectile V1 ; couloir de tir décidé par Idan le 2026-10-08.
    const ELEMENTAL={min:constant("combat.elemental.protection_min",-50),max:constant("combat.elemental.protection_max",75)};
    const STEALTH={
      offset:constant("combat.stealth.offset",40),
      gap:constant("combat.stealth.gap_factor",2),
      distance:constant("combat.stealth.distance_factor",5),
      scale:constant("combat.stealth.scale",15),
      min:constant("combat.stealth.min",5),
      max:constant("combat.stealth.max",95),
      partialCover:constant("combat.stealth.cover_partial",30),
      totalCover:constant("combat.stealth.cover_total",60),
      scoutDistance:constant("combat.scout.distance",8)
    };
    const POISON={
      turns:constant("combat.poison.turns",3),
      constitutionShare:constant("combat.poison.resist_constitution_share",0.5),
      min:constant("combat.poison.resist_min",5),
      max:constant("combat.poison.resist_max",95)
    };
    // Décor (doc 04 ; Idan, 2026-11-06) : derrière une couverture partielle ou totale, le Toucher au tir et en charge est
    // multiplié par ce facteur ; une case lente traversée par une charge ajoute fallPerSlowStep × (coût − 1) % de chute.
    const COVER={
      partielle:constant("combat.cover.partial_hit_factor",0.5),
      totale:constant("combat.cover.total_hit_factor",0.25)
    };
    const CHARGE_FALL={
      base:constant("combat.charge.base_fall_probability",2),
      perSlowStep:constant("combat.charge.fall_per_slow_step",5)
    };
    const coverHitFactor=level=>COVER[level]??1;
    // Altitude : + hitPerLevel au Toucher par niveau au-dessus de la cible, autant de moins par niveau en dessous.
    const ALTITUDE={
      hitPerLevel:constant("combat.altitude.hit_per_level",10),
      climbCost:constant("combat.altitude.climb_cost",1),
      cliff:constant("combat.altitude.cliff",2),
      max:constant("combat.altitude.max",3)
    };
    // Taille (créatures sur plusieurs cases ; Idan, 2026-11-06 : tailles 1, 3 et 7 cases « Parfait », « Un cheval, deux
    // cases », une grande créature plus facile à toucher « Oui ») : character.taille = normale (1 case), longue (2 cases :
    // la tête et le corps derrière elle, dans le sens du déplacement, une monture), grande (3 cases en triangle) ou énorme
    // (7 cases : une case et son anneau). unit.q, unit.r = sa case d'ancrage (la tête, la pointe, le centre) ; unit.facing =
    // son sens (0 à 5). Toutes les distances se mesurent de case la plus proche à case la plus proche.
    const SIZE={
      hit:{normale:0,longue:constant("combat.taille.toucher_longue",0),grande:constant("combat.taille.toucher_grande",10),
        enorme:constant("combat.taille.toucher_enorme",20)}
    };
    const HEX_DIRS=[{q:1,r:0},{q:1,r:-1},{q:0,r:-1},{q:-1,r:0},{q:-1,r:1},{q:0,r:1}];
    const SIZES=["normale","longue","grande","enorme"];
    // Combat à cheval (Idan, 2026-11-07 ; doc 04) : unit.mount = son cheval, une unité à part entière (PV, effets), posée
    // sous lui (mêmes cases) tant qu'il le monte ; mount.rider = le cavalier. Le couple a la taille du cheval (un destrier :
    // longue, 2 cases) et son déplacement ; un seul test de Courage pour les deux, avec le Courage et la Volonté partagés.
    const MOUNT={
      meleeLevel:constant("combat.monture.hauteur_cac",1),
      chargeForce:constant("combat.monture.force_charge",0.5),
      shareDivisor:constant("combat.monture.partage_diviseur",100)
    };
    // Charge aérienne (doc 04 ; Idan, 2026-11-09 : « ils peuvent charger en passant au dessus des ennemis. 50% de contre
    // charge en moins et tous les jets ( toucher/ blessé/ dégâts)X1.2 » ; « 50% de toucher en moins ») : bonus, le facteur
    // du chargeur (Toucher, Blesser, dégâts) ; counter, celui du Toucher d'une contre-charge contre elle.
    const AERIAL={
      bonus:constant("combat.charge_aerienne.bonus",1.2),
      counter:constant("combat.charge_aerienne.contre_charge",0.5)
    };
    // Qui charge par les airs : une bête qui l'a « toujours », seule ou montée ; montée, son cavalier avec elle (« montée » :
    // seulement avec un cavalier ; Idan, 2026-11-09, le papillon géant). Une capacité de fiche (character.aerialCharge).
    function aerialCharger(unit){
      const m=mountOf(unit);
      if(m) return Boolean(m.character?.aerialCharge);
      return unit?.character?.aerialCharge==="toujours"||terrainSkillsOf(unit).some(s=>s.charge_aerienne==="toujours");
    }
    // Capacités de terrain (doc 04 ; Idan, 2026-11-09 : le vol des sangs féeriques, Déplacement aquatique, Respiration
    // aquatique, Déplacement sylvain ; terrain-skills.json) : un peuple, une culture, un sang à partir d'un niveau (3 :
    // bâtard), une invocation (son archétype).
    const terrainSkillRows=rows.terrainSkills||[];
    function terrainSkillsOf(unit){
      const c=unit?.character;
      if(!c||!terrainSkillRows.length) return [];
      return terrainSkillRows.filter(s=>(s.peuples||[]).includes(c.people)||(s.cultures||[]).includes(c.culture)
        ||(s.invocations||[]).includes(c.archetype)
        ||(s.ascendances||[]).some(a=>a.nom===c.ascendance&&(Number(c.ascendanceLevel)||0)>=(Number(a.niveau_min)||1)));
    }
    // Ce qu'elles lui donnent sur une case de ce décor : cost (remplace le coût du décor ; undefined : celui du décor), le
    // plus bas ; discretion, les bonus additionnés ; cover, la meilleure couverture.
    function terrainEffect(unit,decorCode){
      const out={cost:undefined,discretion:0,cover:null},rank={partielle:1,totale:2};
      if(!decorCode) return out;
      for(const s of terrainSkillsOf(unit)){
        const d=s.decors?.[decorCode];
        if(!d) continue;
        if(d.cout_mouvement!=null) out.cost=out.cost==null?Number(d.cout_mouvement):Math.min(out.cost,Number(d.cout_mouvement));
        out.discretion+=Number(d.discretion)||0;
        if(d.couverture&&(rank[d.couverture]||0)>(rank[out.cover]||0)) out.cover=d.couverture;
      }
      return out;
    }
    // Il vole par lui-même (le sang féerique) ; monté, c'est sa monture qui compte.
    function skillFlies(unit){ return !mountOf(unit)&&terrainSkillsOf(unit).some(s=>s.vol===true); }
    const MOUNT_SHARED=["Courage","Volonté"];
    // Gabarit (Idan, 2026-11-07 : « on fait la même chose que pour le dortoir ») : les places du dortoir du peuple
    // (peoples.json : 0,5, 1 ou 2) ; une monture, le sien (mounts.json, gabarit). On ne monte qu'une bête plus grande que soi.
    const peopleSize=new Map((rows.peoples||[]).map(p=>[p.nom,Number(p.places_dortoir)||1]));
    function bodySize(unit){
      const c=unit?.character;
      if(c?.gabarit!=null) return Number(c.gabarit)||1;
      return peopleSize.get(c?.people)||1;
    }
    function canRide(rider,mount){ return bodySize(rider)<bodySize(mount); }
    function mountOf(unit){ const m=unit?.mount; return m&&m.alive!==false&&!m.offMap&&unit.alive!==false?m:null; }
    // Le couple : un cheval monté répond par son cavalier (Courage, sous-nombre).
    function pairOf(unit){ const r=unit?.rider; return r&&r.mount===unit&&r.alive!==false&&!r.offMap?r:unit; }
    function ridden(unit){ return pairOf(unit)!==unit; }
    function sizeOf(unit){
      const m=mountOf(unit);
      if(m) return sizeOf(m);
      const t=unit?.character?.taille; return SIZES.includes(t)?t:"normale";
    }
    function isLarge(unit){ return sizeOf(unit)!=="normale"; }
    // Les cases d'une taille posée en (q, r) avec le sens facing.
    function footprintAt(q,r,size="normale",facing=0){
      const f=((Number(facing)||0)%6+6)%6,d=HEX_DIRS[f],e=HEX_DIRS[(f+1)%6];
      if(size==="longue") return [{q,r},{q:q-d.q,r:r-d.r}];
      if(size==="grande") return [{q,r},{q:q+d.q,r:r+d.r},{q:q+e.q,r:r+e.r}];
      if(size==="enorme") return [{q,r},...HEX_DIRS.map(x=>({q:q+x.q,r:r+x.r}))];
      return [{q,r}];
    }
    // Les cases d'un personnage (une case, ou son empreinte) ; d'une simple case, elle-même.
    function footprint(unit){
      if(!unit) return [];
      return unit.character?footprintAt(unit.q,unit.r,sizeOf(unit),unit.facing):[{q:unit.q,r:unit.r}];
    }
    // Plus facile à toucher : + SIZE.hit[taille] au Toucher (corps à corps, tir, sorts qui visent).
    function sizeHitBonus(defender){ return Number(SIZE.hit[sizeOf(defender)])||0; }
    const heightDiffOf=(attacker,defender)=>heightOf?(Number(heightOf(attacker))||0)-(Number(heightOf(defender))||0):0;
    // Le bonus de Discrétion d'une couverture, pour le repérage (doc 04 : +30 partielle, +60 totale).
    const coverDiscretion=level=>level==="totale"?STEALTH.totalCover:level==="partielle"?STEALTH.partialCover:0;
    // Mode sentinelle (Idan, 2026-11-06) : le tir de sentinelle gagne en précision (au Toucher) et enchaîne comme au corps à
    // corps (Enchaînement de tirs : diviseur par N au lieu de 1,5 × N).
    const SENTINEL={
      precision:constant("combat.sentinel.precision_bonus",20),
      chainDivisor:constant("combat.sentinel.chain_divisor",1)
    };
    const STRAY={
      initial:constant("combat.ranged.stray.initial_factor",0.35),
      decay:constant("combat.ranged.stray.decay_factor",0.5),
      coneAngle:constant("combat.ranged.stray.cone_angle",30),
      startRatio:constant("combat.ranged.stray.corridor_start_ratio",0.5)
    };
    const DUAL={dexterityBase:constant("combat.dual_wield.dexterity_denominator_base",2)};
    const BLOCK={
      min:constant("combat.shield.block.min_probability",5),
      max:constant("combat.shield.block.max_probability",80)
    };

    function hexDistance(a,b){
      const dq=a.q-b.q,dr=a.r-b.r;
      return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;
    }
    // Distance entre deux personnages ou cases : de case la plus proche à case la plus proche (une grande créature).
    function axialDistance(a,b){
      if(!isLarge(a)&&!isLarge(b)) return hexDistance(a,b);
      let best=Infinity;
      for(const x of footprint(a)) for(const y of footprint(b)) best=Math.min(best,hexDistance(x,y));
      return best;
    }
    // Cases traversées par une ligne droite de a à b, extrémités comprises (ligne de vue : Brouillard, doc 12). Un petit
    // décalage fixe tranche quand la ligne passe exactement entre deux cases : toujours du même côté.
    function hexLine(a,b){
      const n=axialDistance(a,b),cells=[];
      for(let i=0;i<=n;i++){
        const t=n?i/n:0;
        const x=a.q+(b.q-a.q)*t+1e-6,z=a.r+(b.r-a.r)*t+1e-6,y=-x-z;
        let rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);
        const dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);
        if(dx>dy&&dx>dz) rx=-ry-rz; else if(dy<=dz) rz=-rx-ry;
        cells.push({q:rx,r:rz});
      }
      return cells;
    }

    function itemBySlot(unit,slot){
      const id=unit.character.equipment?.slots?.[slot];
      return id?(unit.character.items||[]).find(x=>x.id===id)||null:null;
    }

    // Combat à deux armes CAC V1 : pendant l'attaque de la main secondaire (unit.attackHand === "off"), les
    // deux mains sont permutées : l'arme secondaire devient l'arme qui frappe et toutes les règles
    // (portée, maîtrise, prise, dégâts, recharge…) s'appliquent à elle.
    function activeWeaponItem(unit){ return unit.attackHand==="off"?offhandSlotItem(unit):itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"); }
    function activeOffhandItem(unit){ return unit.attackHand==="off"?itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"):offhandSlotItem(unit); }
    // Prise d'arme et mode deux mains V1 : une arme « 2 mains » exige une main secondaire vide (ni bouclier
    // ni seconde arme). Un objet rangé en main secondaire à côté d'elle, ou une arme « 2 mains » rangée en main
    // secondaire, n'est donc pas tenu : il ne bloque pas, ne frappe pas et ne ralentit pas.
    function offhandSlotItem(unit){
      const off=itemBySlot(unit,"weapon_set_"+unit.activeSet+"_off");
      if(!off) return null;
      const main=itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main");
      if(weaponTemplate(main)?.prise==="2 mains"||weaponTemplate(off)?.prise==="2 mains") return null;
      return off;
    }
    function armorItem(unit){ return itemBySlot(unit,"armor"); }
    // Bottes, ceinture, amulette et cape (Idan, 2026-10-24) : + bonus_t<tier> % de la valeur de base qu'elles servent
    // (Vitesse, Esquive, Perception pour les bottes ; Réserve de mana, Endurance, Courage pour la ceinture ; Puissance
    // magique, Volonté, Chance pour l'amulette ; Esquive, Discrétion pour la cape ; Pièges, Dextérité, Force pour les
    // gants ; Charisme, Intimidation pour la culotte ; Chance, Courage ou une école de magie pour chaque bague), ou
    // + bonus_t<tier> points quand
    // type_bonus vaut « points » (cape de résistance physique : la Résistance physique est trop petite pour un pourcentage).
    // Le Slip d'Affinité (« Affinité », en points) ne sert aucune valeur du combat : affinity.js l'ajoute à l'affinité.
    // Bague de magie (Idan, 2026-10-24) : − malus_opposees_t<tier> % de la maîtrise de base des deux écoles opposées à la
    // sienne (percent négatif). Plusieurs bagues identiques se cumulent : une ligne par bague.
    // Casques et chapeaux (Idan, 2026-10-25) : Constitution, Intelligence ou Compagnon animal ; le Casque de constitution
    // retire aussi malus_t<tier> % de la valeur de base de malus_caracteristique (Puissance magique), et sa Vitesse
    // (headgearSpeedPenalty).
    // baseValue : caractéristique, résistance ou compétence (Discrétion, Pièges, Intimidation, écoles de magie) ;
    // gearBonuses : une ligne par
    // objet qui la sert ;
    // statWithGear : la valeur bonifiée.
    function baseValue(unit,stat){
      const c=unit.character;
      if(c.stats&&stat in c.stats) return Number(c.stats[stat])||0;
      if(c.resistances&&stat in c.resistances) return Number(c.resistances[stat])||0;
      for(const group of ["martial","social","magic","animal"]) if(c.skills?.[group]&&stat in c.skills[group]) return Number(c.skills[group][stat])||0;
      return 0;
    }
    function gearBonuses(unit,stat){
      const base=baseValue(unit,stat);
      return STAT_GEAR.map(({slot,byName})=>{
        const item=itemBySlot(unit,slot),template=item?byName.get(item.name):null;
        if(!template) return null;
        if(template.caracteristique!==stat){
          if(template.malus_caracteristique===stat){
            const malus=Number(template["malus_t"+item.tier])||0;
            return malus?{item,slot,percent:-malus,bonus:-base*malus/100}:null;
          }
          const malus=Number(template["malus_opposees_t"+item.tier])||0;
          return malus&&opposites(template.caracteristique).includes(stat)?{item,slot,percent:-malus,bonus:-base*malus/100}:null;
        }
        const value=Number(template["bonus_t"+item.tier])||0;
        if(template.type_bonus==="points") return {item,slot,points:value,bonus:value};
        return {item,slot,percent:value,bonus:base*value/100};
      }).concat(heldWeaponBonuses(unit,stat,base)).filter(Boolean);
    }
    // Armes tenues dans le set actif qui servent une caractéristique (weapons.json, bonus_caracteristique et
    // bonus_t1 à bonus_t4 ; Idan, 2026-10-29, par tier depuis le 2026-11-05) : Bâton long (Puissance magique), Bâton court
    // (Réserve de mana), Fouet (Charisme), Trident (Eau) : 5 / 10 / 15 / 20 % ; Marteau de guerre (Foudre), Épée à deux mains
    // (Feu) : 3 / 6 / 9 / 12 %. Deux bâtons courts se cumulent.
    function weaponTierValue(weapon,prefix,item){
      const tier=Math.min(4,Math.max(1,Math.round(Number(item?.tier)||1)));
      return Number(weapon?.[prefix+"_t"+tier])||0;
    }
    function heldWeaponBonuses(unit,stat,base){
      return [activeWeaponItem(unit),activeOffhandItem(unit)].map(item=>{
        const weapon=weaponTemplate(item),value=weaponTierValue(weapon,"bonus",item);
        return weapon?.bonus_caracteristique===stat&&value?{item,slot:"weapon",percent:value,bonus:base*value/100}:null;
      });
    }
    // Avec l'équipement, et les sorts en cours, posés et retirés par l'écran de combat : le malus du Gel
    // (unit.statMalus = {stats, malus}) et les bonus de la Transmutation (unit.statBuffs = {code: {stats, value, unit}} :
    // un pourcentage de la valeur de base, comme l'équipement, ou des points).
    function statWithGear(unit,stat){
      return baseValue(unit,stat)+gearBonuses(unit,stat).reduce((sum,x)=>sum+x.bonus,0)+spellStatBonus(unit,stat)-spellStatMalus(unit,stat);
    }
    function spellStatBonus(unit,stat){
      let total=0;
      for(const fx of Object.values(unit?.statBuffs||{})){
        if(!(fx.stats||[]).includes(stat)) continue;
        const value=Number(fx.value)||0;
        total+=fx.unit==="pourcentage"?baseValue(unit,stat)*value/100:value;
      }
      return total;
    }
    function spellStatMalus(unit,stat){
      const fx=unit?.statMalus;
      return fx&&(fx.stats||[]).includes(stat)?Number(fx.malus)||0:0;
    }
    // Arme naturelle d'une créature invoquée (summon-archetypes.json, attaque) : son gabarit voyage avec l'objet.
    function weaponTemplate(item){ return item?item.template||weaponByName.get(item.name)||null:null; }

    function armorTemplate(item){
      if(!item) return null;
      const code=String(item.templateId||"").replace(/^armor:/,"");
      return armorByCode.get(code)||armors.find(x=>x.nom===item.name)||null;
    }

    function quality(item){
      return qualityByCode.get(item?.qualityCode)||{
        multiplicateur_qualite:1,
        multiplicateur_malus:1
      };
    }

    function weaponCategory(character,weapon){
      return skillByName.get(weapon?.nom)?.parent
        || character.items?.find(x=>x.name===weapon?.nom)?.category
        || null;
    }

    function mastery(character,weapon){
      const category=weaponCategory(character,weapon);
      return {
        category,
        categoryScore:Number(character.skills?.martial?.[category])||0,
        weaponScore:Number(character.skills?.martial?.[weapon?.nom])||0
      };
    }

    function isShield(weapon){
      return /Boucliers/.test(String(weapon?.domaine||""));
    }

    // Combat à deux armes CAC V1 : une arme (pas un bouclier) dans chaque main du set actif.
    function isDualWielding(unit){
      const main=weaponTemplate(itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"));
      const off=weaponTemplate(offhandSlotItem(unit));
      return Boolean(main&&off&&!isShield(main)&&!isShield(off));
    }
    // Dextérité effective = Dextérité (avec les gants), ou Dextérité / (2 − maîtrise Combat à deux armes / 100) à deux armes.
    // Nunchaku (weapons.json, attaque_caracteristique, attaque_source et attaque_part ; Idan, 2026-10-29) : en attaquant
    // avec lui, + 10 % de sa Télékinésie en Dextérité.
    function attackStatBonus(unit,stat){
      const weapon=weaponTemplate(activeWeaponItem(unit));
      return weapon?.attaque_caracteristique===stat?(Number(weapon.attaque_part)||0)*statWithGear(unit,weapon.attaque_source):0;
    }
    function effectiveDexterity(unit){
      const dexterity=statWithGear(unit,"Dextérité")+attackStatBonus(unit,"Dextérité");
      if(!isDualWielding(unit)) return dexterity;
      const skill=clamp(Number(unit.character.skills?.martial?.["Combat à deux armes"])||0,0,100);
      return dexterity/(DUAL.dexterityBase-skill/100);
    }
    // Plusieurs coups d'une arme naturelle (le cerbère, trois morsures ; Idan, 2026-11-09 : « Il a 3 attaques de morsures
    // séparés » ; « comme le combat à deux armes, chacune frappe une fois avec son propre jet ») : weapons.attaques.
    function strikeCount(unit){
      if(isDualWielding(unit)) return 1;
      return Math.max(1,Math.floor(Number(weaponTemplate(itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"))?.attaques)||1));
    }
    // Plusieurs coups par séquence : deux armes, ou une arme naturelle à plusieurs coups.
    function severalStrikes(unit){ return isDualWielding(unit)||strikeCount(unit)>1; }
    // Les mains qui peuvent frapper cette cible à cette distance, chacune avec son mode (arme principale d'abord).
    function usableHands(unit,distance){
      const hands=isDualWielding(unit)?["main","off"]:Array.from({length:strikeCount(unit)},()=>"main");
      return hands.map(hand=>withHand(unit,hand,()=>{
        const weapon=weaponTemplate(activeWeaponItem(unit));
        const mode=isRangedWeapon(weapon)?"ranged":"melee";
        return canAttackAtDistance(unit,distance,mode)?{hand,mode,weapon:weapon.nom}:null;
      })).filter(Boolean);
    }
    function withHand(unit,hand,fn){
      const before=unit.attackHand;
      unit.attackHand=hand==="off"?"off":undefined;
      try{ return fn(); }finally{ if(before===undefined) delete unit.attackHand; else unit.attackHand=before; }
    }

    function isRangedWeapon(weapon){
      return /Armes de tir|Armes à feu/.test(String(weapon?.domaine||""));
    }

    function isMeleeWeapon(weapon){
      return Boolean(weapon)&&!isRangedWeapon(weapon)&&!/Boucliers/.test(String(weapon.domaine||""));
    }

    // Prise d'arme (Idan, 2026-11-02) : une arme « Au choix » tenue seule l'est à une main par défaut, la main libre ;
    // elle n'est empoignée à deux mains que pour une attaque choisie à deux mains (unit.twoHandGrip, jusqu'à la
    // prochaine activation du combattant).
    function usesTwoHands(unit,weapon){
      if(!weapon) return false;
      if(weapon.prise==="2 mains") return true;
      return weapon.prise==="Au choix"&&!activeOffhandItem(unit)&&unit.twoHandGrip===true;
    }
    // Une arme « Au choix » tenue seule, l'autre main vide : on peut l'empoigner à deux mains.
    function canGripTwoHands(unit){
      const weapon=weaponTemplate(itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"));
      return weapon?.prise==="Au choix"&&!offhandSlotItem(unit);
    }
    // L'IA (ennemis, combat automatique) empoigne à deux mains quand Combat à deux mains vaut au moins Combat à une main.
    function prefersTwoHands(unit){
      const martial=unit.character?.skills?.martial||{};
      return (Number(martial["Combat à deux mains"])||0)>=(Number(martial["Combat à une main"])||0);
    }
    // Combat à une main (Idan, 2026-11-02) : une arme à une main tenue seule, l'autre main vide (le pistolet compris,
    // une arme « Au choix » tant qu'elle n'est pas empoignée à deux mains) : Esquive + 0,2 × Combat à une main.
    function fightsOneHanded(unit){
      const weapon=weaponTemplate(itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"));
      if(!weapon||/Boucliers/.test(String(weapon.domaine||""))||offhandSlotItem(unit)) return false;
      return weapon.prise==="1 main"||(weapon.prise==="Au choix"&&unit.twoHandGrip!==true);
    }
    function oneHandDodge(unit){
      return fightsOneHanded(unit)?ONE_HAND_DODGE*(Number(unit.character?.skills?.martial?.["Combat à une main"])||0):0;
    }

    function armorMobility(unit){
      const item=armorItem(unit),armor=armorTemplate(item);
      if(!armor) return {speed:0,dodge:0};
      const q=quality(item);
      const malus=Number(q.multiplicateur_malus)||1;
      return {
        speed:(Number(armor.malus_vitesse_base)||0)*malus,
        dodge:(Number(armor.malus_esquive_base)||0)*malus
      };
    }

    // Vitesse combat effective CAC V1 : les malus de tous les objets tenus s'additionnent (arme principale et
    // main secondaire : seconde arme ou bouclier).
    function weaponSpeedPenalty(unit){
      return heldItemSpeedPenalty(unit,activeWeaponItem(unit))+heldItemSpeedPenalty(unit,activeOffhandItem(unit));
    }

    // Malus vitesse arme effectif V1, pour un objet tenu.
    function heldItemSpeedPenalty(unit,item){
      const weapon=weaponTemplate(item);
      if(!weapon) return 0;
      const q=quality(item),m=mastery(unit.character,weapon);
      const qualityPenalty=(Number(weapon.malus_vitesse_arme_base)||0)*(Number(q.multiplicateur_malus)||1);
      const masteryFactor=Math.max(0,1-(m.categoryScore+m.weaponScore)/400);
      // Plus de malus divisé par deux pour une arme « Au choix » à deux mains (Idan, 2026-11-02).
      return Math.max(0,qualityPenalty*masteryFactor);
    }

    // Poids du casque (Idan, 2026-10-25) : vitesse_t<tier> points de Vitesse en moins (Casque de constitution).
    function headgearSpeedPenalty(unit){
      const item=itemBySlot(unit,"head"),template=item?helmetByName.get(item.name):null;
      return template?Number(template["vitesse_t"+item.tier])||0:0;
    }

    function effectiveSpeed(unit){
      return Math.max(1,(statWithGear(unit,"Vitesse")||1)-armorMobility(unit).speed-weaponSpeedPenalty(unit)-headgearSpeedPenalty(unit));
    }

    function effectiveDodge(unit){
      if(unit.prone) return 0;
      return Math.max(1,(statWithGear(unit,"Esquive")||1)-armorMobility(unit).dodge+oneHandDodge(unit));
    }

    // PV maximum (formula pv-maximum-v1) : ceil(3 × (Constitution + 0,2 × Endurance + 0,1 × Volonté)), avec l'équipement
    // et ce que le mercenaire a gagné en mission (Idan, 2026-10-25). Les ennemis gardent les PV de leur fiche (doc 17 §10).
    function maxHp(unit){
      const c=unit?.character;
      if(c?.archetype) return Number(c.pvMax)||1;
      const score=statWithGear(unit,"Constitution")+0.2*statWithGear(unit,"Endurance")+0.1*statWithGear(unit,"Volonté");
      return Math.max(1,Math.ceil(3*score-1e-9));
    }

    function movementBase(unit){
      // À cheval, c'est le cheval qui marche.
      const m=mountOf(unit);
      if(m) return movementBase(m);
      const score=effectiveSpeed(unit)
        +0.25*statWithGear(unit,"Endurance")
        +0.10*statWithGear(unit,"Volonté");
      return Math.max(1,Math.ceil(score/15));
    }

    // Le Chapeau d'intelligence compte (Idan, 2026-10-25).
    function initiative(unit){
      return effectiveSpeed(unit)
        +0.25*statWithGear(unit,"Intelligence")
        +0.10*statWithGear(unit,"Courage")
        +0.05*statWithGear(unit,"Volonté");
    }

    function weaponRange(unit){
      const weapon=weaponTemplate(activeWeaponItem(unit));
      if(!weapon) return {min:1,max:1};
      const min=Number(weapon.portee_min_hex);
      const max=Number(weapon.portee_max_hex);
      return {
        min:Number.isFinite(min)&&min>0?min:1,
        max:Number.isFinite(max)&&max>0?max:1
      };
    }

    // Armes à feu — recharge V1 : une arme à recharge (skills.json, recharge_action_rapide) doit être chargée
    // pour tirer et se décharge après son tir ; une Action rapide recharge une arme. Pas de munitions ordinaires.
    // État propre à la mission : unit.unloaded liste les armes déchargées ; tout est chargé au départ.
    function needsLoading(weapon){
      return Boolean(skillByName.get(weapon?.nom)?.recharge_action_rapide);
    }
    function isLoaded(unit,item){
      return !item||!needsLoading(weaponTemplate(item))||!(unit.unloaded||[]).includes(item.id);
    }
    function heldUnloaded(unit){
      return [activeWeaponItem(unit),activeOffhandItem(unit)].find(item=>item&&!isLoaded(unit,item))||null;
    }
    function canReload(unit){ return Boolean(heldUnloaded(unit)); }
    // Recharge une arme tenue (arme principale d'abord) ; renvoie l'objet rechargé, ou null.
    function reload(unit){
      const item=heldUnloaded(unit);
      if(item) unit.unloaded=unit.unloaded.filter(id=>id!==item.id);
      return item;
    }

    function canAttackAtDistance(unit,distance,mode){
      if(!isLoaded(unit,activeWeaponItem(unit))) return false;
      const weapon=weaponTemplate(activeWeaponItem(unit));
      if(!weapon) return false;
      if(mode==="ranged"&&!isRangedWeapon(weapon)) return false;
      if(mode==="melee"&&!isMeleeWeapon(weapon)) return false;
      const range=weaponRange(unit);
      return distance>=range.min&&distance<=range.max;
    }

    function effectiveArmorResistance(unit,type){
      const item=armorItem(unit),armor=armorTemplate(item);
      if(!armor) return 0;
      const meta=PHYSICAL_TYPES.find(x=>x.name===type);
      if(!meta) return 0;
      const base=Number(armor[meta.armor])||0;
      const mult=Number(quality(item).multiplicateur_qualite)||1;
      return base>=0?base*mult:base/mult;
    }

    // Protection contre un élément (feu, froid, foudre ; doc 12, Idan 2026-10-25) : Résistance du personnage (équipement
    // compris) + valeur de l'armure portée pour cet élément (« brûlant », « glaçant », « foudroyant » ; les plates font
    // brûler davantage) + bonus de sort en cours (unit.elementalBonus, par exemple Armure de feu contre le froid).
    // Les dégâts élémentaires sont multipliés par (1 − protection / 100), protection bornée de −50 à +75.
    function armorElementalResistance(unit,element){
      const item=armorItem(unit),armor=armorTemplate(item),meta=ELEMENTS[element];
      if(!armor||!meta?.armor) return 0;
      const base=Number(armor[meta.armor])||0;
      const mult=Number(quality(item).multiplicateur_qualite)||1;
      return base>=0?base*mult:base/mult;
    }
    function elementalProtection(unit,element){
      const meta=ELEMENTS[element];
      if(!meta) return {resistance:0,armor:0,bonus:0,total:0,applied:0};
      const resistance=statWithGear(unit,meta.resistance),armor=armorElementalResistance(unit,element);
      const bonus=Number(unit?.elementalBonus?.[element]?.bonus)||0,total=resistance+armor+bonus;
      return {resistance,armor,bonus,total,applied:clamp(total,ELEMENTAL.min,ELEMENTAL.max)};
    }
    function elementalDamage(unit,element,amount){
      const protection=elementalProtection(unit,element);
      if(element==="poison"&&poisonImmune(unit)) return {...protection,amount,damage:0,immune:true};
      return {...protection,amount,damage:iced(unit,Math.max(0,Math.ceil(amount*(1-protection.applied/100)-1e-9)))};
    }
    // Prison de glace (Eau ; Idan, 2026-10-31) : figé dans la glace, on ne subit que unit.frozen.factor des dégâts (0,5) :
    // coups d'armes, toucher spectral, dégâts physiques et élémentaires des sorts. Les dégâts « sans aucune résistance »
    // (Restitution, Nécrose…) passent entiers.
    function iced(unit,damage){
      return unit?.frozen?Math.max(0,Math.ceil(damage*(Number(unit.frozen.factor)||0.5)-1e-9)):damage;
    }
    // Sommeil (Illusion) : un dormeur blessé se réveille ; l'écran de combat l'annonce (unit.wokeUp).
    function wake(unit,damage){
      if(damage>0&&unit?.asleep){ unit.asleep=null; unit.wokeUp=true; }
    }

    // Dégâts physiques d'un sort (Télékinésie ; Idan, 2026-10-28 : « ça passe par l'armure », contondant) : l'étape
    // Blesser d'une arme, la Puissance magique du lanceur tenant le rôle de la Force et 0,2 × la Maîtrise du sort celui des
    // compétences d'arme ; la puissance du sort face à la résistance de l'armure au type ; puis la Résistance physique de la
    // cible, avec sa variation D3, comme pour une arme. Ne touche pas aux PV : l'écran de combat les applique.
    // La chance qu'un sort physique blesse, sans jet (aussi pour l'aperçu des sorts).
    function spellWoundChance(caster,target,{type="contondant",power=0,mastery=0}={}){
      const armorResistance=effectiveArmorResistance(target,type),matchup=power-armorResistance;
      const delta=statWithGear(caster,"Puissance magique")+0.2*mastery+matchup-statWithGear(target,"Endurance");
      return {armorResistance,matchup,pWound:clamp(logistic(delta),10,90)};
    }
    // Squelettes (Idan, 2026-11-06 : « très résistants aux dégâts tranchants, très faibles aux contondants ») :
    // character.damageTypeFactors[type] multiplie les dégâts d'un coup ou d'un sort physique de ce type (1 par défaut).
    function damageTypeFactor(unit,type){
      const f=Number(unit?.character?.damageTypeFactors?.[type]);
      return Number.isFinite(f)&&f>=0?f:1;
    }
    function withTypeFactor(unit,type,data){
      const factor=damageTypeFactor(unit,type);
      return factor===1?data:{...data,damage:Math.max(0,Math.ceil(data.damage*factor-1e-9)),typeFactor:factor};
    }
    function spellPhysicalHit(caster,target,amount,{type="contondant",power=0,mastery=0}={}){
      if(target.character?.immunePhysical) return {type,power,immune:true,wound:false,damage:0};
      const {armorResistance,matchup,pWound}=spellWoundChance(caster,target,{type,power,mastery}),woundRoll=d100();
      const head={type,power,armorResistance,matchup,pWound,woundRoll};
      if(woundRoll>pWound) return {...head,wound:false,damage:0};
      const resistanceRoll=die(3);
      return {...head,wound:true,...withTypeFactor(target,type,spellPhysicalDamage(target,amount,resistanceRoll))};
    }
    // Les dégâts d'un sort physique qui blesse : la Résistance physique (50 % au plus) × (jet d3 + 8) ÷ 10 ; jet 3 : le moins
    // de dégâts, jet 1 : le plus (l'aperçu des sorts).
    function spellPhysicalDamage(target,amount,resistanceRoll){
      const physicalResistance=clamp(statWithGear(target,"Résistance physique"),0,50);
      const damage=iced(target,Math.max(0,Math.ceil(amount*(1-(physicalResistance/100)*((resistanceRoll+8)/10))-1e-9)));
      return {physicalResistance,resistanceRoll,damage};
    }

    // Lancer d'arme (Télékinésie ; Idan, 2026-10-31, chiffres de JC3) : l'arme de corps à corps tenue, lancée par l'esprit
    // puis ramenée : ses dés × sa qualité × (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100), puis l'étape Blesser d'un
    // sort physique (spellPhysicalHit) avec le meilleur type de dégâts de l'arme contre l'armure de la cible. null sans arme.
    function weaponThrow(caster,target,{mastery=0,critical=false}={}){
      const item=activeWeaponItem(caster),weapon=weaponTemplate(item);
      if(!weapon||!isMeleeWeapon(weapon)) return null;
      const rolled=rollWeaponDamage(weapon,critical?"max":null);
      const amount=Math.ceil(10*rolled.total*(Number(quality(item).multiplicateur_qualite)||1)
        *(2*statWithGear(caster,"Puissance magique")/100)*(0.5+mastery/100)-1e-9);
      const best=[...damageMatchups(target,weapon)].sort((a,b)=>b.matchup-a.matchup)[0]||{type:"contondant",power:0};
      return {weapon:item.name,weaponRoll:rolled.total,amount,...spellPhysicalHit(caster,target,amount,{type:best.type,power:best.power,mastery})};
    }

    // Discrétion et camouflage (doc 04 ; Idan, 2026-10-28) : un personnage que l'ennemi n'a jamais vu est camouflé
    // (unit.camouflaged) ; au début de chaque tour, chaque personnage tente de repérer chaque ennemi encore camouflé dans sa
    // ligne de vue : P = 100 / (1 + e^(−Δ/15)), Δ = Perception − (Discrétion + couverture) + 40 − 5 × distance, de 5 à 95 %.
    // cover : le bonus de couverture (STEALTH.partialCover, STEALTH.totalCover), quand le décor existera.
    // Un cavalier (Idan, 2026-11-07 : « Quand un cavalier est sur une monture, c'est la discrétion minimale des deux qui est
    // prise en compte. ( Dur de se camoufler sur un dragon) ») : la plus basse du cavalier et de sa monture.
    function stealthOf(unit){
      const own=statWithGear(unit,"Discrétion"),m=mountOf(unit);
      return m?Math.min(own,statWithGear(m,"Discrétion")):own;
    }
    // Une courbe qui récompense la discrétion et la perception (Idan, 2026-11-09 : « on fait une courbe qui récompense
    // grandement la discrétion et la perception » ; « Partons sur B ») : l'écart Perception − (Discrétion + couverture) compte
    // STEALTH.gap fois (× 2), et la chance descend jusqu'à 0,1 % (au lieu de 5 %).
    function detectionChance(observer,target,distance,cover=0){
      const delta=STEALTH.gap*(statWithGear(observer,"Perception")-(stealthOf(target)+cover))+STEALTH.offset-STEALTH.distance*distance;
      return clamp(100/(1+Math.exp(-delta/STEALTH.scale)),STEALTH.min,STEALTH.max);
    }
    // Un jet au centième (0,01 à 100) : une chance de 0,1 % reste possible.
    function rollDetection(observer,target,distance,cover=0){
      const p=detectionChance(observer,target,distance,cover),roll=Math.max(1,Math.ceil(random()*10000))/100;
      return {p,roll,spotted:roll<=p};
    }
    // L'éclaireur (doc 04 ; Idan, 2026-11-09 : « On peut, avant le combat envoyer un éclaireur choisi parmi les mercenaires
    // de la mission. Il peut ne pas revenir ! ( Test en fonction de sa discrétion et la perception de chaque ennemi) La chance
    // de se faire repérer reste faible » ; « on ne peut pas envoyer un compagnon animal seul. Il peut y aller avec son maître,
    // donc discrétion de son maître ») : chaque ennemi tente de le repérer, à combat.scout.distance cases, l'éclaireur
    // derrière une couverture totale, avec sa propre Discrétion (son animal le suit) ; un seul succès : il est capturé. Sinon,
    // il cherche à son tour chaque ennemi, à la même distance, à découvert : ceux qu'il voit commencent le combat repérés (« il
    // peut en avoir qu'il ne voit pas »). Renvoie {captured, by, capture: [jets], looks: [jets], spotted: [ennemis vus]}.
    function resolveScouting(scout,enemies=[]){
      const alone={character:scout?.character,activeSet:scout?.activeSet||1},d=STEALTH.scoutDistance,capture=[];
      for(const foe of enemies){
        const r=rollDetection(foe,alone,d,STEALTH.totalCover);
        capture.push({foe,...r});
        if(r.spotted) return {captured:true,by:foe,capture,looks:[],spotted:[]};
      }
      const looks=enemies.map(foe=>({foe,...rollDetection(alone,foe,d,0)}));
      return {captured:false,by:null,capture,looks,spotted:looks.filter(x=>x.spotted).map(x=>x.foe)};
    }

    // Fiole de poison (Idan, 2026-11-03 : « Seul ceux qui ont la compétence peuvent empoisonner leur arme en utilisant une
    // potion ») : il faut l'aptitude Empoisonnement des armes. La sarbacane, elle, empoisonne d'elle-même.
    const POISONER="Empoisonnement des armes";
    function canPoisonWeapon(unit){ return unit?.character?.skills?.martial?.[POISONER]===true; }
    // Poison (Idan, 2026-10-27) : au début de chaque activation de l'empoisonné (unit.poisoned = {turns, amount}), un jet
    // de résistance, D100 ≤ part × Constitution + Résistance au poison (équipement compris, de 5 à 95 %), annule l'effet ;
    // sinon il subit les dégâts légers du poison, réduits par sa Résistance au poison. L'écran de combat décompte les tours.
    // Morts-vivants (Idan, 2026-11-06 : « Oui insensible aux poisons ») : character.immunePoison, ni dégâts ni effet.
    function poisonImmune(unit){ return Boolean(unit?.character?.immunePoison); }
    function poisonResistChance(unit){
      return clamp(POISON.constitutionShare*statWithGear(unit,"Constitution")+statWithGear(unit,"Résistance au poison"),POISON.min,POISON.max);
    }
    function resolvePoison(unit){
      const fx=unit?.poisoned;
      if(!fx||typeof fx!=="object") return null;
      if(poisonImmune(unit)) return {p:100,roll:0,resisted:true,immune:true,damage:0};
      const p=poisonResistChance(unit),roll=d100();
      if(roll<=p) return {p,roll,resisted:true,damage:0};
      return {p,roll,resisted:false,...elementalDamage(unit,"poison",Number(fx.amount)||0)};
    }

    // Frappe dans le dos V1 : la résistance au type de dégâts est divisée par deux pour l'étape Blesser.
    // Critique toucher — armure ignorée V1 : après un critique au Toucher, l'armure ne compte pas pour Blesser.
    function damageMatchups(defender,weapon,context={}){
      const factor=context.ignoreArmor?0:context.backstab?0.5:1;
      return PHYSICAL_TYPES.map(type=>{
        const power=Number(weapon?.[type.weapon])||0;
        if(power<=0) return null;
        const armorResistance=effectiveArmorResistance(defender,type.name)*factor;
        return {type:type.name,power,armorResistance,matchup:power-armorResistance};
      }).filter(Boolean);
    }

    function selectDamageMatchup(attacker,defender,weapon,context={}){
      const candidates=damageMatchups(defender,weapon,context);

      if(!candidates.length) return {type:"contondant",power:0,armorResistance:0,matchup:0};

      const sorted=[...candidates].sort((a,b)=>a.matchup-b.matchup);
      const intelligence=statWithGear(attacker,"Intelligence");
      const roll=d100();
      if(roll<intelligence) return {...sorted[sorted.length-1],intelligenceRoll:roll,choice:"meilleur"};
      if((roll/2)>intelligence) return {...sorted[0],intelligenceRoll:roll,choice:"pire"};

      const avg=candidates.reduce((s,x)=>s+x.matchup,0)/candidates.length;
      const chosen=[...candidates].sort((a,b)=>Math.abs(a.matchup-avg)-Math.abs(b.matchup-avg))[0];
      return {...chosen,intelligenceRoll:roll,choice:"moyen"};
    }

    function logistic(delta){
      return 10+80/(1+Math.exp(-delta/20));
    }

    // Attaque d'opportunité V1 : Esquive ×0,5 et Perception défensive annulée.
    // Frappe dans le dos V1 : Perception défensive annulée.
    // Précision et Puissance (Idan, 2026-10-30 : la case des dégâts de la fiche les montre en scores) : la part de
    // l'attaquant dans le delta du Toucher et dans celui de Blesser, sans la cible, la distance ni la charge.
    // Précision = Dextérité effective + 0,2 × (maîtrises de catégorie et d'arme + Perception + Vitesse au combat) ;
    // Puissance = Force (Perception au tir) + 0,2 × (maîtrises de catégorie et d'arme + Combat à deux mains si l'arme
    // est réellement maniée à deux mains au corps à corps).
    function attackPrecision(attacker){
      const m=mastery(attacker.character,weaponTemplate(activeWeaponItem(attacker)));
      return effectiveDexterity(attacker)
        +0.2*(m.categoryScore+m.weaponScore+statWithGear(attacker,"Perception")+effectiveSpeed(attacker));
    }
    function attackPower(attacker,mode){
      const weapon=weaponTemplate(activeWeaponItem(attacker));
      const m=mastery(attacker.character,weapon);
      if(mode==="ranged") return statWithGear(attacker,"Perception")+0.2*(m.categoryScore+m.weaponScore);
      const twoHands=usesTwoHands(attacker,weapon)?Number(attacker.character.skills?.martial?.["Combat à deux mains"])||0:0;
      return statWithGear(attacker,"Force")+0.2*(m.categoryScore+m.weaponScore+twoHands);
    }

    function hitProbability(attacker,defender,mode,distance,context={}){
      const defensivePerception=context.opportunity||context.backstab?0:statWithGear(defender,"Perception");
      const dodgeFactor=context.opportunity?0.5:1;
      let delta=attackPrecision(attacker)
        -dodgeFactor*effectiveDodge(defender)
        -0.2*(defensivePerception+effectiveSpeed(defender));
      if(context.sentinel&&mode==="ranged") delta+=SENTINEL.precision;
      delta+=sizeHitBonus(defender);
      // Altitude : context.heightDiff = hauteur de l'attaquant − hauteur du défenseur (au tir comme au corps à corps).
      delta+=ALTITUDE.hitPerLevel*(Number(context.heightDiff)||0);
      // À cheval (Idan, 2026-11-07) : au corps à corps, le cavalier compte comme un niveau plus haut (rien contre le cheval).
      if(mode==="melee") delta+=ALTITUDE.hitPerLevel*MOUNT.meleeLevel*((mountOf(attacker)?1:0)-(mountOf(defender)?1:0));

      if(mode==="ranged"){
        const range=weaponRange(attacker);
        const free=Math.ceil(range.max/4);
        if(distance>free&&range.max>free){
          delta-=40*(distance-free)/(range.max-free);
        }
      }
      // Couverture (doc 04 ; Idan, 2026-11-06) : context.cover, « partielle » ou « totale », au tir et en défense de charge.
      // context.factor : la charge aérienne (× 1,2 pour le chargeur, × 0,5 pour la contre-charge), au plus 100 %.
      return Math.min(100,clamp(logistic(delta),10,90)*coverHitFactor(context.cover)*(Number(context.factor)||1));
    }

    // Charge à cheval (Idan, 2026-11-07) : la moitié de la Force du cheval s'ajoute à celle du cavalier.
    function mountChargeForce(attacker,chargePower=0){
      const m=Number(chargePower)>0?mountOf(attacker):null;
      return m?MOUNT.chargeForce*statWithGear(m,"Force"):0;
    }
    // Charge CAC V1 : ForceEffectiveCharge = Force + PuissanceCharge pour Blesser.
    function woundProbability(attacker,defender,mode,matchup,context={}){
      const delta=attackPower(attacker,mode)
        +(mode==="ranged"?0:(Number(context.chargePower)||0)+mountChargeForce(attacker,context.chargePower))
        +(Number(matchup?.matchup)||0)
        -statWithGear(defender,"Endurance");
      // context.factor : la charge aérienne (× 1,2), au plus 100 %.
      return Math.min(100,clamp(logistic(delta),10,90)*(Number(context.factor)||1));
    }

    function parseDice(expr){
      const m=String(expr||"").trim().match(/^(\d+)D(\d+)$/i);
      return m?{count:Number(m[1]),sides:Number(m[2])}:{count:1,sides:4};
    }

    // roll : "max" (Critique de blessure positif) ou "min" (Échec critique de blessure) remplace le jet.
    function rollWeaponDamage(weapon,roll=null){
      const dice=parseDice(weapon?.degats_pv_base);
      let total=0;
      if(roll==="max") total=dice.count*dice.sides;
      else if(roll==="min") total=dice.count;
      else for(let i=0;i<dice.count;i++) total+=die(dice.sides);
      return {total,dice:dice.count+"D"+dice.sides};
    }

    // fixed.roll : jet de dégâts imposé ("max" / "min") ; fixed.resistanceRoll : D3 de la variation de
    // Résistance physique imposé (1 → 0,9, le plus favorable à l'attaquant ; 3 → 1,1, le plus favorable
    // à la réduction). Pour le contrecoup d'un échec critique de blessure, defender est l'attaquant lui-même.
    function physicalDamage(attacker,defender,mode,chargePower=0,fixed={}){
      const item=activeWeaponItem(attacker),weapon=weaponTemplate(item);
      const rolled=rollWeaponDamage(weapon,fixed.roll);
      const q=quality(item);
      let effective=rolled.total*(Number(q.multiplicateur_qualite)||1);

      if(mode==="melee"&&weapon?.prise==="Au choix"&&usesTwoHands(attacker,weapon)) effective*=1.5;
      if(chargePower>0) effective*=1+chargePower/100;

      const physicalResistance=clamp(statWithGear(defender,"Résistance physique"),0,50);
      const resistanceRoll=fixed.resistanceRoll||die(3);
      const resistanceFactor=1-(physicalResistance/100)*((resistanceRoll+8)/10);
      const strengthFactor=mode==="melee"
        ? 2*(statWithGear(attacker,"Force")+mountChargeForce(attacker,chargePower))/100
        : 1;

      return {
        damage:iced(defender,Math.max(0,Math.ceil(10*effective*strengthFactor*resistanceFactor))),
        weaponRoll:rolled.total,
        weaponDice:rolled.dice,
        resistanceRoll,
        physicalResistance,
        qualityMultiplier:Number(q.multiplicateur_qualite)||1
      };
    }

    // Blocage bouclier physique V1 : bouclier tenu en main secondaire du set actif ; null sans bouclier.
    // Maîtrise effective = moyenne de la catégorie Boucliers et du bouclier précis ; le bonus de blocage
    // (skills.json, bonus_blocage_base) suit la qualité.
    function blockChance(unit){
      const item=activeOffhandItem(unit),shield=weaponTemplate(item);
      if(!isShield(shield)) return null;
      const m=mastery(unit.character,shield);
      const bonus=(Number(skillByName.get(shield.nom)?.bonus_blocage_base)||0)*(Number(quality(item).multiplicateur_qualite)||1);
      const dexterity=statWithGear(unit,"Dextérité");
      return clamp((dexterity+(m.categoryScore+m.weaponScore)/2)/2+bonus,BLOCK.min,BLOCK.max);
    }

    // Le bouclier peut-il bloquer ce coup (Idan, 2026-11-04) ? Pas dans le dos, et un seul blocage réussi par tour.
    function shieldReady(unit,{backstab=false}={}){ return !backstab&&!unit?.shieldBlocked; }
    // Au début de chaque tour : chacun retrouve son blocage.
    function resetShieldBlocks(units){ for(const unit of units||[]) if(unit) delete unit.shieldBlocked; }

    // Critique positif CAC V1 : 1 % à 25 % selon la Chance, après un Toucher puis après un Blesser réussis.
    // 04-combat « Critiques physiques V1 » : la V1 distance réutilise ce même principe.
    function criticalChance(unit){
      return clamp(statWithGear(unit,"Chance")/CRIT.luckDivisor,CRIT.min,CRIT.max);
    }
    // Échec critique (Toucher ou Blesser) : naturel ≥ 96, puis D100 > Chance pour qu'il soit confirmé.
    function fumbleTest(unit,naturalRoll){
      if(naturalRoll<CRIT.fumbleThreshold) return {fumble:false};
      const fumbleRoll=d100();
      return {fumbleRoll,fumble:fumbleRoll>statWithGear(unit,"Chance")};
    }

    // Enchaînement d'attaques CAC V1 : P_N = min(100, (Dextérité effective + Vitesse combat effective) / N).
    // Enchaînement de tirs distance V1 : même calcul divisé par 1,5 × N, armes « Répétable » seulement.
    function isRepeatable(weapon){
      return skillByName.get(weapon?.nom)?.cadence_tir==="Répétable";
    }
    // sentinel : tir de sentinelle (Idan, 2026-11-06), il enchaîne comme au corps à corps.
    function chainChance(attacker,n,mode,{sentinel=false}={}){
      const divisor=mode==="ranged"?(sentinel?SENTINEL.chainDivisor:CHAIN.rangedDivisor)*n:n;
      return Math.min(CHAIN.max,(effectiveDexterity(attacker)+effectiveSpeed(attacker))/divisor);
    }
    // L'attaque précédente doit avoir réellement touché (ni bloquée ni parée), sans échec critique, contre une cible
    // encore vivante. Un critique positif n'arrête pas la chaîne.
    function canChain(attacker,defender,result,mode){
      if(!result?.ok||!result.hit||result.blocked||result.parried||result.fumble||result.woundFumble) return false;
      if(!attacker.alive||!defender.alive) return false;
      return mode!=="ranged"||isRepeatable(weaponTemplate(activeWeaponItem(attacker)));
    }
    // Tente d'ouvrir l'attaque numéro n (n ≥ 2) ; null si la chaîne s'arrête d'elle-même.
    function rollChain(attacker,defender,result,n,mode,{sentinel=false}={}){
      if(!canChain(attacker,defender,result,mode)) return null;
      const p=chainChance(attacker,n,mode,{sentinel}),roll=d100();
      return {n,p,roll,continues:roll<=p};
    }

    // Contre-charge V1 : la cible directe d'une charge réagit une fois si son arme active le permet
    // (contre_charge) et, pour une arme à feu, si elle est chargée. Un personnage En Fuite ne réagit pas.
    // Renvoie {at, mode} (at = cases parcourues par le chargeur avant la réaction), ou null :
    // - arme à distance : à mi-course, arrondie au-dessus pour une course impaire (2N+1 → N+1, Idan 2026-10-08) ;
    // - mêlée / arme d'hast : première case du trajet dans la portée de contact de l'arme.
    // À deux armes (décision Idan, 2026-10-08), chaque arme qui le permet riposte une fois, à son propre moment :
    // counterchargeTriggers renvoie ces réactions, dans l'ordre de la course ({at, mode, hand}).
    function counterchargeTriggers(reactor,charger,charge){
      if(!reactor?.alive||reactor.fleeing) return [];
      const path=charge?.path||[];
      const hands=isDualWielding(reactor)?["main","off"]:["main"];
      return hands.map(hand=>withHand(reactor,hand,()=>{
        const item=activeWeaponItem(reactor),weapon=weaponTemplate(item);
        if(!weapon?.contre_charge||!isLoaded(reactor,item)) return null;
        const mode=isRangedWeapon(weapon)?"ranged":"melee";
        const inReach=at=>at>=1&&at<=path.length&&canAttackAtDistance(reactor,axialDistance(reactor,path[at-1]),mode);
        if(mode==="ranged"){
          const at=Math.ceil(path.length/2);
          return inReach(at)?{at,mode,hand}:null;
        }
        for(let at=1;at<=path.length;at++) if(inReach(at)) return {at,mode,hand};
        return null;
      })).filter(Boolean).sort((x,y)=>x.at-y.at);
    }
    function counterchargeTrigger(reactor,charger,charge){
      return counterchargeTriggers(reactor,charger,charge)[0]||null;
    }

    // Combat à deux armes CAC V1 : la séquence n s'ouvre si au moins une attaque de la séquence précédente a
    // réellement touché, sans échec critique, contre une cible encore vivante ; P_n = min(100, (Dextérité
    // effective + Vitesse combat effective) / n). Une paire sans arme de mêlée s'arrête à sa paire de base.
    function rollPairChain(attacker,defender,results,n){
      if(!results.length||results.some(r=>r.fumble||r.woundFumble)) return null;
      if(!results.some(r=>r.ok&&r.hit&&!r.blocked)||!results.some(r=>r.mode==="melee")) return null;
      if(!attacker.alive||!defender.alive) return null;
      const p=chainChance(attacker,n,"melee"),roll=d100();
      return {n,p,roll,continues:roll<=p};
    }

    // Chaque attaque résolue est signalée au crochet options.onAttack(attaquant, défenseur, options,
    // résultat), par exemple pour le journal de progression (game-core/progression.js).
    // attackOptions.hand = "off" : attaque avec l'arme de la main secondaire (combat à deux armes).
    function resolveAttack(attacker,defender,attackOptions={}){
      const result=withHand(attacker,attackOptions.hand,()=>resolveAttackRolls(attacker,defender,attackOptions));
      if(attackOptions.hand==="off") result.hand="off";
      if(typeof options.onAttack==="function"){
        options.onAttack(attacker,defender,attackOptions,result);
        if(result.stray?.unit) options.onAttack(attacker,result.stray.unit,attackOptions,result.stray.result);
      }
      return result;
    }

    function resolveAttackRolls(attacker,defender,options={}){
      const mode=options.mode||"melee";
      const distance=Number(options.distance)||axialDistance(attacker,defender);
      const item=activeWeaponItem(attacker),weapon=weaponTemplate(item);
      if(!weapon) return {ok:false,reason:"Aucune arme active."};
      if(!isLoaded(attacker,item)) return {ok:false,reason:item.name+" est déchargé : une action rapide le recharge."};
      if(!canAttackAtDistance(attacker,distance,mode)) return {ok:false,reason:"Cible hors portée ou arme incompatible."};

      // Toute attaque d'opportunité bénéficie de Frappe dans le dos (Attaque d'opportunité CAC V1),
      // de même que toute attaque au CAC contre une cible encerclée (Encerclement CAC V1).
      // Une cible En Fuite subit aussi une Frappe dans le dos (Frappe dans le dos V1).
      const opportunity=Boolean(options.opportunity);
      const encircled=mode==="melee"&&Boolean(options.encircled);
      const fleeingTarget=Boolean(defender.fleeing);
      // Attaque depuis le camouflage (Idan, 2026-10-28) : une attaque non détectée, donc une Frappe dans le dos V1.
      const hidden=Boolean(attacker.camouflaged)&&attacker.team!==defender.team;
      const backstab=opportunity||encircled||fleeingTarget||hidden||Boolean(options.backstab);
      if(opportunity&&(mode!=="melee"||Number(options.chargeDistance)>0)) return {ok:false,reason:"Une attaque d'opportunité est un coup de mêlée simple."};
      // Le coup part : une arme à recharge est désormais déchargée, qu'il touche ou non.
      if(needsLoading(weapon)) attacker.unloaded=[...(attacker.unloaded||[]),item.id];

      // options.chargeFollowUp : seconde arme d'une charge à deux armes (décision Idan, 2026-10-08) ; la chute
      // de charge n'est tirée qu'une fois, pour la première arme.
      let chargePower=0;
      if(Number(options.chargeDistance)>0){
        // Chute de charge : 2 % ; plus, à travers un décor lent (Idan, 2026-11-06 : « pieds dans le tapis »),
        // options.chargeSlowSteps = la somme des (coût − 1) des cases lentes de la course.
        const pFall=CHARGE_FALL.base+CHARGE_FALL.perSlowStep*(Number(options.chargeSlowSteps)||0);
        const fallRoll=options.chargeFollowUp?100:d100();
        if(fallRoll<=pFall){
          attacker.prone=true;
          return {ok:true,mode,weapon:weapon.nom,charge:true,chargeFall:true,fallRoll,pFall,hit:false,wound:false,damage:0};
        }
        const bonus=Number(weapon.bonus_charge_base)||1;
        chargePower=Number(options.chargeDistance)*bonus*(Number(quality(item).multiplicateur_qualite)||1);
      }

      // Tir de sentinelle (Idan, 2026-11-06) : + SENTINEL.precision au Toucher.
      const sentinel=mode==="ranged"&&Boolean(options.sentinel);
      // Couverture : au tir, et contre une charge (options.cover : « partielle » ou « totale »).
      const cover=(mode==="ranged"||chargePower>0)&&COVER[options.cover]?options.cover:null;
      const heightDiff=options.heightDiff??heightDiffOf(attacker,defender);
      // Charge aérienne (doc 04 ; Idan, 2026-11-09) : options.aerialCharge, une arme qui frappe dans la charge (Toucher,
      // Blesser et dégâts × AERIAL.bonus) ; options.againstAerialCharge, une contre-charge contre elle (Toucher × AERIAL.counter).
      const aerial=mode==="melee"&&Boolean(options.aerialCharge);
      const hitFactor=(aerial?AERIAL.bonus:1)*(options.againstAerialCharge?AERIAL.counter:1);
      const tags={chargePower,opportunity,encircled,fleeingTarget,backstab,hidden,...(sentinel?{sentinel}:{}),...(cover?{cover}:{}),...(heightDiff?{heightDiff}:{}),
        ...(aerial?{aerialCharge:true}:{}),...(options.againstAerialCharge?{againstAerialCharge:true}:{})};
      // Champ de protection (Télékinésie, doc 12) : avant le Toucher, le projectile a projectileShield.chance % d'être dévié.
      if(mode==="ranged"&&defender.projectileShield){
        const pDeflect=Number(defender.projectileShield.chance)||0,deflectRoll=d100();
        if(deflectRoll<=pDeflect) return {ok:true,mode,weapon:weapon.nom,distance,deflected:true,pDeflect,deflectRoll,hit:false,wound:false,damage:0,...tags};
      }
      const pHit=hitProbability(attacker,defender,mode,distance,{opportunity,backstab,sentinel,cover,heightDiff,factor:hitFactor});
      const hitRoll=d100(),hit=hitRoll<=pHit;
      // twoHanded : arme tenue à deux mains (XP de Combat à deux mains) ; oneHanded : arme à une main tenue seule (XP de
      // Combat à une main).
      // rangeMax : la portée de l'arme au tir (XP de Perception d'un tir au loin ; Idan, 2026-11-08).
      const head={ok:true,mode,weapon:weapon.nom,distance,pHit,hitRoll,twoHanded:usesTwoHands(attacker,weapon),
        oneHanded:attacker.attackHand!=="off"&&fightsOneHanded(attacker),...(mode==="ranged"?{rangeMax:weaponRange(attacker).max}:{})};
      if(!hit){
        // Échec critique CAC V1 : un naturel 96–100 déclenche un test de Chance ; raté → Au Sol.
        const fumble=fumbleTest(attacker,hitRoll);
        if(fumble.fumble) attacker.prone=true;
        const missed={...head,hit:false,...fumble,wound:false,damage:0,...tags};
        // Approximation projectile V1 : options.bystanders = les autres combattants présents.
        if(mode==="ranged"&&Array.isArray(options.bystanders)) missed.stray=resolveStray(attacker,defender,options.bystanders,weapon);
        return missed;
      }
      return {...head,hit:true,...resolveHit(attacker,defender,mode,{chargePower,backstab,aerial}),...tags};
    }

    // Suite d'un Toucher réussi : blocage, critique au Toucher, Blesser, critique de blessure, dégâts.
    function resolveHit(attacker,defender,mode,{chargePower=0,backstab=false,aerial=false}={}){
      const weapon=weaponTemplate(activeWeaponItem(attacker));
      const psychic=weapon?.degats_type==="psychique";
      // Spectre (Idan, 2026-10-28) : immunisé aux dégâts physiques, le coup le traverse.
      if(defender.character?.immunePhysical&&!psychic) return {immune:true,wound:false,damage:0};

      // Blocage bouclier physique V1 : après le Toucher, avant le critique ; au CAC comme au tir. Un coup bloqué ne compte
      // pas comme un toucher réel : ni critique, ni Blesser, ni dégâts.
      // Fléau d'armes (Idan, 2026-10-29) : la chance de blocage du bouclier adverse baisse de malus_blocage_pourcentage %.
      // Idan, 2026-11-04 (« 3 + limiter à un blocage par tour. C'est surtout ça le problème ») : pas de blocage contre une
      // Frappe dans le dos (opportunité, encerclé, en fuite, attaque non détectée) ; un seul blocage réussi par tour
      // (defender.shieldBlocked, remis à zéro au début de chaque tour : shieldReady).
      const blockCut=Number(weapon?.malus_blocage_pourcentage)||0,baseBlock=shieldReady(defender,{backstab})?blockChance(defender):null;
      const pBlock=baseBlock!==null&&blockCut?baseBlock*(1-blockCut/100):baseBlock;
      const block={};
      if(pBlock!==null){
        const blockRoll=d100();
        Object.assign(block,{pBlock,blockRoll,blocked:blockRoll<=pBlock,shield:weaponTemplate(activeOffhandItem(defender)).nom});
        if(block.blocked){ defender.shieldBlocked=true; return {...block,wound:false,damage:0}; }
      }

      const pCritical=criticalChance(attacker);
      const criticalHitRoll=d100(),criticalHit=criticalHitRoll<=pCritical;
      const crit={...block,pCritical,criticalHitRoll,criticalHit};
      if(psychic) return {...crit,...psychicStrike(attacker,defender,weapon,criticalHit)};
      const matchup=selectDamageMatchup(attacker,defender,weapon,{backstab,ignoreArmor:criticalHit});
      // Parade du saï (Idan, 2026-10-29) : au corps à corps, un coup tranchant est paré à pParry % ; un coup paré ne compte
      // pas comme un toucher réel : ni Blesser, ni dégâts.
      const pParry=mode==="melee"?parryChance(defender,matchup.type):0;
      if(pParry>0){
        const parryRoll=d100();
        if(parryRoll<=pParry) return {...crit,matchup,pParry,parryRoll,parried:true,parryWeapon:parryWeapon(defender,matchup.type),wound:false,damage:0};
        Object.assign(crit,{pParry,parryRoll});
      }
      const pWound=woundProbability(attacker,defender,mode,matchup,{chargePower,factor:aerial?AERIAL.bonus:1});
      const woundRoll=d100(),wound=woundRoll<=pWound;
      if(!wound){
        // Échec critique de blessure CAC V1 : naturel 96–100 puis test de Chance raté → l'attaquant
        // encaisse les dégâts minimum de son propre coup, réduits au mieux par sa Résistance physique.
        const woundFumble=fumbleTest(attacker,woundRoll);
        const recoil={woundFumbleRoll:woundFumble.fumbleRoll,woundFumble:woundFumble.fumble};
        if(woundFumble.fumble){
          const self=physicalDamage(attacker,attacker,mode,chargePower,{roll:"min",resistanceRoll:3});
          attacker.hp-=self.damage;
          attacker.damageTaken=(Number(attacker.damageTaken)||0)+self.damage;
          if(attacker.hp<=0) attacker.alive=false;
          Object.assign(recoil,{selfDamage:self.damage,attackerHp:attacker.hp,attackerDown:!attacker.alive});
        }
        return {...crit,matchup,pWound,woundRoll,wound:false,...recoil,damage:0};
      }

      // Critique de blessure positif CAC V1 : dégâts de l'arme au maximum et variation de Résistance à 0,9.
      const criticalWoundRoll=d100(),criticalWound=criticalWoundRoll<=pCritical;
      Object.assign(crit,{criticalWoundRoll,criticalWound});
      const dealt=withTypeFactor(defender,matchup.type,physicalDamage(attacker,defender,mode,chargePower,criticalWound?{roll:"max",resistanceRoll:1}:{}));
      // Charge aérienne : les dégâts × AERIAL.bonus.
      // Une piqûre sans dégâts (le papillon vénéneux ; Idan, 2026-11-09 : « Son attaque ne fait pas de dégâts, mais
      // empoisonne comme une sarbacane ») : le coup qui blesse n'enlève aucun PV, mais il empoisonne.
      const harmless=Boolean(weapon?.sans_degats);
      const damageData=harmless?{...dealt,damage:0}:aerial?{...dealt,damage:Math.round(dealt.damage*AERIAL.bonus)}:dealt;
      // Les PV restent signés : la profondeur sous 0 sert au jet de mort de fin de mission (Issue #13).
      defender.hp-=damageData.damage;
      wake(defender,damageData.damage);
      // Les soins n'effacent pas l'usure : la fatigue de fin de mission se calcule sur le cumul (10-mission-time §5).
      defender.damageTaken=(Number(defender.damageTaken)||0)+damageData.damage;
      if(defender.hp<=0) defender.alive=false;

      // Sarbacane (Idan, 2026-10-29) : une fléchette qui blesse empoisonne (poison : POISON.turns tours, 10 × dés × qualité).
      // Fiole de poison (Idan, 2026-10-29) : l'arme enduite (attacker.weaponPoison, l'objet tenu) empoisonne aussi, au
      // corps à corps comme au tir, de amount PV par tour. Les deux à la fois : le plus fort.
      const coated=attacker.weaponPoison&&attacker.weaponPoison.itemId!=null&&attacker.weaponPoison.itemId===activeWeaponItem(attacker)?.id;
      const blowgun=weapon?.empoisonne?Math.ceil(10*parseDice(weapon.degats_pv_base).count*(Number(quality(activeWeaponItem(attacker)).multiplicateur_qualite)||1)-1e-9):0;
      const vial=coated?Number(attacker.weaponPoison.amount)||0:0;
      const poison=(blowgun||vial)&&(damageData.damage>0||harmless)&&defender.alive&&!poisonImmune(defender)
        ?{turns:POISON.turns,amount:Math.max(blowgun,vial),source:vial>blowgun?"poison_vial":"blowgun"}:null;
      return {...crit,matchup,pWound,woundRoll,wound:true,...damageData,targetHp:defender.hp,targetDown:!defender.alive,...(poison?{poison}:{})};
    }

    // Parade (weapons.json, parade_type et parade_chance ; Idan, 2026-10-29) : chaque arme tenue dans le set actif qui pare ce
    // type de dégâts ajoute sa chance : un saï 5 %, deux saïs 10 %.
    function parryItems(unit,type){
      return [activeWeaponItem(unit),activeOffhandItem(unit)].filter(item=>weaponTemplate(item)?.parade_type===type);
    }
    function parryChance(unit,type){
      return parryItems(unit,type).reduce((sum,item)=>sum+(Number(weaponTemplate(item).parade_chance)||0),0);
    }
    function parryWeapon(unit,type){ return parryItems(unit,type)[0]?.name||null; }

    // Toucher spectral (Idan, 2026-10-28) : dégâts psychiques, sans Blesser ni armure ni résistance : 10 × dés × Volonté de
    // l'attaquant / Volonté de la cible (de × 0,5 à × 2), dés au maximum sur un coup critique.
    function psychicStrike(attacker,defender,weapon,critical=false){
      const rolled=rollWeaponDamage(weapon,critical?"max":null);
      const will=clamp(statWithGear(attacker,"Volonté")/Math.max(1,statWithGear(defender,"Volonté")),0.5,2);
      const damage=iced(defender,Math.max(0,Math.ceil(10*rolled.total*will-1e-9)));
      defender.hp-=damage;
      wake(defender,damage);
      defender.damageTaken=(Number(defender.damageTaken)||0)+damage;
      if(defender.hp<=0) defender.alive=false;
      return {psychic:true,will,weaponRoll:rolled.total,weaponDice:rolled.dice,wound:true,damage,targetHp:defender.hp,targetDown:!defender.alive};
    }

    // Approximation projectile V1. Couloir de tir (Idan, 2026-10-08) : cône de 30° depuis le tireur, centré sur
    // l'axe tireur → cible, compté de la moitié de la distance de la cible jusqu'à la portée max de l'arme.
    function cartesian(h){ return {x:Math.sqrt(3)*(h.q+h.r/2),y:1.5*h.r}; }
    // maxRange : portée du tir (celle de l'arme active par défaut ; un sort comme Trait de feu donne la sienne).
    function inFiringCorridor(shooter,target,unit,maxRange=weaponRange(shooter).max){
      const reach=axialDistance(shooter,unit);
      if(reach<STRAY.startRatio*axialDistance(shooter,target)||reach>maxRange) return false;
      const s=cartesian(shooter),t=cartesian(target),u=cartesian(unit);
      const ax=t.x-s.x,ay=t.y-s.y,bx=u.x-s.x,by=u.y-s.y;
      const cos=(ax*bx+ay*by)/(Math.hypot(ax,ay)*Math.hypot(bx,by));
      return cos>=Math.cos(STRAY.coneAngle/2*Math.PI/180)-1e-9;
    }
    // Candidats : alliés et ennemis du couloir, du plus proche de la cible initiale au plus lointain ;
    // à égalité, un ennemi du tireur d'abord, puis le plus proche du tireur.
    function strayCandidates(shooter,target,units,maxRange=weaponRange(shooter).max){
      const ally=u=>Boolean(shooter.team)&&u.team===shooter.team;
      return units
        .filter(u=>u!==shooter&&u!==target&&u.alive&&!u.offMap&&inFiringCorridor(shooter,target,u,maxRange))
        .sort((a,b)=>axialDistance(a,target)-axialDistance(b,target)||ally(a)-ally(b)||axialDistance(shooter,a)-axialDistance(shooter,b));
    }
    // P_accident,i = P_toucher(candidat) × 0,35 × 0,5^(i−1) ; le premier touché devient la cible réelle
    // (blocage, critique, Blesser, dégâts). Ne s'applique pas aux armes de zone.
    function resolveStray(shooter,target,units,weapon){
      if(skillByName.get(weapon.nom)?.attaque_de_zone) return null;
      const tries=[];
      let factor=STRAY.initial;
      for(const unit of strayCandidates(shooter,target,units)){
        const distance=axialDistance(shooter,unit),backstab=Boolean(unit.fleeing);
        const p=hitProbability(shooter,unit,"ranged",distance,{backstab})*factor,roll=d100();
        tries.push({unit,p,roll});
        if(roll<=p){
          const result={ok:true,mode:"ranged",weapon:weapon.nom,distance,pHit:p,hitRoll:roll,hit:true,accidental:true,
            ...resolveHit(shooter,unit,"ranged",{backstab}),chargePower:0,opportunity:false,encircled:false,fleeingTarget:backstab,backstab};
          return {tries,unit,result};
        }
        factor*=STRAY.decay;
      }
      return {tries,unit:null,result:null};
    }

    // Attaque d'opportunité CAC V1 : un combattant menace les hexagones atteignables par son arme de mêlée active.
    // Un personnage En Fuite ne menace personne : il ne fait pas d'attaque d'opportunité (décision Idan, Issue #8).
    // À deux armes, chaque arme de mêlée tenue menace sa propre portée.
    // Le cheval monté menace aussi, de son arme naturelle (Idan, 2026-11-07 : « pourquoi la monture ne fait pas des
    // attaques d'opportunités ? » ; « oui »).
    function threatens(unit,hex){
      if(!unit?.alive||unit.fleeing) return false;
      return usableHands(unit,axialDistance(unit,hex)).some(h=>h.mode==="melee");
    }

    // Sortir de la zone menacée déclenche la réaction ; s'y déplacer ne déclenche rien.
    function opportunityReactors(opponents,from,to){
      // Figé dans la glace (Prison de glace), endormi (Sommeil) ou simple double illusoire (Création de double) : il ne réagit pas.
      return opponents.filter(o=>!inert(o)&&threatens(o,from)&&!threatens(o,to));
    }
    function inert(unit){ return Boolean(unit?.frozen||unit?.asleep||unit?.decoy); }

    // Tir ou sort qui vise un cavalier (Idan, 2026-11-07 : « À distance, jet qui dépend de la taille de la monture par rapport
    // au cavalier ») : le cheval est visé à gabarit du cheval ÷ (gabarit du cheval + gabarit du cavalier) ; un humain sur
    // un destrier : 2 ÷ 3.
    function mountHitChance(rider){
      const m=mountOf(rider);
      if(!m) return 0;
      const a=bodySize(m),b=bodySize(rider);
      return 100*a/(a+b);
    }
    function rollShotTarget(rider){
      const m=mountOf(rider);
      if(!m) return {target:rider,mount:false};
      const p=mountHitChance(rider),roll=d100();
      return {target:roll<=p?m:rider,mount:roll<=p,p,roll};
    }

    // Tirer sur une autre cible que l'adversaire qui menace déclenche sa réaction.
    function rangedOpportunityReactors(opponents,shooter,target){
      return opponents.filter(o=>o!==target&&!inert(o)&&threatens(o,shooter));
    }

    // Encerclement CAC V1 : au moins deux adversaires au contact, armés pour le CAC,
    // sur des cases de contact non adjacentes entre elles.
    function isEncircled(target,opponents){
      const contact=opponents.filter(o=>axialDistance(o,target)===1&&threatens(o,target));
      return contact.some((a,i)=>contact.slice(i+1).some(b=>axialDistance(a,b)>1));
    }

    // Intimidation de l'adversaire, avec la Culotte d'Intimidation (Idan, 2026-10-24). Un couple (Idan, 2026-11-07 : « pour
    // l'intimidation, on prend la plus haute des deux... Le gobelin sur le dragon... Bah, c'est pas l'intimidation du Gobelin
    // qui compte ! ») : la plus haute du cavalier et de sa monture.
    function intimidation(unit){
      if(!unit?.character) return 0;
      const pair=pairOf(unit),horse=mountOf(pair);
      return horse?Math.max(statWithGear(pair,"Intimidation"),statWithGear(horse,"Intimidation")):statWithGear(unit,"Intimidation");
    }

    // Bonus de l'aura d'un capitaine (Idan, 2026-10-24) : 35 % de son Courage + 25 % de son Charisme, équipement compris,
    // arrondi.
    function captainAuraBonus(captain){
      return Math.round(AURA.courage*statWithGear(captain,"Courage")+AURA.charisma*statWithGear(captain,"Charisme"));
    }

    // Aura du capitaine (Idan, 2026-10-24) : tant qu'il est sur le champ de bataille (vivant, sur la carte), le capitaine
    // (unit.isCaptain) donne captainAuraBonus en Courage à ses alliés situés à AURA.range cases ou moins, pour leurs tests
    // de Courage et leurs reprises de contrôle. Lui-même n'en profite pas. units : tous les combattants de la mission.
    function captainAura(unit,units=[]){
      const captain=(units||[]).find(u=>u.isCaptain&&u!==unit&&u.team===unit.team&&u.alive&&!u.offMap);
      return captain&&axialDistance(captain,unit)<=AURA.range?captainAuraBonus(captain):0;
    }

    // Aura d'un lieutenant (Idan, 2026-10-25) : la formule du capitaine sur ses propres caractéristiques, équipement
    // compris, × lieutenant.aura.share (la moitié), arrondie ; même portée que le capitaine.
    function lieutenantAuraBonus(lieutenant){
      return Math.round(AURA.lieutenant*(AURA.courage*statWithGear(lieutenant,"Courage")+AURA.charisma*statWithGear(lieutenant,"Charisme")));
    }

    // Aura reçue (Idan, 2026-10-25 : les auras ne s'additionnent pas) : la plus forte des auras alliées à portée, celle du
    // capitaine (unit.isCaptain) ou d'un lieutenant (unit.isLieutenant), vivants et sur la carte. Lui-même n'en profite
    // pas. {bonus, from : "captain" | "lieutenant" | null, source : le combattant qui la donne}.
    function allyAura(unit,units=[]){
      let best={bonus:0,from:null,source:null};
      for(const ally of units||[]){
        if(ally===unit||ally.team!==unit.team||!ally.alive||ally.offMap||!(ally.isCaptain||ally.isLieutenant)) continue;
        if(axialDistance(ally,unit)>AURA.range) continue;
        const bonus=ally.isCaptain?captainAuraBonus(ally):lieutenantAuraBonus(ally);
        if(bonus>best.bonus) best={bonus,from:ally.isCaptain?"captain":"lieutenant",source:ally};
      }
      // Le fouet s'ajoute à l'aura du capitaine ou du lieutenant (whip : sa part, comprise dans bonus).
      const whip=weaponAuraBonus(unit,"Courage",units);
      return {...best,bonus:best.bonus+whip,whip};
    }
    // Fouet (weapons.json, aura_caracteristique, aura_t1 à aura_t4 et aura_portee ; Idan, 2026-10-29, par tier depuis le
    // 2026-11-05 : 5 / 10 / 15 / 20 %) : un allié qui le tient dans son set actif donne ce pourcentage de la valeur de base
    // aux autres alliés à aura_portee cases ou moins ; plusieurs fouets ne se cumulent pas (le plus fort compte).
    function weaponAuraBonus(unit,stat,units=[]){
      let best=0;
      for(const ally of units||[]){
        if(ally===unit||ally.team!==unit.team||!ally.alive||ally.offMap) continue;
        for(const item of [activeWeaponItem(ally),activeOffhandItem(ally)]){
          const weapon=weaponTemplate(item);
          if(weapon?.aura_caracteristique!==stat||axialDistance(ally,unit)>(Number(weapon.aura_portee)||0)) continue;
          best=Math.max(best,baseValue(unit,stat)*weaponTierValue(weapon,"aura",item)/100);
        }
      }
      return best;
    }

    // Courage post-attaque CAC V1 / Courage post-tir V1, avec le malus de Courage en sous-nombre V1 et l'aura (capitaine ou lieutenant).
    // Monté (Idan, 2026-11-07) : le Courage et la Volonté du couple = ceux du cheval + (ceux du cavalier − ceux du cheval)
    // × part ; part = (Compagnon animal + la famille de la monture) ÷ 100, au plus 1.
    function riderShare(unit){
      const m=mountOf(unit);
      if(!m) return 1;
      const animal=unit.character?.skills?.animal||{};
      const skill=(Number(animal["Compagnon animal"])||0)+(Number(animal[m.character?.mountSkill])||0);
      return clamp(skill/MOUNT.shareDivisor,0,1);
    }
    function mentalStat(unit,stat){
      const own=statWithGear(unit,stat),m=mountOf(unit);
      if(!m||!MOUNT_SHARED.includes(stat)) return own;
      const horse=statWithGear(m,stat);
      return horse+(own-horse)*riderShare(unit);
    }
    function courageHold(subject,opponent,surplus=0,aura=0){
      return clamp(mentalStat(subject,"Courage")+aura+0.25*mentalStat(subject,"Volonté")-0.25*intimidation(opponent)-10*surplus,5,95);
    }
    // Peur (Illusion ; Idan, 2026-10-28 : « la volonté du mage… ici, c'est la force mentale ») : le même test de Courage, la
    // Maîtrise du sort et la Volonté du lanceur tenant le rôle de l'Intimidation de l'adversaire. Un personnage déjà en fuite
    // ou en frénésie ne teste pas.
    function fearHold(subject,caster,mastery,aura=0){
      return clamp(mentalStat(subject,"Courage")+aura+0.25*mentalStat(subject,"Volonté")-0.25*(mastery+statWithGear(caster,"Volonté")),5,95);
    }
    // Sans peur : en frénésie (Illusion) ou mort-vivant (zombie, spectre : Idan, 2026-10-28) ; jamais de test de Courage.
    function fearless(unit){ return Boolean(unit?.frenzy||unit?.character?.undead); }
    function resolveFear(subject,caster,mastery,units=[]){
      subject=pairOf(subject);
      if(!subject||subject.alive===false||subject.fleeing||fearless(subject)) return null;
      const aura=allyAura(subject,units),pHold=fearHold(subject,caster,mastery,aura.bonus),roll=d100();
      return {subject,source:caster,pHold,roll,flees:roll>pHold,aura:aura.bonus,auraFrom:aura.from,auraSource:aura.source,whip:aura.whip};
    }

    // Courage en sous-nombre V1 : mêlée locale = groupe connecté de combattants liés par leurs zones de menace CAC.
    function localMelee(subject,units){
      subject=pairOf(subject);
      const alive=units.filter(u=>u.alive);
      const linked=(a,b)=>a.team!==b.team&&(threatens(a,b)||threatens(b,a));
      const group=new Set([subject]),queue=[subject];
      while(queue.length){
        const cur=queue.shift();
        for(const other of alive) if(!group.has(other)&&linked(cur,other)){ group.add(other); queue.push(other); }
      }
      const allies=[...group].filter(u=>u.team===subject.team).length;
      const enemies=group.size-allies;
      return {allies,enemies,surplus:Math.max(0,enemies-allies)};
    }

    // Qui teste son Courage après une attaque, et avec quelle probabilité de tenir.
    // context : { defenderSurplus, attackerEncircles, units } (units : pour l'aura du capitaine ou d'un lieutenant).
    function resolveCourage(attacker,defender,result,context={}){
      if(!result?.ok||result.chargeFall) return null;
      let subject,source,pHold,rule,aura;
      if(result.wound){
        // Un cheval monté : c'est le couple qui teste, par son cavalier (Idan, 2026-11-07).
        defender=pairOf(defender);
        // Une cible déjà En Fuite ne reteste pas (décision Idan, Issue #8) ; en frénésie (Illusion), plus de peur.
        if(!defender.alive||defender.fleeing||fearless(defender)) return null;
        const surplus=result.mode==="melee"?Math.max(0,Number(context.defenderSurplus)||0):0;
        subject=defender;source=attacker;
        aura=allyAura(defender,context.units);
        pHold=courageHold(defender,attacker,surplus,aura.bonus);
        rule=surplus>0?"outnumbered":"wounded";
      }else{
        // Tir : le tireur ne teste jamais. CAC : un attaquant qui participe à un encerclement ne teste pas.
        if(result.mode!=="melee"||!attacker.alive||attacker.fleeing||fearless(attacker)||context.attackerEncircles) return null;
        subject=attacker;source=defender;
        aura=allyAura(attacker,context.units);
        pHold=100-(100-courageHold(attacker,defender,0,aura.bonus))/2;
        rule="no-wound";
      }
      const roll=d100();
      return {subject,source,pHold,roll,flees:roll>pHold,rule,aura:aura.bonus,auraFrom:aura.from,auraSource:aura.source,whip:aura.whip};
    }

    // Reprise de contrôle — En Fuite V1 ; ennemi de référence = ennemi actif le plus proche (vivant, pas En Fuite) ;
    // aura alliée (capitaine ou lieutenant) si units est donné.
    function recoveryChance(unit,referenceEnemy,fleeTurn,units=[]){
      return clamp(mentalStat(unit,"Courage")+allyAura(unit,units).bonus+0.25*mentalStat(unit,"Volonté")-0.25*intimidation(referenceEnemy)+10*fleeTurn,5,95);
    }

    function rollRecovery(unit,referenceEnemy,fleeTurn,units=[]){
      const p=recoveryChance(unit,referenceEnemy,fleeTurn,units),roll=d100();
      const aura=allyAura(unit,units);
      return {p,roll,recovered:roll<=p,aura:aura.bonus,auraFrom:aura.from,auraSource:aura.source,whip:aura.whip};
    }

    // Comportement automatique — En Fuite V1 : 1 Course effrénée, 2 Cachons-nous, 3 Feu à volonté.
    function rollFleeBehavior(){ return die(3); }

    function canSwitchWeaponSet(unit){
      const other=unit.activeSet===1?2:1;
      return Boolean(itemBySlot(unit,"weapon_set_"+other+"_main"));
    }

    function switchWeaponSet(unit){
      if(!canSwitchWeaponSet(unit)) return false;
      unit.activeSet=unit.activeSet===1?2:1;
      return true;
    }

    function chargeData(attacker,defender){
      const weapon=weaponTemplate(activeWeaponItem(attacker));
      if(!isMeleeWeapon(weapon)) return {valid:false};

      // Charge en ligne droite (Idan, 2026-11-04 : « La charge devrait être possible si dans la ligne droite entre le chargeur
      // et le chargé, il n'y a aucun obstacle ou personnage ») : dans n'importe quelle direction, la ligne droite
      // d'hexagones entre les deux (hexLine) ; le chemin, ce sont ses cases entre les deux, la dernière au contact de la
      // cible. L'écran de combat vérifie qu'aucune n'est occupée. step : la direction de la dernière case vers la cible.
      // Une grande créature ne charge pas encore (à venir avec les bêtes) ; contre elle, on charge sa case la plus proche. Un
      // cavalier charge (Idan, 2026-11-07) : la ligne part de sa tête, le corps suit, avec le déplacement du cheval.
      // Le pégase seul charge par les airs (Idan, 2026-11-09 : « Pegase seul l'a également ») : comme un couple.
      if(isLarge(attacker)&&!mountOf(attacker)&&!aerialCharger(attacker)) return {valid:false};
      const distance=axialDistance(attacker,defender);
      if(distance<2) return {valid:false};
      const aim=footprint(defender).reduce((best,c)=>!best||hexDistance(attacker,c)<hexDistance(attacker,best)?c:best,null);
      const path=hexLine(attacker,aim).slice(1,-1);
      const destination=path[path.length-1];
      const step={q:aim.q-destination.q,r:aim.r-destination.r};

      const travel=path.length;
      const base=movementBase(attacker);
      return {
        valid:travel>=base&&travel<=2*base,
        travel,
        path,
        destination,
        step,
        min:base,
        max:2*base
      };
    }

    return {
      axialDistance,
      hexDistance,
      SIZE,
      MOUNT,
      mountOf,
      pairOf,
      bodySize,
      canRide,
      riderShare,
      stealthOf,
      mentalStat,
      mountChargeForce,
      aerialCharger,terrainSkillsOf,terrainEffect,skillFlies,
      AERIAL,
      mountHitChance,
      rollShotTarget,
      sizeOf,
      isLarge,
      footprintAt,
      footprint,
      sizeHitBonus,
      hexLine,
      POISON,
      STEALTH,
      SENTINEL,
      COVER,
      CHARGE_FALL,
      ALTITUDE,
      coverHitFactor,
      coverDiscretion,resolveScouting,
      detectionChance,
      rollDetection,
      spellWoundChance,
      spellPhysicalHit,
      spellPhysicalDamage,
      weaponThrow,
      fearHold,
      parryChance,
      attackStatBonus,
      resolveFear,
      poisonResistChance,
      poisonImmune,
      damageTypeFactor,
      canPoisonWeapon,
      resolvePoison,
      activeWeaponItem,
      activeOffhandItem,
      withHand,
      weaponTemplate,
      armorItem,
      itemBySlot,
      armorTemplate,
      baseValue,
      MAGIC_SCHOOLS,
      gearBonuses,
      statWithGear,
      headgearSpeedPenalty,
      quality,
      isRangedWeapon,
      isMeleeWeapon,
      armorMobility,
      heldItemSpeedPenalty,
      usesTwoHands,
      canGripTwoHands,
      prefersTwoHands,
      fightsOneHanded,
      oneHandDodge,
      effectiveSpeed,
      effectiveDodge,
      movementBase,
      initiative,
      weaponRange,
      canAttackAtDistance,
      attackPrecision,
      attackPower,
      hitProbability,
      damageMatchups,
      effectiveArmorResistance,
      selectDamageMatchup,
      woundProbability,
      physicalDamage,
      criticalChance,
      isDualWielding,
      strikeCount,
      severalStrikes,
      effectiveDexterity,
      usableHands,
      blockChance,
      shieldReady,
      resetShieldBlocks,
      isRepeatable,
      needsLoading,
      isLoaded,
      canReload,
      reload,
      chainChance,
      rollChain,
      rollPairChain,
      resolveAttack,
      canSwitchWeaponSet,
      switchWeaponSet,
      chargeData,
      counterchargeTrigger,
      counterchargeTriggers,
      inFiringCorridor,
      strayCandidates,
      STRAY,
      elementalProtection,
      elementalDamage,
      threatens,
      isEncircled,
      intimidation,
      captainAura,
      captainAuraBonus,
      lieutenantAuraBonus,
      allyAura,
      maxHp,
      courageHold,
      localMelee,
      resolveCourage,
      recoveryChance,
      rollRecovery,
      rollFleeBehavior,
      opportunityReactors,
      rangedOpportunityReactors,
      inert,
      wake
    };
  }

  return {createCombatEngine};
});
