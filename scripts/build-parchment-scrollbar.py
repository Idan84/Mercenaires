# La barre de défilement du parchemin (Idan, 2026-11-25 : « on a une scrollbar pour parchemin qu'on peut réutiliser ») :
# le cadre du bouton d'Idan tourné à la verticale, velours brun (assets/creation/barre-defilement-*.webp), les flèches et le
# curseur du kit doré (assets/kit/fleches, assets/creation/fleche-defilement-*-survol.webp, curseur-defilement-*.webp, ces
# derniers faits par scripts/build-scrollbar-thumb.js), le creusé et l'ombre portée sur le parchemin.
# Usage : python3 scripts/build-parchment-scrollbar.py prototype-web/styles.css
# Le script remplace, dans la feuille, le bloc qui va de « .conv .talk-log::-webkit-scrollbar{width: » jusqu'à la règle
# « ...-button:vertical:start:increment » (exclue). Pour un autre parchemin, changer le sélecteur dans `rules`.
# Lumière d'ambiance, à la bougie, venue d'en haut à gauche : douce, peu de contraste (Idan, 2026-11-25).
import sys
RP,TP,BP=14,16,18;   # recul à droite, marge en haut, marge en bas : même écart avec les ornements du parchemin en haut et en bas
W=45+RP; B0,B1=3,36; CW=2; C0,C1=B0+CW,B1-CW; M=(B0+B1)/2; S0,S1=M-5.5,M+5.5; BH=52; TH=64
SDX,SDY,SBLUR,SOP=2,3,3,.38       # ombre portée de la barre sur le parchemin (douce : lumière d'ambiance)
def svg(body):
    body=" ".join(body.split())
    return 'url("data:image/svg+xml,'+body.replace('%','%25').replace('<','%3C').replace('>','%3E').replace('#','%23').replace('"',"'")+'")'
# Le fin contour bronze et or (réutilisable ailleurs) : clair du côté de la lumière (gauche, haut), bronze sombre de l'autre.
CONTOUR=(("0","#b48e4a"),("1","#9c7639"))
DEFS=f'''<linearGradient id="ct" gradientUnits="userSpaceOnUse" x1="{B0}" x2="{B1}">{"".join(f'<stop offset="{o}" stop-color="{c}"/>' for o,c in CONTOUR)}</linearGradient>
<linearGradient id="ch" gradientUnits="userSpaceOnUse" x1="{C0}" x2="{C1}"><stop offset="0" stop-color="#140d08"/><stop offset=".2" stop-color="#21170e"/><stop offset=".55" stop-color="#2b1e14"/><stop offset=".85" stop-color="#291c12"/><stop offset="1" stop-color="#2f2117"/></linearGradient>
<linearGradient id="rim" gradientUnits="userSpaceOnUse" x1="{S0-1}" x2="{S1+1}"><stop offset="0" stop-color="#1e140c"/><stop offset="1" stop-color="#4a3727"/></linearGradient>
<linearGradient id="sl" gradientUnits="userSpaceOnUse" x1="{S0}" x2="{S1}"><stop offset="0" stop-color="#120c07"/><stop offset=".25" stop-color="#1a110a"/><stop offset=".5" stop-color="#21170e"/><stop offset=".75" stop-color="#281b12"/><stop offset="1" stop-color="#35271a"/></linearGradient>
<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<filter id="sh" filterUnits="userSpaceOnUse" x="-10" y="-40" width="70" height="200"><feGaussianBlur stdDeviation="{SBLUR}"/></filter>
<filter id="tx" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.2 .7" numOctaves="2" seed="5" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .16  0 0 0 0 .05  .9 0 0 0 -.42"/><feComposite operator="in" in2="SourceAlpha"/></filter>
<filter id="wear" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".5 .09" numOctaves="3" seed="11" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .2  0 0 0 0 .13  0 0 0 0 .04  1.6 0 0 0 -.62"/><feComposite operator="in" in2="SourceAlpha"/></filter>
<filter id="h" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".7 .3" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .95  0 0 0 0 .82  0 0 0 0 .6  .9 0 0 0 -.5"/></filter>'''
IMG=lambda k:f'url("assets/creation/barre-defilement-{k}.webp")'
CH=7.8   # pan coupé des bouts du cadre (le bouton d'Idan tourné : 40 px sur 169)
def shadow(kind):
    # ombre portée de la barre sur le parchemin (douce, vers le bas à droite)
    if kind=="up":
        H=BH+TP; y0=TP; pts=f"{B0},{H+20} {B0},{y0+CH} {B0+CH},{y0} {B1-CH},{y0} {B1},{y0+CH} {B1},{H+20}"
    elif kind=="down":
        H=BH+BP; pts=f"{B0},-20 {B0},{BH-CH} {B0+CH},{BH} {B1-CH},{BH} {B1},{BH-CH} {B1},-20"
    else:
        H=TH; pts=f"{B0},-30 {B1},-30 {B1},{TH+30} {B0},{TH+30}"
    return svg(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs><filter id="sh" filterUnits="userSpaceOnUse" x="-10" y="-40" width="70" height="200"><feGaussianBlur stdDeviation="{SBLUR}"/></filter></defs>'
               f'<g transform="translate({SDX} {SDY})"><polygon points="{pts}" fill="#3a2410" opacity="{SOP}" filter="url(#sh)"/></g></svg>')
