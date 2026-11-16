<?php
// Dépôts d'images depuis la Design Lab (prototype-web/api/lib/depots.php, prototype-web/design/api/depot.php) :
// demande, fichier, rangement dans media/depots/, index. Usage : php tests/depots.test.php (après node, pour l'inventaire).

declare(strict_types=1);

require __DIR__ . '/../prototype-web/api/lib/depots.php';

function check(bool $ok, string $message): void
{
    if (!$ok) {
        fwrite(STDERR, "ÉCHEC : $message\n");
        exit(1);
    }
}

$root = dirname(__DIR__);
$web = $root . '/prototype-web';

// Un site minimal : le catalogue et l'inventaire, comme scripts/build-site.sh les publie dans data/.
$site = sys_get_temp_dir() . '/depots-test-' . bin2hex(random_bytes(4));
mkdir($site . '/data', 0755, true);
copy($root . '/data/reference/images.json', $site . '/data/images.json');
exec('node ' . escapeshellarg($root . '/scripts/build-images-index.js') . ' ' . escapeshellarg($site . '/data/images-fichiers.json'), $out, $code);
check($code === 0, 'inventaire des images généré');
$familles = depot_familles($site);

// La demande : famille connue, image de la famille, variante seulement là où le jeu tire au hasard.
check(depot_verifier_demande($familles, 'pictos', 'assets/pictos/peuple-orc.webp', 'remplacer') === null, 'remplacer un picto');
check(depot_verifier_demande($familles, 'pictos', 'assets/pictos/peuple-orc.webp', 'variante') !== null, 'pas de variante de picto');
check(depot_verifier_demande($familles, 'taverne', 'assets/taverne/fond.webp', 'variante') === null, 'variante de la taverne');
check(depot_verifier_demande($familles, 'pictos', 'assets/taverne/fond.webp', 'remplacer') !== null, 'image hors de la famille');
check(depot_verifier_demande($familles, 'pictos', '../../index.php', 'remplacer') !== null, 'chemin hors du catalogue');
check(depot_verifier_demande($familles, 'inconnue', 'assets/pictos/peuple-orc.webp', 'remplacer') !== null, 'famille inconnue');
check(depot_verifier_demande($familles, 'pictos', 'assets/pictos/peuple-orc.webp', 'effacer') !== null, 'type inconnu');

// Le fichier : une vraie image avec la bonne extension ; un SVG sans script pour une image SVG ; 30 Mo au plus.
$webp = $web . '/assets/pictos/peuple-orc.webp';
$ok = depot_verifier_fichier($webp, 'Orc nouveau.webp', filesize($webp), 'assets/pictos/peuple-orc.webp');
check(($ok['ext'] ?? '') === 'webp' && $ok['largeur'] === 256 && $ok['hauteur'] === 256, 'WebP accepté, taille lue');
check(isset(depot_verifier_fichier($webp, 'orc.png', filesize($webp), 'assets/pictos/peuple-orc.webp')['erreur']), 'extension menteuse refusée');
check(isset(depot_verifier_fichier($webp, 'orc.webp', DEPOT_MAX_OCTETS + 1, 'assets/pictos/peuple-orc.webp')['erreur']), 'plus de 30 Mo refusé');
$php = $site . '/x.php';
file_put_contents($php, '<?php echo 1;');
check(isset(depot_verifier_fichier($php, 'x.php', filesize($php), 'assets/pictos/peuple-orc.webp')['erreur']), 'script refusé');
$svgCible = 'assets/fiche/ornements/' . basename(glob($web . '/assets/fiche/ornements/*.svg')[0]);
$svg = $site . '/o.svg';
file_put_contents($svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>');
check((depot_verifier_fichier($svg, 'o.svg', filesize($svg), $svgCible)['ext'] ?? '') === 'svg', 'SVG accepté pour une image SVG');
file_put_contents($svg, '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
check(isset(depot_verifier_fichier($svg, 'o.svg', filesize($svg), $svgCible)['erreur']), 'SVG avec script refusé');
check(isset(depot_verifier_fichier($webp, 'orc.webp', filesize($webp), $svgCible)['erreur']), 'image matricielle pour un SVG refusée');
check(depot_nom_sur('Orc Été — v2.PNG') === 'orc-ete-v2', 'nom de fichier sûr');

// Le rangement : media/depots/<id>/<nom>, sa fiche, l'index, et le dossier protégé.
$dossier = depot_dossier($site . '/media');
$htaccess = (string) file_get_contents($dossier . '/.htaccess');
check(str_contains($htaccess, 'Options -Indexes') && str_contains($htaccess, 'Require all denied') && str_contains($htaccess, 'Content-Security-Policy'), 'dossier des dépôts protégé');
$demande = ['famille' => 'pictos', 'cible' => 'assets/pictos/peuple-orc.webp', 'type' => 'remplacer', 'note' => 'Plus de crocs',
    'nom_origine' => 'Orc nouveau.webp', 'octets' => filesize($webp), 'auteur' => 'idan'];
$fiche = depot_enregistrer($dossier, $demande, $ok, $webp, false);
check(preg_match('/^\d{8}-\d{6}-[0-9a-f]{6}$/', $fiche['id']) === 1, 'identifiant du dépôt');
check($fiche['fichier'] === 'media/depots/' . $fiche['id'] . '/orc-nouveau.webp' && is_file($site . '/' . $fiche['fichier']), 'fichier rangé');
check(is_file($dossier . '/' . $fiche['id'] . '/depot.json'), 'fiche du dépôt');
$index = json_decode((string) file_get_contents($dossier . '/index.json'), true);
check(count($index['depots']) === 1 && $index['depots'][0]['cible'] === 'assets/pictos/peuple-orc.webp' && $index['depots'][0]['note'] === 'Plus de crocs', 'index des dépôts');

// La Design Lab n'a jamais de .htaccess dans le dépôt Git : celui de Hostinger porte son mot de passe, la mise en ligne
// l'écraserait. Le point d'entrée exige la protection, l'en-tête X-Depot et l'origine du site.
check(!file_exists($web . '/design/.htaccess'), 'pas de .htaccess dans prototype-web/design/');
$endpoint = (string) file_get_contents($web . '/design/api/depot.php');
check(str_contains($endpoint, "depot_protege(\$site)") && str_contains($endpoint, "HTTP_X_DEPOT") && str_contains($endpoint, 'HTTP_ORIGIN'), 'point d\'entrée gardé');

exec('rm -rf ' . escapeshellarg($site));
echo "Dépôts d'images : demande, fichier, rangement, index — OK\n";
