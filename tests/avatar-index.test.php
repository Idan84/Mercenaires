<?php
// Index des avatars sur Hostinger (prototype-web/api/lib/avatar-index.php) : fichiers, dimensions,
// mots-clés IPTC et XMP, cache. Usage : php tests/avatar-index.test.php

declare(strict_types=1);

require __DIR__ . '/../prototype-web/api/lib/avatar-index.php';

function check(bool $ok, string $message): void
{
    if (!$ok) {
        fwrite(STDERR, "ÉCHEC : $message\n");
        exit(1);
    }
}

// Images minuscules : 1×2 (plein pied), 2×2 (portrait).
$tall = base64_decode('/9j/4AAQSkZJRgABAQAAAAAAAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAACAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AJ//Z');
$square = base64_decode('/9j/4AAQSkZJRgABAQAAAAAAAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AJ//Z');
$png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAAAAABX3VL4AAAADklEQVQI12OsY2BiYAAAAogAgvUbKvUAAAAASUVORK5CYII=');

// Mots-clés IPTC (2:25), comme les écrit Bridge.
function with_iptc(string $jpeg, array $keywords, string $dir): string
{
    $iptc = '';
    foreach ($keywords as $k) {
        $iptc .= chr(0x1C) . chr(2) . chr(25) . pack('n', strlen($k)) . $k;
    }
    $tmp = $dir . '/.tmp.jpg';
    file_put_contents($tmp, $jpeg);
    $out = iptcembed($iptc, $tmp);
    unlink($tmp);
    return $out;
}

// Mots-clés XMP (segment APP1), comme les écrit Bridge.
function with_xmp(string $jpeg, array $subject, array $hierarchical): string
{
    $li = static fn (array $values) => implode('', array_map(static fn ($v) => '<rdf:li>' . htmlspecialchars($v, ENT_XML1) . '</rdf:li>', $values));
    $xmp = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
        . '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:lr="http://ns.adobe.com/lightroom/1.0/">'
        . '<dc:subject><rdf:Bag>' . $li($subject) . '</rdf:Bag></dc:subject>'
        . '<lr:hierarchicalSubject><rdf:Bag>' . $li($hierarchical) . '</rdf:Bag></lr:hierarchicalSubject>'
        . '</rdf:Description></rdf:RDF></x:xmpmeta>';
    $payload = "http://ns.adobe.com/xap/1.0/\0" . $xmp;
    return substr($jpeg, 0, 2) . "\xFF\xE1" . pack('n', strlen($payload) + 2) . $payload . substr($jpeg, 2);
}

$root = sys_get_temp_dir() . '/bw-avatars-' . getmypid();
$media = $root . '/media/avatars';
$cache = $root . '/api/.cache/avatars-index.json';
mkdir($media . '/Ogres', 0777, true);
mkdir($media . '/.cache', 0777, true);

file_put_contents($media . '/Ogres/Ogre_12_été.jpg', with_iptc($tall, ['Blood&Wages|Gender|F', 'Arbalète', "Ogres des cit\xE9s humaines"], $root));
file_put_contents($media . '/Ogres/Ogre_12_Square.jpg', with_xmp($square, ['Eau', 'Blood&Wages'], ['Blood&Wages|Magie|Eau']));
file_put_contents($media . '/Ogres/Ogre_13.png', $png);
file_put_contents($media . '/Ogres/notes.txt', 'pas une image');
file_put_contents($media . '/.DS_Store', 'caché');
file_put_contents($media . '/.cache/Ogre_99.jpg', $tall);

// Dossier absent : index vide, pas d'erreur.
check(avatar_index($root . '/absent') === ['version' => 1, 'complete' => true, 'files' => []], 'dossier absent');

// Budget de temps épuisé : réponse partielle, rien n'est mis en cache à tort, la lecture reprend ensuite.
$partial = avatar_index($media, $cache, -1.0);
check($partial['complete'] === false && $partial['files'] === [], 'budget épuisé : réponse partielle');

