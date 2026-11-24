<?php
// L'atelier des tags dans la Design Lab (prototype-web/api/lib/atelier.php, prototype-web/design/api/atelier.php) :
// la forme de l'atelier, les versions (jamais d'écrasement), media/atelier/actuel.json, l'historique.
// Usage : php tests/atelier.test.php

declare(strict_types=1);

require __DIR__ . '/../prototype-web/api/lib/atelier.php';

function check(bool $ok, string $message): void
{
    if (!$ok) {
        fwrite(STDERR, "ÉCHEC : $message\n");
        exit(1);
    }
}

$root = dirname(__DIR__);
// La copie du dépôt (data/reference/tag-workshop.json) a la forme du moteur des tags : elle est acceptée telle quelle.
$copie = json_decode((string) file_get_contents($root . '/data/reference/tag-workshop.json'), true);
$doc = ['tags' => $copie['tags'], 'tests' => $copie['tests'], 'constantes' => $copie['constantes'], 'titres' => $copie['titres']];
check(count($doc['tags']) > 50 && count($doc['tests']) > 20, 'la copie du dépôt');
check(atelier_verifier($doc) === null, 'la copie du dépôt est acceptée : ' . (atelier_verifier($doc) ?? ''));
check(atelier_verifier(['tags' => [], 'tests' => [], 'constantes' => []]) === null, 'un atelier vide');
// Un atelier enregistré avant les titres (Idan, 2026-11-24) : ni titres, ni titre et mot court par tag.
$ancien = ['tags' => array_map(function ($t) { unset($t['titre'], $t['court'], $t['titre_fem'], $t['court_fem'], $t['seul']); return $t; }, $copie['tags']), 'tests' => $copie['tests'], 'constantes' => $copie['constantes']];
check(atelier_verifier($ancien) === null, 'un atelier d\'avant les titres : ' . (atelier_verifier($ancien) ?? ''));
check(count($doc['titres']['speciaux']) > 5 && $doc['tags'][5]['titre'] !== '', 'les titres de la copie du dépôt');

// Refusés : clés en trop ou manquantes, mauvais types, identifiants douteux, doublons, textes trop longs.
$mauvais = function (callable $f) use ($doc): ?string {
    $d = $doc;
    $f($d);
    return atelier_verifier($d);
};
check($mauvais(fn(&$d) => $d['script'] = 1) !== null, 'clé en trop');
check($mauvais(function (&$d) { unset($d['constantes']); }) !== null, 'clé manquante');
check($mauvais(fn(&$d) => $d['tags'][0]['html'] = '<b>') !== null, 'clé inconnue dans un tag');
check($mauvais(fn(&$d) => $d['tags'][0]['id'] = '<script>') !== null, 'identifiant douteux');
check($mauvais(fn(&$d) => $d['tags'][1]['id'] = $d['tags'][0]['id']) !== null, 'identifiant en double');
check($mauvais(fn(&$d) => $d['tags'][0]['nom'] = str_repeat('a', 400)) !== null, 'nom trop long');
check($mauvais(fn(&$d) => $d['tags'][0]['groupe'] = 1) !== null, 'oui/non en nombre');
check($mauvais(fn(&$d) => $d['tags'][0]['rang'] = '2') !== null, 'rang en texte');
check($mauvais(fn(&$d) => $d['tags'][0]['garder'] = 0) !== null, 'garder 0');
check($mauvais(fn(&$d) => $d['tags'][0]['parents'] = ['a' => 'b']) !== null, 'parents : un objet');
check($mauvais(fn(&$d) => $d['tests'][0]['type'] = 'autre') !== null, 'type de test inconnu');
check($mauvais(fn(&$d) => $d['tests'][0]['si'] = ['test' => 'x']) !== null, 'condition incomplète');
check($mauvais(fn(&$d) => $d['tests'][0]['paliers'] = [['id' => 'p', 'de' => 'x', 'nom' => '', 'elimine' => []]]) !== null, 'palier invalide');
check($mauvais(fn(&$d) => $d['constantes'][0]['valeur'] = INF) !== null, 'constante infinie');
check($mauvais(fn(&$d) => $d['tags'] = ['a' => $d['tags'][0]]) !== null, 'tags : un objet');
check($mauvais(function (&$d) { unset($d['tags'][3]['court']); }) !== null, 'un titre sans mot court');
check($mauvais(fn(&$d) => $d['tags'][3]['titre'] = 3) !== null, 'titre en nombre');
check($mauvais(fn(&$d) => $d['tags'][3]['seul'] = 1) !== null, 'titre seul en nombre');
check($mauvais(function (&$d) { unset($d['tags'][3]['titre_fem']); }) !== null, 'titre sans son genre');
check($mauvais(fn(&$d) => $d['titres']['speciaux'][0]['court_fem'] = 'oui') !== null, 'titre spécial : genre en texte');
check($mauvais(fn(&$d) => $d['titres']['longueur_max'] = 5000) !== null, 'longueur des titres hors bornes');
check($mauvais(fn(&$d) => $d['titres']['familles'] = ['<x>']) !== null, 'famille douteuse');
check($mauvais(fn(&$d) => $d['titres']['speciaux'][0]['html'] = '<b>') !== null, 'clé inconnue dans un titre spécial');
check($mauvais(fn(&$d) => $d['titres']['speciaux'][0]['tags'] = 'a') !== null, 'titre spécial : tags en texte');
check(atelier_verifier('x') !== null && atelier_verifier(null) !== null, 'pas un objet');

