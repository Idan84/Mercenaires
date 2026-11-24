<?php
// Blood & Wages — l'atelier des tags dans la Design Lab (Idan, 2026-11-22 : « je veux que le jeu lise les datas de
// l'atelier, que l'atelier soit une sorte de base admin de gestion du jeu »). L'atelier (tags, tests, constantes ; doc 20
// §11 et §12) est rangé sur Hostinger, dans media/atelier/ :
// - media/atelier/actuel.json : la dernière version, lue par le jeu et par l'atelier ;
// - media/atelier/<id>/atelier.json : chaque version enregistrée (l'historique, pour ne jamais perdre le fil) ;
// - media/atelier/index.json : l'historique, le plus récent d'abord (sans le contenu).
// Une version n'est enregistrée que sur la dernière (numéro attendu) : deux onglets ne s'écrasent pas.
// Les données ont la forme que le moteur des tags produit (game-core/tag-engine.js, clean) : rien d'autre n'est gardé.

declare(strict_types=1);

const ATELIER_MAX_OCTETS = 2 * 1024 * 1024;
const ATELIER_MAX = ['tags' => 3000, 'tests' => 3000, 'constantes' => 1000, 'liens' => 500, 'speciaux' => 2000];
const ATELIER_TEXTE_COURT = 300;
const ATELIER_TEXTE_LONG = 8000;
// L'historique : les 200 dernières versions, puis la dernière de chaque jour.
const ATELIER_GARDER = 200;

function atelier_id_valide(mixed $id): bool
{
    return is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id) === 1;
}

// Une liste JSON (0, 1, 2…), sans array_is_list (PHP 8.1) : Hostinger peut avoir un PHP plus ancien.
function atelier_est_liste(mixed $v): bool
{
    return is_array($v) && ($v === [] || array_keys($v) === range(0, count($v) - 1));
}

function atelier_texte(mixed $v, int $max): bool
{
    return is_string($v) && mb_strlen($v) <= $max;
}

function atelier_nombre(mixed $v): bool
{
    return (is_int($v) || is_float($v)) && is_finite((float) $v) && abs((float) $v) <= 1e9;
}

function atelier_liste_ids(mixed $v): bool
{
    if (!is_array($v) || !atelier_est_liste($v) || count($v) > ATELIER_MAX['liens']) {
        return false;
    }
    foreach ($v as $id) {
        if (!atelier_id_valide($id)) {
            return false;
        }
    }
    return true;
}

// Les clés d'un objet : exactement celles-là.
function atelier_cles(mixed $v, array $cles): bool
{
    if (!is_array($v) || ($v !== [] && atelier_est_liste($v))) {
        return false;
    }
    $a = array_keys($v);
    sort($a);
    sort($cles);
    return $a === $cles;
}

