<?php
// Blood & Wages — réglages d'un kit de culture depuis la Design Lab (onglet Cultures ; Idan, 2026-11-18 : « personnaliser
// pour chaque culture les différents panneaux »). Un enregistrement porte les réglages d'un panneau (barres du camp, fiche
// au survol, fiche complète) pour une culture qui a son kit (data/reference/culture-kits.json, publié dans data/). Il est
// rangé tel quel sur Hostinger, dans media/reglages/<id>/reglage.json ; media/reglages/index.json les liste tous. Le jeu
// les lit en direct (Idan, 2026-11-21 ; prototype-web/reference-data.js) : le dernier de chaque culture et panneau.
// Les réglages ont la forme de ceux du jeu : les mêmes clés, les mêmes types (nombres, oui/non, mots courts).

declare(strict_types=1);

const REGLAGES_PANNEAUX = ['barres', 'fiche', 'plein'];
const REGLAGES_MAX_OCTETS = 32768;
const REGLAGES_PROFONDEUR = 6;
// Des clés que le jeu lit sans qu'elles soient toujours écrites (les pictos inactifs des barres dorées).
const REGLAGES_CLES_EN_PLUS = ['inactifs'];
// Les kits du jeu, par clé de culture, tels que publiés avec le site.
function reglages_kits(string $site): array
{
    $kits = json_decode((string) @file_get_contents($site . '/data/culture-kits.json'), true);
    if (!is_array($kits)) {
        throw new RuntimeException('Kits des cultures introuvables sur le site.');
    }
    $parCle = [];
    foreach ($kits['rows'] ?? [] as $kit) {
        if (is_array($kit) && is_string($kit['cle'] ?? null)) {
            $parCle[$kit['cle']] = $kit;
        }
    }
    return $parCle;
}

// Les réglages du jeu pour ce panneau de ce kit (la référence de forme).
function reglages_reference(array $kit, string $panneau): ?array
{
    return is_array($kit[$panneau] ?? null) ? $kit[$panneau] : null;
}

// Même forme que la référence : chaque clé de la référence, aucune autre (sauf REGLAGES_CLES_EN_PLUS), même type.
// Renvoie l'erreur ou null.
function reglages_meme_forme(array $reference, mixed $valeur, string $chemin = '', int $profondeur = 0): ?string
{
    if ($profondeur > REGLAGES_PROFONDEUR || !is_array($valeur) || ($valeur !== [] && array_keys($valeur) === range(0, count($valeur) - 1))) {
        return 'Réglages mal formés' . ($chemin !== '' ? ' (' . $chemin . ')' : '') . '.';
    }
    foreach ($valeur as $cle => $v) {
        if (!array_key_exists($cle, $reference) && !in_array($cle, REGLAGES_CLES_EN_PLUS, true)) {
            return 'Réglage inconnu : « ' . $chemin . $cle . ' ».';
        }
    }
    foreach ($reference as $cle => $ref) {
        $ici = $chemin . $cle;
        if (!array_key_exists($cle, $valeur)) {
            return 'Réglage manquant : « ' . $ici . ' ».';
        }
        $erreur = reglages_valeur($ref, $valeur[$cle], $ici, $profondeur);
        if ($erreur !== null) {
            return $erreur;
        }
    }
    foreach (REGLAGES_CLES_EN_PLUS as $cle) {
        if (!array_key_exists($cle, $reference) && array_key_exists($cle, $valeur)) {
            $erreur = reglages_valeur(0, $valeur[$cle], $chemin . $cle, $profondeur);
            if ($erreur !== null) {
                return $erreur;
            }
        }
    }
    return null;
}

