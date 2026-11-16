#!/usr/bin/env python3
# Les ornements du titre de la fiche au survol, un par culture (Idan, 2026-11-15 : « je voudrais qu'on les fasse court,
# mais 1 par culture en monochrome… plus fin et plus petit (et correctement alignés). Regarde l'exemple de Chatty » ; puis
# ses retours culture par culture, et « pour les symboles, tu peux prendre aussi des trucs simples en unicode ou en libre
# de droits »).
#
# Deux sortes de motifs :
# - PLANCHES : découpés dans les planches d'ornements d'Idan (Ornements.zip, sur le serveur : media/Ornements.zip), noir
#   sur blanc. On découpe la zone, on la seuille, on enlève au besoin ce qui dépasse d'un motif voisin, on la tourne ou la
#   retourne, puis potrace en fait un tracé.
# - DESSINS : des formes simples dessinées ici (flocon, fleur, triangle, croissant, marteau…), sans droits.
#
# L'ornement de gauche, dans une boîte de 104 × 24 (noir ; le CSS s'en sert comme masque et le colore) : le motif côté
# titre, à droite ; s'il en a un, un filet effilé (fin dehors, épais côté motif) qui y entre. À droite du titre, le CSS met
# le même en miroir. La ligne médiane (y = 12) est posée sur le milieu des minuscules du titre.
#
# Usage : python3 scripts/build-title-ornaments.py <dossier des planches dézippées>
# Écrit prototype-web/assets/fiche/ornements/<motif>.svg. Outils : ImageMagick (convert), potrace.
import math, os, re, subprocess, sys
from collections import deque

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prototype-web", "assets", "fiche", "ornements")
W, H, CY = 104, 24, 12
LEVE = 0  # un décalage commun aux motifs sans filet (aucun : tous sur la même ligne, réglée dans le CSS)

# motif : (planche, x, y, largeur, hauteur, nettoyage), réglages. Nettoyage : True garde la plus grande forme et ce qui ne
# touche pas le bord de la découpe ; "seul" ne garde que la plus grande forme. Réglages : filet (False : sans ; sinon
# l'abscisse où il commence), taille (part de la boîte 46 × 22), ancre (la hauteur du motif, de 0 en haut à 1 en bas, posée
# sur la ligne médiane), dy (décalage vertical), rot (degrés, sens horaire), miroir_h, miroir_v.
PLANCHES = {
 "rinceau":        (("vector-silhouette-ornament-divid", 20, 280, 480, 205, False), dict(filet=False, taille=.82, miroir_v=True)),
 # « croissant » (tête de loup dans un croissant) : l'ornement des Elfes noirs jusqu'au 2026-11-16, remplacé par la pointe de
 # lance de leur kit graphique (scripts/build-culture-kit.sh).
 "bougie":         (("candle-with-flaming-skull-silhou", 150, 20, 470, 1330, False), dict(filet=False, taille=.8, rot=90)),
 "cle-ailee":      (("winged-key-wrapped-in-chains", 0, 0, 768, 1376, False), dict(filet=False, rot=90)),
 "cadenas":        (("chain-link-strand-with-padlock", 560, 250, 220, 260, True), dict(filet=False, taille=.8)),
 "tentacule-sabre": (("octopus-tentacle-holding-cutlass", 300, 215, 460, 585, True), dict(filet=False, rot=90)),
 "couronne-croix": (("toad-wearing-crown-silhouette", 380, 195, 240, 190, True), dict(taille=.72, ancre=.64)),
 "totem":          (("vertical-totem-pole-silhouette", 25, 35, 720, 1305, False), dict(filet=False, taille=.55, rot=90)),
 "corbeau":        (("flying-raven-vector-ornament-div", 225, 195, 890, 385, False), dict(filet=False, taille=.6)),
 "dragon":         (("sea-serpent-vector-ornament-divider", 55, 160, 235, 140, True), dict(filet=False, taille=.68)),
 "crane-flamme":   (("candle-with-flaming-skull-silhou", 235, 28, 310, 415, True), dict(ancre=.76)),
 "chaine":         (("chain-link-strand-with-padlock", 205, 340, 345, 90, False), dict(filet=False)),
 "chope":          (("beer-mug-and-crossed-bones", 35, 30, 955, 965, "seul"), dict(filet=False)),
 "ours":           (("roaring-bear-head-silhouette-vector", 100, 120, 825, 810, "seul"), dict(filet=False)),
 "crane-pique":    (("fence-spikes-skull-divider-icon", 92, 140, 76, 125, True), dict(taille=.6, rot=-90)),
 "fleuron-chaine": (("chain-link-strand-with-padlock", 20, 305, 185, 150, False), dict(taille=.8)),
 "poing":          (("iron-gauntlet-punching-starburst", 40, 45, 945, 935, True), dict(miroir_h=True)),
 "crapaud":        (("toad-wearing-crown-silhouette", 80, 75, 865, 875, "seul"), dict(filet=False, taille=.7)),
}


