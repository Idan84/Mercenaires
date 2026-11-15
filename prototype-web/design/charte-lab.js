"use strict";

// Design Lab — onglet Charte (Idan, 2026-11-15 : « est-ce qu'il faut pas intégrer cette partie charte avec le design
// lab ? »). La charte graphique du jeu (dossier charte/ du dépôt, mis en ligne dans /charte/ par scripts/build-site.sh) :
// ses règles, ses couleurs (dont les trois tons des 32 cultures), ses styles de texte, ses ombres et ses composants.
// Sur le même site que le jeu : les images des aperçus sont celles du jeu. Lecture seule : un changement passe par le
// dépôt (charte/, scripts/build-charte.js).
const CharteLab=(()=>{
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const anchor=key=>"charte-"+key;
  const BASE="/charte/";
  // Les aperçus (charte/components/<Comp>/preview.html, rendus autonomes dans /charte/site/) et leur hauteur.
  const COMPONENTS=[
    {key:"Bouton",title:"Bouton",height:390},
    {key:"Parchemin",title:"Parchemin",height:780},
    {key:"Filets",title:"Filets",height:470},
    {key:"FicheAuSurvol",title:"Fiche au survol",height:820}
  ];
  const SECTIONS=[
    {key:"regles",title:"Règles d'usage"},
    {key:"couleurs",title:"Couleurs"},
    {key:"cultures",title:"Couleurs des cultures"},
    {key:"typo",title:"Styles de texte"},
    {key:"ombres",title:"Ombres"},
    {key:"composants",title:"Composants"}
  ];

  function loadFonts(){
    if(document.getElementById("charte-fonts")) return;
    const link=document.createElement("link");
    link.id="charte-fonts";link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=EB+Garamond:ital,wght@0,500;0,600;0,700;1,500&display=swap";
    document.head.append(link);
  }

  async function compute(){
    loadFonts();
    const get=async(file,as)=>{const r=await fetch(BASE+file,{cache:"no-store"});if(!r.ok) throw new Error("Charte : "+file+" introuvable ("+r.status+")");return r[as]();};
    const [tokens,readme]=await Promise.all([get("tokens.json","json"),get("README.md","text")]);
    return {tokens,readme};
  }

  function section(key,title,body,intro){
    return `<section class="cov-people charte-section" id="${anchor(key)}"><h3>${html(title)}</h3>${intro?`<p class="cov-intro">${intro}</p>`:""}${body}</section>`;
  }

  function colors(tokens){
    return `<div class="charte-swatches">${tokens.map(t=>`<div class="charte-swatch"><span style="background:${html(t.value)}"></span>
      <div><strong>${html(t.name)}</strong><code>${html(t.value)}</code><small>${html(t.usage)}</small></div></div>`).join("")}</div>`;
  }

  function typo(type){
    const rows=type.groups.flatMap(g=>g.styles.map(s=>{
      const family=type.families[s.family||g.family]||"";
      const css=[`font-family:${family}`,`font-size:${s.fontSize}`,`font-weight:${s.fontWeight}`,
        s.lineHeight!=null?`line-height:${s.lineHeight}`:"",s.letterSpacing?`letter-spacing:${s.letterSpacing}`:"",s.fontStyle?`font-style:${s.fontStyle}`:""].filter(Boolean).join(";");
      const spec=[s.fontSize,s.fontWeight,s.lineHeight!=null?"interligne "+s.lineHeight:"",s.letterSpacing?"espacement "+s.letterSpacing:"",s.fontStyle==="italic"?"italique":""].filter(Boolean).join(" · ");
      return `<div class="charte-type"><div class="charte-type-sample" style="${html(css)}">${html(s.sample)}</div>
        <div class="charte-type-meta"><strong>${html(s.name)}</strong><code>${html(spec)}</code><small>${html(s.usage)}</small></div></div>`;
    }));
    return `<div class="charte-types">${rows.join("")}</div>`;
  }

  function shadows(list){
    return `<div class="charte-swatches">${list.map(t=>`<div class="charte-swatch"><span class="charte-shadow" style="box-shadow:${html(t.value)}"></span>
      <div><strong>${html(t.name)}</strong><code>${html(t.value)}</code><small>${html(t.usage)}</small></div></div>`).join("")}</div>`;
  }

  function frame(key,title,height){
    return `<figure class="charte-frame"><figcaption>${html(title)}</figcaption>
      <iframe src="${BASE}site/${key}.html" title="${html(title)}" loading="lazy" style="height:${height}px"></iframe></figure>`;
  }

  function render(data){
    const t=data.tokens,all=t.color.tokens;
    const palette=all.filter(x=>!x.name.startsWith("culture-"));
    const rules=typeof markdown==="function"?markdown(data.readme):`<pre>${html(data.readme)}</pre>`;
    return `<p class="cov-intro">La charte graphique du jeu, rassemblée en un seul endroit : ce qui est validé. Avant de dessiner ou de
        coder un écran, on part d'ici. Pour changer une valeur : la demander à JC3 (elle vient du dépôt, <code>charte/</code>).</p>`
      +section("regles","Règles d'usage",`<div class="doc charte-rules">${rules}</div>`)
      +section("couleurs","Couleurs",colors(palette))
      +section("cultures","Couleurs des cultures",frame("Cultures","Les 32 cultures : picto, texture et ornement du titre, trois tons, phrase d'origine",2100),
        "Trois tons par culture, tirés de la texture de sa barre : le moyen est validé (la phrase d'origine) ; le sombre et le clair sont proposés.")
      +section("typo","Styles de texte",typo(t.type))
      +section("ombres","Ombres",shadows(t.shadow.tokens),"Certaines s'emploient en ombre de texte ou en filtre (voir chaque usage) ; ici, toutes sous un carré.")
      +section("composants","Composants",COMPONENTS.map(c=>frame(c.key,c.title,c.height)).join(""));
  }

  function meta(data){
    const t=data.tokens;
    const cultures=t.color.tokens.filter(x=>x.name.startsWith("culture-")).length/3;
    const styles=t.type.groups.reduce((n,g)=>n+g.styles.length,0);
    return `${t.color.tokens.length-cultures*3} couleurs · ${cultures} cultures × 3 tons · ${styles} styles de texte · ${t.shadow.tokens.length} ombres`;
  }
  function nav(){ return SECTIONS.map(s=>({id:anchor(s.key),label:s.title,sub:"Charte"})); }

  return {compute,render,meta,nav,anchor};
})();
