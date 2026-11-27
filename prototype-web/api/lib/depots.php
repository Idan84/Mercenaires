<?php
// Blood & Wages — dépôts d'images depuis la Design Lab (Idan, 2026-11-16 : « faire les maj comme un grand »).
// Un dépôt remplace une image du jeu, en ajoute une variante (familles où le jeu tire au hasard) ou apporte une image que
// le jeu attend et n'a pas encore (« nouvelle » : son chemin suit un motif de la famille, Idan 2026-11-18), ou donne à une
// image du jeu un autre rôle (« reutiliser » : sans fichier, la source est une image du catalogue ; Idan 2026-11-18). Le fichier est rangé
// tel quel sur Hostinger, dans media/depots/<id>/, avec sa fiche depot.json ; media/depots/index.json les liste tous.
// JC les intègre ensuite (conversion au format du jeu, master dans Git, mise en ligne) : rien n'entre dans le jeu ici.
// Le point d'entrée est prototype-web/design/api/depot.php, derrière le mot de passe de la Design Lab.

declare(strict_types=1);

const DEPOT_MAX_OCTETS = 30 * 1024 * 1024;
const DEPOT_TYPES = ['remplacer', 'variante', 'nouvelle', 'reutiliser'];
const DEPOT_RASTER = ['png' => IMAGETYPE_PNG, 'jpg' => IMAGETYPE_JPEG, 'webp' => IMAGETYPE_WEBP, 'gif' => IMAGETYPE_GIF];

// La réponse JSON des points d'entrée de la Design Lab (design/api/depot.php).
function depot_repondre(int $code, array $corps): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($corps, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// La Design Lab est-elle derrière son mot de passe (réglé chez Hostinger) ? DEPOT_LOCAL=1 : essais en local.
function depot_protege(string $site): bool
{
    foreach (['REMOTE_USER', 'REDIRECT_REMOTE_USER', 'PHP_AUTH_USER', 'AUTH_TYPE'] as $cle) {
        if (!empty($_SERVER[$cle])) {
            return true;
        }
    }
    $htaccess = (string) @file_get_contents($site . '/design/.htaccess');
    return stripos($htaccess, 'AuthType') !== false || getenv('DEPOT_LOCAL') === '1';
}

// Les gardes communes : POST, Design Lab protégée, demande venue de la Design Lab elle-même (en-tête X-Depot, origine
// du site). Répond et s'arrête sinon.
function depot_garder(string $site): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        depot_repondre(405, ['ok' => false, 'erreur' => 'Dépôt : POST seulement.']);
    }
    if (!depot_protege($site)) {
        depot_repondre(403, ['ok' => false, 'erreur' => 'Dépôt fermé : la Design Lab n\'est pas protégée par mot de passe.']);
    }
    $origine = $_SERVER['HTTP_ORIGIN'] ?? '';
    $hote = (string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
    if (($_SERVER['HTTP_X_DEPOT'] ?? '') !== '1' || ($origine !== '' && parse_url($origine, PHP_URL_HOST) !== $hote)) {
        depot_repondre(403, ['ok' => false, 'erreur' => 'Dépôt refusé : la demande ne vient pas de la Design Lab.']);
    }
}

// Les familles du catalogue et leurs fichiers, tels que publiés avec le site (data/images.json, data/images-fichiers.json).
function depot_familles(string $site): array
{
    $catalogue = json_decode((string) @file_get_contents($site . '/data/images.json'), true);
    $fichiers = json_decode((string) @file_get_contents($site . '/data/images-fichiers.json'), true);
    if (!is_array($catalogue) || !is_array($fichiers)) {
        throw new RuntimeException('Catalogue des images introuvable sur le site.');
    }
    $familles = [];
    foreach ($catalogue['rows'] ?? [] as $row) {
        $liste = [];
        foreach ($fichiers['familles'][$row['cle']] ?? [] as $f) {
            $liste[$f['chemin']] = $f;
        }
        $familles[$row['cle']] = ['nom' => $row['famille'], 'variantes' => !empty($row['variantes']), 'fichiers' => $liste,
            'motifs' => array_values(array_filter((array) ($row['motifs'] ?? []), 'is_string'))];
    }
    return $familles;
}

// La demande : une famille connue, une image de cette famille, un type permis pour elle. null si tout va bien.
// Un motif du catalogue (scripts/build-images-index.js) : {a,b} des variantes, « **/ » des dossiers, « * » un nom.
function depot_motif_regex(string $motif): array
{
    if (preg_match('/\{([^{}]*)\}/', $motif, $m, PREG_OFFSET_CAPTURE)) {
        $avant = substr($motif, 0, $m[0][1]);
        $apres = substr($motif, $m[0][1] + strlen($m[0][0]));
        return array_merge(...array_map(fn($part) => depot_motif_regex($avant . $part . $apres), explode(',', $m[1][0])));
    }
    $re = '';
    for ($i = 0, $n = strlen($motif); $i < $n;) {
        if (substr($motif, $i, 3) === '**/') { $re .= '(?:[^/]+/)*'; $i += 3; }
        elseif ($motif[$i] === '*') { $re .= '[^/]*'; $i++; }
        else { $re .= preg_quote($motif[$i], '#'); $i++; }
    }
    return ['#^' . $re . '$#'];
}