# ——— Les dessins (dans la boîte 104 × 24) ———
def filet(x0, x1, epais=2.1):
    """Le filet effilé : une pointe en x0, épais de `epais` en x1."""
    return f'<polygon points="{x0},{CY} {x1:.2f},{CY - epais / 2:.2f} {x1:.2f},{CY + epais / 2:.2f}"/>'

def feuille(bx, by, angle, long, large):
    a = math.radians(angle)
    tx, ty = bx + long * math.cos(a), by + long * math.sin(a)
    mx, my = (bx + tx) / 2, (by + ty) / 2
    px, py = -math.sin(a) * large, math.cos(a) * large
    return (f'<path d="M{bx:.2f},{by:.2f} Q{mx + px:.2f},{my + py:.2f} {tx:.2f},{ty:.2f} '
            f'Q{mx - px:.2f},{my - py:.2f} {bx:.2f},{by:.2f}Z"/>')

def ellipse(cx, cy, rx, ry, rot=0):
    return f'<ellipse cx="{cx:.2f}" cy="{cy:.2f}" rx="{rx}" ry="{ry}" transform="rotate({rot} {cx:.2f} {cy:.2f})"/>'

def cercle(cx, cy, r):
    return f"M{cx - r:.2f},{cy:.2f}a{r},{r} 0 1,0 {2 * r},0a{r},{r} 0 1,0 {-2 * r},0Z"

def tige(p0, p1, p2, e0, e1, n=30):
    """Une tige courbe (Bézier quadratique), effilée de e0 à e1 ; renvoie aussi le point et la direction en t."""
    def pt(t):
        u = 1 - t
        return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])
    def dirn(t):
        dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]); dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
        return math.atan2(dy, dx)
    haut, bas = [], []
    for i in range(n + 1):
        t = i / n; (x, y), a, e = pt(t), dirn(t), (e0 + (e1 - e0) * t) / 2
        haut.append(f"{x - math.sin(a) * e:.2f},{y + math.cos(a) * e:.2f}"); bas.append(f"{x + math.sin(a) * e:.2f},{y - math.cos(a) * e:.2f}")
    return f'<polygon points="{" ".join(haut + bas[::-1])}"/>', pt, dirn

def branche():
    # Un brin de feuilles, comme celui de Chatty : la tige courbe est le filet, les feuilles vont vers le titre.
    s, pt, dirn = tige((6, 12.4), (62, 13.6), (98, 10.8), .2, 1.5)
    for t, sens, l in [(.62, -1, 8), (.68, 1, 8.5), (.75, -1, 9), (.81, 1, 9), (.88, -1, 8.5), (.93, 1, 7.5)]:
        (x, y), a = pt(t), math.degrees(dirn(t))
        s += feuille(x, y, a + 34 * sens, l, 2.7)
    (x, y), a = pt(1), math.degrees(dirn(1))
    return s + feuille(x - 1, y, a, 6.5, 2.4)

def gland():
    return (filet(10, 82, 1.8) + '<rect x="81" y="11.3" width="4" height="1.4"/>'
            '<path d="M84.6,12C84.6,7.4 86.8,5.4 91,5.4L91,18.6C86.8,18.6 84.6,16.6 84.6,12Z"/>'
            '<path d="M92.3,6.6C97.6,6.6 101.6,9.4 103.4,12C101.6,14.6 97.6,17.4 92.3,17.4Z"/>')

