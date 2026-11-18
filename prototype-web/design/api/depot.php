<?php
// Blood & Wages — dépôt d'une image depuis la Design Lab (onglet Images, « Remplacer » ou « Ajouter une variante »).
// Range le fichier sur Hostinger dans media/depots/ (prototype-web/api/lib/depots.php) ; JC l'intègre ensuite au jeu.
// POST multipart : famille, cible (chemin de l'image du jeu), type (remplacer | variante | nouvelle), note, fichier ;
// ou type reutiliser, source (une image du jeu à qui donner ce rôle), sans fichier.
// Réponse JSON : {"ok":true,"depot":{…}} ou {"ok":false,"erreur":"…"}.
//
// Sécurité : ce fichier est sous design/, protégé par le mot de passe de la Design Lab (réglé chez Hostinger, jamais par
// un .htaccess du dépôt Git). Par prudence, il refuse aussi de travailler si cette protection n'est pas visible, et toute
// requête qui ne vient pas de la Design Lab elle-même (en-tête X-Depot, origine du site).

declare(strict_types=1);

require dirname(__DIR__, 2) . '/api/lib/depots.php';

$site = dirname(__DIR__, 2);
depot_garder($site);

if (($_POST['type'] ?? '') === 'reutiliser') {
    try {
        $demande = [
            'famille' => (string) ($_POST['famille'] ?? ''),
            'cible' => (string) ($_POST['cible'] ?? ''),
            'note' => mb_substr(trim((string) ($_POST['note'] ?? '')), 0, 500),
            'auteur' => (string) ($_SERVER['REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? ''),
        ];
        $familles = depot_familles($site);
        $source = (string) ($_POST['source'] ?? '');
        $erreur = depot_verifier_demande($familles, $demande['famille'], $demande['cible'], 'reutiliser')
            ?? depot_verifier_source($familles, $source, $demande['cible']);
        if ($erreur !== null) {
            depot_repondre(400, ['ok' => false, 'erreur' => $erreur]);
        }
        $fiche = depot_enregistrer_reutilisation(depot_dossier($site . '/media'), $demande, depot_fichier_du_catalogue($familles, $source));
        depot_repondre(200, ['ok' => true, 'depot' => $fiche]);
    } catch (Throwable $e) {
        depot_repondre(500, ['ok' => false, 'erreur' => $e->getMessage()]);
    }
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