function depot_suit_un_motif(array $motifs, string $cible): bool
{
    foreach ($motifs as $motif) {
        foreach (depot_motif_regex($motif) as $re) {
            if (preg_match($re, $cible)) {
                return true;
            }
        }
    }
    return false;
}

function depot_verifier_demande(array $familles, string $famille, string $cible, string $type): ?string
{
    if (!isset($familles[$famille])) {
        return 'Famille inconnue : « ' . $famille . ' ».';
    }
    if ($type === 'reutiliser') {
        if (isset($familles[$famille]['fichiers'][$cible])) {
            return null;
        }
        $type = 'nouvelle';
    }
    if ($type === 'nouvelle') {
        if (isset($familles[$famille]['fichiers'][$cible])) {
            return 'Cette image existe déjà : « Remplacer ».';
        }
        if (!preg_match('#^assets/[a-z0-9_-]+(?:/[a-z0-9_-]+)*\.(?:webp|png|jpg|svg)$#', $cible)
            || !depot_suit_un_motif($familles[$famille]['motifs'], $cible)) {
            return 'Cette image n\'est pas attendue dans la famille « ' . $familles[$famille]['nom'] . ' ».';
        }
        return null;
    }
    if (!isset($familles[$famille]['fichiers'][$cible])) {
        return 'Cette image n\'appartient pas à la famille « ' . $familles[$famille]['nom'] . ' ».';
    }
    if (!in_array($type, DEPOT_TYPES, true)) {
        return 'Type de dépôt inconnu : « ' . $type . ' ».';
    }
    if ($type === 'variante' && !$familles[$famille]['variantes']) {
        return 'Le jeu ne tire pas encore au hasard dans la famille « ' . $familles[$famille]['nom'] . ' » : remplacer seulement.';
    }
    return null;
}

// La source d'une réutilisation : une image du catalogue, autre que la cible. Renvoie l'erreur ou null.
function depot_verifier_source(array $familles, string $source, string $cible): ?string
{
    if ($source === $cible) {
        return 'L\'image a déjà ce rôle.';
    }
    foreach ($familles as $famille) {
        if (isset($famille['fichiers'][$source])) {
            return null;
        }
    }
    return 'Image source inconnue : « ' . $source . ' ».';
}

// Le fichier : une image (PNG, JPEG, WebP, GIF) ou un SVG sans script pour une image SVG, 30 Mo au plus.
// Renvoie ['ext' => …, 'largeur' => …, 'hauteur' => …] ou ['erreur' => …].
function depot_verifier_fichier(string $chemin, string $nomOrigine, int $octets, string $cible): array
{
    if ($octets <= 0) {
        return ['erreur' => 'Fichier vide.'];
    }
    if ($octets > DEPOT_MAX_OCTETS) {
        return ['erreur' => 'Fichier trop lourd : 30 Mo au plus.'];
    }
    $ext = strtolower(pathinfo($nomOrigine, PATHINFO_EXTENSION));
    if ($ext === 'jpeg') {
        $ext = 'jpg';
    }
    if (strtolower(pathinfo($cible, PATHINFO_EXTENSION)) === 'svg') {
        $texte = (string) file_get_contents($chemin);
        if ($ext !== 'svg' || !preg_match('/<svg[\s>]/i', $texte)) {
            return ['erreur' => 'Cette image est un SVG : déposer un fichier .svg.'];
        }
        if (preg_match('/<script|\son[a-z]+\s*=|javascript:|<foreignObject/i', $texte)) {
            return ['erreur' => 'SVG refusé : il contient du script.'];
        }
        return ['ext' => 'svg', 'largeur' => null, 'hauteur' => null];
    }
    $info = @getimagesize($chemin);
    if ($info === false || !isset(DEPOT_RASTER[$ext]) || $info[2] !== DEPOT_RASTER[$ext]) {
        return ['erreur' => 'Format refusé : PNG, JPEG, WebP ou GIF, avec la bonne extension.'];
    }
    return ['ext' => $ext, 'largeur' => (int) $info[0], 'hauteur' => (int) $info[1]];
}