def button(up,hover=False):
    # Par-dessus le cadre du bouton d'Idan : le bout du creux et un halo sous la flèche (lumière d'ambiance, en haut à gauche).
    m=M; r=(S1-S0)/2; H=BH+(TP if up else BP); y0=TP if up else 0
    if up:
        slot=(f'<rect x="{S0}" y="{y0+34}" width="{S1-S0}" height="{H-y0-34+6}" rx="{r}" fill="url(#sl)"/>'
              f'<rect x="{S0-.5}" y="{y0+33.5}" width="{S1-S0+1}" height="{H-y0-34+8}" rx="{r+.5}" fill="none" stroke="url(#rim)" stroke-width="1"/>'
              f'<ellipse cx="{m}" cy="{y0+36.6}" rx="{r-1}" ry="2.4" fill="#000" opacity=".25"/>')
        halo=f'<ellipse cx="{m+1}" cy="{y0+20}" rx="11" ry="9" fill="url(#halo)"/>'
    else:
        slot=(f'<rect x="{S0}" y="-6" width="{S1-S0}" height="24" rx="{r}" fill="url(#sl)"/>'
              f'<rect x="{S0-.5}" y="-8" width="{S1-S0+1}" height="26.5" rx="{r+.5}" fill="none" stroke="url(#rim)" stroke-width="1"/>'
              f'<path d="M{S0+.9},{18-r} A{r-.9},{r-.9} 0 0 0 {S1-.9},{18-r}" fill="none" stroke="#5e4630" stroke-width="1" opacity=".6"/>')
        halo=f'<ellipse cx="{m+1}" cy="32" rx="11" ry="9" fill="url(#halo)"/>'
    body=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs>{DEFS}</defs>'
          f'{halo}{slot}</svg>')
    return svg(body)
def track():
    body=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {TH}" width="{W}" height="{TH}"><defs>{DEFS}</defs>'
          f'<rect x="{S0}" y="0" width="{S1-S0}" height="{TH}" fill="url(#sl)"/><rect x="{S0}" y="0" width="{S1-S0}" height="{TH}" filter="url(#h)" opacity=".08"/>'
          f'<rect x="{S0-1}" y="0" width="1" height="{TH}" fill="#1e140c" opacity=".6"/><rect x="{S1}" y="0" width="1" height="{TH}" fill="#4a3727" opacity=".8"/></svg>')
    return svg(body)
# Les flèches : les pyramides dorées du kit d'Idan (assets/kit/fleches, Idan, 2026-11-25 : « intégrer les petites flèches
# dorées en boutons de la scroll bar ») ; au survol, la même, éclaircie (assets/creation/fleche-defilement-*-survol.webp).
AW=19                                   # largeur de la flèche
UY,DY=27.8,25.5                         # haut de la flèche dans le bouton du haut / du bas (même centre que l'ancienne)
def KIT(k,hover): return f'url("assets/creation/fleche-defilement-{k}-survol.webp")' if hover else f'url("assets/kit/fleches/{k}.webp")'
def up_bg(hover=False):
    return f"{KIT('haut',hover)} {M-AW/2:g}px {UY:g}px/{AW}px auto no-repeat,{button(True,hover)} 0 0/{W}px {BH+TP}px no-repeat,{IMG('haut')} {B0}px {TP}px/{B1-B0}px {BH}px no-repeat,{shadow('up')} 0 0/{W}px {BH+TP}px no-repeat"
# La pyramide du bas du kit est plus plate que celle du haut : étirée de 10 % en hauteur pour faire la paire (Idan,
# 2026-11-25 : « Étire la flèche du bas de 10 % »), autour du même centre.
DH0=AW*151/223; DH=round(DH0*1.1,2); DY2=round(DY+DH0/2-DH/2,2)
def down_bg(hover=False):
    return f"{KIT('bas',hover)} {M-AW/2:g}px {DY2:g}px/{AW}px {DH:g}px no-repeat,{button(False,hover)} 0 0/{W}px {BH+BP}px no-repeat,{IMG('bas')} {B0}px 0/{B1-B0}px {BH}px no-repeat,{shadow('down')} 0 0/{W}px {BH+BP}px no-repeat"
