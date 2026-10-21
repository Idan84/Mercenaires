<?php
// Blood & Wages — index des silhouettes d'équipement qu'Idan dépose sur Hostinger, dans
// media/Avatars_Equipements/ (majuscules indifférentes). Une image par peuple et par sexe, affichée en
// multiply dans l'onglet Équipement de la fiche (game-core/avatar-catalog.js, buildSilhouetteCatalog).
// Réponse : {"version":1,"base":"media/Avatars_Equipements","complete":true,
//            "files":[{"path":"Orc_Femme.jpg","w":…,"h":…,"keywords":[…]}]}. Voir docs/DEPLOYMENT.md.

declare(strict_types=1);

require __DIR__ . '/lib/avatar-index.php';

$site = dirname(__DIR__);
$base = avatar_find_dir($site, ['media', 'avatars_equipements']);
$index = $base === null
    ? ['version' => AVATAR_INDEX_VERSION, 'complete' => true, 'files' => []]
    : avatar_index($site . '/' . $base, __DIR__ . '/.cache/silhouettes-index.json');
$index = ['version' => $index['version'], 'base' => $base ?? 'media/Avatars_Equipements'] + $index;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
