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
// - Réussite = 10 + 85 / (1 + e^(−Δ / 15)), Δ = (Maîtrise + Intelligence) / 2 − 30 (la même difficulté pour tous les
//   sorts : Idan, 2026-11-01), moins l'Altération magique de l'armure portée (× le multiplicateur de malus de sa
//   qualité), en points, jamais sous 0.
// - Le mana est dépensé même si le sort échoue. Action rapide ou principale (l'action d'attaque du tour).
// - CC : sort réussi, puis D100 ≤ Chance / 10 (1 à 25 %, comme les armes) : les dés font leur maximum (pas pour Purge).
// - EC : naturel 96 à 100, puis D100 > Chance : le lanceur subit l'effet minimum de son sort (dés à 1).
// - École du Feu (Idan, 2026-10-25) : dégâts de feu = effet × (1 − protection / 100), protection = Résistance au feu +
//   armure portée (« brûlant ») + bonus, bornée de −50 à +75 (combat-engine.js, elementalDamage). Trait de feu suit les
//   règles de l'arc (toucher contre l'Esquive, distance, tir raté qui peut toucher quelqu'un d'autre) ; Boule de feu ne
//   s'évite pas mais peut dévier de 1 à 3 cases, dégâts dégressifs vers le bord, tir ami ; Anneau de feu frappe tout le
//   monde à 1 ou 2 cases du lanceur ; Arme enflammée ajoute du feu à chaque coup qui touche ; Armure de feu protège du
//   froid ; Flaque de magma rend une case vide infranchissable.
// - École de l'Eau (Idan, 2026-10-27) : Brouillard pose un rideau de 5 cases qui coupe la ligne de vue pendant 3 tours ;
//   Eau guérissante soigne 1D3 ; Flèche de glace est le Trait de feu en froid ; Tsunami frappe une ligne de 3 à 5 cases
//   partie de la case voisine ; Armure de froid protège du feu ; Gel retire Vitesse et Dextérité (moins la protection
//   contre le froid de la cible) ; Arme de glace ajoute du froid à chaque coup qui touche.
// - École de la Transmutation (Idan, 2026-10-27) : des bonus pour un allié ou soi, pendant 1 tour (2 pour un maître) :
//   6e sens, Force de titan et Vitesse du guépard (+20 + M/5 % de la valeur de base), Peau de pierre (+10 + M/10 points de
//   Résistance physique) ; Crachat de venin donne un tir de venin par action rapide (empoisonne : combat.poison.*) ;
//   Cautérisation soigne 1D3.
// - École de la Foudre (Idan, 2026-10-27) : Décharge électrique (2D8 au contact, sans jet de toucher), Éclair (comme une
//   flèche), Arme électrique, Boule d'éclairs (2D6 puis quatre rebonds, alliés compris : 100, 80, 60, 40, 20 %), Foudre
//   (1D8 sans ligne de vue), Célérité (Vitesse, sur soi, 2 tours). Portée moyenne des attaques : 6 + M/25, au plus 12.
// - École de la Télékinésie (Idan, 2026-10-28) : dégâts contondants qui passent par l'armure (combat-engine.js,
//   spellPhysicalHit) ; Attraction et Projection déplacent la cible de 2 + M/50 cases (un obstacle l'arrête : choc) ;
//   Déplacement pousse un personnage d'une case ; Entrechoc frappe deux ennemis côte à côte ; Champ de protection dévie la
//   moitié des projectiles pendant 4 tours ; Lancer de pierre est un tir de fronde.
// - École de l'Illusion (Idan, 2026-10-28) : Peur (test de Courage des ennemis d'une zone contre la Maîtrise et la Volonté
//   du lanceur), Soutien illusoire et Courage de masse (Courage), Avancée cachée (Discrétion), Choc psychique (dégâts ×
//   Volonté du lanceur / Volonté de la cible), Frénésie (la cible joue seule, +10 % de Force, plus de peur).
// - École de la Nécromancie (Idan, 2026-10-28) : le Charisme compte. Résurrection (un mort, allié ou ennemi, devient un
//   zombie de 10 à 100 % de ses valeurs) et Invocation de spectre : test de Charisme et mana chaque tour pour les garder ;
//   Drain de vie (la moitié des PV retirés au corps à corps, sur soi) ; Flèche de mort et Nécrose (dégâts nécrotiques :
//   ni armure ni résistance, sans effet sur les morts-vivants) ; Flétrissement (plus aucun soin, 3 à 4 tours).
// - École de l'Invocation (Idan, 2026-10-28) : mêmes règles d'invocation (Charisme, entretien). Corbeau (éclaireur très
//   discret), Loups (1D6 + M/50, une meute = une invocation), Ours et Crocodiles (1D3) ; Bourbier (une case où l'on ne
//   peut plus bouger, 2 à 3 tours) ; Transposition (le lanceur échange sa place avec une de ses invocations).
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
    // Une seule difficulté pour tous les sorts (Idan, 2026-11-01 : pas de paliers ; un gros sort se distingue par son effet
    // et son mana, qui montent avec la maîtrise et la Puissance magique).
    const CAST={floor:constant("magic.cast.floor",10),span:constant("magic.cast.span",85),scale:constant("magic.cast.scale",15),
      difficulty:constant("magic.cast.difficulty",30)};
    const FUMBLE_THRESHOLD=constant("combat.melee.fumble.threshold",96);
    const RECHARGE={base:constant("magic.mana.recharge_base",10),willShare:constant("magic.mana.recharge_will_share",0.5)};
    const SUMMON={hold:constant("magic.summon.hold_difficulty",30),zombieMin:constant("magic.summon.zombie_share_min",10),
      zombieMax:constant("magic.summon.zombie_share_max",100)};
    const die=sides=>1+Math.floor(random()*sides);
    const d100=()=>die(100);
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    const num=(value,fallback)=>Number.isFinite(Number(value))&&value!==null&&value!==""?Number(value):fallback;

    function spell(code){ return spellByCode.get(code)||null; }
    function schoolSpells(school){ return spells.filter(x=>x.ecole===school); }
    // Le sort tel que le personnage le connaît (null s'il ne le connaît pas) : son grimoire d'abord, puis unit.spells, les
    // sorts prêtés au niveau 1 pour un seul combat (bouton de test de l'écran de combat), sans toucher au grimoire.
    function knownSpell(unit,code){
      return [...(unit?.character?.spells||[]),...(unit?.spells||[])].find(x=>x.code===code||x.name===spell(code)?.nom)||null;
    }
    function knownSpells(unit){ return spells.filter(x=>knownSpell(unit,x.code)); }
    function spellLevel(unit,code){ return Math.max(1,Number(knownSpell(unit,code)?.mastery)||1); }
    function schoolLevel(unit,school){ return combat.statWithGear(unit,school); }
    function mastery(unit,code){
      const s=spell(code);
      return s?schoolLevel(unit,s.ecole)+SPELL_SHARE*spellLevel(unit,code):0;
    }
    // base + Maîtrise / pas, arrondi bas (portée, durée, rayon de zone, bonus) ; sans pas, la base seule ; plafond éventuel.
    function stepped(unit,code,baseKey,stepKey,maxKey=null){
      const s=spell(code);
      if(!s||s[baseKey]==null) return 0;
      const step=num(s[stepKey],0),value=num(s[baseKey],0)+(step>0?Math.floor(mastery(unit,code)/step):0);
      return maxKey&&s[maxKey]!=null?Math.min(num(s[maxKey],value),value):value;
    }
    const range=(unit,code)=>stepped(unit,code,"portee_base","portee_pas_maitrise","portee_max");
    const duration=(unit,code)=>stepped(unit,code,"duree_base","duree_pas_maitrise","duree_max");
    const zoneRadius=(unit,code)=>stepped(unit,code,"zone_rayon_base","zone_rayon_pas_maitrise","zone_rayon_max");
    const bonus=(unit,code)=>stepped(unit,code,"bonus_base","bonus_pas_maitrise");
    const zoneLength=(unit,code)=>stepped(unit,code,"zone_longueur_base","zone_longueur_pas_maitrise","zone_longueur_max");
    const forceSteps=(unit,code)=>stepped(unit,code,"deplacement_base","deplacement_pas_maitrise");
    // Caractéristiques visées par un malus (Gel : « Vitesse, Dextérité »).
    function targetStats(code){
      return String(spell(code)?.caracteristiques||"").split(",").map(x=>x.trim()).filter(Boolean);
    }

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
    function manaMax(unit){ return combat.statWithGear(unit,"Réserve de mana"); }
    function currentMana(unit){
      const mana=Number(unit?.character?.mana);
      return Number.isFinite(mana)?mana:manaMax(unit);
    }
    // Recharge au camp (Idan, 2026-10-25) : chaque jour, Réserve de mana × (10 + Volonté / 2) %, équipement compris,
    // arrondi au supérieur, jusqu'à la Réserve. Rien pendant les trajets (campaign.js ne recharge que le camp).
    // bonusPercent : les Bains chauds du camp (Idan, 2026-11-01), + 5 % de la Réserve par niveau.
    function dailyRecharge(unit,bonusPercent=0){
      const percent=RECHARGE.base+RECHARGE.willShare*combat.statWithGear(unit,"Volonté")+(Number(bonusPercent)||0);
      return Math.ceil(manaMax(unit)*percent/100-1e-9);
    }
    function rechargeMana(character,{bonusPercent=0}={}){
      const unit={character,activeSet:1},max=manaMax(unit),before=currentMana(unit);
      const after=Math.min(max,Math.max(before,before+dailyRecharge(unit,bonusPercent)));
      character.mana=Math.round(after*100)/100;
      return {before,after:character.mana,gained:character.mana-before,max};
    }

    // Altération magique de l'armure portée, × le multiplicateur de malus de sa qualité (Usée 1,2 ; De bonne facture 0,8 ; De luxe 0,6).
    function armorPenalty(unit){
      const item=combat.armorItem(unit),template=combat.armorTemplate(item);
      if(!template) return 0;
      return (Number(template.alteration_magique_base)||0)*(Number(combat.quality(item).multiplicateur_malus)||1);
    }
    function castChance(unit,code){
      const s=spell(code);
      if(!s) return {base:0,armor:0,p:0};
      const delta=(mastery(unit,code)+combat.statWithGear(unit,"Intelligence"))/2-CAST.difficulty;
      const base=CAST.floor+CAST.span/(1+Math.exp(-delta/CAST.scale));
      const armor=armorPenalty(unit);
      // Brouillage mental (Illusion) : unit.mindFog = {malus, turns}, des points de chance en moins.
      const fog=Math.max(0,num(unit?.mindFog?.malus,0));
      return {delta,base,armor,fog,p:clamp(base-armor-fog,0,100)};
    }

    // Invocations (Nécromancie ; Idan, 2026-10-28). Entretien : entretien_mana × (1 − Maîtrise / 300) mana par tour, au
    // moins 1. Maintien : chaque tour, la formule de réussite d'un sort, avec le Charisme à la place de l'Intelligence et
    // une difficulté de 30, sans l'armure ; raté, l'invocation disparaît. Zombie : (Maîtrise + Charisme) / 2 % du mort,
    // de 10 à 100 %.
    function upkeepCost(unit,code){
      const s=spell(code);
      return s?.entretien_mana?Math.max(1,Math.ceil(num(s.entretien_mana,0)*(1-mastery(unit,code)/num(s.mana_diviseur_maitrise,300))-1e-9)):0;
    }
    function holdChance(unit,code){
      const delta=(mastery(unit,code)+combat.statWithGear(unit,"Charisme"))/2-SUMMON.hold;
      return clamp(CAST.floor+CAST.span/(1+Math.exp(-delta/CAST.scale)),0,100);
    }
    function rollHold(unit,code){
      const p=holdChance(unit,code),roll=d100();
      return {p,roll,held:roll<=p};
    }
    // Nombre de créatures (Invocation ; Idan, 2026-10-28) : invocation_nb_des D invocation_de (1D6 loups, 1D3 ours ou
    // crocodiles), + 1 par tranche de invocation_pas_maitrise de Maîtrise (loups : 50) ; une seule sans dés.
    function summonCount(unit,code){
      const s=spell(code),count=num(s?.invocation_nb_des,0),sides=num(s?.invocation_de,0),step=num(s?.invocation_pas_maitrise,0);
      let rolled=0;
      for(let i=0;i<count;i++) rolled+=die(sides);
      const bonus=step>0?Math.floor(mastery(unit,code)/step):0;
      return {count:count&&sides?rolled+bonus:1,rolled:count&&sides?rolled:null,dice:count&&sides?count+"D"+sides:null,bonus};
    }
    function zombieShare(unit,code){
      return clamp((mastery(unit,code)+combat.statWithGear(unit,"Charisme"))/2,SUMMON.zombieMin,SUMMON.zombieMax);
    }
    // Un corps qu'on peut relever : un combattant hors combat resté sur la carte, ni déjà relevé, ni une invocation.
    function isCorpse(unit){
      return Boolean(unit?.character)&&unit.alive===false&&!unit.offMap&&!unit.raised&&!unit.summon;
    }

    // Morts-vivants : undead = true (zombie, spectre) ou la faction « Morts-vivants ».
    function isUndead(unit){
      const c=unit?.character;
      return Boolean(c?.undead)||c?.faction==="Morts-vivants";
    }
    // Empoisonné : unit.poisoned = {turns, amount, …} (Crachat de venin) ; Purge le retire.
    function isPoisoned(unit){ return Boolean(unit?.poisoned); }
    // Délivrance (Vie ; Idan, 2026-10-31) : les états qu'elle retire (spells.json, retire) et que la cible porte.
    // fuite : unit.fleeing (la peur) ; paralysie : unit.paralyzed ; gel : unit.statMalus posé par Gel ; frenesie : unit.frenzy ;
    // sommeil : unit.asleep ; desespoir : un malus de caractéristique d'un sort (statBuffs, colonne malus) ; brouillage : unit.mindFog.
    const AFFLICTIONS={
      fuite:u=>Boolean(u?.fleeing),
      paralysie:u=>Boolean(u?.paralyzed),
      gel:u=>u?.statMalus?.code==="freeze"||Boolean(u?.frozen),
      frenesie:u=>Boolean(u?.frenzy),
      sommeil:u=>Boolean(u?.asleep),
      desespoir:u=>Object.keys(u?.statBuffs||{}).some(c=>spell(c)?.malus),
      brouillage:u=>Boolean(u?.mindFog)
    };
    function afflictions(unit,code){
      const list=String(spell(code)?.retire||"").split(",").map(x=>x.trim()).filter(Boolean);
      return list.filter(name=>AFFLICTIONS[name]?.(unit));
    }
    // Toutes les unités en jeu dans le cercle (alliés, ennemis, lanceur compris) ; minDistance : anneau (Anneau de feu).
    function unitsInZone(center,radius,units,minDistance=0){
      return (units||[]).filter(u=>{
        if(u.alive===false||u.offMap) return false;
        const d=combat.axialDistance(center,u);
        return d>=minDistance&&d<=radius;
      });
    }
    // Part de l'effet à d cases du centre : dégressif (Boule de feu) = 1 − d / (rayon + 1), sinon entière.
    function zoneFactor(zone,distance){
      return zone?.degressive?Math.max(0,1-distance/(zone.radius+1)):1;
    }

    // Toucher d'un sort « comme une flèche » (Trait de feu ; Idan, 2026-10-25 : « les mêmes règles que pour l'arc ») :
    // la formule de tir, la Maîtrise du sort à la place des compétences d'arme (catégorie et arme), la portée du sort pour
    // la perte avec la distance (au-delà du quart de la portée). over : {mastery, reach} pour un tir accordé par un sort
    // (Crachat de venin : la Maîtrise du lanceur, la portée de la sarbacane).
    function hitChance(caster,target,code,over={}){
      const reach=over.reach??range(caster,code),distance=combat.axialDistance(caster,target),m=over.mastery??mastery(caster,code);
      // Depuis le camouflage, la cible ne se défend pas avec sa Perception (Frappe dans le dos V1).
      const defensivePerception=caster.camouflaged&&caster.team!==target.team?0:combat.statWithGear(target,"Perception");
      let delta=combat.effectiveDexterity(caster)
        +0.2*(2*m+combat.statWithGear(caster,"Perception")+combat.effectiveSpeed(caster))
        -combat.effectiveDodge(target)
        -0.2*(defensivePerception+combat.effectiveSpeed(target));
      const free=Math.ceil(reach/4);
      if(distance>free&&reach>free) delta-=40*(distance-free)/(reach-free);
      return clamp(10+80/(1+Math.exp(-delta/20)),10,90);
    }
    // Précision d'une zone (Boule de feu) : base + part × Maîtrise − perte × distance, de 10 à 95 %.
    function precisionChance(caster,code,distance){
      const s=spell(code);
      return clamp(num(s?.precision_base,100)+num(s?.precision_part_maitrise,0)*mastery(caster,code)-num(s?.precision_par_case,0)*distance,10,95);
    }
    const HEX_DIRECTIONS=[{q:1,r:0},{q:1,r:-1},{q:0,r:-1},{q:-1,r:0},{q:-1,r:1},{q:0,r:1}];
    const cartesian=h=>({x:Math.sqrt(3)*(h.q+h.r/2),y:1.5*h.r});
    // Ligne (Tsunami) : de la case visée, voisine du lanceur, droit devant sur length cases.
    function lineCells(caster,target,length){
      const dir={q:target.q-caster.q,r:target.r-caster.r};
      return Array.from({length},(_,k)=>({q:target.q+dir.q*k,r:target.r+dir.r*k}));
    }
    // Cône (Souffle ardent ; Idan, 2026-10-31, chiffres de JC3) : du lanceur vers la case voisine visée, toutes les cases à
    // length cases au plus dont la direction s'écarte de 30° au plus de l'axe : 1 case, puis 3, puis 3.
    function coneCells(caster,target,length){
      const a=cartesian(caster),b=cartesian(target),vx=b.x-a.x,vy=b.y-a.y,norm=Math.hypot(vx,vy)||1,cells=[];
      for(let dq=-length;dq<=length;dq++) for(let dr=Math.max(-length,-dq-length);dr<=Math.min(length,-dq+length);dr++){
        if(!dq&&!dr) continue;
        const c=cartesian({q:dq,r:dr}),cos=(c.x*vx+c.y*vy)/(Math.hypot(c.x,c.y)*norm);
        if(cos>=Math.cos(Math.PI/6)-1e-9) cells.push({q:caster.q+dq,r:caster.r+dr});
      }
      return cells.sort((x,y)=>combat.axialDistance(caster,x)-combat.axialDistance(caster,y));
    }
    // Mur (Brouillard) : length cases centrées sur la case visée, le long de l'axe de la grille le plus en travers de la
    // direction du lanceur (sur sa propre case : le premier axe).
    function wallCells(caster,center,length){
      const a=cartesian(caster),b=cartesian(center),vx=b.x-a.x,vy=b.y-a.y,norm=Math.hypot(vx,vy)||1;
      const across=d=>{ const c=cartesian(d); return Math.abs((c.x*vx+c.y*vy)/(Math.hypot(c.x,c.y)*norm)); };
      const axis=HEX_DIRECTIONS.slice(0,3).reduce((best,d)=>across(d)<across(best)-1e-9?d:best);
      const from=-Math.floor((length-1)/2);
      return Array.from({length},(_,k)=>({q:center.q+axis.q*(from+k),r:center.r+axis.r*(from+k)}));
    }
    // Boule d'éclairs : la cible, puis à chaque rebond le personnage en jeu le plus proche du précédent pas encore touché
    // (à rebond_distance cases au plus ; alliés et lanceur compris ; à égalité, un ennemi du lanceur d'abord) ;
    // le k-ième rebond fait × (1 − k × rebond_perte).
    function chainTargets(caster,first,code,units){
      const s=spell(code),bounces=num(s?.rebonds,0),reach=num(s?.rebond_distance,1),loss=num(s?.rebond_perte,0);
      const foe=u=>Boolean(caster?.team)&&u.team!==caster.team;
      const chain=[{unit:first,factor:1}],hit=new Set([first]);
      let from=first;
      for(let k=1;k<=bounces;k++){
        const near=u=>combat.axialDistance(from,u);
        const next=(units||[]).filter(u=>!hit.has(u)&&u.alive!==false&&!u.offMap&&near(u)<=reach)
          .sort((a,b)=>near(a)-near(b)||foe(b)-foe(a))[0];
        if(!next) break;
        chain.push({unit:next,factor:Math.max(0,Math.round((1-loss*k)*1000)/1000)});
        hit.add(next);
        from=next;
      }
      return chain;
    }
    // Projection : les cases que la cible traverserait, droit dans l'axe lanceur → cible (la direction de la grille la plus
    // proche). Attraction : la ligne de la cible vers le lanceur, jusqu'à la case voisine du lanceur. L'écran de combat
    // arrête la cible au premier obstacle.
    function pushCells(caster,target,steps){
      const a=cartesian(caster),b=cartesian(target),vx=b.x-a.x,vy=b.y-a.y,along=d=>{ const c=cartesian(d); return c.x*vx+c.y*vy; };
      const dir=HEX_DIRECTIONS.reduce((best,d)=>along(d)>along(best)+1e-9?d:best);
      return Array.from({length:steps},(_,k)=>({q:target.q+dir.q*(k+1),r:target.r+dir.r*(k+1)}));
    }
    function pullCells(caster,target,steps){
      return combat.hexLine(target,caster).slice(1,-1).slice(0,steps);
    }
    function unitsInCells(cells,units){
      return (units||[]).filter(u=>u.alive!==false&&!u.offMap&&cells.some(c=>c.q===u.q&&c.r===u.r));
    }

    // Peut-on lancer ce sort sur cette cible (une unité, ou une case {q, r} pour une zone) ?
    // lineOfSight : fourni par la carte (aucun décor ne la coupe en V1).
    function canCast(caster,target,code,{lineOfSight=true,cellFree=true}={}){
      const s=spell(code);
      if(!s) return {ok:false,reason:"Sort inconnu."};
      if(!knownSpell(caster,code)) return {ok:false,reason:caster.character.name+" ne connaît pas "+s.nom+"."};
      if(caster.alive===false) return {ok:false,reason:"Le lanceur est hors combat."};
      if(s.action==="rapide"&&caster.quickAvailable===false) return {ok:false,reason:"L'action rapide est déjà utilisée."};
      if(s.action==="principale"&&caster.attackAvailable===false) return {ok:false,reason:"L'action principale est déjà utilisée."};
      const cost=manaCost(caster,code);
      if(currentMana(caster)<cost) return {ok:false,reason:"Pas assez de mana ("+cost+" nécessaires)."};
      if(s.cible==="soi") target=caster;
      if(!target) return {ok:false,reason:"Aucune cible."};
      const cell=s.cible==="case"||s.cible==="case_vide";
      if(s.cible==="mort"&&!isCorpse(target)) return {ok:false,reason:"Il faut le corps d'un combattant mort."};
      if(s.cible==="mort"&&cellFree===false) return {ok:false,reason:"Quelqu'un se tient sur le corps."};
      // Transposition : une de ses propres invocations, n'importe où sur la carte.
      if(s.cible==="invocation"&&!(target.summon&&target.summon.casterId===caster.id)) return {ok:false,reason:"Ce sort vise une de vos invocations."};
      // Bannissement : une invocation du camp adverse.
      if(s.cible==="invocation_ennemie"&&!(target.summon&&target.team!==caster.team)) return {ok:false,reason:"Ce sort vise une invocation ennemie."};
      if(!cell&&s.cible!=="mort"&&target.alive===false) return {ok:false,reason:"Cible hors combat."};
      if(s.cible==="allie_ou_soi"&&target!==caster&&target.team!==caster.team) return {ok:false,reason:"Ce sort vise un allié ou le lanceur."};
      if(s.cible==="allie"&&(target===caster||target.team!==caster.team)) return {ok:false,reason:"Ce sort vise un allié, pas le lanceur."};
      if(s.cible==="ennemi"&&(target===caster||target.team===caster.team)) return {ok:false,reason:"Ce sort vise un ennemi."};
      if(s.cible==="allie_ou_ennemi"&&(target===caster||!target.character)) return {ok:false,reason:"Ce sort vise un autre personnage."};
      if(s.cible==="personnage"&&!target.character) return {ok:false,reason:"Ce sort vise un personnage."};
      // Un ennemi camouflé est invisible : on ne peut pas le viser (les zones le touchent quand même).
      if(target.character&&target.team&&target.team!==caster.team&&target.camouflaged) return {ok:false,reason:"Cible invisible : elle est camouflée."};
      if(s.cible==="case_vide"&&(cellFree===false||(target.q===caster.q&&target.r===caster.r))) return {ok:false,reason:"Il faut une case vide."};
      if(s.cible==="mort_vivant"&&!isUndead(target)) return {ok:false,reason:s.nom+" ne fonctionne que sur les morts-vivants."};
      if(s.degats_type==="necrotique"&&isUndead(target)) return {ok:false,reason:s.nom+" ne fonctionne que sur les vivants."};
      if(s.effet==="purge_poison"&&!isPoisoned(target)) return {ok:false,reason:"La cible n'est pas empoisonnée."};
      // Source vive : seulement si l'allié n'a pas déjà toute sa réserve.
      if(s.effet==="rend_mana"&&target.character&&currentMana(target)>=manaMax(target)) return {ok:false,reason:"Sa réserve de mana est pleine."};
      if(s.effet==="delivrance"&&!afflictions(target,code).length) return {ok:false,reason:"Rien à retirer : ni peur, ni paralysie, ni gel, ni frénésie, ni sommeil, ni désespoir, ni brouillage."};
      // Lancer d'arme : il faut une arme de corps à corps en main.
      if(s.effet==="lancer_arme"&&!combat.isMeleeWeapon(combat.weaponTemplate(combat.activeWeaponItem(caster)))) return {ok:false,reason:"Il faut une arme de corps à corps en main."};
      // Lien de vie, Pacte de sang : le lanceur garde toujours 1 PV.
      if((s.effet==="transfert_pv"||s.effet==="pacte_de_sang")&&num(caster.hp,0)<=1) return {ok:false,reason:"Le lanceur n'a plus de PV à donner."};
      // Pacte de sang : seulement s'il manque du mana ; Siphon d'âme : seulement si la cible en a.
      if(s.effet==="pacte_de_sang"&&currentMana(caster)>=manaMax(caster)) return {ok:false,reason:"Sa réserve de mana est pleine."};
      if(s.effet==="siphon_mana"&&target.character&&currentMana(target)<=0) return {ok:false,reason:"La cible n'a plus de mana."};
      const self=target===caster||(target.q===caster.q&&target.r===caster.r);
      const distance=self?0:combat.axialDistance(caster,target),reach=range(caster,code);
      if(s.cible!=="invocation"&&distance>reach) return {ok:false,reason:"Cible hors de portée ("+distance+" cases, portée "+reach+")."};
      if((s.zone_forme==="ligne"||s.zone_forme==="cone")&&distance<1) return {ok:false,reason:"Choisissez une case voisine : le sort part dans sa direction."};
      if(s.portee_min!=null&&distance<num(s.portee_min,0)) return {ok:false,reason:"Trop près ("+distance+" case"+(distance>1?"s":"")+", au moins "+num(s.portee_min,0)+")."};
      if(s.ligne_de_vue&&!self&&!lineOfSight) return {ok:false,reason:"Pas de ligne de vue."};
      return {ok:true,cost,distance,range:reach};
    }

    // Entrechoc : la seconde cible, un ennemi voisin de la première, à portée et en vue elle aussi.
    function canCastPair(caster,first,second,code,{lineOfSight=true,secondLineOfSight=true,...rest}={}){
      const check=canCast(caster,first,code,{lineOfSight,...rest});
      if(!check.ok) return check;
      if(!second||second===first||second.alive===false||second===caster||second.team===caster.team) return {ok:false,reason:"Il faut un second ennemi."};
      if(combat.axialDistance(first,second)!==1) return {ok:false,reason:"Les deux ennemis doivent être côte à côte."};
      const distance=combat.axialDistance(caster,second);
      if(distance>check.range) return {ok:false,reason:"Second ennemi hors de portée ("+distance+" cases, portée "+check.range+")."};
      if(spell(code)?.ligne_de_vue&&!secondLineOfSight) return {ok:false,reason:"Pas de ligne de vue sur le second ennemi."};
      return check;
    }
    // Choc psychique : × Volonté du lanceur / Volonté de la cible, de 0,5 à 2.
    function willFactor(caster,target){
      return clamp(combat.statWithGear(caster,"Volonté")/Math.max(1,combat.statWithGear(target,"Volonté")),0.5,2);
    }
    // Champ de protection : un projectile (arme de tir ou sort qui vole comme une flèche) a chance % d'être dévié.
    function deflection(target){
      const shield=target?.projectileShield;
      if(!shield) return null;
      const p=num(shield.chance,0),roll=d100();
      return {p,roll,deflected:roll<=p};
    }

    // Lance le sort : tirages et résultat, sans rien appliquer (l'écran de combat applique PV, mana, actions et effets).
    // amount : PV soignés ou dégâts ; zone : {center, radius} ; effect : la Régénération à poser sur la cible.
    // Toucher « comme une flèche » : le trait touche la cible, ou part dans la ligne de tir et peut toucher quelqu'un
    // d'autre (approximation des projectiles : P = toucher × 0,35, puis × 0,5 pour chaque candidat suivant).
    function resolveSpellHit(caster,target,code,result,units){
      const shield=deflection(target);
      if(shield?.deflected){
        Object.assign(result,{deflected:true,pDeflect:shield.p,deflectRoll:shield.roll,hit:false,victim:null});
        return;
      }
      const p=hitChance(caster,target,code),hitRoll=d100();
      Object.assign(result,{pHit:p,hitRoll,hit:hitRoll<=p,victim:hitRoll<=p?target:null});
      if(result.hit) return;
      const tries=[];
      let factor=combat.STRAY?.initial??0.35;
      for(const unit of combat.strayCandidates(caster,target,units,range(caster,code))){
        const pStray=hitChance(caster,unit,code)*factor,strayRoll=d100();
        tries.push({unit,p:pStray,roll:strayRoll});
        if(strayRoll<=pStray){ result.stray={unit,p:pStray,roll:strayRoll}; result.victim=unit; break; }
        factor*=combat.STRAY?.decay??0.5;
      }
      result.strayTries=tries;
    }

    // Arme enflammée : les dégâts ajoutés à un coup qui touche (dés au maximum si le sort était critique).
    function weaponStrike(effect){
      if(!effect||effect.turns<=0) return {amount:0};
      const {count,sides}=dice(effect.code);
      const total=effect.critical?count*sides:rollDice(effect.code);
      const s=spell(effect.code);
      return {amount:Math.ceil(num(s?.effet_base,10)*total*effect.factor-1e-9),dice:total,element:effect.element};
    }

    function cast(caster,target,code,options={}){
      const s0=spell(code);
      const check=s0?.effet==="degats_paire"?canCastPair(caster,target,options.second,code,options):canCast(caster,target,code,options);
      if(!check.ok) return check;
      // Déplacement : une case libre voisine de la cible, choisie par le lanceur.
      if(s0.effet==="deplacement_force"){
        const to=options.destination;
        if(!to||combat.axialDistance(target,to)!==1||options.destinationFree===false) return {ok:false,reason:"Choisissez une case libre voisine de la cible."};
      }
      const s=spell(code),chance=castChance(caster,code),roll=d100();
      const success=roll<=chance.p;
      const {count,sides}=dice(code);
      const result={ok:true,spell:s.code,name:s.nom,effet:s.effet,action:s.action,cost:check.cost,p:chance.p,base:chance.base,
        armor:chance.armor,roll,success,critical:false,fumble:false,dice:0,amount:0,selfDamage:0};
      if(s.element) result.element=s.element;
      if(s.cible==="soi") target=caster;
      if(success){
        if(s.critique!==false){
          const critChance=combat.criticalChance(caster),critRoll=d100();
          Object.assign(result,{critChance,critRoll,critical:critRoll<=critChance});
        }
        if(s.effet==="soin_sur_duree"||s.effet==="arme_elementaire"||s.effet==="degats_sur_duree"||s.effet==="aura_de_feu"||s.effet==="malediction"){
          const factor=effectFactor(caster,code);
          result.effect={code:s.code,element:s.element||null,factor,turns:duration(caster,code),critical:result.critical,cumulable:s.cumulable!==false};
        }else if(s.effet==="protection_elementaire"){
          // Peau d'écailles (Transmutation) : plusieurs éléments à la fois (spells.json, elements).
          const elements=String(s.elements||s.element||"").split(",").map(x=>x.trim()).filter(Boolean);
          result.effect={code:s.code,element:elements[0]||null,elements,bonus:bonus(caster,code),turns:duration(caster,code),cumulable:s.cumulable!==false};
        }else if(s.effet==="mur_de_flammes"){
          // Mur de flammes : les cases du mur et, pour chaque brûlure, les dés du sort × le facteur figé au lancer.
          result.wall={cells:wallCells(caster,target,zoneLength(caster,code)),turns:duration(caster,code),
            effect:{code:s.code,element:s.element,factor:effectFactor(caster,code),critical:false,turns:1}};
        }else if(s.effet==="terrain_infranchissable"){
          result.terrain={q:target.q,r:target.r,turns:duration(caster,code)};
        }else if(s.effet==="bonus_caracteristiques"){
          // Désespoir (Illusion) : un malus (colonne malus), la même mécanique en négatif.
          result.effect={code:s.code,stats:targetStats(code),value:(s.malus?-1:1)*bonus(caster,code),unit:s.bonus_unite==="pourcentage"?"pourcentage":"points",
            turns:duration(caster,code),cumulable:s.cumulable!==false};
        }else if(s.effet==="brouillage"){
          // Brouillage mental (Illusion ; Idan, 2026-10-31, chiffres de JC3) : (bonus) points de chance de réussite en moins pour
          // ses sorts, × Volonté du lanceur / Volonté de la cible (de × 0,5 à × 2), comme le Choc psychique.
          const will=clamp(combat.statWithGear(caster,"Volonté")/Math.max(1,combat.statWithGear(target,"Volonté")),0.5,2);
          result.mindFog={code:s.code,base:bonus(caster,code),will,malus:Math.round(bonus(caster,code)*will),turns:duration(caster,code)};
        }else if(s.effet==="nuee"){
          // Nuée d'insectes (Invocation ; Idan, 2026-10-31, chiffres de JC3) : une zone qui dure ; les ennemis qui s'y trouvent
          // perdent (bonus) % de Perception et de Dextérité, donc de Précision.
          result.zone={center:{q:target.q,r:target.r},radius:zoneRadius(caster,code)};
          result.swarm={code:s.code,stats:targetStats(code),value:-bonus(caster,code),unit:"pourcentage",turns:duration(caster,code)};
        }else if(s.effet==="bannissement"){
          // Bannissement (Invocation) : l'écran de combat renvoie l'invocation et tout son groupe.
          result.banish=true;
        }else if(s.effet==="double"){
          // Création de double (Illusion) : un leurre sur la case visée ; l'écran de combat le crée.
          result.decoy={cell:{q:target.q,r:target.r}};
        }else if(s.effet==="sommeil"){
          // Sommeil (Illusion) : la même résistance que la Paralysie, avec la Volonté et sans élément.
          const resist=paralysisResistance(caster,target,code),resistRoll=d100();
          result.sleep={resist,roll:resistRoll,resisted:resistRoll<=resist,turns:Math.max(1,duration(caster,code))};
        }else if(s.effet==="crachat_venin"){
          // Le tir de venin garde la Puissance et la Maîtrise du lanceur.
          result.effect={code:s.code,element:s.element,factor:effectFactor(caster,code),mastery:mastery(caster,code),
            min:num(s.tir_portee_min,1),max:num(s.tir_portee_max,1),turns:duration(caster,code)};
        }else if(s.effet==="peur"){
          result.zone={center:{q:target.q,r:target.r},radius:zoneRadius(caster,code)};
          result.fear={mastery:mastery(caster,code)};
        }else if(s.effet==="bonus_zone"||s.effet==="frenesie"){
          if(s.effet==="bonus_zone") result.zone={center:{q:target.q,r:target.r},radius:zoneRadius(caster,code)};
          result.effect={code:s.code,stats:targetStats(code),value:bonus(caster,code),unit:s.bonus_unite==="pourcentage"?"pourcentage":"points",
            turns:duration(caster,code)};
        }else if(s.effet==="protection_projectiles"){
          result.effect={code:s.code,chance:bonus(caster,code),turns:duration(caster,code)};
        }else if(s.effet==="deplacement_force"){
          result.move={kind:"case",destination:{q:options.destination.q,r:options.destination.r}};
        }else if(s.effet==="brouillard"){
          result.fog={cells:wallCells(caster,target,zoneLength(caster,code)),turns:duration(caster,code)};
        }else if(s.effet==="resurrection"||s.effet==="invocation"){
          result.summon={code:s.code,creature:s.creature||null,upkeep:upkeepCost(caster,code),
            share:s.effet==="resurrection"?zombieShare(caster,code):100,cell:{q:target.q,r:target.r},
            ...(s.effet==="invocation"?{count:summonCount(caster,code)}:{})};
        }else if(s.effet==="bourbier"){
          result.mire={q:target.q,r:target.r,turns:duration(caster,code)};
        }else if(s.effet==="transposition"){
          result.swap={from:{q:caster.q,r:caster.r},to:{q:target.q,r:target.r}};
        }else if(s.effet==="drain_de_vie"){
          result.effect={code:s.code,percent:bonus(caster,code),turns:duration(caster,code)};
        }else if(s.effet==="fletrissement"){
          result.effect={code:s.code,turns:duration(caster,code)};
        }else if(s.effet==="lancer_arme"){
          result.throw=combat.weaponThrow(caster,target,{mastery:mastery(caster,code),critical:result.critical});
        }else if(s.effet==="onde_de_choc"){
          // Onde de choc (Télékinésie ; Idan, 2026-10-31, chiffres de JC3) : tous ceux du cercle, alliés compris, repoussés
          // dans l'axe lanceur → eux, les plus loin d'abord (pour ne pas se gêner).
          const steps=forceSteps(caster,code);
          result.waves=unitsInZone({q:caster.q,r:caster.r},zoneRadius(caster,code),options.units||[]).filter(u=>u!==caster)
            .sort((a,b)=>combat.axialDistance(caster,b)-combat.axialDistance(caster,a))
            .map(u=>({unit:u,cells:pushCells(caster,u,steps)}));
        }else if(s.effet==="bond"){
          result.leap={from:{q:caster.q,r:caster.r},to:{q:target.q,r:target.r},distance:combat.axialDistance(caster,target)};
        }else if(s.effet==="prison_de_glace"){
          // Prison de glace (Eau ; Idan, 2026-10-31, chiffres de JC3) : la même résistance que la Paralysie, avec le froid.
          const resist=paralysisResistance(caster,target,code),resistRoll=d100();
          result.frozen={resist,roll:resistRoll,resisted:resistRoll<=resist,turns:Math.max(1,duration(caster,code)),
            factor:num(s.degats_subis_facteur,0.5)};
        }else if(s.effet==="blizzard"){
          result.zone={center:{q:target.q,r:target.r},radius:zoneRadius(caster,code)};
          result.blizzard={code:s.code,element:s.element,factor:effectFactor(caster,code),critical:false,turns:Math.max(1,duration(caster,code)),
            movement:num(s.deplacement_facteur,0.5)};
        }else if(s.effet==="paralysie"){
          const resist=paralysisResistance(caster,target,code),resistRoll=d100();
          result.paralysis={resist,roll:resistRoll,resisted:resistRoll<=resist,turns:Math.max(1,duration(caster,code))};
        }else if(s.effet==="tempete"){
          result.zone={center:{q:target.q,r:target.r},radius:zoneRadius(caster,code)};
          result.storm={code:s.code,element:s.element,factor:effectFactor(caster,code),critical:result.critical,turns:Math.max(1,duration(caster,code))};
        }else if(s.effet==="malus_caracteristiques"){
          // Gel : le malus baisse avec la protection de la cible contre l'élément (résistance, armure, Armure de feu).
          const raw=bonus(caster,code),hit=combat.elementalDamage(target,s.element,raw);
          result.effect={code:s.code,element:s.element,stats:targetStats(code),raw,malus:hit.damage,protection:hit.applied,
            turns:duration(caster,code),cumulable:s.cumulable!==false};
        }else if(count){
          result.dice=result.critical?count*sides:rollDice(code);
          result.amount=effectAmount(caster,code,result.dice);
        }
        if(s.effet==="soin_de_zone") result.zone={center:{q:target.q,r:target.r},radius:zoneRadius(caster,code)};
        // Lumière sacrée : la Restitution en cercle ; l'écran de combat ne frappe que les morts-vivants.
        if(s.effet==="degats_sans_resistance"&&s.cible==="case") result.zone={center:{q:target.q,r:target.r},radius:zoneRadius(caster,code)};
        // Lien de vie : le lanceur perd au plus amount PV (en gardant 1 PV) ; l'allié en reçoit × transfert_facteur.
        if(s.effet==="transfert_pv") result.transfer={factor:num(s.transfert_facteur,1.5)};
        // Pacte de sang : amount = le mana regagné au plus ; transfert_facteur PV par point de mana.
        if(s.effet==="pacte_de_sang") result.pact=bloodPact(caster,result.amount,num(s.transfert_facteur,2));
        // Siphon d'âme : amount = le mana pris à la cible au plus ; le lanceur le récupère sans dépasser sa réserve.
        if(s.effet==="siphon_mana") result.siphon=soulSiphon(caster,target,result.amount);
        if(s.effet==="degats_zone"&&s.zone_forme==="cone"){
          const length=zoneLength(caster,code);
          result.zone={shape:"cone",length,cells:coneCells(caster,target,length)};
        }else if(s.effet==="degats_zone"&&s.zone_forme==="ligne"){
          const length=zoneLength(caster,code);
          result.zone={shape:"ligne",length,cells:lineCells(caster,target,length)};
        }else if(s.effet==="degats_zone"){
          const radius=zoneRadius(caster,code),aimed={q:target.q,r:target.r};
          let center=aimed,precision=null;
          if(s.deviation_max){
            const distance=combat.axialDistance(caster,aimed),p=precisionChance(caster,code,distance),precisionRoll=d100();
            precision={p,roll:precisionRoll,ok:precisionRoll<=p};
            if(!precision.ok){
              const steps=die(num(s.deviation_max,1)),dir=HEX_DIRECTIONS[die(6)-1];
              center={q:aimed.q+dir.q*steps,r:aimed.r+dir.r*steps};
              precision.deviation=steps;
            }
          }
          result.zone={center,aimed,radius,minDistance:num(s.zone_anneau_min,0),degressive:Boolean(s.zone_degressive),precision};
        }
        if(s.toucher==="distance") resolveSpellHit(caster,target,code,result,options.units||[]);
        if(s.effet==="degats_rebonds") result.chain=chainTargets(caster,target,code,options.units||[]);
        if(s.effet==="degats_paire") result.second=options.second;
        // Dégâts physiques : l'écran de combat les fait passer par l'armure (combat.spellPhysicalHit).
        if(s.degats_type==="psychique") result.psychic=true;
        else if(s.degats_type==="necrotique") result.necrotic=true;
        else if(s.degats_type) result.physical={type:s.degats_type,power:num(s.puissance,0),mastery:mastery(caster,code)};
        // Attraction, Projection : les cases à parcourir, et le choc si un obstacle arrête la cible.
        if(s.deplacement){
          const steps=forceSteps(caster,code),choc=num(s.choc_nb_des,0);
          let chocDice=0;
          for(let i=0;i<choc;i++) chocDice+=die(num(s.choc_de,1));
          result.move={kind:s.deplacement,steps,cells:s.deplacement==="attire"?pullCells(caster,target,steps):pushCells(caster,target,steps),
            chocAmount:choc?Math.ceil(num(s.effet_base,10)*chocDice*effectFactor(caster,code)-1e-9):0};
        }
        if(s.effet==="purge_poison") result.purge=true;
        // Écrasement : la cible ne peut plus se déplacer pendant ses prochaines activations.
        if(num(s.immobilise,0)>0) result.immobilise=num(s.immobilise,0);
        if(s.effet==="delivrance") result.delivrance=afflictions(target,code);
      }else if(roll>=FUMBLE_THRESHOLD){
        const fumbleRoll=d100();
        Object.assign(result,{fumbleRoll,fumble:fumbleRoll>combat.statWithGear(caster,"Chance")});
        if(result.fumble) result.selfDamage=effectAmount(caster,code,count);
      }
      return result;
    }

    // Crachat de venin : unit.venom = l'effet posé par le sort. Action rapide, un ennemi à portée de sarbacane, en ligne de vue.
    function canSpit(unit,target,{lineOfSight=true}={}){
      const fx=unit?.venom;
      if(!fx) return {ok:false,reason:"Pas de venin."};
      if(unit.alive===false) return {ok:false,reason:"Hors combat."};
      if(unit.quickAvailable===false) return {ok:false,reason:"L'action rapide est déjà utilisée."};
      if(!target||target.alive===false||target===unit||target.team===unit.team) return {ok:false,reason:"Le venin vise un ennemi."};
      if(target.camouflaged) return {ok:false,reason:"Cible invisible : elle est camouflée."};
      const distance=combat.axialDistance(unit,target);
      if(distance<fx.min||distance>fx.max) return {ok:false,reason:"Hors de portée ("+distance+" cases, de "+fx.min+" à "+fx.max+")."};
      if(!lineOfSight) return {ok:false,reason:"Pas de ligne de vue."};
      return {ok:true,distance};
    }
    function spitChance(unit,target){
      const fx=unit.venom;
      return hitChance(unit,target,fx.code,{mastery:fx.mastery,reach:fx.max});
    }
    // Le tir : toucher comme un trait ; 1D4 de poison × la Puissance du lanceur ; s'il blesse, l'écran de combat empoisonne
    // la cible (poison : turns tours, le minimum du venin à chaque fois).
    function spit(unit,target,options={}){
      const check=canSpit(unit,target,options);
      if(!check.ok) return check;
      const fx=unit.venom,s=spell(fx.code),shield=deflection(target);
      if(shield?.deflected) return {ok:true,code:fx.code,element:fx.element,distance:check.distance,deflected:true,pDeflect:shield.p,deflectRoll:shield.roll,hit:false,dice:0,amount:0};
      const pHit=spitChance(unit,target),hitRoll=d100();
      const result={ok:true,code:fx.code,element:fx.element,distance:check.distance,pHit,hitRoll,hit:hitRoll<=pHit,dice:0,amount:0};
      if(result.hit){
        result.dice=rollDice(fx.code);
        result.amount=Math.ceil(num(s?.effet_base,10)*result.dice*fx.factor-1e-9);
        result.poison={turns:combat.POISON?.turns??3,amount:Math.ceil(num(s?.effet_base,10)*dice(fx.code).count*fx.factor-1e-9)};
      }
      return result;
    }

    // Régénération : un tour de soin, au début de l'activation de la cible ; dé au maximum si le lancer était critique.
    // Paralysie (Foudre ; Idan, 2026-10-31, chiffres de JC3) : la cible résiste si D100 ≤ sa Constitution + sa protection
    // contre la foudre (armure comprise : le métal la conduit) − 0,5 × la Maîtrise du lanceur, borné de 5 à 95 %.
    // Prison de glace (Eau) : la même, avec la protection contre le froid (l'élément du sort).
    // Sommeil (Illusion) : sa Volonté − 0,5 × la Maîtrise, sans protection.
    function paralysisResistance(caster,target,code){
      const s=spell(code);
      const stat=combat.statWithGear(target,s?.resistance_caracteristique||"Constitution");
      // Sommeil : sans élément, la caractéristique seule.
      const protection=s?.element&&combat.elementalProtection?combat.elementalProtection(target,s.element).applied:0;
      return clamp(stat+protection-num(s?.resistance_maitrise_facteur,0.5)*mastery(caster,code),5,95);
    }
    // Lien de vie (Vie ; Idan, 2026-10-31, chiffres de JC3) : le lanceur ne donne que ce qu'il faut pour remonter l'allié
    // (ses PV manquants / facteur), au plus le résultat des dés, et garde toujours 1 PV ; l'allié reçoit le don × facteur.
    function lifeLink(caster,target,amount,factor=1.5){
      const missing=Math.max(0,num(target.pvMax,0)-num(target.hp,0)),room=Math.max(0,num(caster.hp,0)-1);
      const given=Math.max(0,Math.min(amount,Math.ceil(missing/factor),room));
      return {given,received:Math.min(missing,Math.ceil(given*factor-1e-9))};
    }
    // Pacte de sang (Nécromancie ; Idan, 2026-10-31, chiffres de JC3) : il ne prend que le mana qui manque (au plus amount),
    // à factor PV le point, et garde toujours 1 PV.
    function bloodPact(caster,amount,factor=2){
      const missing=Math.max(0,manaMax(caster)-currentMana(caster)),room=Math.max(0,num(caster.hp,0)-1);
      const mana=Math.max(0,Math.min(Math.ceil(missing-1e-9),amount,Math.floor(room/factor)));
      return {mana,hp:Math.ceil(mana*factor-1e-9),factor};
    }
    // Siphon d'âme (Nécromancie) : la cible perd jusqu'à amount mana ; le lanceur récupère ce qui est pris, sans dépasser sa
    // réserve (le reste est perdu).
    function soulSiphon(caster,target,amount){
      const taken=Math.max(0,Math.min(amount,currentMana(target)));
      const gained=Math.max(0,Math.min(taken,manaMax(caster)-currentMana(caster)));
      return {taken,gained};
    }
    // Tempête (Foudre) : une frappe = les dés du sort × le facteur figé au lancer ; le nombre de frappes par tour : 1D3.
    function stormStrike(effect){
      const {count,sides}=dice(effect.code);
      const total=effect.critical?count*sides:rollDice(effect.code);
      const s=spell(effect.code);
      return {amount:Math.ceil(num(s?.effet_base,10)*total*effect.factor-1e-9),dice:total};
    }
    function stormStrikes(effect){ return die(num(spell(effect.code)?.frappes_de,3)); }

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
      bonus,
      hitChance,
      precisionChance,
      zoneFactor,
      weaponStrike,
      paralysisResistance,
      bloodPact,
      soulSiphon,
      afflictions,
      lifeLink,
      stormStrike,
      stormStrikes,
      canSpit,
      spitChance,
      spit,
      schoolSpells,
      knownSpell,
      knownSpells,
      spellLevel,
      schoolLevel,
      mastery,
      range,
      duration,
      zoneRadius,
      zoneLength,
      targetStats,
      lineCells,
      coneCells,
      wallCells,
      unitsInCells,
      chainTargets,
      forceSteps,
      willFactor,
      upkeepCost,
      holdChance,
      rollHold,
      zombieShare,
      summonCount,
      isCorpse,
      pushCells,
      pullCells,
      canCastPair,
      dice,
      effectFactor,
      effectAmount,
      effectRange,
      manaCost,
      manaMax,
      currentMana,
      dailyRecharge,
      rechargeMana,
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