def track_bg():
    # le milieu du cadre, ajusté pour se répéter un nombre entier de fois : il retombe juste sur les deux bouts
    return f"{track()} 0 0/{W}px {TH}px repeat-y,{IMG('milieu')} {B0}px 0/{B1-B0}px 84px no-repeat round,{shadow('track')} 0 0/{W}px {TH}px repeat-y"
# Le curseur : une tige taillée dans la barre du kit, entre deux embouts en pointe (Idan, 2026-11-25 : « On part sur le A. On
# grossit un peu », « un bon raccord sur métal, c'est vérifié à gauche, à droite et au centre la continuité de l'ombrage ») :
# la barre est étirée à l'épaisseur des embouts et sa lumière recalée ligne par ligne sur leur bout de tige ; la coupe des
# embouts est fondue sur la tige (assets/creation/curseur-defilement-haut|milieu|bas.webp, et leur version éclaircie au survol).
BW=13; KK=BW/61                         # épaisseur de la tige ; échelle (la tige des embouts fait 61 px de haut, sur 102)
TW=22                                   # largeur du curseur (le collier des embouts fait 19 px)
CW,HH,HB=102*KK,101*KK,103*KK           # largeur des images, hauteur des embouts du haut et du bas
MT,MB=(101-22)*KK,(103-22)*KK           # la tige commence sous le collier du haut et finit sous celui du bas
def kitthumb(hover=False):
    s="-survol" if hover else ""
    u=lambda n:f'url("assets/creation/curseur-defilement-{n}{s}.webp")'
    return (f"{u('haut')} center top/{CW:.2f}px {HH:.2f}px no-repeat padding-box,"
            f"{u('bas')} center bottom/{CW:.2f}px {HB:.2f}px no-repeat padding-box,"
            f"{u('milieu')} center {MT:.2f}px/{CW:.2f}px calc(100% - {MT+MB:.2f}px) no-repeat padding-box")
mask=(".conv .talk-log{-webkit-mask-image:linear-gradient(transparent,#000 14px,#000 calc(100% - 14px),transparent),linear-gradient(#000,#000);"
      f"-webkit-mask-size:calc(100% - {W}px) 100%,{W}px 100%;-webkit-mask-position:left top,right top;-webkit-mask-repeat:no-repeat;"
      "mask-image:linear-gradient(transparent,#000 14px,#000 calc(100% - 14px),transparent),linear-gradient(#000,#000);"
      f"mask-size:calc(100% - {W}px) 100%,{W}px 100%;mask-position:left top,right top;mask-repeat:no-repeat}}")
rules=[
f".conv .talk-log::-webkit-scrollbar{{width:{W}px;background:transparent}}",
"/* Le fondu du haut et du bas (mask) épargne la barre et ses flèches (Idan, 2026-11-25 : « on l'élargit et il faut faire des",
"   flèches en haut et en bas »). */",
mask,
f".conv .talk-log::-webkit-scrollbar-track{{background:{track_bg()}}}",
f".conv .talk-log::-webkit-scrollbar-thumb{{min-height:60px;border:solid transparent;border-width:4px {W-(M-TW/2)-TW:g}px 4px {M-TW/2:g}px;background:{kitthumb()}}}",
f".conv .talk-log::-webkit-scrollbar-thumb:hover{{background:{kitthumb(True)}}}",
f".conv .talk-log::-webkit-scrollbar-button:single-button{{display:block;width:{W}px;height:{BH+TP}px;background:{up_bg()}}}",
f".conv .talk-log::-webkit-scrollbar-button:single-button:hover{{background:{up_bg(True)}}}",
f".conv .talk-log::-webkit-scrollbar-button:single-button:vertical:increment{{height:{BH+BP}px;background:{down_bg()}}}",
f".conv .talk-log::-webkit-scrollbar-button:single-button:vertical:increment:hover{{background:{down_bg(True)}}}",
]
p=sys.argv[1]; lines=open(p,encoding="utf8").read().split("\n")
a=next(i for i,l in enumerate(lines) if l.startswith(".conv .talk-log::-webkit-scrollbar{width:"))
b=next(i for i,l in enumerate(lines) if l.startswith(".conv .talk-log::-webkit-scrollbar-button:vertical:start:increment"))
lines[a:b]=rules
open(p,"w",encoding="utf8").write("\n".join(lines))
