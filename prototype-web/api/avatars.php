<?php
// Blood & Wages — index des avatars qu'Idan dépose directement sur Hostinger, dans media/avatars/
// (majuscules indifférentes : « Media/Avatars » convient aussi).
// Réponse : {"version":1,"base":"media/avatars","complete":true,
//            "files":[{"path":"Ogres/Ogre_12_….jpg","w":…,"h":…,"keywords":[…]}]}.
// « base » est le dossier réellement trouvé, avec ses majuscules : le jeu s'en sert pour les adresses
// des images (game-core/avatar-catalog.js). Voir docs/DEPLOYMENT.md.

declare(strict_types=1);

require __DIR__ . '/lib/avatar-index.php';

$site = dirname(__DIR__);
$base = avatar_find_dir($site, ['media', 'avatars']);
$index = $base === null
    ? ['version' => AVATAR_INDEX_VERSION, 'complete' => true, 'files' => []]
    : avatar_index($site . '/' . $base, __DIR__ . '/.cache/avatars-index.json');
$index = ['version' => $index['version'], 'base' => $base ?? 'media/avatars'] + $index;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
