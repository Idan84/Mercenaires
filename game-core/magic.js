"use strict";

// Magie — règles des sorts (doc 12 « Décisions du 2026-10-25 » et « École de la Vie » ; Idan). Données :
// data/reference/spells.json et formula-constants.json (magic.*). Les valeurs avec équipement (école avec bague,
// Puissance magique avec amulette, Chance, armure portée) viennent du moteur de combat.
// - Un sort est appris au niveau 1 et monte quand on s'en sert ; character.spells = [{code, name, school, mastery}],
//   mastery étant le niveau du sort (1 à 100).
// - Maîtrise = École + Niveau du sort / 2 : l'école pèse deux fois plus que le sort.
// - Effet = ceil(10 × dés × (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100)) ; seuls les dés changent d'un sort
//   à l'autre (Soin rapide 1D4, Soin profond 2D6, Restitution 1D10…). Portée, durée et rayon : base + Maîtrise / pas
//   (arrondi bas) ; mana = ceil(base × (1 − Maîtrise / 300)).
// - Réussite = 10 + 85 / (1 + e^(−Δ / 15)), Δ = (Maîtrise + Intelligence) / 2 − difficulté (palier : Novice 30,
//   Adepte 50, Expert 70), moins l'Altération magique de l'armure portée (× le multiplicateur de malus de sa qualité),
//   en points, jamais sous 0.
// - Le mana est dépensé même si le sort échoue. Action rapide ou principale (l'action d'attaque du tour).
// - CC : sort réussi, puis D100 ≤ Chance / 10 (1 à 25 %, comme les armes) : les dés font leur maximum (pas pour Purge).
// - EC : naturel 96 à 100, puis D100 > Chance : le lanceur subit l'effet minimum de son sort (dés à 1).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMagic=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);

  function createMagicRules({reference,combat,random=Math.random}={}){
    const spells=rows(reference?.spells);
    const spellByCode=new Map(spells.map(x=>[x.code,x]));
    function constant(code,fallback){
      const value=Number(rows(reference?.formulaConstants).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    }
    const SPELL_SHARE=constant("magic.mastery.spell_share",0.5);
    const CAST={floor:constant("magic.cast.floor",10),span:constant("magic.cast.span",85),scale:constant("magic.cast.scale",15)};
    const FUMBLE_THRESHOLD=constant("combat.melee.fumble.threshold",96);
    const die=sides=>1+Math.floor(random()*sides);
    const d100=()=>die(100);
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    const num=(value,fallback)=>Number.isFinite(Number(value))&&value!==null&&value!==""?Number(value):fallback;

    function spell(code){ return spellByCode.get(code)||null; }
    function schoolSpells(school){ return spells.filter(x=>x.ecole===school); }
    // Le sort tel que le personnage le connaît (null s'il ne le connaît pas).
    function knownSpell(unit,code){
      return (unit?.character?.spells||[]).find(x=>x.code===code||x.name===spell(code)?.nom)||null;
    }
    function spellLevel(unit,code){ return Math.max(1,Number(knownSpell(unit,code)?.mastery)||1); }
    function schoolLevel(unit,school){ return combat.statWithGear(unit,school); }
    function mastery(unit,code){
      const s=spell(code);
      return s?schoolLevel(unit,s.ecole)+SPELL_SHARE*spellLevel(unit,code):0;
    }
    // base + Maîtrise / pas, arrondi bas (portée, durée, rayon de zone).
    function stepped(unit,code,baseKey,stepKey){
      const s=spell(code);
      if(!s||s[baseKey]==null) return 0;
      return num(s[baseKey],0)+Math.floor(mastery(unit,code)/num(s[stepKey],25));
    }
    const range=(unit,code)=>stepped(unit,code,"portee_base","portee_pas_maitrise");
    const duration=(unit,code)=>stepped(unit,code,"duree_base","duree_pas_maitrise");
    const zoneRadius=(unit,code)=>stepped(unit,code,"zone_rayon_base","zone_rayon_pas_maitrise");

    function dice(code){
      const s=spell(code);
      return {count:num(s?.effet_nb_des,1),sides:num(s?.effet_de,0)};
    }
    function rollDice(code){
      const {count,sides}=dice(code);
      let total=0;
      for(let i=0;i<count;i++) total+=die(sides);
      return total;
    }
    // Facteur de l'effet : (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100).
    function effectFactor(unit,code){
      const s=spell(code);
      if(!s) return 0;
      const power=combat.statWithGear(unit,"Puissance magique");
      return num(s.effet_puissance_facteur,2)*power/100*(num(s.effet_maitrise_base,0.5)+mastery(unit,code)/100);
    }
    // Effet pour un total de dés donné ; factor : facteur figé (Régénération garde celui du lancer).
    function effectAmount(unit,code,diceTotal,factor=effectFactor(unit,code)){
      const s=spell(code);
      return s&&dice(code).count?Math.ceil(num(s.effet_base,10)*diceTotal*factor-1e-9):0;
    }
    // Fourchette : dés à 1 (aussi l'échec critique) et dés au maximum (aussi le coup critique).
    function effectRange(unit,code){
      const {count,sides}=dice(code);
      return {min:effectAmount(unit,code,count),max:effectAmount(unit,code,count*sides)};
    }
    // Garde-fou technique : au moins 1 mana (la formule n'atteint 0 qu'à 300 de maîtrise).
    function manaCost(unit,code){
      const s=spell(code);
      return s?Math.max(1,Math.ceil(num(s.mana_base,0)*(1-mastery(unit,code)/num(s.mana_diviseur_maitrise,300))-1e-9)):0;
    }
    function currentMana(unit){
      const mana=Number(unit?.character?.mana);
      return Number.isFinite(mana)?mana:combat.statWithGear(unit,"Réserve de mana");
    }

    // Altération magique de l'armure portée, × le multiplicateur de malus de sa qualité (usée 1,2 ; Grand Luxe 0,8).
    function armorPenalty(unit){
      const item=combat.armorItem(unit),template=combat.armorTemplate(item);
      if(!template) return 0;
      return (Number(template.alteration_magique_base)||0)*(Number(combat.quality(item).multiplicateur_malus)||1);
    }
    function castChance(unit,code){
      const s=spell(code);
      if(!s) return {base:0,armor:0,p:0};
      const delta=(mastery(unit,code)+combat.statWithGear(unit,"Intelligence"))/2-num(s.difficulte,0);
      const base=CAST.floor+CAST.span/(1+Math.exp(-delta/CAST.scale));
      const armor=armorPenalty(unit);
      return {delta,base,armor,p:clamp(base-armor,0,100)};
    }

    // Les morts-vivants n'existent pas encore (doc 17) : ils porteront undead = true ou la faction « Morts-vivants ».
    function isUndead(unit){
      const c=unit?.character;
      return Boolean(c?.undead)||c?.faction==="Morts-vivants";
    }
    // Le poison n'existe pas encore en combat : une unité empoisonnée portera poisoned = true.
    function isPoisoned(unit){ return Boolean(unit?.poisoned); }
    // Toutes les unités en jeu dans le cercle (alliés, ennemis, lanceur compris).
    function unitsInZone(center,radius,units){
      return (units||[]).filter(u=>u.alive!==false&&!u.offMap&&combat.axialDistance(center,u)<=radius);
    }

    // Peut-on lancer ce sort sur cette cible (une unité, ou une case {q, r} pour une zone) ?
    // lineOfSight : fourni par la carte (aucun décor ne la coupe en V1).
    function canCast(caster,target,code,{lineOfSight=true}={}){
      const s=spell(code);
      if(!s) return {ok:false,reason:"Sort inconnu."};
      if(!knownSpell(caster,code)) return {ok:false,reason:caster.character.name+" ne connaît pas "+s.nom+"."};
      if(caster.alive===false) return {ok:false,reason:"Le lanceur est hors combat."};
      if(s.action==="rapide"&&caster.quickAvailable===false) return {ok:false,reason:"L'action rapide est déjà utilisée."};
      if(s.action==="principale"&&caster.attackAvailable===false) return {ok:false,reason:"L'action principale est déjà utilisée."};
      const cost=manaCost(caster,code);
      if(currentMana(caster)<cost) return {ok:false,reason:"Pas assez de mana ("+cost+" nécessaires)."};
      if(!target) return {ok:false,reason:"Aucune cible."};
      if(s.cible!=="case"&&target.alive===false) return {ok:false,reason:"Cible hors combat."};
      if(s.cible==="allie_ou_soi"&&target!==caster&&target.team!==caster.team) return {ok:false,reason:"Ce sort vise un allié ou le lanceur."};
      if(s.cible==="mort_vivant"&&!isUndead(target)) return {ok:false,reason:s.nom+" ne fonctionne que sur les morts-vivants."};
      if(s.effet==="purge_poison"&&!isPoisoned(target)) return {ok:false,reason:"La cible n'est pas empoisonnée."};
      const self=target===caster||(target.q===caster.q&&target.r===caster.r);
      const distance=self?0:combat.axialDistance(caster,target),reach=range(caster,code);
      if(distance>reach) return {ok:false,reason:"Cible hors de portée ("+distance+" cases, portée "+reach+")."};
      if(s.ligne_de_vue&&!self&&!lineOfSight) return {ok:false,reason:"Pas de ligne de vue."};
      return {ok:true,cost,distance,range:reach};
    }

    // Lance le sort : tirages et résultat, sans rien appliquer (l'écran de combat applique PV, mana, actions et effets).
    // amount : PV soignés ou dégâts ; zone : {center, radius} ; effect : la Régénération à poser sur la cible.
    function cast(caster,target,code,options={}){
      const check=canCast(caster,target,code,options);
      if(!check.ok) return check;
      const s=spell(code),chance=castChance(caster,code),roll=d100();
      const success=roll<=chance.p;
      const {count,sides}=dice(code);
      const result={ok:true,spell:s.code,name:s.nom,effet:s.effet,action:s.action,cost:check.cost,p:chance.p,base:chance.base,
        armor:chance.armor,roll,success,critical:false,fumble:false,dice:0,amount:0,selfDamage:0};
      if(success){
        if(s.critique!==false){
          const critChance=combat.criticalChance(caster),critRoll=d100();
          Object.assign(result,{critChance,critRoll,critical:critRoll<=critChance});
        }
        if(s.effet==="soin_sur_duree"){
          const factor=effectFactor(caster,code);
          result.effect={code:s.code,factor,turns:duration(caster,code),critical:result.critical,cumulable:s.cumulable!==false};
        }else if(count){
          result.dice=result.critical?count*sides:rollDice(code);
          result.amount=effectAmount(caster,code,result.dice);
        }
        if(s.effet==="soin_de_zone") result.zone={center:{q:target.q,r:target.r},radius:zoneRadius(caster,code)};
        if(s.effet==="purge_poison") result.purge=true;
      }else if(roll>=FUMBLE_THRESHOLD){
        const fumbleRoll=d100();
        Object.assign(result,{fumbleRoll,fumble:fumbleRoll>combat.statWithGear(caster,"Chance")});
        if(result.fumble) result.selfDamage=effectAmount(caster,code,count);
      }
      return result;
    }

    // Régénération : un tour de soin, au début de l'activation de la cible ; dé au maximum si le lancer était critique.
    function tick(effect){
      if(!effect||effect.turns<=0) return {amount:0,turnsLeft:0};
      const {count,sides}=dice(effect.code);
      const total=effect.critical?count*sides:rollDice(effect.code);
      const s=spell(effect.code);
      return {amount:Math.ceil(num(s?.effet_base,10)*total*effect.factor-1e-9),dice:total,turnsLeft:effect.turns-1};
    }

    return {
      spells,
      spell,
      schoolSpells,
      knownSpell,
      spellLevel,
      schoolLevel,
      mastery,
      range,
      duration,
      zoneRadius,
      dice,
      effectFactor,
      effectAmount,
      effectRange,
      manaCost,
      currentMana,
      armorPenalty,
      castChance,
      isUndead,
      isPoisoned,
      unitsInZone,
      canCast,
      cast,
      tick
    };
  }

  return {createMagicRules};
});
