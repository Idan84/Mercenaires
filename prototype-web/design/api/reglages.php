<?php
// Blood & Wages — enregistrer les réglages d'un kit de culture depuis la Design Lab (onglet Cultures).
// Range l'enregistrement sur Hostinger dans media/reglages/ (prototype-web/api/lib/reglages.php) ; le jeu le lit en direct
// (prototype-web/reference-data.js, loadCultureSettings).
// POST JSON : {"culture": "<clé du kit>", "panneau": "barres" | "fiche" | "plein", "reglages": {…}, "note": "…"}.
// Réponse JSON : {"ok":true,"reglage":{…}} ou {"ok":false,"erreur":"…"}.
//
// Sécurité : comme design/api/depot.php (même gardes : Design Lab protégée par mot de passe, en-tête X-Depot, origine du
// site) ; le corps est limité en taille et les réglages doivent avoir la forme de ceux du jeu.

declare(strict_types=1);

require dirname(__DIR__, 2) . '/api/lib/depots.php';
require dirname(__DIR__, 2) . '/api/lib/reglages.php';
$site = dirname(__DIR__, 2);
depot_garder($site);

try {
    $corps = (string) file_get_contents('php://input', false, null, 0, REGLAGES_MAX_OCTETS + 1);
    if (strlen($corps) > REGLAGES_MAX_OCTETS) {
        depot_repondre(413, ['ok' => false, 'erreur' => 'Réglages trop lourds.']);
    }
    $demande = json_decode($corps, true);
    if (!is_array($demande)) {
        depot_repondre(400, ['ok' => false, 'erreur' => 'Réglages illisibles (JSON attendu).']);
    }
    $culture = (string) ($demande['culture'] ?? '');
    $panneau = (string) ($demande['panneau'] ?? '');
    $reglages = $demande['reglages'] ?? null;
    $erreur = reglages_verifier(reglages_kits($site), $culture, $panneau, $reglages);
    if ($erreur !== null) {
        depot_repondre(400, ['ok' => false, 'erreur' => $erreur]);
    }
    $fiche = reglages_enregistrer(reglages_dossier($site . '/media'), [
        'culture' => $culture,
        'panneau' => $panneau,
        'reglages' => $reglages,
        'note' => mb_substr(trim((string) ($demande['note'] ?? '')), 0, 500),
        'auteur' => (string) ($_SERVER['REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? ''),
    ]);
    depot_repondre(200, ['ok' => true, 'reglage' => $fiche]);
} catch (Throwable $e) {
    depot_repondre(500, ['ok' => false, 'erreur' => $e->getMessage()]);
}