def champignon():
    chapeau = ("M86.5,11.4C86.5,5.4 90.6,3.2 95,3.2C99.4,3.2 103.5,5.4 103.5,11.4Q95,10 86.5,11.4Z"
               + cercle(91.4, 7.4, 1.3) + cercle(97.6, 6.2, 1.5) + cercle(100.8, 9.2, 1))
    return (f'<path fill-rule="evenodd" d="{chapeau}"/>'
            '<path d="M92.5,12.2Q95,11.7 97.5,12.2L98.3,19.8Q95,21.2 91.7,19.8Z"/>')

def dague():
    return ('<polygon points="58,12 86,10.3 86,13.7"/><rect x="86" y="6.8" width="2.4" height="10.4" rx="1.1"/>'
            '<rect x="88.4" y="10.7" width="9.2" height="2.6" rx=".8"/>' f'<path d="{cercle(100.2, 12, 2.3)}"/>')

def epi():
    s = filet(14, 100, 1.2)
    for x in (72, 77, 82, 87, 92):
        s += ellipse(x + 1.6, CY - 2, 3, 1.3, -32) + ellipse(x + 1.6, CY + 2, 3, 1.3, 32)
    return s + ellipse(98.4, CY, 3.2, 1.35)

def corne():
    # Une corne recourbée, sans filet : fine dehors, elle s'évase vers le titre ; deux anneaux.
    cx, cy, r = 83, -14.6, 30
    def bord(t, k):
        a = math.radians(125 - 70 * t); w = .35 + 4 * t ** 1.6
        return f"{cx + (r + k * w) * math.cos(a):.2f},{cy + (r + k * w) * math.sin(a):.2f}"
    s = ""
    for t0, t1 in [(0, .56), (.585, .76), (.785, 1)]:
        ts = [t0 + (t1 - t0) * i / 10 for i in range(11)]
        s += f'<polygon points="{" ".join([bord(t, 1) for t in ts] + [bord(t, -1) for t in ts[::-1]])}"/>'
    return s

def patte():
    # Une empreinte de loup, les doigts vers le titre.
    pied = "M0,-1.5C3.6,-1.5 6,2 5.3,4.6C4.7,6.6 2.3,6 0,6C-2.3,6 -4.7,6.6 -5.3,4.6C-6,2 -3.6,-1.5 0,-1.5Z"
    doigts = (ellipse(-6.2, -3.6, 1.7, 2.3, -28) + ellipse(-2.3, -6.8, 1.8, 2.5, -10)
              + ellipse(2.3, -6.8, 1.8, 2.5, 10) + ellipse(6.2, -3.6, 1.7, 2.3, 28))
    return f'<g transform="translate(94 {CY}) rotate(90)"><path d="{pied}"/>{doigts}</g>'

def oeil():
    return (filet(8, 83.6, 1.8) + '<path fill-rule="evenodd" d="M83,12Q93.5,2.6 104,12Q93.5,21.4 83,12Z'
            'M85.6,12Q93.5,4.8 101.4,12Q93.5,19.2 85.6,12Z"/><path d="M93.5,7.2Q95.4,12 93.5,16.8Q91.6,12 93.5,7.2Z"/>')

def flocon():
    # Six branches ; le filet passe au milieu, dans les deux branches horizontales.
    cx, r, s = 93, 8.6, ""
    for k in range(6):
        a = math.radians(60 * k)
        x1, y1 = cx + r * math.cos(a), CY + r * math.sin(a)
        s += f'<line x1="{cx}" y1="{CY}" x2="{x1:.2f}" y2="{y1:.2f}"/>'
        bx, by = cx + .58 * r * math.cos(a), CY + .58 * r * math.sin(a)
        for d in (-45, 45):
            b = a + math.radians(d)
            s += f'<line x1="{bx:.2f}" y1="{by:.2f}" x2="{bx + 3 * math.cos(b):.2f}" y2="{by + 3 * math.sin(b):.2f}"/>'
    return filet(4, cx, 1.6) + f'<g stroke="#000" stroke-width="1.25" stroke-linecap="round">{s}</g>'

def fleur():
    cx, s = 93.6, filet(6, 85.5, 1.8)
    for k in range(5):
        a = 180 + 72 * k
        s += ellipse(cx + 4.9 * math.cos(math.radians(a)), CY + 4.9 * math.sin(math.radians(a)), 3.9, 2.5, a)
    return s

