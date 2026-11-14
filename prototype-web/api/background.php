<?php
// Blood & Wages — index des décors qu'Idan dépose sur Hostinger, dans media/background/ et ses sous-dossiers (la Taverne,
// ses variantes du tavernier sur fond vert, Idan, 2026-11-14 ; majuscules indifférentes). Les variantes
// sont détourées et rangées dans le jeu (prototype-web/assets/taverne/). Voir docs/DEPLOYMENT.md.
// Réponse : {"version":1,"base":"media/background","complete":true,
//            "files":[{"path":"Taverne/…/….png","w":…,"h":…,"keywords":[…]}]}.

declare(strict_types=1);

require __DIR__ . '/lib/avatar-index.php';

$site = dirname(__DIR__);
$base = avatar_find_dir($site, ['media', 'background']);
$index = $base === null
    ? ['version' => AVATAR_INDEX_VERSION, 'complete' => true, 'files' => []]
    : avatar_index($site . '/' . $base, __DIR__ . '/.cache/background-index.json');
$index = ['version' => $index['version'], 'base' => $base ?? 'media/background'] + $index;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