// Vérifie un atelier : {tags, tests, constantes, titres}, chacun de la forme de clean (game-core/tag-engine.js). Les
// titres (Idan, 2026-11-24) : un atelier enregistré avant eux n'en a pas (ni de titre, ni de mot court par tag).
// Renvoie l'erreur ou null.
function atelier_verifier(mixed $doc): ?string
{
    if (!atelier_cles($doc, ['tags', 'tests', 'constantes']) && !atelier_cles($doc, ['tags', 'tests', 'constantes', 'titres'])) {
        return 'Atelier mal formé : tags, tests et constantes attendus.';
    }
    foreach (['tags', 'tests', 'constantes'] as $cle) {
        if (!is_array($doc[$cle]) || !atelier_est_liste($doc[$cle]) || count($doc[$cle]) > ATELIER_MAX[$cle]) {
            return 'Atelier mal formé : « ' . $cle . ' ».';
        }
    }
    $ids = [];
    foreach ($doc['tags'] as $i => $t) {
        $ici = 'tag ' . ($i + 1);
        $base = ['id', 'nom', 'parents', 'groupe', 'note', 'rang', 'garder', 'inactif'];
        if (!atelier_cles($t, $base) && !atelier_cles($t, array_merge($base, ['titre', 'court']))) {
            return $ici . ' : mal formé.';
        }
        if (array_key_exists('titre', $t) && (!atelier_texte($t['titre'], ATELIER_TEXTE_COURT) || !atelier_texte($t['court'], ATELIER_TEXTE_COURT))) {
            return $ici . ' : titre ou mot court invalide.';
        }
        if (!atelier_id_valide($t['id']) || isset($ids[$t['id']])) {
            return $ici . ' : identifiant invalide ou en double.';
        }
        $ids[$t['id']] = true;
        if (!atelier_texte($t['nom'], ATELIER_TEXTE_COURT) || !atelier_texte($t['note'], ATELIER_TEXTE_LONG)
            || !atelier_liste_ids($t['parents']) || !is_bool($t['groupe']) || !is_bool($t['inactif'])
            || ($t['rang'] !== null && !atelier_nombre($t['rang']))
            || ($t['garder'] !== null && (!is_int($t['garder']) || $t['garder'] < 1 || $t['garder'] > 1000))) {
            return $ici . ' (« ' . mb_substr((string) (is_string($t['nom']) ? $t['nom'] : ''), 0, 60) . ' ») : valeur invalide.';
        }
    }
    $testIds = [];
    foreach ($doc['tests'] as $i => $x) {
        $ici = 'test ' . ($i + 1);
        if (!atelier_cles($x, ['id', 'nom', 'type', 'formule', 'calcul', 'aReecrire', 'oui', 'non', 'paliers', 'si'])) {
            return $ici . ' : mal formé.';
        }
        if (!atelier_id_valide($x['id']) || isset($testIds[$x['id']])) {
            return $ici . ' : identifiant invalide ou en double.';
        }
        $testIds[$x['id']] = true;
        if (!atelier_texte($x['nom'], ATELIER_TEXTE_COURT) || !in_array($x['type'], ['binaire', 'niveau'], true)
            || !atelier_texte($x['formule'], ATELIER_TEXTE_LONG) || !atelier_texte($x['calcul'], ATELIER_TEXTE_LONG)
            || !is_bool($x['aReecrire']) || !atelier_liste_ids($x['oui']) || !atelier_liste_ids($x['non'])
            || !is_array($x['paliers']) || !atelier_est_liste($x['paliers']) || count($x['paliers']) > 100) {
            return $ici . ' (« ' . mb_substr((string) (is_string($x['nom']) ? $x['nom'] : ''), 0, 60) . ' ») : valeur invalide.';
        }
        foreach ($x['paliers'] as $p) {
            if (!atelier_cles($p, ['id', 'de', 'nom', 'elimine']) || !atelier_id_valide($p['id']) || !atelier_texte($p['nom'], ATELIER_TEXTE_COURT)
                || ($p['de'] !== null && !atelier_nombre($p['de'])) || !atelier_liste_ids($p['elimine'])) {
                return $ici . ' : palier invalide.';
            }
        }
        if ($x['si'] !== null && (!atelier_cles($x['si'], ['test', 'rep']) || !atelier_id_valide($x['si']['test']) || !atelier_id_valide($x['si']['rep']))) {
            return $ici . ' : condition invalide.';
        }
    }
    foreach ($doc['constantes'] as $i => $c) {
        if (!atelier_cles($c, ['id', 'nom', 'valeur', 'note']) || !atelier_id_valide($c['id']) || !atelier_texte($c['nom'], ATELIER_TEXTE_COURT)
            || !atelier_nombre($c['valeur']) || !atelier_texte($c['note'], ATELIER_TEXTE_LONG)) {
            return 'constante ' . ($i + 1) . ' : valeur invalide.';
        }
    }
    if (array_key_exists('titres', $doc)) {
        $ti = $doc['titres'];
        if (!atelier_cles($ti, ['longueur_max', 'suivants_max', 'familles', 'speciaux'])
            || !is_int($ti['longueur_max']) || $ti['longueur_max'] < 10 || $ti['longueur_max'] > 200
            || !is_int($ti['suivants_max']) || $ti['suivants_max'] < 0 || $ti['suivants_max'] > 5
            || !atelier_liste_ids($ti['familles']) || !is_array($ti['speciaux']) || !atelier_est_liste($ti['speciaux'])
            || count($ti['speciaux']) > ATELIER_MAX['speciaux']) {
            return 'Titres mal formés.';
        }
        foreach ($ti['speciaux'] as $i => $sp) {
            if (!atelier_cles($sp, ['id', 'tags', 'titre', 'court']) || !atelier_id_valide($sp['id']) || !atelier_liste_ids($sp['tags'])
                || !atelier_texte($sp['titre'], ATELIER_TEXTE_COURT) || !atelier_texte($sp['court'], ATELIER_TEXTE_COURT)) {
                return 'titre spécial ' . ($i + 1) . ' : valeur invalide.';
            }
        }
    }
    return null;
}

