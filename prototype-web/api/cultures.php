<?php
// Blood & Wages — index des images par culture qu'Idan dépose sur Hostinger, dans media/cultures/<peuple>/<culture>/
// (Barre_haut.png, picto.png… : data/reference/culture-media.json ; majuscules indifférentes). Pour chaque image, sa date
// (« v ») : le jeu l'ajoute à l'adresse, pour qu'une image remplacée sous le même nom soit relue malgré le cache de
// 7 jours ; et sa taille réelle sur le disque (le CDN peut servir les grandes images réduites). Voir docs/DEPLOYMENT.md.
// Réponse : {"version":1,"base":"media/cultures","files":[{"path":"elfes/elfes_sylvains/Barre_haut.png","v":…,"w":…,"h":…}]}.

declare(strict_types=1);

require __DIR__ . '/lib/avatar-index.php';

$site = dirname(__DIR__);
$base = avatar_find_dir($site, ['media', 'cultures']);
$files = [];
if ($base !== null) {
    $root = $site . '/' . $base;
    foreach (avatar_image_files($root) as $relative) {
        $absolute = $root . '/' . $relative;
        $mtime = @filemtime($absolute);
        if ($mtime === false) {
            continue;
        }
        $size = @getimagesize($absolute);
        $files[] = ['path' => $relative, 'v' => $mtime, 'w' => $size ? (int) $size[0] : 0, 'h' => $size ? (int) $size[1] : 0];
    }
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode(['version' => 1, 'base' => $base ?? 'media/cultures', 'files' => $files], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
