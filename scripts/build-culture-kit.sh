#!/usr/bin/env bash
# Kits graphiques par culture (Chatty, Idan) : masters assets-src/Kits/<cle>/ → pièces du jeu
# prototype-web/assets/fiche/kits/<cle>/, posées par prototype-web/hover-card-ui.js (le cadre de la fiche au survol) et
# prototype-web/hud-kit-ui.js (les barres du camp) d'après data/reference/culture-kits.json (mesures et réglages).
# Les trois cultures elfes (Idan, 2026-11-18, Elfes.zip) : les Elfes noirs, les Elfes sylvains, les Elfes des grandes cités.
# Le cadre de chacun vient d'un « cadre en une pièce » (Idan : « J'ai fait faire un nouveau cadre en une partie à découper
# nous-même »), découpé ici aux mesures relevées sur le master (assets-src/Kits/<cle>/README.md) : un coin (son angle
# extérieur en haut à gauche de l'image), une cellule de la bande du haut, de la bande de gauche et de la barre du milieu
# (avec des clous, un pas entre deux milieux de clous ; sans clous, un morceau suivi de son reflet, pour ne pas voir de
# joint), la barre du milieu couchée, et la jonction en T (la moitié intérieure de la bande, où son liseré tourne dans la
# barre, bords fondus pour se poser sur la bordure).
# Usage : bash scripts/build-culture-kit.sh   (ImageMagick, potrace, python3)
set -euo pipefail
cd "$(dirname "$0")/.."
ORN=prototype-web/assets/fiche/ornements
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
webp(){ convert "$@"; echo "${@: -1}"; }
net(){ local out=${!#}; convert "${@:1:$#-1}" -strip -define webp:alpha-quality=100 -quality 92 "$out"; echo "$out"; }
# Ce qui dépasse à peine (alpha sous 6 %) ne compte pas dans le cadrage.
rogne(){ local box; box=$(convert "$1" -alpha extract -threshold 6% -format %@ info:); convert "$1" -crop "$box" +repage "$2"; }

# ---- Le cadre en une pièce ----
# cellule <master> <découpe> <reflet : "" | flop (à droite) | flip (dessous)> <sortie>
cellule(){
  local src=$1 crop=$2 reflet=$3 out=$4
  case $reflet in
    flop) convert "$src" -crop "$crop" +repage \( +clone -flop \) +append "$tmp/c.png" ;;
    flip) convert "$src" -crop "$crop" +repage \( +clone -flip \) -append "$tmp/c.png" ;;
    *) convert "$src" -crop "$crop" +repage "$tmp/c.png" ;;
  esac
  net "$tmp/c.png" "$out"
}
# jonction <master> <sortie> <haut de la bande> <épaisseur de la bande> <tige : x gauche> <x droite> <y0 : début dans la
# bande> <L : longueur de tige> <m : marge de chaque côté> <F : fondu des bouts> <Ft : du haut> <Fb : du bas>
jonction(){
  local src=$1 out=$2 top=$3 barre=$4 sl=$5 sr=$6 y0=$7 L=$8 m=$9 F=${10} Ft=${11} Fb=${12}
  local tige=$((sr-sl+1)); local w=$((tige+2*m)) h=$((barre-y0+L))
  convert "$src" -crop ${w}x${h}+$((sl-m))+$((top+y0)) +repage "$tmp/j.png"
  convert -size ${w}x${h} xc: -fx "min(1,min((i+0.5)/$F,(w-i-0.5)/$F))*min(1,(j+0.5)/$Ft)*min(1,(h-j-0.5)/$Fb)" "$tmp/jm.png"
  convert "$tmp/j.png" -alpha extract "$tmp/ja.png"
  convert "$tmp/ja.png" "$tmp/jm.png" -compose multiply -composite "$tmp/ja2.png"
  convert "$tmp/j.png" "$tmp/ja2.png" -alpha off -compose copy_opacity -composite "$tmp/j2.png"
  net "$tmp/j2.png" "$out"
}
# cadre <cle> <coin : taille, x, y de son angle extérieur> <cellules h, v, m : découpe et reflet> <jonction…>
cadre(){
  local key=$1; local src=assets-src/Kits/$key/cadre.png out=prototype-web/assets/fiche/kits/$key
  mkdir -p "$out"
  cellule "$src" "$2" "" "$out/coin.webp"
  cellule "$src" "$3" "$4" "$out/cell-h.webp"
  cellule "$src" "$5" "$6" "$out/cell-v.webp"
  cellule "$src" "$7" "$8" "$out/cell-m.webp"
  convert "$out/cell-m.webp" -transpose "$tmp/mh.png"; net "$tmp/mh.png" "$out/cell-m-h.webp"
  shift 8; jonction "$src" "$out/jonction.webp" "$@"
}
# Elfes noirs : bande du haut y 81–160, de gauche x 32–113, barre du milieu x 726–809 ; clous au pas de 80 (haut) et 74.
cadre elfes-noirs 240x240+32+81 80x80+483+81 "" 82x74+32+446 "" 84x74+726+446 "" 81 80 726 809 56 12 40 18 16 8
# Elfes sylvains : bande du haut y 65–155, de gauche x 56–135, barre du milieu x 725–811 ; sans clous.
cadre elfes-sylvains 280x280+56+65 120x91+300+65 flop 80x120+56+290 flip 87x120+725+300 flip 65 91 725 811 45 40 45 20 18 22
# Elfes des grandes cités : bande du haut y 34–134, de gauche x 32–130, barre du milieu x 721–814 ; sans clous.
cadre elfes-des-grandes-cites 280x280+32+34 150x101+260+34 flop 99x150+32+260 flip 94x150+721+300 flip 34 101 721 814 50 45 50 22 20 25

