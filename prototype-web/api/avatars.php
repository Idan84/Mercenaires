<?php
// Blood & Wages — index des avatars qu'Idan dépose directement sur Hostinger, dans media/avatars/.
// Réponse : {"version":1,"complete":true,"files":[{"path":"Ogres/Ogre_12_….jpg","w":…,"h":…,"keywords":[…]}]}.
// Le jeu en tire son catalogue (game-core/avatar-catalog.js). Voir docs/DEPLOYMENT.md.

declare(strict_types=1);

require __DIR__ . '/lib/avatar-index.php';

$index = avatar_index(dirname(__DIR__) . '/media/avatars', __DIR__ . '/.cache/avatars-index.json');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
