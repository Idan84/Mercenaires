<?php
// Blood & Wages — enregistrer l'atelier des tags depuis la Design Lab (design/atelier/, Idan, 2026-11-22).
// Range une nouvelle version sur Hostinger dans media/atelier/ (prototype-web/api/lib/atelier.php) ; le jeu la lit en
// direct (media/atelier/actuel.json).
// POST JSON : {"version": <numéro de la version de départ, 0 s'il n'y en a pas>, "doc": {tags, tests, constantes}, "note": "…"}.
// Réponse JSON : {"ok":true,"fiche":{…}} ; {"ok":false,"conflit":true,"actuel":{…}} si une autre version a été enregistrée
// entre-temps (409) ; {"ok":false,"erreur":"…"} sinon.
//
// Sécurité : comme design/api/depot.php (mêmes gardes : Design Lab protégée par mot de passe, en-tête X-Depot, origine du
// site) ; le corps est limité en taille et l'atelier doit avoir la forme du moteur des tags.

declare(strict_types=1);

require dirname(__DIR__, 2) . '/api/lib/depots.php';
require dirname(__DIR__, 2) . '/api/lib/atelier.php';
$site = dirname(__DIR__, 2);
depot_garder($site);

try {
    $corps = (string) file_get_contents('php://input', false, null, 0, ATELIER_MAX_OCTETS + 1);
    if (strlen($corps) > ATELIER_MAX_OCTETS) {
        depot_repondre(413, ['ok' => false, 'erreur' => 'Atelier trop lourd.']);
    }
    $demande = json_decode($corps, true);
    if (!is_array($demande) || !is_int($demande['version'] ?? null) || $demande['version'] < 0) {
        depot_repondre(400, ['ok' => false, 'erreur' => 'Demande illisible (JSON avec un numéro de version attendu).']);
    }
    $doc = $demande['doc'] ?? null;
    $erreur = atelier_verifier($doc);
    if ($erreur !== null) {
        depot_repondre(400, ['ok' => false, 'erreur' => $erreur]);
    }
    $resultat = atelier_enregistrer(atelier_dossier($site . '/media'), $doc, $demande['version'],
        mb_substr(trim((string) ($demande['note'] ?? '')), 0, 500),
        (string) ($_SERVER['REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? ''));
    if (!$resultat['ok']) {
        depot_repondre(409, ['ok' => false, 'conflit' => true, 'actuel' => $resultat['actuel'],
            'erreur' => 'L\'atelier a été modifié ailleurs entre-temps.']);
    }
    depot_repondre(200, ['ok' => true, 'fiche' => $resultat['fiche']]);
} catch (Throwable $e) {
    depot_repondre(500, ['ok' => false, 'erreur' => $e->getMessage()]);
}
