<?php
// Réglages des kits de culture depuis la Design Lab (prototype-web/api/lib/reglages.php,
// prototype-web/design/api/reglages.php) : la demande, la forme des réglages, le rangement dans media/reglages/, l'index.
// Usage : php tests/reglages.test.php

declare(strict_types=1);

require __DIR__ . '/../prototype-web/api/lib/reglages.php';

function check(bool $ok, string $message): void
{
    if (!$ok) {
        fwrite(STDERR, "ÉCHEC : $message\n");
        exit(1);
    }
}

$root = dirname(__DIR__);
// Un site minimal : les kits, comme scripts/build-site.sh les publie dans data/.
$site = sys_get_temp_dir() . '/reglages-test-' . bin2hex(random_bytes(4));
mkdir($site . '/data', 0755, true);
copy($root . '/data/reference/culture-kits.json', $site . '/data/culture-kits.json');
$kits = reglages_kits($site);
check(isset($kits['elfes-noirs'], $kits['elfes-sylvains'], $kits['elfes-des-grandes-cites']), 'les trois kits elfes');

// Les réglages du jeu sont acceptés tels quels, pour les trois panneaux.
foreach ($kits as $cle => $kit) {
    foreach (REGLAGES_PANNEAUX as $panneau) {
        check(reglages_verifier($kits, $cle, $panneau, reglages_reference($kit, $panneau)) === null, "$cle $panneau : valeurs du jeu");
    }
}
$fiche = $kits['elfes-noirs']['fiche'];
$barres = $kits['elfes-noirs']['barres'];
// Des nombres changés, un mot choisi dans une liste, un oui/non : acceptés.
$f = $fiche;
$f['cadre']['ep'] = 18.5;
$f['coins']['hg']['sens'] = 'rotation';
$f['separation']['jonctions'] = false;
check(reglages_verifier($kits, 'elfes-noirs', 'fiche', $f) === null, 'fiche réglée');
$b = $barres;
$b['contenu'] = 'dore';
$b['inactifs'] = 50;
check(reglages_verifier($kits, 'elfes-noirs', 'barres', $b) === null, 'barres dorées, pictos inactifs');
$p = reglages_reference($kits['elfes-noirs'], 'plein');
$p['largeur'] = '16:9';
$p['barre']['margeGauche'] = 85.5;
$p['ornementsCoin']['hg']['modele'] = 'aucun';
check(reglages_verifier($kits, 'elfes-noirs', 'plein', $p) === null, 'fiche complète plafonnée à 16:9');

// Refusés : culture sans kit, panneau inconnu, clé inconnue ou manquante, mauvais type, texte libre, liste, trop profond.
check(reglages_verifier($kits, 'orcs-des-steppes', 'fiche', $fiche) !== null, 'culture sans kit');
check(reglages_verifier($kits, 'elfes-noirs', 'carte', $fiche) !== null, 'panneau inconnu');
check(reglages_verifier($kits, 'elfes-noirs', 'fiche', $fiche + ['script' => 1]) !== null, 'clé inconnue');
$f = $fiche; unset($f['cadre']);
check(reglages_verifier($kits, 'elfes-noirs', 'fiche', $f) !== null, 'clé manquante');
$f = $fiche; $f['cadre']['ep'] = '16';
check(reglages_verifier($kits, 'elfes-noirs', 'fiche', $f) !== null, 'nombre en texte');
$f = $fiche; $f['nom'] = '<script>';
check(reglages_verifier($kits, 'elfes-noirs', 'fiche', $f) !== null, 'mot non sûr');
$f = $fiche; $f['separation']['jonctions'] = 1;
check(reglages_verifier($kits, 'elfes-noirs', 'fiche', $f) !== null, 'oui/non en nombre');
$f = $fiche; $f['cadre'] = [16];
check(reglages_verifier($kits, 'elfes-noirs', 'fiche', $f) !== null, 'liste à la place d\'un objet');
$f = $fiche; $f['cadre']['ep'] = 1e9;
check(reglages_verifier($kits, 'elfes-noirs', 'fiche', $f) !== null, 'nombre démesuré');
check(reglages_verifier($kits, 'elfes-noirs', 'fiche', 'x') !== null, 'pas un objet');
check(reglages_verifier($kits, 'elfes-noirs', 'barres', $fiche) !== null, 'réglages d\'un autre panneau');

// Le rangement : media/reglages/<id>/reglage.json et l'index, le plus récent d'abord ; le dossier est protégé.
$dossier = reglages_dossier($site . '/media');
check(is_file($dossier . '/.htaccess') && str_contains((string) file_get_contents($dossier . '/.htaccess'), 'Options -Indexes'), 'dossier protégé');
$un = reglages_enregistrer($dossier, ['culture' => 'elfes-noirs', 'panneau' => 'plein', 'reglages' => $p, 'note' => 'essai', 'auteur' => '']);
sleep(1);
$deux = reglages_enregistrer($dossier, ['culture' => 'elfes-sylvains', 'panneau' => 'fiche', 'reglages' => $kits['elfes-sylvains']['fiche'], 'note' => '', 'auteur' => '']);
$index = json_decode((string) file_get_contents($dossier . '/index.json'), true);
check(count($index['reglages']) === 2 && $index['reglages'][0]['id'] === $deux['id'], 'index : le plus récent d\'abord');
check($index['reglages'][1]['reglages']['barre']['margeGauche'] === 85.5 && $index['reglages'][1]['reglages']['largeur'] === '16:9', 'réglages gardés tels quels');
check(is_file($dossier . '/' . $un['id'] . '/reglage.json'), 'fiche de l\'enregistrement');

exec('rm -rf ' . escapeshellarg($site));
echo "Réglages des kits : demande, forme, rangement, index — OK\n";