$index = avatar_index($media, $cache);
check($index['complete'] === true, 'index complet');
$paths = array_column($index['files'], 'path');
check($paths === ['Ogres/Ogre_12_Square.jpg', 'Ogres/Ogre_12_été.jpg', 'Ogres/Ogre_13.png'], 'fichiers listés : ' . json_encode($paths, JSON_UNESCAPED_UNICODE));
$byPath = array_column($index['files'], null, 'path');

$full = $byPath['Ogres/Ogre_12_été.jpg'];
check([$full['w'], $full['h']] === [1, 2], 'dimensions du plein pied');
check($full['keywords'] === ['Blood&Wages|Gender|F', 'Arbalète', 'Ogres des cités humaines'], 'IPTC (UTF-8 et Latin-1) : ' . json_encode($full['keywords'], JSON_UNESCAPED_UNICODE));

$portrait = $byPath['Ogres/Ogre_12_Square.jpg'];
check([$portrait['w'], $portrait['h']] === [2, 2], 'dimensions du portrait');
check($portrait['keywords'] === ['Eau', 'Blood&Wages', 'Blood&Wages|Magie|Eau'], 'XMP : ' . json_encode($portrait['keywords'], JSON_UNESCAPED_UNICODE));
check($byPath['Ogres/Ogre_13.png']['keywords'] === [], 'image sans mot-clé');

// Cache : réponse identique ; une image modifiée est relue.
check(is_file($cache) && is_file(dirname($cache) . '/.htaccess'), 'cache écrit et protégé');
check(avatar_index($media, $cache) === $index, 'réponse identique depuis le cache');
file_put_contents($media . '/Ogres/Ogre_13.png', with_xmp($tall, ['Feu'], []));
touch($media . '/Ogres/Ogre_13.png', time() + 5);
$again = array_column(avatar_index($media, $cache)['files'], null, 'path');
check($again['Ogres/Ogre_13.png']['keywords'] === ['Feu'] && $again['Ogres/Ogre_13.png']['h'] === 2, 'image modifiée relue');
unlink($media . '/Ogres/Ogre_13.png');
check(count(avatar_index($media, $cache)['files']) === 2, 'image supprimée retirée');

// Dossier des avatars : majuscules indifférentes ; la variante qui contient des images l'emporte.
$site = $root . '/site';
check(avatar_find_dir($site, ['media', 'avatars']) === null, 'aucun dossier media/avatars');
mkdir($site . '/Media/Avatars/Orcs', 0777, true);
file_put_contents($site . '/Media/Avatars/Orcs/Orc_1.jpg', $tall);
check(avatar_find_dir($site, ['media', 'avatars']) === 'Media/Avatars', 'Media/Avatars trouvé');
mkdir($site . '/media/avatars', 0777, true);
check(avatar_find_dir($site, ['media', 'avatars']) === 'Media/Avatars', 'variante avec images préférée à un dossier vide');
file_put_contents($site . '/media/avatars/Orc_2.jpg', $tall);
check(avatar_find_dir($site, ['media', 'avatars']) === 'media/avatars', 'orthographe exacte préférée à égalité');
file_put_contents($site . '/MEDIA', 'un fichier, pas un dossier');
check(avatar_find_dir($site, ['media', 'avatars']) === 'media/avatars', 'fichier homonyme ignoré');

// Cache lié au dossier indexé : changer de dossier le refait.
$siteCache = $root . '/site-cache.json';
avatar_index($site . '/Media/Avatars', $siteCache);
check(json_decode(file_get_contents($siteCache), true)['root'] === $site . '/Media/Avatars', 'cache marqué de son dossier');
$other = avatar_index($site . '/media/avatars', $siteCache);
check(array_column($other['files'], 'path') === ['Orc_2.jpg'], 'autre dossier indexé');
check(json_decode(file_get_contents($siteCache), true)['root'] === $site . '/media/avatars', "cache refait pour l'autre dossier");

exec('rm -rf ' . escapeshellarg($root));
echo json_encode(['ok' => true]), "\n";