# ---- Ornements, cuir, ornement du titre, pièces des barres ----
# Elfes noirs : les pièces du premier kit (2026-11-16), validées dans le jeu.
SRC=assets-src/Kits/elfes-noirs; OUT=prototype-web/assets/fiche/kits/elfes-noirs
# Ce qui dépasse à peine (alpha sous 4 %) ne compte pas dans le cadrage.
trimmed(){ convert "$1" -channel A -black-threshold 4% +channel -trim +repage "$2"; }
for piece in coin-orne-riche coin-orne-leger coin-orne-pointes; do
  trimmed "$SRC/$piece.png" "$tmp/$piece.png"; webp "$tmp/$piece.png" -resize 400x400 -quality 90 "$OUT/$piece.webp"
done
trimmed "$SRC/ornement-couronne.png" "$tmp/c.png"; webp "$tmp/c.png" -resize 640x -quality 90 "$OUT/couronne.webp"
trimmed "$SRC/ornement-chaine.png" "$tmp/ch.png"; webp "$tmp/ch.png" -resize 640x -quality 90 "$OUT/chaine.webp"
trimmed "$SRC/ornement-chaine-torsadee.png" "$tmp/t.png"; webp "$tmp/t.png" -resize 120x -quality 90 "$OUT/chaine-torsadee.webp"
# Le cuir violet : une tuile de 640 px.
webp "$SRC/texture.png" -resize 640x640 -quality 85 "$OUT/texture.webp"
# Les barres du camp : le rond central recadré sur son dessin (son trou, où se loge le bouton, en (50,02 % ; 50,80 %) de
# l'image, 23,64 % de sa largeur), le bouton Jour suivant, l'emblème du bout de la barre du haut recadré sur son dessin.
webp "$SRC/rond-central.png" -crop 2724x1446+14+34 +repage -resize 1200x -quality 90 "$OUT/rond-central.webp"
webp "$SRC/bouton-jour-suivant.png" -resize 320x320 -quality 92 "$OUT/bouton-jour-suivant.webp"
webp "$SRC/embleme-fin-de-barre.png" -crop 1309x1109+47+0 +repage -resize 480x -quality 90 "$OUT/embleme-fin-de-barre.webp"
# L'ornement du titre : la pointe de lance au bout de l'ornement d'Idan (le reste, fouet et chaînes, est illisible à
# cette taille), seule forme gardée ; dans la boîte commune des ornements du titre (104 × 24, motif côté titre, à droite,
# noir : le CSS s'en sert comme masque).
convert "$SRC/ornement-titre.png" -crop 2659x712+47+400 +repage -crop 420x330+0+200 +repage -alpha extract -threshold 50% \
  -define connected-components:area-threshold=1800 -define connected-components:mean-color=true -connected-components 8 \
  -threshold 50% -trim +repage -negate "$tmp/pointe.pbm"
