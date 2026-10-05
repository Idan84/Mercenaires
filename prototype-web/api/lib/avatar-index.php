<?php
// Blood & Wages — index des avatars déposés sur Hostinger.
//
// Liste les images d'un dossier (récursivement) et lit, pour chacune, ses dimensions et ses
// mots-clés (IPTC 2:25 et XMP dc:subject / lr:hierarchicalSubject, ceux qu'écrit Bridge).
// Aucun traitement d'image : les fichiers sont seulement lus. L'appariement plein pied / portrait et
// le classement des mots-clés se font côté jeu (game-core/avatar-catalog.js).
//
// Un cache (chemin, taille, date) évite de relire les images qui n'ont pas changé. Pour rester sous la
// limite de temps de l'hébergement, les images nouvelles sont lues dans un budget de quelques secondes :
// au-delà, la réponse est partielle (« complete »: false) et la lecture reprend à l'appel suivant.

declare(strict_types=1);

const AVATAR_INDEX_VERSION = 1;
const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function avatar_index(string $root, ?string $cacheFile = null, float $budgetSeconds = 8.0): array
{
    $cache = avatar_cache_read($cacheFile);
    $deadline = microtime(true) + $budgetSeconds;
    $files = [];
    $fresh = [];
    $changed = false;
    $complete = true;

    foreach (avatar_image_files($root) as $relative) {
        $absolute = $root . '/' . $relative;
        $stat = @stat($absolute);
        if ($stat === false) {
            continue;
        }
        $key = $relative;
        $hit = $cache[$key] ?? null;
        if ($hit !== null && $hit['size'] === $stat['size'] && $hit['mtime'] === $stat['mtime']) {
            $entry = $hit;
        } elseif (microtime(true) > $deadline) {
            $complete = false;
            continue;
        } else {
            $entry = avatar_read_file($absolute) + ['size' => $stat['size'], 'mtime' => $stat['mtime']];
            $changed = true;
        }
        $fresh[$key] = $entry;
        $files[] = ['path' => $relative, 'w' => $entry['w'], 'h' => $entry['h'], 'keywords' => $entry['keywords']];
    }

    if ($changed || count($fresh) !== count($cache)) {
        avatar_cache_write($cacheFile, $fresh);
    }
    return ['version' => AVATAR_INDEX_VERSION, 'complete' => $complete, 'files' => $files];
}

// Chemins relatifs (séparateur « / »), triés ; dossiers et fichiers cachés ignorés.
function avatar_image_files(string $root): array
{
    if (!is_dir($root)) {
        return [];
    }
    $out = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveCallbackFilterIterator(
            new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
            static fn (SplFileInfo $f) => $f->getFilename()[0] !== '.'
        )
    );
    foreach ($iterator as $file) {
        if (!$file->isFile() || !in_array(strtolower($file->getExtension()), AVATAR_EXTENSIONS, true)) {
            continue;
        }
        $out[] = str_replace(DIRECTORY_SEPARATOR, '/', substr($file->getPathname(), strlen($root) + 1));
    }
    sort($out, SORT_STRING);
    return $out;
}

function avatar_read_file(string $file): array
{
    $info = [];
    $size = @getimagesize($file, $info);
    return [
        'w' => $size ? (int) $size[0] : 0,
        'h' => $size ? (int) $size[1] : 0,
        'keywords' => avatar_keywords($file, $info),
    ];
}

function avatar_keywords(string $file, array $info): array
{
    $out = [];
    if (isset($info['APP13'])) {
        $iptc = @iptcparse($info['APP13']);
        foreach (($iptc['2#025'] ?? []) as $keyword) {
            $out[] = avatar_utf8((string) $keyword);
        }
    }
    $data = @file_get_contents($file);
    if (is_string($data) && preg_match_all('#<(dc:subject|lr:hierarchicalSubject)>(.*?)</\1>#s', $data, $bags)) {
        foreach ($bags[2] as $bag) {
            if (preg_match_all('#<rdf:li[^>]*>(.*?)</rdf:li>#s', $bag, $items)) {
                foreach ($items[1] as $item) {
                    $out[] = html_entity_decode(avatar_utf8($item), ENT_QUOTES | ENT_XML1, 'UTF-8');
                }
            }
        }
    }
    $out = array_map('trim', $out);
    return array_values(array_unique(array_filter($out, static fn ($k) => $k !== '')));
}

// Les mots-clés IPTC peuvent être en UTF-8 ou en Latin-1 selon le logiciel qui les a écrits.
function avatar_utf8(string $value): string
{
    if (preg_match('//u', $value) === 1) {
        return $value;
    }
    $converted = @iconv('ISO-8859-1', 'UTF-8', $value);
    return $converted === false ? '' : $converted;
}

function avatar_cache_read(?string $cacheFile): array
{
    if ($cacheFile === null || !is_file($cacheFile)) {
        return [];
    }
    $doc = json_decode((string) @file_get_contents($cacheFile), true);
    if (!is_array($doc) || ($doc['version'] ?? null) !== AVATAR_INDEX_VERSION || !is_array($doc['files'] ?? null)) {
        return [];
    }
    return $doc['files'];
}

function avatar_cache_write(?string $cacheFile, array $files): void
{
    if ($cacheFile === null) {
        return;
    }
    $dir = dirname($cacheFile);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        return;
    }
    $deny = $dir . '/.htaccess';
    if (!is_file($deny)) {
        @file_put_contents($deny, "Require all denied\n");
    }
    $json = json_encode(['version' => AVATAR_INDEX_VERSION, 'files' => $files], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tmp = $cacheFile . '.' . getmypid() . '.tmp';
    if ($json !== false && @file_put_contents($tmp, $json) !== false) {
        @rename($tmp, $cacheFile);
    }
}