// Le rangement : media/atelier/, protégé ; les versions se suivent ; une version partie d'une ancienne est refusée.
$site = sys_get_temp_dir() . '/atelier-test-' . bin2hex(random_bytes(4));
$dossier = atelier_dossier($site . '/media');
check(is_file($dossier . '/.htaccess') && str_contains((string) file_get_contents($dossier . '/.htaccess'), 'Options -Indexes'), 'dossier protégé');
check(atelier_actuel($dossier) === null, 'pas encore de version');
$un = atelier_enregistrer($dossier, $doc, 0, 'première', 'idan');
check($un['ok'] && $un['fiche']['version'] === 1 && $un['fiche']['tags'] === count($doc['tags']), 'version 1');
$actuel = json_decode((string) file_get_contents($dossier . '/actuel.json'), true);
check($actuel['version'] === 1 && $actuel['doc'] === $doc && $actuel['note'] === 'première', 'actuel.json : la version 1, contenu compris');
$doc2 = $doc;
$doc2['constantes'][0]['valeur'] = 42.5;
$deux = atelier_enregistrer($dossier, $doc2, 1, '', '');
check($deux['ok'] && $deux['fiche']['version'] === 2, 'version 2');
$conflit = atelier_enregistrer($dossier, $doc, 1, '', '');
check(!$conflit['ok'] && $conflit['actuel']['version'] === 2 && !isset($conflit['actuel']['doc']), 'partie de la version 1 : refusée, sans écraser');
check(!atelier_enregistrer($dossier, $doc, 0, '', '')['ok'], 'partie de rien alors qu\'il y a des versions : refusée');
check(atelier_actuel($dossier)['doc']['constantes'][0]['valeur'] === 42.5, 'la version 2 est restée');
$index = json_decode((string) file_get_contents($dossier . '/index.json'), true);
check(array_column($index['historique'], 'version') === [2, 1] && !isset($index['historique'][0]['doc']), 'historique : le plus récent d\'abord, sans le contenu');
check(is_file($dossier . '/' . $un['fiche']['id'] . '/atelier.json'), 'la version 1 reste lisible');

// L'historique : les ATELIER_GARDER dernières versions, puis la dernière de chaque jour.
foreach ([['2026-01-01T10:00:00+00:00', 'a'], ['2026-01-01T18:00:00+00:00', 'b'], ['2026-01-02T09:00:00+00:00', 'c']] as $i => [$date, $nom]) {
    $id = '20260101-00000' . $i . '-ancien';
    mkdir($dossier . '/' . $id);
    file_put_contents($dossier . '/' . $id . '/atelier.json', json_encode(['version' => -10 + $i, 'id' => $id, 'date' => $date, 'auteur' => '', 'note' => $nom, 'doc' => $doc]));
}
for ($v = 3; $v <= ATELIER_GARDER + 2; $v++) {
    $id = sprintf('20990101-%06d-recent', $v);
    mkdir($dossier . '/' . $id);
    file_put_contents($dossier . '/' . $id . '/atelier.json', json_encode(['version' => $v, 'id' => $id, 'date' => '2099-01-01T00:00:00+00:00', 'auteur' => '', 'note' => '', 'doc' => $doc]));
}
$index = atelier_reindexer($dossier);
// Au-delà des ATELIER_GARDER plus récentes : la version 2 (la dernière de son jour), puis c et b ; la version 1 et a partent.
$notes = array_column(array_slice($index['historique'], ATELIER_GARDER), 'note');
check(count($index['historique']) === ATELIER_GARDER + 3, 'gardées : ' . ATELIER_GARDER . ' + une par jour plus ancien (' . count($index['historique']) . ')');
check($notes === ['', 'c', 'b'], 'la dernière de chaque jour ancien : ' . implode(',', $notes));
check(!is_dir($dossier . '/20260101-000000-ancien') && !is_dir($dossier . '/' . $un['fiche']['id']), 'les autres sont effacées');
check(atelier_actuel($dossier)['version'] === 2, 'actuel.json ne bouge pas');

echo "atelier tests ok\n";
