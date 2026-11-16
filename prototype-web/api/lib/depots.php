<?php
// Blood & Wages — dépôts d'images depuis la Design Lab (Idan, 2026-11-16 : « faire les maj comme un grand »).
// Un dépôt remplace une image du jeu ou en ajoute une variante (familles où le jeu tire au hasard). Le fichier est rangé
// tel quel sur Hostinger, dans media/depots/<id>/, avec sa fiche depot.json ; media/depots/index.json les liste tous.
// JC les intègre ensuite (conversion au format du jeu, master dans Git, mise en ligne) : rien n'entre dans le jeu ici.
// Le point d'entrée est prototype-web/design/api/depot.php, derrière le mot de passe de la Design Lab.

declare(strict_types=1);

const DEPOT_MAX_OCTETS = 30 * 1024 * 1024;
const DEPOT_TYPES = ['remplacer', 'variante'];
const DEPOT_RASTER = ['png' => IMAGETYPE_PNG, 'jpg' => IMAGETYPE_JPEG, 'webp' => IMAGETYPE_WEBP, 'gif' => IMAGETYPE_GIF];

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
        $familles[$row['cle']] = ['nom' => $row['famille'], 'variantes' => !empty($row['variantes']), 'fichiers' => $liste];
    }
    return $familles;
}

// La demande : une famille connue, une image de cette famille, un type permis pour elle. null si tout va bien.
function depot_verifier_demande(array $familles, string $famille, string $cible, string $type): ?string
{
    if (!isset($familles[$famille])) {
        return 'Famille inconnue : « ' . $famille . ' ».';
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
