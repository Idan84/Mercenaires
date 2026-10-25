"use strict";

// Magie — règles des sorts (doc 12 « Décisions du 2026-10-25 » ; Idan). Données : data/reference/spells.json et
// formula-constants.json (magic.*). Les valeurs avec équipement (école avec bague, Puissance magique avec amulette,
// Chance, armure portée) viennent du moteur de combat.
// - Un sort est appris au niveau 1 et monte quand on s'en sert ; character.spells = [{code, name, school, mastery}],
//   mastery étant le niveau du sort (1 à 100).
// - Maîtrise = École + Niveau du sort / 2 : l'école pèse deux fois plus que le sort.
// - Soin rapide (Vie), en action rapide, sur un allié ou soi-même, à portée et en ligne de vue :
//   PV = ceil(10 × 1D4 × (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100)) ; portée = 2 + Maîtrise / 25 (arrondi
//   bas) ; mana = ceil(12 × (1 − Maîtrise / 300)).
// - Réussite = 10 + 85 / (1 + e^(−Δ / 15)), Δ = (Maîtrise + Intelligence) / 2 − difficulté (30), moins l'Altération
//   magique de l'armure portée (× le multiplicateur de malus de sa qualité), en points, jamais sous 0.
// - Le mana est dépensé même si le sort échoue.
// - CC : sort réussi, puis D100 ≤ Chance / 10 (1 à 25 %, comme les armes) : le dé du soin fait son maximum.
// - EC : naturel 96 à 100, puis D100 > Chance : le soin se retourne, le lanceur perd le soin minimum (dé à 1).
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

    function spell(code){ return spellByCode.get(code)||null; }
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

    // Facteur du soin : (2 × Puissance magique / 100) × (0,5 + Maîtrise / 100).
    function effectFactor(unit,code){
      const s=spell(code);
      if(!s) return 0;
      const power=combat.statWithGear(unit,"Puissance magique");
      return (Number(s.effet_puissance_facteur)||2)*power/100*((Number(s.effet_maitrise_base)||0.5)+mastery(unit,code)/100);
    }
    function effectAmount(unit,code,dieValue){
      const s=spell(code);
      return s?Math.ceil((Number(s.effet_base)||10)*dieValue*effectFactor(unit,code)-1e-9):0;
    }
    // Fourchette du soin : dé à 1 (aussi la perte d'un échec critique) et dé au maximum (aussi le coup critique).
    function effectRange(unit,code){
      const s=spell(code);
      return {min:effectAmount(unit,code,1),max:effectAmount(unit,code,Number(s?.effet_de)||4)};
    }
    function range(unit,code){
      const s=spell(code);
      return s?(Number(s.portee_base)||0)+Math.floor(mastery(unit,code)/(Number(s.portee_pas_maitrise)||25)):0;
    }
    // Garde-fou technique : au moins 1 mana (la formule n'atteint 0 qu'à 300 de maîtrise).
    function manaCost(unit,code){
      const s=spell(code);
      return s?Math.max(1,Math.ceil((Number(s.mana_base)||0)*(1-mastery(unit,code)/(Number(s.mana_diviseur_maitrise)||300))-1e-9)):0;
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
      const delta=(mastery(unit,code)+combat.statWithGear(unit,"Intelligence"))/2-(Number(s.difficulte)||0);
      const base=CAST.floor+CAST.span/(1+Math.exp(-delta/CAST.scale));
      const armor=armorPenalty(unit);
      return {delta,base,armor,p:clamp(base-armor,0,100)};
    }

    // Peut-on lancer ce sort sur cette cible ? lineOfSight : fourni par la carte (aucun décor ne la coupe en V1).
    function canCast(caster,target,code,{lineOfSight=true}={}){
      const s=spell(code);
      if(!s) return {ok:false,reason:"Sort inconnu."};
      if(!knownSpell(caster,code)) return {ok:false,reason:caster.character.name+" ne connaît pas "+s.nom+"."};
      if(caster.alive===false) return {ok:false,reason:"Le lanceur est hors combat."};
      if(s.action==="rapide"&&caster.quickAvailable===false) return {ok:false,reason:"L'action rapide est déjà utilisée."};
      const cost=manaCost(caster,code);
      if(currentMana(caster)<cost) return {ok:false,reason:"Pas assez de mana ("+cost+" nécessaires)."};
      if(!target||target.alive===false) return {ok:false,reason:"Cible hors combat."};
      if(s.cible==="allie_ou_soi"&&target!==caster&&target.team!==caster.team) return {ok:false,reason:"Ce sort vise un allié ou le lanceur."};
      const distance=target===caster?0:combat.axialDistance(caster,target),reach=range(caster,code);
      if(distance>reach) return {ok:false,reason:"Cible hors de portée ("+distance+" cases, portée "+reach+")."};
      if(s.ligne_de_vue&&target!==caster&&!lineOfSight) return {ok:false,reason:"Pas de ligne de vue."};
      return {ok:true,cost,distance,range:reach};
    }

    // Lance le sort : tirages et résultat, sans rien appliquer (l'écran de combat applique PV, mana et action rapide).
    function cast(caster,target,code,options={}){
      const check=canCast(caster,target,code,options);
      if(!check.ok) return check;
      const s=spell(code),chance=castChance(caster,code),roll=d100();
      const success=roll<=chance.p;
      const result={ok:true,spell:s.code,name:s.nom,cost:check.cost,p:chance.p,base:chance.base,armor:chance.armor,roll,success,
        critical:false,fumble:false,die:0,amount:0,selfDamage:0};
      if(success){
        const critChance=combat.criticalChance(caster),critRoll=d100();
        Object.assign(result,{critChance,critRoll,critical:critRoll<=critChance});
        result.die=result.critical?(Number(s.effet_de)||4):die(Number(s.effet_de)||4);
        result.amount=effectAmount(caster,code,result.die);
      }else if(roll>=FUMBLE_THRESHOLD){
        const fumbleRoll=d100();
        Object.assign(result,{fumbleRoll,fumble:fumbleRoll>combat.statWithGear(caster,"Chance")});
        if(result.fumble) result.selfDamage=effectAmount(caster,code,1);
      }
      return result;
    }

    return {
      spells,
      spell,
      knownSpell,
      spellLevel,
      schoolLevel,
      mastery,
      effectFactor,
      effectAmount,
      effectRange,
      range,
      manaCost,
      currentMana,
      armorPenalty,
      castChance,
      canCast,
      cast
    };
  }

  return {createMagicRules};
});
