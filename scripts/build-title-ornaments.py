#!/usr/bin/env python3
# Les ornements du titre de la fiche au survol, un par culture (Idan, 2026-11-15 : « je voudrais qu'on les fasse court,
# mais 1 par culture en monochrome… plus fin et plus petit (et correctement alignés). Regarde l'exemple de Chatty »).
#
# Les sources sont les planches d'ornements d'Idan (Ornements.zip, sur le serveur : media/Ornements.zip), noir sur blanc.
# Pour chaque motif : on découpe sa zone dans une planche, on la seuille, on enlève au besoin ce qui dépasse d'un motif
# voisin, puis potrace en fait un tracé. L'ornement : un filet effilé (fin dehors, épais côté titre) qui entre dans le motif
# par le milieu, comme le brin de Chatty. viewBox 104 × 24, noir (le CSS s'en sert comme masque et le colore).
#
# Usage : python3 scripts/build-title-ornaments.py <dossier des planches dézippées>
# Écrit prototype-web/assets/fiche/ornements/<motif>.svg. Outils : ImageMagick (convert), potrace.
import os, re, subprocess, sys
from collections import deque

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prototype-web", "assets", "fiche", "ornements")
# motif : (planche, x, y, largeur, hauteur, nettoyage, rotation, miroir). Nettoyage : True garde la plus grande forme et
# ce qui ne touche pas le bord de la découpe ; "seul" ne garde que la plus grande forme (la figure sans son cadre).

PIECES = {
 # séparateurs
 "cadenas":          ("chain-link-strand-with-padlock", 560, 250, 220, 260, True, 0, False),
 "fleuron-chaine":   ("chain-link-strand-with-padlock", 20, 305, 185, 150, False, 0, False),
 "chaine":           ("chain-link-strand-with-padlock", 205, 340, 345, 90, False, 0, False),
 "crane-pique":      ("fence-spikes-skull-divider-icon", 92, 140, 76, 125, True, 0, False),
 "corbeau":          ("flying-raven-vector-ornament-div", 225, 195, 890, 385, False, 0, False),
 "volute-corbeau":   ("flying-raven-vector-ornament-div", 0, 285, 245, 125, False, 0, False),
 "dragon":           ("sea-serpent-vector-ornament-divider", 55, 160, 310, 185, False, 0, False),
 "vague":            ("sea-serpent-vector-ornament-divider", 1075, 225, 230, 180, False, 0, False),
 "couronne":         ("vector-silhouette-ornament-divid", 495, 195, 305, 250, True, 0, False),
 "rinceau":          ("vector-silhouette-ornament-divid", 20, 280, 480, 205, False, 0, False),
 # emblèmes
 "couronne-croix":   ("toad-wearing-crown-silhouette", 380, 195, 240, 190, True, 0, False),
 "crane-flamme":     ("candle-with-flaming-skull-silhou", 235, 28, 310, 415, True, 0, False),
 "phenix":           ("phoenix-silhouette-rising-from-f", 130, 90, 770, 870, "seul", 0, False),
 "poing":            ("iron-gauntlet-punching-starburst", 40, 45, 945, 935, True, 0, False),
 "bouffon":          ("jester-hat-on-skull-silhouette", 105, 55, 815, 915, "seul", 0, False),
 "ours":             ("roaring-bear-head-silhouette-vector", 100, 120, 825, 810, "seul", 0, False),
 "gobelin":          ("goblin-head-silhouette-icon", 230, 90, 570, 630, True, 0, False),
 "croissant":        ("wolf-head-in-crescent-moon", 55, 50, 915, 920, "seul", 0, False),
 "cochon-volant":    ("flying-pig-silhouette-heraldic-o", 65, 145, 895, 800, "seul", 0, False),
 "crane-dragon":     ("winged-dragon-skull-emblem-silho", 30, 95, 965, 830, False, 0, False),
 "fleur-de-lys":     ("fleur-de-lis-with-thorny-vines-s", 125, 60, 775, 900, False, 0, False),
 "trident":          ("trident-with-lightning-bolts-sil", 135, 45, 755, 930, "seul", 0, False),
 "cle-ailee":        ("winged-key-wrapped-in-chains", 0, 0, 768, 1376, False, 90, False),
 "totem":            ("vertical-totem-pole-silhouette", 25, 35, 720, 1305, False, 90, False),
 "tentacule-sabre":  ("octopus-tentacle-holding-cutlass", 300, 170, 460, 630, True, 0, False),
 "chope":            ("beer-mug-and-crossed-bones", 35, 30, 955, 965, "seul", 0, False),
 "bougie":           ("candle-with-flaming-skull-silhou", 150, 20, 470, 1330, False, 90, False),
 "crapaud":          ("toad-wearing-crown-silhouette", 80, 75, 865, 875, "seul", 0, False),
 "aile-dragon":      ("winged-dragon-skull-emblem-silho", 30, 95, 965, 830, "seul", 0, False),
 "loup":             ("wolf-head-in-crescent-moon", 300, 250, 420, 470, True, 0, False),
 "eclair":           ("trident-with-lightning-bolts-sil", 665, 135, 175, 270, "seul", 0, False),
 "pointe":           ("fence-spikes-skull-divider-icon", 80, 465, 65, 140, True, -90, False),
}

