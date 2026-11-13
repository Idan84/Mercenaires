"use strict";

// Barres du haut par culture du capitaine (Idan, 2026-11-13). Généré par scripts/build-hud-bars.js : ne pas modifier à
// la main. Images : assets/hud/barres/<culture>/{left,center,right}.webp. Mesures en pixels de l'image d'origine :
// h (hauteur commune), left / center / right (largeurs), frameTop / frameBottom (cadre du milieu), bandTop / bandBottom
// (bande sombre où le jeu écrit), bandLeft (début de la bande dans l'embout gauche), bandRight (distance entre la fin de la
// bande et le bord droit de l'embout droit).
const HUD_BARS={
  "caravanes-de-ferrailleurs":{"culture":"Caravanes de ferrailleurs","pack":"Gobelins/gobelins-cavernes-ferrailleurs","h":293,"left":621,"center":901,"right":622,"frameTop":64,"frameBottom":240,"bandTop":84,"bandBottom":216,"bandLeft":183,"bandRight":341},
  "cites-libres":{"culture":"Cités libres","pack":"Humains/cites-libres","h":246,"left":622,"center":903,"right":623,"frameTop":55,"frameBottom":202,"bandTop":71,"bandBottom":182,"bandLeft":323,"bandRight":360},
  "elfes-des-grandes-cites":{"culture":"Elfes des grandes cités","pack":"Elfes/elfes-solaires","h":187,"left":602,"center":874,"right":603,"frameTop":48,"frameBottom":147,"bandTop":58,"bandBottom":136,"bandLeft":131,"bandRight":222},
  "elfes-noirs":{"culture":"Elfes noirs","pack":"Elfes/elfes-noirs","h":298,"left":613,"center":888,"right":614,"frameTop":96,"frameBottom":220,"bandTop":108,"bandBottom":208,"bandLeft":155,"bandRight":304},
  "elfes-sylvains":{"culture":"Elfes sylvains","pack":"Elfes/elfes-sylvains","h":180,"left":614,"center":889,"right":615,"frameTop":30,"frameBottom":162,"bandTop":42,"bandBottom":147,"bandLeft":71,"bandRight":161},
  "gnomes-des-cavernes":{"culture":"Gnomes des cavernes","pack":"Gnomes/gnomes-cavernes","h":215,"left":600,"center":871,"right":601,"frameTop":42,"frameBottom":186,"bandTop":68,"bandBottom":158,"bandLeft":61,"bandRight":108},
  "gnomes-des-forets":{"culture":"Gnomes des forêts","pack":"Gnomes/gnomes-forets","h":229,"left":610,"center":884,"right":611,"frameTop":46,"frameBottom":199,"bandTop":75,"bandBottom":170,"bandLeft":32,"bandRight":115},
  "gnomes-des-villes":{"culture":"Gnomes des villes","pack":"Gnomes/gnomes-villes","h":241,"left":621,"center":901,"right":622,"frameTop":38,"frameBottom":202,"bandTop":67,"bandBottom":172,"bandLeft":187,"bandRight":332},
  "gobelins-des-cavernes":{"culture":"Gobelins des cavernes","pack":"Gobelins/gobelins-cavernes","h":232,"left":619,"center":897,"right":620,"frameTop":51,"frameBottom":184,"bandTop":66,"bandBottom":164,"bandLeft":121,"bandRight":346},
  "gobelins-des-villes":{"culture":"Gobelins des villes","pack":"Gobelins/gobelins-villes","h":227,"left":626,"center":909,"right":627,"frameTop":58,"frameBottom":188,"bandTop":76,"bandBottom":171,"bandLeft":146,"bandRight":201},
  "montagnes-du-nord":{"culture":"Montagnes du Nord","pack":"Humains/nordique","h":206,"left":598,"center":868,"right":599,"frameTop":35,"frameBottom":170,"bandTop":58,"bandBottom":148,"bandLeft":55,"bandRight":128},
  "nains-des-montagnes":{"culture":"Nains des montagnes","pack":"Nains/nains-montagnes","h":191,"left":623,"center":902,"right":624,"frameTop":28,"frameBottom":166,"bandTop":43,"bandBottom":146,"bandLeft":122,"bandRight":293},
  "nains-du-chaos":{"culture":"Nains du chaos","pack":"Nains/nains-chaos","h":257,"left":624,"center":904,"right":625,"frameTop":58,"frameBottom":223,"bandTop":85,"bandBottom":190,"bandLeft":122,"bandRight":227},
  "nains-esclaves":{"culture":"Nains esclaves","pack":"Nains/nains-fer-entrave","h":240,"left":622,"center":901,"right":623,"frameTop":36,"frameBottom":213,"bandTop":58,"bandBottom":186,"bandLeft":134,"bandRight":260},
  "orcs-des-steppes":{"culture":"Orcs des steppes","pack":"Orcs/orcs-steppes","h":246,"left":598,"center":867,"right":599,"frameTop":37,"frameBottom":140,"bandTop":51,"bandBottom":123,"bandLeft":178,"bandRight":321},
  "orcs-des-villes":{"culture":"Orcs des villes","pack":"Orcs/orcs-villes","h":312,"left":620,"center":898,"right":621,"frameTop":116,"frameBottom":292,"bandTop":140,"bandBottom":265,"bandLeft":109,"bandRight":327},
  "orcs-noirs":{"culture":"Orcs noirs","pack":"Orcs/orques-noirs","h":241,"left":605,"center":876,"right":606,"frameTop":39,"frameBottom":204,"bandTop":63,"bandBottom":174,"bandLeft":61,"bandRight":102},
  "royaumes-du-soleil-levant":{"culture":"Royaumes du Soleil Levant","pack":"Humains/soleil-levant","h":244,"left":624,"center":903,"right":625,"frameTop":74,"frameBottom":224,"bandTop":92,"bandBottom":199,"bandLeft":310,"bandRight":264},
  "steppes-desertiques":{"culture":"Steppes désertiques","pack":"Humains/grandes-steppes","h":273,"left":616,"center":893,"right":617,"frameTop":84,"frameBottom":230,"bandTop":113,"bandBottom":203,"bandLeft":453,"bandRight":470},
  "tribus-de-la-jungle":{"culture":"Tribus de la jungle","pack":"Humains/tribus-jungle","h":263,"left":624,"center":903,"right":625,"frameTop":65,"frameBottom":216,"bandTop":83,"bandBottom":193,"bandLeft":238,"bandRight":335}
};
if(typeof module!=="undefined") module.exports={HUD_BARS};