function reglages_valeur(mixed $ref, mixed $v, string $ici, int $profondeur): ?string
{
    if (is_array($ref)) {
        return reglages_meme_forme($ref, $v, $ici . '.', $profondeur + 1);
    }
    if (is_bool($ref)) {
        return is_bool($v) ? null : '« ' . $ici . ' » : oui ou non.';
    }
    if (is_int($ref) || is_float($ref)) {
        return (is_int($v) || is_float($v)) && is_finite((float) $v) && abs((float) $v) <= 100000 ? null : '« ' . $ici . ' » : un nombre.';
    }
    if (is_string($ref)) {
        return is_string($v) && preg_match('/^[a-z0-9:-]{1,40}$/', $v) ? null : '« ' . $ici . ' » : un mot court.';
    }
    return '« ' . $ici . ' » : réglage non modifiable.';
}

// La demande : une culture qui a son kit, un panneau connu, des réglages de la même forme que ceux du jeu.
function reglages_verifier(array $kits, string $culture, string $panneau, mixed $reglages): ?string
{
    if (!isset($kits[$culture])) {
        return 'Culture sans kit : « ' . $culture . ' ».';
    }
    if (!in_array($panneau, REGLAGES_PANNEAUX, true)) {
        return 'Panneau inconnu : « ' . $panneau . ' ».';
    }
    $reference = reglages_reference($kits[$culture], $panneau);
    if ($reference === null) {
        return 'Ce kit n\'a pas encore de réglages pour ce panneau.';
    }
    return reglages_meme_forme($reference, $reglages);
}

// Le dossier des réglages, protégé : pas de liste du dossier, aucun script exécuté.
function reglages_dossier(string $media): string
{
    $dossier = $media . '/reglages';
    if (!is_dir($dossier) && !mkdir($dossier, 0755, true) && !is_dir($dossier)) {
        throw new RuntimeException('Impossible de créer media/reglages/.');
    }
    $htaccess = $dossier . '/.htaccess';
    if (!is_file($htaccess)) {
        file_put_contents($htaccess, "# Réglages de la Design Lab : du JSON, jamais de script.\nOptions -Indexes -ExecCGI\n"
            . "RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar\n"
            . "<FilesMatch \"\\.(php|phtml|phar)\">\n  Require all denied\n</FilesMatch>\n"
            . "<IfModule mod_headers.c>\n  Header set X-Content-Type-Options \"nosniff\"\n  Header set Cache-Control \"no-cache\"\n</IfModule>\n");
    }
    return $dossier;
}

// Range l'enregistrement et met l'index à jour. Renvoie sa fiche.
function reglages_enregistrer(string $dossier, array $demande): array
{
    $id = gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $rep = $dossier . '/' . $id;
    if (!mkdir($rep, 0755)) {
        throw new RuntimeException('Impossible de créer le dossier de l\'enregistrement.');
    }
    $fiche = [
        'id' => $id,
        'date' => gmdate('c'),
        'culture' => $demande['culture'],
        'panneau' => $demande['panneau'],
        'reglages' => $demande['reglages'],
        'note' => $demande['note'],
        'auteur' => $demande['auteur'],
    ];
    file_put_contents($rep . '/reglage.json', json_encode($fiche, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_PRESERVE_ZERO_FRACTION) . "\n");
    reglages_reindexer($dossier);
    return $fiche;
}

// media/reglages/index.json : tous les enregistrements, les plus récents d'abord (lu par la Design Lab et par JC).
function reglages_reindexer(string $dossier): array
{
    $fiches = [];
    foreach (glob($dossier . '/*/reglage.json') ?: [] as $f) {
        $fiche = json_decode((string) file_get_contents($f), true);
        if (is_array($fiche)) {
            $fiches[] = $fiche;
        }
    }
    usort($fiches, static fn(array $a, array $b): int => strcmp($b['id'], $a['id']));
    $index = ['version' => 1, 'reglages' => $fiches];
    $tmp = $dossier . '/index.json.' . bin2hex(random_bytes(4));
    file_put_contents($tmp, json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION) . "\n", LOCK_EX);
    rename($tmp, $dossier . '/index.json');
    return $index;
}
