<?php
// Blood & Wages — index des pictos qu'Idan dépose sur Hostinger, dans media/pictos/ et ses sous-dossiers
// (« Culture/… » ; majuscules indifférentes). Les fichiers sont des masters sur fond blanc, détourés ensuite
// par scripts/build-pictos.sh comme ceux des peuples et des ascendances. Voir docs/DEPLOYMENT.md.
// Réponse : {"version":1,"base":"media/pictos","complete":true,
//            "files":[{"path":"Culture/….jpg","w":…,"h":…,"keywords":[…]}]}.

declare(strict_types=1);

require __DIR__ . '/lib/avatar-index.php';

$site = dirname(__DIR__);
$base = avatar_find_dir($site, ['media', 'pictos']);
$index = $base === null
    ? ['version' => AVATAR_INDEX_VERSION, 'complete' => true, 'files' => []]
    : avatar_index($site . '/' . $base, __DIR__ . '/.cache/pictos-index.json');
$index = ['version' => $index['version'], 'base' => $base ?? 'media/pictos'] + $index;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