def marteau():
    return ('<polygon points="70,11.2 94,10.9 94,13.1 70,12.8"/>' f'<path d="{cercle(70, 12, 1.3)}"/>'
            '<path d="M94,6.2L101.4,6.8L101.4,17.2L94,17.8Z"/><rect x="101.4" y="7.6" width="1.5" height="8.8" rx=".5"/>')

def triangle():
    return filet(6, 91, 1.8) + '<polygon points="90.5,6.5 101,12 90.5,17.5"/>'

def lys():
    # Une fleur de lys épurée : le pétale du milieu, deux pétales qui s'enroulent, le bandeau où entre le filet.
    p = ("M0,-10.5C2.6,-7.6 3.3,-4 1.5,0L-1.5,0C-3.3,-4 -2.6,-7.6 0,-10.5Z"
         "M-1.9,0C-3.2,-3.6 -6.4,-6.4 -8.6,-4.6C-10,-3.4 -9.4,-.9 -7.6,-1.2C-8.4,-2.4 -7.2,-3.8 -5.8,-3C-4.4,-2.2 -3.6,-.8 -3.4,0Z"
         "M1.9,0C3.2,-3.6 6.4,-6.4 8.6,-4.6C10,-3.4 9.4,-.9 7.6,-1.2C8.4,-2.4 7.2,-3.8 5.8,-3C4.4,-2.2 3.6,-.8 3.4,0Z"
         "M-4.6,.6H4.6V2.4H-4.6Z"
         "M-1.6,2.4C-2.4,4.2 -4.6,5.4 -6,4.4C-4.8,4.4 -3.6,3.6 -3.4,2.4Z"
         "M1.6,2.4C2.4,4.2 4.6,5.4 6,4.4C4.8,4.4 3.6,3.6 3.4,2.4Z"
         "M-1,2.4H1L0,5.6Z")
    return filet(6, 89, 1.8) + f'<path transform="translate(93.5 10.6) scale(.95)" d="{p}"/>'

def croissant_haut():
    # Un croissant tout simple, ouvert vers le haut, sans filet.
    return ('<path d="M87.01,9.29A7.5,7.5 0 1,0 100.99,9.29A7,7 0 0,1 87.01,9.29Z"/>')

DESSINS = {"branche": branche, "gland": gland, "champignon": champignon, "dague": dague, "epi": epi, "corne": corne,
           "patte": patte, "oeil": oeil, "flocon": flocon, "fleur": fleur, "marteau": marteau, "triangle": triangle,
           "lys": lys, "croissant-haut": croissant_haut}
SANS_FILET = {"champignon", "dague", "patte", "marteau", "croissant-haut"}  # la corne est déjà haute  # remontés comme les motifs sans filet


# ——— Les planches ———
def planche(name):
    # Les fichiers du zip : « Beer_mug_and_crossed_bones_ccba783c.jpg » → « beer-mug-and-crossed-bones ».
    for f in os.listdir(SRC):
        base = re.sub(r"_[0-9a-f]{8}\.jpg$", "", f).replace("#U2026", "")
        if re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-") == name: return os.path.join(SRC, f)
    raise SystemExit("planche introuvable : " + name)

def run(cmd, data=None):
    return subprocess.run(cmd, input=data, capture_output=True, check=True).stdout

def lire(raw):
    # PGM binaire (P5) → grille de booléens (noir).
    parts = raw.split(b"\n", 3)
    w, h = map(int, parts[1].split()); px = parts[3]
    return w, h, [[px[r * w + c] < 128 for c in range(w)] for r in range(h)]

def pbm(w, h, g):
    return (f"P1\n{w} {h}\n" + "\n".join("".join("1" if v else "0" for v in row) for row in g) + "\n").encode()

