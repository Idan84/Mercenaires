<?php
// Blood & Wages — dépôt d'une image depuis la Design Lab (onglet Images, « Remplacer » ou « Ajouter une variante »).
// Range le fichier sur Hostinger dans media/depots/ (prototype-web/api/lib/depots.php) ; JC l'intègre ensuite au jeu.
// POST multipart : famille, cible (chemin de l'image du jeu), type (remplacer | variante), note, fichier.
// Réponse JSON : {"ok":true,"depot":{…}} ou {"ok":false,"erreur":"…"}.
//
// Sécurité : ce fichier est sous design/, protégé par le mot de passe de la Design Lab (réglé chez Hostinger, jamais par
// un .htaccess du dépôt Git). Par prudence, il refuse aussi de travailler si cette protection n'est pas visible, et toute
// requête qui ne vient pas de la Design Lab elle-même (en-tête X-Depot, origine du site).

declare(strict_types=1);

require dirname(__DIR__, 2) . '/api/lib/depots.php';

function depot_repondre(int $code, array $corps): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($corps, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function depot_protege(string $site): bool
{
    foreach (['REMOTE_USER', 'REDIRECT_REMOTE_USER', 'PHP_AUTH_USER', 'AUTH_TYPE'] as $cle) {
        if (!empty($_SERVER[$cle])) {
            return true;
        }
    }
    $htaccess = (string) @file_get_contents($site . '/design/.htaccess');
    return stripos($htaccess, 'AuthType') !== false || getenv('DEPOT_LOCAL') === '1';
}

$site = dirname(__DIR__, 2);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    depot_repondre(405, ['ok' => false, 'erreur' => 'Dépôt : POST seulement.']);
}
if (!depot_protege($site)) {
    depot_repondre(403, ['ok' => false, 'erreur' => 'Dépôt fermé : la Design Lab n\'est pas protégée par mot de passe.']);
}
$origine = $_SERVER['HTTP_ORIGIN'] ?? '';
$hote = (string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
if (($_SERVER['HTTP_X_DEPOT'] ?? '') !== '1' || ($origine !== '' && parse_url($origine, PHP_URL_HOST) !== $hote)) {
    depot_repondre(403, ['ok' => false, 'erreur' => 'Dépôt refusé : la demande ne vient pas de la Design Lab.']);
}

$fichier = $_FILES['fichier'] ?? null;
if (!is_array($fichier) || ($fichier['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $code = is_array($fichier) ? (int) $fichier['error'] : UPLOAD_ERR_NO_FILE;
    $message = in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
        ? 'Fichier trop lourd pour le serveur (limite : ' . ini_get('upload_max_filesize') . ').'
        : 'Aucun fichier reçu (code ' . $code . ').';
    depot_repondre(400, ['ok' => false, 'erreur' => $message]);
}

try {
    $demande = [
        'famille' => (string) ($_POST['famille'] ?? ''),
        'cible' => (string) ($_POST['cible'] ?? ''),
        'type' => (string) ($_POST['type'] ?? ''),
        'note' => mb_substr(trim((string) ($_POST['note'] ?? '')), 0, 500),
        'nom_origine' => mb_substr(basename((string) $fichier['name']), 0, 200),
        'octets' => (int) $fichier['size'],
        'auteur' => (string) ($_SERVER['REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? ''),
    ];
    $erreur = depot_verifier_demande(depot_familles($site), $demande['famille'], $demande['cible'], $demande['type']);
    if ($erreur !== null) {
        depot_repondre(400, ['ok' => false, 'erreur' => $erreur]);
    }
    $info = depot_verifier_fichier((string) $fichier['tmp_name'], $demande['nom_origine'], $demande['octets'], $demande['cible']);
    if (isset($info['erreur'])) {
        depot_repondre(400, ['ok' => false, 'erreur' => $info['erreur']]);
    }
    $fiche = depot_enregistrer(depot_dossier($site . '/media'), $demande, $info, (string) $fichier['tmp_name'], true);
    depot_repondre(200, ['ok' => true, 'depot' => $fiche]);
} catch (Throwable $e) {
    depot_repondre(500, ['ok' => false, 'erreur' => $e->getMessage()]);
}
