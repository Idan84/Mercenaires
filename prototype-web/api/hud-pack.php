<?php
// Blood & Wages — index des packs de barre (HUD) qu'Idan dépose sur Hostinger, dans media/hud-pack/ et ses sous-dossiers :
// un pack par culture du capitaine, 32 en tout, qui arrivent petit à petit (Idan, 2026-11-13). Même bibliothèque que les
// avatars ; majuscules indifférentes. Voir docs/DEPLOYMENT.md.
// Réponse : {"version":1,"base":"media/hud-pack","complete":true,
//            "files":[{"path":"…/….png","w":…,"h":…,"keywords":[…]}]}.

declare(strict_types=1);

require __DIR__ . '/lib/avatar-index.php';

$site = dirname(__DIR__);
$base = avatar_find_dir($site, ['media', 'hud-pack']);
$index = $base === null
    ? ['version' => AVATAR_INDEX_VERSION, 'complete' => true, 'files' => []]
    : avatar_index($site . '/' . $base, __DIR__ . '/.cache/hud-pack-index.json');
$index = ['version' => $index['version'], 'base' => $base ?? 'media/hud-pack'] + $index;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