def clean(w, h, g, mode=True):
    seen = [[False] * w for _ in range(h)]
    keep = [[False] * w for _ in range(h)]
    comps = []
    for r in range(h):
        for c in range(w):
            if not g[r][c] or seen[r][c]: continue
            comp, edge, q = [], False, deque([(r, c)]); seen[r][c] = True
            while q:
                a, b = q.popleft(); comp.append((a, b))
                if a in (0, h - 1) or b in (0, w - 1): edge = True
                for da in (-1, 0, 1):
                    for db in (-1, 0, 1):
                        aa, bb = a + da, b + db
                        if 0 <= aa < h and 0 <= bb < w and g[aa][bb] and not seen[aa][bb]:
                            seen[aa][bb] = True; q.append((aa, bb))
            comps.append((len(comp), edge, comp))
    big = max(n for n, _, _ in comps)
    for n, edge, comp in comps:
        if n == big or (mode != "seul" and not edge):
            for a, b in comp: keep[a][b] = True
    return keep

def trim(w, h, g):
    rows = [r for r in range(h) if any(g[r])]
    cols = [c for c in range(w) if any(g[r][c] for r in range(h))]
    r0, r1, c0, c1 = rows[0], rows[-1], cols[0], cols[-1]
    return c1 - c0 + 1, r1 - r0 + 1, [row[c0:c1 + 1] for row in g[r0:r1 + 1]]

def motif_planche(src, o):
    name, x, y, w, h, cl = src
    raw = run(["convert", planche(name), "-crop", f"{w}x{h}+{x}+{y}", "+repage", "-colorspace", "gray",
               "-threshold", "55%", "-depth", "8", "pgm:-"])
    w, h, g = lire(raw)
    if cl: g = clean(w, h, g, cl)
    w, h, g = trim(w, h, g)
    ops = (["-flop"] if o.get("miroir_h") else []) + (["-flip"] if o.get("miroir_v") else [])
    if o.get("rot"): ops += ["-background", "white", "-rotate", str(o["rot"])]
    if ops:
        w, h, g = trim(*lire(run(["convert", "pbm:-", *ops, "-threshold", "50%", "-depth", "8", "pgm:-"], pbm(w, h, g))))
    return w, h, g

def ornement_planche(src, o):
    w, h, g = motif_planche(src, o)
    big = max(w, h)
    resize = ["-resize", f"{280 * 100 // big}%"] if big > 280 else []
    bmp = run(["convert", "pbm:-", *resize, "-threshold", "50%", "pbm:-"], pbm(w, h, g))
    svg = run(["potrace", "-s", "--turdsize", "3", "--alphamax", "1", "--opttolerance", "0.4", "-o", "-", "-"], bmp).decode()
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    grp = re.sub(r'fill="#[0-9a-fA-F]+"', 'fill="#000"', re.search(r"(<g transform=.*</g>)", svg, re.S).group(1))
    vw, vh = (float(v) for v in vb.split()[2:])
    # La taille : dans la boîte 46 × 22 (× taille), sans que le motif sorte de la boîte une fois son ancre sur la ligne.
    taille, ancre = o.get("taille", 1), o.get("ancre", .5)
    dy = o.get("dy", LEVE if o.get("filet", 0) is False else 0)
    m = min(22 * taille / vh, 46 * taille / vw, (CY + dy - .5) / (ancre * vh), (H - CY - dy - .5) / ((1 - ancre) * vh))
    mw, mh = vw * m, vh * m
    x, y = W - mw, CY + dy - ancre * mh
    out = ""
    if o.get("filet", 0) is not False:
        # Le filet entre dans le motif là où il rencontre le premier noir, à la hauteur de l'ancre.
        band = range(max(0, int(h * (ancre - .08))), min(h, int(h * (ancre + .08)) + 1))
        join = min(next((c for c in range(w) if g[r][c]), w) for r in band)
        out += filet(o.get("filet", 0), x + join / w * mw + 1.2)
    return out + f'<svg x="{x:.2f}" y="{y:.2f}" width="{mw:.2f}" height="{mh:.2f}" viewBox="{vb}">{grp}</svg>'

def ornement_dessin(nom):
    corps = DESSINS[nom]()
    return f'<g transform="translate(0 {LEVE})">{corps}</g>' if nom in SANS_FILET else corps


os.makedirs(OUT, exist_ok=True)
for nom in list(PLANCHES) + list(DESSINS):
    corps = ornement_planche(*PLANCHES[nom]) if nom in PLANCHES else ornement_dessin(nom)
    out = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">{corps}</svg>\n'
    open(os.path.join(OUT, nom + ".svg"), "w").write(out)
    print(f"{nom:16s} {len(out) // 1024:3d} Ko")