potrace -s --turdsize 20 --alphamax 1.0 --opttolerance 0.4 -o "$tmp/pointe.svg" "$tmp/pointe.pbm"
python3 - "$tmp/pointe.svg" "$ORN/pointe-epines.svg" <<'PY'
import re, sys
svg = open(sys.argv[1]).read()
vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
grp = re.sub(r'fill="#[0-9a-fA-F]+"', 'fill="#000"', re.search(r"(<g transform=.*</g>)", svg, re.S).group(1))
vw, vh = (float(v) for v in vb.split()[2:])
h = 24; w = vw * h / vh
open(sys.argv[2], "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 24"><svg x="{104 - w:.2f}" y="0" width="{w:.2f}" height="{h}" viewBox="{vb}">{grp}</svg></svg>\n')
print(sys.argv[2], f"motif {w:.2f} × {h} dans 104 × 24")
PY

# Elfes sylvains et Elfes des grandes cités : ornements recadrés sur leur dessin (alpha dès 6 %), au plus 700 px ; le cuir
# en tuile de 512 px ; l'ornement du titre (une silhouette : le CSS s'en sert comme masque) à 500 px de large ; le rond
# central recadré sur son dessin (1200 px de large), le bouton (320 × 320), l'emblème (480 px de large).
orn(){ rogne "$1" "$tmp/o.png"; webp "$tmp/o.png" -resize 700x700\> -strip -quality 90 "$2"; }
communs(){
  local key=$1; local src=assets-src/Kits/$key out=prototype-web/assets/fiche/kits/$key
  webp "$src/texture.png" -resize 512x512 -strip -quality 85 "$out/texture.webp"
  rogne "$src/ornement-titre.png" "$tmp/t.png"; webp "$tmp/t.png" -resize 500x -strip -quality 90 "$out/titre.webp"
  rogne "$src/rond-central.png" "$tmp/r.png"; webp "$tmp/r.png" -resize 1200x -strip -quality 90 "$out/rond-central.webp"
  rogne "$src/bouton-jour-suivant.png" "$tmp/b.png"
  webp "$tmp/b.png" -resize 320x320 -gravity center -background none -extent 320x320 -strip -quality 90 "$out/bouton-jour-suivant.webp"
  rogne "$src/embleme-fin-de-barre.png" "$tmp/e.png"; webp "$tmp/e.png" -resize 480x -strip -quality 90 "$out/embleme-fin-de-barre.webp"
}
SRC=assets-src/Kits/elfes-sylvains; OUT=prototype-web/assets/fiche/kits/elfes-sylvains
communs elfes-sylvains
orn "$SRC/coin-orne-riche.png" "$OUT/coin-orne-riche.webp"
# Deux coins dans la même image : le bois (à gauche, x 0 à 853) et la branche (à droite, x 913 à 1774).
convert "$SRC/coins-orne-bois-branche.png" -crop 854x887+0+0 +repage "$tmp/bois.png"; orn "$tmp/bois.png" "$OUT/coin-orne-courbe.webp"
convert "$SRC/coins-orne-bois-branche.png" -crop 862x887+913+0 +repage "$tmp/branche.png"; orn "$tmp/branche.png" "$OUT/coin-orne-leger.webp"
orn "$SRC/ornement-arbre.png" "$OUT/pose-arbre.webp"
orn "$SRC/ornement-dryade-couchee.png" "$OUT/pose-dryade.webp"
orn "$SRC/ornement-dragon-couche.png" "$OUT/pose-dragon.webp"
orn "$SRC/ornement-guirlande.png" "$OUT/suspendu.webp"
orn "$SRC/ornement-dryade-debout.png" "$OUT/allonge.webp"
SRC=assets-src/Kits/elfes-des-grandes-cites; OUT=prototype-web/assets/fiche/kits/elfes-des-grandes-cites
communs elfes-des-grandes-cites
for piece in coin-orne-riche coin-orne-leger coin-orne-courbe; do orn "$SRC/$piece.png" "$OUT/$piece.webp"; done
orn "$SRC/ornement-arc.png" "$OUT/pose-arc.webp"
orn "$SRC/ornement-drape.png" "$OUT/suspendu.webp"
orn "$SRC/ornement-treillis.png" "$OUT/allonge.webp"