// Un nom de fichier sûr, sans accent ni espace.
function depot_nom_sur(string $nom): string
{
    $ascii = (string) iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', (string) pathinfo($nom, PATHINFO_FILENAME));
    $base = (string) preg_replace('/[^a-z0-9]+/', '-', strtolower($ascii));
    $base = trim($base, '-');
    return substr($base !== '' ? $base : 'image', 0, 60);
}

// Le dossier des dépôts, protégé : pas de liste du dossier, aucun script exécuté, aucun script dans les SVG servis.
function depot_dossier(string $media): string
{
    $dossier = $media . '/depots';
    if (!is_dir($dossier) && !mkdir($dossier, 0755, true) && !is_dir($dossier)) {
        throw new RuntimeException('Impossible de créer media/depots/.');
    }
    $htaccess = $dossier . '/.htaccess';
    if (!is_file($htaccess)) {
        file_put_contents($htaccess, "# Dépôts de la Design Lab : des images, jamais de script.\nOptions -Indexes -ExecCGI\n"
            . "RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar\n"
            . "<FilesMatch \"\\.(php|phtml|phar)\">\n  Require all denied\n</FilesMatch>\n"
            . "<IfModule mod_headers.c>\n  Header set Content-Security-Policy \"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'\"\n"
            . "  Header set X-Content-Type-Options \"nosniff\"\n  Header set Cache-Control \"no-cache\"\n</IfModule>\n");
    }
    return $dossier;
}

// Range le fichier et sa fiche ; met l'index à jour. Renvoie la fiche.
function depot_enregistrer(string $dossier, array $demande, array $fichier, string $source, bool $televerse): array
{
    $id = gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $rep = $dossier . '/' . $id;
    if (!mkdir($rep, 0755)) {
        throw new RuntimeException('Impossible de créer le dossier du dépôt.');
    }
    $nom = depot_nom_sur($demande['nom_origine']) . '.' . $fichier['ext'];
    $ok = $televerse ? move_uploaded_file($source, $rep . '/' . $nom) : copy($source, $rep . '/' . $nom);
    if (!$ok) {
        throw new RuntimeException('Impossible d\'enregistrer le fichier.');
    }
    $fiche = [
        'id' => $id,
        'date' => gmdate('c'),
        'famille' => $demande['famille'],
        'cible' => $demande['cible'],
        'type' => $demande['type'],
        'fichier' => 'media/depots/' . $id . '/' . $nom,
        'nom_origine' => $demande['nom_origine'],
        'octets' => $demande['octets'],
        'largeur' => $fichier['largeur'],
        'hauteur' => $fichier['hauteur'],
        'note' => $demande['note'],
        'auteur' => $demande['auteur'],
    ];
    file_put_contents($rep . '/depot.json', json_encode($fiche, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n");
    depot_reindexer($dossier);
    return $fiche;
}

// Une réutilisation : une fiche sans fichier ; « fichier » est l'image source du jeu (la Design Lab l'affiche).
function depot_enregistrer_reutilisation(string $dossier, array $demande, array $source): array
{
    $id = gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $rep = $dossier . '/' . $id;
    if (!mkdir($rep, 0755)) {
        throw new RuntimeException('Impossible de créer le dossier du dépôt.');
    }
    $fiche = [
        'id' => $id,
        'date' => gmdate('c'),
        'famille' => $demande['famille'],
        'cible' => $demande['cible'],
        'type' => 'reutiliser',
        'source' => $source['chemin'],
        'fichier' => $source['chemin'],
        'octets' => (int) ($source['octets'] ?? 0),
        'largeur' => $source['largeur'] ?? null,
        'hauteur' => $source['hauteur'] ?? null,
        'note' => $demande['note'],
        'auteur' => $demande['auteur'],
    ];
    file_put_contents($rep . '/depot.json', json_encode($fiche, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n");
    depot_reindexer($dossier);
    return $fiche;
}

function depot_fichier_du_catalogue(array $familles, string $chemin): ?array
{
    foreach ($familles as $famille) {
        if (isset($famille['fichiers'][$chemin])) {
            return $famille['fichiers'][$chemin];
        }
    }
    return null;
}

// media/depots/index.json : toutes les fiches, les plus récentes d'abord (lu par la Design Lab et par JC).
function depot_reindexer(string $dossier): array
{
    $fiches = [];
    foreach (glob($dossier . '/*/depot.json') ?: [] as $f) {
        $fiche = json_decode((string) file_get_contents($f), true);
        if (is_array($fiche)) {
            $fiches[] = $fiche;
        }
    }
    usort($fiches, static fn(array $a, array $b): int => strcmp($b['id'], $a['id']));
    $index = ['version' => 1, 'depots' => $fiches];
    $tmp = $dossier . '/index.json.' . bin2hex(random_bytes(4));
    file_put_contents($tmp, json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", LOCK_EX);
    rename($tmp, $dossier . '/index.json');
    return $index;
}
