<?php
// Blood & Wages — index des images d'équipement qu'Idan dépose sur Hostinger, dans media/equipements/ et ses
// sous-dossiers (« armures/… » : une image par armure et par tier ; « Frames/… » : les cadres de tier ;
// majuscules indifférentes). Voir docs/DEPLOYMENT.md.
// Réponse : {"version":1,"base":"media/equipements","complete":true,
//            "files":[{"path":"armures/….png","w":…,"h":…,"keywords":[…]}]}.

declare(strict_types=1);

require __DIR__ . '/lib/avatar-index.php';

$site = dirname(__DIR__);
$base = avatar_find_dir($site, ['media', 'equipements']);
$index = $base === null
    ? ['version' => AVATAR_INDEX_VERSION, 'complete' => true, 'files' => []]
    : avatar_index($site . '/' . $base, __DIR__ . '/.cache/equipment-index.json');
$index = ['version' => $index['version'], 'base' => $base ?? 'media/equipements'] + $index;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