// Le dossier de l'atelier, protégé : pas de liste du dossier, aucun script exécuté.
function atelier_dossier(string $media): string
{
    $dossier = $media . '/atelier';
    if (!is_dir($dossier) && !mkdir($dossier, 0755, true) && !is_dir($dossier)) {
        throw new RuntimeException('Impossible de créer media/atelier/.');
    }
    $htaccess = $dossier . '/.htaccess';
    if (!is_file($htaccess)) {
        file_put_contents($htaccess, "# Atelier des tags de la Design Lab : du JSON, jamais de script.\nOptions -Indexes -ExecCGI\n"
            . "RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar\n"
            . "<FilesMatch \"\\.(php|phtml|phar)\">\n  Require all denied\n</FilesMatch>\n"
            . "<IfModule mod_headers.c>\n  Header set X-Content-Type-Options \"nosniff\"\n  Header set Cache-Control \"no-cache\"\n</IfModule>\n");
    }
    return $dossier;
}

// La dernière version, ou null s'il n'y en a pas encore.
function atelier_actuel(string $dossier): ?array
{
    $actuel = json_decode((string) @file_get_contents($dossier . '/actuel.json'), true);
    return is_array($actuel) && is_int($actuel['version'] ?? null) ? $actuel : null;
}

function atelier_ecrire(string $fichier, array $contenu, int $options = 0): void
{
    $tmp = $fichier . '.' . bin2hex(random_bytes(4));
    file_put_contents($tmp, json_encode($contenu, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | $options) . "\n", LOCK_EX);
    rename($tmp, $fichier);
}

// Enregistre une nouvelle version, si la demande part de la dernière ($attendue : son numéro, 0 s'il n'y en a pas).
// Renvoie ['ok' => true, 'fiche' => …] ou ['ok' => false, 'actuel' => la dernière version (sans le contenu)].
function atelier_enregistrer(string $dossier, array $doc, int $attendue, string $note, string $auteur): array
{
    $verrou = fopen($dossier . '/.verrou', 'c');
    if ($verrou === false || !flock($verrou, LOCK_EX)) {
        throw new RuntimeException('Atelier occupé, réessaie.');
    }
    try {
        $actuel = atelier_actuel($dossier);
        $version = $actuel['version'] ?? 0;
        if ($attendue !== $version) {
            return ['ok' => false, 'actuel' => $actuel === null ? null : atelier_sans_contenu($actuel)];
        }
        $id = gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
        if (!mkdir($dossier . '/' . $id, 0755)) {
            throw new RuntimeException('Impossible de créer le dossier de la version.');
        }
        $fiche = [
            'version' => $version + 1,
            'id' => $id,
            'date' => gmdate('c'),
            'auteur' => $auteur,
            'note' => $note,
            'doc' => $doc,
        ];
        atelier_ecrire($dossier . '/' . $id . '/atelier.json', $fiche);
        atelier_ecrire($dossier . '/actuel.json', $fiche);
        atelier_reindexer($dossier);
        return ['ok' => true, 'fiche' => atelier_sans_contenu($fiche)];
    } finally {
        flock($verrou, LOCK_UN);
        fclose($verrou);
    }
}

function atelier_sans_contenu(array $fiche): array
{
    $doc = $fiche['doc'] ?? [];
    unset($fiche['doc']);
    foreach (['tags', 'tests', 'constantes'] as $cle) {
        $fiche[$cle] = is_array($doc[$cle] ?? null) ? count($doc[$cle]) : 0;
    }
    return $fiche;
}

// media/atelier/index.json : l'historique, le plus récent d'abord. Garde les ATELIER_GARDER dernières versions, puis la
// dernière de chaque jour ; les autres sont effacées.
function atelier_reindexer(string $dossier): array
{
    $fiches = [];
    foreach (glob($dossier . '/*/atelier.json') ?: [] as $f) {
        $fiche = json_decode((string) file_get_contents($f), true);
        if (is_array($fiche) && is_int($fiche['version'] ?? null)) {
            $fiches[] = ['fichier' => $f, 'fiche' => atelier_sans_contenu($fiche)];
        }
    }
    usort($fiches, static fn(array $a, array $b): int => $b['fiche']['version'] <=> $a['fiche']['version']);
    $gardees = [];
    $jours = [];
    foreach ($fiches as $i => $f) {
        $jour = substr((string) $f['fiche']['date'], 0, 10);
        if ($i < ATELIER_GARDER || !isset($jours[$jour])) {
            $gardees[] = $f['fiche'];
        } else {
            @unlink($f['fichier']);
            @rmdir(dirname($f['fichier']));
        }
        $jours[$jour] = true;
    }
    $index = ['version' => 1, 'historique' => $gardees];
    atelier_ecrire($dossier . '/index.json', $index);
    return $index;
}