def planche(name):
    # Les fichiers du zip : « Beer_mug_and_crossed_bones_ccba783c.jpg » → « beer-mug-and-crossed-bones ».
    for f in os.listdir(SRC):
        base = re.sub(r"_[0-9a-f]{8}\.jpg$", "", f).replace("#U2026", "")
        if re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-") == name: return os.path.join(SRC, f)
    raise SystemExit("planche introuvable : " + name)


def run(cmd, data=None):
    return subprocess.run(cmd, input=data, capture_output=True, check=True).stdout

def load(name, x, y, w, h, rot, flop):
    cmd = ["convert", planche(name), "-crop", f"{w}x{h}+{x}+{y}", "+repage",
           "-colorspace", "gray", "-threshold", "55%"]
    if rot: cmd += ["-rotate", str(rot)]
    if flop: cmd += ["-flop"]
    raw = run(cmd + ["-depth", "8", "pgm:-"])
    # P5 : en-tête puis octets
    parts = raw.split(b"\n", 3)
    W, H = map(int, parts[1].split()); px = parts[3]
    return W, H, [[px[r * W + c] < 128 for c in range(W)] for r in range(H)]

def clean(W, H, g, mode=True):
    seen = [[False] * W for _ in range(H)]
    keep = [[False] * W for _ in range(H)]
    comps = []
    for r in range(H):
        for c in range(W):
            if not g[r][c] or seen[r][c]: continue
            comp, edge, q = [], False, deque([(r, c)]); seen[r][c] = True
            while q:
                a, b = q.popleft(); comp.append((a, b))
                if a in (0, H - 1) or b in (0, W - 1): edge = True
                for da in (-1, 0, 1):
                    for db in (-1, 0, 1):
                        aa, bb = a + da, b + db
                        if 0 <= aa < H and 0 <= bb < W and g[aa][bb] and not seen[aa][bb]:
                            seen[aa][bb] = True; q.append((aa, bb))
            comps.append((len(comp), edge, comp))
    big = max(n for n, _, _ in comps)
    for n, edge, comp in comps:
        if n == big or (mode != "seul" and not edge):
            for a, b in comp: keep[a][b] = True
    return keep

def trim(W, H, g):
    rows = [r for r in range(H) if any(g[r])]
    cols = [c for c in range(W) if any(g[r][c] for r in range(H))]
    r0, r1, c0, c1 = rows[0], rows[-1], cols[0], cols[-1]
    return c1 - c0 + 1, r1 - r0 + 1, [row[c0:c1 + 1] for row in g[r0:r1 + 1]]


W, H, MH, MW = 104, 24, 22, 46  # l'ornement ; le motif tient dans 46 × 22, à droite

def ornement(nom, Wp, Hp, g, join):
    big = max(Wp, Hp)
    pbm = f"P1\n{Wp} {Hp}\n" + "\n".join("".join("1" if v else "0" for v in row) for row in g) + "\n"
    resize = ["-resize", f"{280 * 100 // big}%"] if big > 280 else []
    bmp = run(["convert", "pbm:-", *resize, "-threshold", "50%", "pbm:-"], pbm.encode())
    svg = run(["potrace", "-s", "--turdsize", "3", "--alphamax", "1", "--opttolerance", "0.4", "-o", "-", "-"], bmp).decode()
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    grp = re.sub(r'fill="#[0-9a-fA-F]+"', 'fill="#000"', re.search(r"(<g transform=.*</g>)", svg, re.S).group(1))
    vw, vh = (float(v) for v in vb.split()[2:])
    m = min(MH / vh, MW / vw); mw, mh = vw * m, vh * m
    x, y = W - mw, (H - mh) / 2
    xe = x + join / Wp * mw + 1.2  # le filet entre un peu dans le motif
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">'
            f'<polygon points="0,{H/2} {xe:.2f},{H/2-1.05} {xe:.2f},{H/2+1.05}"/>'
            f'<svg x="{x:.2f}" y="{y:.2f}" width="{mw:.2f}" height="{mh:.2f}" viewBox="{vb}">{grp}</svg></svg>\n')

os.makedirs(OUT, exist_ok=True)
for nom, (f, x, y, w, h, cl, rot, flop) in PIECES.items():
    Wp, Hp, g = load(f, x, y, w, h, rot, flop)
    if cl: g = clean(Wp, Hp, g, cl)
    Wp, Hp, g = trim(Wp, Hp, g)
    # Le premier pixel à gauche dans la bande du milieu : là où le filet entre dans le motif.
    band = range(int(Hp * .42), int(Hp * .58) + 1)
    join = min(next((c for c in range(Wp) if g[r][c]), Wp) for r in band)
    out = ornement(nom, Wp, Hp, g, join)
    open(os.path.join(OUT, nom + ".svg"), "w").write(out)
    print(f"{nom:16s} {len(out) // 1024:3d} Ko")

